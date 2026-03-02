const { Notificacion, User, Carrera, Clase, Estudiante, Docente } = require('../models');
const { Op } = require('sequelize');

exports.crearNotificacion = async (req, res) => {
    try {
        const { titulo, mensaje, tipo, prioridad, fecha_expiracion, destinatario_id, estudiante_id, carrera_id, clase_id } = req.body;
        const remitenteId = req.usuarioId;

        // Validaciones básicas según tipo
        if (tipo === 'DIRECTA' && !destinatario_id && !estudiante_id) {
            return res.status(400).json({ error: "Para notificaciones directas se requiere un destinatario" });
        }
        if (tipo === 'CARRERA' && !carrera_id) {
            return res.status(400).json({ error: "Se requiere especificar la carrera" });
        }
        if (tipo === 'CLASE' && !clase_id) {
            return res.status(400).json({ error: "Se requiere especificar la clase" });
        }

        const nuevaNotificacion = await Notificacion.create({
            titulo,
            mensaje,
            tipo,
            prioridad: prioridad || 'MEDIA',
            fecha_expiracion,
            remitente_id: remitenteId,
            destinatario_id,
            estudiante_id,
            carrera_id,
            clase_id,
            leida: false
        });

        // 🚀 ALERTA REAL-TIME VIA WHATSAPP
        const whatsappService = require('../services/whatsappService');
        const telegramMsg = `🔔 *${titulo}*\n\n${mensaje}\n\n_Enviado desde el Portal UIDE_`;

        if (tipo === 'DIRECTA') {
            if (estudiante_id) {
                // Buscar usuario_id del estudiante
                const estudiante = await Estudiante.findByPk(estudiante_id);
                if (estudiante) await whatsappService.notifyUser(estudiante.usuario_id, telegramMsg);
            } else if (destinatario_id) {
                await whatsappService.notifyUser(destinatario_id, telegramMsg);
            }
        } else if (tipo === 'CARRERA') {
            await whatsappService.notifyCareer(carrera_id, telegramMsg);
        } else if (tipo === 'CLASE') {
            await whatsappService.notifyClass(clase_id, telegramMsg);
        } else if (tipo === 'GLOBAL') {
            // Mandar a todos los que tengan sesión vinculada via WhatsApp
            const { sequelize } = require('../config/database');
            const { QueryTypes } = require('sequelize');
            const sessions = await sequelize.query('SELECT DISTINCT telefono FROM bot_sessions WHERE telefono IS NOT NULL', { type: QueryTypes.SELECT });
            for (const s of sessions) {
                await whatsappService.sendMessage(s.telefono, telegramMsg);
            }
        }

        res.status(201).json({ success: true, notificacion: nuevaNotificacion });
    } catch (error) {
        console.error("Error al crear notificación:", error);
        res.status(500).json({ error: "Error interno al crear notificación" });
    }
};

exports.misNotificaciones = async (req, res) => {
    try {
        const { rol, id } = req.usuario; // rol puede ser 'admin', 'director', 'profesor', 'estudiante'

        let whereClause = {
            [Op.or]: []
        };

        // 1. Notificaciones Globales
        whereClause[Op.or].push({ tipo: 'GLOBAL' });

        // 2. Notificaciones Directas
        if (rol === 'estudiante') {
            whereClause[Op.or].push({ tipo: 'DIRECTA', estudiante_id: id });
        } else {
            whereClause[Op.or].push({ tipo: 'DIRECTA', destinatario_id: id });
        }

        // 3. Notificaciones por Carrera
        if (rol === 'estudiante' && req.usuario.escuela) {
            const carreras = await Carrera.findAll({
                where: { carrera: { [Op.iLike]: req.usuario.escuela } }
            });
            const carreraIds = carreras.map(c => c.id);
            if (carreraIds.length > 0) {
                whereClause[Op.or].push({ tipo: 'CARRERA', carrera_id: { [Op.in]: carreraIds } });
            }
        } else if (rol === 'director' && req.usuario.carrera_director) {
            // Director: buscar carrera por nombre en carrera_director
            const carrera = await Carrera.findOne({ where: { carrera: req.usuario.carrera_director } });
            if (carrera) {
                whereClause[Op.or].push({ tipo: 'CARRERA', carrera_id: carrera.id });
            }
        } else if (rol === 'profesor' || rol === 'docente') {
            // Profesor/Docente: buscar su carrera_id via la tabla docentes (vinculada por usuario_id)
            const docentePerfil = await Docente.findOne({ where: { usuario_id: req.usuario.id } });
            if (docentePerfil && docentePerfil.carrera_id) {
                whereClause[Op.or].push({ tipo: 'CARRERA', carrera_id: docentePerfil.carrera_id });
            }
        }

        // 4. Notificaciones por Clase (Estudiantes matriculados o Profesor de la clase)
        // Esto es más complejo: requeriría saber qué clases toma el estudiante.
        // Simularemos buscando notificaciones de tipo CLASE donde el estudiante "debería" estar
        // Para v1 saltaremos la validación estricta de "estoy en esta clase" en la consulta SQL masiva para no matar el rendimiento,
        // o mejor: El cliente ya filtrará, pero por seguridad deberíamos filtrar aquí.
        // Implementación correcta: Buscar IDs de clases del estudiante y añadir al OR.

        // TODO: Implementar lógica real de "Mis Clases" para filtrar notificaciones de tipo CLASE.

        const notificaciones = await Notificacion.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            include: [
                // LEFT JOIN: si remitente_id es NULL (Sistema), no falla la query
                { model: User, as: 'remitenteInfo', attributes: ['nombre', 'apellido', 'rol'], required: false }
            ],
            limit: 50
        });

        res.json({ success: true, notificaciones });

    } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        res.status(500).json({ error: "Error al obtener notificaciones" });
    }
};

exports.marcarLeida = async (req, res) => {
    try {
        const { id } = req.params;

        const notificacion = await Notificacion.findByPk(id);
        if (!notificacion) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        // Permitir marcar como leída si la notificación es:
        // - directa al usuario (destinatario_id o estudiante_id)
        // - global / de carrera / de sistema (cualquier usuario autenticado puede marcarla)
        // El filtro real de "es mi notificación" ya lo hace misNotificaciones en la consulta
        const esDestinatarioDirecto =
            notificacion.destinatario_id === req.usuarioId ||
            (req.usuarioRol === 'estudiante' && notificacion.estudiante_id === req.usuarioId);

        const esNotificacionGeneral = ['GLOBAL', 'CARRERA', 'SISTEMA'].includes(notificacion.tipo);

        if (esDestinatarioDirecto || esNotificacionGeneral) {
            notificacion.leida = true;
            await notificacion.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error al marcar notificación:', error);
        res.status(500).json({ error: 'Error al actualizar notificación' });
    }
};
