const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { sanitizeInput: sanitizeInputUtil } = require('./inputSanitizer');

/**
 * Configuración mejorada de Helmet con políticas de seguridad estrictas
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Permitir inline styles para desarrollo
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
  },
  crossOriginEmbedderPolicy: false, // Para desarrollo, ajustar en producción
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  },
  noSniff: true, // Prevenir MIME type sniffing
  xssFilter: true, // Filtrar XSS
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});

/**
 * Rate limiting para autenticación (más estricto)
 * Previene ataques de fuerza bruta
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Incrementado de 5 a 1000 para pruebas
  message: {
    error: 'Demasiados intentos de autenticación. Por favor intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar requests exitosos
  skipFailedRequests: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido para autenticación desde ${req.ip}`);
    res.status(429).json({
      error: 'Demasiados intentos de autenticación. Por favor intenta de nuevo en 15 minutos.',
      retryAfter: Math.ceil(15 * 60) // Segundos
    });
  }
});

/**
 * Rate limiting general para API (menos estricto)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP cada 15 minutos
  message: {
    error: 'Demasiadas peticiones desde esta IP. Por favor intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido para API desde ${req.ip}`);
    res.status(429).json({
      error: 'Demasiadas peticiones desde esta IP. Por favor intenta de nuevo más tarde.',
      retryAfter: Math.ceil(15 * 60)
    });
  }
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
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido para escritura desde ${req.ip}`);
    res.status(429).json({
      error: 'Demasiadas operaciones de escritura. Por favor intenta de nuevo más tarde.',
      retryAfter: Math.ceil(15 * 60)
    });
  }
});

/**
 * Rate limiting para endpoints de n8n (más permisivo pero controlado)
 */
const n8nLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requests por minuto
  message: {
    error: 'Demasiadas peticiones a n8n. Por favor intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Sanitización de inputs - Usar el sanitizador mejorado
 */
const sanitizeInput = sanitizeInputUtil;

/**
 * Middleware para prevenir ataques de timing en autenticación
 * Compara strings en tiempo constante para evitar timing attacks
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
 * Logging de seguridad mejorado - Registrar intentos sospechosos
 */
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Interceptar respuesta para logging
  res.send = function (data) {
    const duration = Date.now() - startTime;

    // Registrar intentos fallidos de autenticación
    if (req.path.includes('/login') || req.path.includes('/register')) {
      if (res.statusCode === 401 || res.statusCode === 400) {
        console.warn(`[SECURITY] Intento fallido de autenticación:`, {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.get('user-agent'),
          timestamp: new Date().toISOString()
        });
      } else if (res.statusCode === 200 || res.statusCode === 201) {
        console.info(`[SECURITY] Autenticación exitosa:`, {
          ip: req.ip,
          path: req.path,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Registrar accesos a endpoints protegidos
    if (req.path.includes('/api/') && req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(token);
          console.info(`[SECURITY] Acceso autorizado:`, {
            userId: decoded?.id,
            email: decoded?.email,
            rol: decoded?.rol,
            path: req.path,
            method: req.method,
            ip: req.ip,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          // Ignorar errores de decodificación
        }
      }
    }

    // Registrar errores 403 (acceso denegado)
    if (res.statusCode === 403) {
      console.warn(`[SECURITY] Acceso denegado:`, {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
      });
    }

    // Registrar errores 500 (posibles ataques)
    if (res.statusCode === 500) {
      console.error(`[SECURITY] Error del servidor:`, {
        ip: req.ip,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

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
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT|SCRIPT)\b)/gi,
    /(--|;|\*|'|"|`)/g,
    /(\bOR\b.*=.*)/gi,
    /(\bAND\b.*=.*)/gi,
    /(\b1\s*=\s*1\b)/gi,
    /(\b1\s*=\s*'1')/gi
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  // Verificar body, query y params
  if (req.body && checkValue(req.body)) {
    console.warn(`[SECURITY] Posible SQL injection detectado desde ${req.ip}`);
    return res.status(400).json({
      error: 'Datos inválidos detectados'
    });
  }

  if (req.query && checkValue(req.query)) {
    console.warn(`[SECURITY] Posible SQL injection en query desde ${req.ip}`);
    return res.status(400).json({
      error: 'Parámetros de consulta inválidos'
    });
  }

  if (req.params && checkValue(req.params)) {
    console.warn(`[SECURITY] Posible SQL injection en params desde ${req.ip}`);
    return res.status(400).json({
      error: 'Parámetros de ruta inválidos'
    });
  }

  next();
};

module.exports = {
  helmetConfig,
  authLimiter,
  apiLimiter,
  writeLimiter,
  n8nLimiter,
  sanitizeInput,
  securityLogger,
  constantTimeCompare,
  validateOrigin,
  preventSQLInjection
};






