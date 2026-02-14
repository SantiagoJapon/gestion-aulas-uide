const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// ==========================================
// CONFIGURACION Y CONEXION
// ==========================================

const requiredEnv = ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`Faltan variables de entorno: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL.replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;
const BOT_PORT = Number(process.env.BOT_PORT || 3020);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

const app = express();
app.use(express.json());

// ==========================================
// CONSTANTES Y HELPERS
// ==========================================

function normalizeText(value) {
  return value?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() || '';
}

function formatPhone(jid) {
  if (!jid) return null;
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
}

// ==========================================
// EVOLUTION API - ENVIO DE MENSAJES
// ==========================================

async function sendText(phone, text) {
  try {
    await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      { number: phone, text },
      { headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
  } catch (error) {
    console.error(`Error enviando mensaje a ${phone}:`, error.response?.data || error.message);
  }
}

async function sendButtons(phone, text, buttons) {
  try {
    await axios.post(
      `${EVOLUTION_API_URL}/message/sendButtons/${EVOLUTION_INSTANCE}`,
      {
        number: phone,
        title: '',
        description: text,
        buttons: buttons.map((b, i) => ({
          type: 'reply',
          buttonId: b.id || String(i + 1),
          buttonText: { displayText: b.text }
        }))
      },
      { headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
  } catch (error) {
    // Fallback: si sendButtons falla, enviar como texto con opciones numeradas
    console.warn('sendButtons no disponible, usando texto numerado');
    let fallback = text + '\n\n';
    buttons.forEach((b, i) => {
      fallback += `*${i + 1}.* ${b.text}\n`;
    });
    fallback += '\n_Responde con el numero de la opcion._';
    await sendText(phone, fallback);
  }
}

async function sendList(phone, text, title, sections) {
  try {
    await axios.post(
      `${EVOLUTION_API_URL}/message/sendList/${EVOLUTION_INSTANCE}`,
      {
        number: phone,
        title: '',
        description: text,
        buttonText: title,
        sections
      },
      { headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
  } catch (error) {
    // Fallback a texto numerado
    console.warn('sendList no disponible, usando texto numerado');
    let fallback = text + '\n\n';
    let idx = 1;
    for (const section of sections) {
      if (section.title) fallback += `*${section.title}*\n`;
      for (const row of section.rows) {
        fallback += `*${idx}.* ${row.title}\n`;
        idx++;
      }
      fallback += '\n';
    }
    fallback += '_Responde con el numero de la opcion._';
    await sendText(phone, fallback);
  }
}

// ==========================================
// INICIALIZACION BD
// ==========================================

async function initDB() {
  const client = await pool.connect();
  try {
    // Crear tabla bot_sessions con telefono en vez de telegram_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_sessions (
        telefono VARCHAR(20) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        rol VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrar: si existe columna telegram_id, agregar telefono
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bot_sessions' AND column_name = 'telegram_id'
    `);
    if (colCheck.rows.length > 0) {
      // La tabla vieja existe con telegram_id, agregar telefono si no existe
      const telCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'bot_sessions' AND column_name = 'telefono'
      `);
      if (telCheck.rows.length === 0) {
        await client.query(`ALTER TABLE bot_sessions ADD COLUMN telefono VARCHAR(20)`);
        console.log('Columna telefono agregada a bot_sessions');
      }
    }

    // --- ASEGURAR RESTRICCION UNICA PARA WHATSAPP ---
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bot_sessions_telefono_unique') THEN
          ALTER TABLE bot_sessions ADD CONSTRAINT bot_sessions_telefono_unique UNIQUE (telefono);
        END IF;
      EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'No se pudo agregar constraint unico (tal vez ya existe o hay nulos)';
      END $$;
    `);

    // Crear tabla reservas con telefono
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id SERIAL PRIMARY KEY,
        aula_codigo VARCHAR(50),
        dia VARCHAR(20),
        hora_inicio VARCHAR(10),
        hora_fin VARCHAR(10),
        telefono VARCHAR(20),
        cedula VARCHAR(20),
        usuario_nombre VARCHAR(100),
        motivo TEXT,
        estado VARCHAR(20) DEFAULT 'activa',
        fecha DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrar reservas: agregar telefono si no existe
    const resColCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'reservas' AND column_name = 'telefono'
    `);
    if (resColCheck.rows.length === 0) {
      await client.query(`ALTER TABLE reservas ADD COLUMN telefono VARCHAR(20)`);
      console.log('Columna telefono agregada a reservas');
    }

    console.log('Tablas bot_sessions y reservas verificadas (WhatsApp mode).');
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

// Menu principal - opciones numeradas con IDs
const MENU_OPTIONS = [
  { id: 'menu_aulas', label: 'Buscar Aulas Libres', emoji: '1' },
  { id: 'menu_reservas', label: 'Mis Reservas', emoji: '2' },
  { id: 'menu_profe', label: 'Buscar Profesor', emoji: '3' },
  { id: 'menu_materia', label: 'Horario Materia', emoji: '4' },
  { id: 'menu_estado', label: 'Estado General', emoji: '5', roles: ['director', 'admin'] },
  { id: 'menu_perfil', label: 'Mi Perfil', emoji: '6' },
];

const DAYS = [
  { raw: 'lunes', formatted: 'Lunes' },
  { raw: 'martes', formatted: 'Martes' },
  { raw: 'miercoles', formatted: 'Miercoles' },
  { raw: 'jueves', formatted: 'Jueves' },
  { raw: 'viernes', formatted: 'Viernes' },
  { raw: 'sabado', formatted: 'Sabado' },
  { raw: 'domingo', formatted: 'Domingo' }
];

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
];

// ==========================================
// OPTIMIZACION DE MEMORIA
// ==========================================
// Limpiar estados de usuario inactivos cada 30 minutos para evitar fugas de memoria
setInterval(() => {
  const now = Date.now();
  const INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30 minutos

  for (const [phone, state] of userState.entries()) {
    if (state.lastActivity && (now - state.lastActivity > INACTIVE_TIMEOUT)) {
      userState.delete(phone);
    }
  }
}, 30 * 60 * 1000);

// Helper para actualizar actividad
function updateActivity(phone) {
  const state = userState.get(phone) || {};
  state.lastActivity = Date.now();
  userState.set(phone, state);
}

// ==========================================
// FUNCIONES DE BD
// ==========================================

async function getSession(telefono) {
  const phone = String(telefono);

  // Buscar por telefono en bot_sessions
  let res = await pool.query('SELECT * FROM bot_sessions WHERE telefono = $1', [phone]);
  if (res.rows.length > 0) return res.rows[0];

  // Buscar por telefono (campo telefono de la tabla) como PK legacy
  res = await pool.query('SELECT * FROM bot_sessions WHERE telefono = $1', [phone]);
  if (res.rows.length > 0) return res.rows[0];

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

async function authenticateUser(cedula, telefono) {
  const client = await pool.connect();
  try {
    const phone = String(telefono);

    // Buscar en usuarios (admin, director, etc)
    const userRes = await client.query("SELECT * FROM usuarios WHERE cedula = $1 AND estado = 'activo'", [cedula]);
    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      await client.query(`
        INSERT INTO bot_sessions (telefono, user_id, user_type, rol)
        VALUES ($1, $2, 'usuario', $3)
        ON CONFLICT (telefono)
        DO UPDATE SET user_id = EXCLUDED.user_id, user_type = EXCLUDED.user_type, rol = EXCLUDED.rol
      `, [phone, user.id, user.rol]);
      return { name: user.nombre.split(' ')[0], rol: user.rol, type: 'usuario' };
    }

    // Buscar en estudiantes
    const estRes = await client.query('SELECT * FROM estudiantes WHERE cedula = $1', [cedula]);
    if (estRes.rows.length > 0) {
      const est = estRes.rows[0];
      await client.query('UPDATE estudiantes SET telefono = $1 WHERE cedula = $2', [phone, cedula]);
      await client.query(`
        INSERT INTO bot_sessions (telefono, user_id, user_type, rol)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (telefono)
        DO UPDATE SET user_id = EXCLUDED.user_id, user_type = EXCLUDED.user_type, rol = EXCLUDED.rol
      `, [phone, est.id || 0, 'estudiante', 'estudiante']);
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

  return DAYS.find(d => normalized.includes(d.raw)) || null;
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
// VOZ (Groq Whisper)
// ==========================================

async function transcribeAudio(audioUrl) {
  try {
    const apiKey = process.env.VOICE_API_KEY;
    if (!apiKey || apiKey === 'tu_api_key_aqui') return null;

    const stream = await axios.get(audioUrl, { responseType: 'stream' });

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

// Descargar audio desde Evolution API
async function getAudioUrl(messageData) {
  try {
    const mediaMsg = messageData.message?.audioMessage || messageData.message?.pttMessage;
    if (!mediaMsg) return null;

    // Evolution API expone el media como base64 en el webhook o como URL
    if (messageData.message?.base64) {
      // Si viene como base64, necesitamos guardarlo temporal - pero mejor usar mediaUrl
      return null;
    }

    // Intentar obtener media URL via API
    const messageId = messageData.key?.id;
    if (!messageId) return null;

    const response = await axios.post(
      `${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`,
      { message: { key: messageData.key }, convertToMp4: false },
      { headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    if (response.data?.base64) {
      // Convertir base64 a buffer y crear un stream temporal
      const buffer = Buffer.from(response.data.base64, 'base64');
      // Guardar temporalmente
      const fs = require('fs');
      const path = require('path');
      const tmpFile = path.join(__dirname, `tmp_audio_${Date.now()}.ogg`);
      fs.writeFileSync(tmpFile, buffer);

      // Transcribir directamente con el archivo
      const apiKey = process.env.VOICE_API_KEY;
      if (!apiKey || apiKey === 'tu_api_key_aqui') {
        fs.unlinkSync(tmpFile);
        return null;
      }

      const form = new FormData();
      form.append('file', fs.createReadStream(tmpFile), 'voice.ogg');
      form.append('model', 'whisper-large-v3');
      form.append('language', 'es');

      const transcription = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
        headers: { ...form.getHeaders(), 'Authorization': `Bearer ${apiKey}` }
      });

      fs.unlinkSync(tmpFile);
      return transcription.data.text;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo audio:', error.response?.data || error.message);
    return null;
  }
}

// ==========================================
// MENUS (texto formateado para WhatsApp)
// ==========================================

async function sendMainMenu(phone, session) {
  const name = await getSessionName(session);
  const visibleOptions = MENU_OPTIONS.filter(opt => {
    if (opt.roles && !opt.roles.includes(session.rol)) return false;
    return true;
  });

  let text = `Hola *${name}*! Soy *Roomie*, tu asistente de aulas UIDE.\n\nElige una opcion:\n\n`;
  visibleOptions.forEach((opt, i) => {
    text += `*${i + 1}.* ${opt.label}\n`;
  });
  text += `\n_Responde con el numero de la opcion._`;

  // Guardar el mapeo de opciones para este usuario
  userState.set(phone, { state: 'MAIN_MENU', options: visibleOptions });
  await sendText(phone, text);
}

async function sendDayMenu(phone) {
  let text = `*Selecciona el dia:*\n\n`;
  text += `*1.* Hoy\n*2.* Manana\n`;
  DAYS.slice(0, 5).forEach((d, i) => {
    text += `*${i + 3}.* ${d.formatted}\n`;
  });
  text += `\n_Responde con el numero._`;
  userState.set(phone, { state: 'SELECTING_DAY' });
  await sendText(phone, text);
}

async function sendTimeMenu(phone, dia) {
  let text = `*${dia}* - Selecciona la hora:\n\n`;
  TIME_SLOTS.forEach((t, i) => {
    text += `*${i + 1}.* ${t}\n`;
  });
  text += `*0.* Volver\n`;
  text += `\n_Responde con el numero._`;
  userState.set(phone, { state: 'SELECTING_TIME', dia });
  await sendText(phone, text);
}

// ==========================================
// BUSCAR Y MOSTRAR AULAS
// ==========================================

async function searchAndShowRooms(phone, dia, hora) {
  try {
    const { rooms, horaFin } = await getAvailableRooms(dia, hora);

    if (rooms.length === 0) {
      await sendText(phone, `No hay aulas disponibles el ${dia} a las ${hora}.\n\nEscribe *menu* para volver al menu principal.`);
      userState.delete(phone);
      return;
    }

    let msg = `*Aulas disponibles (${dia} ${hora}-${horaFin}):*\n\n`;
    rooms.forEach((a, i) => {
      msg += `*${i + 1}.* ${a.codigo} - ${a.nombre} (${a.capacidad} pers.)\n`;
    });
    msg += `\n*0.* Volver al menu\n`;
    msg += `\n_Responde con el numero para reservar._`;

    userState.set(phone, {
      state: 'SELECTING_ROOM',
      rooms,
      dia,
      horaInicio: hora,
      horaFin
    });
    await sendText(phone, msg);
  } catch (e) {
    console.error('Error buscando aulas:', e);
    await sendText(phone, 'Error al buscar aulas. Intenta de nuevo.');
  }
}

// ==========================================
// PROCESAR MENSAJE ENTRANTE
// ==========================================

async function handleMessage(phone, text, messageData) {
  console.log(`Mensaje de ${phone}: "${text}"`);
  updateActivity(phone);

  try {
    const stateObj = userState.get(phone);
    const state = stateObj?.state || null;

    // --- AUTO-START: si no tiene sesion, pedir cedula ---
    const session = await getSession(phone);
    if (!session && state !== 'WAITING_CEDULA') {
      userState.set(phone, { state: 'WAITING_CEDULA' });
      await sendText(phone,
        'Hola! Soy *Roomie*, tu asistente de aulas en la UIDE.\n\nPara empezar, necesito verificar tu identidad.\n\nEnvia tu numero de *cedula* (10 digitos):'
      );
      return;
    }

    // --- COMANDOS GLOBALES ---
    const n = normalizeText(text);
    if (n === 'menu' || n === '/menu' || n === 'inicio' || n === '/start') {
      if (session) {
        userState.delete(phone);
        await sendMainMenu(phone, session);
      } else {
        userState.set(phone, { state: 'WAITING_CEDULA' });
        await sendText(phone, 'Primero necesito tu cedula (10 digitos) para identificarte:');
      }
      return;
    }

    if (n === 'salir' || n === '/logout' || n === 'cerrar sesion') {
      await pool.query('DELETE FROM bot_sessions WHERE telefono = $1', [phone]);
      await pool.query('UPDATE estudiantes SET telefono = NULL WHERE telefono = $1', [phone]);
      userState.set(phone, { state: 'WAITING_CEDULA' });
      await sendText(phone, 'Sesion cerrada. Envia tu cedula cuando quieras volver a entrar.');
      return;
    }

    // --- LOGIN CON CEDULA ---
    if (state === 'WAITING_CEDULA') {
      if (!/^\d{10}$/.test(text)) {
        await sendText(phone, 'Esa cedula no parece valida (deben ser 10 numeros). Intenta de nuevo:');
        return;
      }
      const user = await authenticateUser(text, phone);
      if (user) {
        userState.delete(phone);
        const newSession = await getSession(phone);
        await sendText(phone, `Bienvenido/a *${user.name}*! Conectado como *${user.rol.toUpperCase()}*.`);
        await sendMainMenu(phone, newSession);
      } else {
        await sendText(phone, 'No encontre esa cedula en el sistema.\n\nAsegurate de estar matriculado/registrado e intenta de nuevo:');
      }
      return;
    }

    // --- MENU PRINCIPAL: usuario selecciono un numero ---
    if (state === 'MAIN_MENU') {
      const num = parseInt(text);
      const options = stateObj.options;
      if (num >= 1 && num <= options.length) {
        const selected = options[num - 1];
        await handleMenuAction(phone, selected.id, session);
        return;
      }
      // Si no es un numero valido, intentar deteccion natural
    }

    // --- SELECCION DE DIA ---
    if (state === 'SELECTING_DAY') {
      const num = parseInt(text);
      let dia = null;

      if (num === 1) {
        dia = getTodayName();
      } else if (num === 2) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const d = extractDay(normalizeText(tomorrow.toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil', weekday: 'long' })));
        dia = d ? d.formatted : 'Martes';
      } else if (num >= 3 && num <= 7) {
        dia = DAYS[num - 3]?.formatted;
      }

      if (dia) {
        await sendTimeMenu(phone, dia);
        return;
      }

      // Intentar extraer dia del texto
      const dayFromText = extractDay(text);
      if (dayFromText) {
        await sendTimeMenu(phone, dayFromText.formatted);
        return;
      }

      await sendText(phone, 'No entendi el dia. Intenta de nuevo o escribe *menu* para volver.');
      return;
    }

    // --- SELECCION DE HORA ---
    if (state === 'SELECTING_TIME') {
      const num = parseInt(text);
      if (num === 0) {
        await sendMainMenu(phone, session);
        return;
      }
      if (num >= 1 && num <= TIME_SLOTS.length) {
        const hora = TIME_SLOTS[num - 1];
        await searchAndShowRooms(phone, stateObj.dia, hora);
        return;
      }

      // Intentar extraer hora del texto
      const timeFromText = extractTime(text);
      if (timeFromText) {
        await searchAndShowRooms(phone, stateObj.dia, timeFromText);
        return;
      }

      await sendText(phone, 'No entendi la hora. Intenta de nuevo o escribe *menu* para volver.');
      return;
    }

    // --- SELECCION DE AULA PARA RESERVAR ---
    if (state === 'SELECTING_ROOM') {
      const num = parseInt(text);
      if (num === 0) {
        await sendMainMenu(phone, session);
        return;
      }

      const { rooms, dia, horaInicio, horaFin } = stateObj;
      if (num >= 1 && num <= rooms.length) {
        const aula = rooms[num - 1];
        await reservarAula(phone, aula.codigo, dia, horaInicio, horaFin, session);
        return;
      }

      await sendText(phone, 'Numero no valido. Intenta de nuevo o escribe *menu*.');
      return;
    }

    // --- BUSCANDO PROFESOR ---
    if (state === 'SEARCHING_TEACHER') {
      const schedule = await findTeacher(text);
      userState.delete(phone);
      if (schedule.length === 0) {
        await sendText(phone, `No encontre clases para "${text}". Prueba con otro nombre.\n\nEscribe *menu* para volver.`);
      } else {
        let response = `*Horario de ${schedule[0].docente}:*\n\n`;
        schedule.forEach(c => {
          response += `${c.dia} ${c.hora_inicio}-${c.hora_fin}\n  Aula: *${c.aula_asignada || 'Sin asignar'}*\n  ${c.materia}\n\n`;
        });
        response += `Escribe *menu* para volver.`;
        await sendText(phone, response);
      }
      return;
    }

    // --- BUSCANDO MATERIA ---
    if (state === 'SEARCHING_SUBJECT') {
      const classes = await findSubjectClasses(text);
      userState.delete(phone);
      if (classes.length === 0) {
        await sendText(phone, `No encontre "${text}" en el sistema.\n\nEscribe *menu* para volver.`);
      } else {
        let response = `*Horarios de "${classes[0].materia}":*\n\n`;
        classes.forEach(c => {
          response += `${c.dia} ${c.hora_inicio}-${c.hora_fin}: *${c.aula_asignada || 'S/A'}* (${c.docente ? c.docente.split(' ')[0] : ''})\n`;
        });
        response += `\nEscribe *menu* para volver.`;
        await sendText(phone, response);
      }
      return;
    }

    // --- CONFIRMANDO CANCELACION DE RESERVA ---
    if (state === 'CONFIRMING_CANCEL') {
      const num = parseInt(text);
      const reservas = stateObj.reservas;

      if (num === 0) {
        await sendMainMenu(phone, session);
        return;
      }

      if (num >= 1 && num <= reservas.length) {
        const reservaId = reservas[num - 1].id;
        const res = await pool.query('DELETE FROM reservas WHERE id = $1 AND telefono = $2 RETURNING *', [reservaId, phone]);
        if (res.rows.length > 0) {
          await sendText(phone, 'Reserva cancelada.\n\nEscribe *menu* para volver.');
        } else {
          await sendText(phone, 'No se pudo cancelar (ya fue cancelada o no existe).');
        }
        userState.delete(phone);
        return;
      }
      await sendText(phone, 'Numero no valido. Intenta de nuevo o escribe *menu*.');
      return;
    }

    // --- APROBACION/RECHAZO DE RESERVA (Admin) ---
    if (state === 'PENDING_APPROVAL') {
      const { reservaId } = stateObj;
      if (n === 'aprobar' || n === '1' || n === 'si') {
        await aprobarReserva(phone, reservaId, session);
        return;
      }
      if (n === 'rechazar' || n === '2' || n === 'no') {
        await rechazarReserva(phone, reservaId, session);
        return;
      }
      await sendText(phone, 'Responde *1* para aprobar o *2* para rechazar.');
      return;
    }

    // --- DETECCION DE TEXTO NATURAL ---
    if (n.includes('aulas libres') || n.includes('buscar aulas') || n === 'aulas') {
      await sendDayMenu(phone);
      return;
    }
    if (n.includes('mis reservas') || n === 'reservas') {
      await handleMenuAction(phone, 'menu_reservas', session);
      return;
    }
    if (n.includes('buscar profe') || n.includes('buscar profesor')) {
      await handleMenuAction(phone, 'menu_profe', session);
      return;
    }
    if (n.includes('horario materia') || n.includes('horario')) {
      await handleMenuAction(phone, 'menu_materia', session);
      return;
    }
    if (n.includes('mi perfil') || n === 'perfil') {
      await handleMenuAction(phone, 'menu_perfil', session);
      return;
    }
    if (n.includes('estado general') && ['admin', 'director'].includes(session?.rol)) {
      await handleMenuAction(phone, 'menu_estado', session);
      return;
    }

    // --- DETECCION NATURAL: buscar profesor ---
    const teacherKeywords = ['profesor', 'profe', 'ingeniera', 'ingeniero', 'ing', 'docente', 'donde esta'];
    const isTeacherSearch = teacherKeywords.some(k => normalizeText(text).includes(k));
    if (isTeacherSearch) {
      let cleanName = text.replace(/¿|\?|a que hora tiene clases la |clases de la |a que hora tiene clases |clases de |el profesor |la ingeniera |el ingeniero |el profe |la profe |donde esta el |donde esta la |donde esta |ingeniera |ingeniero |profesor |docente |ing /gi, '').trim();
      if (cleanName.length > 2) {
        const schedule = await findTeacher(cleanName);
        if (schedule.length > 0) {
          let response = `*Ubicacion de ${schedule[0].docente}:*\n\n`;
          schedule.forEach(c => {
            response += `${c.dia} ${c.hora_inicio}-${c.hora_fin}\n  Aula: *${c.aula_asignada || 'S/A'}* | ${c.materia}\n\n`;
          });
          response += `Escribe *menu* para volver.`;
          await sendText(phone, response);
          userState.delete(phone);
          return;
        }
      }
    }

    // --- DETECCION NATURAL: dia + hora ---
    const day = extractDay(text);
    const time = extractTime(text);
    if (day && time) {
      await searchAndShowRooms(phone, day.formatted, time);
      return;
    }
    if (day && !time) {
      await sendTimeMenu(phone, day.formatted);
      return;
    }

    // --- FALLBACK ---
    await sendText(phone, 'No te entendi. Escribe *menu* para ver las opciones disponibles.');

  } catch (error) {
    console.error('Error procesando mensaje:', error);
    await sendText(phone, 'Ocurrio un error. Intenta de nuevo o escribe *menu*.');
  }
}

// ==========================================
// ACCIONES DEL MENU
// ==========================================

async function handleMenuAction(phone, actionId, session) {
  switch (actionId) {
    case 'menu_aulas':
      await sendDayMenu(phone);
      break;

    case 'menu_reservas': {
      const res = await pool.query(
        `SELECT id, aula_codigo, dia, hora_inicio, hora_fin FROM reservas WHERE telefono = $1 AND estado = 'activa' ORDER BY fecha, hora_inicio`,
        [phone]
      );

      if (res.rows.length === 0) {
        await sendText(phone, 'No tienes reservas activas.\n\nEscribe *menu* para volver.');
        userState.delete(phone);
      } else {
        let msg = '*Tus Reservas Activas:*\n\n';
        res.rows.forEach((r, i) => {
          msg += `*${i + 1}.* ${r.aula_codigo}: ${r.dia} ${r.hora_inicio}-${r.hora_fin}\n`;
        });
        msg += `\n*0.* Volver al menu\n`;
        msg += `\n_Responde con el numero para cancelar una reserva._`;

        userState.set(phone, { state: 'CONFIRMING_CANCEL', reservas: res.rows });
        await sendText(phone, msg);
      }
      break;
    }

    case 'menu_profe':
      userState.set(phone, { state: 'SEARCHING_TEACHER' });
      await sendText(phone, 'Escribe el apellido del profesor que buscas:');
      break;

    case 'menu_materia':
      userState.set(phone, { state: 'SEARCHING_SUBJECT' });
      await sendText(phone, 'Escribe el nombre de la materia (o una parte):');
      break;

    case 'menu_estado': {
      if (!session || !['admin', 'director'].includes(session.rol)) {
        await sendText(phone, 'No tienes permisos para esta opcion.');
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

      await sendText(phone,
        `*Estado del Sistema UIDE*\n\n` +
        `Clases registradas: *${s.total_clases}*\n` +
        `Aulas disponibles: *${s.aulas_disponibles}*\n` +
        `Distribuciones activas: *${s.distribuciones}*\n` +
        `Reservas activas: *${s.reservas_activas}*\n` +
        `Estudiantes registrados: *${s.total_estudiantes}*\n\n` +
        `Escribe *menu* para volver.`
      );
      userState.delete(phone);
      break;
    }

    case 'menu_perfil': {
      const name = await getSessionName(session);
      await sendText(phone,
        `*Perfil Roomie*\n\n` +
        `Nombre: *${name}*\n` +
        `Rol: *${session.rol.toUpperCase()}*\n` +
        `Tipo: ${session.user_type}\n` +
        `Sesion: Activa\n\n` +
        `Escribe *salir* para cerrar sesion.\n` +
        `Escribe *menu* para volver.`
      );
      userState.delete(phone);
      break;
    }

    default:
      await sendText(phone, 'Opcion no reconocida. Escribe *menu* para volver.');
  }
}

// ==========================================
// RESERVAR AULA
// ==========================================

async function reservarAula(phone, aulaCodigo, dia, horaInicio, horaFin, session) {
  // Verificar que no tenga ya una reserva en ese horario
  const existing = await pool.query(
    `SELECT id FROM reservas WHERE telefono = $1 AND dia = $2 AND hora_inicio = $3 AND estado = 'activa'`,
    [phone, dia, horaInicio]
  );
  if (existing.rows.length > 0) {
    await sendText(phone, `Ya tienes una reserva para el ${dia} a las ${horaInicio}.\n\nEscribe *menu* para volver.`);
    userState.delete(phone);
    return;
  }

  const esAuditorio = aulaCodigo.toUpperCase().includes('AUDITORIO');
  const estadoReserva = esAuditorio ? 'pendiente_aprobacion' : 'activa';

  const insertResult = await pool.query(
    `INSERT INTO reservas (aula_codigo, dia, hora_inicio, hora_fin, telefono, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [aulaCodigo, dia, horaInicio, horaFin, phone, estadoReserva]
  );
  const reservaId = insertResult.rows[0].id;

  if (esAuditorio) {
    await sendText(phone,
      `*Solicitud Enviada*\n\nAula: *${aulaCodigo}*\nDia: ${dia}\nHora: ${horaInicio} - ${horaFin}\n\nEl Auditorio requiere aprobacion del administrador. Te notificaremos cuando sea aprobada.\n\nEscribe *menu* para volver.`
    );

    // Notificar a todos los admins
    const admins = await pool.query(`SELECT telefono FROM bot_sessions WHERE rol = 'admin'`);
    const sessionName = await getSessionName(session);
    for (const admin of admins.rows) {
      await sendText(admin.telefono,
        `*Solicitud de Auditorio*\n\nUsuario: ${sessionName}\nAula: ${aulaCodigo}\nDia: ${dia}\nHora: ${horaInicio} - ${horaFin}\n\nResponde:\n*1.* Aprobar\n*2.* Rechazar`
      );
      // Guardar estado de aprobacion pendiente para el admin
      userState.set(admin.telefono, { state: 'PENDING_APPROVAL', reservaId });
    }
  } else {
    await sendText(phone,
      `*Reserva Confirmada*\n\nAula: *${aulaCodigo}*\nDia: ${dia}\nHora: ${horaInicio} - ${horaFin}\n\nTe avisaremos 15 min antes.\n\nEscribe *menu* para volver.`
    );
  }
  userState.delete(phone);
}

