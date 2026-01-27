const validator = require('validator');

/**
 * Sanitizar y validar inputs de usuario
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Sanitizar strings
        obj[key] = validator.escape(obj[key].trim());
        
        // Remover caracteres peligrosos
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/data:text\/html/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        sanitizeObject(obj[key]);
      } else if (Array.isArray(obj[key])) {
        obj[key] = obj[key].map(item => {
          if (typeof item === 'string') {
            return validator.escape(item.trim());
          }
          return item;
        });
      }
    }
  };

  // Sanitizar body, query y params
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

/**
 * Validar email
 */
const validateEmail = (email) => {
  return validator.isEmail(email) && 
         validator.normalizeEmail(email) &&
         email.endsWith('@uide.edu.ec');
};

/**
 * Validar que no contenga SQL injection patterns
 */
const validateNoSQLInjection = (input) => {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(--|;|\*|'|"|`)/g,
    /(\bOR\b.*=.*)/gi,
    /(\bAND\b.*=.*)/gi
  ];

  return !dangerousPatterns.some(pattern => pattern.test(input));
};

module.exports = {
  sanitizeInput,
  validateEmail,
  validateNoSQLInjection
};

