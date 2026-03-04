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
const { analizarExcelConIA, esOpenAIConfigurado } = require('../services/openai.service');
const distribucionService = require('../services/distribucion.service');
const N8nService = require('../services/n8n.service');

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
    // 📊 PARSEAR EXCEL (Estrategia: n8n > Local > IA)
    // ==========================================
    let parseResult = null;

    // 1. Intentar con n8n Maestro (Automatización centralizada)
    try {
      console.log('🤖 Solicitando procesamiento a n8n Maestro...');
      const n8nResponse = await N8nService.processPlanificacion({
        carrera_id,
        archivo_base64: req.file.buffer.toString('base64'),
        nombre_archivo: req.file.originalname,
        carrera_nombre: nombreCarrera
      });

      if (n8nResponse && n8nResponse.success && n8nResponse.clases && n8nResponse.clases.length > 0) {
        parseResult = {
          clases: n8nResponse.clases,
          hojaUsada: 'n8n Maestro',
          totalHojas: n8nResponse.total_filas_excel ? 1 : 0,
          debug: { method: 'n8n-automation', columns: n8nResponse.columnas_detectadas }
        };
        console.log(`✅ n8n Maestro extrajo ${parseResult.clases.length} clases.`);
      }
    } catch (n8nError) {
      console.warn('⚠️ n8n Maestro no respondió o dio error, saltando a parser local...');
    }

    // 2. Fallback: Parser local del backend (si n8n falló o no devolvió nada)
    if (!parseResult) {
      console.log('📄 Usando parser local de respaldo...');
      parseResult = processExcel(req.file.buffer);
    }

    // 3. Segundo Fallback: IA Directa si el parser local da resultados sospechosos
    const uniqueMaterias = new Set(parseResult.clases.map(c => c.materia)).size;
    const isSuspicious = parseResult.clases.length > 5 && uniqueMaterias < (parseResult.clases.length * 0.1);

    if ((parseResult.clases.length === 0 || isSuspicious) && esOpenAIConfigurado() && (!parseResult.debug || parseResult.debug.method !== 'n8n-automation')) {
      console.log('🤖 Resultados locales sospechosos. Reintentando con IA Directa...');
      try {
        const XLSX = require('xlsx');
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const iaResult = await analizarExcelConIA(rawData, nombreCarrera);
        if (iaResult && iaResult.clases && iaResult.clases.length > 0) {
          parseResult = {
            clases: iaResult.clases,
            hojaUsada: workbook.SheetNames[0] + ' (IA)',
            totalHojas: workbook.SheetNames.length,
            debug: { method: 'openai-direct', columns: iaResult.columnas_detectadas }
          };
        }
      } catch (iaError) {
        console.error('❌ Error en análisis de IA Directa:', iaError.message);
      }
    }

    console.log(`📚 Excel procesado: ${parseResult.clases.length} clases de hoja "${parseResult.hojaUsada}"`);
    if (parseResult.debug?.columnMap) {
      console.log(`📊 Column map usado: ${JSON.stringify(parseResult.debug.columnMap)}`);
    }
    if (parseResult.clases.length > 0) {
      const sample = parseResult.clases[0];
      console.log(`📋 Primera clase: materia="${sample.materia}" docente="${sample.docente}" ciclo="${sample.ciclo}" dia="${sample.dia}" hora="${sample.hora_inicio}" est=${sample.num_estudiantes}`);
    }

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
    const { Clase, Aula, Docente, User } = require('../models');
    const whatsappService = require('../services/whatsappService');

    // Función auxiliar para crear usuario (copiada de docenteController o importada)
    const crearUsuarioParaDocente = async (docente, t) => {
      try {
        if (docente.usuario_id) return null;
        const partes = docente.nombre.trim().split(' ');
        const nombre = partes[0] || 'Docente';
        const apellido = partes.slice(1).join(' ') || 'UIDE';
        let email = docente.email;
        if (!email) {
          email = `${nombre.toLowerCase()}.${apellido.toLowerCase().replace(/\s+/g, '')}@docente.uide.edu.ec`;
        }
        const existingUser = await User.findOne({ where: { email }, transaction: t });
        if (existingUser) {
          await docente.update({ usuario_id: existingUser.id }, { transaction: t });
          return null;
        }
        const user = await User.create({
          nombre, apellido, email,
          password: 'uide2024',
          rol: 'docente',
          estado: 'activo',
          requiere_cambio_password: true,
          telefono: docente.telefono
        }, { transaction: t });
        await docente.update({ usuario_id: user.id }, { transaction: t });
        return user;
      } catch (e) {
        console.error('Error auto-creando usuario para docente:', e.message);
        return null;
      }
    };

    console.log(`🗑️ Eliminando clases antiguas de ${nombreCarrera}...`);
    const clasesEliminadas = await Clase.destroy({
      where: { carrera_id: carrera_id },
      transaction
    });

    console.log(`   ✅ ${clasesEliminadas} clases antiguas eliminadas`);

    let clasesGuardadas = 0;
    let docentesMap = new Map(); // Para mapear nombre -> id docente
    let errores = [];

    // ==========================================
    // 💾 GUARDAR CLASES Y SINCRONIZAR DOCENTES/CATÁLOGO
    // ==========================================
    const { MateriaCatalogo } = require('../models');

    for (let i = 0; i < parseResult.clases.length; i++) {
      const clase = parseResult.clases[i];

      try {
        // Validar que tiene materia
        if (!clase.materia || clase.materia.trim().length === 0) {
          continue;
        }

        // 📚 Sincronizar Catálogo de Materias
        await MateriaCatalogo.findOrCreate({
          where: {
            nombre: clase.materia.trim(),
            carrera_id: carrera_id
          },
          defaults: {
            nombre: clase.materia.trim(),
            ciclo: parseInt(clase.ciclo) || null,
            carrera_id: carrera_id,
            activo: true
          },
          transaction
        });

        // 👨‍🏫 Sincronizar Docente si hay metadata
        let docenteId = null;
        if (clase.docente) {
          if (!docentesMap.has(clase.docente)) {
            const meta = clase.docente_metadata || {};

            // Intentar encontrar por email o nombre
            let where = { nombre: clase.docente };
            if (meta.email) where = { [require('sequelize').Op.or]: [{ nombre: clase.docente }, { email: meta.email }] };

            const [docenteRecord, created] = await Docente.findOrCreate({
              where,
              defaults: {
                nombre: clase.docente,
                email: meta.email || null,
                telefono: meta.telefono || null,
                titulo_pregrado: meta.titulo_pregrado || null,
                titulo_posgrado: meta.titulo_posgrado || null,
                tipo: meta.tipo || 'Tiempo Completo',
                carrera_id: carrera_id
              },
              transaction
            });

            // SI ES NUEVO: Crear cuenta de usuario automáticamente y enviar WhatsApp
            if (created) {
              const newUser = await crearUsuarioParaDocente(docenteRecord, transaction);
              if (newUser && docenteRecord.telefono) {
                const msj = `*UIDE Gestión de Aulas*\n\nHola ${docenteRecord.nombre}, se ha generado tu acceso automático:\n\n📧 *User:* ${newUser.email}\n🔑 *Clave:* uide2024\n\n🌐 ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;
                whatsappService.sendMessage(docenteRecord.telefono, msj).catch(e => console.error('Error WhatsApp auto:', e));
              }
            }

            // Si el registro ya existe, actualizar títulos/email si vienen en el Excel
            if (docenteRecord && (meta.email || meta.titulo_pregrado || meta.titulo_posgrado || meta.telefono)) {
              await docenteRecord.update({
                email: meta.email || docenteRecord.email,
                telefono: meta.telefono || docenteRecord.telefono,
                titulo_pregrado: meta.titulo_pregrado || docenteRecord.titulo_pregrado,
                titulo_posgrado: meta.titulo_posgrado || docenteRecord.titulo_posgrado,
                tipo: meta.tipo || docenteRecord.tipo
              }, { transaction });
            }

            docentesMap.set(clase.docente, docenteRecord.id);
            docenteId = docenteRecord.id;
          } else {
            docenteId = docentesMap.get(clase.docente);
          }
        }

        // Si el excel trae un aula, buscar su código en la BD
        let aulaCodigo = null;
        if (clase.aula && clase.aula.trim().length > 0) {
          const aulaVal = clase.aula.toLowerCase().trim();

          // Buscar primero por codigo exacto (ej: "C12", "Lab. 1")
          let aulaEncontrada = await Aula.findOne({
            where: sequelize.where(
              sequelize.fn('LOWER', sequelize.col('codigo')),
              aulaVal
            ),
            transaction
          });

          // Si no se encuentra por codigo, buscar por nombre parcial
          if (!aulaEncontrada) {
            aulaEncontrada = await Aula.findOne({
              where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('nombre')),
                'LIKE',
                `%${aulaVal}%`
              ),
              transaction
            });
          }

          // Si aún no, buscar codigo parcial (ej: "Lab 1" match "LAB-1")
          if (!aulaEncontrada) {
            aulaEncontrada = await Aula.findOne({
              where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('codigo')),
                'LIKE',
                `%${aulaVal.replace(/[\s.]+/g, '%')}%`
              ),
              transaction
            });
          }

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
          docente_id: docenteId, // LINK RELACIONAL
          aula_asignada: aulaCodigo,
          aula_sugerida: clase.aula_sugerida || null
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

    // Registrar en base de datos (reemplazar subidas anteriores de esta carrera)
    const { PlanificacionSubida } = require('../models');
    await PlanificacionSubida.update(
      { estado: 'reemplazado' },
      { where: { carrera_id: carrera_id, estado: { [require('sequelize').Op.ne]: 'reemplazado' } }, transaction }
    );

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

    console.log(`✅ Planificación guardada: ${clasesGuardadas} clases (Pendiente de revisión)`);

    // Notificar al sistema interno que hay nueva data, pero NO disparar n8n de distribución todavía
    eventEmitter.emit('nueva_planificacion', {
      carrera_id: carrera_id,
      total_clases: clasesGuardadas,
      usuario_id: usuario_id,
      timestamp: new Date(),
      estado: 'pendiente'
    });

    // ==========================================
    // 📊 GENERAR REPORTE DE SALUD DE DATOS
    // ==========================================
    const sinHorario = parseResult.clases.filter(c => !c.dia || !c.hora_inicio).length;
    const sinEstudiantes = parseResult.clases.filter(c => !c.num_estudiantes || c.num_estudiantes === 0).length;
    const sinDocente = parseResult.clases.filter(c => !c.docente).length;

    const reporteSalud = {
      total_clases: parseResult.clases.length,
      clases_sin_horario: sinHorario,
      clases_sin_estudiantes: sinEstudiantes,
      clases_sin_docente: sinDocente,
      estado_general: (sinHorario > 0 || sinEstudiantes > 0) ? 'atencion_requerida' : 'bueno',
      recomendacion: sinHorario > 0 ? 'Hay materias sin horario definido que no podrán asignarse a un aula.' : 'Los datos parecen estar listos para la distribución.'
    };

    res.json({
      success: true,
      mensaje: 'Planificación subida exitosamente y procesada para revisión.',
      reporte_salud: reporteSalud,
      resultado: {
        clases_guardadas: clasesGuardadas,
        hoja_usada: parseResult.hojaUsada,
        total_hojas: parseResult.totalHojas,
        errores: errores.length > 0 ? errores : null,
        distribucion: {
          estado: 'pendiente',
          mensaje: 'La planificación ha sido cargada y está lista para la distribución maestra institucional.'
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
        c.materia,
        c.ciclo,
        c.paralelo,
        c.num_estudiantes,
        c.dia,
        c.hora_inicio,
        c.hora_fin,
        c.docente,
        c.aula_asignada,
        d.estado as estado,
        a.nombre as aula_nombre,
        a.codigo as aula_codigo,
        a.capacidad as aula_capacidad,
        a.edificio,
        a.piso,
        car.carrera as carrera_nombre
      FROM clases c
      LEFT JOIN distribuciones d ON d.clase_id = c.id
      LEFT JOIN aulas a ON a.codigo = c.aula_asignada
      LEFT JOIN uploads_carreras car ON car.id = c.carrera_id
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

    query += ' ORDER BY c.carrera_id, c.ciclo, c.materia';

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
        c1.materia as clase1_nombre,
        c2.id as clase2_id,
        c2.materia as clase2_nombre,
        a.nombre as aula_nombre,
        c1.dia,
        c1.hora_inicio,
        c1.hora_fin
      FROM clases c1
      JOIN clases c2 ON c1.aula_asignada = c2.aula_asignada
        AND c1.id < c2.id
        AND c1.dia = c2.dia
        AND c1.horario_inicio < c2.horario_fin
        AND c1.horario_fin > c2.horario_inicio
      JOIN aulas a ON a.codigo = c1.aula_asignada
      WHERE c1.carrera_id = :carrera_id OR c2.carrera_id = :carrera_id
      ORDER BY c1.dia, c1.hora_inicio
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

    // Construir filtro según rol (excluir planificaciones reemplazadas/historicas)
    const { Op } = require('sequelize');
    const whereClause = { estado: { [Op.notIn]: ['reemplazado', 'historico'] } };
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
  console.log('📢 Evento: Nueva planificación detectada, iniciando distribución automática...', data);
  try {
    const resultado = await distribucionService.ejecutarDistribucion(data.carrera_id);
    console.log('✅ Distribución automática completada:', resultado.mensaje);
    if (resultado.estadisticas) {
      console.log(`   📊 Exitosas: ${resultado.estadisticas.exitosas}, Fallidas: ${resultado.estadisticas.fallidas}`);
    }

    // ============================================
    // 🤖 NOTIFICAR A n8n (fire-and-forget)
    // n8n genera reporte IA con GPT-4o y notifica
    // al director por WhatsApp. Si n8n está caído,
    // el flujo principal NO se ve afectado.
    // ============================================
    N8nService.notificarDistribucionCompletada({
      carrera_id: data.carrera_id,
      usuario_id: data.usuario_id,
      estadisticas: resultado.estadisticas || {},
      timestamp: new Date().toISOString()
    }).catch(err => {
      // Solo log — nunca propagar el error
      console.warn('⚠️ n8n no disponible para reporte post-distribución:', err.message);
    });

  } catch (error) {
    console.error('❌ Error en distribución automática post-upload:', error.message);
  }
});

eventEmitter.on('distribucion_completada', async (data) => {
  console.log('📢 Evento: Distribución completada', data);
});

// Exportar eventEmitter para uso externo
exports.eventEmitter = eventEmitter;
