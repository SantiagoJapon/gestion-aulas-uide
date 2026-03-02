const { body, validationResult } = require('express-validator');

/**
 * Middleware para manejar los errores de validación
 */
const manejarErroresValidacion = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Errores de validación',
      detalles: errors.array().map(err => ({
        campo: err.path,
        mensaje: err.msg,
        valor: err.value
      }))
    });
  }

  next();
};

/**
 * Validadores para el registro de usuarios
 */
const validarRegistro = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras'),

  body('apellido')
    .trim()
    .notEmpty().withMessage('El apellido es obligatorio')
    .isLength({ min: 2, max: 100 }).withMessage('El apellido debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El apellido solo puede contener letras'),

  body('email')
    .trim()
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Debe proporcionar un email válido')
    .custom((value) => {
      if (!value.toLowerCase().endsWith('@uide.edu.ec')) {
        throw new Error('Debe usar el correo institucional (@uide.edu.ec). No se permiten otros correos como Gmail.');
      }
      return true;
    })
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),

  body('rol')
    .optional()
    .isIn(['admin', 'director', 'profesor', 'docente', 'estudiante']).withMessage('El rol debe ser: admin, director, profesor, docente o estudiante'),

  body('cedula')
    .optional({ values: 'falsy' })
    .custom((value) => {
      // Si no se proporciona o está vacío, es válido
      if (!value || value === '' || value === null || value === undefined) {
        return true;
      }
      // Si se proporciona, validar
      const trimmed = String(value).trim();
      if (trimmed.length > 0) {
        if (trimmed.length !== 10) {
          throw new Error('La cédula debe tener exactamente 10 dígitos');
        }
        if (!/^\d+$/.test(trimmed)) {
          throw new Error('La cédula debe contener solo números');
        }
      }
      return true;
    }),

  body('telefono')
    .optional({ values: 'falsy' })
    .custom((value) => {
      // Si no se proporciona o está vacío, es válido
      if (!value || value === '' || value === null || value === undefined) {
        return true;
      }
      // Si se proporciona, validar
      const trimmed = String(value).trim();
      if (trimmed.length > 0) {
        if (trimmed.length < 7 || trimmed.length > 10) {
          throw new Error('El teléfono debe tener entre 7 y 10 dígitos');
        }
        if (!/^\d+$/.test(trimmed)) {
          throw new Error('El teléfono debe contener solo números');
        }
      }
      return true;
    }),

  manejarErroresValidacion
];

/**
 * Validadores para el login
 */
const validarLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Debe proporcionar un email válido')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria'),

  manejarErroresValidacion
];

/**
 * Validadores para actualizar perfil
 */
const validarActualizarPerfil = [
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras'),

  body('apellido')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('El apellido debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El apellido solo puede contener letras'),

  body('telefono')
    .optional()
    .trim()
    .isLength({ min: 7, max: 10 }).withMessage('El teléfono debe tener entre 7 y 10 dígitos')
    .isNumeric().withMessage('El teléfono debe contener solo números'),

  body('cedula')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .custom((value) => {
      if (value && value.length > 0) {
        if (value.length !== 10) {
          throw new Error('La cédula debe tener exactamente 10 dígitos');
        }
        if (!/^\d+$/.test(value)) {
          throw new Error('La cédula debe contener solo números');
        }
      }
      return true;
    }),

  manejarErroresValidacion
];

/**
 * Validadores para cambiar contraseña
 */
const validarCambiarPassword = [
  body('passwordActual')
    .notEmpty().withMessage('La contraseña actual es obligatoria'),

  body('passwordNuevo')
    .notEmpty().withMessage('La nueva contraseña es obligatoria')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),

  body('passwordConfirmacion')
    .notEmpty().withMessage('La confirmación de contraseña es obligatoria')
    .custom((value, { req }) => {
      if (value !== req.body.passwordNuevo) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    }),

  manejarErroresValidacion
];

/**
 * Validadores para solicitar recuperación de contraseña
 */
const validarSolicitarRecuperacion = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Debe proporcionar un email válido')
    .normalizeEmail(),

  manejarErroresValidacion
];

/**
 * Validadores para resetear contraseña
 */
const validarResetearPassword = [
  body('token')
    .notEmpty().withMessage('El token es obligatorio'),

  body('password')
    .notEmpty().withMessage('La nueva contraseña es obligatoria')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),

  manejarErroresValidacion
];

module.exports = {
  validarRegistro,
  validarLogin,
  validarActualizarPerfil,
  validarCambiarPassword,
  validarSolicitarRecuperacion,
  validarResetearPassword,
  manejarErroresValidacion
};
