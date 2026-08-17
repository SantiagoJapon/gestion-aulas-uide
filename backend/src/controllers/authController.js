const { User: Usuario, Carrera, DirectorCarrera } = require('../models');
const bcrypt = require('bcryptjs');
const { generarToken } = require('../utils/jwt');
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');

// ==========================================
// REGISTRAR USUARIO
// ==========================================
exports.registrarUsuario = async (req, res) => {
    try {
        const { nombre, apellido, email, password, cedula, telefono } = req.body;

        // Verificar si el usuario ya existe
        const usuarioExistente = await Usuario.findOne({ where: { email } });
        if (usuarioExistente) {
            return res.status(400).json({
                success: false,
                mensaje: 'El correo electrónico ya está registrado'
            });
        }

        // Hashear contraseña (si el hook del modelo no lo hace, lo hacemos aquí por seguridad)
        // Asumiendo que el modelo tiene hook beforeCreate, pero por si acaso:
        // const salt = await bcrypt.genSalt(10);
        // const hashedPassword = await bcrypt.hash(password, salt);

        // Crear usuario — convertir strings vacíos en null para evitar
        // errores de validación del modelo (cedula/telefono son opcionales)
        //
        // El rol NUNCA se toma del body: este endpoint es público y sin
        // autenticación, así que aceptar un `rol` arbitrario permitiría a
        // cualquier visitante autoasignarse admin/director/docente. El
        // autoregistro solo puede crear cuentas de estudiante; el resto de
        // roles se provisionan por rutas protegidas (ej. POST /auth/crear-director).
        const nuevoUsuario = await Usuario.create({
            nombre,
            apellido,
            email,
            password: password,
            rol: 'estudiante',
            cedula: cedula?.trim() || null,
            telefono: telefono?.trim() || null,
            estado: 'activo'
        });

        // Generar token
        const token = generarToken(nuevoUsuario);

        res.status(201).json({
            success: true,
            mensaje: 'Usuario registrado exitosamente',
            token,
            usuario: {
                id: nuevoUsuario.id,
                nombre: nuevoUsuario.nombre,
                apellido: nuevoUsuario.apellido,
                email: nuevoUsuario.email,
                rol: nuevoUsuario.rol
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al registrar usuario',
            error: error.message
        });
    }
};

// ==========================================
// LOGIN USUARIO
// ==========================================
exports.loginUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario por email e incluir sus carreras si es director
        // (carrera: legado/compatibilidad — una sola; carrerasAsignadas: todas)
        const usuario = await Usuario.findOne({
            where: { email },
            include: [
                {
                    model: Carrera,
                    as: 'carrera',
                    required: false
                },
                {
                    model: Carrera,
                    as: 'carrerasAsignadas',
                    attributes: ['id', 'carrera', 'carrera_normalizada'],
                    through: { attributes: [] },
                    required: false
                }
            ]
        });

        if (!usuario) {
            // Mensaje genérico para evitar enumeración de usuarios
            // IMPORTANTE: No revelar si el usuario existe o no
            // DEBUG: Temporalmente loguear para diagnosticar
            console.log(`[AUTH_DEBUG] Usuario no encontrado para email: ${email}`);
            return res.status(401).json({
                success: false,
                mensaje: 'Credenciales inválidas'
            });
        }

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, usuario.password);

        if (!isMatch) {
            // Mismo mensaje genérico para evitar enumeración
            // DEBUG: Temporalmente loguear para diagnosticar
            console.log(`[AUTH_DEBUG] Password incorrecto para usuario: ${usuario.email}`);
            return res.status(401).json({
                success: false,
                mensaje: 'Credenciales inválidas'
            });
        }

        // DEBUG: Verificar estado del usuario
        console.log(`[AUTH_DEBUG] Usuario encontrado: ${usuario.email}, estado: ${usuario.estado}, rol: ${usuario.rol}`);

        // Generar token
        const token = generarToken(usuario);

        // Preparar respuesta
        const carrerasAsignadas = (usuario.carrerasAsignadas || []).map((c) => ({
            id: c.id,
            nombre: c.carrera,
            normalizada: c.carrera_normalizada
        }));

        const usuarioData = {
            id: usuario.id,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            rol: usuario.rol,
            cedula: usuario.cedula,
            telefono: usuario.telefono,
            carrera_director: usuario.carrera_director,
            carrera: usuario.carrera ? {
                id: usuario.carrera.id,
                nombre: usuario.carrera.carrera,
                normalizada: usuario.carrera.carrera_normalizada
            } : null,
            // Lista completa de carreras asignadas (soporta directores con más de una)
            carreras: carrerasAsignadas,
            estado: usuario.estado,
            requiere_cambio_password: usuario.requiere_cambio_password || false
        };

        res.json({
            success: true,
            mensaje: 'Inicio de sesión exitoso',
            token,
            usuario: usuarioData
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al iniciar sesión',
            error: error.message
        });
    }
};

