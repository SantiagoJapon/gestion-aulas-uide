const { DirectorCarrera, Carrera, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Resuelve las carreras asignadas a un usuario director.
 *
 * Fuente de verdad: tabla puente `director_carreras` (relación N-a-M).
 * Fallback legado: si el director no tiene filas en director_carreras
 * (dato no migrado o inconsistencia puntual), se usa el campo
 * `usuarios.carrera_director` como única carrera.
 *
 * @param {number} usuarioId
 * @param {string|null} carreraDirectorLegado - valor de usuario.carrera_director
 * @returns {Promise<{ ids: number[], nombres: string[] }>}
 */
async function resolverCarrerasDeDirector(usuarioId, carreraDirectorLegado = null) {
  const asignaciones = await DirectorCarrera.findAll({
    where: { usuario_id: usuarioId },
    attributes: ['carrera_id'],
    raw: true
  });

  let ids = asignaciones.map((a) => a.carrera_id);

  if (ids.length === 0 && carreraDirectorLegado) {
    const legado = await Carrera.findOne({
      where: { carrera: carreraDirectorLegado },
      attributes: ['id'],
      raw: true
    });
    if (legado) ids = [legado.id];
  }

  if (ids.length === 0) {
    return { ids: [], nombres: [] };
  }

  const carreras = await Carrera.findAll({
    where: { id: ids },
    attributes: ['id', 'carrera'],
    raw: true
  });

  return {
    ids: carreras.map((c) => c.id),
    nombres: carreras.map((c) => c.carrera)
  };
}

/**
 * Devuelve los usuarios con rol 'director' asignados a una carrera dada
 * (por id o por nombre). Usa la tabla puente director_carreras y, como
 * respaldo, el campo legado carrera_director para no perder directores
 * cuyos datos aún no fueron migrados.
 *
 * @param {{ carreraId?: number, carreraNombre?: string }} params
 * @returns {Promise<import('../models').User[]>}
 */
async function obtenerDirectoresDeCarrera({ carreraId = null, carreraNombre = null }) {
  let id = carreraId;

  if (!id && carreraNombre) {
    const carrera = await Carrera.findOne({
      where: { carrera: carreraNombre },
      attributes: ['id'],
      raw: true
    });
    id = carrera ? carrera.id : null;
  }

  const idsDesdeTabla = id
    ? (await DirectorCarrera.findAll({
        where: { carrera_id: id },
        attributes: ['usuario_id'],
        raw: true
      })).map((a) => a.usuario_id)
    : [];

  const condiciones = [];
  if (idsDesdeTabla.length > 0) condiciones.push({ id: { [Op.in]: idsDesdeTabla } });
  if (carreraNombre) condiciones.push({ carrera_director: carreraNombre });

  if (condiciones.length === 0) return [];

  return User.findAll({ where: { rol: 'director', [Op.or]: condiciones } });
}

/**
 * Refresca el campo legado `usuarios.carrera_director` (usado como fallback
 * de compatibilidad en el resto del sistema) al nombre de la primera carrera
 * vigente del director según director_carreras, o null si ya no tiene ninguna.
 *
 * Debe llamarse después de cualquier operación que agregue, quite o invalide
 * filas de director_carreras para un director (asignar/desasignar carrera,
 * desactivar o eliminar una carrera, etc.) para que el campo legado nunca
 * quede apuntando a una carrera que el director ya no tiene.
 *
 * @param {import('../models').User} usuario
 */
async function sincronizarCarreraLegado(usuario) {
  const filas = await DirectorCarrera.findAll({ where: { usuario_id: usuario.id }, raw: true });
  let nombreFinal = null;
  if (filas.length > 0) {
    const carreras = await Carrera.findAll({ where: { id: filas.map((f) => f.carrera_id) }, raw: true });
    nombreFinal = carreras[0]?.carrera || null;
  }
  await usuario.update({ carrera_director: nombreFinal });
}

module.exports = { resolverCarrerasDeDirector, obtenerDirectoresDeCarrera, sincronizarCarreraLegado };
