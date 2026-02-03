const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// ==========================================
// CONFIGURACIÓN Y CONEXIÓN
// ==========================================

const requiredEnv = ['TELEGRAM_BOT_TOKEN', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`❌ Faltan variables de entorno: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Registrar comandos en el botón "Menú" oficial de Telegram
bot.setMyCommands([
  { command: 'start', description: '🚀 Iniciar Roomie' },
  { command: 'menu', description: '📱 Mostrar botones de opciones' },
  { command: 'logout', description: '🚪 Cerrar sesión / Cambiar cédula' }
]);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

// ==========================================
// PERSONA "ROOMIE" Y CONSTANTES
// ==========================================

const ROOMIE = {
  GREETING: (name) => `¡Qué más ${name}! 👋 Soy *Roomie*, tu asistente de aulas en la UIDE.\n\n¿En qué te ayudo hoy? 😎`,
  GREETING_NEW: `¡Hola! 👋 Soy *Roomie*, tu nuevo compañero digital.\n\nPara empezar, necesito saber quién eres. Envíame tu número de *cédula* (10 dígitos) para buscarte en el sistema. 🕵️‍♂️`,
  MENU_MAIN: (rol) => {
    const buttons = [
      ['🔍 Aulas Libres', '📅 Mis Reservas'],
      ['👨‍🏫 Buscar Profe', '📚 Horario Materia']
    ];
    if (['director', 'admin'].includes(rol)) {
      buttons.push(['📊 Estado General', '⚙️ Mi Perfil']);
    } else {
      buttons.push(['⚙️ Mi Perfil']);
    }
    return {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: false
    };
  },
  ERROR_CEDULA: `Ups, no encuentro esa cédula 🧐.\n\nAsegúrate de que:\n1. Estés matriculado/registrado.\n2. La cédula tenga 10 dígitos.\n\nPrueba de nuevo 👇`,
  ERROR_GENERAL: `¡Chuta! Algo salió mal 😵. Intenta de nuevo en un ratito.`,
  NO_AULAS: (time) => `Mala suerte 😬. No hay aulas disponibles ${time}.`,
  AULAS_FOUND: `¡Bingo! 🎉 Encontré estas aulas libres:\n\n`,
  TEACHER_PROMPT: `¡De una! Dime el apellido del profe que buscas 👨‍🏫👩‍🏫`,
  SUBJECT_PROMPT: `Ok, escribe el nombre de la materia (o una parte) 📚`,
  CANCEL_SUCCESS: `Listo, reserva cancelada. ¡Avísame si necesitas otra cosa! 👌`
};

// ==========================================
// INICIALIZACIÓN BD
// ==========================================

async function initDB() {
  const client = await pool.connect();
  try {
    // 1. Tabla de Sesiones del Bot (Roles)
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_sessions (
        telegram_id BIGINT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        rol VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Tabla de Reservas (Si no existe, la creamos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id SERIAL PRIMARY KEY,
        aula_codigo VARCHAR(50),
        dia VARCHAR(20),
        hora_inicio VARCHAR(10),
        hora_fin VARCHAR(10),
        telegram_id BIGINT,
        cedula VARCHAR(20),
        usuario_nombre VARCHAR(100),
        motivo TEXT,
        estado VARCHAR(20) DEFAULT 'activa',
        fecha DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tablas bot_sessions y reservas verificadas.');
  } catch (e) {
    console.error('❌ Error iniciando DB:', e);
  } finally {
    client.release();
  }
}
initDB();

// ==========================================
// GESTIÓN DE ESTADO (SESIONES EN MEMORIA)
// ==========================================
// Usamos un mapa en memoria para el flujo de conversación (ej: esperando input de búsqueda)
const userState = new Map();

// Estados posibles
const STATES = {
  IDLE: 'IDLE',
  WAITING_CEDULA: 'WAITING_CEDULA',
  SEARCHING_TEACHER: 'SEARCHING_TEACHER',
  SEARCHING_SUBJECT: 'SEARCHING_SUBJECT',
  WAITING_BOOKING_TIME: 'WAITING_BOOKING_TIME'
};

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================

function normalizeText(value) {
  return value?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() || '';
}

// Escapar caracteres especiales de Markdown para Telegram
function escMd(text) {
  if (!text) return '';
  return String(text).replace(/([_*`\[])/g, '\\$1');
}

