const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { sanitizeInput: sanitizeInputUtil } = require('./inputSanitizer');

/**
 * Middleware para validar que las requests vengan de orígenes permitidos
 */
const validateOrigin = (req, res, next) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000'
  ];

  const origin = req.get('origin');

  // Permitir requests sin origin (Postman, curl, etc.) en desarrollo
  if (process.env.NODE_ENV === 'development' && !origin) {
    return next();
  }

  // En producción, validar origin
  if (process.env.NODE_ENV === 'production' && origin && !allowedOrigins.includes(origin)) {
    console.warn(`[SECURITY] Origen no permitido: ${origin} desde ${req.ip}`);
    return res.status(403).json({
      error: 'Origen no permitido'
    });
  }

  next();
};

/**
 * Middleware para prevenir SQL Injection adicional
 * Valida que los parámetros no contengan patrones peligrosos
 */
const preventSQLInjection = (req, res, next) => {
  // Patrones quirúrgicos que detectan SQL injection real sin bloquear
  // caracteres legítimos como apostrofes en nombres (O'Brien) o guiones
  // dobles en comentarios de texto normal.
  const dangerousPatterns = [
    // UNION SELECT es el ataque de extracción clásico
    /\bUNION\s+(?:ALL\s+)?SELECT\b/gi,
    // Punto y coma seguido de instrucción DDL/DML peligrosa
    /;\s*(?:DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|EXECUTE)\b/gi,
    // Comentario SQL al final de un valor (-- o /*) para truncar queries
    /(?:--|\/-\*)\s*$/g,
    // Clásico 1=1 sin comillas
    /\b1\s*=\s*1\b/g,
    // EXEC / EXECUTE con paréntesis (stored procedures)
    /\bEXEC(?:UTE)?\s*\(/gi,
    // Funciones de sistema peligrosas
    /\b(?:xp_cmdshell|sp_executesql|OPENROWSET|OPENDATASOURCE)\b/gi,
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return dangerousPatterns.some(pattern => {
        pattern.lastIndex = 0; // Resetear estado para flags 'g'
        return pattern.test(value);
      });
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  // Verificar body, query y params
  if (req.body && checkValue(req.body)) {
    console.warn(`[SECURITY] Posible SQL injection detectado desde ${req.ip} en ${req.path}`);
    return res.status(400).json({
      error: 'Datos inválidos detectados'
    });
  }

  if (req.query && checkValue(req.query)) {
    console.warn(`[SECURITY] Posible SQL injection en query desde ${req.ip} en ${req.path}`);
    return res.status(400).json({
      error: 'Parámetros de consulta inválidos'
    });
  }

  if (req.params && checkValue(req.params)) {
    console.warn(`[SECURITY] Posible SQL injection en params desde ${req.ip} en ${req.path}`);
    return res.status(400).json({
      error: 'Parámetros de ruta inválidos'
    });
  }

  next();
};

/**
 * Configuración mejorada de Helmet con políticas de seguridad estrictas
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Para desarrollo, ajustar en producción
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Rate limiting para autenticación (más estricto)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos fallidos por IP — brute-force protection
  message: {
    error: 'Demasiados intentos de autenticación. Por favor intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Los logins exitosos no se cuentan
});

/**
 * Rate limiting general para API (menos estricto)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // más permisivo en desarrollo
  message: {
    error: 'Demasiadas peticiones desde esta IP. Por favor intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting para endpoints de creación/modificación
 */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 operaciones de escritura por IP cada 15 minutos
  message: {
    error: 'Demasiadas operaciones de escritura. Por favor intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Sanitización de inputs - Usar el sanitizador mejorado
 */
const sanitizeInput = sanitizeInputUtil;

/**
 * Middleware para prevenir ataques de timing en autenticación
 */
const constantTimeCompare = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

/**
 * Logging de seguridad - Registrar intentos sospechosos
 */
const securityLogger = (req, res, next) => {
  // Registrar intentos fallidos de autenticación
  if (req.path.includes('/login') || req.path.includes('/register')) {
    const originalSend = res.send;
    res.send = function (data) {
      if (res.statusCode === 401 || res.statusCode === 400) {
        console.warn(`[SECURITY] Intento fallido de autenticación desde ${req.ip} - ${req.path}`);
      }
      return originalSend.call(this, data);
    };
  }

  // Registrar accesos a endpoints protegidos
  if (req.path.includes('/api/') && req.headers.authorization) {
    console.log(`[SECURITY] Acceso autorizado a ${req.path} desde ${req.ip}`);
  }

  next();
};

module.exports = {
  helmetConfig,
  authLimiter,
  apiLimiter,
  writeLimiter,
  sanitizeInput,
  securityLogger,
  constantTimeCompare,
  validateOrigin,
  preventSQLInjection
};

