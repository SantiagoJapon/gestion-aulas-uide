const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();
require('./scripts/validate-env.js');

// ==========================================
// CONFIGURACION Y CONEXION
// ==========================================

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL.replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;
const BOT_PORT = Number(process.env.BOT_PORT || 3020);

// URL del backend — usa el nombre del servicio Docker en producción
const BACKEND_URL = process.env.BACKEND_URL || 'http://gestion_aulas_backend:3000';

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
  // Si es LID, lo mantenemos integro para la lógica de mapeo
  if (jid.includes('@lid')) return jid;
  // 1) Quitar el dominio (@s.whatsapp.net, @c.us, @g.us)
  // 2) Limpiar sufijos multi-dispositivo (:1, .0, etc) del número base
  return jid.split('@')[0].split(':')[0].split('.')[0];
}

// ==========================================
// EVOLUTION API - ENVIO DE MENSAJES
// ==========================================

async function sendText(phone, text) {
  try {
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      { number: jid, text },
      { headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
  } catch (error) {
    console.error(`Error enviando mensaje a ${phone}:`, error.response?.data || error.message);
  }
}

// Botones interactivos (Evolution v2: nativeFlow quick_reply).
// PROBLEMA CONOCIDO: Baileys envía los botones como viewOnceMessage/interactiveMessage
// y muchos clientes (y SIEMPRE WhatsApp Web/Escritorio) los muestran en blanco:
// el usuario no ve nada. Por eso los botones van desactivados por defecto y se
// envía texto numerado, que funciona en todos los clientes.
// Para reactivar botones: USE_INTERACTIVE_BUTTONS=true en el entorno.
const USE_INTERACTIVE_BUTTONS = process.env.USE_INTERACTIVE_BUTTONS === 'true';

async function sendButtons(phone, text, buttons, title = '') {
  if (USE_INTERACTIVE_BUTTONS) {
    try {
      const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
      await axios.post(
        `${EVOLUTION_API_URL}/message/sendButtons/${EVOLUTION_INSTANCE}`,
        {
          number: jid,
          title,
          description: text,
          footer: 'Roomie · UIDE',
          buttons: buttons.slice(0, 3).map((b, i) => ({
            type: 'reply',
            displayText: b.text,
            id: b.id || String(i + 1)
          }))
        },
        { headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      return;
    } catch (error) {
      console.warn('sendButtons falló, usando texto numerado:', error.response?.data?.response?.message || error.message);
    }
  }
  // Texto numerado: compatible con teléfono, WhatsApp Web y Escritorio
  let msg = (title ? `${title}\n` : '') + text + '\n\n';
  buttons.forEach((b, i) => {
    msg += `*${b.id || String(i + 1)}.* ${b.text}\n`;
  });
  msg += `\n_Responde con el número de la opción._`;
  await sendText(phone, msg);
}

async function sendList(phone, text, title, sections) {
  try {
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    await axios.post(
      `${EVOLUTION_API_URL}/message/sendList/${EVOLUTION_INSTANCE}`,
      {
        number: jid,
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
        telefono VARCHAR(50) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        rol VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla de mapeo LID -> numero real de telefono
    await client.query(`
      CREATE TABLE IF NOT EXISTS lid_mappings (
        lid_jid VARCHAR(100) PRIMARY KEY,
        real_phone VARCHAR(50) NOT NULL,
        push_name VARCHAR(100),
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
        solicitante_nombre VARCHAR(100),
        motivo TEXT,
        estado VARCHAR(20) DEFAULT 'activa',
        tipo_espacio VARCHAR(50) DEFAULT 'aula',
        es_grupal BOOLEAN DEFAULT FALSE,
        num_personas INTEGER DEFAULT 1,
        rol_usuario VARCHAR(50),
        fecha DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrar reservas: agregar nuevas columnas si no existen
    const columnsToAdd = [
      { name: 'telefono', type: 'VARCHAR(20)' },
      { name: 'tipo_espacio', type: "VARCHAR(50) DEFAULT 'aula'" },
      { name: 'es_grupal', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'num_personas', type: 'INTEGER DEFAULT 1' },
      { name: 'rol_usuario', type: 'VARCHAR(50)' }
    ];

    for (const col of columnsToAdd) {
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'reservas' AND column_name = $1
      `, [col.name]);

      if (colCheck.rows.length === 0) {
        await client.query(`ALTER TABLE reservas ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Columna ${col.name} agregada a reservas`);
      }
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

// ==========================================
// DEDUPLICACION DE MENSAJES
// Evita procesar el mismo mensaje dos veces
// (Evolution API puede re-entregar webhooks)
// ==========================================
const processedMessages = new Map();
const MSG_TTL = 60 * 1000; // 60 segundos

function isDuplicate(messageId) {
  if (!messageId) return false;
  if (processedMessages.has(messageId)) return true;
  processedMessages.set(messageId, Date.now());
  // Limpiar entradas viejas cada 100 mensajes
  if (processedMessages.size > 100) {
    const cutoff = Date.now() - MSG_TTL;
    for (const [id, ts] of processedMessages.entries()) {
      if (ts < cutoff) processedMessages.delete(id);
    }
  }
  return false;
}

// Menu principal - opciones numeradas con IDs
const MENU_OPTIONS = [
  { id: 'menu_aulas', label: 'Buscar Aulas Libres', emoji: '1' },
  { id: 'menu_espacios', label: 'Espacios Comunes', emoji: '2' },
  { id: 'menu_reservas', label: 'Mis Reservas', emoji: '3' },
  { id: 'menu_profe', label: 'Buscar Profesor', emoji: '4' },
  { id: 'menu_materia', label: 'Horario Materia', emoji: '5' },
  { id: 'menu_estado', label: 'Estado General', emoji: '6', roles: ['director', 'admin'] },
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

async function getSession(jid) {
  const cleanPhone = formatPhone(jid);
  const res = await pool.query('SELECT * FROM bot_sessions WHERE telefono = $1', [cleanPhone]);
  return res.rows.length > 0 ? res.rows[0] : null;
}

async function getSessionName(session) {
  if (!session) return 'amigo';
  try {
    if (session.user_type === 'usuario') {
      const u = await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [session.user_id]);
      if (u.rows.length) return u.rows[0].nombre.split(' ')[0];
    } else {
      const e = await pool.query('SELECT nombre FROM estudiantes WHERE id = $1', [session.user_id]);
      if (e.rows.length) return (e.rows[0].nombre || '').split(' ')[0] || 'amigo';
    }
  } catch (_) { }
  return 'amigo';
}

async function authenticateUser(cedula, jid) {
  const cleanPhone = formatPhone(jid);

  console.log(`[AUTH] Verificando cédula ${cedula} para ${cleanPhone}...`);
  console.log(`[AUTH] BACKEND_URL = ${BACKEND_URL}`);

  // 1. Buscar primero en estudiantes via API del backend
  //    Ruta existente: GET /api/estudiantes/login/:cedula
  try {
    const resp = await axios.get(`${BACKEND_URL}/api/estudiantes/login/${cedula}`, { timeout: 8000 });
    if (resp.data && resp.data.success) {
      const est = resp.data.estudiante;
      const token = resp.data.token;
      console.log(`[AUTH] Estudiante encontrado vía API: ${est.nombre} (ID=${est.id})`);
      // Guardar sesion en BD local del bot
      await pool.query(`
        INSERT INTO bot_sessions (telefono, user_id, user_type, rol)
        VALUES ($1, $2, 'estudiante', 'estudiante')
        ON CONFLICT (telefono)
        DO UPDATE SET user_id = EXCLUDED.user_id, user_type = EXCLUDED.user_type, rol = EXCLUDED.rol
      `, [cleanPhone, est.id]);
      // Guardar telefono en la tabla estudiantes (ignorar si falla)
      try {
        await pool.query('UPDATE estudiantes SET telefono = $1 WHERE cedula = $2', [cleanPhone, cedula]);
      } catch (updateErr) {
        console.warn('[AUTH] No se pudo actualizar telefono en estudiantes:', updateErr.message);
      }
      userState.set(cleanPhone, { ...userState.get(cleanPhone), jwtToken: token, cedula, estudianteId: est.id, nombre: est.nombre });
      const nombre = est.nombre || 'Estudiante';
      return { name: nombre.split(' ')[0], rol: 'estudiante', type: 'estudiante', data: est };
    }
  } catch (e) {
    if (e.response?.status === 404) {
      console.log(`[AUTH] Estudiante con cédula ${cedula} no encontrado en backend (404)`);
    } else {
      console.error('[AUTH] Error consultando backend, intentando SQL directo:', e.message);
      // Fallback: buscar directamente en la BD del bot
      try {
        const result = await pool.query(
          'SELECT id, nombre, cedula FROM estudiantes WHERE cedula = $1',
          [cedula]
        );
        if (result.rows.length > 0) {
          const est = result.rows[0];
          console.log(`[AUTH] Estudiante encontrado vía SQL directo: ${est.nombre}`);
          await pool.query(`
            INSERT INTO bot_sessions (telefono, user_id, user_type, rol)
            VALUES ($1, $2, 'estudiante', 'estudiante')
            ON CONFLICT (telefono)
            DO UPDATE SET user_id = EXCLUDED.user_id, user_type = EXCLUDED.user_type, rol = EXCLUDED.rol
          `, [cleanPhone, est.id]);
          userState.set(cleanPhone, { ...userState.get(cleanPhone), cedula, estudianteId: est.id, nombre: est.nombre });
          return { name: (est.nombre || 'Estudiante').split(' ')[0], rol: 'estudiante', type: 'estudiante', data: est };
        }
      } catch (sqlErr) {
        console.error('[AUTH] También falló el SQL directo:', sqlErr.message);
      }
    }
  }

  // 2. Buscar en usuarios (admin, director, profesor) via BD directa
  const client = await pool.connect();
  try {
    const userRes = await client.query(
      "SELECT * FROM usuarios WHERE cedula = $1 AND estado = 'activo'",
      [cedula]
    );
    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      console.log(`[AUTH] Usuario (no-estudiante) encontrado: ${user.nombre} rol=${user.rol}`);
      await client.query(`
        INSERT INTO bot_sessions (telefono, user_id, user_type, rol)
        VALUES ($1, $2, 'usuario', $3)
        ON CONFLICT (telefono)
        DO UPDATE SET user_id = EXCLUDED.user_id, user_type = EXCLUDED.user_type, rol = EXCLUDED.rol
      `, [cleanPhone, user.id, user.rol]);
      return { name: user.nombre.split(' ')[0], rol: user.rol, type: 'usuario' };
    }
  } finally {
    client.release();
  }

  console.log(`[AUTH] Cédula ${cedula} no encontrada en ningún sistema`);
  return null;
}

// SQL compartido: horario de clases con el AULA REAL por bloque.
// El aula verdadera de cada franja vive en `distribucion` (clase_id -> aula_id);
// `clases.aula_asignada` puede estar vacia o desactualizada. COALESCE resuelve:
// primero el aula de la distribución, si no existe usa la de la clase.
const SQL_HORARIO_CON_AULA = `
  SELECT DISTINCT c.dia, c.hora_inicio, c.hora_fin, c.materia, c.docente,
         COALESCE(a.codigo, c.aula_asignada) AS aula_asignada,
         a.nombre AS aula_nombre
  FROM clases c
  LEFT JOIN distribucion d
    ON d.clase_id = c.id
   AND lower(d.dia) = lower(c.dia)
   AND d.hora_inicio::text LIKE c.hora_inicio || '%'
  LEFT JOIN aulas a ON a.id = d.aula_id
`;

// Buscar docente — usa GET /api/bot/docente?nombre= (el backend une distribucion)
async function findTeacher(queryTerm) {
  try {
    const resp = await axios.get(`${BACKEND_URL}/api/bot/docente`, {
      params: { nombre: queryTerm },
      timeout: 8000
    });
    if (resp.data?.success && resp.data.resultados?.length) {
      // Normalizar al formato que espera el bot
      return resp.data.resultados.map(r => ({
        materia: r.materia,
        dia: r.dia,
        hora_inicio: r.hora ? r.hora.split(' - ')[0] : '',
        hora_fin: r.hora ? r.hora.split(' - ')[1] : '',
        aula_asignada: r.aula,
        docente: r.docente
      }));
    }
  } catch (e) {
    console.error('[findTeacher] Error backend, usando SQL:', e.message);
  }
  // Fallback SQL directo con el aula real de la distribución
  try {
    const res = await pool.query(
      `${SQL_HORARIO_CON_AULA}
       WHERE c.docente ILIKE '%' || $1 || '%'
       ORDER BY c.dia, c.hora_inicio LIMIT 15`,
      [queryTerm]
    );
    return res.rows;
  } catch (sqlErr) {
    console.error('[findTeacher] SQL fallback también falló:', sqlErr.message);
  }
  return [];
}

// Buscar horarios de materia — SQL directo con JOIN a distribucion.
// (La ruta /api/search/global devuelve resultados tipo "spotlight" sin
// dia/hora/aula — no sirve para horarios; el aula real sale de distribucion.)
async function findSubjectClasses(subject) {
  {
    try { // eslint-disable-line
      const normalized = subject.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const res = await pool.query(
        `${SQL_HORARIO_CON_AULA}
         WHERE translate(lower(c.materia), 'áéíóúñ', 'aeioun') ILIKE '%' || lower($1) || '%'
           AND c.materia IS NOT NULL
         ORDER BY c.materia, c.dia, c.hora_inicio LIMIT 12`,
        [normalized]
      );
      return res.rows;
    } catch (sqlErr) {
      console.error('[findSubjectClasses] Error SQL:', sqlErr.message);
    }
  }
  return [];
}

// ==========================================
// ESPACIOS COMUNES (biblioteca, salas, cubículos...)
// ==========================================

const ESPACIO_TIPO_EMOJI = {
  BIBLIOTECA: '📖', SALA_DESCANSO: '🛋️', ZONA_TRABAJO: '💼', CUBICULO: '🚪', OTRO: '📍'
};

// Lista todos los espacios comunes disponibles (tabla `espacios`)
async function getEspaciosComunes() {
  try {
    const res = await pool.query(
      `SELECT codigo, nombre, tipo, capacidad, descripcion
       FROM espacios
       WHERE upper(estado) = 'DISPONIBLE'
       ORDER BY tipo, codigo`
    );
    return res.rows;
  } catch (e) {
    console.error('[getEspaciosComunes] Error SQL:', e.message);
    return [];
  }
}

// Verifica si un espacio común está libre en dia+hora (contra reservas activas)
async function isEspacioLibre(codigo, dia, horaInicio, horaFin) {
  try {
    const res = await pool.query(
      `SELECT 1 FROM reservas
       WHERE (espacio_codigo = $1 OR aula_codigo = $1)
         AND dia ILIKE $2
         AND estado IN ('activa', 'pendiente_aprobacion')
         AND hora_inicio < $4 AND hora_fin > $3
       LIMIT 1`,
      [codigo, dia, horaInicio, horaFin]
    );
    return res.rows.length === 0;
  } catch (e) {
    console.error('[isEspacioLibre] Error SQL:', e.message);
    return false;
  }
}

// Buscar aulas disponibles — usa GET /api/reservas/disponibles
async function getAvailableRooms(dia, horaInicio, tipo = 'AULA') {
  const h = parseInt(horaInicio.split(':')[0]);
  const m = horaInicio.split(':')[1] || '00';
  const horaFin = `${String(h + 1).padStart(2, '0')}:${m}`;

  // Calcular fecha del próximo día de la semana correspondiente en Ecuador (GMT-5)
  const now = new Date();
  const ecuadorTime = new Date(now.getTime() + (now.getTimezoneOffset() - 300) * 60000);

  const diasSemana = { LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6, DOMINGO: 0 };
  const diaNum = diasSemana[dia.toUpperCase()] ?? ecuadorTime.getDay();

  // Calcular diferencia de días
  let diff = diaNum - ecuadorTime.getDay();
  if (diff < 0) diff += 7; // Si el día ya pasó esta semana, apuntar a la próxima

  const fechaReserva = new Date(ecuadorTime);
  fechaReserva.setDate(ecuadorTime.getDate() + diff);
  const fechaStr = fechaReserva.toISOString().split('T')[0];

  try {
    const resp = await axios.get(`${BACKEND_URL}/api/reservas/disponibles`, {
      params: { fecha: fechaStr, hora_inicio: horaInicio, hora_fin: horaFin, tipo: tipo === 'TODO' ? undefined : tipo },
      headers: { Authorization: `Bearer internal-bot-key` },
      timeout: 8000
    });
    if (resp.data?.success) {
      const rooms = resp.data.aulas.map(a => ({
        codigo: a.codigo,
        nombre: a.nombre,
        capacidad: a.capacidad,
        tipo: a.tipo
      }));
      return { rooms, horaFin };
    }
  } catch (e) {
    console.error('[getAvailableRooms] Error backend, usando SQL:', e.message);
    // Fallback a SQL directo
    const sql = `
      SELECT a.codigo, a.nombre, a.capacidad, a.tipo FROM aulas a
      WHERE a.estado ILIKE 'disponible'
      AND (a.tipo ILIKE $4 OR $4 = 'TODO')
      AND a.codigo NOT IN (
        SELECT aula_asignada FROM clases
        WHERE dia ILIKE $1 AND hora_inicio < $2 AND hora_fin > $3
        AND aula_asignada IS NOT NULL
      )
      AND a.id NOT IN (
        SELECT aula_id FROM distribucion
        WHERE dia ILIKE $1 AND hora_inicio < $2::time AND hora_fin > $3::time
      )
      AND a.codigo NOT IN (
        SELECT aula_codigo FROM reservas
        WHERE dia ILIKE $1 AND hora_inicio < $2 AND hora_fin > $3
        AND estado IN ('activa', 'pendiente_aprobacion')
      )
      ORDER BY a.capacidad ASC LIMIT 10`;
    const res = await pool.query(sql, [dia, horaFin, horaInicio, tipo]);
    return { rooms: res.rows, horaFin };
  }
  return { rooms: [], horaFin };
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
    if (!apiKey || apiKey.includes('tu_') || apiKey.includes('api_key_aqui')) return null;

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
      if (!apiKey || apiKey.includes('tu_') || apiKey.includes('api_key_aqui')) {
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

async function sendMainMenu(jid, session, overrideName = null, rolLabel = null) {
  const phone = formatPhone(jid);
  const name = overrideName || await getSessionName(session);
  const rol = session?.rol || 'user';
  const visibleOptions = MENU_OPTIONS.filter(opt => {
    if (opt.roles && !opt.roles.includes(rol)) return false;
    return true;
  });

  const emojis = ['🏫', '🛋️', '📋', '👨‍🏫', '📚', '📊'];
  let text = `👋 ¡Hola *${name}*! Soy *Roomie* 🤖\n`;
  if (rolLabel) {
    text += `_${rolLabel}_\n\n`;
  } else {
    text += `_Tu asistente de aulas UIDE_\n\n`;
  }
  text += `¿Qué necesitas hoy?\n\n`;
  visibleOptions.forEach((opt, i) => {
    text += `${emojis[i] || '▪️'} *${i + 1}.* ${opt.label}\n`;
  });
  text += `\n_Escribe el número de la opción._`;

  userState.set(phone, { state: 'MAIN_MENU', options: visibleOptions, lastActivity: Date.now() });
  await sendText(jid, text);
}

// ctx transporta el contexto del flujo: { flujo: 'aula'|'espacio', selectedEspacio? }
async function sendDayMenu(jid, ctx = {}) {
  const phone = formatPhone(jid);
  const today = getTodayName();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowName = extractDay(normalizeText(tomorrow.toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil', weekday: 'long' })))?.formatted || 'Mañana';

  userState.set(phone, { ...ctx, state: 'SELECTING_DAY', lastActivity: Date.now() });
  await sendButtons(jid, '¿Qué día necesitas?', [
    { id: '1', text: `Hoy (${today})` },
    { id: '2', text: `Mañana (${tomorrowName})` },
    { id: '3', text: 'Otro día' }
  ], '📅 Elige el día');
}

async function sendDayListMenu(jid, ctx = {}) {
  const phone = formatPhone(jid);
  let text = `📅 *Elige el día:*\n\n`;
  DAYS.slice(0, 6).forEach((d, i) => {
    text += `*${i + 1}.* ${d.formatted}\n`;
  });
  text += `\n*0.* ⬅️ Volver al menú`;
  userState.set(phone, { ...ctx, state: 'SELECTING_DAY_LIST', lastActivity: Date.now() });
  await sendText(jid, text);
}

// Paso 1 de hora: elegir jornada con botones (menos texto en pantalla)
async function sendTimeMenu(jid, dia, ctx = {}) {
  const phone = formatPhone(jid);
  userState.set(phone, { ...ctx, state: 'SELECTING_PERIOD', dia, lastActivity: Date.now() });
  await sendButtons(jid, `📅 *${dia}*\n¿En qué jornada?`, [
    { id: '1', text: 'Mañana ☀️ (07-12)' },
    { id: '2', text: 'Tarde 🌆 (14-19)' }
  ], '⏰ Elige la jornada');
}

// Paso 2 de hora: franjas de la jornada elegida (lista corta de 6)
async function sendSlotMenu(jid, dia, period, ctx = {}) {
  const phone = formatPhone(jid);
  const slots = period === 'AM'
    ? TIME_SLOTS.filter(t => parseInt(t) < 13)
    : TIME_SLOTS.filter(t => parseInt(t) >= 13);
  let text = `⏰ *${dia}* — ${period === 'AM' ? 'Mañana ☀️' : 'Tarde 🌆'}\n\n`;
  slots.forEach((t, i) => {
    text += `*${i + 1}.* ${t}\n`;
  });
  text += `\n*0.* ⬅️ Volver`;
  userState.set(phone, { ...ctx, state: 'SELECTING_TIME', dia, slots, lastActivity: Date.now() });
  await sendText(jid, text);
}

// ==========================================
// BUSCAR Y MOSTRAR AULAS
// ==========================================

const ROOMS_PAGE_SIZE = 5;

// Muestra una página de aulas (paginado para no saturar el chat)
async function showRoomsPage(jid, stateObj) {
  const phone = formatPhone(jid);
  const { rooms, dia, horaInicio, horaFin, page = 0 } = stateObj;
  const tipoEmoji = { 'AULA': '🏫', 'LABORATORIO': '🔬', 'AUDITORIO': '🎬', 'SALA_ESPECIAL': '🏛️' };

  const start = page * ROOMS_PAGE_SIZE;
  const pageRooms = rooms.slice(start, start + ROOMS_PAGE_SIZE);
  const hasMore = rooms.length > start + ROOMS_PAGE_SIZE;

  let msg = `✅ *Aulas libres* · ${dia} ⏰ ${horaInicio}–${horaFin}\n\n`;
  pageRooms.forEach((a, i) => {
    const ico = tipoEmoji[a.tipo?.toUpperCase()] || '🏫';
    msg += `*${i + 1}.* ${ico} *${a.codigo}* · ${a.nombre} · 👥 ${a.capacidad}\n`;
  });
  msg += `\n`;
  if (hasMore) msg += `*${pageRooms.length + 1}.* ➕ Ver más aulas\n`;
  msg += `*0.* ⬅️ Volver al menú\n\n_Responde con el número para reservar._`;

  userState.set(phone, { ...stateObj, state: 'SELECTING_ROOM', page, pageRooms, hasMore, lastActivity: Date.now() });
  await sendText(jid, msg);
}

async function searchAndShowRooms(jid, dia, hora) {
  const phone = formatPhone(jid);
  try {
    const { rooms, horaFin } = await getAvailableRooms(dia, hora);

    if (rooms.length === 0) {
      await sendText(jid,
        `😕 *Sin disponibilidad*\n\n` +
        `No hay aulas libres el *${dia}* a las *${hora}*.\n\n` +
        `Prueba con otro horario o escribe *menu* para volver.`
      );
      userState.delete(phone);
      return;
    }

    await showRoomsPage(jid, { rooms, dia, horaInicio: hora, horaFin, page: 0 });
  } catch (e) {
    console.error('Error buscando aulas:', e);
    await sendText(jid, '⚠️ Error al buscar aulas. Intenta de nuevo o escribe *menu*.');
  }
}

// Flujo espacios comunes: tras elegir día+hora se verifica disponibilidad puntual
async function checkEspacioAndConfirm(jid, stateObj, dia, hora) {
  const phone = formatPhone(jid);
  const esp = stateObj.selectedEspacio;
  const h = parseInt(hora.split(':')[0]);
  const horaFin = `${String(h + 1).padStart(2, '0')}:${hora.split(':')[1] || '00'}`;

  const libre = await isEspacioLibre(esp.codigo, dia, hora, horaFin);
  if (!libre) {
    await sendText(jid,
      `😕 *${esp.nombre}* está ocupado el *${dia}* a las *${hora}*.\n\n` +
      `Elige otra hora:`
    );
    await sendTimeMenu(jid, dia, { flujo: 'espacio', selectedEspacio: esp });
    return;
  }

  userState.set(phone, {
    ...stateObj,
    state: 'WAITING_GROUP_MODE',
    selectedAula: { codigo: esp.codigo, nombre: esp.nombre, capacidad: esp.capacidad, tipo: 'espacio' },
    dia, horaInicio: hora, horaFin,
    lastActivity: Date.now()
  });
  await sendButtons(jid,
    `${ESPACIO_TIPO_EMOJI[esp.tipo] || '📍'} *${esp.nombre}*\n` +
    `📅 ${dia} · ⏰ ${hora}–${horaFin} · 👥 hasta ${esp.capacidad}\n\n` +
    `¿Cómo vas a usar el espacio?`,
    [
      { id: '1', text: 'Solo 👤' },
      { id: '2', text: 'En grupo 👥' }
    ], '✅ Espacio disponible');
}

// ==========================================
// AUTO-LOGIN POR NUMERO DE TELEFONO
// ==========================================

// Convierte número internacional de WhatsApp al formato local ecuatoriano
// "593987654321" -> "0987654321"
function toLocalPhone(phone) {
  if (phone && phone.startsWith('593') && phone.length >= 12) {
    return '0' + phone.slice(3);
  }
  return phone;
}

// Busca un usuario (admin/director/docente) en usuarios.telefono.
// Prueba el número tal como llega de WhatsApp y también en formato local.
async function autoLoginByPhone(cleanPhone) {
  const localPhone = toLocalPhone(cleanPhone);
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT id, nombre, apellido, rol, carrera_director
       FROM usuarios
       WHERE (telefono = $1 OR telefono = $2)
         AND estado = 'activo'
         AND rol IN ('admin', 'director', 'docente', 'profesor')
       LIMIT 1`,
      [cleanPhone, localPhone]
    );
    return res.rows.length > 0 ? res.rows[0] : null;
  } catch (e) {
    console.error('[autoLoginByPhone] Error:', e.message);
    return null;
  } finally {
    client.release();
  }
}

// ==========================================
// PROCESAR MENSAJE ENTRANTE
// ==========================================

async function handleMessage(jid, text, messageData) {
  const phone = formatPhone(jid);
  console.log(`[MSG] De ${phone} (${jid}): "${text}"`);
  updateActivity(phone);

  try {
    const stateObj = userState.get(phone);
    const state = stateObj?.state || null;

    // --- AUTO-START: si no tiene sesion, intentar auto-login por telefono ---
    const session = await getSession(jid);
    if (!session && state !== 'WAITING_CEDULA') {
      // Buscar en usuarios.telefono antes de pedir cedula.
      // El numero de WhatsApp llega como "593987654321"; usuarios guarda "0987654321" o "593987654321".
      const autoUser = await autoLoginByPhone(phone);
      if (autoUser) {
        // Registrar sesion y saludar directamente
        await pool.query(`
          INSERT INTO bot_sessions (telefono, user_id, user_type, rol)
          VALUES ($1, $2, 'usuario', $3)
          ON CONFLICT (telefono)
          DO UPDATE SET user_id = EXCLUDED.user_id, user_type = EXCLUDED.user_type, rol = EXCLUDED.rol
        `, [phone, autoUser.id, autoUser.rol]);
        userState.delete(phone);
        const newSession = await getSession(jid);

        // Construir etiqueta de rol personalizada
        const rolLabels = { admin: 'Administrador UIDE', director: 'Director de Carrera', docente: 'Docente', profesor: 'Docente' };
        let rolLabel = rolLabels[autoUser.rol] || autoUser.rol;
        if (autoUser.rol === 'director' && autoUser.carrera_director) {
          rolLabel = `Director de ${autoUser.carrera_director}`;
        }

        await sendMainMenu(jid, newSession, autoUser.nombre.split(' ')[0], rolLabel);
        return;
      }

      userState.set(phone, { state: 'WAITING_CEDULA' });
      await sendText(jid,
        '¡Hola! Soy *Roomie*, tu asistente de aulas en la UIDE 🤖\n\nPara empezar, necesito verificar tu identidad.\n\nEnvía tu número de *cédula* (10 dígitos):'
      );
      return;
    }

    // --- COMANDOS GLOBALES ---
    const n = normalizeText(text);
    if (n === 'menu' || n === '/menu' || n === 'inicio' || n === '/start') {
      if (session) {
        userState.delete(phone);
        await sendMainMenu(jid, session);
      } else {
        userState.set(phone, { state: 'WAITING_CEDULA' });
        await sendText(jid, 'Primero necesito tu cédula (10 dígitos) para identificarte:');
      }
      return;
    }

    if (n === 'salir' || n === '/logout' || n === 'cerrar sesion') {
      await pool.query('DELETE FROM bot_sessions WHERE telefono = $1', [phone]);
      await pool.query('UPDATE estudiantes SET telefono = NULL WHERE telefono = $1', [phone]);
      userState.set(phone, { state: 'WAITING_CEDULA' });
      await sendText(jid, 'Sesión cerrada. Envía tu cédula cuando quieras volver a entrar.');
      return;
    }

    // --- LOGIN CON CEDULA ---
    if (state === 'WAITING_CEDULA') {
      if (!/^\d{10}$/.test(text)) {
        await sendText(jid, 'Esa cédula no parece válida (deben ser 10 números). Intenta de nuevo:');
        return;
      }
      const user = await authenticateUser(text, jid);
      if (user) {
        userState.delete(phone);
        const newSession = await getSession(jid);
        // Un solo mensaje: bienvenida + menu integrado
        await sendMainMenu(jid, newSession, user.name);
      } else {
        await sendText(jid,
          '❌ No encontré esa cédula en el sistema.\n\n' +
          'Asegúrate de estar matriculado/registrado e intenta de nuevo:'
        );
      }
      return;
    }

    // --- MENU PRINCIPAL: usuario selecciono un numero ---
    if (state === 'MAIN_MENU') {
      const num = parseInt(text);
      const options = stateObj.options;
      if (num >= 1 && num <= options.length) {
        const selected = options[num - 1];
        await handleMenuAction(jid, selected.id, session);
        return;
      }
      // Si no es un numero valido, intentar deteccion natural
    }

    // Contexto de flujo que viaja entre estados (aula vs espacio común)
    const flowCtx = { flujo: stateObj?.flujo, selectedEspacio: stateObj?.selectedEspacio };

    // Despacha búsqueda según el flujo activo una vez elegidos día y hora
    const routeDayTime = async (dia, hora) => {
      if (flowCtx.flujo === 'espacio' && flowCtx.selectedEspacio) {
        await checkEspacioAndConfirm(jid, { ...stateObj, ...flowCtx }, dia, hora);
      } else {
        await searchAndShowRooms(jid, dia, hora);
      }
    };

    // --- SELECCION DE DIA (botones: hoy / mañana / otro día) ---
    if (state === 'SELECTING_DAY') {
      const num = parseInt(text);
      let dia = null;

      if (num === 0) {
        await sendMainMenu(jid, session);
        return;
      }
      if (num === 1) {
        dia = getTodayName();
      } else if (num === 2) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const d = extractDay(normalizeText(tomorrow.toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil', weekday: 'long' })));
        dia = d ? d.formatted : 'Martes';
      } else if (num === 3) {
        await sendDayListMenu(jid, flowCtx);
        return;
      }

      if (!dia) {
        // Intentar extraer dia del texto natural
        const dayFromText = extractDay(text);
        if (dayFromText) dia = dayFromText.formatted;
      }

      if (dia) {
        await sendTimeMenu(jid, dia, flowCtx);
        return;
      }

      await sendText(jid, 'No entendí el día. Elige un botón o escribe *menu* para volver.');
      return;
    }

    // --- SELECCION DE DIA (lista completa) ---
    if (state === 'SELECTING_DAY_LIST') {
      const num = parseInt(text);
      if (num === 0) {
        await sendMainMenu(jid, session);
        return;
      }
      let dia = (num >= 1 && num <= 6) ? DAYS[num - 1]?.formatted : null;
      if (!dia) {
        const dayFromText = extractDay(text);
        if (dayFromText) dia = dayFromText.formatted;
      }
      if (dia) {
        await sendTimeMenu(jid, dia, flowCtx);
        return;
      }
      await sendText(jid, 'No entendí el día. Responde con el número o escribe *menu*.');
      return;
    }

    // --- SELECCION DE JORNADA (botones AM/PM) ---
    if (state === 'SELECTING_PERIOD') {
      const num = parseInt(text);
      if (num === 0) {
        await sendDayMenu(jid, flowCtx);
        return;
      }
      if (num === 1 || num === 2) {
        await sendSlotMenu(jid, stateObj.dia, num === 1 ? 'AM' : 'PM', flowCtx);
        return;
      }
      // Hora escrita directamente ("15:00", "3 pm")
      const timeFromText = extractTime(text);
      if (timeFromText) {
        await routeDayTime(stateObj.dia, timeFromText);
        return;
      }
      await sendText(jid, 'Elige *1* Mañana o *2* Tarde, o escribe la hora (ej. 15:00).');
      return;
    }

    // --- SELECCION DE HORA (franja concreta) ---
    if (state === 'SELECTING_TIME') {
      const num = parseInt(text);
      const slots = stateObj.slots || TIME_SLOTS;
      if (num === 0) {
        await sendTimeMenu(jid, stateObj.dia, flowCtx);
        return;
      }
      if (num >= 1 && num <= slots.length) {
        await routeDayTime(stateObj.dia, slots[num - 1]);
        return;
      }

      // Intentar extraer hora del texto
      const timeFromText = extractTime(text);
      if (timeFromText) {
        await routeDayTime(stateObj.dia, timeFromText);
        return;
      }

      await sendText(jid, 'No entendí la hora. Responde con el número o escribe *menu*.');
      return;
    }

    // --- SELECCION DE ESPACIO COMUN ---
    if (state === 'SELECTING_ESPACIO') {
      const num = parseInt(text);
      const espacios = stateObj.espacios || [];
      if (num === 0) {
        await sendMainMenu(jid, session);
        return;
      }
      if (num >= 1 && num <= espacios.length) {
        const esp = espacios[num - 1];
        // Ficha del espacio + pasar a elegir día
        let ficha = `${ESPACIO_TIPO_EMOJI[esp.tipo] || '📍'} *${esp.nombre}*\n`;
        ficha += `🔖 Código: ${esp.codigo}\n`;
        ficha += `🏷️ Tipo: ${esp.tipo.replace(/_/g, ' ')}\n`;
        ficha += `👥 Capacidad: ${esp.capacidad} personas`;
        if (esp.descripcion) ficha += `\n📝 ${esp.descripcion}`;
        await sendText(jid, ficha);
        await sendDayMenu(jid, { flujo: 'espacio', selectedEspacio: esp });
        return;
      }
      await sendText(jid, 'Número no válido. Responde con el número del espacio o *0* para volver.');
      return;
    }

    // --- SELECCION DE AULA PARA RESERVAR (paginado) ---
    if (state === 'SELECTING_ROOM') {
      const num = parseInt(text);
      if (num === 0) {
        await sendMainMenu(phone, session);
        return;
      }

      const { pageRooms = [], hasMore, page = 0 } = stateObj;

      // "Ver más" es la opción siguiente a la última aula de la página
      if (hasMore && num === pageRooms.length + 1) {
        await showRoomsPage(jid, { ...stateObj, page: page + 1 });
        return;
      }

      if (num >= 1 && num <= pageRooms.length) {
        const aula = pageRooms[num - 1];
        userState.set(phone, { ...stateObj, state: 'WAITING_GROUP_MODE', selectedAula: aula, lastActivity: Date.now() });
        await sendButtons(jid,
          `🏫 *${aula.codigo}* · ${aula.nombre}\n👥 Capacidad: ${aula.capacidad} personas\n\n¿Cómo vas a usar el espacio?`,
          [
            { id: '1', text: 'Solo 👤' },
            { id: '2', text: 'En grupo 👥' }
          ], '✔️ Aula seleccionada');
        return;
      }

      await sendText(phone, 'Número no válido. Intenta de nuevo o escribe *menu*.');
      return;
    }

    // --- ¿SOLO O EN GRUPO? ---
    if (state === 'WAITING_GROUP_MODE') {
      const num = parseInt(text);
      if (num === 1) {
        userState.set(phone, { ...stateObj, state: 'CONFIRMING_RESERVATION', esGrupal: false, numPersonas: 1, lastActivity: Date.now() });
        const { selectedAula, dia, horaInicio, horaFin } = stateObj;
        await sendButtons(jid,
          `🏫 *${selectedAula.codigo}* · ${selectedAula.nombre || ''}\n` +
          `📅 ${dia} · ⏰ ${horaInicio}–${horaFin}\n` +
          `👤 Individual\n\n¿Confirmas la reserva?`,
          [
            { id: '1', text: 'Sí, reservar ✅' },
            { id: '2', text: 'No, cancelar ❌' }
          ], '📝 Confirmar reserva');
      } else if (num === 2) {
        userState.set(phone, { ...stateObj, state: 'WAITING_NUM_PEOPLE', esGrupal: true, lastActivity: Date.now() });
        await sendText(phone, '👥 ¿Cuántas personas van a usar el espacio?\n\n_Escribe el número:_');
      } else {
        await sendText(phone, 'Por favor elige *1* para Solo o *2* para Grupo:');
      }
      return;
    }

    // --- ¿CUANTAS PERSONAS? ---
    if (state === 'WAITING_NUM_PEOPLE') {
      const num = parseInt(text);
      if (isNaN(num) || num <= 0) {
        await sendText(phone, 'Por favor envia un numero valido:');
        return;
      }
      const { selectedAula, dia, horaInicio, horaFin } = stateObj;
      if (selectedAula.capacidad && num > selectedAula.capacidad) {
        await sendText(phone, `⚠️ *${selectedAula.codigo}* tiene capacidad para *${selectedAula.capacidad}* personas.\n\nEscribe un número menor o *0* para volver:`);
        return;
      }
      userState.set(phone, { ...stateObj, state: 'CONFIRMING_RESERVATION', numPersonas: num, lastActivity: Date.now() });
      await sendButtons(jid,
        `🏫 *${selectedAula.codigo}* · ${selectedAula.nombre || ''}\n` +
        `📅 ${dia} · ⏰ ${horaInicio}–${horaFin}\n` +
        `👥 Grupal (${num} personas)\n\n¿Confirmas la reserva?`,
        [
          { id: '1', text: 'Sí, reservar ✅' },
          { id: '2', text: 'No, cancelar ❌' }
        ], '📝 Confirmar reserva');
      return;
    }

    // --- CONFIRMACION FINAL ---
    if (state === 'CONFIRMING_RESERVATION') {
      const nText = normalizeText(text);
      if (nText === 'si' || nText === '1' || nText === 'correcto') {
        const { selectedAula, dia, horaInicio, horaFin, esGrupal, numPersonas } = stateObj;
        await reservarAula(phone, selectedAula.codigo, dia, horaInicio, horaFin, session, {
          esGrupal,
          numPersonas,
          tipoEspacio: selectedAula.tipo || 'aula'
        });
      } else if (nText === 'no' || nText === '2' || nText === 'cancelar') {
        await sendText(phone, 'Reserva cancelada. Escribe *menu* para volver a empezar.');
        userState.delete(phone);
      } else {
        await sendText(phone, 'Por favor responde *1* para confirmar o *2* para cancelar.');
      }
      return;
    }

    // --- BUSCANDO PROFESOR ---
    if (state === 'SEARCHING_TEACHER') {
      const schedule = await findTeacher(text);
      userState.delete(phone);
      if (schedule.length === 0) {
        await sendText(phone,
          `🔍 No encontré clases para *"${text}"*.\n\n` +
          `Puede que no tenga clases registradas o esté en la *Sala de Profesores*.\n\n` +
          `Escribe *menu* para volver.`
        );
      } else {
        const now = new Date();
        const options = { timeZone: 'America/Guayaquil', hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'long' };
        const formatter = new Intl.DateTimeFormat('es-ES', options);
        const parts = formatter.formatToParts(now);
        const map = { 'lunes': 'Lunes', 'martes': 'Martes', 'miercoles': 'Miercoles', 'miércoles': 'Miercoles', 'jueves': 'Jueves', 'viernes': 'Viernes', 'sabado': 'Sabado', 'sábado': 'Sabado', 'domingo': 'Domingo' };
        const wd = parts.find(p => p.type === 'weekday').value.toLowerCase();
        const currentDay = map[wd] || map[wd.normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
        const currentH = parts.find(p => p.type === 'hour').value;
        const currentM = parts.find(p => p.type === 'minute').value;
        const currentTime = `${currentH}:${currentM}`;
        const currentClass = schedule.find(c => c.dia === currentDay && c.hora_inicio <= currentTime && c.hora_fin > currentTime);

        if (currentClass) {
          await sendText(phone,
            `🟢 *¡Docente en clase AHORA!*\n\n` +
            `👨‍🏫 *${currentClass.docente}*\n` +
            `🏫 Aula: *${currentClass.aula_asignada || 'Sin asignar'}*\n` +
            `⏰ Horario: ${currentClass.hora_inicio} – ${currentClass.hora_fin}\n` +
            `📚 Materia: ${currentClass.materia}\n\n` +
            `Escribe *menu* para volver.`
          );
        } else {
          let response = `📅 *Horario de ${schedule[0].docente}*\n\n`;
          const byDay = {};
          schedule.forEach(c => {
            if (!byDay[c.dia]) byDay[c.dia] = [];
            byDay[c.dia].push(c);
          });
          for (const [dia, clases] of Object.entries(byDay)) {
            response += `*${dia}*\n`;
            clases.forEach(c => {
              response += `  ⏰ ${c.hora_inicio}–${c.hora_fin} | 🏫 ${c.aula_asignada || 'S/A'} | ${c.materia}\n`;
            });
            response += '\n';
          }
          response += `🟡 _Actualmente no está en clase._\n`;
          response += `Posiblemente en la *Sala de Profesores*.\n\n`;
          response += `Escribe *menu* para volver.`;
          await sendText(phone, response);
        }
      }
      return;
    }

    // --- BUSCANDO MATERIA ---
    if (state === 'SEARCHING_SUBJECT') {
      const classes = await findSubjectClasses(text);
      userState.delete(phone);
      if (classes.length === 0) {
        await sendText(phone,
          `🔍 No encontré *"${text}"* en el sistema.\n\n` +
          `Verifica el nombre e intenta de nuevo.\n\n` +
          `Escribe *menu* para volver.`
        );
      } else {
        let response = `📚 *Horarios de "${classes[0].materia}"*\n\n`;
        classes.forEach(c => {
          response += `📅 *${c.dia}* | ⏰ ${c.hora_inicio}–${c.hora_fin}\n`;
          response += `  🏫 Aula: *${c.aula_asignada || 'Sin asignar'}*\n`;
          if (c.docente) response += `  👨‍🏫 ${c.docente.split(' ').slice(0, 2).join(' ')}\n`;
          response += '\n';
        });
        response += `Escribe *menu* para volver.`;
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
        const stateData = userState.get(phone) || {};
        let cancelado = false;

        // Intentar via API del backend: DELETE /api/reservas/:id
        if (stateData.jwtToken) {
          try {
            const resp = await axios.delete(`${BACKEND_URL}/api/reservas/${reservaId}`, {
              headers: { Authorization: `Bearer ${stateData.jwtToken}` },
              timeout: 8000
            });
            if (resp.data?.success) cancelado = true;
          } catch (e) {
            console.error('[cancelar] Error backend, usando SQL:', e.message);
          }
        }

        // Fallback SQL
        if (!cancelado) {
          const res = await pool.query(
            `UPDATE reservas SET estado = 'cancelada' WHERE id = $1 AND telefono = $2 RETURNING id`,
            [reservaId, phone]
          );
          cancelado = res.rows.length > 0;
        }

        await sendText(phone, cancelado
          ? 'Reserva cancelada correctamente.\n\nEscribe *menu* para volver.'
          : 'No se pudo cancelar (ya fue cancelada o no existe).'
        );
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
    if (n.includes('espacios comunes') || n.includes('espacio comun') || n === 'espacios') {
      await handleMenuAction(jid, 'menu_espacios', session);
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
    await sendText(jid, 'No te entendí. Escribe *menu* para ver las opciones disponibles.');

  } catch (error) {
    console.error('Error procesando mensaje:', error);
    await sendText(jid, 'Ocurrió un error. Intenta de nuevo o escribe *menu*.');
  }
}

// ==========================================
// ACCIONES DEL MENU
// ==========================================

async function handleMenuAction(jid, actionId, session) {
  const phone = formatPhone(jid);
  switch (actionId) {
    case 'menu_aulas':
      await sendDayMenu(jid);
      break;

    case 'menu_reservas': {
      // Usa GET /api/reservas/mis-reservas (requiere JWT)
      let reservas = [];
      const stateData = userState.get(phone) || {};
      try {
        const resp = await axios.get(`${BACKEND_URL}/api/reservas/mis-reservas`, {
          headers: { Authorization: `Bearer ${stateData.jwtToken}` },
          timeout: 8000
        });
        if (resp.data?.success) reservas = resp.data.reservas;
      } catch (e) {
        // Fallback a SQL directo si no hay token o falla el backend
        const res = await pool.query(
          `SELECT id, COALESCE(aula_codigo, espacio_codigo) AS aula_codigo, tipo_espacio, dia, hora_inicio, hora_fin
           FROM reservas WHERE telefono = $1 AND estado = 'activa' ORDER BY hora_inicio`,
          [phone]
        );
        reservas = res.rows;
      }

      if (reservas.length === 0) {
        await sendText(jid, 'No tienes reservas activas.\n\nEscribe *menu* para volver.');
        userState.delete(phone);
      } else {
        let msg = '*Tus Reservas Activas:*\n\n';
        reservas.forEach((r, i) => {
          const codigo = r.aula_codigo || r.espacio_codigo;
          const ico = r.tipo_espacio === 'espacio' ? '🛋️' : '🏫';
          msg += `*${i + 1}.* ${ico} ${codigo}: ${r.dia} ${r.hora_inicio}-${r.hora_fin}\n`;
        });
        msg += `\n*0.* Volver al menu\n`;
        msg += `\n_Responde con el numero para cancelar una reserva._`;
        userState.set(phone, { ...stateData, state: 'CONFIRMING_CANCEL', reservas });
        await sendText(phone, msg);
      }
      break;
    }

    case 'menu_profe':
      userState.set(phone, { state: 'SEARCHING_TEACHER' });
      await sendText(jid, 'Escribe el apellido del profesor que buscas:');
      break;

    case 'menu_materia':
      userState.set(phone, { state: 'SEARCHING_SUBJECT' });
      await sendText(jid, 'Escribe el nombre de la materia (o una parte):');
      break;

    case 'menu_estado': {
      if (!session || !['admin', 'director'].includes(session.rol)) {
        await sendText(jid, 'No tienes permisos para esta opcion.');
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

      await sendText(jid,
        `📊 *Estado del Sistema UIDE*\n\n` +
        `📚 Clases registradas: *${s.total_clases}*\n` +
        `🏫 Aulas disponibles: *${s.aulas_disponibles}*\n` +
        `🗂️ Distribuciones activas: *${s.distribuciones}*\n` +
        `📌 Reservas activas: *${s.reservas_activas}*\n` +
        `👥 Estudiantes registrados: *${s.total_estudiantes}*\n\n` +
        `Escribe *menu* para volver.`
      );
      userState.delete(phone);
      break;
    }

    case 'menu_espacios': {
      const espacios = await getEspaciosComunes();
      if (espacios.length === 0) {
        await sendText(jid, '😕 No hay espacios comunes disponibles por ahora.\n\nEscribe *menu* para volver.');
        userState.delete(phone);
        break;
      }
      let msg = `🛋️ *Espacios Comunes* (${espacios.length})\n\n`;
      espacios.slice(0, 8).forEach((e, i) => {
        const ico = ESPACIO_TIPO_EMOJI[e.tipo] || '📍';
        msg += `*${i + 1}.* ${ico} *${e.nombre}* · 👥 ${e.capacidad}\n`;
      });
      msg += `\n*0.* ⬅️ Volver al menú\n\n_Responde con el número para ver detalles y reservar._`;
      userState.set(phone, { state: 'SELECTING_ESPACIO', espacios: espacios.slice(0, 8), lastActivity: Date.now() });
      await sendText(jid, msg);
      break;
    }

    default:
      await sendText(phone, 'Opcion no reconocida. Escribe *menu* para volver.');
  }
}

// ==========================================
// RESERVAR AULA
// ==========================================

async function reservarAula(jid, aulaCodigo, dia, horaInicio, horaFin, session, extra = {}) {
  const phone = formatPhone(jid);
  const { esGrupal = false, numPersonas = 1, tipoEspacio = 'aula' } = extra;
  const stateData = userState.get(phone) || {};
  const sessionName = await getSessionName(session);
  const esAuditorio = aulaCodigo.toUpperCase().includes('AUDITORIO');

  // Calcular fecha de la reserva en Ecuador (GMT-5)
  const now = new Date();
  const ecuadorTime = new Date(now.getTime() + (now.getTimezoneOffset() - 300) * 60000);

  const diasSemana = { LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6, DOMINGO: 0 };
  const diaNum = diasSemana[dia.toUpperCase()] ?? ecuadorTime.getDay();

  let diff = diaNum - ecuadorTime.getDay();
  if (diff < 0) diff += 7;

  const fechaReserva = new Date(ecuadorTime);
  fechaReserva.setDate(ecuadorTime.getDate() + diff);
  const fechaStr = fechaReserva.toISOString().split('T')[0];

  const esEspacio = tipoEspacio === 'espacio';

  // Intentar via API del backend: POST /api/reservas/
  if (stateData.jwtToken) {
    try {
      const resp = await axios.post(`${BACKEND_URL}/api/reservas/`, {
        ...(esEspacio ? { espacio_codigo: aulaCodigo } : { aula_codigo: aulaCodigo }),
        tipo_espacio: esEspacio ? 'espacio' : 'aula',
        dia,
        fecha: fechaStr,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        motivo: `Reserva via bot WhatsApp - ${esGrupal ? 'Grupal' : 'Individual'}`
      }, {
        headers: { Authorization: `Bearer ${stateData.jwtToken}` },
        timeout: 10000
      });

      if (resp.data?.success) {
        const reservaId = resp.data.reserva?.id;
        if (esAuditorio) {
          await sendText(jid,
            `📨 *Solicitud enviada*\n\n` +
            `El *Auditorio* requiere aprobación del administrador.\n` +
            `📅 ${dia} | ⏰ ${horaInicio} – ${horaFin}\n\n` +
            `Te notificaremos cuando sea aprobada. ⏳`
          );
          const admins = await pool.query(`SELECT telefono FROM bot_sessions WHERE rol = 'admin'`);
          for (const admin of admins.rows) {
            await sendText(admin.telefono,
              `🚨 *Solicitud de Auditorio*\n\n` +
              `👤 Usuario: *${sessionName}*\n` +
              `🏫 Aula: *${aulaCodigo}*\n` +
              `📅 ${dia} | ⏰ ${horaInicio} – ${horaFin}\n\n` +
              `Responde *1* para ✅ Aprobar o *2* para ❌ Rechazar.`
            );
            userState.set(admin.telefono, { state: 'PENDING_APPROVAL', reservaId });
          }
        } else {
          await sendText(jid,
            `✅ *¡Reserva confirmada!*\n\n` +
            `🏫 *${aulaCodigo}*\n` +
            `📅 ${dia} | ⏰ ${horaInicio} – ${horaFin}\n` +
            `${esGrupal ? `👥 Grupal (${numPersonas} personas)` : '👤 Individual'}\n\n` +
            `_Recibirás un recordatorio 15 min antes._\n` +
            `Escribe *menu* para volver.`
          );
        }
        userState.delete(phone);
        return;
      }
    } catch (e) {
      // Si hay conflicto (409), informar al usuario
      if (e.response?.status === 409) {
        await sendText(jid, `Lo siento, *${aulaCodigo}* ya esta ocupada en ese horario.\n\nIntenta con otro horario o espacio.`);
        userState.delete(phone);
        return;
      }
      console.error('[reservarAula] Error backend, usando SQL:', e.response?.data || e.message);
    }
  }

  // Fallback: SQL directo (para usuarios sin JWT o si falla el backend)
  const conflict = await pool.query(
    `SELECT solicitante_nombre FROM reservas
     WHERE (aula_codigo = $1 OR espacio_codigo = $1) AND dia = $2
     AND estado IN ('activa', 'pendiente_aprobacion')
     AND hora_inicio < $4 AND hora_fin > $3`,
    [aulaCodigo, dia, horaInicio, horaFin]
  );
  if (conflict.rows.length > 0) {
    await sendText(jid, `Lo siento, *${aulaCodigo}* ya fue reservada.\n\nIntenta con otro horario.`);
    userState.delete(phone);
    return;
  }

  const estadoReserva = esAuditorio ? 'pendiente_aprobacion' : 'activa';
  const insertResult = await pool.query(
    `INSERT INTO reservas (aula_codigo, espacio_codigo, tipo_espacio, es_grupal, num_personas, dia, fecha, hora_inicio, hora_fin, telefono, solicitante_nombre, estado, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) RETURNING id`,
    [
      esEspacio ? null : aulaCodigo,
      esEspacio ? aulaCodigo : null,
      esEspacio ? 'espacio' : 'aula',
      esGrupal, numPersonas,
      dia, fechaStr, horaInicio, horaFin, phone, sessionName, estadoReserva
    ]
  );
  const reservaId = insertResult.rows[0].id;

  if (esAuditorio) {
    await sendText(jid, `*Solicitud Enviada*\n\nAula: *${aulaCodigo}*\nDia: ${dia}\nHora: ${horaInicio} - ${horaFin}\n\nRequiere aprobacion.`);
    const admins = await pool.query(`SELECT telefono FROM bot_sessions WHERE rol = 'admin'`);
    for (const admin of admins.rows) {
      await sendText(admin.telefono,
        `*Solicitud de Auditorio*\n\nUsuario: ${sessionName}\nAula: ${aulaCodigo}\nDia: ${dia}\nHora: ${horaInicio} - ${horaFin}\n\nResponde *1* para Aprobar o *2* para Rechazar.`
      );
      userState.set(admin.telefono, { state: 'PENDING_APPROVAL', reservaId });
    }
  } else {
    await sendText(jid,
      `*Reserva Confirmada ✅*\n\nEspacio: *${aulaCodigo}*\nDia: ${dia}\nHora: ${horaInicio} - ${horaFin}\n\nEscribe *menu* para volver.`
    );
  }
  userState.delete(phone);
}

// ==========================================
// APROBAR / RECHAZAR RESERVAS (Admin)
// ==========================================

async function aprobarReserva(jid, reservaId, session) {
  const phone = formatPhone(jid);
  if (!session || session.rol !== 'admin') {
    await sendText(jid, 'No tienes permiso para aprobar reservas.');
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
      await sendText(jid, 'Esta reserva ya estaba aprobada.');
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
    await sendText(jid, `Reserva aprobada. (Aprobado por: ${adminName})\n\nEscribe *menu* para volver.`);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error aprobando reserva:', e);
    await sendText(jid, 'Error al aprobar la reserva.');
  } finally {
    client.release();
  }
  userState.delete(phone);
}

async function rechazarReserva(jid, reservaId, session) {
  const phone = formatPhone(jid);
  if (!session || session.rol !== 'admin') {
    await sendText(jid, 'No tienes permiso para rechazar reservas.');
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

    await sendText(jid, `Reserva rechazada.\n\nEscribe *menu* para volver.`);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error rechazando reserva:', e);
    await sendText(jid, 'Error al rechazar la reserva.');
  } finally {
    client.release();
  }
  userState.delete(phone);
}

// ==========================================
// WEBHOOK DE EVOLUTION API
// ==========================================

app.post('/webhook', async (req, res) => {
  const body = req.body;

  // 1. Filtrar estricto: Solo procesar eventos de mensajería
  if (body.event !== 'messages.upsert') return res.sendStatus(200);

  const data = body.data;
  if (!data || !data.key) return res.sendStatus(200);

  let remoteJid = data.key.remoteJid;
  if (!remoteJid) return res.sendStatus(200);

  // 2. Manejo de LIDs y Mapeos
  if (remoteJid.includes('@lid')) {
    try {
      const mapping = await pool.query('SELECT real_phone FROM lid_mappings WHERE lid_jid = $1', [remoteJid]);
      if (mapping.rows.length > 0) {
        console.log(`[LID] Mapeado ${remoteJid} -> ${mapping.rows[0].real_phone}`);
        // No reemplazamos remoteJid para el envío, solo para la lógica interna si fuera necesario
      }
    } catch (e) { console.error('[LID ERROR]', e.message); }
  }

  // 3. Ignorar mensajes propios
  if (data.key.fromMe) return res.sendStatus(200);

  // 4. Identificar al usuario (Clean Phone para lógica, RemoteJid para envío)
  const cleanPhone = formatPhone(remoteJid);

  // Debug log para ver qué llega
  console.log(`[INBOUND] De: ${remoteJid} (Limpio: ${cleanPhone})`);

  try {
    const messageId = data.key.id;
    if (isDuplicate(messageId)) return res.sendStatus(200);

    // Prioridad: Botones y Listas primero (interacciones)
    // nativeFlow (Evolution v2) responde con interactiveResponseMessage o templateButtonReplyMessage
    let nativeFlowId = null;
    const nfr = data.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    if (nfr) {
      try { nativeFlowId = JSON.parse(nfr).id || null; } catch (_) { }
    }
    const buttonResponse = data.message?.buttonsResponseMessage?.selectedButtonId ||
      data.message?.templateButtonReplyMessage?.selectedId ||
      nativeFlowId;
    const listResponse = data.message?.listResponseMessage?.singleSelectReply?.selectedRowId;

    // --- EXTRAER TEXTO ---
    const textMsg = data.message?.conversation ||
      data.message?.extendedTextMessage?.text ||
      data.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
      data.message?.ephemeralMessage?.message?.conversation ||
      data.message?.viewOnceMessage?.message?.conversation ||
      data.message?.viewOnceMessage?.message?.extendedTextMessage?.text ||
      "";

    // Enviamos el JID completo para que las respuestas lleguen al lugar correcto,
    // pero la lógica interna usará cleanPhone para las sesiones.
    if (buttonResponse) {
      await handleMessage(remoteJid, buttonResponse, data);
    } else if (listResponse) {
      await handleMessage(remoteJid, listResponse, data);
    } else if (textMsg) {
      await handleMessage(remoteJid, textMsg.trim(), data);
    } else {
      // Si llega aquí y es audio, ya se maneja abajo
    }

    // Notas de voz — un solo mensaje de respuesta
    const isAudio = data.message?.audioMessage || data.messageType === 'audioMessage';
    if (isAudio) {
      const transcription = await getAudioUrl(data);
      if (transcription) {
        await handleMessage(remoteJid, transcription, data);
      } else {
        await sendText(remoteJid, '🎤 No pude entender tu nota de voz. Intenta escribiendo.');
      }
    }

  } catch (error) {
    console.error('Error procesando webhook:', error);
  }

  res.sendStatus(200);
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
    const timeNow = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    let targetH = h;
    let targetM = m + 15;
    if (targetM >= 60) { targetM -= 60; targetH = (targetH + 1) % 24; }
    const timeStr15 = `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`;

    // 1. Notificar INICIO de reservas (15 min antes)
    const reservasStart = await pool.query(
      `SELECT telefono, COALESCE(aula_codigo, espacio_codigo) AS aula_codigo FROM reservas WHERE dia = $1 AND hora_inicio = $2 AND estado = 'activa' AND telefono IS NOT NULL`,
      [day, timeStr15]
    );
    for (const r of reservasStart.rows) {
      sendText(r.telefono, `🔔 *Recordatorio:* Tu reserva en *${r.aula_codigo}* empieza en 15 min. ¡Te esperamos!`).catch(() => { });
    }

    // 2. Notificar FIN de reservas (justo al terminar)
    const reservasEnd = await pool.query(
      `SELECT id, telefono, COALESCE(aula_codigo, espacio_codigo) AS aula_codigo FROM reservas WHERE dia = $1 AND hora_fin = $2 AND estado = 'activa' AND telefono IS NOT NULL`,
      [day, timeNow]
    );
    for (const r of reservasEnd.rows) {
      sendText(r.telefono, `🏁 *Tu tiempo ha terminado:* Por favor, libera el espacio *${r.aula_codigo}* para que otros compañeros puedan utilizarlo. ¡Gracias por tu colaboracion!`).catch(() => { });
      // Marcar como finalizada para que no se notifique de nuevo y para estadisticas
      pool.query(`UPDATE reservas SET estado = 'finalizada' WHERE id = $1`, [r.id]).catch(() => { });
    }

    // 3. Notificar clases a estudiantes con telefono registrado (15 min antes)
    const clases = await pool.query(
      `SELECT carrera, ciclo, materia, aula_asignada FROM clases WHERE dia = $1 AND hora_inicio = $2`,
      [day, timeStr15]
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

const { registerWebhook } = require('./scripts/setup-webhook');

app.listen(BOT_PORT, async () => {
  console.log(`Roomie Bot (WhatsApp) iniciado en puerto ${BOT_PORT}`);
  console.log(`Webhook URL: http://localhost:${BOT_PORT}/webhook`);
  console.log(`Instance: ${EVOLUTION_INSTANCE}`);

  // Auto-registrar webhook en Evolution API
  setTimeout(async () => {
    const ok = await registerWebhook();
    if (ok) {
      console.log('[BOOT] Webhook registrado correctamente');
    } else {
      console.warn('[BOOT] No se pudo registrar el webhook automáticamente');
      console.warn('[BOOT] Registra manualmente en Evolution API o ejecuta: node scripts/setup-webhook.js');
    }
  }, 3000); // Espera 3s para dar tiempo a Evolution API
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
