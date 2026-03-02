/**
 * textUtils.js — Utilidades de texto compartidas entre servicios y controllers.
 * Centraliza funciones que estaban duplicadas en distribucion.service.js
 * y distribucionController.js.
 */

/**
 * Normaliza texto: quita tildes y convierte a minúsculas.
 * Útil para comparaciones de carreras, materias y docentes
 * sin sensibilidad a acentos ni mayúsculas.
 * @param {string} texto
 * @returns {string}
 */
function normalizarTexto(texto) {
    if (!texto) return '';
    return texto
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Convierte una hora en formato "HH:MM" o "HH:MM:SS"
 * a minutos totales desde medianoche.
 * @param {string} hora — p.ej. "07:30" o "14:00:00"
 * @returns {number} minutos desde medianoche, 0 si el formato es inválido
 */
function convertirHora(hora) {
    if (!hora || typeof hora !== 'string') return 0;
    const partes = hora.split(':');
    return (parseInt(partes[0]) || 0) * 60 + (parseInt(partes[1]) || 0);
}

module.exports = { normalizarTexto, convertirHora };
