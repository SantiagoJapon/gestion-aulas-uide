const { Incidencia, User: Usuario, Aula } = require('../models');
const { Op } = require('sequelize');

exports.crearIncidencia = async (req, res) => {
    try {
        const { titulo, descripcion, tipo, prioridad, aula_codigo } = req.body;
        const usuarioId = req.usuarioId;

        if (!aula_codigo) {
            return res.status(400).json({ error: "Debe especificar el código del aula" });
        }

        const incidencia = await Incidencia.create({
            titulo,
            descripcion,
            tipo: tipo || 'OTRO',
            prioridad: prioridad || 'MEDIA',
            estado: 'PENDIENTE',
            aula_codigo,
            usuario_id: usuarioId
        });

        // 🚀 NOTIFICAR A ADMINS POR TELEGRAM
        const telegramService = require('../services/telegramService');
        const adminChannelId = process.env.TELEGRAM_ADMIN_CHANNEL_ID;
        if (adminChannelId) {
            const adminMsg = `⚠️ *NUEVA INCIDENCIA REPORTADA*\n\n*Aula:* ${aula_codigo}\n*Asunto:* ${titulo}\n*Prioridad:* ${prioridad || 'MEDIA'}\n*Repoirtado por:* ${req.usuario?.nombre || 'Docente'}\n\n_Favor revisar el panel de administración._`;
            await telegramService.sendMessage(adminChannelId, adminMsg);
        }

        res.status(201).json({ success: true, incidencia });
    } catch (error) {
        console.error("Error al crear incidencia:", error);
        res.status(500).json({ error: "Error interno" });
    }
};

exports.listarIncidencias = async (req, res) => {
    try {
        const { estado, usuario, aula } = req.query;
        let where = {};

        if (estado) where.estado = estado;
        if (aula) where.aula_codigo = aula;

        // Si no es admin, solo ve sus propias incidencias
        if (req.usuarioRol !== 'admin' && req.usuarioRol !== 'soporte') {
            where.usuario_id = req.usuarioId;
        } else if (usuario) {
            where.usuario_id = usuario;
        }

        const incidencias = await Incidencia.findAll({
            where,
            include: [
                { model: Usuario, as: 'reportadoPor', attributes: ['nombre', 'apellido', 'email'] },
                { model: Aula, as: 'aula', attributes: ['nombre', 'edificio', 'piso', 'codigo'] }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ success: true, incidencias });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al listar incidencias" });
    }
};

exports.actualizarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, respuesta_tecnica } = req.body;

        // Solo admin puede cambiar estado y responder
        if (req.usuarioRol !== 'admin' && req.usuarioRol !== 'soporte') {
            return res.status(403).json({ error: "No autorizado" });
        }

        const incidencia = await Incidencia.findByPk(id);
        if (!incidencia) return res.status(404).json({ error: "Incidencia no encontrada" });

        if (estado) incidencia.estado = estado;
        if (respuesta_tecnica) incidencia.respuesta_tecnica = respuesta_tecnica;
        if (estado === 'RESUELTO' || estado === 'CERRADO') incidencia.fecha_resolucion = new Date();

        await incidencia.save();

        // 🚀 NOTIFICAR AL USUARIO DEL CAMBIO DE ESTADO
        const telegramService = require('../services/telegramService');
        const userMsg = `🛠️ *ACTUALIZACIÓN DE INCIDENCIA*\n\nTu reporte sobre el aula *${incidencia.aula_codigo}* ha cambiado de estado.\n\n*Nuevo Estado:* ${estado}\n${respuesta_tecnica ? `*Respuesta:* ${respuesta_tecnica}` : ''}\n\n_Gracias por ayudarnos a mejorar._`;
        await telegramService.notifyUser(incidencia.usuario_id, userMsg);

        res.json({ success: true, incidencia });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar incidencia" });
    }
};
