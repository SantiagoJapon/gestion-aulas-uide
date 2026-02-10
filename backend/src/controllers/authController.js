const { User: Usuario, Carrera } = require('../models');
const bcrypt = require('bcryptjs');
const { generarToken } = require('../utils/jwt');

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
            return res.status(401).json({
                success: false,
                mensaje: 'Credenciales inválidas (Usuario no encontrado)'
            });
        }

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, usuario.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                mensaje: 'Credenciales inválidas (Contraseña incorrecta)'
            });
        }

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
            estado: usuario.estado
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

        // Actualizar contraseña (el hook hash los password)
        usuario.password = passwordNuevo;
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
