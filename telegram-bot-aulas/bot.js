const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// ==========================================
// CONFIGURACION Y CONEXION
// ==========================================

const requiredEnv = ['TELEGRAM_BOT_TOKEN', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`Faltan variables de entorno: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.setMyCommands([
  { command: 'start', description: 'Iniciar Roomie' },
  { command: 'menu', description: 'Mostrar menu de opciones' },
  { command: 'logout', description: 'Cerrar sesion' }
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
// CONSTANTES Y TEXTOS
// ==========================================

function escMd(text) {
  if (!text) return '';
  return String(text).replace(/([_*`\[\]])/g, '\\$1');
}

function normalizeText(value) {
  return value?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() || '';
}

// ==========================================
// INICIALIZACION BD
// ==========================================

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_sessions (
        telegram_id BIGINT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        rol VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
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
    console.log('Tablas bot_sessions y reservas verificadas.');
  } catch (e) {
    console.error('Error iniciando DB:', e);
  } finally {
    client.release();
  }
}
initDB();

// ==========================================
// ESTADO DE CONVERSACION
// ==========================================

const userState = new Map();

// ==========================================
// FUNCIONES DE BD
// ==========================================

async function getSession(telegramId) {
  const tid = String(telegramId);
  const res = await pool.query('SELECT * FROM bot_sessions WHERE telegram_id = $1', [tid]);
  if (res.rows.length > 0) return res.rows[0];

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

async function getSessionName(session) {
  if (!session) return 'amigo';
  try {
    if (session.user_type === 'usuario') {
      const u = await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [session.user_id]);
      if (u.rows.length) return u.rows[0].nombre.split(' ')[0];
    } else {
      const e = await pool.query('SELECT nombre, nombre_completo FROM estudiantes WHERE id = $1', [session.user_id]);
      if (e.rows.length) return (e.rows[0].nombre_completo || e.rows[0].nombre || '').split(' ')[0] || 'amigo';
    }
  } catch (_) { }
  return 'amigo';
}

