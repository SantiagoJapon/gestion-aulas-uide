// ============================================
// CONTROLLER: Planificaciones con Triggers Automáticos
// ============================================

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const multer = require('multer');
const XLSX = require('xlsx');
const axios = require('axios');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const { analizarExcelConIA, esOpenAIConfigurado } = require('../services/openai.service');

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
      return res.status(400).json({
        success: false,
        mensaje: 'No se recibió archivo'
      });
    }

    const { carrera_id } = req.body;
    const usuario_id = req.usuario?.id || 1;

    if (!carrera_id) {
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

    // Leer Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📚 ${data.length} filas en el Excel`);

    // ==========================================
    // 🤖 ANÁLISIS INTELIGENTE DE COLUMNAS
    // ==========================================
    const columnas = data.length > 0 ? Object.keys(data[0]) : [];
    console.log('📋 Columnas encontradas:', columnas);

    // Función para buscar columna por palabras clave (case-insensitive, con similitud)
    const buscarColumna = (palabrasClave) => {
      const columnaNormalizada = columnas.find(col => {
        const colLower = col.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return palabrasClave.some(palabra => colLower.includes(palabra.toLowerCase()));
      });
      return columnaNormalizada || null;
    };

    // Detectar automáticamente las columnas relevantes
    const colMateria = buscarColumna(['materia', 'asignatura', 'curso', 'subject']);
    const colCiclo = buscarColumna(['ciclo', 'nivel', 'semestre', 'year']);
    const colParalelo = buscarColumna(['paralelo', 'grupo', 'seccion', 'group']);
    const colDia = buscarColumna(['dia', 'day', 'jornada']);
    const colHora = buscarColumna(['hora', 'horario', 'time', 'schedule']);
    const colHoraInicio = buscarColumna(['hora_inicio', 'inicio', 'start', 'hora inicio']);
    const colHoraFin = buscarColumna(['hora_fin', 'fin', 'end', 'hora fin']);
    const colEstudiantes = buscarColumna(['estudiante', 'alumno', 'student', 'nro', 'num', 'cantidad']);
    const colDocente = buscarColumna(['docente', 'profesor', 'teacher', 'instructor']);
    const colAula = buscarColumna(['aula', 'salon', 'lab', 'classroom', 'room']);

    console.log('🔍 Mapeo de columnas detectado:');
    console.log('  - Materia:', colMateria || 'NO ENCONTRADA');
    console.log('  - Ciclo:', colCiclo || 'no encontrada');
    console.log('  - Paralelo:', colParalelo || 'no encontrada');
    console.log('  - Día:', colDia || 'no encontrada');
    console.log('  - Hora:', colHora || 'no encontrada');
    console.log('  - Hora Inicio:', colHoraInicio || 'no encontrada');
    console.log('  - Hora Fin:', colHoraFin || 'no encontrada');
    console.log('  - Estudiantes:', colEstudiantes || 'no encontrada');
    console.log('  - Docente:', colDocente || 'no encontrada');
    console.log('  - Aula:', colAula || 'no encontrada');

    if (!colMateria) {
      console.log('⚠️  No se encontró columna de MATERIA con detección automática.');

      // Intentar con ChatGPT antes de guardar para revisión manual
      if (esOpenAIConfigurado()) {
        console.log('🤖 Intentando análisis con ChatGPT...');

        try {
          const resultadoIA = await analizarExcelConIA(data, nombreCarrera);

          if (resultadoIA && resultadoIA.clases && resultadoIA.clases.length > 0) {
            console.log(`✅ ChatGPT detectó ${resultadoIA.clases.length} clases exitosamente`);

            // Eliminar clases antiguas
            const { Clase } = require('../models');
            const clasesEliminadas = await Clase.destroy({
              where: { carrera_id: carrera_id },
              transaction
            });
            console.log(`✅ ${clasesEliminadas} clases antiguas eliminadas`);

            // Guardar clases detectadas por IA
            let clasesGuardadas = 0;
            for (const claseIA of resultadoIA.clases) {
              // Si el excel trae un aula sugerida, intentar buscar el código correspondiente
              let aulaCodigo = null;
              if (claseIA.aula) {
                const { Aula } = require('../models');
                // Buscar aula por nombre o código
                const aulaEncontrada = await Aula.findOne({
                  where: sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('nombre')),
                    'LIKE',
                    `%${String(claseIA.aula).toLowerCase().trim()}%`
                  )
                });
                if (aulaEncontrada) {
                  aulaCodigo = aulaEncontrada.codigo;
                  console.log(`   ✅ Aula "${claseIA.aula}" → ${aulaCodigo}`);
                } else {
                  console.log(`   ⚠️  Aula "${claseIA.aula}" no encontrada en BD`);
                }
              }

              await Clase.create({
                carrera_id: carrera_id,
                carrera: nombreCarrera,
                materia: String(claseIA.materia || '').trim(),
                ciclo: String(claseIA.ciclo || '').trim(),
                paralelo: String(claseIA.paralelo || 'A').trim(),
                dia: String(claseIA.dia || '').trim(),
                hora_inicio: String(claseIA.hora_inicio || '').trim(),
                hora_fin: String(claseIA.hora_fin || '').trim(),
                num_estudiantes: claseIA.num_estudiantes || 0,
                docente: String(claseIA.docente || '').trim(),
                aula_asignada: aulaCodigo  // Guardar aula si se encontró en BD
              }, { transaction });
              clasesGuardadas++;
            }

            // Guardar archivo
            const { PlanificacionSubida } = require('../models');
            const timestamp = Date.now();
            const nombreArchivoGuardado = `${timestamp}-${carrera_id}-${req.file.originalname}`;
            const rutaArchivo = path.join(UPLOADS_DIR, nombreArchivoGuardado);
            fs.writeFileSync(rutaArchivo, req.file.buffer);

            await PlanificacionSubida.create({
              carrera_id: carrera_id,
              usuario_id: usuario_id,
              nombre_archivo_original: req.file.originalname,
              nombre_archivo_guardado: nombreArchivoGuardado,
              ruta_archivo: rutaArchivo,
              total_clases: clasesGuardadas,
              estado: 'procesado'
            }, { transaction });

            await transaction.commit();

            // Disparar distribución automática
            try {
              await axios.post(
                process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/maestro',
                {
                  accion: 'distribuir_aulas',
                  carrera_id: carrera_id,
                  trigger: 'auto',
                  origen: 'nueva_planificacion_ia'
                },
                { timeout: 120000 }
              );

              return res.json({
                success: true,
                mensaje: 'Excel analizado con IA y procesado exitosamente',
                resultado: {
                  clases_guardadas: clasesGuardadas,
                  metodo: 'chatgpt',
                  distribucion: { estado: 'en_progreso' }
                }
              });
            } catch (n8nError) {
              return res.json({
                success: true,
                mensaje: 'Excel procesado con IA. Distribución debe ejecutarse manualmente',
                resultado: {
                  clases_guardadas: clasesGuardadas,
                  metodo: 'chatgpt',
                  distribucion: { estado: 'pendiente' }
                }
              });
            }
          }
        } catch (iaError) {
          console.error('❌ Error en análisis con ChatGPT:', iaError.message);
          // Continuar con guardado para revisión manual
        }
      }

      // Si ChatGPT no está configurado o falló, guardar para revisión manual
      console.log('📁 Guardando archivo Excel para revisión manual del administrador...');

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
      }, { transaction });

      await transaction.commit();

      console.log('✅ Archivo guardado para revisión manual');

      return res.status(200).json({
        success: true,
        mensaje: 'Excel guardado. Requiere revisión manual del administrador.',
        archivo: req.file.originalname,
        estado: 'pendiente',
        nota: 'El administrador puede descargar y revisar este archivo.'
      });
    }

    // ==========================================
    // 🗑️ ELIMINAR CLASES ANTIGUAS DE ESTA CARRERA
    // ==========================================
    const { Clase } = require('../models');

    console.log(`🗑️ Eliminando clases antiguas de ${nombreCarrera}...`);
    const clasesEliminadas = await Clase.destroy({
      where: { carrera_id: carrera_id },
      transaction
    });

    console.log(`   ✅ ${clasesEliminadas} clases antiguas eliminadas`);

    let clasesGuardadas = 0;
    let errores = [];

    // Procesar cada clase
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // Debug: Ver las primeras filas completas
        if (i < 3) {
          console.log(`\n[DEBUG] Fila ${i + 1}:`);
          console.log('  Materia:', row[colMateria]);
          console.log('  Estudiantes:', row[colEstudiantes]);
          console.log('  Día:', row[colDia]);
          console.log('  Hora:', row[colHora]);
        }

        // Extraer valores usando las columnas detectadas
        const materia = colMateria ? row[colMateria] : '';

        // Validar campos mínimos requeridos
        if (!materia || String(materia).trim().length === 0) {
          continue;
        }

        const ciclo = colCiclo ? row[colCiclo] : '';
        const paralelo = colParalelo ? row[colParalelo] : 'A';
        const dia = colDia ? row[colDia] : '';

        // Número de estudiantes - extraer números de cualquier formato
        let numEstudiantes = 0;
        if (colEstudiantes && row[colEstudiantes]) {
          const estudiantesStr = String(row[colEstudiantes]).replace(/\D/g, '');
          numEstudiantes = parseInt(estudiantesStr) || 0;
        }

        // HORA - manejar múltiples formatos
        let horaInicio = '';
        let horaFin = '';

        if (colHoraInicio && colHoraFin) {
          // Formato separado
          horaInicio = String(row[colHoraInicio] || '').trim();
          horaFin = String(row[colHoraFin] || '').trim();
        } else if (colHora) {
          // Formato "HH:MM - HH:MM" o "HH:MM-HH:MM"
          const horaCompleta = String(row[colHora] || '');
          if (horaCompleta.includes('-')) {
            const partes = horaCompleta.split('-').map(p => p.trim());
            if (partes.length >= 2) {
              horaInicio = partes[0];
              horaFin = partes[1];
            }
          }
        }

        const docente = colDocente ? row[colDocente] : '';
        const aulaOriginal = colAula ? row[colAula] : '';

        // Si el excel trae un aula, buscar su código en la BD
        let aulaCodigo = null;
        if (aulaOriginal && String(aulaOriginal).trim().length > 0) {
          const { Aula } = require('../models');
          const aulaEncontrada = await Aula.findOne({
            where: sequelize.where(
              sequelize.fn('LOWER', sequelize.col('nombre')),
              'LIKE',
              `%${String(aulaOriginal).toLowerCase().trim()}%`
            )
          });
          if (aulaEncontrada) {
            aulaCodigo = aulaEncontrada.codigo;
            if (i < 3) {
              console.log(`  Aula: "${aulaOriginal}" → ${aulaCodigo}`);
            }
          }
        }

        // Guardar en base de datos
        await Clase.create({
          carrera_id: carrera_id,
          carrera: nombreCarrera,
          materia: String(materia).trim(),
          ciclo: String(ciclo || '').trim(),
          paralelo: String(paralelo || 'A').trim(),
          dia: String(dia || '').trim(),
          hora_inicio: String(horaInicio || '').trim(),
          hora_fin: String(horaFin || '').trim(),
          num_estudiantes: numEstudiantes,
          docente: String(docente || '').trim(),
          aula_asignada: aulaCodigo  // Guarda el código si se encontró, null si no
        }, { transaction });

        clasesGuardadas++;

        // Log detallado cada 10 clases
        if (clasesGuardadas % 10 === 0) {
          console.log(`   ✅ ${clasesGuardadas} clases procesadas...`);
        }

      } catch (error) {
        errores.push(`Fila ${i + 2}: ${error.message}`);
        console.error(`Error en fila ${i + 2}:`, error.message);
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
      estado: 'procesado'
    }, { transaction });

    await transaction.commit();

    console.log(`✅ Planificación guardada: ${clasesGuardadas} clases`);

    // ==========================================
    // 🚀 TRIGGER AUTOMÁTICO: Ejecutar distribución
    // ==========================================

    eventEmitter.emit('nueva_planificacion', {
      carrera_id: carrera_id,
      total_clases: clasesGuardadas,
      usuario_id: usuario_id,
      timestamp: new Date()
    });

    // Llamar a n8n para distribución automática
    try {
      console.log('🤖 Activando distribución automática en n8n...');

      const n8nResponse = await axios.post(
        process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/maestro',
        {
          accion: 'distribuir_aulas',
          carrera_id: carrera_id,
          trigger: 'auto',
          origen: 'nueva_planificacion'
        },
        { timeout: 120000 }
      );

      console.log('✅ Distribución automática iniciada');

      res.json({
        success: true,
        mensaje: 'Planificación subida. Distribución automática en progreso...',
        resultado: {
          clases_guardadas: clasesGuardadas,
          errores: errores.length > 0 ? errores : null,
          distribucion: {
            estado: 'en_progreso',
            mensaje: 'La distribución de aulas se está procesando automáticamente'
          }
        }
      });

    } catch (n8nError) {
      console.warn('⚠️ No se pudo activar distribución automática:', n8nError.message);

      res.json({
        success: true,
        mensaje: 'Planificación subida exitosamente',
        resultado: {
          clases_guardadas: clasesGuardadas,
          errores: errores.length > 0 ? errores : null,
          distribucion: {
            estado: 'pendiente',
            mensaje: 'Distribución debe ejecutarse manualmente'
          }
        }
      });
    }

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
      whereClause.carrera_id = usuario.carrera_director;
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