// ==========================================
// OBTENER PERFIL
// ==========================================
exports.obtenerPerfil = async (req, res) => {
    try {
        // Si es estudiante, retornar datos del middleware directamente
        if (req.usuarioRol === 'estudiante') {
            return res.json({
                success: true,
                usuario: req.usuario
            });
        }

        const usuario = await Usuario.findByPk(req.usuario.id, {
            attributes: { exclude: ['password'] },
            include: [
                { model: Carrera, as: 'carrera', required: false },
                {
                    model: Carrera,
                    as: 'carrerasAsignadas',
                    attributes: ['id', 'carrera', 'carrera_normalizada'],
                    through: { attributes: [] },
                    required: false
                }
            ]
        });

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        const usuarioJson = usuario.toJSON();
        usuarioJson.carreras = (usuarioJson.carrerasAsignadas || []).map((c) => ({
            id: c.id,
            nombre: c.carrera,
            normalizada: c.carrera_normalizada
        }));
        delete usuarioJson.carrerasAsignadas;

        res.json({
            success: true,
            usuario: usuarioJson
        });

    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al obtener perfil',
            error: error.message
        });
    }
};

// ==========================================
// ACTUALIZAR PERFIL
// ==========================================
exports.actualizarPerfil = async (req, res) => {
    try {
        const { nombre, apellido, telefono, email, cedula } = req.body;
        const usuario = await Usuario.findByPk(req.usuario.id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        // Verificar si el email ya está en uso por otro usuario
        if (email && email !== usuario.email) {
            const emailExistente = await Usuario.findOne({ where: { email } });
            if (emailExistente && emailExistente.id !== usuario.id) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'El correo electrónico ya está en uso por otro usuario'
                });
            }
        }

        // Verificar si la cédula ya está en uso por otro usuario
        if (cedula && cedula !== usuario.cedula) {
            const cedulaExistente = await Usuario.findOne({ where: { cedula } });
            if (cedulaExistente && cedulaExistente.id !== usuario.id) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'La cédula ya está en uso por otro usuario'
                });
            }
        }

        // Actualizar campos
        if (nombre) usuario.nombre = nombre;
        if (apellido) usuario.apellido = apellido;
        if (telefono !== undefined) usuario.telefono = telefono;
        if (email) usuario.email = email;
        if (cedula) usuario.cedula = cedula;

        await usuario.save();

        // Devolver usuario actualizado sin password
        const usuarioActualizado = usuario.toJSON();
        delete usuarioActualizado.password;

        res.json({
            success: true,
            mensaje: 'Perfil actualizado exitosamente',
            usuario: usuarioActualizado
        });

    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al actualizar perfil',
            error: error.message
        });
    }
};

