// jest-setup.js handles env vars before this file loads

const request = require('supertest');
const express = require('express');
const { generarToken } = require('../src/utils/jwt');

// Mock models at top level
jest.mock('../src/models', () => {
  const mockUsers = {
    1: { id: 1, nombre: 'Test', apellido: 'User', email: 'test@uide.edu.ec', rol: 'admin', estado: 'activo', carrera_director: null },
    99: { id: 99, nombre: 'Docente', apellido: 'Test', email: 'docente@uide.edu.ec', rol: 'docente', estado: 'activo', carrera_director: null },
  };
  return {
    User: {
      findByPk: jest.fn().mockImplementation((id) => Promise.resolve(mockUsers[id] || null)),
      findOne: jest.fn().mockImplementation((opts) => Promise.resolve(mockUsers[1] || null)),
    },
    Estudiante: {
      findByPk: jest.fn().mockResolvedValue(null),
    },
    Carrera: {
      findByPk: jest.fn().mockResolvedValue({ id: 1, carrera: 'Sistemas' }),
      findOne: jest.fn().mockResolvedValue({ id: 1, carrera: 'Sistemas' }),
    },
  };
});

const { verificarAuth, verificarRol } = require('../src/middleware/auth');

function createTestApp(middlewares, routeHandler) {
  const app = express();
  app.use(express.json());
  const handler = routeHandler || ((req, res) => {
    res.json({ success: true, usuario: req.usuario, rol: req.usuarioRol });
  });
  if (Array.isArray(middlewares)) {
    app.get('/test', ...middlewares, handler);
  } else {
    app.get('/test', middlewares, handler);
  }
  return app;
}

describe('Auth Middleware', () => {
  describe('verificarAuth', () => {
    it('rechaza request sin token', async () => {
      const app = createTestApp(verificarAuth);
      const res = await request(app).get('/test');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token/i);
    });

    it('rechaza token con formato inválido', async () => {
      const app = createTestApp(verificarAuth);
      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalido');
      expect(res.status).toBe(401);
    });

    it('rechaza token con Bearer mal formado', async () => {
      const app = createTestApp(verificarAuth);
      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Token some-token');
      expect(res.status).toBe(401);
    });

    it('acepta token válido y populate req.usuario', async () => {
      const token = generarToken({ id: 1, email: 'test@uide.edu.ec', rol: 'admin' });
      const app = createTestApp(verificarAuth);
      const res = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rol).toBe('admin');
    });
  });

  describe('verificarRol', () => {
    it('permite acceso con rol correcto', async () => {
      const token = generarToken({ id: 1, email: 'test@uide.edu.ec', rol: 'admin' });
      const app = createTestApp([verificarAuth, verificarRol('admin')]);
      const res = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('rechaza acceso con rol incorrecto', async () => {
      const token = generarToken({ id: 99, email: 'docente@uide.edu.ec', rol: 'docente' });
      const app = createTestApp([verificarAuth, verificarRol('admin')]);
      const res = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('permite acceso con uno de múltiples roles', async () => {
      const token = generarToken({ id: 1, email: 'test@uide.edu.ec', rol: 'director' });
      const app = createTestApp([verificarAuth, verificarRol('admin', 'director')]);
      const res = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });
});
