const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');
require('dotenv').config();

const requiredEnv = ['TELEGRAM_BOT_TOKEN', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`Faltan variables de entorno: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

let schemaCache = null;
let runtime = null;

async function loadSchema() {
  const { rows } = await pool.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'`
  );

  const tables = new Set();
  const columns = {};

  rows.forEach((row) => {
    tables.add(row.table_name);
    if (!columns[row.table_name]) {
      columns[row.table_name] = new Set();
    }
    columns[row.table_name].add(row.column_name);
  });

  return { tables, columns };
}

function hasColumn(table, column) {
  return schemaCache?.columns?.[table]?.has(column) || false;
}

async function ensureRuntime() {
  if (runtime) return runtime;
  schemaCache = await loadSchema();

  if (!schemaCache.tables.has('estudiantes')) {
    throw new Error('No existe la tabla estudiantes.');
  }
  if (!schemaCache.tables.has('aulas')) {
    throw new Error('No existe la tabla aulas.');
  }

  const reservasTable = schemaCache.tables.has('reservas')
    ? 'reservas'
    : schemaCache.tables.has('reservas_aulas')
      ? 'reservas_aulas'
      : null;

  if (!reservasTable) {
    throw new Error('No existe la tabla reservas ni reservas_aulas.');
  }

  const aulasCodeColumn = hasColumn('aulas', 'codigo') ? 'codigo' : 'nombre';
  const aulasNameColumn = hasColumn('aulas', 'nombre') ? 'nombre' : aulasCodeColumn;
  const estudiantesNameColumn = hasColumn('estudiantes', 'nombre_completo')
    ? 'nombre_completo'
    : hasColumn('estudiantes', 'nombre')
      ? 'nombre'
      : 'cedula';
  const estudiantesSchoolColumn = hasColumn('estudiantes', 'escuela') ? 'escuela' : null;

  runtime = {
    reservasTable,
    aulasCodeColumn,
    aulasNameColumn,
    estudiantesNameColumn,
    estudiantesSchoolColumn,
    estudiantesStatusColumn: hasColumn('estudiantes', 'estado') ? 'estado' : null,
    estudiantesAuthColumn: hasColumn('estudiantes', 'autenticado') ? 'autenticado' : null,
    estudiantesTelegramUsernameColumn: hasColumn('estudiantes', 'telegram_username')
      ? 'telegram_username'
      : null,
    estudiantesLastAuthColumn: hasColumn('estudiantes', 'fecha_ultima_autenticacion')
      ? 'fecha_ultima_autenticacion'
      : null,
    reservasHasAulaId: hasColumn(reservasTable, 'aula_id'),
    reservasHasAulaCodigo: hasColumn(reservasTable, 'aula_codigo'),
    reservasHasFecha: hasColumn(reservasTable, 'fecha') || hasColumn(reservasTable, 'fecha_reserva'),
    reservasFechaColumn: hasColumn(reservasTable, 'fecha')
      ? 'fecha'
      : hasColumn(reservasTable, 'fecha_reserva')
        ? 'fecha_reserva'
        : null,
    reservasHasEstado: hasColumn(reservasTable, 'estado'),
    aulasHasEstado: hasColumn('aulas', 'estado'),
    aulasHasTipo: hasColumn('aulas', 'tipo'),
    aulasHasEdificio: hasColumn('aulas', 'edificio'),
    aulasHasPiso: hasColumn('aulas', 'piso'),
    reservasHasDia: hasColumn(reservasTable, 'dia'),
    reservasHasHoraInicio: hasColumn(reservasTable, 'hora_inicio'),
    reservasHasHoraFin: hasColumn(reservasTable, 'hora_fin')
  };

  return runtime;
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
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

  for (const dia of dias) {
    if (normalized.includes(dia.raw)) {
      return dia.formatted;
    }
  }
  return null;
}

function extractTime(text) {
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = match[1].padStart(2, '0');
  const minutes = match[2];
  return `${hours}:${minutes}`;
}

function buildStatusFilter(alias, statusColumn) {
  if (!statusColumn) return '1=1';
  return `UPPER(${alias}.${statusColumn}) = 'ACTIVO'`;
}

function buildAulaEstadoFilter(alias, hasEstado) {
  if (!hasEstado) return '1=1';
  return `UPPER(${alias}.estado) = 'DISPONIBLE'`;
}

