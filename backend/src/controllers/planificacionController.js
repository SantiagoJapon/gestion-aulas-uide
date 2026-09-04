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

    // Verificar permisos: un director solo puede subir planificaciones a
    // carreras que tiene asignadas (soporta multi-carrera). Admin sube a
    // cualquier carrera. Mismo patrón que descargarPlanificacion.
    if (req.usuario?.rol === 'director') {
      const carreraIds = req.usuario.carreraIds || [];
      if (!carreraIds.includes(Number(carrera_id))) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          mensaje: 'No tiene permisos para subir planificaciones a esta carrera'
        });
      }
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
    // 🛡️ GUARDIA: no borrar en cascada trabajo del módulo colaborativo (Fase 6b).
    // Clase.destroy() más abajo tiene ON DELETE CASCADE hacia
    // bloques_disponibilidad (FK clase_id). Sin este chequeo, re-subir un
    // Excel borra en silencio cualquier bloque EN_REVISION/CONFIRMADO que
    // un director ya haya trabajado vía Planificación Colaborativa — sin
    // aviso, sin relación entre lo que hace un director y lo que ve el
    // resto del sistema. Bloques LIBRE no cuentan: no representan trabajo
    // confirmado, son seguros de perder junto con la clase que reemplazan.
    // ==========================================
    const { BloqueDisponibilidad: BloqueDisponibilidadGuard } = require('../models');
    const bloquesEnRiesgo = await BloqueDisponibilidadGuard.findAll({
      where: { estado: { [require('sequelize').Op.in]: ['EN_REVISION', 'CONFIRMADO'] } },
      include: [{
        model: require('../models').Clase,
        as: 'clase',
        where: { carrera_id: carrera_id },
        attributes: ['id', 'materia']
      }],
      transaction
    });

    if (bloquesEnRiesgo.length > 0 && String(req.body.confirmarSobrescritura) !== 'true') {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        mensaje: `Esta carrera tiene ${bloquesEnRiesgo.length} clase(s) con planificación colaborativa en curso (enviada o confirmada por el director). Subir un nuevo Excel las va a borrar. Si estás seguro, reenviá la subida con confirmarSobrescritura=true.`,
        bloquesEnRiesgo: bloquesEnRiesgo.map((b) => ({
          claseId: b.clase_id,
          materia: b.clase ? b.clase.materia : null,
          estado: b.estado
        }))
      });
    }

    // ==========================================
    // 📊 PARSEAR EXCEL (Parser local determinista)
    // n8n ya NO participa en el flujo crítico de parseo.
    // ==========================================
    let parseResult = null;

    console.log('📄 Usando parser local...');
    parseResult = processExcel(req.file.buffer);

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
    // ✅ VALIDAR CLASES ANTES DE TOCAR LA BD
    // Se valida el mínimo requerido ANTES de eliminar
    // datos existentes para evitar pérdida parcial.
    // ==========================================
    const clasesValidas = parseResult.clases.filter(c => c.materia && c.materia.trim().length > 0);
    if (clasesValidas.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        mensaje: 'El Excel no contiene clases con materia válida. No se realizaron cambios.',
        debug: parseResult.debug
      });
    }
    // Reemplazar con solo las clases válidas para el procesamiento posterior
    parseResult.clases = clasesValidas;

    // ==========================================
    // 🗑️ ELIMINAR CLASES ANTIGUAS DE ESTA CARRERA
    // Solo se ejecuta después de validar que hay datos nuevos válidos.
    // ==========================================
    const { Clase, Aula, Docente, User } = require('../models');
    const whatsappService = require('../services/whatsappService');

    // Función auxiliar para crear usuario para docente.
    // Antes de crear, busca si ya existe una cuenta institucional
    // (@uide.edu.ec) para evitar duplicar a directores que también enseñan.
    const crearUsuarioParaDocente = async (docente, t) => {
      try {
        if (docente.usuario_id) return null;
        const partes = docente.nombre.trim().split(' ');
        const nombre = partes[0] || 'Docente';
        const apellido = partes.slice(1).join(' ') || 'UIDE';

        // Si el docente ya tiene email, buscar primero por ese email exacto
        if (docente.email) {
          const existingUser = await User.findOne({ where: { email: docente.email }, transaction: t });
          if (existingUser) {
            await docente.update({ usuario_id: existingUser.id }, { transaction: t });
            return null;
          }
        }

        // Buscar también por el email institucional (@uide.edu.ec) que podría
        // tener un director con el mismo nombre — evita cuentas duplicadas.
        const emailInstitucional = `${nombre.toLowerCase()}.${apellido.toLowerCase().replace(/\s+/g, '')}@uide.edu.ec`;
        const existingInstitucional = await User.findOne({ where: { email: emailInstitucional }, transaction: t });
        if (existingInstitucional) {
          // Ya existe como director u otro rol institucional: vincular sin crear cuenta nueva
          await docente.update({ usuario_id: existingInstitucional.id }, { transaction: t });
          return null;
        }

        // Si llegamos aquí, no existe: crear cuenta docente con email @docente.uide.edu.ec
        const emailDocente = docente.email || `${nombre.toLowerCase()}.${apellido.toLowerCase().replace(/\s+/g, '')}@docente.uide.edu.ec`;
        const existingDocente = await User.findOne({ where: { email: emailDocente }, transaction: t });
        if (existingDocente) {
          await docente.update({ usuario_id: existingDocente.id }, { transaction: t });
          return null;
        }

        const user = await User.create({
          nombre, apellido,
          email: emailDocente,
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

    const claseIds = new Map();

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
        const createdClase = await Clase.create({
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
        claseIds.set(i, createdClase.id);

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

    // Abortar si se perdió más del 20% de las clases por errores de inserción
    const tasaError = errores.length / parseResult.clases.length;
    if (tasaError > 0.2 && clasesGuardadas < 5) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        mensaje: `Demasiados errores al guardar (${errores.length} de ${parseResult.clases.length} clases fallaron). No se realizaron cambios.`,
        errores: errores.slice(0, 10)
      });
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
    const clasesSinHorario = parseResult.clases.filter(c => !c.dia || !c.hora_inicio);
    const clasesSinEstudiantes = parseResult.clases.filter(c => !c.num_estudiantes || c.num_estudiantes === 0);
    const clasesSinDocente = parseResult.clases.filter(c => !c.docente);

    const getDetalle = (clases) => clases.map((c, i) => {
      const originalIndex = parseResult.clases.indexOf(c);
      return {
        id: claseIds.get(originalIndex) || null,
        materia: c.materia,
        ciclo: c.ciclo,
        paralelo: c.paralelo,
      };
    });

    const reporteSalud = {
      total_clases: parseResult.clases.length,
      clases_sin_horario: clasesSinHorario.length,
      clases_sin_estudiantes: clasesSinEstudiantes.length,
      clases_sin_docente: clasesSinDocente.length,
      detalle_sin_horario: getDetalle(clasesSinHorario),
      detalle_sin_estudiantes: getDetalle(clasesSinEstudiantes),
      detalle_sin_docente: getDetalle(clasesSinDocente),
      estado_general: (clasesSinHorario.length > 0 || clasesSinEstudiantes.length > 0) ? 'atencion_requerida' : 'bueno',
      recomendacion: clasesSinHorario.length > 0 ? 'Hay materias sin horario definido que no podrán asignarse a un aula.' : 'Los datos parecen estar listos para la distribución.'
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
// VALIDAR PLANIFICACIÓN (pre-chequeo, Fase 6a — no persiste nada)
// ============================================
// Corre el mismo parser que subirPlanificacion() pero es 100% de solo
// lectura: nunca borra/crea Clase, nunca crea Docente/User, nunca envía
// WhatsApp, nunca dispara la distribución automática. subirPlanificacion()
// sigue exactamente igual — este endpoint es puramente aditivo, pensado
// para que el director vea sobrecupo/choques ANTES de decidir subir.
exports.validarPlanificacion = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, mensaje: 'No se recibió archivo' });
    }

    const { carrera_id } = req.body;
    if (!carrera_id) {
      return res.status(400).json({ success: false, mensaje: 'carrera_id es requerido' });
    }

    if (req.usuario?.rol === 'director') {
      const carreraIds = req.usuario.carreraIds || [];
      if (!carreraIds.includes(Number(carrera_id))) {
        return res.status(403).json({
          success: false,
          mensaje: 'No tiene permisos para validar planificaciones de esta carrera'
        });
      }
    }

    const { Carrera, Aula } = require('../models');
    const carreraObj = await Carrera.findByPk(carrera_id);
    if (!carreraObj) {
      return res.status(400).json({ success: false, mensaje: 'Carrera no encontrada' });
    }
    const nombreCarrera = carreraObj.carrera || `Carrera ${carrera_id}`;

    const parseResult = processExcel(req.file.buffer);
    const clasesValidas = parseResult.clases.filter(c => c.materia && c.materia.trim().length > 0);

    if (clasesValidas.length === 0) {
      return res.json({
        success: true,
        ok: [],
        conflictos: [],
        estadisticas: { totalFilas: 0, sinConflicto: 0, conConflicto: 0 },
        mensaje: 'El Excel no contiene clases con materia válida.'
      });
    }

    // Resolución de aula en memoria (una sola carga de Aula.findAll, sin
    // transacción — no persiste nada). Misma heurística de texto que
    // subirPlanificacion, adaptada a lookup en memoria para no repetir
    // 3 queries LIKE por fila en un endpoint que puede llamarse varias
    // veces mientras el director ajusta su Excel.
    const todasAulas = await Aula.findAll();
    const filas = clasesValidas.map((c, i) => {
      let aulaResuelta = null;
      if (c.aula && c.aula.trim().length > 0) {
        const aulaVal = c.aula.toLowerCase().trim();
        aulaResuelta =
          todasAulas.find(a => (a.codigo || '').toLowerCase() === aulaVal) ||
          todasAulas.find(a => (a.nombre || '').toLowerCase().includes(aulaVal)) ||
          todasAulas.find(a => (a.codigo || '').toLowerCase().includes(aulaVal.replace(/[\s.]+/g, '')));
      }
      return {
        fila: i + 1,
        materia: c.materia.trim(),
        ciclo: c.ciclo || '',
        paralelo: c.paralelo || 'A',
        dia: c.dia || '',
        hora_inicio: c.hora_inicio || '',
        hora_fin: c.hora_fin || '',
        num_estudiantes: c.num_estudiantes || 0,
        carrera: nombreCarrera,
        aulaCodigo: aulaResuelta ? aulaResuelta.codigo : null,
        aulaCapacidad: aulaResuelta ? aulaResuelta.capacidad : null
      };
    });

    const { construirOcupacionActual } = require('../utils/ocupacionAulas');
    // PENDIENTE (I1): sin acotar por período. Este handler no recibe ni
    // resuelve un período, así que la validación del Excel se compara
    // contra la ocupación de TODOS los períodos y puede reportar
    // conflictos falsos contra clases de un ciclo anterior. Es
    // conservador (avisa de más, nunca de menos), por eso no bloquea,
    // pero para arreglarlo hay que decidir de dónde sale el período:
    // del body de la petición o del período activo.
    const ocupacionExistente = await construirOcupacionActual({});
    const aulasParaSugerencia = todasAulas.filter(a => (a.estado || '').toLowerCase() === 'disponible');

    const { validarClasesExcel } = require('../services/validacionExcel.service');
    const resultado = validarClasesExcel(filas, ocupacionExistente, aulasParaSugerencia);

    res.json({
      success: true,
      ...resultado,
      hojaUsada: parseResult.hojaUsada
    });
  } catch (error) {
    console.error('❌ Error al validar planificación:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al validar planificación',
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

    const { getDirectorCarreraFilter } = require('../middleware/auth');
    const carreraFilter = await getDirectorCarreraFilter(req);

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

    if (carreraFilter.carreraIds) {
      // Director: puede tener una o varias carreras asignadas
      replacements.carrera_ids = carreraFilter.carreraIds;
      query += ` AND c.carrera_id IN (:carrera_ids)`;
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
    const { carrera_id: carrera_id_param } = req.params;
    const { getDirectorCarreraFilter } = require('../middleware/auth');
    const carreraFilter = await getDirectorCarreraFilter(req);

    // Director: puede tener una o varias carreras asignadas → filtramos por IN.
    // Admin: usa el carrera_id explícito de la ruta (comportamiento sin cambios).
    const carreraIds = carreraFilter.carreraIds || (carrera_id_param ? [carrera_id_param] : []);
    const whereCarrera = carreraIds.length > 0
      ? 'WHERE c1.carrera_id IN (:carrera_ids) OR c2.carrera_id IN (:carrera_ids)'
      : 'WHERE 1=1';

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
        AND c1.hora_inicio < c2.hora_fin
        AND c1.hora_fin > c2.hora_inicio
      JOIN aulas a ON a.codigo = c1.aula_asignada
      ${whereCarrera}
      ORDER BY c1.dia, c1.hora_inicio
    `, {
      replacements: { carrera_ids: carreraIds },
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
    if (usuario.rol === 'director') {
      const carreraIds = usuario.carreraIds || [];
      // Si no tiene ninguna carrera asignada, el director no debería ver nada
      whereClause.carrera_id = carreraIds.length > 0 ? { [Op.in]: carreraIds } : -1;
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

    // Verificar permisos: Admin ve todas, director solo las de sus carreras asignadas
    if (usuario.rol === 'director') {
      const carreraIds = usuario.carreraIds || [];
      if (!carreraIds.includes(planificacion.carrera_id)) {
        return res.status(403).json({
          success: false,
          mensaje: 'No tiene permisos para descargar esta planificación'
        });
      }
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
    // 🤖 NOTIFICAR A n8n (fire-and-forget, vía event queue)
    // n8n recibe el evento desde Redis y orquesta la notificación.
    // Si n8n está caído, el evento queda encolado.
    // ============================================
    N8nService.emit('reporte', {
      tipo: 'distribucion_completada',
      carrera_id: data.carrera_id,
      usuario_id: data.usuario_id,
      estadisticas: resultado.estadisticas || {},
      mensaje: N8nService.construirReporteDistribucion(resultado.estadisticas || {}),
      usar_ia: String(process.env.AI_REPORTE_DISTRIBUCION).toLowerCase() === 'true'
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
