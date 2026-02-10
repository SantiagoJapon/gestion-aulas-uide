// ============================================
// CONTROLLER: Planificaciones con Triggers Automáticos
// ============================================

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const multer = require('multer');
const axios = require('axios');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const { processExcel } = require('../services/excel-parser.service');

const eventEmitter = new EventEmitter();

// Crear carpeta uploads si no existe
const UPLOADS_DIR = path.join(__dirname, '../../uploads/planificaciones');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configurar multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo archivos Excel'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

exports.uploadMiddleware = upload.single('archivo');

// ============================================
// SUBIR PLANIFICACIÓN (con trigger automático)
// ============================================
exports.subirPlanificacion = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        mensaje: 'No se recibió archivo'
      });
    }

    const { carrera_id } = req.body;
    const usuario_id = req.usuario?.id || 1;

    if (!carrera_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        mensaje: 'carrera_id es requerido'
      });
    }

    // Obtener el nombre de la carrera desde el modelo Carrera
    const { Carrera } = require('../models');
    const carreraObj = await Carrera.findByPk(carrera_id, { transaction });

    if (!carreraObj) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        mensaje: 'Carrera no encontrada'
      });
    }

    const nombreCarrera = carreraObj.carrera || `Carrera ${carrera_id}`;
    console.log('📁 Procesando planificación de carrera:', nombreCarrera);

    // ==========================================
    // 📊 PARSEAR EXCEL CON NUEVO SERVICIO INTELIGENTE
    // ==========================================
    const parseResult = processExcel(req.file.buffer);

    console.log(`📚 Excel procesado: ${parseResult.clases.length} clases de hoja "${parseResult.hojaUsada}"`);

    if (parseResult.clases.length === 0) {
      await transaction.rollback();

      // Guardar archivo para revisión manual
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      fs.writeFileSync(filePath, req.file.buffer);

      const { PlanificacionSubida } = require('../models');
      await PlanificacionSubida.create({
        usuario_id,
        carrera_id: parseInt(carrera_id),
        nombre_archivo_original: req.file.originalname,
        nombre_archivo_guardado: fileName,
        ruta_archivo: filePath,
        total_clases: 0,
        estado: 'pendiente'
      });

      return res.status(200).json({
        success: false,
        mensaje: 'No se pudieron extraer clases del Excel. Requiere revisión manual.',
        archivo: req.file.originalname,
        estado: 'pendiente',
        debug: parseResult.debug
      });
    }

    // ==========================================
    // 🗑️ ELIMINAR CLASES ANTIGUAS DE ESTA CARRERA
    // ==========================================
    const { Clase, Aula } = require('../models');

    console.log(`🗑️ Eliminando clases antiguas de ${nombreCarrera}...`);
    const clasesEliminadas = await Clase.destroy({
      where: { carrera_id: carrera_id },
      transaction
    });

    console.log(`   ✅ ${clasesEliminadas} clases antiguas eliminadas`);

    let clasesGuardadas = 0;
    let errores = [];

    // ==========================================
    // 💾 GUARDAR CLASES EXTRAÍDAS
    // ==========================================
    for (let i = 0; i < parseResult.clases.length; i++) {
      const clase = parseResult.clases[i];

      try {
        // Validar que tiene materia
        if (!clase.materia || clase.materia.trim().length === 0) {
          continue;
        }

        // Si el excel trae un aula, buscar su código en la BD
        let aulaCodigo = null;
        if (clase.aula && clase.aula.trim().length > 0) {
          const aulaEncontrada = await Aula.findOne({
            where: sequelize.where(
              sequelize.fn('LOWER', sequelize.col('nombre')),
              'LIKE',
              `%${clase.aula.toLowerCase().trim()}%`
            )
          });
          if (aulaEncontrada) {
            aulaCodigo = aulaEncontrada.codigo;
          }
        }

        // Guardar en base de datos
        await Clase.create({
          carrera_id: carrera_id,
          carrera: nombreCarrera,
          materia: clase.materia.trim(),
          ciclo: clase.ciclo || '',
          paralelo: clase.paralelo || 'A',
          dia: clase.dia || '',
          hora_inicio: clase.hora_inicio || '',
          hora_fin: clase.hora_fin || '',
          num_estudiantes: clase.num_estudiantes || 0,
          docente: clase.docente || '',
          aula_asignada: aulaCodigo
        }, { transaction });

        clasesGuardadas++;

        // Log detallado cada 20 clases
        if (clasesGuardadas % 20 === 0) {
          console.log(`   ✅ ${clasesGuardadas} clases guardadas...`);
        }

      } catch (error) {
        errores.push(`Clase ${i + 1}: ${error.message}`);
        console.error(`Error guardando clase ${i + 1}:`, error.message);
      }
    }

    // ==========================================
    // 💾 GUARDAR ARCHIVO FÍSICAMENTE
    // ==========================================
    const timestamp = Date.now();
    const nombreArchivoGuardado = `${timestamp}-${carrera_id}-${req.file.originalname}`;
    const rutaArchivo = path.join(UPLOADS_DIR, nombreArchivoGuardado);

    // Guardar archivo
    fs.writeFileSync(rutaArchivo, req.file.buffer);

    // Registrar en base de datos
    const { PlanificacionSubida } = require('../models');
    await PlanificacionSubida.create({
      carrera_id: carrera_id,
      usuario_id: usuario_id,
      nombre_archivo_original: req.file.originalname,
      nombre_archivo_guardado: nombreArchivoGuardado,
      ruta_archivo: rutaArchivo,
      total_clases: clasesGuardadas,
      estado: 'pendiente' // El estado inicial ahora es pendiente de revisión
    }, { transaction });

    await transaction.commit();

    console.log(`✅ Planificación guardada: ${clasesGuardadas} clases (Pendiente de revisión)`);

    // Notificar al sistema interno que hay nueva data, pero NO disparar n8n de distribución todavía
    eventEmitter.emit('nueva_planificacion', {
      carrera_id: carrera_id,
      total_clases: clasesGuardadas,
      usuario_id: usuario_id,
      timestamp: new Date(),
      estado: 'pendiente'
    });

    res.json({
      success: true,
      mensaje: 'Planificación subida exitosamente. Pendiente de revisión por administración.',
      resultado: {
        clases_guardadas: clasesGuardadas,
        hoja_usada: parseResult.hojaUsada,
        total_hojas: parseResult.totalHojas,
        errores: errores.length > 0 ? errores : null,
        distribucion: {
          estado: 'pendiente',
          mensaje: 'La planificación está en cola para revisión anual/mensual por administración'
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error:', error);

    res.status(500).json({
      success: false,
      mensaje: 'Error al procesar planificación',
      error: error.message
    });
  }
};

// ============================================
// OBTENER ESTADO DE DISTRIBUCIÓN
// ============================================
exports.obtenerEstadoDistribucion = async (req, res) => {
  try {
    const { carrera_id } = req.params;
    const usuario_id = req.usuario?.id || 1;
    const rol = req.usuario?.rol || 'admin';

    let query = `
      SELECT 
        c.id,
        c.codigo_materia,
        c.nombre_materia,
        c.nivel,
        c.paralelo,
        c.numero_estudiantes,
        c.horario_dia,
        c.horario_inicio,
        c.horario_fin,
        c.docente,
        c.estado,
        c.aula_asignada,
        a.nombre as aula_nombre,
        a.codigo as aula_codigo,
        a.capacidad as aula_capacidad,
        a.edificio,
        a.piso,
        car.nombre as carrera_nombre
      FROM clases c
      LEFT JOIN aulas a ON a.id = c.aula_asignada
      LEFT JOIN carreras car ON car.id = c.carrera_id
      WHERE 1=1
    `;

    const replacements = {};

    if (rol === 'director' && carrera_id) {
      replacements.carrera_id = carrera_id;
      query += ` AND c.carrera_id = :carrera_id`;
    } else if (rol === 'admin' && carrera_id && carrera_id !== 'todas') {
      replacements.carrera_id = carrera_id;
      query += ` AND c.carrera_id = :carrera_id`;
    }

    query += ' ORDER BY c.carrera_id, c.nivel, c.codigo_materia';

    const result = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    const stats = {
      total: result.length,
      asignadas: result.filter(c => c.aula_asignada !== null).length,
      pendientes: result.filter(c => c.aula_asignada === null).length,
      porcentaje: result.length > 0
        ? ((result.filter(c => c.aula_asignada !== null).length / result.length) * 100).toFixed(2)
        : 0
    };

    res.json({
      success: true,
      estadisticas: stats,
      clases: result
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// EJECUTAR DISTRIBUCIÓN MANUAL
// ============================================
exports.ejecutarDistribucionManual = async (req, res) => {
  try {
    const { carrera_id } = req.body;

    console.log('🔧 Ejecutando distribución manual para carrera:', carrera_id);

    const n8nResponse = await axios.post(
      process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/maestro',
      {
        accion: 'distribuir_aulas',
        carrera_id: carrera_id || null,
        trigger: 'manual'
      },
      { timeout: 120000 }
    );

    res.json({
      success: true,
      mensaje: 'Distribución ejecutada',
      resultado: n8nResponse.data
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al ejecutar distribución',
      error: error.message
    });
  }
};

// ============================================
// DETECTAR CONFLICTOS
// ============================================
exports.detectarConflictos = async (req, res) => {
  try {
    const { carrera_id } = req.params;

    const conflictos = await sequelize.query(`
      SELECT 
        c1.id as clase1_id,
        c1.codigo_materia as clase1_codigo,
        c1.nombre_materia as clase1_nombre,
        c2.id as clase2_id,
        c2.codigo_materia as clase2_codigo,
        c2.nombre_materia as clase2_nombre,
        a.nombre as aula_nombre,
        c1.horario_dia,
        c1.horario_inicio,
        c1.horario_fin
      FROM clases c1
      JOIN clases c2 ON c1.aula_asignada = c2.aula_asignada
        AND c1.id < c2.id
        AND c1.horario_dia = c2.horario_dia
        AND c1.horario_inicio < c2.horario_fin
        AND c1.horario_fin > c2.horario_inicio
      JOIN aulas a ON a.id = c1.aula_asignada
      WHERE c1.carrera_id = :carrera_id OR c2.carrera_id = :carrera_id
      ORDER BY c1.horario_dia, c1.horario_inicio
    `, {
      replacements: { carrera_id },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      total_conflictos: conflictos.length,
      conflictos: conflictos
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// LISTAR PLANIFICACIONES SUBIDAS
// ============================================
exports.listarPlanificaciones = async (req, res) => {
  try {
    const { PlanificacionSubida, Carrera, User } = require('../models');
    const usuario = req.usuario;

    // Construir filtro según rol
    const whereClause = {};
    if (usuario.rol === 'director' && usuario.carrera_director) {
      const { Carrera } = require('../models');
      const carreraObj = await Carrera.findOne({ where: { carrera: usuario.carrera_director } });
      if (carreraObj) {
        whereClause.carrera_id = carreraObj.id;
      } else {
        // Si no se encuentra la carrera asignada, el director no debería ver nada
        whereClause.carrera_id = -1;
      }
    }
    // Admin ve todas (no filtro)

    const planificaciones = await PlanificacionSubida.findAll({
      where: whereClause,
      include: [
        {
          model: Carrera,
          as: 'carrera',
          attributes: ['id', 'carrera']
        },
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ],
      order: [['fecha_subida', 'DESC']],
      limit: 100
    });

    res.json({
      success: true,
      planificaciones: planificaciones
    });

  } catch (error) {
    console.error('Error al listar planificaciones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// DESCARGAR PLANIFICACIÓN
// ============================================
exports.descargarPlanificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { PlanificacionSubida } = require('../models');
    const usuario = req.usuario;

    const planificacion = await PlanificacionSubida.findByPk(id);

    if (!planificacion) {
      return res.status(404).json({
        success: false,
        mensaje: 'Planificación no encontrada'
      });
    }

    // Verificar permisos: Admin ve todas, director solo las de su carrera
    if (usuario.rol === 'director' &&
      usuario.carrera_director !== planificacion.carrera_id) {
      return res.status(403).json({
        success: false,
        mensaje: 'No tiene permisos para descargar esta planificación'
      });
    }

    // Verificar que el archivo existe
    if (!fs.existsSync(planificacion.ruta_archivo)) {
      return res.status(404).json({
        success: false,
        mensaje: 'Archivo no encontrado en el servidor'
      });
    }

    // Descargar archivo
    res.download(
      planificacion.ruta_archivo,
      planificacion.nombre_archivo_original,
      (err) => {
        if (err) {
          console.error('Error al descargar:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              mensaje: 'Error al descargar archivo'
            });
          }
        }
      }
    );

  } catch (error) {
    console.error('Error al descargar planificación:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// LISTENERS DE EVENTOS
// ============================================
eventEmitter.on('nueva_planificacion', async (data) => {
  console.log('📢 Evento: Nueva planificación', data);
});

eventEmitter.on('distribucion_completada', async (data) => {
  console.log('📢 Evento: Distribución completada', data);
});

// Exportar eventEmitter para uso externo
exports.eventEmitter = eventEmitter;
