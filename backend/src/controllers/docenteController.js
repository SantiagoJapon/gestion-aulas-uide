const { Docente, Clase, Carrera, User } = require('../models');
const { QueryTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const whatsappService = require('../services/whatsappService');

/**
 * Función centralizada para loggeo de errores 500
 */
const handle500 = (res, error, context) => {
    console.error(`❌ [500] Error en ${context}:`, error);
    res.status(500).json({
        success: false,
        error: `Error en ${context}`,
        message: error.message
    });
};

/**
 * Función auxiliar para generar un usuario para un docente
 */
const crearUsuarioParaDocente = async (docente, transaction = null) => {
    // Si ya tiene usuario, no hacer nada
    if (docente.usuario_id) return null;

    // Split nombre y apellido
    const partes = docente.nombre.trim().split(' ');
    const nombre = partes[0] || 'Docente';
    const apellido = partes.slice(1).join(' ') || 'UIDE';

    // Generar email único si no tiene
    let email = docente.email;
    if (!email) {
        email = `${nombre.toLowerCase()}.${apellido.toLowerCase().replace(/\s+/g, '')}@docente.uide.edu.ec`;
    }

    // Verificar si el email ya existe para evitar errores
    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
        // Vincular al usuario existente si no tiene docente vinculado
        await docente.update({ usuario_id: existingUser.id }, { transaction });
        return existingUser;
    }

    // Crear el usuario
    const user = await User.create({
        nombre,
        apellido,
        email,
        password: 'uide2024', // Password por defecto solicitado
        rol: 'docente',
        estado: 'activo',
        requiere_cambio_password: true,
        telefono: docente.telefono
    }, { transaction });

    // Vincular al docente
    await docente.update({ usuario_id: user.id }, { transaction });

    return user;
};

/**
 * Obtener lista de docentes con carga y filtros
 */
exports.getDocentes = async (req, res) => {
    try {
        const { carrera_id, tipo, search } = req.query;
        const usuario = req.usuario;

        // Filtros base
        const where = {};
        if (tipo) where.tipo = tipo;
        if (search) {
            where.nombre = { [Op.iLike]: `%${search}%` };
        }

        // Filtrado por carrera
        if (usuario.rol === 'director') {
            const carreraObj = await Carrera.findOne({ where: { carrera: usuario.carrera_director } });
            if (carreraObj) {
                where.carrera_id = carreraObj.id;
            } else {
                return res.json({ success: true, docentes: [] });
            }
        } else if (carrera_id) {
            where.carrera_id = carrera_id;
        }

        // Obtener docentes con su carrera y usuario vinculado
        const docentes = await Docente.findAll({
            where,
            include: [
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'carrera']
                },
                {
                    model: User,
                    as: 'usuario',
                    attributes: ['id', 'email', 'estado', 'requiere_cambio_password']
                }
            ],
            order: [['nombre', 'ASC']]
        });

        // Enriquecer con carga
        const docentesIds = docentes.map(d => d.id);
        let cargaMap = {};

        if (docentesIds.length > 0) {
            // Obtenemos todas las clases de estos docentes
            const todasLasClases = await Clase.findAll({
                where: { docente_id: { [Op.in]: docentesIds } },
                attributes: ['docente_id', 'materia', 'hora_inicio', 'hora_fin']
            });

            // Agrupamos en JS para evitar errores de casteo en SQL (ej: hora_inicio con formato inválido)
            todasLasClases.forEach(clase => {
                if (!cargaMap[clase.docente_id]) {
                    cargaMap[clase.docente_id] = {
                        total_clases: 0,
                        total_minutos: 0,
                        materiasSet: new Set()
                    };
                }

                const stats = cargaMap[clase.docente_id];
                stats.total_clases++;
                if (clase.materia) stats.materiasSet.add(clase.materia);

                // Calcular minutos (formato HH:MM o HH:MM:SS)
                if (clase.hora_inicio && clase.hora_fin) {
                    try {
                        const [h1, m1] = clase.hora_inicio.split(':').map(Number);
                        const [h2, m2] = clase.hora_fin.split(':').map(Number);

                        if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
                            const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
                            if (minutos > 0) stats.total_minutos += minutos;
                        }
                    } catch (e) {
                        // Ignorar errores de parseo de hora individual
                    }
                }
            });

            // Convertir minutos a horas y sets a strings
            Object.keys(cargaMap).forEach(id => {
                const stats = cargaMap[id];
                cargaMap[id] = {
                    total_clases: stats.total_clases,
                    total_horas: (stats.total_minutos / 60).toFixed(1),
                    materias: Array.from(stats.materiasSet).join(', ')
                };
            });
        }

        const result = docentes.map(d => ({
            ...d.toJSON(),
            carga: cargaMap[d.id] || { total_clases: 0, total_horas: "0.0", materias: '' }
        }));

        res.json({
            success: true,
            docentes: result
        });
    } catch (error) {
        handle500(res, error, 'getDocentes');
    }
};

/**
 * Crear un nuevo docente manualmente
 */