// ==========================================
// CAMBIAR CONTRASENA
// ==========================================
exports.cambiarPassword = async (req, res) => {
    try {
        const { passwordActual, passwordNuevo } = req.body;
        const usuario = await Usuario.findByPk(req.usuario.id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        // Verificar contraseña actual
        const isMatch = await bcrypt.compare(passwordActual, usuario.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                mensaje: 'La contraseña actual es incorrecta'
            });
        }

        // Actualizar contraseña y limpiar flag de cambio obligatorio
        usuario.password = passwordNuevo;
        usuario.requiere_cambio_password = false;
        await usuario.save();

        res.json({
            success: true,
            mensaje: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al cambiar contraseña',
            error: error.message
        });
    }
};

// ==========================================
// CAMBIAR CONTRASEÑA PRIMER INGRESO
// Solo funciona si requiere_cambio_password = true
// No necesita la contraseña actual (es temporal)
// ==========================================
exports.cambiarPasswordPrimerIngreso = async (req, res) => {
    try {
        const { passwordNuevo } = req.body;
        const usuario = await Usuario.findByPk(req.usuario.id);

        if (!usuario) {
            return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
        }

        if (!usuario.requiere_cambio_password) {
            return res.status(400).json({
                success: false,
                mensaje: 'Esta cuenta ya tiene una contraseña personal establecida'
            });
        }

        if (!passwordNuevo || passwordNuevo.length < 8) {
            return res.status(400).json({
                success: false,
                mensaje: 'La nueva contraseña debe tener al menos 8 caracteres'
            });
        }

        // Validar que cumpla con los requisitos de seguridad
        const tieneMayuscula = /[A-Z]/.test(passwordNuevo);
        const tieneMinuscula = /[a-z]/.test(passwordNuevo);
        const tieneNumero = /\d/.test(passwordNuevo);

        if (!tieneMayuscula || !tieneMinuscula || !tieneNumero) {
            return res.status(400).json({
                success: false,
                mensaje: 'La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número'
            });
        }

        usuario.password = passwordNuevo;
        usuario.requiere_cambio_password = false;
        await usuario.save();

        res.json({
            success: true,
            mensaje: 'Contraseña establecida exitosamente. Ya puedes usar el sistema.'
        });

    } catch (error) {
        console.error('Error al cambiar contraseña primer ingreso:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al establecer contraseña',
            error: error.message
        });
    }
};

