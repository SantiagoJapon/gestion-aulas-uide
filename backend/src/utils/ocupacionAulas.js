// ============================================================
// Helper compartido: ocupación actual de aulas (legado + nuevo módulo
// de planificación colaborativa). Usado por:
//   - planificacionCarrera.service.js (sugerirAula, validación de envío)
//   - distribucion.service.js (calcularDistribucionFillGaps, Fase 3)
//
// Combina DOS fuentes de verdad de ocupación sin fusionarlas:
//   1. Legado: Clase.aula_asignada (escrito por la distribución maestra
//      original, ejecutarDistribucion()).
//   2. Nuevo: BloqueDisponibilidad en estado CONFIRMADO o EN_REVISION
//      (escrito por el flujo colaborativo por carrera). EN_REVISION cuenta
//      como ocupado: la regla 3.2 lo define como reserva temporal que
//      nadie más puede tomar.
// Extraído a módulo propio para no duplicar esta lógica entre los dos
// servicios que la necesitan (DRY).
// ============================================================

const { Op } = require('sequelize');
const { Clase, Aula, BloqueDisponibilidad } = require('../models');
const distribucionService = require('../services/distribucion.service');

/**
 * BloqueDisponibilidad.hora_inicio/hora_fin son columnas TIME de Postgres:
 * Sequelize las devuelve como "HH:MM:SS". distribucionService.convertirHoraAMinutos
 * exige exactamente "HH:MM" (2 partes) — normalizamos aquí para no tocar
 * el motor heurístico existente.
 */
function normalizarYConvertir(hora) {
  if (!hora) return 0;
  const limpio = typeof hora === 'string' ? hora.slice(0, 5) : hora;
  return distribucionService.convertirHoraAMinutos(limpio);
}

/**
 * @param {{ excluirClaseId?: number|null, periodoId?: number|null|undefined }} opciones
 *   excluirClaseId: no considera la ocupación de esta clase (para no chocar
 *     consigo misma al recalcular su propia sugerencia).
 *   periodoId: acota la ocupación a un período. `undefined` = sin filtro
 *     (comportamiento transversal, solo para consultas deliberadamente
 *     globales); `null` = clases sin período asignado. Sin este filtro, un
 *     aula ocupada en 2025-1 se consideraba ocupada también en 2026-1 y el
 *     motor heurístico se negaba a sugerirla para siempre.
 * @returns {Object} mapa { [codigoAula]: [{dia, inicio, fin}, ...] } — mismo
 *   shape que espera distribucionService.buscarAulaOptima/aulaDisponibleEnHorario.
 */
async function construirOcupacionActual({ excluirClaseId = null, periodoId = undefined } = {}) {
  const ocupacion = {};
  const filtroPeriodoClase = periodoId !== undefined ? { periodo_id: periodoId } : {};

  const clasesLegado = await Clase.findAll({
    where: {
      aula_asignada: { [Op.not]: null },
      ...filtroPeriodoClase,
      ...(excluirClaseId ? { id: { [Op.ne]: excluirClaseId } } : {}),
    },
  });
  for (const c of clasesLegado) {
    if (!c.dia || !c.hora_inicio || !c.hora_fin) continue;
    if (!ocupacion[c.aula_asignada]) ocupacion[c.aula_asignada] = [];
    ocupacion[c.aula_asignada].push({
      dia: c.dia,
      inicio: distribucionService.convertirHoraAMinutos(c.hora_inicio),
      fin: distribucionService.convertirHoraAMinutos(c.hora_fin),
    });
  }

  // CONFIRMADO y EN_REVISION cuentan igual como ocupación. La regla 3.2
  // dice que EN_REVISION está "reservado temporalmente por una carrera;
  // nadie más puede tomarlo" — antes esta consulta solo miraba CONFIRMADO,
  // así que el motor heurístico podía sugerir (y fill-gaps asignar) un
  // espacio que un director tenía reservado mientras editaba. Eso hacía
  // que EN_REVISION no protegiera nada frente al motor.
  const bloquesOcupados = await BloqueDisponibilidad.findAll({
    where: {
      estado: { [Op.in]: ['CONFIRMADO', 'EN_REVISION'] },
      ...(excluirClaseId ? { clase_id: { [Op.ne]: excluirClaseId } } : {}),
    },
    include: [
      { model: Aula, as: 'aula' },
      // bloques_disponibilidad no tiene período propio: lo hereda de Clase.
      ...(periodoId !== undefined
        ? [{ model: Clase, as: 'clase', required: true, attributes: [], where: { periodo_id: periodoId } }]
        : []),
    ],
  });
  for (const b of bloquesOcupados) {
    if (!b.aula || !b.dia || !b.hora_inicio || !b.hora_fin) continue;
    if (!ocupacion[b.aula.codigo]) ocupacion[b.aula.codigo] = [];
    ocupacion[b.aula.codigo].push({
      dia: b.dia,
      inicio: normalizarYConvertir(b.hora_inicio),
      fin: normalizarYConvertir(b.hora_fin),
    });
  }

  return ocupacion;
}

/** Agrega un bloque recién asignado en memoria (no persiste), para que la
 * siguiente clase de la misma corrida de cálculo no choque con la anterior. */
function registrarOcupacionEnMemoria(ocupacion, { aulaCodigo, dia, horaInicio, horaFin }) {
  if (!aulaCodigo || !dia || !horaInicio || !horaFin) return;
  if (!ocupacion[aulaCodigo]) ocupacion[aulaCodigo] = [];
  ocupacion[aulaCodigo].push({
    dia,
    inicio: normalizarYConvertir(horaInicio),
    fin: normalizarYConvertir(horaFin),
  });
}

module.exports = { construirOcupacionActual, registrarOcupacionEnMemoria, normalizarYConvertir };
