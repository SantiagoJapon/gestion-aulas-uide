const User = require('../models/User');
const { generarToken } = require('../utils/jwt');
const { fixEncoding } = require('../utils/encoding');

/**
 * @desc    Registrar nuevo usuario
 * @route   POST /api/auth/register
 * @access  Public
 */
const registrarUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, cedula, telefono } = req.body;

    // Validar que el email sea institucional (@uide.edu.ec)
    if (email && !email.toLowerCase().endsWith('@uide.edu.ec')) {
      return res.status(400).json({
        error: 'Debe usar el correo institucional (@uide.edu.ec). No se permiten otros correos como Gmail.'
      });
    }

    // Verificar si el usuario ya existe
    const usuarioExistente = await User.findOne({ where: { email } });

    if (usuarioExistente) {
      return res.status(400).json({
        error: 'El email ya está registrado'
      });
    }

    // Verificar si la cédula ya existe (si se proporciona)
    if (cedula) {
      const cedulaExistente = await User.findOne({ where: { cedula } });
      if (cedulaExistente) {
        return res.status(400).json({
          error: 'La cédula ya está registrada'
        });
      }
    }

    // Crear el usuario
    const usuario = await User.create({
      nombre,
      apellido,
      email,
      password,
      rol: rol || 'estudiante',
      cedula,
      telefono,
      estado: 'activo'
    });

    // Generar token
    const token = generarToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol
    });

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        cedula: usuario.cedula,
        telefono: usuario.telefono,
        carrera_director: fixEncoding(usuario.carrera_director),
        estado: usuario.estado
      },
      token
    });
  } catch (error) {
    console.error('Error en registrarUsuario:', error);

    // Manejar errores de validación de Sequelize
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Errores de validación',
        detalles: error.errors.map(err => ({
          campo: err.path,
          mensaje: err.message
        }))
      });
    }

    // Manejar errores de unicidad
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'El email o cédula ya están registrados'
      });
    }

    res.status(500).json({
      error: 'Error al registrar el usuario'
    });
  }
};

/**
 * @desc    Login de usuario
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[DEBUG LOGIN] Email:', email);

    // Buscar usuario por email (incluir password para verificación)
    const usuario = await User.findOne({
      where: { email },
      attributes: { include: ['password'] }
    });

    if (!usuario) {
      console.log('[DEBUG LOGIN] Usuario NO encontrado');
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }
    console.log('[DEBUG LOGIN] Usuario encontrado:', usuario.email, 'Rol:', usuario.rol);

    // Verificar estado del usuario
    if (usuario.estado !== 'activo') {
      console.log('[DEBUG LOGIN] Usuario NO activo:', usuario.estado);
      return res.status(401).json({
        error: 'Usuario inactivo. Contacte al administrador'
      });
    }
    console.log('[DEBUG LOGIN] Estado: activo');

    // Verificar contraseña
    console.log('[DEBUG LOGIN] Verificando password...');
    const passwordValido = await usuario.verificarPassword(password);
    console.log('[DEBUG LOGIN] Password válido?:', passwordValido);

    if (!passwordValido) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Generar token
    const token = generarToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol
    });

    res.json({
      mensaje: 'Login exitoso',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        cedula: usuario.cedula,
        telefono: usuario.telefono,
        carrera_director: usuario.carrera_director,
        estado: usuario.estado
      },
      token
    });
  } catch (error) {
    console.error('Error en loginUsuario:', error);
    res.status(500).json({
      error: 'Error al iniciar sesión'
    });
  }
};

/**
 * @desc    Obtener perfil del usuario autenticado
 * @route   GET /api/auth/perfil
 * @access  Private
 */
const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await User.findByPk(req.usuarioId);

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        cedula: usuario.cedula,
        telefono: usuario.telefono,
        estado: usuario.estado,
        carrera_director: usuario.carrera_director,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt
      }
    });
  } catch (error) {
    console.error('Error en obtenerPerfil:', error);
    res.status(500).json({
      error: 'Error al obtener el perfil'
    });
  }
};

/**
 * @desc    Actualizar perfil del usuario autenticado
 * @route   PUT /api/auth/perfil
 * @access  Private
 */
const actualizarPerfil = async (req, res) => {
  try {
    const { nombre, apellido, telefono, cedula } = req.body;

    const usuario = await User.findByPk(req.usuarioId);

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar si la cédula ya existe (si se está actualizando)
    if (cedula && cedula !== usuario.cedula) {
      const cedulaExistente = await User.findOne({
        where: { cedula }
      });

      if (cedulaExistente) {
        return res.status(400).json({
          error: 'La cédula ya está registrada'
        });
      }
    }

    // Actualizar campos
    if (nombre) usuario.nombre = nombre;
    if (apellido) usuario.apellido = apellido;
    if (telefono) usuario.telefono = telefono;
    if (cedula) usuario.cedula = cedula;

    await usuario.save();

    res.json({
      mensaje: 'Perfil actualizado exitosamente',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        cedula: usuario.cedula,
        telefono: usuario.telefono,
        carrera_director: fixEncoding(usuario.carrera_director),
        estado: usuario.estado
      }
    });
  } catch (error) {
    console.error('Error en actualizarPerfil:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Errores de validación',
        detalles: error.errors.map(err => ({
          campo: err.path,
          mensaje: err.message
        }))
      });
    }

    res.status(500).json({
      error: 'Error al actualizar el perfil'
    });
  }
};

/**
 * @desc    Cambiar contraseña del usuario autenticado
 * @route   PUT /api/auth/cambiar-password
 * @access  Private
 */
const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    const usuario = await User.findByPk(req.usuarioId, {
      attributes: { include: ['password'] }
    });

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const passwordValido = await usuario.verificarPassword(passwordActual);

    if (!passwordValido) {
      return res.status(401).json({
        error: 'La contraseña actual es incorrecta'
      });
    }

    // Actualizar contraseña
    usuario.password = passwordNuevo;
    await usuario.save();

    res.json({
      mensaje: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error en cambiarPassword:', error);
    res.status(500).json({
      error: 'Error al cambiar la contraseña'
    });
  }
};

module.exports = {
  registrarUsuario,
  loginUsuario,
  obtenerPerfil,
  actualizarPerfil,
  cambiarPassword
};
