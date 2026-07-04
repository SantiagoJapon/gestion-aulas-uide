const { generarToken, verificarToken, decodificarToken } = require('../src/utils/jwt');

describe('JWT Utils', () => {
  const testPayload = { id: 1, email: 'test@uide.edu.ec', rol: 'admin' };

  describe('generarToken', () => {
    it('genera un token string válido', () => {
      const token = generarToken(testPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('genera tokens diferentes para diferentes payloads', () => {
      const token1 = generarToken({ id: 1, email: 'a@uide.edu.ec', rol: 'admin' });
      const token2 = generarToken({ id: 2, email: 'b@uide.edu.ec', rol: 'docente' });
      expect(token1).not.toBe(token2);
    });

    it('acepta expiresIn personalizado', () => {
      const token = generarToken(testPayload, '2h');
      expect(typeof token).toBe('string');
    });
  });

  describe('verificarToken', () => {
    it('verifica un token válido y retorna el payload', () => {
      const token = generarToken(testPayload);
      const decoded = verificarToken(token);
      expect(decoded.id).toBe(testPayload.id);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.rol).toBe(testPayload.rol);
    });

    it('lanza error con token inválido', () => {
      expect(() => verificarToken('invalid-token')).toThrow('Token inválido');
    });

    it('lanza error con token de otro secret', () => {
      const jwt = require('jsonwebtoken');
      const fakeToken = jwt.sign(testPayload, 'wrong-secret', { algorithm: 'HS256' });
      expect(() => verificarToken(fakeToken)).toThrow();
    });

    it('lanza error con token expirado', () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        testPayload,
        process.env.JWT_SECRET,
        { expiresIn: '0s', algorithm: 'HS256' }
      );
      expect(() => verificarToken(expiredToken)).toThrow('Token expirado');
    });
  });

  describe('decodificarToken', () => {
    it('decodifica un token sin verificar', () => {
      const token = generarToken(testPayload);
      const decoded = decodificarToken(token);
      expect(decoded.id).toBe(testPayload.id);
      expect(decoded.email).toBe(testPayload.email);
    });

    it('decodifica un token inválido (sin verificar signature)', () => {
      const jwt = require('jsonwebtoken');
      const fakeToken = jwt.sign(testPayload, 'wrong-secret', { algorithm: 'HS256' });
      const decoded = decodificarToken(fakeToken);
      expect(decoded).toBeTruthy();
      expect(decoded.id).toBe(testPayload.id);
    });
  });
});