async function authenticateUser(cedula, telegramId) {
  const client = await pool.connect();
  try {
    const userRes = await client.query('SELECT * FROM usuarios WHERE cedula = $1 AND estado = \'activo\'', [cedula]);
    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      await client.query(`
        INSERT INTO bot_sessions (telegram_id, user_id, user_type, rol)
        VALUES ($1, $2, 'usuario', $3)
        ON CONFLICT (telegram_id)
        DO UPDATE SET user_id = EXCLUDED.user_id, user_type = EXCLUDED.user_type, rol = EXCLUDED.rol
      `, [String(telegramId), user.id, user.rol]);
      return { name: user.nombre.split(' ')[0], rol: user.rol, type: 'usuario' };
    }

    const estRes = await client.query('SELECT * FROM estudiantes WHERE cedula = $1', [cedula]);
    if (estRes.rows.length > 0) {
      const est = estRes.rows[0];
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

async function findTeacher(queryTerm) {
  const normalized = queryTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sql = `
    SELECT materia, dia, hora_inicio, hora_fin, aula_asignada, docente
    FROM clases
    WHERE translate(lower(docente), 'aeiounuaeiou', 'aeiounuaeiou') ILIKE
          '%' || translate(lower($1), 'aeiounuaeiou', 'aeiounuaeiou') || '%'
    ORDER BY dia, hora_inicio
  `;
  const res = await pool.query(sql, [normalized]);
  return res.rows;
}

async function findSubjectClasses(subject) {
  const normalized = subject.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sql = `
    SELECT c.dia, c.hora_inicio, c.hora_fin, c.materia, c.aula_asignada, c.docente
    FROM clases c
    WHERE translate(lower(c.materia), 'aeiounuaeiou', 'aeiounuaeiou') ILIKE
          '%' || translate(lower($1), 'aeiounuaeiou', 'aeiounuaeiou') || '%'
      AND c.materia IS NOT NULL
    ORDER BY c.materia, c.dia, c.hora_inicio
    LIMIT 10
  `;
  const res = await pool.query(sql, [normalized]);
  return res.rows;
}

async function getAvailableRooms(dia, horaInicio) {
  const h = parseInt(horaInicio.split(':')[0]);
  const m = horaInicio.split(':')[1];
  const horaFin = `${String(h + 2).padStart(2, '0')}:${m}`;

  const sql = `
    SELECT a.codigo, a.nombre, a.capacidad FROM aulas a
    WHERE a.estado ILIKE 'disponible' AND a.codigo NOT IN (
      SELECT aula_asignada FROM clases
      WHERE dia ILIKE $1 AND hora_inicio < $2 AND hora_fin > $3
      AND aula_asignada IS NOT NULL
    )
    AND a.codigo NOT IN (
      SELECT aula_codigo FROM reservas
      WHERE dia ILIKE $1 AND hora_inicio < $2 AND hora_fin > $3
      AND estado = 'activa'
    )
    ORDER BY a.capacidad ASC
    LIMIT 10
  `;
  const res = await pool.query(sql, [dia, horaFin, horaInicio]);
  return { rooms: res.rows, horaFin };
}

// ==========================================
// HELPERS DE TIEMPO
// ==========================================

function extractDay(text) {
  const normalized = normalizeText(text);

  if (normalized.includes('hoy')) {
    const today = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil', weekday: 'long' });
    return extractDay(normalizeText(today));
  }
  if (normalized.includes('manana')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil', weekday: 'long' });
    return extractDay(normalizeText(tomorrowStr));
  }

  const dias = [
    { raw: 'lunes', formatted: 'Lunes' },
    { raw: 'martes', formatted: 'Martes' },
    { raw: 'miercoles', formatted: 'Miercoles' },
    { raw: 'jueves', formatted: 'Jueves' },
    { raw: 'viernes', formatted: 'Viernes' },
    { raw: 'sabado', formatted: 'Sabado' },
    { raw: 'domingo', formatted: 'Domingo' }
  ];
  return dias.find(d => normalized.includes(d.raw)) || null;
}

function extractTime(text) {
  const match = text.match(/(\d{1,2})[:\-hH](\d{2})/);
  if (match) {
    const h = parseInt(match[1]);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:${match[2]}`;
  }
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

function getTodayName() {
  const today = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil', weekday: 'long' });
  const d = extractDay(normalizeText(today));
  return d ? d.formatted : 'Lunes';
}

// ==========================================
// VOZ
// ==========================================

async function transcribeAudio(fileId) {
  try {
    const apiKey = process.env.VOICE_API_KEY;
    if (!apiKey || apiKey === 'tu_api_key_aqui') return null;

    const fileLink = await bot.getFileLink(fileId);
    const stream = await axios.get(fileLink, { responseType: 'stream' });

    const form = new FormData();
    form.append('file', stream.data, 'voice.ogg');
    form.append('model', 'whisper-large-v3');
    form.append('language', 'es');

    const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
      headers: { ...form.getHeaders(), 'Authorization': `Bearer ${apiKey}` }
    });
    return response.data.text;
  } catch (error) {
    console.error('Error en transcripcion:', error.response?.data || error.message);
    return null;
  }
}

// ==========================================
// MENUS INLINE (todo con botones, sin escribir)
// ==========================================

function mainMenuInline(rol) {
  const buttons = [
    [{ text: '🔍 Buscar Aulas Libres', callback_data: 'menu_aulas' }],
    [{ text: '📅 Mis Reservas', callback_data: 'menu_reservas' }],
    [{ text: '👨‍🏫 Buscar Profesor', callback_data: 'menu_profe' }],
    [{ text: '📚 Horario Materia', callback_data: 'menu_materia' }],
  ];
  if (['director', 'admin'].includes(rol)) {
    buttons.push([{ text: '📊 Estado General', callback_data: 'menu_estado' }]);
  }
  buttons.push([{ text: '⚙️ Mi Perfil', callback_data: 'menu_perfil' }]);
  return { inline_keyboard: buttons };
}

function dayButtons() {
  return {
    inline_keyboard: [
      [{ text: '📅 Hoy', callback_data: 'day_Hoy' }, { text: '📅 Manana', callback_data: 'day_Manana' }],
      [{ text: 'Lunes', callback_data: 'day_Lunes' }, { text: 'Martes', callback_data: 'day_Martes' }, { text: 'Miercoles', callback_data: 'day_Miercoles' }],
      [{ text: 'Jueves', callback_data: 'day_Jueves' }, { text: 'Viernes', callback_data: 'day_Viernes' }]
    ]
  };
}

function timeButtons(dia) {
  return {
    inline_keyboard: [
      [{ text: '07:00', callback_data: `hora_${dia}_07:00` }, { text: '08:00', callback_data: `hora_${dia}_08:00` }, { text: '09:00', callback_data: `hora_${dia}_09:00` }],
      [{ text: '10:00', callback_data: `hora_${dia}_10:00` }, { text: '11:00', callback_data: `hora_${dia}_11:00` }, { text: '12:00', callback_data: `hora_${dia}_12:00` }],
      [{ text: '14:00', callback_data: `hora_${dia}_14:00` }, { text: '15:00', callback_data: `hora_${dia}_15:00` }, { text: '16:00', callback_data: `hora_${dia}_16:00` }],
      [{ text: '17:00', callback_data: `hora_${dia}_17:00` }, { text: '18:00', callback_data: `hora_${dia}_18:00` }, { text: '19:00', callback_data: `hora_${dia}_19:00` }],
      [{ text: '« Volver', callback_data: 'menu_aulas' }]
    ]
  };
}

// ==========================================
// ENVIAR MENU PRINCIPAL
// ==========================================

async function sendMainMenu(chatId, session) {
  const name = await getSessionName(session);
  await bot.sendMessage(chatId,
    `Hola ${name}! Soy *Roomie*, tu asistente de aulas UIDE.\n\nElige una opcion:`,
    { parse_mode: 'Markdown', reply_markup: mainMenuInline(session.rol) }
  );
}

// ==========================================
// COMANDO /start y AUTO-START
// ==========================================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const session = await getSession(msg.from.id);
    if (session) {
      userState.delete(chatId);
      await sendMainMenu(chatId, session);
    } else {
      userState.set(chatId, { state: 'WAITING_CEDULA' });
      await bot.sendMessage(chatId,
        'Hola! Soy *Roomie*, tu asistente de aulas en la UIDE.\n\nPara empezar, necesito verificar tu identidad.\n\nEnvia tu numero de *cedula* (10 digitos):',
        { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
      );
    }
  } catch (e) {
    console.error('Error en start:', e);
    await bot.sendMessage(chatId, 'Algo salio mal. Intenta de nuevo.');
  }
});

// COMANDO /menu
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  const session = await getSession(msg.from.id);
  if (session) {
    await sendMainMenu(chatId, session);
  } else {
    userState.set(chatId, { state: 'WAITING_CEDULA' });
    await bot.sendMessage(chatId, 'Primero necesito tu cedula (10 digitos) para identificarte:');
  }
});

// COMANDO /logout
bot.onText(/\/logout|\/reset/, async (msg) => {
  const chatId = msg.chat.id;
  const tid = String(msg.from.id);
  try {
    await pool.query('DELETE FROM bot_sessions WHERE telegram_id = $1', [tid]);
    await pool.query('UPDATE estudiantes SET telegram_id = NULL WHERE telegram_id = $1', [tid]);
    userState.set(chatId, { state: 'WAITING_CEDULA' });
    await bot.sendMessage(chatId, 'Sesion cerrada. Envia tu cedula cuando quieras volver a entrar.', {
      reply_markup: { remove_keyboard: true }
    });
  } catch (e) {
    console.error('Error en logout:', e);
  }
});

// ==========================================
// HANDLER DE MENSAJES (texto libre)
// ==========================================

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const fromId = msg.from.id;

  try {
    const stateObj = userState.get(chatId);
    const state = stateObj?.state || null;

    // --- AUTO-START: si no tiene sesion, pedir cedula ---
    const session = await getSession(fromId);
    if (!session && state !== 'WAITING_CEDULA') {
      userState.set(chatId, { state: 'WAITING_CEDULA' });
      await bot.sendMessage(chatId,
        'Hola! Soy *Roomie*. Para usar el bot, necesito tu cedula (10 digitos):',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // --- LOGIN CON CEDULA ---
    if (state === 'WAITING_CEDULA') {
      if (!/^\d{10}$/.test(text)) {
        await bot.sendMessage(chatId, 'Esa cedula no parece valida (deben ser 10 numeros). Intenta de nuevo:');
        return;
      }
      const user = await authenticateUser(text, fromId);
      if (user) {
        userState.delete(chatId);
        const newSession = await getSession(fromId);
        await bot.sendMessage(chatId,
          `Bienvenido/a *${escMd(user.name)}*! Conectado como *${user.rol.toUpperCase()}*.`,
          { parse_mode: 'Markdown' }
        );
        await sendMainMenu(chatId, newSession);
      } else {
        await bot.sendMessage(chatId,
          'No encontre esa cedula en el sistema.\n\nAsegurate de estar matriculado/registrado e intenta de nuevo:'
        );
      }
      return;
    }

    // --- BUSCANDO PROFESOR (esperando nombre) ---
    if (state === 'SEARCHING_TEACHER') {
      const schedule = await findTeacher(text);
      userState.delete(chatId);
      if (schedule.length === 0) {
        await bot.sendMessage(chatId, `No encontre clases para "${text}". Prueba con otro nombre o apellido.`, {
          reply_markup: { inline_keyboard: [[{ text: '🔍 Buscar otro', callback_data: 'menu_profe' }, { text: '« Menu', callback_data: 'go_menu' }]] }
        });
      } else {
        let response = `*Horario de ${escMd(schedule[0].docente)}:*\n\n`;
        schedule.forEach(c => {
          response += `${escMd(c.dia)} ${escMd(c.hora_inicio)}-${escMd(c.hora_fin)}\n  Aula: *${escMd(c.aula_asignada || 'Sin asignar')}*\n  ${escMd(c.materia)}\n\n`;
        });
        await bot.sendMessage(chatId, response, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '🔍 Buscar otro', callback_data: 'menu_profe' }, { text: '« Menu', callback_data: 'go_menu' }]] }
        });
      }
      return;
    }

    // --- BUSCANDO MATERIA (esperando nombre) ---
    if (state === 'SEARCHING_SUBJECT') {
      const classes = await findSubjectClasses(text);
      userState.delete(chatId);
      if (classes.length === 0) {
        await bot.sendMessage(chatId, `No encontre "${text}" en el sistema. Revisa el nombre.`, {
          reply_markup: { inline_keyboard: [[{ text: '🔍 Buscar otra', callback_data: 'menu_materia' }, { text: '« Menu', callback_data: 'go_menu' }]] }
        });
      } else {
        let response = `*Horarios de "${escMd(classes[0].materia)}":*\n\n`;
        classes.forEach(c => {
          response += `${escMd(c.dia)} ${escMd(c.hora_inicio)}-${escMd(c.hora_fin)}: *${escMd(c.aula_asignada || 'S/A')}* (${escMd(c.docente ? c.docente.split(' ')[0] : '')})\n`;
        });
        await bot.sendMessage(chatId, response, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '🔍 Buscar otra', callback_data: 'menu_materia' }, { text: '« Menu', callback_data: 'go_menu' }]] }
        });
      }
      return;
    }

    // --- DETECCION NATURAL: buscar profesor por voz/texto ---
    const teacherKeywords = ['profesor', 'profe', 'ingeniera', 'ingeniero', 'ing', 'docente', 'donde esta'];
    const isTeacherSearch = teacherKeywords.some(k => normalizeText(text).includes(k));
    if (isTeacherSearch) {
      let cleanName = text.replace(/¿|\?|a que hora tiene clases la |clases de la |a que hora tiene clases |clases de |el profesor |la ingeniera |el ingeniero |el profe |la profe |donde esta el |donde esta la |donde esta |ingeniera |ingeniero |profesor |docente |ing /gi, '').trim();
      if (cleanName.length > 2) {
        const schedule = await findTeacher(cleanName);
        if (schedule.length > 0) {
          let response = `*Ubicacion de ${escMd(schedule[0].docente)}:*\n\n`;
          schedule.forEach(c => {
            response += `${escMd(c.dia)} ${escMd(c.hora_inicio)}-${escMd(c.hora_fin)}\n  Aula: *${escMd(c.aula_asignada || 'S/A')}* | ${escMd(c.materia)}\n\n`;
          });
          await bot.sendMessage(chatId, response, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '« Menu', callback_data: 'go_menu' }]] }
          });
          return;
        }
      }
    }

    // --- DETECCION NATURAL: dia + hora para buscar aulas ---
    const day = extractDay(text);
    const time = extractTime(text);
    if (day && time) {
      await searchAndShowRooms(chatId, day.formatted, time);
      return;
    }
    if (day && !time) {
      await bot.sendMessage(chatId, `Para el *${day.formatted}*, a que hora?`, {
        parse_mode: 'Markdown',
        reply_markup: timeButtons(day.formatted)
      });
      return;
    }

    // --- FALLBACK: mostrar menu ---
    await bot.sendMessage(chatId, 'No te entendi. Usa los botones del menu:', {
      reply_markup: mainMenuInline(session?.rol || 'estudiante')
    });

  } catch (error) {
    console.error('Error en mensaje:', error);
    await bot.sendMessage(chatId, 'Ocurrio un error. Intenta de nuevo.');
  }
});

// ==========================================
// HANDLER DE VOZ
// ==========================================

bot.on('voice', async (msg) => {
  const chatId = msg.chat.id;
  const waitingMsg = await bot.sendMessage(chatId, 'Escuchando...');
  const text = await transcribeAudio(msg.voice.file_id);

  if (!text) {
    await bot.editMessageText('No pude entender tu nota de voz. Intenta escribiendo.', {
      chat_id: chatId, message_id: waitingMsg.message_id
    });
    return;
  }

  await bot.editMessageText(`Entendi: "${text}"`, {
    chat_id: chatId, message_id: waitingMsg.message_id
  });

  // Simular que escribio ese texto
  await bot.emit('message', { ...msg, text, voice: undefined });
});

// ==========================================
// BUSCAR Y MOSTRAR AULAS (reutilizable)
// ==========================================

async function searchAndShowRooms(chatId, dia, hora) {
  try {
    const { rooms, horaFin } = await getAvailableRooms(dia, hora);

    if (rooms.length === 0) {
      await bot.sendMessage(chatId, `No hay aulas disponibles el ${dia} a las ${hora}.`, {
        reply_markup: { inline_keyboard: [
          [{ text: '🔄 Otra hora', callback_data: `day_${dia}` }],
          [{ text: '« Menu', callback_data: 'go_menu' }]
        ]}
      });
      return;
    }

    let msg = `*Aulas disponibles (${dia} ${hora}-${horaFin}):*\n\n`;
    rooms.forEach(a => {
      msg += `*${escMd(a.codigo)}* - ${escMd(a.nombre)} (${a.capacidad} personas)\n`;
    });
    msg += '\nPulsa para reservar:';

    // Botones de reserva - usar formato seguro sin _ en el codigo del aula
    const buttons = rooms.map(a => [{
      text: `✅ Reservar ${a.codigo}`,
      callback_data: `res|${a.codigo}|${dia}|${hora}|${horaFin}`
    }]);
    buttons.push([{ text: '🔄 Otra hora', callback_data: `day_${dia}` }, { text: '« Menu', callback_data: 'go_menu' }]);

    await bot.sendMessage(chatId, msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (e) {
    console.error('Error buscando aulas:', e);
    await bot.sendMessage(chatId, 'Error al buscar aulas. Intenta de nuevo.');
  }
}

// ==========================================
// CALLBACK QUERIES (todos los botones inline)
// ==========================================

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const fromId = query.from.id;

  try {
    await bot.answerCallbackQuery(query.id);

    // --- MENU PRINCIPAL ---
    if (data === 'go_menu') {
      const session = await getSession(fromId);
      if (!session) return;
      userState.delete(chatId);
      await sendMainMenu(chatId, session);
      return;
    }

    // --- BUSCAR AULAS: elegir dia ---
    if (data === 'menu_aulas') {
      await bot.sendMessage(chatId, 'Para que dia buscamos aulas?', { reply_markup: dayButtons() });
      return;
    }

    // --- DIA SELECCIONADO ---
    if (data.startsWith('day_')) {
      let dia = data.substring(4);

      // Resolver "Hoy" y "Manana"
      if (dia === 'Hoy') {
        dia = getTodayName();
      } else if (dia === 'Manana') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const d = extractDay(normalizeText(tomorrow.toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil', weekday: 'long' })));
        dia = d ? d.formatted : 'Martes';
      }

      await bot.sendMessage(chatId, `*${dia}* - A que hora?`, {
        parse_mode: 'Markdown',
        reply_markup: timeButtons(dia)
      });
      return;
    }

    // --- HORA SELECCIONADA: buscar aulas ---
    if (data.startsWith('hora_')) {
      // formato: hora_Lunes_10:00
      const parts = data.split('_');
      const hora = parts.pop();
      const dia = parts.slice(1).join('_');
      await searchAndShowRooms(chatId, dia, hora);
      return;
    }

    // --- RESERVAR AULA (un clic) ---
    if (data.startsWith('res|')) {
      const parts = data.split('|');
      // res|AULA 1|Lunes|10:00|12:00
      const aula = parts[1];
      const dia = parts[2];
      const horaInicio = parts[3];
      const horaFin = parts[4];
      const tid = String(fromId);

      const session = await getSession(fromId);
      if (!session) {
        await bot.sendMessage(chatId, 'Necesitas iniciar sesion primero. Envia /start');
        return;
      }

      // Verificar que no tenga ya una reserva en ese horario
      const existing = await pool.query(
        `SELECT id FROM reservas WHERE telegram_id = $1 AND dia = $2 AND hora_inicio = $3 AND estado = 'activa'`,
        [tid, dia, horaInicio]
      );
      if (existing.rows.length > 0) {
        await bot.sendMessage(chatId, `Ya tienes una reserva para el ${dia} a las ${horaInicio}.`, {
          reply_markup: { inline_keyboard: [[{ text: '📅 Ver mis reservas', callback_data: 'menu_reservas' }]] }
        });
        return;
      }

      await pool.query(
        `INSERT INTO reservas (aula_codigo, dia, hora_inicio, hora_fin, telegram_id, estado) VALUES ($1, $2, $3, $4, $5, 'activa')`,
        [aula, dia, horaInicio, horaFin, tid]
      );

      try {
        await bot.editMessageText(
          `*Reserva Confirmada*\n\nAula: *${escMd(aula)}*\nDia: ${escMd(dia)}\nHora: ${escMd(horaInicio)} - ${escMd(horaFin)}\n\nTe avisare 15 min antes.`,
          { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '📅 Mis reservas', callback_data: 'menu_reservas' }, { text: '« Menu', callback_data: 'go_menu' }]] }
          }
        );
      } catch (_) {
        await bot.sendMessage(chatId, `Reserva confirmada: *${escMd(aula)}* (${dia} ${horaInicio}-${horaFin})`, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '« Menu', callback_data: 'go_menu' }]] }
        });
      }
      return;
    }

    // --- MIS RESERVAS ---
    if (data === 'menu_reservas') {
      const tid = String(fromId);
      const res = await pool.query(
        `SELECT id, aula_codigo, dia, hora_inicio, hora_fin FROM reservas WHERE telegram_id = $1 AND estado = 'activa' ORDER BY fecha, hora_inicio`,
        [tid]
      );

      if (res.rows.length === 0) {
        await bot.sendMessage(chatId, 'No tienes reservas activas.', {
          reply_markup: { inline_keyboard: [[{ text: '🔍 Buscar aulas', callback_data: 'menu_aulas' }, { text: '« Menu', callback_data: 'go_menu' }]] }
        });
      } else {
        let msg = '*Tus Reservas Activas:*\n\n';
        const buttons = [];
        res.rows.forEach(r => {
          msg += `*${escMd(r.aula_codigo)}*: ${escMd(r.dia)} ${escMd(r.hora_inicio)}-${escMd(r.hora_fin)}\n`;
          buttons.push([{ text: `❌ Cancelar ${r.aula_codigo} (${r.dia} ${r.hora_inicio})`, callback_data: `cancelar_${r.id}` }]);
        });
        buttons.push([{ text: '« Menu', callback_data: 'go_menu' }]);
        await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
      }
      return;
    }

    // --- CANCELAR RESERVA ---
    if (data.startsWith('cancelar_')) {
      const reservaId = data.split('_')[1];
      const tid = String(fromId);
      const res = await pool.query('DELETE FROM reservas WHERE id = $1 AND telegram_id = $2 RETURNING *', [reservaId, tid]);
      if (res.rows.length > 0) {
        await bot.sendMessage(chatId, 'Reserva cancelada.', {
          reply_markup: { inline_keyboard: [[{ text: '📅 Mis reservas', callback_data: 'menu_reservas' }, { text: '« Menu', callback_data: 'go_menu' }]] }
        });
      } else {
        await bot.sendMessage(chatId, 'No se pudo cancelar (ya fue cancelada o no existe).');
      }
      return;
    }

    // --- BUSCAR PROFESOR ---
    if (data === 'menu_profe') {
      userState.set(chatId, { state: 'SEARCHING_TEACHER' });
      await bot.sendMessage(chatId, 'Escribe el apellido del profesor que buscas:');
      return;
    }

    // --- HORARIO MATERIA ---
    if (data === 'menu_materia') {
      userState.set(chatId, { state: 'SEARCHING_SUBJECT' });
      await bot.sendMessage(chatId, 'Escribe el nombre de la materia (o una parte):');
      return;
    }

    // --- ESTADO GENERAL (admin/director) ---
    if (data === 'menu_estado') {
      const session = await getSession(fromId);
      if (!session || !['admin', 'director'].includes(session.rol)) {
        await bot.sendMessage(chatId, 'No tienes permisos para esta opcion.');
        return;
      }

      const stats = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM clases) as total_clases,
          (SELECT COUNT(*) FROM aulas WHERE estado ILIKE 'disponible') as aulas_disponibles,
          (SELECT COUNT(*) FROM distribucion) as distribuciones,
          (SELECT COUNT(*) FROM reservas WHERE estado = 'activa') as reservas_activas,
          (SELECT COUNT(*) FROM estudiantes) as total_estudiantes
      `);
      const s = stats.rows[0];

      await bot.sendMessage(chatId,
        `*Estado del Sistema UIDE*\n\n` +
        `Clases registradas: *${s.total_clases}*\n` +
        `Aulas disponibles: *${s.aulas_disponibles}*\n` +
        `Distribuciones activas: *${s.distribuciones}*\n` +
        `Reservas activas: *${s.reservas_activas}*\n` +
        `Estudiantes registrados: *${s.total_estudiantes}*`,
        { parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '« Menu', callback_data: 'go_menu' }]] }
        }
      );
      return;
    }

    // --- MI PERFIL ---
    if (data === 'menu_perfil') {
      const session = await getSession(fromId);
      if (!session) return;
      const name = await getSessionName(session);

      await bot.sendMessage(chatId,
        `*Perfil Roomie*\n\n` +
        `Nombre: *${escMd(name)}*\n` +
        `Rol: *${session.rol.toUpperCase()}*\n` +
        `Tipo: ${session.user_type}\n` +
        `Sesion: Activa`,
        { parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [
            [{ text: '🚪 Cerrar sesion', callback_data: 'logout_confirm' }],
            [{ text: '« Menu', callback_data: 'go_menu' }]
          ]}
        }
      );
      return;
    }

    // --- CERRAR SESION ---
    if (data === 'logout_confirm') {
      const tid = String(fromId);
      await pool.query('DELETE FROM bot_sessions WHERE telegram_id = $1', [tid]);
      await pool.query('UPDATE estudiantes SET telegram_id = NULL WHERE telegram_id = $1', [tid]);
      userState.delete(chatId);
      await bot.sendMessage(chatId, 'Sesion cerrada. Envia cualquier mensaje para volver a identificarte.', {
        reply_markup: { remove_keyboard: true }
      });
      return;
    }

  } catch (error) {
    console.error('Error en callback:', error);
    await bot.sendMessage(chatId, 'Ocurrio un error. Intenta de nuevo.').catch(() => {});
  }
});