function extractDay(text) {
  const normalized = normalizeText(text);
  const dias = [
    { raw: 'lunes', formatted: 'Lunes' },
    { raw: 'martes', formatted: 'Martes' },
    { raw: 'miercoles', formatted: 'Miércoles' },
    { raw: 'jueves', formatted: 'Jueves' },
    { raw: 'viernes', formatted: 'Viernes' },
    { raw: 'sabado', formatted: 'Sábado' },
    { raw: 'domingo', formatted: 'Domingo' }
  ];
  return dias.find(d => normalized.includes(d.raw)) || null;
}

function extractTime(text) {
  // Buscar patrones de hora: "10:00", "14:30", "8:00", "10h00", "10H00"
  const match = text.match(/(\d{1,2})[:\-hH](\d{2})/);
  if (match) {
    const h = parseInt(match[1]);
    const m = match[2];
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, '0')}:${m}`;
    }
  }
  // Buscar solo hora sin minutos: "a las 10", "10 am"
  const matchSimple = text.match(/\b(\d{1,2})\s*(am|pm|de la|horas?)?\b/i);
  if (matchSimple) {
    let h = parseInt(matchSimple[1]);
    if (h >= 1 && h <= 23) {
      if (matchSimple[2] && matchSimple[2].toLowerCase() === 'pm' && h < 12) h += 12;
      return `${String(h).padStart(2, '0')}:00`;
    }
  }
  return null;
}

async function transcribeAudio(fileId) {
  try {
    const apiKey = process.env.VOICE_API_KEY;
    if (!apiKey || apiKey === 'tu_api_key_aqui') {
      throw new Error('API Key de voz no configurada');
    }

    // 1. Obtener el enlace del archivo desde Telegram
    const fileLink = await bot.getFileLink(fileId);

    // 2. Descargar el archivo de audio
    const stream = await axios.get(fileLink, { responseType: 'stream' });

    // 3. Preparar el FormData para enviar a Groq / Whisper
    const form = new FormData();
    form.append('file', stream.data, 'voice.ogg');
    form.append('model', 'whisper-large-v3');
    form.append('language', 'es');

    const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${apiKey}`
      }
    });

    return response.data.text;
  } catch (error) {
    console.error('Error en transcripción:', error.response?.data || error.message);
    return null;
  }
}

// ==========================================
// FUNCIONES DE BASE DE DATOS
// ==========================================

async function getSession(telegramId) {
  const tid = String(telegramId);
  // 1. Buscar en bot_sessions
  const res = await pool.query('SELECT * FROM bot_sessions WHERE telegram_id = $1', [tid]);
  if (res.rows.length > 0) return res.rows[0];

  // 2. Fallback Estudiantes (Legacy)
  const est = await pool.query('SELECT * FROM estudiantes WHERE telegram_id = $1', [tid]);
  if (est.rows.length > 0) {
    await pool.query(
      'INSERT INTO bot_sessions (telegram_id, user_id, user_type, rol) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [tid, est.rows[0].id || 0, 'estudiante', 'estudiante']
    );
    return { user_id: est.rows[0].id, user_type: 'estudiante', rol: 'estudiante', telegram_id: tid };
  }
  return null;
}

