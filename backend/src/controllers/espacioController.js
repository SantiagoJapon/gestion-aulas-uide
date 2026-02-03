const { Espacio, sequelize } = require('../models');
const { Op } = require('sequelize');

const getAllEspacios = async (req, res) => {
  try {
    const { tipo, estado, search } = req.query;
    const where = {};

    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;
    if (search) {
      where[Op.or] = [
        { codigo: { [Op.iLike]: `%${search}%` } },
        { nombre: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const espacios = await Espacio.findAll({
      where,
      order: [['tipo', 'ASC'], ['codigo', 'ASC']]
    });

    res.json({ success: true, count: espacios.length, espacios });
  } catch (error) {
    console.error('Error al obtener espacios:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

const getEspacioById = async (req, res) => {
  try {
    const espacio = await Espacio.findByPk(req.params.id);
    if (!espacio) {
      return res.status(404).json({ success: false, error: 'Espacio no encontrado' });
    }
    res.json({ success: true, espacio });
  } catch (error) {
    console.error('Error al obtener espacio:', error);
    res.status(500).json({ success: false, error: 'Error al obtener el espacio' });
  }
};

const createEspacio = async (req, res) => {
  try {
    if (req.body.capacidad) {
      req.body.capacidad = parseInt(req.body.capacidad);
    }

    const espacio = await Espacio.create(req.body);
    res.status(201).json({ success: true, message: 'Espacio creado exitosamente', espacio });
  } catch (error) {
    console.error('Error al crear espacio:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Errores de validación',
        detalles: error.errors.map(err => ({ campo: err.path, mensaje: err.message }))
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, error: 'El código del espacio ya existe' });
    }

    res.status(400).json({ success: false, error: 'Error al crear el espacio' });
  }
};

const updateEspacio = async (req, res) => {
  try {
    const espacio = await Espacio.findByPk(req.params.id);
    if (!espacio) {
      return res.status(404).json({ success: false, error: 'Espacio no encontrado' });
    }

    if (req.body.capacidad) {
      req.body.capacidad = parseInt(req.body.capacidad);
    }

    await espacio.update(req.body);
    res.json({ success: true, message: 'Espacio actualizado exitosamente', espacio });
  } catch (error) {
    console.error('Error al actualizar espacio:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Errores de validación',
        detalles: error.errors.map(err => ({ campo: err.path, mensaje: err.message }))
      });
    }

    res.status(400).json({ success: false, error: 'Error al actualizar el espacio' });
  }
};

const deleteEspacio = async (req, res) => {
  try {
    const espacio = await Espacio.findByPk(req.params.id);
    if (!espacio) {
      return res.status(404).json({ success: false, error: 'Espacio no encontrado' });
    }

    await espacio.update({ estado: 'NO_DISPONIBLE' });
    res.json({ success: true, message: 'Espacio desactivado correctamente' });
  } catch (error) {
    console.error('Error al desactivar espacio:', error);
    res.status(500).json({ success: false, error: 'Error al desactivar el espacio' });
  }
};

const getEspaciosStats = async (req, res) => {
  try {
    const total = await Espacio.count();
    const disponibles = await Espacio.count({ where: { estado: 'DISPONIBLE' } });
    const enMantenimiento = await Espacio.count({ where: { estado: 'MANTENIMIENTO' } });
    const noDisponibles = await Espacio.count({ where: { estado: 'NO_DISPONIBLE' } });

    const porTipo = await Espacio.findAll({
      attributes: [
        'tipo',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.col('capacidad')), 'capacidad_total']
      ],
      group: ['tipo'],
      raw: true
    });

    res.json({
      success: true,
      stats: { total, disponibles, enMantenimiento, noDisponibles, porTipo }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de espacios:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
  }
};

module.exports = {
  getAllEspacios,
  getEspacioById,
  createEspacio,
  updateEspacio,
  deleteEspacio,
  getEspaciosStats
};