function formatAulaLine(aula, index, runtimeInfo) {
  const codigo = aula[runtimeInfo.aulasCodeColumn] || aula.codigo || '';
  const nombre = aula[runtimeInfo.aulasNameColumn] || aula.nombre || '';
  const capacidad = aula.capacidad ? `Cap: ${aula.capacidad}` : null;
  const tipo = runtimeInfo.aulasHasTipo && aula.tipo ? aula.tipo : null;
  const edificio = runtimeInfo.aulasHasEdificio && aula.edificio ? aula.edificio : null;
  const piso = runtimeInfo.aulasHasPiso && aula.piso !== null && aula.piso !== undefined ? `Piso ${aula.piso}` : null;

  const detalles = [capacidad, tipo].filter(Boolean).join(' | ');
  const ubicacion = [edificio, piso].filter(Boolean).join(' - ');

  let line = `${index + 1}. ${codigo}`;
  if (nombre && nombre !== codigo) {
    line += ` - ${nombre}`;
  }
  line += '\n';
  if (detalles) {
    line += `   ${detalles}\n`;
  }
  if (ubicacion) {
    line += `   ${ubicacion}\n`;
  }
  return line;
}

async function findEstudianteByTelegramId(telegramId) {
  const rt = await ensureRuntime();
  const statusFilter = buildStatusFilter('e', rt.estudiantesStatusColumn);
  const authFilter = rt.estudiantesAuthColumn ? `AND e.${rt.estudiantesAuthColumn} = true` : '';

  const query = `
    SELECT e.cedula,
           e.${rt.estudiantesNameColumn} AS nombre,
           ${rt.estudiantesSchoolColumn ? `e.${rt.estudiantesSchoolColumn} AS escuela` : 'NULL AS escuela'}
    FROM estudiantes e
    WHERE e.telegram_id = $1
      AND ${statusFilter}
      ${authFilter}
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [telegramId]);
  return rows[0] || null;
}

async function findEstudianteByCedula(cedula) {
  const rt = await ensureRuntime();
  const statusFilter = buildStatusFilter('e', rt.estudiantesStatusColumn);

  const query = `
    SELECT e.cedula,
           e.${rt.estudiantesNameColumn} AS nombre,
           ${rt.estudiantesSchoolColumn ? `e.${rt.estudiantesSchoolColumn} AS escuela` : 'NULL AS escuela'}
    FROM estudiantes e
    WHERE e.cedula = $1
      AND ${statusFilter}
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [cedula]);
  return rows[0] || null;
}

async function updateEstudianteAuth(cedula, telegramId, telegramUsername) {
  const rt = await ensureRuntime();
  const updates = [];
  const values = [];

  if (hasColumn('estudiantes', 'telegram_id')) {
    values.push(telegramId);
    updates.push(`telegram_id = $${values.length}`);
  }

  if (rt.estudiantesTelegramUsernameColumn) {
    values.push(telegramUsername || 'sin_username');
    updates.push(`${rt.estudiantesTelegramUsernameColumn} = $${values.length}`);
  }

  if (rt.estudiantesAuthColumn) {
    values.push(true);
    updates.push(`${rt.estudiantesAuthColumn} = $${values.length}`);
  }

  if (rt.estudiantesLastAuthColumn) {
    updates.push(`${rt.estudiantesLastAuthColumn} = CURRENT_TIMESTAMP`);
  }

  if (!updates.length) {
    return;
  }

  values.push(cedula);
  const query = `UPDATE estudiantes SET ${updates.join(', ')} WHERE cedula = $${values.length}`;
  await pool.query(query, values);
}