async function authenticateUser(cedula, telegramId) {
  const client = await pool.connect();
  try {
    // 1. Usuarios (Staff)
    const userRes = await client.query('SELECT * FROM usuarios WHERE cedula = $1 AND estado = \'activo\'', [cedula]);
    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      await client.query(`
        INSERT INTO bot_sessions (telegram_id, user_id, user_type, rol)
        VALUES ($1, $2, 'usuario', $3)
        ON CONFLICT (telegram_id) 
        DO UPDATE SET user_id = EXCLUDED.user_id, user_type = EXCLUDED.user_type, rol = EXCLUDED.rol
      `, [String(telegramId), user.id, user.rol]);
      return { name: user.nombre, rol: user.rol, type: 'usuario' };
    }

    // 2. Estudiantes
    const estRes = await client.query('SELECT * FROM estudiantes WHERE cedula = $1', [cedula]);
    if (estRes.rows.length > 0) {
      const est = estRes.rows[0];
      // Update legacy telegram_id
      await client.query('UPDATE estudiantes SET telegram_id = $1 WHERE cedula = $2', [String(telegramId), cedula]);

      await client.query(`
        INSERT INTO bot_sessions (telegram_id, user_id, user_type, rol)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (telegram_id) 
        DO UPDATE SET user_id = EXCLUDED.user_id, user_type = EXCLUDED.user_type, rol = EXCLUDED.rol
      `, [String(telegramId), est.id || 0, 'estudiante', 'estudiante']);

      const nombre = est.nombre_completo || est.nombre || 'Estudiante';
      return { name: nombre.split(' ')[0], rol: 'estudiante', type: 'estudiante' };
    }
    return null;
  } finally {
    client.release();
  }
}

// Búsqueda de Profesor - Insensible a acentos y mayúsculas
async function findTeacher(queryTerm) {
  // Normalizar: quitar acentos del término de búsqueda
  const normalized = queryTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sql = `
    SELECT materia, dia, hora_inicio, hora_fin, aula_asignada, docente
    FROM clases
    WHERE translate(lower(docente), 'áéíóúñüàèìòù', 'aeiounuaeiou') ILIKE
          '%' || translate(lower($1), 'áéíóúñüàèìòù', 'aeiounuaeiou') || '%'
    ORDER BY dia, hora_inicio
  `;
  const res = await pool.query(sql, [normalized]);
  return res.rows;
}

// Búsqueda Materia - Insensible a acentos y mayúsculas
async function findSubjectClasses(subject) {
  const normalized = subject.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sql = `
    SELECT c.dia, c.hora_inicio, c.hora_fin, c.materia, c.aula_asignada, c.docente
    FROM clases c
    WHERE translate(lower(c.materia), 'áéíóúñüàèìòù', 'aeiounuaeiou') ILIKE
          '%' || translate(lower($1), 'áéíóúñüàèìòù', 'aeiounuaeiou') || '%'
      AND c.materia IS NOT NULL
    ORDER BY c.materia, c.dia, c.hora_inicio
    LIMIT 10
  `;
  const res = await pool.query(sql, [normalized]);
  return res.rows;
}

// Cancelar Reserva
async function cancelReserva(reservaId, telegramId) {
  const sql = `DELETE FROM reservas WHERE id = $1 AND telegram_id = $2 RETURNING *`;
  const res = await pool.query(sql, [reservaId, telegramId]);
  return res.rows.length > 0;
}

// ==========================================
// HANDLERS DEL BOT
// ==========================================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const session = await getSession(msg.from.id);

    if (session) {
      let nombre = 'Roomie';
      if (session.user_type === 'usuario') {
        const u = await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [session.user_id]);
        if (u.rows.length) nombre = u.rows[0].nombre;
      } else {
        // Try to get name from estudiantes
        const e = await pool.query('SELECT nombre FROM estudiantes WHERE id = $1', [session.user_id]);
        if (e.rows.length) nombre = e.rows[0].nombre.split(' ')[0];
      }

      await bot.sendMessage(chatId, ROOMIE.GREETING(nombre), {
        reply_markup: ROOMIE.MENU_MAIN(session.rol)
      });
      userState.set(chatId, STATES.IDLE);
    } else {
      await bot.sendMessage(chatId, ROOMIE.GREETING_NEW, {
        reply_markup: { remove_keyboard: true }
      });
      userState.set(chatId, STATES.WAITING_CEDULA);
    }
  } catch (e) {
    console.error('Error en start:', e);
    await bot.sendMessage(chatId, ROOMIE.ERROR_GENERAL);
  }
});

