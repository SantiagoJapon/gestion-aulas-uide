const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Utilidades mejoradas de JWT con refresh tokens y rotación
 */

const JWT_SECRET = process.env.JWT_SECRET || 'supersecreto123';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Genera un token JWT de acceso (corto)
 */
const generarAccessToken = (payload) => {
  const { id, email, rol } = payload;

  return jwt.sign(
    { 
      id, 
      email, 
      rol,
      type: 'access'
    },
    JWT_SECRET,
    { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'gestion-aulas-uide',
      audience: 'gestion-aulas-uide-users',
      algorithm: 'HS256',
      jwtid: crypto.randomBytes(16).toString('hex') // JWT ID único
    }
  );
};

/**
 * Genera un token JWT de refresh (largo)
 */
const generarRefreshToken = (payload) => {
  const { id, email } = payload;

  return jwt.sign(
    { 
      id, 
      email,
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    { 
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'gestion-aulas-uide',
      audience: 'gestion-aulas-uide-users',
      algorithm: 'HS256',
      jwtid: crypto.randomBytes(16).toString('hex')
    }
  );
};

/**
 * Genera ambos tokens (access y refresh)
 */
const generarTokens = (payload) => {
  return {
    accessToken: generarAccessToken(payload),
    refreshToken: generarRefreshToken(payload),
    expiresIn: JWT_EXPIRES_IN
  };
};

/**
 * Verifica un token de acceso
 */
const verificarAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'gestion-aulas-uide',
      audience: 'gestion-aulas-uide-users',
      algorithms: ['HS256']
    });

    if (decoded.type !== 'access') {
      throw new Error('Token inválido: no es un token de acceso');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    }
    throw error;
  }
};

/**
 * Verifica un token de refresh
 */
const verificarRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'gestion-aulas-uide',
      audience: 'gestion-aulas-uide-users',
      algorithms: ['HS256']
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Token inválido: no es un token de refresh');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token de refresh expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token de refresh inválido');
    }
    throw error;
  }
};

/**
 * Decodifica un token sin verificarlo (útil para debugging)
 */
const decodificarToken = (token) => {
  return jwt.decode(token);
};

/**
 * Función de compatibilidad con el código existente
 */
const generarToken = generarAccessToken;
const verificarToken = verificarAccessToken;

module.exports = {
  generarAccessToken,
  generarRefreshToken,
  generarTokens,
  verificarAccessToken,
  verificarRefreshToken,
  decodificarToken,
  // Compatibilidad
  generarToken,
  verificarToken
};