async function buildAulasQuery(dia, hora) {
  const rt = await ensureRuntime();
  const params = [];
  const filters = [buildAulaEstadoFilter('a', rt.aulasHasEstado)];

  const selectColumns = [
    `a.${rt.aulasCodeColumn} AS ${rt.aulasCodeColumn}`,
    `a.${rt.aulasNameColumn} AS ${rt.aulasNameColumn}`,
    'a.capacidad'
  ];

  if (rt.aulasHasTipo) selectColumns.push('a.tipo');
  if (rt.aulasHasEdificio) selectColumns.push('a.edificio');
  if (rt.aulasHasPiso) selectColumns.push('a.piso');

  let conflictClause = '';
  if (dia || hora) {
    const diaParam = dia ? `$${params.push(dia)}` : null;
    const horaParam = hora ? `$${params.push(hora)}` : null;

    const clasesFilters = [];
    if (diaParam) clasesFilters.push(`c.dia = ${diaParam}`);
    if (horaParam) clasesFilters.push(`c.hora_inicio <= ${horaParam} AND c.hora_fin > ${horaParam}`);

    const reservasFilters = [];
    if (rt.reservasHasDia && diaParam) reservasFilters.push(`r.dia = ${diaParam}`);
    if (rt.reservasHasHoraInicio && rt.reservasHasHoraFin && horaParam) {
      reservasFilters.push(`r.hora_inicio <= ${horaParam} AND r.hora_fin > ${horaParam}`);
    }
    if (rt.reservasHasEstado) {
      reservasFilters.push(`UPPER(r.estado) = 'ACTIVA'`);
    }
    if (rt.reservasFechaColumn) {
      reservasFilters.push(`r.${rt.reservasFechaColumn} >= CURRENT_DATE`);
    }

    const aulasMatch = rt.reservasHasAulaId
      ? 'r.aula_id = a.id'
      : rt.reservasHasAulaCodigo
        ? `r.aula_codigo = a.${rt.aulasCodeColumn}`
        : '1=1';

    const aulasMatchClases = `c.aula_sugerida = a.${rt.aulasCodeColumn}`;

    conflictClause = `
      AND NOT EXISTS (
        SELECT 1 FROM clases c
        WHERE ${aulasMatchClases}
          ${clasesFilters.length ? 'AND ' + clasesFilters.join(' AND ') : ''}
      )
      AND NOT EXISTS (
        SELECT 1 FROM ${rt.reservasTable} r
        WHERE ${aulasMatch}
          ${reservasFilters.length ? 'AND ' + reservasFilters.join(' AND ') : ''}
      )
    `;
  }

  const query = `
    SELECT ${selectColumns.join(', ')}
    FROM aulas a
    WHERE ${filters.join(' AND ')}
    ${conflictClause}
    ORDER BY a.${rt.aulasCodeColumn}
  `;

  return { query, params, runtime: rt };
}