// COMANDO LOGOUT / RESET
bot.onText(/\/logout|\/reset/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const tid = String(telegramId);
    // Eliminar la sesión de la base de datos
    await pool.query('DELETE FROM bot_sessions WHERE telegram_id = $1', [tid]);

    // Si es estudiante, también podemos limpiar su telegram_id de la tabla estudiantes
    await pool.query('UPDATE estudiantes SET telegram_id = NULL WHERE telegram_id = $1', [tid]);

    userState.set(chatId, STATES.WAITING_CEDULA);

    await bot.sendMessage(chatId, '👋 *Sesión cerrada.*\n\nHe olvidado tus datos. Si quieres volver a usar Roomie, envíame tu número de cédula de nuevo.', {
      parse_mode: 'Markdown',
      reply_markup: {
        remove_keyboard: true,
        selective: true
      }
    });
  } catch (e) {
    console.error('Error en logout:', e);
    await bot.sendMessage(chatId, ROOMIE.ERROR_GENERAL);
  }
});

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  await processInput(msg.chat.id, msg.text, msg.from.id);
});

// HANDLER PARA VOZ
bot.on('voice', async (msg) => {
  const chatId = msg.chat.id;
  const waitingMsg = await bot.sendMessage(chatId, '🎤 *Escuchando...* 🎧', { parse_mode: 'Markdown' });
  const text = await transcribeAudio(msg.voice.file_id);

  if (!text) {
    await bot.editMessageText('No pude entender tu nota de voz 😞. Asegúrate de que la API Key esté configurada en el .env.', {
      chat_id: chatId,
      message_id: waitingMsg.message_id
    });
    return;
  }

  await bot.editMessageText(`📝 *Entendido:* "${text}"`, {
    chat_id: chatId,
    message_id: waitingMsg.message_id,
    parse_mode: 'Markdown'
  });

  await processInput(chatId, text, msg.from.id);
});

