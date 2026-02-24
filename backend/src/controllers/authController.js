const { User: Usuario, Carrera } = require('../models');
const bcrypt = require('bcryptjs');
const { generarToken } = require('../utils/jwt');
const whatsappService = require('../services/whatsappService');

// ==========================================
// REGISTRAR USUARIO
// ==========================================
exports.registrarUsuario = async (req, res) => {
    try {
        const { nombre, apellido, email, password, rol, cedula, telefono } = req.body;

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

        // Crear usuario
        const nuevoUsuario = await Usuario.create({
            nombre,
            apellido,
            email,
            password: password, // El modelo se encargará del hash
            rol: rol || 'estudiante',
            cedula,
            telefono,
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

        // Buscar usuario por email e incluir la Carrera si es director
        const usuario = await Usuario.findOne({
            where: { email },
            include: [
                {
                    model: Carrera,
                    as: 'carrera',
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
            include: [{ model: Carrera, as: 'carrera', required: false }]
        });

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            usuario
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
        const { nombre, apellido, telefono } = req.body;
        const usuario = await Usuario.findByPk(req.usuario.id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        // Actualizar campos
        if (nombre) usuario.nombre = nombre;
        if (apellido) usuario.apellido = apellido;
        if (telefono) usuario.telefono = telefono;

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

        const existente = await Usuario.findOne({ where: { email } });
        if (existente) {
            return res.status(400).json({
                success: false,
                mensaje: 'Ya existe un usuario con ese correo electrónico'
            });
        }

        const passwordTemporal = 'uide2026';
        const nuevo = await Usuario.create({
            nombre,
            apellido,
            email,
            password: passwordTemporal,
            rol: 'director',
            estado: 'activo',
            requiere_cambio_password: true,
            carrera_director,
            telefono: telefono || null
        });

        let whatsapp_enviado = false;
        if (telefono) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const mensaje = `🎓 *UIDE - Sistema de Gestión de Aulas*\n\nHola *${nombre} ${apellido}*, tu cuenta de director ha sido creada.\n\n📧 *Correo:* ${email}\n🔑 *Contraseña temporal:* ${passwordTemporal}\n🏫 *Carrera:* ${carrera_director}\n\n🌐 *Ingresa aquí:* ${frontendUrl}\n\n_Al ingresar por primera vez, el sistema te pedirá cambiar tu contraseña._`;
            try {
                await whatsappService.sendMessage(telefono, mensaje);
                whatsapp_enviado = true;
            } catch (e) {
                console.warn('⚠️ WhatsApp no disponible:', e.message);
            }
        }

        const usuarioData = nuevo.toJSON();
        delete usuarioData.password;

        res.status(201).json({
            success: true,
            usuario: usuarioData,
            credenciales: {
                email,
                password: passwordTemporal,
                whatsapp_enviado
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
