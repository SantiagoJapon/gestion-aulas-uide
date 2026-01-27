/**
 * Utilidades para corregir problemas de encoding UTF-8
 * Centralizado para evitar duplicación de código
 */

/**
 * Corrige caracteres UTF-8 mal codificados (doble encoding)
 * Ejemplos:
 *   "AdministraciÃ³n" → "Administración"
 *   "ComunicaciÃ³n" → "Comunicación"
 *   "NutriciÃ³n" → "Nutrición"
 *
 * @param {string} value - Texto con posible mal encoding
 * @returns {string} Texto corregido
 */
function fixEncoding(value) {
  if (!value || typeof value !== 'string') return value;

  const replacements = {
    'Ã³': 'ó',
    'Ã©': 'é',
    'Ã\u00AD': 'í',
    'Ãº': 'ú',
    'Ã±': 'ñ',
    'Ã': 'Á',
    'Ã‰': 'É',
    'Ã\u008D': 'Í',
    'Ãš': 'Ú',
    'Ã\u0091': 'Ñ',
    'Ã¡': 'á',
  };

  let fixed = value;
  for (const [wrong, correct] of Object.entries(replacements)) {
    // Usamos replace con regex global para reemplazar todas las ocurrencias
    try {
        fixed = fixed.split(wrong).join(correct);
    } catch (e) {
        console.error(`Error reemplazando ${wrong} por ${correct}`, e);
    }
  }

  return fixed;
}

/**
 * Normaliza el nombre de una carrera para comparaciones
 * - Elimina acentos
 * - Convierte a minúsculas
 * - Elimina espacios extras
 *
 * @param {string} carrera - Nombre de la carrera
 * @returns {string} Carrera normalizada
 */
function normalizeCarrera(carrera) {
  if (!carrera || typeof carrera !== 'string') return '';

  return carrera
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Normaliza espacios múltiples
}

/**
 * Genera una clave única para una carrera (slug)
 * Útil para búsquedas y comparaciones
 *
 * @param {string} carrera - Nombre de la carrera
 * @returns {string} Clave normalizada (ej: "administracion-de-empresas")
 */
function normalizeCarreraKey(carrera) {
  if (!carrera || typeof carrera !== 'string') return '';

  return normalizeCarrera(carrera)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

module.exports = {
  fixEncoding,
  normalizeCarrera,
  normalizeCarreraKey,
};
