const { Reserva, Aula, Clase, sequelize } = require('../models');
const { Op, QueryTypes } = require('sequelize');

// Helper para normalizar el día
const normalizarDia = (fechaStr) => {
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const d = new Date(fechaStr + 'T00:00:00');
    return dias[d.getDay()];
};

exports.crearReserva = async (req, res) => {
    try {
        const { aula_codigo, dia, fecha, hora_inicio, hora_fin, motivo } = req.body;
        const usuarioId = req.usuarioId;
        const usuarioRol = req.usuarioRol;

        // Validar rango horario
        const [hInicio, mInicio] = hora_inicio.split(':').map(Number);
        const [hFin, mFin] = hora_fin.split(':').map(Number);
        const minInicio = hInicio * 60 + mInicio;
        const minFin = hFin * 60 + mFin;

        if (minFin <= minInicio) {
            return res.status(400).json({ error: "La hora de fin debe ser posterior a la de inicio" });
        }

        const diaSemana = dia || normalizarDia(fecha);

        // 1. Chequear conflicto con Clases regulares (Semestre)
        const conflictoClase = await Clase.findOne({
            where: {
                aula_asignada: aula_codigo,
                dia: diaSemana,
                [Op.or]: [
                    {
                        hora_inicio: { [Op.lt]: hora_fin },
                        hora_fin: { [Op.gt]: hora_inicio }
                    }
                ]
            }
        });

        if (conflictoClase) {
            return res.status(409).json({ error: `El aula ya está ocupada por la clase "${conflictoClase.materia}" en ese horario.` });
        }

        // 2. Chequear conflicto con otras Reservas
        const conflictoReservas = await Reserva.findOne({
            where: {
                aula_codigo,
                fecha,
                estado: { [Op.in]: ['activa', 'pendiente_aprobacion'] },
                [Op.or]: [
                    {
                        hora_inicio: { [Op.lt]: hora_fin },
                        hora_fin: { [Op.gt]: hora_inicio }
                    }
                ]
            }
        });

        if (conflictoReservas) {
            return res.status(409).json({ error: "El aula ya tiene una reserva activa en ese horario." });
        }

        // Crear la reserva
        const nuevaReserva = await Reserva.create({
            aula_codigo,
            dia: diaSemana,
            fecha,
            hora_inicio,
            hora_fin,
            motivo,
            estado: 'activa',
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

exports.buscarDisponibilidad = async (req, res) => {
    try {
        const { fecha, hora_inicio, hora_fin, tipo } = req.query;

        if (!fecha || !hora_inicio || !hora_fin) {
            return res.status(400).json({ error: "Faltan parámetros: fecha, hora_inicio, hora_fin son requeridos" });
        }

        const diaSemana = normalizarDia(fecha);

        // Subquery para encontrar aulas OCUPADAS por clases
        const ocupadasPorClase = await Clase.findAll({
            attributes: ['aula_asignada'],
            where: {
                dia: diaSemana,
                [Op.or]: [
                    {
                        hora_inicio: { [Op.lt]: hora_fin },
                        hora_fin: { [Op.gt]: hora_inicio }
                    }
                ]
            },
            raw: true
        });

        const codigosOcupadosClase = ocupadasPorClase.map(c => c.aula_asignada);

        // Subquery para encontrar aulas OCUPADAS por otras reservas
        const ocupadasPorReserva = await Reserva.findAll({
            attributes: ['aula_codigo'],
            where: {
                fecha,
                estado: 'activa',
                [Op.or]: [
                    {
                        hora_inicio: { [Op.lt]: hora_fin },
                        hora_fin: { [Op.gt]: hora_inicio }
                    }
                ]
            },
            raw: true
        });

        const codigosOcupadosReserva = ocupadasPorReserva.map(r => r.aula_codigo);
        const todosOcupados = [...new Set([...codigosOcupadosClase, ...codigosOcupadosReserva])];

        // Buscar aulas disponibles que NO estén en la lista de ocupadas
        const whereAula = {
            codigo: { [Op.notIn]: todosOcupados.length > 0 ? todosOcupados : [''] },
            estado: 'DISPONIBLE'
        };

        if (tipo && tipo !== 'TODO') {
            whereAula.tipo = tipo;
        }

        const aulasLibres = await Aula.findAll({
            where: whereAula,
            order: [['nombre', 'ASC']]
        });

        res.json({ success: true, aulas: aulasLibres });

    } catch (error) {
        console.error("Error buscando disponibilidad:", error);
        res.status(500).json({ error: "Error al buscar disponibilidad" });
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

        // Solo mostrar reservas futuras o actuales
        whereClause.fecha = { [Op.gte]: new Date().toISOString().split('T')[0] };
        whereClause.estado = { [Op.ne]: 'cancelada' };

        const reservas = await Reserva.findAll({
            where: whereClause,
            order: [['fecha', 'ASC'], ['hora_inicio', 'ASC']]
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
