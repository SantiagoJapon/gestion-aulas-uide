const { Reserva, Aula, Clase, Distribucion, sequelize } = require('../models');
const { Op, QueryTypes } = require('sequelize');

// Helper para obtener la fecha/hora actual en Ecuador (GMT-5)
const getEcuadorTime = () => {
    const now = new Date();
    // Ajustar a GMT-5
    return new Date(now.getTime() + (now.getTimezoneOffset() - 300) * 60000);
};

// Helper para normalizar el día a partir de una fecha
const normalizarDia = (fechaStr) => {
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    // Forzamos la interpretación local para evitar desfases de zona horaria
    const [year, month, day] = fechaStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return dias[d.getDay()];
};

exports.crearReserva = async (req, res) => {
    try {
        const { aula_codigo, dia, fecha, hora_inicio, hora_fin, motivo } = req.body;
        const usuarioId = req.usuarioId;
        const usuarioRol = req.usuarioRol;

        if (!aula_codigo || !fecha || !hora_inicio || !hora_fin) {
            return res.status(400).json({ error: "Faltan campos obligatorios" });
        }

        // Validar rango horario
        const [hInicio, mInicio] = hora_inicio.split(':').map(Number);
        const [hFin, mFin] = hora_fin.split(':').map(Number);
        const minInicio = hInicio * 60 + mInicio;
        const minFin = hFin * 60 + mFin;

        if (minFin <= minInicio) {
            return res.status(400).json({ error: "La hora de fin debe ser posterior a la de inicio" });
        }

        const diaSemana = dia || normalizarDia(fecha);
        const esAuditorio = aula_codigo.toLowerCase().includes('auditorio');

        // 1. Chequear conflicto con Clases/Distribución
        const ocupadaEnDistribucion = await Distribucion.findOne({
            include: [{
                model: Aula,
                as: 'aula',
                where: { codigo: aula_codigo }
            }],
            where: {
                dia: diaSemana.toUpperCase(),
                [Op.or]: [
                    {
                        hora_inicio: { [Op.lt]: hora_fin },
                        hora_fin: { [Op.gt]: hora_inicio }
                    }
                ]
            }
        });

        if (ocupadaEnDistribucion) {
            return res.status(409).json({ error: `El aula ya está ocupada por clases planificadas en ese horario.` });
        }

        // También chequear en Clase directamente por si hay asignaciones manuales no distribuidas
        const conflictoClase = await Clase.findOne({
            where: {
                aula_asignada: aula_codigo,
                dia: diaSemana.toUpperCase(),
                [Op.or]: [
                    {
                        hora_inicio: { [Op.lt]: hora_fin },
                        hora_fin: { [Op.gt]: hora_inicio }
                    }
                ]
            }
        });

        if (conflictoClase) {
            return res.status(409).json({ error: `El aula ya tiene una clase regular ("${conflictoClase.materia}") en ese horario.` });
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
            return res.status(409).json({ error: "Ya existe una reserva (o solicitud) para este espacio en ese horario." });
        }

        // Determinar estado inicial
        const estadoInicial = (esAuditorio && usuarioRol !== 'admin') ? 'pendiente_aprobacion' : 'activa';

        // Obtener datos del usuario
        const usuario = req.usuario || {};

        // Crear la reserva
        const nuevaReserva = await Reserva.create({
            aula_codigo,
            dia: diaSemana.toUpperCase(),
            fecha,
            hora_inicio,
            hora_fin,
            motivo: motivo || 'Reserva de espacio',
            estado: estadoInicial,
            usuario_id: usuarioRol !== 'estudiante' ? usuarioId : null,
            estudiante_id: usuarioRol === 'estudiante' ? usuarioId : null,
            solicitante_nombre: usuario.nombre ? `${usuario.nombre} ${usuario.apellido || ''}`.trim() : 'Usuario Sistema',
            solicitante_cedula: usuario.cedula || null,
            rol_usuario: usuarioRol
        });

        res.status(201).json({
            success: true,
            reserva: nuevaReserva,
            mensaje: esAuditorio && estadoInicial === 'pendiente_aprobacion'
                ? "Solicitud enviada. Pendiente de aprobación por administración."
                : "Reserva creada con éxito."
        });

    } catch (error) {
        console.error("Error al crear reserva:", error);
        res.status(500).json({ error: "Error al procesar la reserva: " + error.message });
    }
};

exports.buscarDisponibilidad = async (req, res) => {
    try {
        const { fecha, hora_inicio, hora_fin, tipo } = req.query;

        if (!fecha || !hora_inicio || !hora_fin) {
            return res.status(400).json({ error: "Faltan parámetros requeridos (fecha, hora_inicio, hora_fin)" });
        }

        const diaSemana = normalizarDia(fecha);

        // 1. Aulas ocupadas en Distribución
        const ocupadasPorDistribucion = await Distribucion.findAll({
            attributes: ['aula_id'],
            where: {
                dia: diaSemana.toUpperCase(),
                [Op.or]: [
                    {
                        hora_inicio: { [Op.lt]: hora_fin },
                        hora_fin: { [Op.gt]: hora_inicio }
                    }
                ]
            },
            raw: true
        });
        const idsOcupadasDist = ocupadasPorDistribucion.map(d => d.aula_id);

        // 2. Aulas ocupadas vía Clase (asignación directa)
        const ocupadasPorClase = await Clase.findAll({
            attributes: ['aula_asignada'],
            where: {
                dia: diaSemana.toUpperCase(),
                aula_asignada: { [Op.ne]: null },
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

        // 3. Aulas ocupadas por otras reservas
        const ocupadasPorReserva = await Reserva.findAll({
            attributes: ['aula_codigo'],
            where: {
                fecha,
                estado: { [Op.in]: ['activa', 'pendiente_aprobacion'] },
                [Op.or]: [
                    {
                        hora_inicio: { [Op.lt]: hora_fin },
                        hora_fin: { [Op.gt]: hora_inicio }
                    }
                ]
            },
            raw: true
        });
        const codigosOcupadosRes = ocupadasPorReserva.map(r => r.aula_codigo);

        // Buscar aulas que NO estén en ninguna lista
        const whereAula = {
            estado: 'DISPONIBLE',
            codigo: {
                [Op.notIn]: codigosOcupadosRes.concat(codigosOcupadosClase)
            },
            id: {
                [Op.notIn]: idsOcupadasDist
            }
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

        // Obtener fecha actual en Ecuador para filtrar pasadas
        const ecTime = getEcuadorTime();
        const simplifiedDate = ecTime.toISOString().split('T')[0];

        whereClause.fecha = { [Op.gte]: simplifiedDate };
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