// ==========================================
// APROBAR / RECHAZAR RESERVAS (Admin)
// ==========================================

async function aprobarReserva(phone, reservaId, session) {
  if (!session || session.rol !== 'admin') {
    await sendText(phone, 'No tienes permiso para aprobar reservas.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query('SELECT * FROM reservas WHERE id = $1', [reservaId]);
    if (res.rows.length === 0) {
      await sendText(phone, 'La reserva ya no existe.');
      await client.query('ROLLBACK');
      return;
    }
    const reserva = res.rows[0];

    if (reserva.estado === 'activa') {
      await sendText(phone, 'Esta reserva ya estaba aprobada.');
      await client.query('ROLLBACK');
      return;
    }

    await client.query("UPDATE reservas SET estado = 'activa' WHERE id = $1", [reservaId]);

    // Notificar al usuario que solicito la reserva
    if (reserva.telefono) {
      await sendText(reserva.telefono,
        `*Reserva Aprobada*\n\nTu solicitud para el *${reserva.aula_codigo}* ha sido aprobada.\nDia: ${reserva.dia}\nHora: ${reserva.hora_inicio} - ${reserva.hora_fin}`
      );
    }

    const adminName = await getSessionName(session);
    await sendText(phone, `Reserva aprobada. (Aprobado por: ${adminName})\n\nEscribe *menu* para volver.`);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error aprobando reserva:', e);
    await sendText(phone, 'Error al aprobar la reserva.');
  } finally {
    client.release();
  }
  userState.delete(phone);
}

async function rechazarReserva(phone, reservaId, session) {
  if (!session || session.rol !== 'admin') {
    await sendText(phone, 'No tienes permiso para rechazar reservas.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query('SELECT * FROM reservas WHERE id = $1', [reservaId]);
    if (res.rows.length === 0) {
      await sendText(phone, 'La reserva ya no existe.');
      await client.query('ROLLBACK');
      return;
    }
    const reserva = res.rows[0];

    await client.query("UPDATE reservas SET estado = 'rechazada' WHERE id = $1", [reservaId]);

    // Notificar al usuario
    if (reserva.telefono) {
      await sendText(reserva.telefono,
        `*Solicitud Rechazada*\n\nTu solicitud para el *${reserva.aula_codigo}* ha sido rechazada por el administrador.`
      );
    }

    await sendText(phone, `Reserva rechazada.\n\nEscribe *menu* para volver.`);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error rechazando reserva:', e);
    await sendText(phone, 'Error al rechazar la reserva.');
  } finally {
    client.release();
  }
  userState.delete(phone);
}

// ==========================================
// WEBHOOK DE EVOLUTION API
// ==========================================

app.post('/webhook', async (req, res) => {
  console.log('--- NUEVO EVENTO DE WEBHOOK ---');
  try {
    const body = req.body;

    // Evolution API v2 webhook format
    const event = body.event;

    if (event === 'messages.upsert') {
      const data = body.data;

      // Ignorar mensajes propios (fromMe) - DESACTIVADO TEMPORALMENTE PARA PRUEBAS
      /* if (data?.key?.fromMe) {
        return res.sendStatus(200);
      } */

      // Ignorar mensajes de grupos
      if (data?.key?.remoteJid?.includes('@g.us')) {
        return res.sendStatus(200);
      }

      const phone = formatPhone(data?.key?.remoteJid);
      if (!phone) return res.sendStatus(200);

      // Mensaje de texto
      const textMsg = data?.message?.conversation ||
        data?.message?.extendedTextMessage?.text ||
        data?.message?.buttonsResponseMessage?.selectedDisplayText ||
        data?.message?.listResponseMessage?.title;

      if (textMsg) {
        await handleMessage(phone, textMsg.trim(), data);
        return res.sendStatus(200);
      }

      // Mensaje de audio / nota de voz
      const isAudio = data?.message?.audioMessage || data?.messageType === 'audioMessage';
      if (isAudio) {
        await sendText(phone, 'Escuchando...');
        const transcription = await getAudioUrl(data);
        if (transcription) {
          await sendText(phone, `Entendi: "${transcription}"`);
          await handleMessage(phone, transcription, data);
        } else {
          await sendText(phone, 'No pude entender tu nota de voz. Intenta escribiendo.');
        }
        return res.sendStatus(200);
      }

      // Respuesta de boton interactivo
      const buttonResponse = data?.message?.buttonsResponseMessage?.selectedButtonId;
      if (buttonResponse) {
        await handleMessage(phone, buttonResponse, data);
        return res.sendStatus(200);
      }

      // Respuesta de lista interactiva
      const listResponse = data?.message?.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (listResponse) {
        await handleMessage(phone, listResponse, data);
        return res.sendStatus(200);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error en webhook:', error);
    res.sendStatus(200); // Siempre responder 200 para evitar reintentos
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', bot: 'Roomie WhatsApp', timestamp: new Date().toISOString() });
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

    // Notificar reservas via WhatsApp
    const reservas = await pool.query(
      `SELECT telefono, aula_codigo FROM reservas WHERE dia = $1 AND hora_inicio = $2 AND estado = 'activa' AND telefono IS NOT NULL`,
      [day, timeStr]
    );
    for (const r of reservas.rows) {
      sendText(r.telefono, `Tu reserva en *${r.aula_codigo}* empieza en 15 min.`).catch(() => { });
    }

    // Notificar clases a estudiantes con telefono registrado
    const clases = await pool.query(
      `SELECT carrera, ciclo, materia, aula_asignada FROM clases WHERE dia = $1 AND hora_inicio = $2`,
      [day, timeStr]
    );
    for (const c of clases.rows) {
      const studs = await pool.query(
        `SELECT telefono FROM estudiantes WHERE escuela ILIKE $1 AND nivel ILIKE $2 AND telefono IS NOT NULL`,
        [`%${c.carrera}%`, `%${c.ciclo}%`]
      );
      for (const s of studs.rows) {
        sendText(s.telefono,
          `Clase en 15 min: *${c.materia}* en *${c.aula_asignada || 'sin aula'}*`
        ).catch(() => { });
      }
    }
  } catch (e) {
    console.error('Error cron:', e);
  }
}, 60000);

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(BOT_PORT, () => {
  console.log(`Roomie Bot (WhatsApp) iniciado en puerto ${BOT_PORT}`);
  console.log(`Webhook URL: http://localhost:${BOT_PORT}/webhook`);
  console.log(`Instance: ${EVOLUTION_INSTANCE}`);
});

// ==========================================
// ERRORES
// ==========================================

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
