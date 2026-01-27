const Joi = require('joi');

/**
 * Esquemas de validación con Joi para prevenir inyección y validar datos
 */

// Esquema para registro de usuario
const registerSchema = Joi.object({
  nombre: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .required()
    .messages({
      'string.pattern.base': 'El nombre solo puede contener letras',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'any.required': 'El nombre es obligatorio'
    }),

  apellido: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .required()
    .messages({
      'string.pattern.base': 'El apellido solo puede contener letras',
      'string.min': 'El apellido debe tener al menos 2 caracteres',
      'string.max': 'El apellido no puede exceder 100 caracteres',
      'any.required': 'El apellido es obligatorio'
    }),

  email: Joi.string()
    .trim()
    .email()
    .custom((value, helpers) => {
      if (!value.toLowerCase().endsWith('@uide.edu.ec')) {
        return helpers.error('string.pattern.base');
      }
      return value;
    })
    .required()
    .messages({
      'string.email': 'Debe proporcionar un email válido',
      'string.pattern.base': 'Debe usar el correo institucional (@uide.edu.ec). No se permiten otros correos como Gmail.',
      'any.required': 'El email es obligatorio'
    }),

  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
      'any.required': 'La contraseña es obligatoria'
    }),

  rol: Joi.string()
    .valid('admin', 'director', 'profesor', 'estudiante', 'docente')
    .default('estudiante')
    .messages({
      'any.only': 'El rol debe ser: admin, director, profesor, estudiante o docente'
    }),

  cedula: Joi.string()
    .trim()
    .optional()
    .allow(null, '', undefined)
    .custom((value, helpers) => {
      // Si está vacío o es null/undefined, es válido
      if (!value || value === '' || value === null || value === undefined) {
        return value; // Retornar el valor original
      }
      // Si se proporciona, validar
      if (value.length !== 10) {
        return helpers.error('string.length');
      }
      if (!/^\d+$/.test(value)) {
        return helpers.error('string.pattern.base');
      }
      return value;
    })
    .messages({
      'string.length': 'La cédula debe tener exactamente 10 dígitos',
      'string.pattern.base': 'La cédula debe contener solo números'
    }),

  telefono: Joi.string()
    .trim()
    .optional()
    .allow(null, '', undefined)
    .custom((value, helpers) => {
      // Si está vacío o es null/undefined, es válido
      if (!value || value === '' || value === null || value === undefined) {
        return value; // Retornar el valor original
      }
      // Si se proporciona, validar
      if (value.length < 7 || value.length > 10) {
        return helpers.error('string.range');
      }
      if (!/^\d+$/.test(value)) {
        return helpers.error('string.pattern.base');
      }
      return value;
    })
    .messages({
      'string.range': 'El teléfono debe tener entre 7 y 10 dígitos',
      'string.pattern.base': 'El teléfono debe contener solo números'
    })
});

// Esquema para login
const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .required()
    .messages({
      'string.email': 'Debe proporcionar un email válido',
      'any.required': 'El email es obligatorio'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña es obligatoria'
    })
});

// Esquema para actualizar perfil
const updateProfileSchema = Joi.object({
  nombre: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'El nombre solo puede contener letras'
    }),

  apellido: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'El apellido solo puede contener letras'
    }),

  telefono: Joi.string()
    .trim()
    .min(7)
    .max(10)
    .pattern(/^\d+$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'El teléfono debe contener solo números'
    }),

  cedula: Joi.string()
    .trim()
    .length(10)
    .pattern(/^\d+$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.length': 'La cédula debe tener exactamente 10 dígitos',
      'string.pattern.base': 'La cédula debe contener solo números'
    })
});

// Esquema para cambiar contraseña
const changePasswordSchema = Joi.object({
  passwordActual: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña actual es obligatoria'
    }),

  passwordNuevo: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número',
      'any.required': 'La nueva contraseña es obligatoria'
    }),

  passwordConfirmacion: Joi.string()
    .valid(Joi.ref('passwordNuevo'))
    .required()
    .messages({
      'any.only': 'Las contraseñas no coinciden',
      'any.required': 'La confirmación de contraseña es obligatoria'
    })
});

/**
 * Middleware de validación genérico
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        campo: detail.path.join('.'),
        mensaje: detail.message
      }));

      return res.status(400).json({
        error: 'Errores de validación',
        detalles: errors
      });
    }

    // Reemplazar req.body con los valores validados y sanitizados
    req.body = value;
    next();
  };
};

module.exports = {
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateUpdateProfile: validate(updateProfileSchema),
  validateChangePassword: validate(changePasswordSchema),
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
};