// ==========================================
// CREAR DIRECTOR (solo admin)
// ==========================================
exports.crearDirector = async (req, res) => {
    try {
        const { nombre, apellido, email, telefono, carrera_director } = req.body;

        if (!nombre || !apellido || !email || !carrera_director) {
            return res.status(400).json({
                success: false,
                mensaje: 'nombre, apellido, email y carrera_director son obligatorios'
            });
        }

        // Validar que el email sea institucional
        if (!email.endsWith('@uide.edu.ec')) {
            return res.status(400).json({
                success: false,
                mensaje: 'El correo debe ser institucional (@uide.edu.ec)'
            });
        }

        const existente = await Usuario.findOne({ where: { email } });
        if (existente) {
            return res.status(400).json({
                success: false,
                mensaje: 'Ya existe un usuario con ese correo electrónico'
            });
        }

        // Generar contraseña temporal segura y aleatoria
        const passwordTemporal = emailService.generarPasswordTemporal(12);
        const passwordExpira = emailService.generarTokenExpiracion(24); // 24 horas

        const nuevo = await Usuario.create({
            nombre,
            apellido,
            email,
            password: passwordTemporal,
            rol: 'director',
            estado: 'activo',
            requiere_cambio_password: true,
            passwordTemporal_expira: passwordExpira,
            carrera_director,
            telefono: telefono || null
        });

        // Registrar también en la tabla puente director_carreras — esta es la
        // fuente de verdad para el soporte de múltiples carreras por director.
        // Sin esto, un director recién creado solo existiría en el campo legado
        // y perdería esta carrera en cuanto se le asigne una segunda.
        const carreraInicial = await Carrera.findOne({ where: { carrera: carrera_director } });
        if (carreraInicial) {
            await DirectorCarrera.create({ usuario_id: nuevo.id, carrera_id: carreraInicial.id });
        }

        let whatsapp_enviado = false;
        let email_enviado = false;
        let email_error = null;

        // Enviar notificación por email (principal)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const emailResult = await emailService.enviarCredenciales({
            email,
            nombre: `${nombre} ${apellido}`,
            passwordTemporal,
            rol: 'director',
            linkAcceso: frontendUrl
        });

        if (emailResult.success) {
            email_enviado = true;
            console.log('✅ Email enviado exitosamente a:', email);
        } else {
            email_error = emailResult.error;
            console.warn('⚠️ Error enviando email:', email_error);
        }

        // Enviar también WhatsApp como respaldo (si tiene teléfono)
        if (telefono) {
            const mensaje = `🎓 *UIDE - Sistema de Gestión de Aulas*\n\nBuenas tardes *${nombre} ${apellido}*, tus credenciales han sido generadas. Por favor revisa tu correo para obtener tu acceso al sistema.`;
            try {
                await whatsappService.sendMessage(telefono, mensaje);
                whatsapp_enviado = true;
            } catch (e) {
                console.warn('⚠️ WhatsApp no disponible:', e.message);
            }
        }

        const usuarioData = nuevo.toJSON();
        delete usuarioData.password;
        delete usuarioData.passwordTemporal_expira;

        res.status(201).json({
            success: true,
            usuario: usuarioData,
            credenciales: {
                email,
                password: passwordTemporal,
                whatsapp_enviado,
                email_enviado,
                email_error,
                expira_en: '24 horas'
            }
        });

    } catch (error) {
        console.error('Error al crear director:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al crear director',
            error: error.message
        });
    }
};
// ==========================================
// SOLICITAR RECUPERACION DE CONTRASEÑA
// ==========================================
exports.solicitarRecuperacionPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const usuario = await Usuario.findOne({ where: { email } });

        // El usuario pidió validar que el correo sí esté registrado
        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'No existe una cuenta asociada a este correo electrónico'
            });
        }

        // Generar un token único
        const token = require('crypto').randomBytes(20).toString('hex');

        // Guardar token y expiración (1 hora)
        usuario.token_recuperacion = token;
        usuario.token_expira = new Date(Date.now() + 3600000); // 1 hora
        await usuario.save();

        // Enviar email
        const result = await emailService.enviarRecuperacionPassword({
            email: usuario.email,
            nombre: `${usuario.nombre} ${usuario.apellido}`,
            tokenRecuperacion: token
        });

        // Si el SMTP falla no bloqueamos al usuario: el token ya está en DB.
        // El admin puede reenviar manualmente si es necesario.
        if (!result.success) {
            console.error('⚠️ Email de recuperación no enviado:', result.error);
        }

        res.json({
            success: true,
            mensaje: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña'
        });

    } catch (error) {
        console.error('Error al solicitar recuperación:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al procesar la solicitud de recuperación',
            error: error.message
        });
    }
};

// ==========================================
// RESETEAR CONTRASEÑA CON TOKEN
// ==========================================
exports.resetearPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        const { Op } = require('sequelize');
        const usuario = await Usuario.findOne({
            where: {
                token_recuperacion: token,
                token_expira: {
                    [Op.gt]: new Date()
                }
            }
        });

        if (!usuario) {
            return res.status(400).json({
                success: false,
                mensaje: 'El enlace de recuperación es inválido o ha expirado'
            });
        }

        // Actualizar contraseña y limpiar token
        usuario.password = password;
        usuario.token_recuperacion = null;
        usuario.token_expira = null;
        usuario.requiere_cambio_password = false; // Por si acaso era una cuenta nueva

        await usuario.save();

        res.json({
            success: true,
            mensaje: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.'
        });

    } catch (error) {
        console.error('Error al resetear contraseña:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al restablecer la contraseña',
            error: error.message
        });
    }
};