async function processInput(chatId, inputText, fromId) {
  try {
    const text = inputText.trim();
    const state = userState.get(chatId) || STATES.IDLE;

    // LOGIN
    if (state === STATES.WAITING_CEDULA) {
      if (!/^\d{10}$/.test(text)) {
        await bot.sendMessage(chatId, '❌ Esa cédula no parece válida (deben ser 10 números). Intenta de nuevo.');
        return;
      }
      const user = await authenticateUser(text, fromId);
      if (user) {
        await bot.sendMessage(chatId, `¡Bienvenido/a al equipo, ${user.name}! 🚀\n\nYa estás conectado como *${user.rol.toUpperCase()}*.`, {
          parse_mode: 'Markdown',
          reply_markup: ROOMIE.MENU_MAIN(user.rol)
        });
        userState.set(chatId, STATES.IDLE);
      } else {
        await bot.sendMessage(chatId, ROOMIE.ERROR_CEDULA);
      }
      return;
    }

    const normalized = normalizeText(text);

    // MENÚ: AULAS
    if (normalized.includes('buscar aulas') || normalized.includes('aulas libres')) {
      await bot.sendMessage(chatId, '🏢 ¿Para qué día y hora buscamos?\n\nEjemplo: "Hoy 10:00" o "Lunes 15:00"');
      return;
    }

    // MENÚ: MIS RESERVAS
    if (normalized.includes('mis reservas')) {
      const session = await getSession(fromId);
      if (!session) return bot.sendMessage(chatId, 'Primero inicie sesión con /start');

      const sql = `
      SELECT id, aula_codigo, dia, hora_inicio, hora_fin 
      FROM reservas 
      WHERE telegram_id = $1 AND estado = 'activa' 
      ORDER BY fecha, hora_inicio
    `;
      const res = await pool.query(sql, [String(fromId)]);

      if (res.rows.length === 0) {
        await bot.sendMessage(chatId, 'No tienes reservas activas 🤷‍♂️. ¡Aprovecha para descansar!');
      } else {
        const buttons = res.rows.map(r => [{
          text: `❌ Cancelar ${r.aula_codigo} (${r.dia} ${r.hora_inicio})`,
          callback_data: `cancel_${r.id}`
        }]);

        let msgText = '📅 *Tus Reservas Activas:*\n\n';
        res.rows.forEach(r => {
          msgText += `• *${escMd(r.aula_codigo)}*: ${escMd(r.dia)} ${escMd(r.hora_inicio)}-${escMd(r.hora_fin)}\n`;
        });

        await bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
      }
      return;
    }

    // MENÚ: BUSCAR PROFE
    if (normalized.includes('buscar profe')) {
      await bot.sendMessage(chatId, ROOMIE.TEACHER_PROMPT);
      userState.set(chatId, STATES.SEARCHING_TEACHER);
      return;
    }

    // DETECCIÓN AUTOMÁTICA DE DOCENTE (Lenguaje Natural / Voz)
    const teacherKeywords = ['profesor', 'profe', 'ingeniera', 'ingeniero', 'ing', 'docente', 'clases de', 'donde esta'];
    const isTeacherSearch = teacherKeywords.some(k => normalized.includes(k));

    if (isTeacherSearch || state === STATES.SEARCHING_TEACHER) {
      // Limpiar ruido para extraer solo el nombre
      let cleanName = text.replace(/¿|\?|a que hora tiene clases la |clases de la |a que hora tiene clases |clases de |el profesor |la ingeniera |el ingeniero |el profe |la profe |donde esta el |donde esta la |donde esta |ingeniera |ingeniero |profesor |docente |ing /gi, '').trim();

      if (cleanName.length > 2) {
        const schedule = await findTeacher(cleanName);
        if (schedule.length > 0) {
          let response = `📍 *Ubicación de ${escMd(cleanName)}:*\n\n`;
          schedule.forEach(c => {
            response += `• *Aula:* ${escMd(c.aula_asignada)}\n  ⏰ ${escMd(c.dia)} (${escMd(c.hora_inicio)} - ${escMd(c.hora_fin)})\n  📚 ${escMd(c.materia)}\n\n`;
          });
          await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
          userState.set(chatId, STATES.IDLE);
          return;
        } else if (state === STATES.SEARCHING_TEACHER) {
          await bot.sendMessage(chatId, `No encontré clases para "${cleanName}" 🕵️. Prueba con otro nombre o apellido.`);
          // Mantener estado SEARCHING_TEACHER para que el siguiente mensaje también busque docente
          return;
        }
      }
    }

    // MENÚ: HORARIO MATERIA
    if (normalized.includes('horario materia')) {
      await bot.sendMessage(chatId, ROOMIE.SUBJECT_PROMPT);
      userState.set(chatId, STATES.SEARCHING_SUBJECT);
      return;
    }

    // MENÚ: PERFIL
    if (normalized.includes('mi perfil')) {
      const session = await getSession(fromId);
      if (!session) return;

      const profileText = `👤 *Perfil Roomie*\n\n` +
        `• *Rol:* ${session.rol.toUpperCase()}\n` +
        `• *Tipo:* ${session.user_type}\n` +
        `• *Sesión:* Activa ✅\n\n` +
        `¿Necesitas cambiar de cuenta o corregir tu cédula?`;

      await bot.sendMessage(chatId, profileText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚪 Cerrar Sesión', callback_data: 'logout_confirm' }]
          ]
        }
      });
      return;
    }

    // SUB-ESTADOS
    if (state === STATES.SEARCHING_TEACHER) {
      const schedule = await findTeacher(text);
      if (schedule.length === 0) {
        await bot.sendMessage(chatId, 'No encontré a ese profe o no tiene clases asignadas 🕵️. Prueba solo con el apellido.');
      } else {
        let response = `👨‍🏫 *Horario del Profe "${escMd(text)}":*\n\n`;
        schedule.forEach(c => {
          response += `• *${escMd(c.dia)}* ${escMd(c.hora_inicio)}-${escMd(c.hora_fin)}: ${escMd(c.aula_asignada)} (${escMd(c.materia)})\n`;
        });
        await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      }
      userState.set(chatId, STATES.IDLE);
      return;
    }

    if (state === STATES.SEARCHING_SUBJECT) {
      const classes = await findSubjectClasses(text);
      if (classes.length === 0) {
        await bot.sendMessage(chatId, 'No veo esa materia en el sistema 🤔. ¿Está bien escrita?');
      } else {
        let response = `📚 *Horarios para "${escMd(text)}":*\n\n`;
        classes.forEach(c => {
          response += `• ${escMd(c.dia)} ${escMd(c.hora_inicio)}-${escMd(c.hora_fin)}: *${escMd(c.aula_asignada)}* (${escMd(c.docente ? c.docente.split(' ')[0] : 'S/D')})\n`;
        });
        await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      }
      userState.set(chatId, STATES.IDLE);
      return;
    }

    // BÚSQUEDA DE AULAS (Fallback)
    const day = extractDay(text);
    const time = extractTime(text);

    if (day || time) {
      const d = day ? day.formatted : 'Lunes';
      const t = time || '07:00';

      // Definimos un rango de 2 horas si no se provee fin
      const tEnd = time ? `${String(parseInt(t.split(':')[0]) + 2).padStart(2, '0')}:${t.split(':')[1]}` : '22:00';

      // Query de Arquitectura: Ver aulas libres
      const sql = `
        SELECT a.codigo, a.nombre, a.capacidad FROM aulas a
        WHERE a.estado ILIKE 'disponible' AND a.codigo NOT IN (
          SELECT aula_asignada FROM clases
          WHERE dia ILIKE $1 AND hora_inicio < $2 AND hora_fin > $3
          AND aula_asignada IS NOT NULL
        )
        LIMIT 10
      `;

      try {
        const res = await pool.query(sql, [d, tEnd, t]);
        if (res.rows.length === 0) {
          await bot.sendMessage(chatId, ROOMIE.NO_AULAS(`${d} a las ${t}`));
        } else {
          let responseText = `🏢 *Aulas disponibles (${d} ${t}):*\n\n`;
          const buttons = res.rows.map(a => ([{
            text: `✅ Reservar ${a.codigo}`,
            callback_data: `book_${a.codigo}_${d}_${t}`
          }]));

          responseText += `He encontrado estas opciones. Solo pulsa el botón del aula que quieras usar. 👇`;

          await bot.sendMessage(chatId, responseText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
          });
        }
      } catch (e) {
        console.error(e);
        await bot.sendMessage(chatId, ROOMIE.ERROR_GENERAL);
      }
      return;
    }

    // 5. COMANDO RESERVAR
    if (normalized.startsWith('reservar')) {
      const parts = text.split(' ');
      if (parts.length >= 4) {
        const aulaCodigo = parts[1].toUpperCase();
        const dia = parts[2];
        const horas = parts[3].split('-');

        if (horas.length !== 2) {
          await bot.sendMessage(chatId, 'Formato hora incorrecto. Ej: 14:00-16:00');
          return;
        }

        const session = await getSession(fromId);
        if (!session) {
          await bot.sendMessage(chatId, 'Inicia sesión primero.');
          return;
        }

        await pool.query(
          `INSERT INTO reservas (aula_codigo, dia, hora_inicio, hora_fin, telegram_id, estado) VALUES ($1, $2, $3, $4, $5, 'activa')`,
          [aulaCodigo, dia, horas[0], horas[1], String(fromId)]
        );
        await bot.sendMessage(chatId, `✅ *¡Listo!* Reservaste el aula *${aulaCodigo}*.\n\nRoomie te avisará antes de que empiece. 😉`, { parse_mode: 'Markdown' });
      } else {
        await bot.sendMessage(chatId, 'Formato: Reservar [Aula] [Dia] [Inicio-Fin]\nEj: Reservar AULA-1 Lunes 10:00-12:00');
      }
      return;
    }

    // 6. DEFAULT FALLBACK
    const sessionFallback = await getSession(fromId);
    const rolFallback = sessionFallback ? sessionFallback.rol : 'user';

    // Si el usuario escribió cualquier cosa que no entendemos, le recordamos el menú
    await bot.sendMessage(chatId, 'No te entendí bien 😅. Prueba con algo como "Lunes 10:00" o usa los botones de abajo:', {
      reply_markup: ROOMIE.MENU_MAIN(rolFallback)
    });

  } catch (error) {
    console.error('❌ Error crítico en Roomie:', error);
    await bot.sendMessage(chatId, 'Chuta, algo salió mal internamente 😵. Prueba de nuevo en unos segundos.');
  }
}

