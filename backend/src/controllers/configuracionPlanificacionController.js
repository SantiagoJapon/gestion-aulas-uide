const { ConfiguracionPlanificacion, Periodo, Usuario, FlujosPlanificacion, UploadsCarreras, Notificacion } = require('../models');
const { Op } = require('sequelize');

exports.obtenerConfiguracionGlobal = async (req, res) => {
  try {
    const config = await ConfiguracionPlanificacion.findOne({
      order: [['created_at', 'DESC']],
      include: [
        { model: Periodo, attributes: ['id', 'nombre', 'fecha_inicio', 'fecha_fin'] }
      ]
    });

    if (!config) {
      return res.json({
        success: true,
        config: null,
        mensaje: 'No hay configuración de período global activa'
      });
    }

    res.json({
      success: true,
      config: {
        id: config.id,
        periodo_id: config.periodo_id,
        periodo_nombre: config.Periodo ? config.Periodo.nombre : null,
        fecha_inicio_global: config.fecha_inicio_global,
        fecha_fin_global: config.fecha_fin_global,
        activo: config.activo,
        fecha_asignacion: config.fecha_asignacion,
        asignado_por: config.asignado_por
      }
    });
  } catch (error) {
    console.error('Error al obtener configuración global:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener configuración global'
    });
  }
};

exports.actualizarConfiguracionGlobal = async (req, res) => {
  try {
    const { fecha_inicio_global, fecha_fin_global, periodo_id, activo } = req.body;
    const usuarioId = req.usuario.id;

    // Validar fechas
    if (!fecha_inicio_global || !fecha_fin_global) {
      return res.status(400).json({
        success: false,
        error: 'Las fechas de inicio y fin globales son requeridas'
      });
    }

    // Si hay un periodo relacionado, validarlo
    let periodoObj = null;
    if (periodo_id) {
      periodoObj = await Periodo.findByPk(periodo_id);
      if (!periodoObj) {
        return res.status(400).json({
          success: false,
          error: 'El periodo especificado no existe'
        });
      }
    }

    // Usar upsert para crear o actualizar la configuración (solo una fila activa)
    const [created, [config]] = await ConfiguracionPlanificacion.findOrCreate({
      where: { id: 1 }, // Single config record
      defaults: {
        fecha_inicio_global,
        fecha_fin_global,
        periodo_id,
        activo: activo !== false, // Default to true
        asignado_por: usuarioId
      },
      update: {
        fecha_inicio_global,
        fecha_fin_global,
        periodo_id,
        activo: activo !== false,
        fecha_asignacion: Sequelize.literal('NOW()'),
        asignado_por: usuarioId
      }
    });

    // Notificar a todos los directores sobre el cambio
    await enviarNotificacionCambioPeriodoGlobal(config, usuarioId);

    res.json({
      success: true,
      config: {
        id: config.id,
        fecha_inicio_global: config.fecha_inicio_global,
        fecha_fin_global: config.fecha_fin_global,
        periodo_id: config.periodo_id,
        activo: config.activo,
        mensaje: 'Configuración global actualizada y directores notificados'
      }
    });
  } catch (error) {
    console.error('Error al actualizar configuración global:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar configuración global'
    });
  }
};

