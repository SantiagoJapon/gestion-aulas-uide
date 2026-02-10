const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('⚠️  ADVERTENCIA: JWT_SECRET no está definido. Usando secreto por defecto. NO usar en producción.');
}
const SECRET = JWT_SECRET || 'dev-only-secret-cambiar-en-produccion';

/**
 * Genera un token JWT para un usuario
 * @param {Object} payload - Datos del usuario a incluir en el token
 * @returns {String} Token JWT
 */
const generarToken = (payload, expiresIn = null) => {
  const { id, email, rol } = payload;

  return jwt.sign(
    { id, email, rol },
    SECRET,
    {
      expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '1h', // Usar el proporcionado o el default
      issuer: 'gestion-aulas-uide',
      audience: 'gestion-aulas-uide-users',
      algorithm: 'HS256'
    }
  );
};

/**
 * Verifica y decodifica un token JWT
 * @param {String} token - Token JWT a verificar
 * @returns {Object} Datos decodificados del token
 * @throws {Error} Si el token es inválido
 */
const verificarToken = (token) => {
  try {
    return jwt.verify(token, SECRET, {
      issuer: 'gestion-aulas-uide',
      audience: 'gestion-aulas-uide-users',
      algorithms: ['HS256']
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    }
    throw new Error('Error al verificar el token');
  }
};

/**
 * Decodifica un token sin verificarlo (útil para debugging)
 * @param {String} token - Token JWT a decodificar
 * @returns {Object} Datos decodificados del token
 */
const decodificarToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generarToken,
  verificarToken,
  decodificarToken
};
