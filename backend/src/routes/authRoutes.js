const express = require('express');
const router = express.Router();
const {
  registrarUsuario,
  loginUsuario,
  obtenerPerfil,
  actualizarPerfil,
  cambiarPassword,
  cambiarPasswordPrimerIngreso,
  crearDirector
} = require('../controllers/authController');
const { verificarAuth, verificarRol } = require('../middleware/auth');
const {
  validarRegistro,
  validarLogin,
  validarActualizarPerfil,
  validarCambiarPassword
} = require('../middleware/validators');

// Validación adicional con Joi (más robusta) - Opcional
let validateRegisterJoi, validateLoginJoi, validateUpdateProfileJoi, validateChangePasswordJoi;
try {
  const validation = require('../middleware/validation');
  validateRegisterJoi = validation.validateRegister;
  validateLoginJoi = validation.validateLogin;
  validateUpdateProfileJoi = validation.validateUpdateProfile;
  validateChangePasswordJoi = validation.validateChangePassword;
} catch (e) {
  // Si el archivo no existe, usar solo express-validator
  console.warn('[SECURITY] Validación Joi no disponible, usando solo express-validator');
  validateRegisterJoi = (req, res, next) => next();
  validateLoginJoi = (req, res, next) => next();
  validateUpdateProfileJoi = (req, res, next) => next();
  validateChangePasswordJoi = (req, res, next) => next();
}

// ========================================
// RUTAS PÚBLICAS
// ========================================

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario
 * @access  Public
 */
// Validación doble: express-validator + Joi para máxima seguridad
router.post('/register', validarRegistro, validateRegisterJoi, registrarUsuario);

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
// Validación doble: express-validator + Joi
router.post('/login', validarLogin, validateLoginJoi, loginUsuario);

// ========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ========================================

/**
 * @route   GET /api/auth/perfil
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get('/perfil', verificarAuth, obtenerPerfil);

/**
 * @route   PUT /api/auth/perfil
 * @desc    Actualizar perfil del usuario autenticado
 * @access  Private
 */
router.put('/perfil', verificarAuth, validarActualizarPerfil, actualizarPerfil);

/**
 * @route   PUT /api/auth/cambiar-password
 * @desc    Cambiar contraseña del usuario autenticado
 * @access  Private
 */
router.put('/cambiar-password', verificarAuth, validarCambiarPassword, cambiarPassword);

/**
 * @route   PUT /api/auth/primer-ingreso
 * @desc    Cambiar contraseña en el primer ingreso (sin necesitar la temporal)
 * @access  Private (solo si requiere_cambio_password = true)
 */
router.put('/primer-ingreso', verificarAuth, cambiarPasswordPrimerIngreso);

/**
 * @route   POST /api/auth/crear-director
 * @desc    Crear nuevo director con credenciales temporales (envía WhatsApp si tiene teléfono)
 * @access  Private (solo admin)
 */
router.post('/crear-director', verificarAuth, verificarRol('admin'), crearDirector);

module.exports = router;
