const { Clase, Aula, Docente, Reserva } = require('../models');
const { Op } = require('sequelize');

// Helper para obtener el día actual normalizado
const getDiaActual = () => {
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    return dias[new Date().getDay()];
};

// Helper para obtener la hora actual en formato HH:MM
const getHoraActual = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
};

/**
 * Consulta la ubicación actual de un docente
 * GET /api/busqueda/docente?q=nombre
 */
exports.buscarDocente = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ error: "Debe proporcionar un nombre o apellido" });

        const diaHoy = getDiaActual();
        const horaAhora = getHoraActual();

        // 1. Buscar al docente por nombre/apellido
        const docentes = await Docente.findAll({
            where: {
                [Op.or]: [
                    { nombre: { [Op.iLike]: `%${q}%` } },
                    { apellido: { [Op.iLike]: `%${q}%` } }
                ]
            },
            limit: 5
        });

        if (docentes.length === 0) {
            return res.status(404).json({ success: false, message: "No se encontró al docente" });
        }

        const resultados = [];

        for (const docente of docentes) {
            // Buscar si tiene una clase AHORA
            const claseActual = await Clase.findOne({
                where: {
                    docente_id: docente.id,
                    dia: diaHoy,
                    hora_inicio: { [Op.lte]: horaAhora },
                    hora_fin: { [Op.gt]: horaAhora }
                },
                include: [{ model: Aula, as: 'aula' }]
            });

            if (claseActual) {
                resultados.push({
                    docente: `${docente.nombre} ${docente.apellido}`,
                    estado: 'EN_CLASE',
                    materia: claseActual.materia,
                    aula: claseActual.aula?.nombre || claseActual.aula_asignada,
                    edificio: claseActual.aula?.edificio || 'S/E',
                    piso: claseActual.aula?.piso,
                    hora_fin: claseActual.hora_fin
                });
            } else {
                // Buscar la PRÓXIMA clase de hoy
                const proximaClase = await Clase.findOne({
                    where: {
                        docente_id: docente.id,
                        dia: diaHoy,
                        hora_inicio: { [Op.gt]: horaAhora }
                    },
                    order: [['hora_inicio', 'ASC']],
                    include: [{ model: Aula, as: 'aula' }]
                });

                resultados.push({
                    docente: `${docente.nombre} ${docente.apellido}`,
                    estado: proximaClase ? 'PROXIMA_CLASE' : 'SIN_ACTIVIDAD_HOY',
                    materia: proximaClase?.materia,
                    aula: proximaClase?.aula?.nombre || proximaClase?.aula_asignada,
                    hora_inicio: proximaClase?.hora_inicio
                });
            }
        }

        res.json({ success: true, resultados });
    } catch (error) {
        console.error("Error en búsqueda de docente:", error);
        res.status(500).json({ error: "Error interno en la búsqueda" });
    }
};

/**
 * Consulta el estado actual de un aula
 * GET /api/busqueda/aula?codigo=A101
 */
exports.estadoAula = async (req, res) => {
    try {
        const { codigo } = req.query;
        if (!codigo) return res.status(400).json({ error: "Se requiere el código del aula" });

        const diaHoy = getDiaActual();
        const horaAhora = getHoraActual();
        const fechaHoy = new Date().toISOString().split('T')[0];

        // 1. Verificar si hay clase programada ahora
        const claseAhora = await Clase.findOne({
            where: {
                aula_asignada: codigo,
                dia: diaHoy,
                hora_inicio: { [Op.lte]: horaAhora },
                hora_fin: { [Op.gt]: horaAhora }
            }
        });

        if (claseAhora) {
            return res.json({
                success: true,
                estado: 'OCUPADA_CLASE',
                detalles: {
                    actividad: claseAhora.materia,
                    responsable: claseAhora.docente,
                    hasta: claseAhora.hora_fin
                }
            });
        }

        // 2. Verificar si hay una reserva activa ahora
        const reservaAhora = await Reserva.findOne({
            where: {
                aula_codigo: codigo,
                fecha: fechaHoy,
                estado: 'activa',
                hora_inicio: { [Op.lte]: horaAhora },
                hora_fin: { [Op.gt]: horaAhora }
            }
        });

        if (reservaAhora) {
            return res.json({
                success: true,
                estado: 'RESERVADA',
                detalles: {
                    actividad: reservaAhora.motivo || 'Reserva Privada',
                    responsable: reservaAhora.solicitante_nombre,
                    hasta: reservaAhora.hora_fin
                }
            });
        }

        res.json({
            success: true,
            estado: 'LIBRE',
            mensaje: 'El espacio se encuentra disponible en este momento'
        });

    } catch (error) {
        console.error("Error en estado de aula:", error);
        res.status(500).json({ error: "Error interno" });
    }
};
