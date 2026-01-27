/**
 * Protección CSRF (Cross-Site Request Forgery)
 * 
 * Para APIs REST con JWT, la protección CSRF es menos crítica,
 * pero se puede implementar para endpoints que no usan JWT
 * o para protección adicional.
 */

/**
 * Genera un token CSRF
 */
const generateCSRFToken = (req, res, next) => {
  // Solo generar token para métodos que lo requieren
  if (req.method === 'GET' || req.path.includes('/api/auth/login')) {
    // Generar token aleatorio
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // Guardar en sesión (si usas sesiones) o en header
    res.setHeader('X-CSRF-Token', token);
    
    // Para desarrollo, también enviar en respuesta JSON
    if (process.env.NODE_ENV === 'development') {
      res.locals.csrfToken = token;
    }
  }
  next();
};

/**
 * Verifica token CSRF
 * Nota: Para APIs REST con JWT, esto es opcional
 * Se puede usar para endpoints específicos que no requieren autenticación
 */
const verifyCSRFToken = (req, res, next) => {
  // Solo verificar para métodos que modifican datos
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    
    // Si no hay token CSRF pero hay JWT, permitir (JWT ya protege)
    if (!token && req.headers.authorization) {
      return next();
    }
    
    // Verificar token si existe
    // (Implementación simplificada - en producción usar sesiones o Redis)
    if (token && res.locals.csrfToken && token !== res.locals.csrfToken) {
      return res.status(403).json({
        error: 'Token CSRF inválido'
      });
    }
  }
  
  next();
};

module.exports = {
  generateCSRFToken,
  verifyCSRFToken
};






