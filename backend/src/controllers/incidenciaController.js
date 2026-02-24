const path = require('path');
const { Incidencia, User: Usuario, Docente, Carrera, Notificacion } = require('../models');
const { Op } = require('sequelize');

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
            const user = await Usuario.findByPk(usuarioId, { attributes: ['carrera_director'] });
            if (user?.carrera_director) {
                const carrera = await Carrera.findOne({ where: { carrera: user.carrera_director } });
                if (carrera) {
                    carreraId = carrera.id;
                    carreraNombre = carrera.carrera;
                }
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

        // ── Notificación in-app al director de la carrera ────────────────────
        if (carreraNombre) {
            const director = await Usuario.findOne({
                where: { rol: 'director', carrera_director: carreraNombre }
            });
            if (director) {
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
            // Director ve las de su carrera
            const user = await Usuario.findByPk(req.usuarioId, { attributes: ['carrera_director'] });
            if (user?.carrera_director) {
                const carrera = await Carrera.findOne({ where: { carrera: user.carrera_director } });
                if (carrera) {
                    where.carrera_id = carrera.id;
                } else {
                    // No hay carrera asociada, retornar vacío
                    return res.json({ success: true, incidencias: [] });
                }
            }
        } else {
            // Profesor/docente: solo las propias
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

        // Director solo puede gestionar incidencias de su carrera
        if (rol === 'director') {
            const user = await Usuario.findByPk(req.usuarioId, { attributes: ['carrera_director'] });
            const carrera = user?.carrera_director
                ? await Carrera.findOne({ where: { carrera: user.carrera_director } })
                : null;
            if (!carrera || incidencia.carrera_id !== carrera.id) {
                return res.status(403).json({ error: 'Esta incidencia no pertenece a tu carrera' });
            }
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
