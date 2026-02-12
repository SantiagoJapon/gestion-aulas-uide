const { verificarToken } = require('../utils/jwt');
const { User, Estudiante } = require('../models');

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
 */
const verificarAdminODocente = verificarRol('admin', 'docente');

module.exports = {
  verificarAuth,
  verificarRol,
  verificarAdmin,
  verificarAdminODocente
};