exports.obtenerEstadoCaracteres = async (req, res) => {
  try {
    const { carrera_id } = req.params;

    // Obtener la configuración global activa
    const config = await ConfiguracionPlanificacion.findOne({
      where: { activo: true },
      order: [['created_at', 'DESC']]
    });

    // Construirwhere para flujos planificacion
    const whereFlujos = { estado: { [Op.notIn]: ['historico', 'reemplazado'] } };

    // Si hay configuración global, incluirla en la filtración
    if (config) {
      whereFlujos.configuracion_planificacion_id = config.id;
    }

    // Obtener flujos de planificación con su estado
    const flujos = await FlujosPlanificacion.findAll({
      where: whereFlujos,
      include: [
        { model: UploadsCarreras, as: 'carrera', attributes: ['id', 'carrera'] },
        { model: ConfiguracionPlanificacion, as: 'configuracion', attributes: ['fecha_inicio_global', 'fecha_fin_global'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Obtener estadísticas por carrera
    const estadisticas = await Promise.all(flujos.map(async (flujo) => {
      const totalSubidas = await UploadsCarreras.count({
        where: { id: flujo.carrera_id, activa: true }
      });

      const planificaciones = await UploadsCarreras.findOne({
        where: { id: flujo.carrera_id },
        attributes: ['id', 'estado', 'fecha_subida']
      });

      return {
        carrera_id: flujo.carrera_id,
        carrera_nombre: flujo.carrera ? flujo.carrera.carrera : null,
        flujo_estado: flujo.estado,
        configuracion_global: config ? {
          fecha_inicio: config.fecha_inicio_global,
          fecha_fin: config.fecha_fin_global
        } : null,
        planificacion_estado: planificaciones ? planificaciones.estado : null,
        total_subidas: totalSubidas
      };
    }));

    res.json({
      success: true,
      configuracion_global: config ? {
        fecha_inicio_global: config.fecha_inicio_global,
        fecha_fin_global: config.fecha_fin_global,
        activo: config.activo
      } : null,
      flujos: flujos,
      estadisticas
    });
  } catch (error) {
    console.error('Error al obtener estado de carriers:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado de carreras'
    });
  }
};

exports.enviarNotificacionCambioPeriodoGlobal = async (config, adminUserId) => {
  try {
    const { Notificacion, Usuario, Sequelize } = require('../models');
    const { QueryTypes } = Sequelize;

    // Obtener todos los directores (usuarios con rol='director')
    const directores = await Usuario.findAll({
      where: { rol: 'director' },
      attributes: ['id', 'nombre', 'apellido', 'email', 'cedula', 'telefono']
    });

    const titulo = '📅 Nueva ventana de planificación global activada';
    const hoy = new Date().toLocaleDateString('es-EC');
    const mensaje = `
✅ *VENTANA GLOBAL DE PLANIFICACIÓN ACTIVADA*

📅 *Fechas del período:*
• Desde: ${config.fecha_inicio_global}
• Hasta: ${config.fecha_fin_global}

🎯 *Instrucción:* Todas las direcciones de carrera deben subir o actualizar sus planificaciones dentro de este período. Las planificaciones fuera de estas fechas no serán procesadas.

📋 *Estado actual:* Las carreras en borrador deben completarse antes del ${config.fecha_fin_global}.

💡 *Sistema:* Este aviso se generó automáticamente por el administrador. Para consultas, contacte al área de planificación.

---
🏛️ UIDE - Sistema de Gestión de Aulas
`;

    // Crear notificaciones en la base de datos y enviar WhatsApp
    for (const director of directores) {
      // Crear notificación en BD
      await Notificacion.create({
        titulo,
        mensaje,
        tipo: 'GLOBAL',
        prioridad: 'ALTA',
        remitente_id: adminUserId,
        destinatario_id: director.id,
        leida: false,
        fecha_expiracion: null
      });

      // Enviar por WhatsApp si tiene teléfono
      if (director.telefono) {
        const whatsappService = require('../services/whatsappService');
        const telegramMsg = `🔔 *${titulo}*\n\n${mensaje.replace(/\\/g, '\\\\').replace(/\"/g, '\\\\\"')}`;

        try {
          await whatsappService.sendMessage(director.telefono, telegramMsg);
        } catch (e) {
          console.error(`Error sending WhatsApp to director ${director.id}:`, e.message);
        }
      }
    }

    console.log(`📤 Notificaciones enviadas a ${directores.length} directores`);
    return true;
  } catch (error) {
    console.error('Error enviando notificaciones de cambio global:', error);
    return false;
  }
};