async function findAulaByCode(code) {
  const rt = await ensureRuntime();
  const normalized = code.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const query = `
    SELECT a.id,
           a.${rt.aulasCodeColumn} AS ${rt.aulasCodeColumn},
           a.${rt.aulasNameColumn} AS ${rt.aulasNameColumn}
    FROM aulas a
    WHERE UPPER(a.${rt.aulasCodeColumn}) = UPPER($1)
       OR UPPER(a.${rt.aulasCodeColumn}) = UPPER($2)
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [code, normalized]);
  return rows[0] || null;
}

async function hasConflicts(aula, dia, horaInicio, horaFin) {
  const rt = await ensureRuntime();
  const params = [aula.id, dia, horaInicio, horaFin];

  const clasesQuery = `
    SELECT 1
    FROM clases
    WHERE aula_sugerida = $5
      AND dia = $2
      AND (hora_inicio < $4 AND hora_fin > $3)
    LIMIT 1
  `;

  const clasesParams = [...params, aula[rt.aulasCodeColumn]];
  const clasesResult = await pool.query(clasesQuery, clasesParams);
  if (clasesResult.rows.length) return true;

  const reservasFilters = [];
  if (rt.reservasHasDia) reservasFilters.push(`dia = $2`);
  if (rt.reservasHasHoraInicio && rt.reservasHasHoraFin) {
    reservasFilters.push(`(hora_inicio < $4 AND hora_fin > $3)`);
  }
  if (rt.reservasHasEstado) {
    reservasFilters.push(`UPPER(estado) = 'ACTIVA'`);
  }
  if (rt.reservasFechaColumn) {
    reservasFilters.push(`${rt.reservasFechaColumn} >= CURRENT_DATE`);
  }

  const aulaMatch = rt.reservasHasAulaId
    ? `aula_id = $1`
    : rt.reservasHasAulaCodigo
      ? `aula_codigo = $5`
      : null;

  if (!aulaMatch) return false;

  const reservasQuery = `
    SELECT 1
    FROM ${rt.reservasTable}
    WHERE ${aulaMatch}
      ${reservasFilters.length ? 'AND ' + reservasFilters.join(' AND ') : ''}
    LIMIT 1
  `;

  const reservasParams = rt.reservasHasAulaCodigo
    ? [...params, aula[rt.aulasCodeColumn]]
    : params;

  const reservasResult = await pool.query(reservasQuery, reservasParams);
  return reservasResult.rows.length > 0;
}

async function createReserva({ aula, dia, horaInicio, horaFin, cedula, telegramId, usuarioNombre }) {
  const rt = await ensureRuntime();
  const columns = [];
  const values = [];
  const params = [];

  function addColumn(name, value) {
    if (!hasColumn(rt.reservasTable, name)) return;
    columns.push(name);
    params.push(value);
    values.push(`$${params.length}`);
  }

  if (rt.reservasHasAulaId) addColumn('aula_id', aula.id);
  if (rt.reservasHasAulaCodigo) addColumn('aula_codigo', aula[rt.aulasCodeColumn]);
  if (rt.reservasHasDia) addColumn('dia', dia);
  if (rt.reservasHasHoraInicio) addColumn('hora_inicio', horaInicio);
  if (rt.reservasHasHoraFin) addColumn('hora_fin', horaFin);
  addColumn('telegram_id', telegramId);
  addColumn('cedula', cedula);
  addColumn('usuario_nombre', usuarioNombre || null);
  addColumn('motivo', 'Reserva desde Telegram');
  addColumn('estado', 'activa');
  if (rt.reservasFechaColumn) addColumn(rt.reservasFechaColumn, new Date());

  const query = `
    INSERT INTO ${rt.reservasTable} (${columns.join(', ')})
    VALUES (${values.join(', ')})
  `;

  await pool.query(query, params);
}

console.log('Bot iniciado correctamente');

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const estudiante = await findEstudianteByTelegramId(msg.from.id);

    if (estudiante) {
      await bot.sendMessage(
        chatId,
        `Bienvenido de nuevo ${estudiante.nombre}\n\n` +
          `Comandos disponibles:\n` +
          `🏫 "aulas" - Ver aulas disponibles\n` +
          `📅 "reservar" - Reservar un aula\n` +
          `📋 "mis reservas" - Ver tus reservas\n\n` +
          `Ejemplo:\n` +
          `aulas Lunes 14:00\n` +
          `reservar AULA-C10 Lunes 14:00-16:00`
      );
    } else {
      await bot.sendMessage(
        chatId,
        'Bienvenido al Bot de Gestión de Aulas - UIDE Loja\n\n' +
          'Para comenzar, envía tu número de cédula (10 dígitos).\n\n' +
          'Ejemplo: 1105226829'
      );
    }
  } catch (error) {
    console.error('Error en /start:', error);
    await bot.sendMessage(chatId, 'Error al conectar con la base de datos.');
  }
});

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text.trim();
  const normalized = normalizeText(text);

  try {
    // AUTENTICACIÓN (cédula)
    if (/^\d{10}$/.test(text)) {
      const cedula = text.trim();
      const est = await findEstudianteByCedula(cedula);

      if (!est) {
        await bot.sendMessage(
          chatId,
          '❌ Cédula no encontrada\n\n' +
            'Verifica que:\n' +
            '- Estés matriculado en UIDE Loja\n' +
            '- La cédula sea correcta (10 dígitos)\n\n' +
            'Intenta nuevamente.'
        );
        return;
      }

      await updateEstudianteAuth(cedula, userId, msg.from.username);

      await bot.sendMessage(
        chatId,
        `✅ Autenticación exitosa\n\n` +
          `Nombre: ${est.nombre}\n` +
          `${est.escuela ? `Escuela: ${est.escuela}\n` : ''}\n` +
          `Comandos disponibles:\n` +
          `🏫 "aulas" - Ver aulas disponibles\n` +
          `📅 "reservar" - Reservar un aula\n` +
          `📋 "mis reservas" - Ver tus reservas`
      );
      return;
    }

    // CONSULTAR AULAS
    if (normalized.includes('aulas')) {
      const dia = extractDay(text);
      const hora = extractTime(text);
      const { query, params, runtime: rt } = await buildAulasQuery(dia, hora);
      const result = await pool.query(query, params);

      if (!result.rows.length) {
        await bot.sendMessage(
          chatId,
          `❌ No hay aulas disponibles${dia ? ' para ' + dia : ''}${hora ? ' a las ' + hora : ''}.`
        );
        return;
      }

      let mensaje = `🏫 AULAS DISPONIBLES\n\n`;
      if (dia || hora) {
        mensaje += `Filtros: ${dia || 'Todos los días'}${hora ? ' a las ' + hora : ''}\n\n`;
      }

      result.rows.forEach((aula, index) => {
        mensaje += formatAulaLine(aula, index, rt);
      });

      mensaje += `\nPara reservar:\nreservar [código] [día] [hora_inicio-hora_fin]\n\nEjemplo:\nreservar AULA-C10 Lunes 14:00-16:00`;

      await bot.sendMessage(chatId, mensaje);
      return;
    }

    // MIS RESERVAS
    if (normalized.includes('mis reservas')) {
      const rt = await ensureRuntime();
      const dateFilter = rt.reservasFechaColumn ? `AND r.${rt.reservasFechaColumn} >= CURRENT_DATE` : '';
      const estadoFilter = rt.reservasHasEstado ? `AND UPPER(r.estado) = 'ACTIVA'` : '';

      const joinClause = rt.reservasHasAulaId
        ? `JOIN aulas a ON r.aula_id = a.id`
        : rt.reservasHasAulaCodigo
          ? `JOIN aulas a ON r.aula_codigo = a.${rt.aulasCodeColumn}`
          : `LEFT JOIN aulas a ON 1=0`;

      const query = `
        SELECT r.id,
               ${rt.reservasHasAulaCodigo ? 'r.aula_codigo' : `a.${rt.aulasCodeColumn}`} AS aula_codigo,
               a.${rt.aulasNameColumn} AS aula_nombre,
               r.dia,
               r.hora_inicio,
               r.hora_fin
        FROM ${rt.reservasTable} r
        ${joinClause}
        WHERE r.telegram_id = $1
        ${dateFilter}
        ${estadoFilter}
        ORDER BY r.dia, r.hora_inicio
      `;

      const result = await pool.query(query, [userId]);

      if (!result.rows.length) {
        await bot.sendMessage(chatId, `📋 No tienes reservas activas.\n\nUsa "aulas" para ver disponibles.`);
        return;
      }

      let mensaje = `📋 MIS RESERVAS ACTIVAS\n\n`;
      result.rows.forEach((reserva, index) => {
        mensaje += `${index + 1}. ${reserva.aula_codigo || ''} - ${reserva.aula_nombre || ''}\n`;
        mensaje += `   📅 ${reserva.dia}\n`;
        mensaje += `   🕐 ${reserva.hora_inicio} - ${reserva.hora_fin}\n\n`;
      });

      await bot.sendMessage(chatId, mensaje);
      return;
    }

    // RESERVAR AULA
    if (normalized.includes('reservar')) {
      const parts = text.trim().split(/\s+/);
      if (parts.length < 4) {
        await bot.sendMessage(
          chatId,
          `❌ Formato incorrecto.\n\nUsa: reservar [código] [día] [hora_inicio-hora_fin]\n\nEjemplo:\nreservar AULA-C10 Lunes 14:00-16:00`
        );
        return;
      }

      const aulaCode = parts[1].toUpperCase();
      const dia = parts[2].charAt(0).toUpperCase() + parts[2].slice(1).toLowerCase();
      const horario = parts[3];
      const horarioMatch = horario.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);

      if (!horarioMatch) {
        await bot.sendMessage(chatId, `❌ Formato de horario incorrecto.\n\nUsa: HH:MM-HH:MM\nEjemplo: 14:00-16:00`);
        return;
      }

      const horaInicio = `${horarioMatch[1].padStart(2, '0')}:${horarioMatch[2]}`;
      const horaFin = `${horarioMatch[3].padStart(2, '0')}:${horarioMatch[4]}`;

      const estudiante = await findEstudianteByTelegramId(userId);
      if (!estudiante) {
        await bot.sendMessage(chatId, '❌ Debes autenticarte primero. Usa /start');
        return;
      }

      const aula = await findAulaByCode(aulaCode);
      if (!aula) {
        await bot.sendMessage(chatId, `❌ Aula no encontrada. Verifica el código e intenta nuevamente.`);
        return;
      }

      const conflictos = await hasConflicts(aula, dia, horaInicio, horaFin);
      if (conflictos) {
        await bot.sendMessage(
          chatId,
          `❌ AULA NO DISPONIBLE\n\nEl aula ${aulaCode} ya está ocupada en ese horario.\n\nUsa "aulas ${dia} ${horaInicio}" para ver disponibles.`
        );
        return;
      }

      await createReserva({
        aula,
        dia,
        horaInicio,
        horaFin,
        cedula: estudiante.cedula,
        telegramId: userId,
        usuarioNombre: estudiante.nombre
      });

      await bot.sendMessage(
        chatId,
        `✅ RESERVA CONFIRMADA\n\nAula: ${aulaCode}\nDía: ${dia}\nHorario: ${horaInicio} - ${horaFin}\n\nTu reserva ha sido registrada exitosamente.`
      );
      return;
    }
  } catch (error) {
    console.error('Error:', error);
    await bot.sendMessage(chatId, 'Ocurrió un error. Intenta nuevamente.');
  }
});

console.log('Bot escuchando mensajes...');