exports.createDocente = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { nombre, email, telefono, titulo_pregrado, titulo_posgrado, tipo, carrera_id } = req.body;
        const usuario = req.usuario;

        let finalCarreraId = carrera_id;

        // Si es director, forzar su carrera
        if (usuario.rol === 'director') {
            const carreraObj = await Carrera.findOne({ where: { carrera: usuario.carrera_director } });
            if (!carreraObj) {
                return res.status(404).json({ success: false, message: 'Carrera del director no encontrada' });
            }
            finalCarreraId = carreraObj.id;
        }

        if (!finalCarreraId) {
            return res.status(400).json({ success: false, message: 'Se requiere ID de carrera' });
        }

        const docente = await Docente.create({
            nombre,
            email,
            telefono,
            titulo_pregrado,
            titulo_posgrado,
            tipo: tipo || 'Tiempo Completo',
            carrera_id: finalCarreraId
        }, { transaction });

        // Crear usuario automáticamente
        const user = await crearUsuarioParaDocente(docente, transaction);

        await transaction.commit();

        // Enviar notificación si tiene teléfono
        if (telefono && user) {
            const mensaje = `*UIDE Gestión de Aulas*\n\nHola ${nombre}, se te ha registrado como docente. Tus credenciales son:\n\n📧 *Email:* ${user.email}\n🔑 *Clave:* uide2024\n\n🌐 Accede aquí: ${process.env.FRONTEND_URL || 'http://uide.edu.ec'}`;
            await whatsappService.sendMessage(telefono, mensaje).catch(e => console.error('Error enviando WA:', e));
        }

        res.json({
            success: true,
            docente,
            mensaje: 'Docente creado exitosamente con credenciales de acceso.'
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        handle500(res, error, 'createDocente');
    }
};

/**
 * Obtener detalle de un docente
 */
exports.getDocenteById = async (req, res) => {
    try {
        const { id } = req.params;
        const docente = await Docente.findByPk(id, {
            include: [
                { model: Carrera, as: 'carrera' },
                { model: Clase, as: 'clases' },
                { model: User, as: 'usuario' }
            ]
        });

        if (!docente) {
            return res.status(404).json({ success: false, message: 'Docente no encontrado' });
        }

        res.json({
            success: true,
            docente
        });
    } catch (error) {
        handle500(res, error, 'getDocenteById');
    }
};

/**
 * Actualizar datos de un docente
 */
exports.updateDocente = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, titulo_pregrado, titulo_posgrado, tipo, telefono } = req.body;
        const usuario = req.usuario;

        const docente = await Docente.findByPk(id);
        if (!docente) {
            return res.status(404).json({ success: false, message: 'Docente no encontrado' });
        }

        // Seguridad: Si es director, validar que el docente sea de su carrera
        if (usuario.rol === 'director') {
            const carreraObj = await Carrera.findOne({ where: { carrera: usuario.carrera_director } });
            if (!carreraObj || docente.carrera_id !== carreraObj.id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para editar este docente' });
            }
        }

        await docente.update({
            nombre,
            email,
            titulo_pregrado,
            titulo_posgrado,
            tipo,
            telefono
        });

        res.json({
            success: true,
            docente,
            mensaje: 'Docente actualizado correctamente'
        });
    } catch (error) {
        handle500(res, error, 'updateDocente');
    }
};

/**
 * Actualizar solo el teléfono del docente
 */
exports.updateTelefono = async (req, res) => {
    try {
        const { id } = req.params;
        const { telefono } = req.body;

        const docente = await Docente.findByPk(id);
        if (!docente) return res.status(404).json({ success: false, message: 'Docente no encontrado' });

        await docente.update({ telefono });

        // Si tiene usuario vinculado, actualizar también su teléfono para el bot
        if (docente.usuario_id) {
            await User.update({ telefono }, { where: { id: docente.usuario_id } });
        }

        res.json({ success: true, message: 'Teléfono actualizado' });
    } catch (error) {
        handle500(res, error, 'updateTelefono');
    }
};

/**
 * Generar credenciales masivamente para docentes sin cuenta
 */
exports.generarCredencialesMasivo = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const usuario = req.usuario;
        let { carrera_id } = req.body;
        const where = { usuario_id: null };

        // Si es director, forzar que solo sea su carrera
        if (usuario.rol === 'director') {
            const carreraObj = await Carrera.findOne({ where: { carrera: usuario.carrera_director } });
            if (!carreraObj) {
                return res.status(404).json({ success: false, message: 'Carrera del director no encontrada' });
            }
            carrera_id = carreraObj.id;
        }

        if (carrera_id) where.carrera_id = carrera_id;

        const docentes = await Docente.findAll({ where, transaction });
        let creados = 0;
        let conTelefono = 0;

        for (const docente of docentes) {
            const user = await crearUsuarioParaDocente(docente, transaction);
            if (user) {
                creados++;
                // Enviar WhatsApp si tiene teléfono
                if (docente.telefono) {
                    const mensaje = `*UIDE Gestión de Aulas*\n\nHola ${docente.nombre}, se han generado tus credenciales de acceso:\n\n📧 *Email:* ${user.email}\n🔑 *Clave temporal:* uide2024\n\n_Por seguridad, el sistema te pedirá cambiar tu clave al ingresar._\n\n🌐 Accede aquí: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;
                    await whatsappService.sendMessage(docente.telefono, mensaje);
                    conTelefono++;
                }
            }
        }

        await transaction.commit();
        res.json({
            success: true,
            mensaje: `Se crearon ${creados} cuentas de usuario. ${conTelefono} notificaciones enviadas por WhatsApp.`,
            stats: { creados, notificados: conTelefono }
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        handle500(res, error, 'generarCredencialesMasivo');
    }
};
