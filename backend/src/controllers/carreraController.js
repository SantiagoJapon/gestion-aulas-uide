const { Carrera, sequelize } = require('../models');

// Función para limpiar y normalizar el nombre de la carrera (mantiene tildes y ñ)
const normalizeCarrera = (value) => {
  if (!value) return '';
  return value
    .trim()
    .replace(/\s+/g, ' ')
    // Corregir caracteres mal codificados comunes
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
    .replace(/Ã/g, 'Ü');
};

// Función para crear clave de comparación (sin tildes ni ñ, lowercase)
const normalizeCarreraKey = (value) => {
  if (!value) return '';
  const cleaned = normalizeCarrera(value);
  return cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const isInvalidCarrera = (value) => {
  if (!value || !value.trim()) return true;
  const cleaned = normalizeCarreraKey(value);
  return cleaned === 'undefined' || cleaned === 'null' || cleaned === 'n/a' || cleaned === '';
};

const updateCarreraCountConfig = async () => {
  try {
    const activas = await Carrera.count({ where: { activa: true } });
    await sequelize.query(
      `INSERT INTO config (clave, valor, descripcion)
       VALUES ('num_carreras_esperadas', $1, 'Número de carreras habilitadas')
       ON CONFLICT (clave)
       DO UPDATE SET valor = EXCLUDED.valor`,
      { bind: [String(activas)] }
    );
  } catch (error) {
    console.warn('No se pudo actualizar num_carreras_esperadas:', error.message);
  }
};

const getCarreras = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const canSeeInactive = req.usuarioRol === 'admin';
    const where = includeInactive && canSeeInactive ? {} : { activa: true };

    const carreras = await Carrera.findAll({
      where,
      order: [['carrera', 'ASC']]
    });

    const carrerasFiltradas = canSeeInactive
      ? carreras
      : carreras.filter((item) => !isInvalidCarrera(item.carrera));

    const activas = await Carrera.count({ where: { activa: true } });

    res.json({
      success: true,
      total: carrerasFiltradas.length,
      activas,
      carreras: carrerasFiltradas
    });
  } catch (error) {
    console.error('Error al obtener carreras:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

const createCarrera = async (req, res) => {
  try {
    const { carrera } = req.body;

    if (isInvalidCarrera(carrera)) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la carrera no es válido'
      });
    }

    const normalized = normalizeCarrera(carrera);
    const normalizedKey = normalizeCarreraKey(carrera);

    const [registro, created] = await Carrera.findOrCreate({
      where: { carrera_normalizada: normalizedKey },
      defaults: { carrera: normalized, carrera_normalizada: normalizedKey, activa: true }
    });

    if (!created && registro.activa === false) {
      await registro.update({ activa: true, carrera: normalized, carrera_normalizada: normalizedKey });
    }

    await updateCarreraCountConfig();

    res.status(201).json({
      success: true,
      message: created ? 'Carrera creada' : 'Carrera actualizada',
      carrera: registro
    });
  } catch (error) {
    console.error('Error al crear carrera:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear carrera',
      message: error.message
    });
  }
};

const updateCarrera = async (req, res) => {
  try {
    const { id } = req.params;
    const { carrera, activa } = req.body;

    const registro = await Carrera.findByPk(id);
    if (!registro) {
      return res.status(404).json({
        success: false,
        error: 'Carrera no encontrada'
      });
    }

    const updates = {};
    if (typeof carrera === 'string' && carrera.trim()) {
      if (isInvalidCarrera(carrera)) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de la carrera no es válido'
        });
      }
      updates.carrera = normalizeCarrera(carrera);
      updates.carrera_normalizada = normalizeCarreraKey(carrera);
    }
    if (typeof activa === 'boolean') {
      updates.activa = activa;
    }

    await registro.update(updates);
    await updateCarreraCountConfig();

    res.json({
      success: true,
      message: 'Carrera actualizada',
      carrera: registro
    });
  } catch (error) {
    console.error('Error al actualizar carrera:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar carrera',
      message: error.message
    });
  }
};

const deleteCarrera = async (req, res) => {
  try {
    const { id } = req.params;
    const registro = await Carrera.findByPk(id);

    if (!registro) {
      return res.status(404).json({
        success: false,
        error: 'Carrera no encontrada'
      });
    }

    await registro.update({ activa: false });
    await updateCarreraCountConfig();

    res.json({
      success: true,
      message: 'Carrera desactivada'
    });
  } catch (error) {
    console.error('Error al desactivar carrera:', error);
    res.status(500).json({
      success: false,
      error: 'Error al desactivar carrera',
      message: error.message
    });
  }
};

module.exports = {
  getCarreras,
  createCarrera,
  updateCarrera,
  deleteCarrera
};
