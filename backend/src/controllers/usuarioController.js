const { User, Carrera, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const N8nService = require('../services/n8n.service');

/**
 * Función centralizada para loggeo de errores 500
 */
const handle500 = (res, error, context) => {
  console.error(`❌ [500] Error en ${context}:`, error);
  res.status(500).json({
    success: false,
    error: `Error en ${context}`,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

const normalizeCarreraKey = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Función para corregir encoding UTF-8 mal codificado
const fixEncoding = (value) => {
  if (!value) return value;
  return value
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã"/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã'/g, 'Ñ')
    .replace(/Â/g, '')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã/g, 'Ü')
    .replace(/Â¿/g, '¿')
    .replace(/Â¡/g, '¡');
};

const getUsuarios = async (req, res) => {
  try {
    const { rol, carrera_id } = req.query;
    const where = {};
    if (rol) where.rol = rol;

    // Si el usuario es director, forzar filtro por su carrera
    if (req.usuario.rol === 'director') {
      where.carrera_director = req.usuario.carrera_director;
    } else if (carrera_id) {
      // Si es admin y pasa carrera_id, filtrar por esa carrera
      const { Carrera: CarreraModel } = require('../models');
      const carreraObj = await CarreraModel.findByPk(carrera_id);
      if (carreraObj) {
        where.carrera_director = carreraObj.carrera;
      } else {
        where.carrera_director = '__NON_EXISTENT__';
      }
    }

    // Si estamos buscando directores, incluir información de la carrera
    const include = rol === 'director' ? [
      {
        model: Carrera,
        as: 'carrera',
        attributes: ['id', 'carrera', 'carrera_normalizada'],
        required: false
      }
    ] : [];

    const usuarios = await User.findAll({
      where,
      include,
      order: [['apellido', 'ASC'], ['nombre', 'ASC']]
    });

    res.json({
      success: true,
      total: usuarios.length,
      usuarios: usuarios.map((u) => {
        const json = u.toJSON();
        // Si tiene carrera asociada, incluir el nombre
        if (json.carrera) {
          json.carrera_nombre = json.carrera.carrera;
          delete json.carrera; // Remover el objeto anidado
        }
        return json;
      })
    });
  } catch (error) {
    handle500(res, error, 'getUsuarios');
  }
};

const updateDirectorCarrera = async (req, res) => {
  try {
    const { id } = req.params;
    const { carrera } = req.body;

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    if (usuario.rol !== 'director') {
      return res.status(400).json({
        success: false,
        error: 'El usuario no es director'
      });
    }

    if (!carrera || !carrera.trim()) {
      await usuario.update({ carrera_director: null });
      return res.json({
        success: true,
        message: 'Carrera desasignada',
        usuario: usuario.toJSON()
      });
    }

    // Buscar en uploads_carreras - primero búsqueda exacta, luego parcial
    let carreraResult = await sequelize.query(
      `SELECT id, carrera FROM uploads_carreras
       WHERE carrera = $1 AND activa = true
       LIMIT 1`,
      { bind: [carrera], type: QueryTypes.SELECT }
    );

    // Si no encuentra, intentar búsqueda por ID
    if (!carreraResult.length && !isNaN(carrera)) {
      carreraResult = await sequelize.query(
        `SELECT id, carrera FROM uploads_carreras
         WHERE id = $1 AND activa = true
         LIMIT 1`,
        { bind: [parseInt(carrera)], type: QueryTypes.SELECT }
      );
    }

    // Si tampoco, búsqueda parcial normalizada
    if (!carreraResult.length) {
      const carreraNormalizada = normalizeCarreraKey(carrera);
      carreraResult = await sequelize.query(
        `SELECT id, carrera FROM uploads_carreras
         WHERE (LOWER(carrera) LIKE $1 OR carrera_normalizada LIKE $1)
         AND activa = true
         LIMIT 1`,
        { bind: [`%${carreraNormalizada}%`], type: QueryTypes.SELECT }
      );
    }

    if (!carreraResult.length) {
      return res.status(400).json({
        success: false,
        error: 'La carrera no está activa o no existe',
        debug: { carrera_buscada: carrera }
      });
    }

    await usuario.update({ carrera_director: carreraResult[0].carrera });

    // Notificar al director si tiene telefono
    if (usuario.telefono) {
      N8nService.notificarDirector({
        nombre: `${usuario.nombre} ${usuario.apellido}`,
        telefono: usuario.telefono,
        password: '(usa tu contraseña actual)',
        carrera: carreraResult[0].carrera
      });
    }

    res.json({
      success: true,
      message: 'Carrera asignada',
      usuario: usuario.toJSON()
    });
  } catch (error) {
    handle500(res, error, 'updateDirectorCarrera');
  }
};

const createUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, carrera_director, cedula, telefono } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Restricciones para Directores
    let finalRol = rol || 'docente';
    let finalCarrera = carrera_director;

    if (req.usuario.rol === 'director') {
      if (finalRol === 'admin') finalRol = 'docente';
      finalCarrera = req.usuario.carrera_director;
    }

    // Para directores: usar contraseña temporal estándar
    const passwordFinal = (finalRol === 'director') ? 'uide2026' : (password || 'uide2026');

    // Crear el usuario (el password se hashea en el hook beforeCreate)
    const newUsuario = await User.create({
      nombre,
      apellido,
      email,
      password: passwordFinal,
      rol: finalRol,
      carrera_director: finalCarrera,
      cedula: cedula || null,
      telefono: telefono || null,
      estado: 'activo',
      requiere_cambio_password: true
    });

    // Notificar al usuario si tiene telefono
    let whatsapp_enviado = false;
    if (newUsuario.telefono && (finalRol === 'director' || finalRol === 'docente')) {
      try {
        const whatsappService = require('../services/whatsappService');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const msg = `🎓 *UIDE - Sistema de Gestión de Aulas*\n\nHola *${nombre} ${apellido}*, bienvenido al sistema institucional.\n\n📧 *Correo:* ${email}\n🔑 *Contraseña temporal:* ${passwordFinal}\n\n🌐 *Ingresa aquí:* ${frontendUrl}\n\n_Al ingresar por primera vez, el sistema te pedirá establecer tu contraseña personal._`;
        whatsapp_enviado = await whatsappService.sendMessage(newUsuario.telefono, msg);
      } catch (wErr) {
        console.warn('⚠️ WhatsApp no disponible al crear usuario:', wErr.message);
      }
    }

    // Respuesta con credenciales para directores
    const responseData = {
      success: true,
      mensaje: 'Usuario creado exitosamente',
      usuario: newUsuario.toJSON()
    };

    if (finalRol === 'director') {
      responseData.credenciales = {
        email: newUsuario.email,
        password: passwordFinal,
        whatsapp_enviado
      };
    }

    res.status(201).json(responseData);
  } catch (error) {
    handle500(res, error, 'createUsuario');
  }
};


const generarCredencialesUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const whatsappService = require('../services/whatsappService');

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    // Solo admin puede hacer esto para directores
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, error: 'Solo el administrador puede generar credenciales para directores' });
    }

    // Resetear contraseña temporal (en texto plano — el hook beforeUpdate la hasheará)
    usuario.password = 'uide2026';
    usuario.requiere_cambio_password = true;
    await usuario.save();

    let whatsapp_enviado = false;
    if (usuario.telefono) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const msg = `🎓 *UIDE - Sistema de Gestión de Aulas*\n\nHola *${usuario.nombre} ${usuario.apellido}*, tus credenciales de acceso han sido generadas.\n\n📧 *Correo:* ${usuario.email}\n🔑 *Contraseña temporal:* uide2026\n\n🌐 *Ingresa aquí:* ${frontendUrl}\n\n_Al ingresar por primera vez, el sistema te pedirá cambiar tu contraseña._`;
      whatsapp_enviado = await whatsappService.sendMessage(usuario.telefono, msg);
    }

    res.json({
      success: true,
      credenciales: { email: usuario.email, password: 'uide2026', whatsapp_enviado },
      mensaje: 'Credenciales generadas exitosamente'
    });
  } catch (error) {
    handle500(res, error, 'generarCredencialesUsuario');
  }
};

const resetPasswordUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const bcrypt = require('bcryptjs');

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    // Directores solo pueden resetear docentes de su carrera
    if (req.usuario.rol === 'director' && usuario.carrera_director !== req.usuario.carrera_director) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para este usuario' });
    }

    // Nueva contraseña: cédula del usuario o 'uide123'
    const newPassword = usuario.cedula || 'uide123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await usuario.update({ password: hashedPassword }, { hooks: false });

    res.json({
      success: true,
      mensaje: `Contraseña reseteada a ${usuario.cedula ? 'número de cédula' : 'uide123'}`
    });
  } catch (error) {
    handle500(res, error, 'resetPasswordUsuario');
  }
};

const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, rol, estado, cedula, telefono, carrera_director } = req.body;

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    if (req.usuario.rol === 'director' && usuario.carrera_director !== req.usuario.carrera_director) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para editar este usuario'
      });
    }

    let updatedFields = { nombre, apellido, email, rol, estado, cedula, telefono, carrera_director };

    if (req.usuario.rol === 'director') {
      if (rol === 'admin') delete updatedFields.rol;
      updatedFields.carrera_director = req.usuario.carrera_director;
    }

    await usuario.update(updatedFields);

    res.json({
      success: true,
      mensaje: 'Usuario actualizado exitosamente',
      usuario: usuario.toJSON()
    });
  } catch (error) {
    handle500(res, error, 'updateUsuario');
  }
};

const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Seguridad para directores
    if (req.usuario.rol === 'director' && usuario.carrera_director !== req.usuario.carrera_director) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para eliminar este usuario'
      });
    }

    await usuario.destroy();

    res.json({
      success: true,
      mensaje: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    handle500(res, error, 'deleteUsuario');
  }
};

module.exports = {
  getUsuarios,
  updateDirectorCarrera,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  resetPasswordUsuario,
  generarCredencialesUsuario
};
