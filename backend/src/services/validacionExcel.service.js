// ============================================================
// Validación de un Excel de planificación ANTES de guardarlo (Fase 6).
// 100% puro / solo lectura: nunca escribe en la base de datos, nunca crea
// docentes ni usuarios, nunca dispara la distribución automática — eso
// sigue siendo responsabilidad exclusiva de
// planificacionController.js#subirPlanificacion, que esta fase no toca.
//
// Reutiliza el motor existente sin modificarlo:
//   - distribucionService.buscarAulaOptima → sugerencia de alternativa
//   - distribucionService.aulaDisponibleEnHorario / convertirHoraAMinutos
//   - utils/ocupacionAulas#construirOcupacionActual → ocupación unificada
//     (legado Clase.aula_asignada + BloqueDisponibilidad CONFIRMADO), la
//     misma fuente que ya usa calcularDistribucionFillGaps.
// ============================================================

const distribucionService = require('./distribucion.service');

const TIPOS = Object.freeze({
  SOBRECUPO: 'SOBRECUPO',
  CHOQUE_INTERNO: 'CHOQUE_INTERNO',
  CHOQUE_CONFIRMADO: 'CHOQUE_CONFIRMADO',
  MATERIA_DUPLICADA: 'MATERIA_DUPLICADA',
});

/**
 * Sugerencia de alternativa para una fila con conflicto. Independiente y
 * sin estado entre filas — mismo comportamiento que ya tiene
 * planificacionCarrera.service.js#sugerirAula (no encadena sugerencias
 * entre llamadas), así que dos filas distintas pueden recibir la misma
 * alternativa si ambas la necesitan; el director resuelve al editar.
 */
function sugerirAlternativa(fila, aulasDisponibles, ocupacionExistente) {
  const claseParaMotor = {
    materia: fila.materia,
    carrera: fila.carrera || null,
    num_estudiantes: fila.num_estudiantes || 0,
    dia: fila.dia,
    hora_inicio: fila.hora_inicio,
    hora_fin: fila.hora_fin,
  };
  const resultado =
    distribucionService.buscarAulaOptima(claseParaMotor, aulasDisponibles, ocupacionExistente, true) ||
    distribucionService.buscarAulaOptima(claseParaMotor, aulasDisponibles, ocupacionExistente, false);
  if (!resultado) return null;
  return {
    aulaId: resultado.aula.id,
    aulaCodigo: resultado.aula.codigo,
    isOvercapacity: !!resultado.isOvercapacity,
  };
}

/**
 * @param {Array} filas - clases parseadas del Excel, ya con aulaCodigo/
 *   aulaCapacidad resueltos (o null si no se encontró aula). Shape:
 *   { fila, materia, ciclo, paralelo, dia, hora_inicio, hora_fin,
 *     num_estudiantes, carrera, aulaCodigo, aulaCapacidad }
 * @param {Object} ocupacionExistente - mapa {aulaCodigo: [{dia,inicio,fin}]}
 *   de construirOcupacionActual() — SOLO lo que ya está confirmado en el
 *   sistema (legado + colaborativo). No incluye nada de este Excel.
 * @param {Array} aulasDisponibles - instancias Aula, para sugerir alternativa.
 * @returns {{ok: Array, conflictos: Array, estadisticas: Object}}
 */