// COMANDO PARA REGENERAR EL MENÚ
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const session = await getSession(msg.from.id);
    const rol = session ? session.rol : 'estudiante';

    await bot.sendMessage(chatId, '📱 *Menú Principal*\n\nSi no ves los botones de abajo, pulsa el icono de los cuatro cuadritos (⌨️) al lado de donde escribes.', {
      parse_mode: 'Markdown',
      reply_markup: ROOMIE.MENU_MAIN(rol)
    });
    userState.set(chatId, STATES.IDLE);
  } catch (e) {
    console.error('Error en /menu:', e);
  }
});

// LOG DE ERRORES DE TELEGRAM
bot.on('polling_error', (error) => {
  if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
    console.warn('⚠️ Conflicto de Polling detectado. Asegúrate de que n8n u otra instancia no esté usando el mismo token.');
  } else {
    console.error('❌ Error de Telegram Polling:', error.message);
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // CERRAR SESIÓN DESDE PERFIL
  if (data === 'logout_confirm') {
    const tid = String(query.from.id);
    await pool.query('DELETE FROM bot_sessions WHERE telegram_id = $1', [tid]);
    await pool.query('UPDATE estudiantes SET telegram_id = NULL WHERE telegram_id = $1', [tid]);
    userState.set(chatId, STATES.WAITING_CEDULA);

    await bot.answerCallbackQuery(query.id, { text: 'Sesión cerrada' });
    await bot.sendMessage(chatId, '👋 *Sesión cerrada exitosamente.*\n\nEnvíame tu número de cédula cuando quieras volver a entrar.', {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true }
    });
    return;
  }

  // RESERVA RÁPIDA (Un clic)
  if (data.startsWith('book_')) {
    const [_, aula, dia, hora] = data.split('_');
    const tid = String(query.from.id);

    const session = await getSession(tid);
    if (!session) {
      return bot.answerCallbackQuery(query.id, { text: 'Inicia sesión primero con /start', show_alert: true });
    }

    try {
      // Calculamos hora fin (1h por defecto)
      const h = parseInt(hora.split(':')[0]) + 1;
      const horaFin = `${String(h).padStart(2, '0')}:${hora.split(':')[1]}`;

      await pool.query(
        `INSERT INTO reservas (aula_codigo, dia, hora_inicio, hora_fin, telegram_id, estado) VALUES ($1, $2, $3, $4, $5, 'activa')`,
        [aula, dia, hora, horaFin, tid]
      );

      await bot.answerCallbackQuery(query.id, { text: '¡Reserva confirmada!' });
      await bot.editMessageText(`✅ *Reserva Confirmada*\n\n📍 Aula: ${aula}\n📅 Día: ${dia}\n⏰ Hora: ${hora} - ${horaFin}\n\n¡Listo! Te avisaré unos minutos antes de empezar. 😉`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      });
    } catch (e) {
      console.error(e);
      await bot.answerCallbackQuery(query.id, { text: 'Error al reservar. Inténtalo de nuevo.', show_alert: true });
    }
    return;
  }

  if (data.startsWith('cancel_')) {
    const reservaId = data.split('_')[1];
    const success = await cancelReserva(reservaId, query.from.id);

    if (success) {
      await bot.answerCallbackQuery(query.id, { text: 'Reserva cancelada' });
      await bot.sendMessage(chatId, ROOMIE.CANCEL_SUCCESS);
    } else {
      await bot.answerCallbackQuery(query.id, { text: 'Error o ya cancelada', show_alert: true });
    }
  }
});


