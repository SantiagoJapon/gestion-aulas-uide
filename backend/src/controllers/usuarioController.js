const { User, Carrera, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

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
    const { rol } = req.query;
    const where = {};
    if (rol) where.rol = rol;

    // Si estamos buscando directores, incluir información de la carrera
    const include = rol === 'director' ? [
      {
        model: Carrera,
        as: 'Carrera',
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
        if (json.Carrera) {
          json.carrera_nombre = json.Carrera.carrera;
          delete json.Carrera; // Remover el objeto anidado
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
    const { nombre, apellido, email, password, rol, carrera_director } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Crear el usuario (el password se hashea en el hook beforeCreate)
    const newUsuario = await User.create({
      nombre,
      apellido,
      email,
      password,
      rol: rol || 'director',
      carrera_director,
      estado: 'activo'
    });

    res.status(201).json({
      success: true,
      mensaje: 'Usuario creado exitosamente',
      usuario: newUsuario.toJSON()
    });
  } catch (error) {
    handle500(res, error, 'createUsuario');
  }
};

module.exports = {
  getUsuarios,
  updateDirectorCarrera,
  createUsuario
};