function validarClasesExcel(filas, ocupacionExistente, aulasDisponibles) {
  const conflictos = [];
  const filasConProblema = new Set();

  // 1) Materia duplicada dentro del mismo Excel (misma materia+ciclo+paralelo).
  const porClave = new Map();
  for (const f of filas) {
    const clave = `${(f.materia || '').trim().toLowerCase()}|${f.ciclo || ''}|${f.paralelo || ''}`;
    if (!porClave.has(clave)) porClave.set(clave, []);
    porClave.get(clave).push(f);
  }
  for (const grupo of porClave.values()) {
    if (grupo.length > 1) {
      conflictos.push({
        tipo: TIPOS.MATERIA_DUPLICADA,
        filas: grupo.map((f) => f.fila),
        materia: grupo[0].materia,
        mensaje: `"${grupo[0].materia}" (ciclo ${grupo[0].ciclo || '—'}, paralelo ${grupo[0].paralelo || '—'}) aparece ${grupo.length} veces en el Excel.`,
      });
      grupo.forEach((f) => filasConProblema.add(f.fila));
    }
  }

  // 2) Choque interno: pares de filas del mismo Excel en la misma aula+día
  // con horas solapadas. Agrupado por aula+día para no ser O(n²) sobre todo
  // el archivo — mismo criterio de self-join que ya usa
  // planificacionController.js#detectarConflictos (c1.id < c2.id), acá con
  // índice de array en vez de id de fila para no reportar el mismo par 2 veces.
  const porAulaDia = new Map();
  for (const f of filas) {
    if (!f.aulaCodigo || !f.dia || !f.hora_inicio || !f.hora_fin) continue;
    const key = `${f.aulaCodigo}|${f.dia}`;
    if (!porAulaDia.has(key)) porAulaDia.set(key, []);
    porAulaDia.get(key).push(f);
  }
  for (const grupo of porAulaDia.values()) {
    for (let i = 0; i < grupo.length; i++) {
      for (let j = i + 1; j < grupo.length; j++) {
        const a = grupo[i];
        const b = grupo[j];
        const inicioA = distribucionService.convertirHoraAMinutos(a.hora_inicio);
        const finA = distribucionService.convertirHoraAMinutos(a.hora_fin);
        const inicioB = distribucionService.convertirHoraAMinutos(b.hora_inicio);
        const finB = distribucionService.convertirHoraAMinutos(b.hora_fin);
        if (inicioA < finB && finA > inicioB) {
          conflictos.push({
            tipo: TIPOS.CHOQUE_INTERNO,
            filas: [a.fila, b.fila],
            materia: `${a.materia} / ${b.materia}`,
            mensaje: `${a.aulaCodigo}, ${a.dia}: las filas ${a.fila} y ${b.fila} se solapan en horario.`,
          });
          filasConProblema.add(a.fila);
          filasConProblema.add(b.fila);
        }
      }
    }
  }

  // 3) Por fila: sobrecupo y choque contra lo ya CONFIRMADO en el sistema
  // (legado + colaborativo — construirOcupacionActual no distingue de
  // dónde viene, solo que ya está confirmado y es intocable).
  for (const f of filas) {
    if (f.aulaCapacidad != null && f.num_estudiantes > f.aulaCapacidad) {
      conflictos.push({
        tipo: TIPOS.SOBRECUPO,
        filas: [f.fila],
        materia: f.materia,
        mensaje: `${f.num_estudiantes} estudiantes no caben en ${f.aulaCodigo} (capacidad ${f.aulaCapacidad}).`,
        sugerencia: sugerirAlternativa(f, aulasDisponibles, ocupacionExistente),
      });
      filasConProblema.add(f.fila);
    }

    if (f.aulaCodigo && f.dia && f.hora_inicio && f.hora_fin) {
      const disponible = distribucionService.aulaDisponibleEnHorario(f.aulaCodigo, f, ocupacionExistente);
      if (!disponible) {
        conflictos.push({
          tipo: TIPOS.CHOQUE_CONFIRMADO,
          filas: [f.fila],
          materia: f.materia,
          mensaje: `${f.aulaCodigo} ya está confirmado por otra clase en ese horario.`,
          sugerencia: sugerirAlternativa(f, aulasDisponibles, ocupacionExistente),
        });
        filasConProblema.add(f.fila);
      }
    }
  }

  const ok = filas.filter((f) => !filasConProblema.has(f.fila));

  return {
    ok,
    conflictos,
    estadisticas: {
      totalFilas: filas.length,
      sinConflicto: ok.length,
      conConflicto: filasConProblema.size,
    },
  };
}

module.exports = { validarClasesExcel, TIPOS };
