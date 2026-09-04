// ============================================================
// Vista de LECTURA unificada de clases para dashboards del admin (Fase 7).
// Enriquece filas crudas de `clases` (legado) con lo que ya esté
// CONFIRMADO o EN_REVISION en el módulo colaborativo
// (bloques_disponibilidad) — solo lectura, nunca escribe nada, nunca
// toca Clase.aula_asignada (eso sigue intacto por diseño, para no romper
// el legado). Es la fuente de verdad de LECTURA para UI; cada sistema
// sigue siendo dueño de su propia escritura (Clase para legado,
// BloqueDisponibilidad para colaborativo — ver planificacionCarrera.service.js).
// ============================================================

const { Aula, BloqueDisponibilidad } = require('../models');

/**
 * @param {Array} clasesLegado - filas crudas (con al menos {id, aula_asignada,
 *   dia, hora_inicio, hora_fin}; aula_nombre/aula_capacidad opcionales).
 * @returns {Promise<Array>} mismas filas, agregando:
 *   - fuente: 'legado' | 'colaborativo_confirmado' | 'colaborativo_en_revision'
 *   - bloque_estado: estado crudo del bloque si existe, si no null.
 *   Cuando fuente es 'colaborativo_confirmado', aula_asignada/aula_nombre/
 *   aula_capacidad/dia/hora_inicio/hora_fin quedan SOBRESCRITOS por lo que
 *   el director confirmó — es más reciente y más cierto que el legado.
 *   'colaborativo_en_revision' NO sobrescribe nada (nada quedó confirmado
 *   todavía, mismo criterio que ya usa calcularDistribucionFillGaps: un
 *   director editando no es un compromiso institucional).
 */
async function enriquecerConModuloColaborativo(clasesLegado) {
  if (!clasesLegado || clasesLegado.length === 0) return clasesLegado || [];

  const claseIds = clasesLegado.map((c) => c.id);
  const bloques = await BloqueDisponibilidad.findAll({
    where: { clase_id: claseIds },
    include: [{ model: Aula, as: 'aula', attributes: ['codigo', 'nombre', 'capacidad'] }],
  });
  const bloquePorClase = new Map(bloques.map((b) => [b.clase_id, b]));

  return clasesLegado.map((clase) => {
    const bloque = bloquePorClase.get(clase.id);

    if (!bloque || bloque.estado === 'LIBRE') {
      return { ...clase, fuente: 'legado', bloque_estado: null };
    }

    if (bloque.estado === 'CONFIRMADO') {
      return {
        ...clase,
        aula_asignada: bloque.aula ? bloque.aula.codigo : clase.aula_asignada,
        aula_nombre: bloque.aula ? bloque.aula.nombre : clase.aula_nombre,
        aula_capacidad: bloque.aula ? bloque.aula.capacidad : clase.aula_capacidad,
        dia: bloque.dia || clase.dia,
        hora_inicio: bloque.hora_inicio ? bloque.hora_inicio.slice(0, 5) : clase.hora_inicio,
        hora_fin: bloque.hora_fin ? bloque.hora_fin.slice(0, 5) : clase.hora_fin,
        fuente: 'colaborativo_confirmado',
        bloque_estado: 'CONFIRMADO',
      };
    }

    // EN_REVISION: el director está editando/enviando, todavía no es
    // definitivo. No sobrescribe nada del legado, pero marca la clase
    // como "en proceso" para que el admin no la lea silenciosamente como
    // resuelta (si el legado ya tenía aula) ni como silenciosamente
    // pendiente (si nunca tuvo).
    return { ...clase, fuente: 'colaborativo_en_revision', bloque_estado: 'EN_REVISION' };
  });
}

module.exports = { enriquecerConModuloColaborativo };
