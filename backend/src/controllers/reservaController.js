const { Reserva, Aula, Clase, Distribucion, Espacio } = require('../models');
const { Op } = require('sequelize');

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
        const { aula_codigo, espacio_codigo, dia, fecha, hora_inicio, hora_fin, motivo, tipo_espacio } = req.body;
        const usuarioId = req.usuarioId;
        const usuarioRol = req.usuarioRol;

        // Determinar el tipo de espacio y el código
        const tipoEspacio = tipo_espacio || 'aula';
        const codigoEspacio = aula_codigo || espacio_codigo;

        if (!codigoEspacio || !fecha || !hora_inicio || !hora_fin) {
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
        const esAuditorio = codigoEspacio.toLowerCase().includes('auditorio');

        // 1. Solo chequear conflicto con Clases/Distribución si es un aula
        if (tipoEspacio === 'aula' || tipoEspacio === 'auditorio') {
            const ocupadaEnDistribucion = await Distribucion.findOne({
                include: [{
                    model: Aula,
                    as: 'aula',
                    where: { codigo: codigoEspacio }
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
                    aula_asignada: codigoEspacio,
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
        }

        // 2. Chequear conflicto con otras Reservas (para ambos tipos)
        const whereConflicto = {
            fecha,
            estado: { [Op.in]: ['activa', 'pendiente_aprobacion'] },
            [Op.or]: [
                {
                    hora_inicio: { [Op.lt]: hora_fin },
                    hora_fin: { [Op.gt]: hora_inicio }
                }
            ]
        };

        if (tipoEspacio === 'aula' || tipoEspacio === 'auditorio') {
            whereConflicto.aula_codigo = codigoEspacio;
        } else {
            whereConflicto.espacio_codigo = codigoEspacio;
        }

        const conflictoReservas = await Reserva.findOne({ where: whereConflicto });

        if (conflictoReservas) {
            return res.status(409).json({ error: "Ya existe una reserva (o solicitud) para este espacio en ese horario." });
        }

        // Determinar estado inicial
        const estadoInicial = (esAuditorio && usuarioRol !== 'admin') ? 'pendiente_aprobacion' : 'activa';

        // Obtener datos del usuario
        const usuario = req.usuario || {};

        // Crear la reserva
        const reservaData = {
            dia: diaSemana.toUpperCase(),
            fecha,
            hora_inicio,
            hora_fin,
            motivo: motivo || 'Reserva de espacio',
            estado: estadoInicial,
            tipo_espacio: tipoEspacio,
            usuario_id: usuarioRol !== 'estudiante' ? usuarioId : null,
            estudiante_id: usuarioRol === 'estudiante' ? usuarioId : null,
            solicitante_nombre: usuario.nombre ? `${usuario.nombre} ${usuario.apellido || ''}`.trim() : 'Usuario Sistema',
            solicitante_cedula: usuario.cedula || null,
            rol_usuario: usuarioRol
        };

        // Asignar el código según el tipo
        if (tipoEspacio === 'aula' || tipoEspacio === 'auditorio') {
            reservaData.aula_codigo = codigoEspacio;
        } else {
            reservaData.espacio_codigo = codigoEspacio;
        }

        const nuevaReserva = await Reserva.create(reservaData);

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

/**
 * @deprecated Esta función está duplicada en searchController.js.
 * Por favor usar searchController.searchAvailability en su lugar.
 * Mantenida por compatibilidad con rutas existentes.
 */
exports.buscarDisponibilidad = async (req, res) => {
    try {
        const { fecha, hora_inicio, hora_fin, tipo, tipo_espacio } = req.query;

        if (!fecha || !hora_inicio || !hora_fin) {
            return res.status(400).json({ error: "Faltan parámetros requeridos (fecha, hora_inicio, hora_fin)" });
        }

        const diaSemana = normalizarDia(fecha);

        // Determinar qué tipo de espacio buscar
        // tipo_espacio puede ser: 'aula', 'espacio', o no estar definido (ambos)
        const buscarAulas = !tipo_espacio || tipo_espacio === 'aula';
        const buscarEspacios = !tipo_espacio || tipo_espacio === 'espacio';

        let aulasLibres = [];
        let espaciosLibres = [];

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
        const reservasExistentes = await Reserva.findAll({
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

        const codigosOcupadosResAula = reservasExistentes
            .filter(r => r.aula_codigo)
            .map(r => r.aula_codigo);
        const codigosOcupadosResEspacio = reservasExistentes
            .filter(r => r.espacio_codigo)
            .map(r => r.espacio_codigo);

        // Buscar aulas disponibles
        if (buscarAulas) {
            const whereAula = {
                estado: 'disponible',
                codigo: {
                    [Op.notIn]: codigosOcupadosResAula.concat(codigosOcupadosClase)
                },
                id: {
                    [Op.notIn]: idsOcupadasDist
                }
            };

            if (tipo && tipo !== 'TODO') {
                whereAula.tipo = tipo;
            }

            aulasLibres = await Aula.findAll({
                where: whereAula,
                order: [['nombre', 'ASC']]
            });
        }

        // Buscar espacios disponibles (biblioteca, salas, etc.)
        if (buscarEspacios) {
            const whereEspacio = {
                estado: 'DISPONIBLE',
                codigo: {
                    [Op.notIn]: codigosOcupadosResEspacio
                }
            };

            if (tipo && tipo !== 'TODO') {
                whereEspacio.tipo = tipo;
            }

            espaciosLibres = await Espacio.findAll({
                where: whereEspacio,
                order: [['nombre', 'ASC']]
            });
        }

        res.json({
            success: true,
            aulas: aulasLibres,
            espacios: espaciosLibres
        });

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

// Listar reservas pendientes de aprobación (admin y director)
exports.listarPendientes = async (req, res) => {
    try {
        const { estado } = req.query;
        const whereClause = {};

        if (estado) {
            whereClause.estado = estado;
        } else {
            whereClause.estado = 'pendiente_aprobacion';
        }

        const reservas = await Reserva.findAll({
            where: whereClause,
            order: [['fecha', 'ASC'], ['hora_inicio', 'ASC']]
        });

        res.json({ success: true, reservas });
    } catch (error) {
        console.error("Error al listar reservas pendientes:", error);
        res.status(500).json({ error: "Error al obtener reservas" });
    }
};

// Aprobar o rechazar una reserva (admin y director)
exports.cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, motivo_rechazo } = req.body;

        const estadosValidos = ['activa', 'rechazada', 'cancelada'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}` });
        }

        const reserva = await Reserva.findByPk(id);
        if (!reserva) {
            return res.status(404).json({ error: "Reserva no encontrada" });
        }

        if (reserva.estado !== 'pendiente_aprobacion' && req.usuarioRol !== 'admin') {
            return res.status(400).json({ error: "Solo se pueden modificar reservas en estado pendiente" });
        }

        reserva.estado = estado;
        if (motivo_rechazo) {
            reserva.motivo = `${reserva.motivo} | Rechazo: ${motivo_rechazo}`;
        }
        await reserva.save();

        const mensaje = estado === 'activa' ? 'Reserva aprobada' :
            estado === 'rechazada' ? 'Reserva rechazada' : 'Reserva cancelada';

        res.json({ success: true, message: mensaje, reserva });
    } catch (error) {
        console.error("Error al cambiar estado de reserva:", error);
        res.status(500).json({ error: "Error al actualizar la reserva" });
    }
};

// Listar TODAS las reservas activas/pendientes (para vista de admin/director)
exports.listarTodas = async (req, res) => {
    try {
        const { fecha, estado } = req.query;
        const whereClause = {};

        if (fecha) {
            whereClause.fecha = fecha;
        } else {
            const ecTime = getEcuadorTime();
            whereClause.fecha = { [Op.gte]: ecTime.toISOString().split('T')[0] };
        }

        if (estado) {
            whereClause.estado = estado;
        } else {
            whereClause.estado = { [Op.in]: ['activa', 'pendiente_aprobacion'] };
        }

        const reservas = await Reserva.findAll({
            where: whereClause,
            order: [['fecha', 'ASC'], ['hora_inicio', 'ASC']]
        });

        res.json({ success: true, reservas });
    } catch (error) {
        console.error("Error al listar todas las reservas:", error);
        res.status(500).json({ error: "Error al obtener reservas" });
    }
};
