const N8nService = require('../services/n8n.service');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

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

const getEstadoDistribucion = async (req, res) => {
  try {
    // Obtener estadísticas de distribución desde la base de datos
    const [stats] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clases,
        COUNT(DISTINCT d.clase_id) as clases_asignadas,
        COUNT(DISTINCT c.carrera) as total_carreras
      FROM clases c
      LEFT JOIN distribucion d ON d.clase_id = c.id
    `, { type: QueryTypes.SELECT });

    const clases_pendientes = (parseInt(stats.total_clases) || 0) - (parseInt(stats.clases_asignadas) || 0);

    // Obtener carreras con su estado (SQLite simplificado)
    const carreras = await sequelize.query(`
      SELECT 
        ca.id,
        ca.carrera as nombre_carrera,
        'activa' as estado,
        COUNT(DISTINCT c.id) as total_clases,
        COUNT(DISTINCT d.clase_id) as clases_asignadas,
        u.nombre as director_nombre,
        u.email as director_email
      FROM carreras ca
      LEFT JOIN clases c ON c.carrera_id = ca.id
      LEFT JOIN distribucion d ON d.clase_id = c.id
      LEFT JOIN usuarios u ON u.carrera_director = ca.id AND u.rol = 'director'
      GROUP BY ca.id, ca.carrera, u.nombre, u.email
      ORDER BY ca.carrera
    `, { type: QueryTypes.SELECT });

    res.json({
      success: true,
      estadisticas: {
        total_clases: parseInt(stats.total_clases) || 0,
        clases_asignadas: parseInt(stats.clases_asignadas) || 0,
        clases_pendientes: clases_pendientes,
        total_carreras: parseInt(stats.total_carreras) || 0,
        porcentaje_completado: stats.total_clases > 0 
          ? Math.round((stats.clases_asignadas / stats.total_clases) * 100) 
          : 0
      },
      carreras: carreras.map(c => ({
        ...c,
        nombre_carrera: fixEncoding(c.nombre_carrera),
        director_nombre: fixEncoding(c.director_nombre),
        total_clases: parseInt(c.total_clases) || 0,
        clases_asignadas: parseInt(c.clases_asignadas) || 0,
        clases_pendientes: (parseInt(c.total_clases) || 0) - (parseInt(c.clases_asignadas) || 0),
        porcentaje_completado: c.total_clases > 0 
          ? Math.round((c.clases_asignadas / c.total_clases) * 100) 
          : 0
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al obtener estado de distribución:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado de distribución',
      message: error.message
    });
  }
};

const forzarDistribucion = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || null;
    const data = await N8nService.forzarDistribucion(authHeader);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al forzar distribución',
      message: error.message
    });
  }
};

// ============================================
// EJECUTAR DISTRIBUCIÓN AUTOMÁTICA
// ============================================
const distribucionService = require('../services/distribucion.service');

const ejecutarDistribucionAutomatica = async (req, res) => {
  try {
    console.log('🎯 Admin solicitó distribución automática');
    
    const resultado = await distribucionService.ejecutarDistribucion();
    
    res.json(resultado);
  } catch (error) {
    console.error('Error al ejecutar distribución:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al ejecutar la distribución automática',
      error: error.message
    });
  }
};

// ============================================
// OBTENER HORARIO
// ============================================
const obtenerHorario = async (req, res) => {
  try {
    const usuario = req.usuario;
    let carreraId = req.query.carrera_id;

    // Si es director, solo puede ver su carrera
    if (usuario.rol === 'director' && usuario.carrera_director) {
      carreraId = usuario.carrera_director;
    }

    const horario = await distribucionService.obtenerHorario(carreraId);

    res.json({
      success: true,
      horario: horario
    });
  } catch (error) {
    console.error('Error al obtener horario:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener horario',
      error: error.message
    });
  }
};

// ============================================
// LIMPIAR DISTRIBUCIÓN
// ============================================
const limpiarDistribucion = async (req, res) => {
  try {
    console.log('🗑️  Admin solicitó limpiar distribución');
    
    const resultado = await distribucionService.limpiarDistribucion();
    
    res.json(resultado);
  } catch (error) {
    console.error('Error al limpiar distribución:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al limpiar la distribución',
      error: error.message
    });
  }
};

module.exports = {
  getEstadoDistribucion,
  forzarDistribucion,
  ejecutarDistribucionAutomatica,
  obtenerHorario,
  limpiarDistribucion
};
