const { Docente, Clase, Carrera, User } = require('../models');
const { QueryTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');

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
 * Función auxiliar para generar un usuario para un docente de forma inteligente
 */
const crearUsuarioParaDocente = async (docente, transaction = null) => {
    // Si ya tiene usuario, no hacer nada
    if (docente.usuario_id) return null;

    // Títulos comunes para limpiar del nombre
    const titulos = ['Ing.', 'Dr.', 'Dra.', 'Abg.', 'Mag.', 'Msc.', 'Mgs.', 'Lic.', 'Phd.', 'Psic.', 'Arq.'];
    let nombreLimpio = docente.nombre.trim();
    let tituloEncontrado = '';

    // Extraer título si existe al inicio
    for (const t of titulos) {
        if (nombreLimpio.toLowerCase().startsWith(t.toLowerCase())) {
            tituloEncontrado = t;
            nombreLimpio = nombreLimpio.substring(t.length).trim();
            break;
        }
    }

    // Split nombre y apellido del nombre limpio
    const partes = nombreLimpio.split(' ');
    const nombre = partes[0] || 'Docente';
    const apellido = partes.slice(1).join(' ') || 'UIDE';

    // Generar email único basado en nombre limpio
    let email = docente.email;
    if (!email) {
        // Formato: nombre.apellido@uide.edu.ec (sin espacios ni caracteres especiales)
        const nom = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const ape = apellido.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        email = `${nom}.${ape}@docente.uide.edu.ec`;
    }

    // Verificar colisión de email autogenerado (si ya existe, añadir sufijo)
    let finalEmail = email;
    let counter = 1;
    while (await User.findOne({ where: { email: finalEmail }, transaction })) {
        const [userPart, domainPart] = email.split('@');
        finalEmail = `${userPart}${counter}@${domainPart}`;
        counter++;
    }

    // Crear el usuario con password temporal segura
    const passwordTemporal = emailService.generarPasswordTemporal(12);
    const passwordExpira = emailService.generarTokenExpiracion(24);

    const user = await User.create({
        nombre,
        apellido,
        email: finalEmail,
        password: passwordTemporal,
        rol: 'docente',
        estado: 'activo',
        requiere_cambio_password: true,
        passwordTemporal_expira: passwordExpira,
        telefono: docente.telefono
    }, { transaction });

    // Vincular al docente
    await docente.update({
        usuario_id: user.id,
        // Si no tenía título y encontramos uno, ponerlo como título de pregrado provisionalmente
        ...(tituloEncontrado && !docente.titulo_pregrado && { titulo_pregrado: tituloEncontrado })
    }, { transaction });

    return { user, passwordTemporal };
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

        // Validar y convertir carrera_id a número si es necesario
        let carreraIdNum = carrera_id;
        if (carrera_id && typeof carrera_id === 'string') {
            if (carrera_id.startsWith('dir_')) {
                // Es un ID de director, no una carrera - ignorar
                carreraIdNum = null;
            } else {
                const parsed = parseInt(carrera_id, 10);
                if (isNaN(parsed)) {
                    return res.status(400).json({ success: false, message: 'ID de carrera inválido' });
                }
                carreraIdNum = parsed;
            }
        }

        // Filtrado por carrera
        if (usuario.rol === 'director') {
            const carreraObj = await Carrera.findOne({ where: { carrera: usuario.carrera_director } });
            if (carreraObj) {
                where.carrera_id = carreraObj.id;
            } else {
                return res.json({ success: true, docentes: [] });
            }
        } else if (carreraIdNum) {
            where.carrera_id = carreraIdNum;
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

        // ── INCLUIR DIRECTORES QUE NO TIENEN REGISTRO PROPIO EN docentes ──
        // Los directores de carrera también imparten clases y deben aparecer como docentes.
        let directoresComoDocentes = [];
        if (usuario.rol === 'admin' || usuario.rol === 'director') {
            // IDs de usuarios ya vinculados a un registro en docentes
            const usuariosYaEnDocentes = docentes.map(d => d.usuario_id).filter(Boolean);

            const whereDirectores = {
                rol: 'director',
                estado: 'activo',
                id: { [Op.notIn]: usuariosYaEnDocentes.length > 0 ? usuariosYaEnDocentes : [0] }
            };

            // Si el admin filtró por carrera, filtrar directores de esa carrera
            if (carrera_id) {
                const carreraObj = await Carrera.findByPk(carrera_id);
                if (carreraObj) whereDirectores.carrera_director = carreraObj.carrera;
            }

            // Filtro de búsqueda para directores
            if (search) {
                whereDirectores[Op.or] = [
                    { nombre: { [Op.iLike]: `%${search}%` } },
                    { apellido: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const directores = await User.findAll({
                where: whereDirectores,
                attributes: ['id', 'nombre', 'apellido', 'email', 'telefono', 'carrera_director', 'estado', 'requiere_cambio_password'],
                order: [['nombre', 'ASC']]
            });

            directoresComoDocentes = directores.map(d => ({
                id: `dir_${d.id}`,
                nombre: `${d.nombre} ${d.apellido}`.trim(),
                email: d.email,
                telefono: d.telefono,
                titulo_pregrado: null,
                titulo_posgrado: null,
                tipo: 'Director de Carrera',
                carrera_id: null,
                usuario_id: d.id,
                usuario: {
                    id: d.id,
                    email: d.email,
                    estado: d.estado,
                    requiere_cambio_password: d.requiere_cambio_password
                },
                carrera: null,
                es_director: true,
                carrera_director: d.carrera_director,
                carga: { total_clases: 0, total_horas: '0.0', materias: '' }
            }));
        }

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

        // Fusionar docentes normales + directores que también son docentes
        const todos = [...result, ...directoresComoDocentes];

        res.json({
            success: true,
            docentes: todos
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

        // Validar que carrera_id sea un número válido
        let finalCarreraId = carrera_id;
        if (typeof finalCarreraId === 'string') {
            // Si es un string como "dir_3" o cualquier otro valor no numérico, convertir a número
            const parsed = parseInt(finalCarreraId, 10);
            if (isNaN(parsed)) {
                return res.status(400).json({ success: false, message: 'ID de carrera inválido' });
            }
            finalCarreraId = parsed;
        }

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
        const result = await crearUsuarioParaDocente(docente, transaction);
        const user = result?.user;
        const passwordTemporal = result?.passwordTemporal;

        await transaction.commit();

        let email_enviado = false;
        let whatsapp_enviado = false;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Enviar notificación por email (principal)
        if (user && passwordTemporal) {
            const emailResult = await emailService.enviarCredenciales({
                email: user.email,
                nombre: nombre,
                passwordTemporal,
                rol: 'docente',
                linkAcceso: frontendUrl
            });
            email_enviado = emailResult.success;
        }

        // Enviar también WhatsApp como respaldo (si tiene teléfono)
        if (telefono && user && passwordTemporal) {
            const mensaje = `🎓 *UIDE - Sistema de Gestión de Aulas*\n\nBuenas tardes *${nombre}*, tus credenciales han sido generadas. Por favor revisa tu correo para obtener tu acceso al sistema.`;
            try {
                await whatsappService.sendMessage(telefono, mensaje);
                whatsapp_enviado = true;
            } catch (e) {
                console.warn('⚠️ WhatsApp no disponible:', e.message);
            }
        }

        res.json({
            success: true,
            docente,
            credenciales: user ? {
                email: user.email,
                password: passwordTemporal,
                email_enviado,
                whatsapp_enviado,
                expira_en: '24 horas'
            } : null,
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
 * Si el docente no tenía cuenta y se añade email/teléfono, se crea la cuenta y se envía WhatsApp.
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

        const tenia_cuenta = !!docente.usuario_id;
        const tenia_telefono = !!docente.telefono;

        await docente.update({ nombre, email, titulo_pregrado, titulo_posgrado, tipo, telefono });

        let credenciales = null;

        // Si el docente no tenía cuenta y ahora tiene email o teléfono → crear cuenta
        if (!tenia_cuenta && (email || telefono)) {
            const result = await crearUsuarioParaDocente(docente);
            if (result) {
                const { user, passwordTemporal } = result;
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                let email_enviado = false;
                let whatsapp_enviado = false;

                const emailResult = await emailService.enviarCredenciales({
                    email: user.email,
                    nombre: docente.nombre,
                    passwordTemporal,
                    rol: 'docente',
                    linkAcceso: frontendUrl
                });
                email_enviado = emailResult.success;

                if (telefono) {
                    const msg = `🎓 *UIDE - Sistema de Gestión de Aulas*\n\nBuenas tardes *${docente.nombre}*, tus credenciales han sido generadas. Por favor revisa tu correo para obtener tu acceso al sistema.`;
                    whatsapp_enviado = await whatsappService.sendMessage(telefono, msg).catch(() => false);
                }
                credenciales = { email: user.email, password: passwordTemporal, email_enviado, whatsapp_enviado };
            }
        } else if (tenia_cuenta && telefono && !tenia_telefono) {
            // Tenía cuenta pero acaba de recibir teléfono → recordatorio de acceso
            const user = await User.findByPk(docente.usuario_id, { attributes: ['email'] });
            if (user) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const msg = `🎓 *UIDE - Sistema de Gestión de Aulas*\n\nHola *${docente.nombre}*, recuerda que ya tienes acceso al sistema.\n\n📧 *Correo:* ${user.email}\n🌐 *Ingresa aquí:* ${frontendUrl}\n\n_Si olvidaste tu contraseña, solicita ayuda al administrador._`;
                whatsappService.sendMessage(telefono, msg).catch(e => console.warn('WA error:', e.message));
            }
        }

        res.json({
            success: true,
            docente,
            credenciales,
            mensaje: credenciales ? 'Docente actualizado y cuenta creada exitosamente.' : 'Docente actualizado correctamente'
        });
    } catch (error) {
        handle500(res, error, 'updateDocente');
    }
};

/**
 * Crear cuenta de acceso para un docente individual (sin cuenta previa)
 */
exports.crearCuentaDocente = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = req.usuario;

        // ── FLUJO ESPECIAL PARA DIRECTORES (id = 'dir_X') ──
        // Los directores se listan como docentes pero su registro real está en 'usuarios'
        if (String(id).startsWith('dir_')) {
            const userId = parseInt(id.replace('dir_', ''), 10);
            if (isNaN(userId)) {
                return res.status(400).json({ success: false, message: 'ID de director inválido' });
            }

            const dirUser = await User.findByPk(userId);
            if (!dirUser) return res.status(404).json({ success: false, message: 'Director no encontrado' });
            if (dirUser.rol !== 'director') return res.status(400).json({ success: false, message: 'El usuario no es director' });

            // Verificar si el director ya tiene una cuenta activa (ya cambió su contraseña)
            // Los directores se crean con requiere_cambio_password = true
            // Si ya lo cambió, significa que ya activó su cuenta
            if (!dirUser.requiere_cambio_password) {
                return res.status(400).json({ success: false, message: 'Este director ya activó su cuenta' });
            }

            // Generar contraseña temporal segura
            const passwordTemporal = emailService.generarPasswordTemporal(12);
            const passwordExpira = emailService.generarTokenExpiracion(24);
            dirUser.password = passwordTemporal;
            dirUser.requiere_cambio_password = true;
            dirUser.passwordTemporal_expira = passwordExpira;
            await dirUser.save();

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const nombreCompleto = `${dirUser.nombre} ${dirUser.apellido}`.trim();

            // Enviar email
            let email_enviado = false;
            const emailResult = await emailService.enviarCredenciales({
                email: dirUser.email,
                nombre: nombreCompleto,
                passwordTemporal,
                rol: 'director',
                linkAcceso: frontendUrl
            });
            email_enviado = emailResult.success;

            // Enviar WhatsApp como respaldo
            let whatsapp_enviado = false;
            if (dirUser.telefono) {
                const msg = `🎓 *UIDE - Sistema de Gestión de Aulas*\n\nBuenas tardes *${nombreCompleto}*, tus credenciales han sido generadas. Por favor revisa tu correo para obtener tu acceso al sistema.`;
                try {
                    whatsapp_enviado = await whatsappService.sendMessage(dirUser.telefono, msg);
                } catch (e) {
                    console.warn('⚠️ WhatsApp no disponible:', e.message);
                }
            }

            return res.json({
                success: true,
                credenciales: { email: dirUser.email, password: passwordTemporal, email_enviado, whatsapp_enviado },
                mensaje: `Credenciales generadas para el director ${nombreCompleto}${email_enviado ? ' — Email enviado' : ''}`
            });
        }

        // ── FLUJO NORMAL PARA DOCENTES ──
        const docente = await Docente.findByPk(id, {
            include: [{ model: Carrera, as: 'carrera', attributes: ['id', 'carrera'] }]
        });
        if (!docente) return res.status(404).json({ success: false, message: 'Docente no encontrado' });

        // Seguridad: director solo puede gestionar su carrera
        if (usuario.rol === 'director') {
            const carreraObj = await Carrera.findOne({ where: { carrera: usuario.carrera_director } });
            if (!carreraObj || docente.carrera_id !== carreraObj.id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para gestionar este docente' });
            }
        }

        let user;
        let isNew = false;

        if (docente.usuario_id) {
            // Ya tiene cuenta — solo reenviar credenciales si aún no la ha activado
            user = await User.findByPk(docente.usuario_id);
            if (!user) {
                return res.status(500).json({ success: false, message: 'Error: cuenta vinculada no encontrada' });
            }
            if (!user.requiere_cambio_password) {
                return res.status(400).json({ success: false, message: 'Este docente ya activó su cuenta y no puede restablecerse desde aquí' });
            }
            // Generar nueva contraseña temporal segura
            const passwordTemporal = emailService.generarPasswordTemporal(12);
            user.password = passwordTemporal;
            user.requiere_cambio_password = true;
            user.passwordTemporal_expira = emailService.generarTokenExpiracion(24);
            if (docente.email && docente.email !== user.email) {
                const emailEnUso = await User.findOne({ where: { email: docente.email } });
                if (!emailEnUso) user.email = docente.email;
            }
            await user.save();

            // Enviar email con nueva contraseña
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            let email_enviado = false;
            const emailResult = await emailService.enviarCredenciales({
                email: user.email,
                nombre: docente.nombre,
                passwordTemporal,
                rol: 'docente',
                linkAcceso: frontendUrl
            });
            email_enviado = emailResult.success;

            let whatsapp_enviado = false;
            if (docente.telefono) {
                const frontendUrl2 = process.env.FRONTEND_URL || 'http://localhost:5173';
                const msg = `🎓 *UIDE - Sistema de Gestión de Aulas*\n\nBuenas tardes *${docente.nombre}*, tus credenciales han sido restablecidas. Por favor revisa tu correo para obtener tu nueva contraseña temporal.`;
                try { whatsapp_enviado = await whatsappService.sendMessage(docente.telefono, msg); } catch (e) { }
            }

            return res.json({
                success: true,
                credenciales: { email: user.email, password: passwordTemporal, email_enviado, whatsapp_enviado },
                mensaje: 'Credenciales restablecidas exitosamente'
            });
        } else {
            const result = await crearUsuarioParaDocente(docente);
            if (!result) return res.status(500).json({ success: false, message: 'No se pudo crear la cuenta' });
            user = result.user;
            const passwordTemporal = result.passwordTemporal;
            isNew = true;

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            let email_enviado = false;
            const emailResult = await emailService.enviarCredenciales({
                email: user.email,
                nombre: docente.nombre,
                passwordTemporal,
                rol: 'docente',
                linkAcceso: frontendUrl
            });
            email_enviado = emailResult.success;

            let whatsapp_enviado = false;
            if (docente.telefono) {
                const msg = `🎓 *UIDE - Sistema de Gestión de Aulas*\n\nBuenas tardes *${docente.nombre}*, tus credenciales han sido generadas. Por favor revisa tu correo para obtener tu acceso al sistema.`;
                try { whatsapp_enviado = await whatsappService.sendMessage(docente.telefono, msg); } catch (e) { }
            }

            const statusCode = isNew ? 201 : 200;
            return res.status(statusCode).json({
                success: true,
                credenciales: { email: user.email, password: passwordTemporal, email_enviado, whatsapp_enviado },
                mensaje: 'Cuenta creada exitosamente'
            });
        }
    } catch (error) {
        handle500(res, error, 'crearCuentaDocente');
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
        const cuentasCreadas = [];

        for (const docente of docentes) {
            const result = await crearUsuarioParaDocente(docente, transaction);
            if (result) {
                creados++;
                cuentasCreadas.push({ docente, user: result.user, passwordTemporal: result.passwordTemporal });
            }
        }

        await transaction.commit();

        // Enviar notificaciones después del commit
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        for (const { docente, user, passwordTemporal } of cuentasCreadas) {
            emailService.enviarCredenciales({
                email: user.email,
                nombre: docente.nombre,
                passwordTemporal,
                rol: 'docente',
                linkAcceso: frontendUrl
            }).catch(e => console.warn(`⚠️ Email no enviado a ${user.email}:`, e.message));

            if (docente.telefono) {
                const mensaje = `🎓 *UIDE - Sistema de Gestión de Aulas*\n\nBuenas tardes *${docente.nombre}*, tus credenciales han sido generadas. Por favor revisa tu correo para obtener tu acceso al sistema.`;
                whatsappService.sendMessage(docente.telefono, mensaje).catch(e => console.warn('WA error:', e.message));
                conTelefono++;
            }
        }
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