// ==========================================
// NOTIFICACIONES (CRON)
// ==========================================
setInterval(async () => {
  try {
    const now = new Date();
    const options = { timeZone: 'America/Guayaquil', hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'long' };

    // Formato ES
    const formatter = new Intl.DateTimeFormat('es-ES', options);
    const parts = formatter.formatToParts(now);

    const map = { 'lunes': 'Lunes', 'martes': 'Martes', 'miércoles': 'Miércoles', 'jueves': 'Jueves', 'viernes': 'Viernes', 'sábado': 'Sábado', 'domingo': 'Domingo' };

    const wd = parts.find(p => p.type === 'weekday').value.toLowerCase();
    const day = map[wd] || map[wd.replace('é', 'e').replace('á', 'a')]; // Fallback simple

    const h = parseInt(parts.find(p => p.type === 'hour').value);
    const m = parseInt(parts.find(p => p.type === 'minute').value);

    // Target: +15 min
    let targetH = h;
    let targetM = m + 15;
    if (targetM >= 60) {
      targetM -= 60;
      targetH = (targetH + 1) % 24;
    }
    const timeStr = `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`;

    if (!day) return;

    // 1. Reservas
    const res = await pool.query(
      `SELECT telegram_id, aula_codigo FROM reservas WHERE dia = $1 AND hora_inicio = $2 AND estado = 'activa'`,
      [day, timeStr]
    );
    res.rows.forEach(r => {
      bot.sendMessage(r.telegram_id, `⏰ *Roomie Alert:* Tu reserva en *${r.aula_codigo}* empieza en 15 min.`, { parse_mode: 'Markdown' }).catch(() => { });
    });

    // 2. Clases (Aproximación por Carrera/Nivel)
    // Buscamos clases que empiezan a esa hora
    const clases = await pool.query(
      `SELECT carrera, ciclo, materia, aula_asignada, hora_inicio FROM clases WHERE dia = $1 AND hora_inicio = $2`,
      [day, timeStr]
    );

    for (const c of clases.rows) {
      const studs = await pool.query(
        `SELECT telegram_id FROM estudiantes 
                  WHERE escuela ILIKE $1 AND nivel ILIKE $2 AND telegram_id IS NOT NULL`,
        [`%${c.carrera}%`, `%${c.ciclo}%`] // Match flexible
      );
      studs.rows.forEach(s => {
        bot.sendMessage(s.telegram_id,
          `🔔 *Clase en 15 min:*\n\n📚 *${c.materia}*\n📍 *${c.aula_asignada}*\n\n¡Roomie te avisa para que no corras!`,
          { parse_mode: 'Markdown' }
        ).catch(e => {
          // Si bloqueado, ignorar
        });
      });
    }

  } catch (e) {
    console.error('Error cron:', e);
  }
}, 60000); // Check 1 min

console.log('🤖 Roomie Bot iniciado.');
