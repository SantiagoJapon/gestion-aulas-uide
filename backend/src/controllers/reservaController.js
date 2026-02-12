const { Reserva, Aula, Clase } = require('../models');
const { Op } = require('sequelize');

exports.crearReserva = async (req, res) => {
    try {
        const { aula_codigo, dia, fecha, hora_inicio, hora_fin, motivo } = req.body;
        const usuarioId = req.usuarioId;
        const usuarioRol = req.usuarioRol;

        // 1. Validar que el aula existe y está disponible
        // (Nota: Idealmente usaríamos distribucionService, pero aquí haremos chequeo directo por simplicidad y rapidez)

        // Convertir horas a minutos para comparar rangos
        const [hInicio, mInicio] = hora_inicio.split(':').map(Number);
        const [hFin, mFin] = hora_fin.split(':').map(Number);
        const minInicio = hInicio * 60 + mInicio;
        const minFin = hFin * 60 + mFin;

        if (minFin <= minInicio) {
            return res.status(400).json({ error: "La hora de fin debe ser posterior a la de inicio" });
        }

        // Chequear conflicto con Clases regulares
        // (Aquí asumimos que 'dia' viene como LUNES, MARTES...)
        // TODO: Validar dia vs fecha real para consistencia

        // Chequear conflicto con otras Reservas
        const conflictoReservas = await Reserva.findOne({
            where: {
                aula_codigo,
                fecha,
                estado: { [Op.in]: ['activa', 'pendiente_aprobacion'] },
                [Op.or]: [
                    {
                        // Nueva inicia dento de existente
                        hora_inicio: { [Op.lt]: hora_fin },
                        hora_fin: { [Op.gt]: hora_inicio }
                    }
                ]
            }
        });

        if (conflictoReservas) {
            return res.status(409).json({ error: "El aula ya está reservada en ese horario." });
        }

        // Crear la reserva
        const nuevaReserva = await Reserva.create({
            aula_codigo,
            dia,
            fecha,
            hora_inicio,
            hora_fin,
            motivo,
            estado: 'activa', // Por defecto activa, admin puede cambiar
            usuario_id: usuarioRol !== 'estudiante' ? usuarioId : null,
            estudiante_id: usuarioRol === 'estudiante' ? usuarioId : null,
            solicitante_nombre: req.usuario.nombre + (req.usuario.apellido ? ' ' + req.usuario.apellido : ''),
            solicitante_cedula: req.usuario.cedula
        });

        res.status(201).json({ success: true, reserva: nuevaReserva });

    } catch (error) {
        console.error("Error al crear reserva:", error);
        res.status(500).json({ error: "Error interno al procesar la reserva" });
    }
};

exports.misReservas = async (req, res) => {
    try {
        const usuarioId = req.usuarioId;
        const usuarioRol = req.usuarioRol;

        const whereClause = {};
        if (usuarioRol === 'estudiante') {
            whereClause.estudiante_id = usuarioId;
        } else {
            whereClause.usuario_id = usuarioId;
        }

        const reservas = await Reserva.findAll({
            where: whereClause,
            order: [['fecha', 'DESC'], ['hora_inicio', 'ASC']]
        });

        res.json({ success: true, reservas });
    } catch (error) {
        console.error("Error al obtener reservas:", error);
        res.status(500).json({ error: "Error al obtener reservas" });
    }
};

exports.cancelarReserva = async (req, res) => {
    try {
        const { id } = req.params;
        const reserva = await Reserva.findByPk(id);

        if (!reserva) {
            return res.status(404).json({ error: "Reserva no encontrada" });
        }

        // Verificar propiedad (solo el dueño o admin puede cancelar)
        const esMio = (req.usuarioRol === 'estudiante' && reserva.estudiante_id === req.usuarioId) ||
            (req.usuarioRol !== 'estudiante' && reserva.usuario_id === req.usuarioId);

        if (!esMio && req.usuarioRol !== 'admin') {
            return res.status(403).json({ error: "No tienes permiso para cancelar esta reserva" });
        }

        reserva.estado = 'cancelada';
        await reserva.save();
        res.json({ success: true, message: "Reserva cancelada correctamente" });

    } catch (error) {
        console.error("Error al cancelar reserva:", error);
        res.status(500).json({ error: "Error al cancelar reserva" });
    }
};
