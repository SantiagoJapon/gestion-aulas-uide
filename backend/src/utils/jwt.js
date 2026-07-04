const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const msg = 'FATAL: JWT_SECRET no está definido en variables de entorno.';
    const hint = 'Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"';
    if (process.env.NODE_ENV === 'production') {
      console.error(`❌ ${msg}`);
      console.error(`   ${hint}`);
      process.exit(1);
    }
    throw new Error(`${msg} ${hint}`);
  }
  return secret;
}

/**
 * Genera un token JWT para un usuario
 * @param {Object} payload - Datos del usuario a incluir en el token
 * @returns {String} Token JWT
 */
const generarToken = (payload, expiresIn = null) => {
  const { id, email, rol } = payload;

  return jwt.sign(
    { id, email, rol },
    getSecret(),
    {
      expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '1h',
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
    return jwt.verify(token, getSecret(), {
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
