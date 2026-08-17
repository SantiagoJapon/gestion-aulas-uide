const path = require('path');
const { Incidencia, User: Usuario, Docente, Carrera, Notificacion } = require('../models');
const { Op } = require('sequelize');
const { obtenerDirectoresDeCarrera } = require('../utils/directorScope');

// ─── Crear incidencia ─────────────────────────────────────────────────────────
exports.crearIncidencia = async (req, res) => {
    try {
        const { titulo, descripcion, tipo, prioridad, aula_codigo } = req.body;
        const usuarioId = req.usuarioId;
        const usuarioRol = req.usuarioRol;

        if (!aula_codigo) {
            return res.status(400).json({ error: 'Debe especificar el código del aula' });
        }
        if (!titulo) {
            return res.status(400).json({ error: 'El título es requerido' });
        }

        // Foto de evidencia (multer diskStorage)
        const foto_path = req.file ? req.file.filename : null;

        // ── Determinar carrera_id del reportante ──────────────────────────────
        let carreraId = null;
        let carreraNombre = null;

        if (usuarioRol === 'profesor' || usuarioRol === 'docente') {
            const docente = await Docente.findOne({
                where: { usuario_id: usuarioId },
                include: [{ model: Carrera, as: 'carrera', attributes: ['id', 'carrera'] }]
            });
            if (docente?.carrera) {
                carreraId = docente.carrera.id;
                carreraNombre = docente.carrera.carrera;
            }
        } else if (usuarioRol === 'director') {
            // Un director puede tener varias carreras asignadas; al reportar una
            // incidencia (caso poco común) usamos la primera como respaldo, ya
            // que no hay forma de saber a cuál de sus carreras se refiere.
            const nombres = req.usuario?.carreraNombres || [];
            const ids = req.usuario?.carreraIds || [];
            if (nombres.length > 0) {
                carreraNombre = nombres[0];
                carreraId = ids[0];
            }
        }

        // ── Crear la incidencia ───────────────────────────────────────────────
        const incidencia = await Incidencia.create({
            titulo,
            descripcion,
            tipo: tipo || 'OTRO',
            prioridad: prioridad || 'MEDIA',
            estado: 'PENDIENTE',
            aula_codigo,
            foto_path,
            carrera_id: carreraId,
            usuario_id: usuarioId
        });

        // ── Notificación in-app a TODOS los directores de la carrera ──────────
        if (carreraId || carreraNombre) {
            const directores = await obtenerDirectoresDeCarrera({ carreraId, carreraNombre });
            for (const director of directores) {
                await Notificacion.create({
                    titulo: `Nueva incidencia en ${aula_codigo}`,
                    mensaje: `${req.usuario?.nombre || 'Un docente'} reportó: ${titulo}`,
                    tipo: 'DIRECTA',
                    prioridad: prioridad === 'ALTA' || prioridad === 'CRITICA' ? 'ALTA' : 'MEDIA',
                    destinatario_id: director.id
                });
            }
        }

        res.status(201).json({ success: true, incidencia });
    } catch (error) {
        console.error('Error al crear incidencia:', error);
        res.status(500).json({ error: 'Error interno' });
    }
};

// ─── Listar incidencias ───────────────────────────────────────────────────────
exports.listarIncidencias = async (req, res) => {
    try {
        const { estado, aula } = req.query;
        let where = {};

        if (estado) where.estado = estado;
        if (aula) where.aula_codigo = aula;

        const rol = req.usuarioRol;

        if (rol === 'admin' || rol === 'soporte') {
            // Admin ve todas
        } else if (rol === 'director') {
            // Director ve las de CUALQUIERA de sus carreras asignadas
            const carreraIds = req.usuario?.carreraIds || [];
            if (carreraIds.length > 0) {
                where.carrera_id = { [Op.in]: carreraIds };
            } else {
                // No tiene ninguna carrera asociada, retornar vacío
                return res.json({ success: true, incidencias: [] });
            }
        } else {
            // Profesor/docente/estudiante: solo las propias
            where.usuario_id = req.usuarioId;
        }

        const incidencias = await Incidencia.findAll({
            where,
            include: [
                { model: Usuario, as: 'reportadoPor', attributes: ['nombre', 'apellido', 'email'] }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ success: true, incidencias });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al listar incidencias' });
    }
};

// ─── Actualizar estado ────────────────────────────────────────────────────────
exports.actualizarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, respuesta_tecnica, nota_director } = req.body;
        const rol = req.usuarioRol;

        if (rol !== 'admin' && rol !== 'soporte' && rol !== 'director') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const incidencia = await Incidencia.findByPk(id);
        if (!incidencia) return res.status(404).json({ error: 'Incidencia no encontrada' });

        // Director solo puede gestionar incidencias de alguna de sus carreras asignadas
        if (rol === 'director' && !(req.usuario?.carreraIds || []).includes(incidencia.carrera_id)) {
            return res.status(403).json({ error: 'Esta incidencia no pertenece a tu carrera' });
        }

        if (estado) incidencia.estado = estado;
        if (respuesta_tecnica) incidencia.respuesta_tecnica = respuesta_tecnica;
        if (nota_director !== undefined) incidencia.nota_director = nota_director;
        if (estado === 'RESUELTO' || estado === 'CERRADO') incidencia.fecha_resolucion = new Date();

        await incidencia.save();

        // ── Notificación in-app al docente que reportó ───────────────────────
        if (estado) {
            await Notificacion.create({
                titulo: 'Actualización en tu reporte',
                mensaje: `Tu incidencia en el aula ${incidencia.aula_codigo} cambió a: ${estado}${nota_director ? ` — "${nota_director}"` : ''}`,
                tipo: 'DIRECTA',
                prioridad: 'BAJA',
                destinatario_id: incidencia.usuario_id
            });
        }

        res.json({ success: true, incidencia });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar incidencia' });
    }
};
