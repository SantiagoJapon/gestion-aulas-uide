const { verificarToken } = require('../utils/jwt');
const { User, Estudiante } = require('../models');
const { Op } = require('sequelize');
const { resolverCarrerasDeDirector } = require('../utils/directorScope');

/**
 * Middleware para verificar el token JWT en las peticiones
 */
const verificarAuth = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No se proporcionó un token de autenticación'
      });
    }

    // Extraer el token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Token no válido'
      });
    }

    // Verificar el token
    const decoded = verificarToken(token);

    // Si es estudiante, buscar en tabla estudiantes
    if (decoded.rol === 'estudiante') {
      const estudiante = await Estudiante.findByPk(decoded.id);
      if (!estudiante) {
        return res.status(401).json({ error: 'Estudiante no encontrado' });
      }
      req.usuario = {
        id: estudiante.id,
        nombre: estudiante.nombre,
        apellido: '',
        email: estudiante.email,
        rol: 'estudiante',
        cedula: estudiante.cedula,
        estado: 'activo',
        escuela: estudiante.escuela,
        nivel: estudiante.nivel
      };
      req.usuarioId = estudiante.id;
      req.usuarioRol = 'estudiante';
      return next();
    }

    // Buscar el usuario en la base de datos
    const usuario = await User.findByPk(decoded.id);

    if (!usuario) {
      return res.status(401).json({
        error: 'Usuario no encontrado'
      });
    }

    if (usuario.estado !== 'activo') {
      return res.status(401).json({
        error: 'Usuario inactivo'
      });
    }

    // Agregar el usuario al objeto request
    req.usuario = usuario;
    req.usuarioId = usuario.id;
    req.usuarioRol = usuario.rol;

    // Si es director, resolver TODAS sus carreras asignadas (soporta multi-carrera).
    // Se adjuntan como propiedades en memoria (no se persisten ni se serializan
    // en toJSON) para que cualquier controlador pueda usarlas sin repetir la consulta.
    if (usuario.rol === 'director') {
      const { ids, nombres } = await resolverCarrerasDeDirector(usuario.id, usuario.carrera_director);
      usuario.carreraIds = ids;
      usuario.carreraNombres = nombres;
    }

    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);

    if (error.message === 'Token expirado') {
      return res.status(401).json({
        error: 'Token expirado, por favor inicia sesión nuevamente'
      });
    }

    if (error.message === 'Token inválido') {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }

    return res.status(500).json({
      error: 'Error al verificar la autenticación'
    });
  }
};

/**
 * Middleware para verificar que el usuario tenga uno de los roles permitidos
 * @param  {...string} rolesPermitidos - Roles que tienen acceso
 */
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        error: 'Usuario no autenticado'
      });
    }

    const rol = req.usuarioRol || (req.usuario ? req.usuario.rol : null);

    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({
        error: `[ERROR_403_LOG] No tienes permisos para acceder a este recurso (Rol: ${rol})`,
        rolRequerido: rolesPermitidos,
        rolActual: rol
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario sea admin
 */
const verificarAdmin = verificarRol('admin');

/**
 * Middleware para verificar que el usuario sea admin o docente
 * 'profesor' es alias de 'docente' — ambos tienen los mismos permisos.
 */
const verificarAdminODocente = verificarRol('admin', 'docente', 'profesor');

/**
 * Helper: Resuelve el filtro de carrera para directores.
 * Retorna {} si es admin (ve todo, sin restricción).
 * Si es director, retorna:
 *   - carrera_id: cláusula Sequelize { [Op.in]: ids } lista para usar en un `where` ORM
 *   - carreraIds: array plano de IDs, para usar en SQL crudo con `IN (:carreraIds)`
 * Soporta directores asignados a múltiples carreras.
 * Lanza error si el director no tiene ninguna carrera asignada.
 */
const getDirectorCarreraFilter = async (req) => {
  const usuario = req.usuario;
  if (usuario.rol === 'admin') return {};

  if (usuario.rol === 'director') {
    const ids = usuario.carreraIds || [];
    if (ids.length === 0) {
      throw new Error('Director sin carrera asignada');
    }
    return { carrera_id: { [Op.in]: ids }, carreraIds: ids };
  }

  throw new Error(`Rol "${usuario.rol}" no tiene acceso a este recurso`);
};

module.exports = {
  verificarAuth,
  verificarRol,
  verificarAdmin,
  verificarAdminODocente,
  getDirectorCarreraFilter
};
