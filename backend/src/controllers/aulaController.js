const { Aula, sequelize } = require('../models');
const { Op, QueryTypes } = require('sequelize');

/**
 * @desc    Listar todas las aulas (con filtros opcionales)
 * @route   GET /api/aulas
 * @access  Public (lectura)
 */
const getAllAulas = async (req, res) => {
  try {
    const {
      edificio,
      carrera,
      capacidadMin,
      estado,
      tipo,
      piso,
      es_prioritaria,
      restriccion_carrera
    } = req.query;

    const where = {};

    if (edificio) where.edificio = edificio;
    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (piso) where.piso = parseInt(piso);
    if (es_prioritaria !== undefined) where.es_prioritaria = es_prioritaria === 'true';
    if (restriccion_carrera) where.restriccion_carrera = restriccion_carrera;
    if (capacidadMin) {
      where.capacidad = { [Op.gte]: parseInt(capacidadMin) };
    }

    let aulas;

    // Si se especifica carrera, usar el método que prioriza por carrera
    if (carrera) {
      aulas = await Aula.findByCarrera(carrera);
      // Aplicar filtros adicionales después
      if (Object.keys(where).length > 0) {
        aulas = aulas.filter(aula => {
          if (edificio && aula.edificio !== edificio) return false;
          if (estado && aula.estado !== estado) return false;
          if (tipo && aula.tipo !== tipo) return false;
          if (piso && aula.piso !== parseInt(piso)) return false;
          if (capacidadMin && aula.capacidad < parseInt(capacidadMin)) return false;
          if (es_prioritaria !== undefined && aula.es_prioritaria !== (es_prioritaria === 'true')) return false;
          return true;
        });
      }
    } else {
      aulas = await Aula.findAll({
        where,
        order: [['edificio', 'ASC'], ['piso', 'ASC'], ['codigo', 'ASC']]
      });
    }

    res.json({
      success: true,
      count: aulas.length,
      aulas
    });
  } catch (error) {
    console.error('Error al obtener aulas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

/**
 * @desc    Obtener una aula por ID
 * @route   GET /api/aulas/:id
 * @access  Public (lectura)
 */
const getAulaById = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id);

    if (!aula) {
      return res.status(404).json({
        success: false,
        error: 'Aula no encontrada'
      });
    }

    res.json({
      success: true,
      aula
    });
  } catch (error) {
    console.error('Error al obtener aula:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el aula',
      message: error.message
    });
  }
};

/**
 * @desc    Crear nueva aula
 * @route   POST /api/aulas
 * @access  Private (solo admin)
 */
const createAula = async (req, res) => {
  try {
    // Validar que prioridad_carreras sea un array si viene como string
    if (req.body.prioridad_carreras && typeof req.body.prioridad_carreras === 'string') {
      req.body.prioridad_carreras = req.body.prioridad_carreras
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    // Asegurar que capacidad sea número
    if (req.body.capacidad) {
      req.body.capacidad = parseInt(req.body.capacidad);
    }

    const aula = await Aula.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Aula creada exitosamente',
      aula
    });
  } catch (error) {
    console.error('Error al crear aula:', error);

    // Manejar errores de validación de Sequelize
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
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
        success: false,
        error: 'El nombre del aula ya existe'
      });
    }

    res.status(400).json({
      success: false,
      error: 'Error al crear el aula',
      message: error.message
    });
  }
};

/**
 * @desc    Actualizar aula
 * @route   PUT /api/aulas/:id
 * @access  Private (solo admin)
 */
const updateAula = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id);

    if (!aula) {
      return res.status(404).json({
        success: false,
        error: 'Aula no encontrada'
      });
    }

    // Validar que prioridad_carreras sea un array si viene como string
    if (req.body.prioridad_carreras && typeof req.body.prioridad_carreras === 'string') {
      req.body.prioridad_carreras = req.body.prioridad_carreras
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    // Asegurar que capacidad sea número
    if (req.body.capacidad) {
      req.body.capacidad = parseInt(req.body.capacidad);
    }

    await aula.update(req.body);

    res.json({
      success: true,
      message: 'Aula actualizada exitosamente',
      aula
    });
  } catch (error) {
    console.error('Error al actualizar aula:', error);

    // Manejar errores de validación de Sequelize
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Errores de validación',
        detalles: error.errors.map(err => ({
          campo: err.path,
          mensaje: err.message
        }))
      });
    }

    res.status(400).json({
      success: false,
      error: 'Error al actualizar el aula',
      message: error.message
    });
  }
};

/**
 * @desc    Eliminar/Desactivar aula (cambia estado a 'no_disponible')
 * @route   DELETE /api/aulas/:id
 * @access  Private (solo admin)
 */
const deleteAula = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id);

    if (!aula) {
      return res.status(404).json({
        success: false,
        error: 'Aula no encontrada'
      });
    }

    // Verificar si tiene clases asignadas
    const clasesAsignadas = await sequelize.query(
      'SELECT COUNT(*) as total FROM clases WHERE aula_sugerida = :codigo',
      {
        replacements: { codigo: aula.codigo },
        type: QueryTypes.SELECT
      }
    );

    if (clasesAsignadas && clasesAsignadas[0] && parseInt(clasesAsignadas[0].total) > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar el aula',
        mensaje: `El aula tiene ${clasesAsignadas[0].total} clases asignadas. Debes reasignar las clases antes de eliminarla.`
      });
    }

    // En lugar de eliminar, cambiamos el estado a 'no_disponible'
    await aula.update({ estado: 'no_disponible' });

    res.json({
      success: true,
      message: 'Aula desactivada correctamente'
    });
  } catch (error) {
    console.error('Error al desactivar aula:', error);
    res.status(500).json({
      success: false,
      error: 'Error al desactivar el aula',
      message: error.message
    });
  }
};

/**
 * @desc    Obtener estadísticas de aulas
 * @route   GET /api/aulas/stats/summary
 * @access  Public
 */
const getAulasStats = async (req, res) => {
  try {
    const totalAulas = await Aula.count();
    const disponibles = await Aula.count({ where: { estado: 'disponible' } });
    const enMantenimiento = await Aula.count({ where: { estado: 'mantenimiento' } });
    const noDisponibles = await Aula.count({ where: { estado: 'no_disponible' } });

    // Capacidad total
    const aulas = await Aula.findAll({
      attributes: ['capacidad']
    });
    const capacidadTotal = aulas.reduce((sum, aula) => sum + aula.capacidad, 0);

    // Por edificio
    const porEdificio = await Aula.findAll({
      attributes: [
        'edificio',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.col('capacidad')), 'capacidad_total']
      ],
      group: ['edificio'],
      order: [[sequelize.col('edificio'), 'ASC']],
      raw: true
    });

    // Por tipo
    const porTipo = await Aula.findAll({
      attributes: [
        'tipo',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.col('capacidad')), 'capacidad_total']
      ],
      group: ['tipo'],
      raw: true
    });

    // Total de edificios únicos
    const edificiosUnicos = await Aula.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('edificio')), 'edificio']],
      raw: true
    });

    res.json({
      success: true,
      stats: {
        total: totalAulas,
        disponibles,
        enMantenimiento,
        noDisponibles,
        capacidadTotal,
        totalEdificios: edificiosUnicos.length,
        porEdificio,
        porTipo
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
};

module.exports = {
  getAllAulas,
  getAulaById,
  createAula,
  updateAula,
  deleteAula,
  getAulasStats
};