// ==========================================
// ERRORES
// ==========================================

bot.on('polling_error', (error) => {
  if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
    console.warn('Conflicto de Polling: otra instancia usa este token.');
  } else if (error.code === 'EFATAL' || error.message?.includes('ECONNRESET')) {
    console.warn('Error de red temporal en Polling. Reintentando...');
  } else {
    console.error('Error de Telegram Polling:', error.message);
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// ==========================================
// NOTIFICACIONES (cada 60s)
// ==========================================

setInterval(async () => {
  try {
    const now = new Date();
    const options = { timeZone: 'America/Guayaquil', hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'long' };
    const formatter = new Intl.DateTimeFormat('es-ES', options);
    const parts = formatter.formatToParts(now);

    const map = { 'lunes': 'Lunes', 'martes': 'Martes', 'miercoles': 'Miercoles', 'miércoles': 'Miercoles', 'jueves': 'Jueves', 'viernes': 'Viernes', 'sabado': 'Sabado', 'sábado': 'Sabado', 'domingo': 'Domingo' };
    const wd = parts.find(p => p.type === 'weekday').value.toLowerCase();
    const day = map[wd] || map[wd.normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
    if (!day) return;

    const h = parseInt(parts.find(p => p.type === 'hour').value);
    const m = parseInt(parts.find(p => p.type === 'minute').value);
    let targetH = h;
    let targetM = m + 15;
    if (targetM >= 60) { targetM -= 60; targetH = (targetH + 1) % 24; }
    const timeStr = `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`;

    // Notificar reservas
    const res = await pool.query(
      `SELECT telegram_id, aula_codigo FROM reservas WHERE dia = $1 AND hora_inicio = $2 AND estado = 'activa'`,
      [day, timeStr]
    );
    for (const r of res.rows) {
      bot.sendMessage(r.telegram_id, `Tu reserva en *${escMd(r.aula_codigo)}* empieza en 15 min.`, { parse_mode: 'Markdown' }).catch(() => {});
    }

    // Notificar clases
    const clases = await pool.query(
      `SELECT carrera, ciclo, materia, aula_asignada FROM clases WHERE dia = $1 AND hora_inicio = $2`,
      [day, timeStr]
    );
    for (const c of clases.rows) {
      const studs = await pool.query(
        `SELECT telegram_id FROM estudiantes WHERE escuela ILIKE $1 AND nivel ILIKE $2 AND telegram_id IS NOT NULL`,
        [`%${c.carrera}%`, `%${c.ciclo}%`]
      );
      for (const s of studs.rows) {
        bot.sendMessage(s.telegram_id,
          `Clase en 15 min: *${escMd(c.materia)}* en *${escMd(c.aula_asignada || 'sin aula')}*`,
          { parse_mode: 'Markdown' }
        ).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Error cron:', e);
  }
}, 60000);

console.log('Roomie Bot iniciado.');
