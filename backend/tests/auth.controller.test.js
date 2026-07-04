// jest-setup.js handles env vars before this file loads

const request = require('supertest');
const express = require('express');

// Mock all database-dependent modules at top level
jest.mock('../src/models', () => {
  const bcrypt = require('bcryptjs');
  const mockUser = {
    id: 1,
    nombre: 'Admin',
    apellido: 'Test',
    email: 'admin@uide.edu.ec',
    password: bcrypt.hashSync('uide2024', 10),
    rol: 'admin',
    estado: 'activo',
    carrera_director: null,
    cedula: '1234567890',
    telefono: '0999999999',
    toJSON() { return { ...this }; },
  };
  return {
    User: {
      findByPk: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
    },
    Estudiante: {
      findByPk: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue(null),
    },
    Carrera: {
      findByPk: jest.fn().mockResolvedValue({ id: 1, carrera: 'Sistemas' }),
      findOne: jest.fn().mockResolvedValue({ id: 1, carrera: 'Sistemas' }),
      findAll: jest.fn().mockResolvedValue([]),
    },
    Notificacion: { create: jest.fn() },
    Docente: { findOne: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
    Clase: { findAll: jest.fn().mockResolvedValue([]) },
    Distribucion: { findAll: jest.fn().mockResolvedValue([]) },
    Aula: { findAll: jest.fn().mockResolvedValue([]) },
    Espacio: { findAll: jest.fn().mockResolvedValue([]) },
    PlanificacionSubida: { findAll: jest.fn().mockResolvedValue([]) },
    Reserva: { findAll: jest.fn().mockResolvedValue([]), findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }) },
    ReporteHistorial: { findAll: jest.fn().mockResolvedValue([]), findByPk: jest.fn() },
    Periodo: { findAll: jest.fn().mockResolvedValue([]) },
    HistorialCarga: { findAll: jest.fn().mockResolvedValue([]) },
    Incidencia: { findAll: jest.fn().mockResolvedValue([]) },
    MateriaCatalogo: { findAll: jest.fn().mockResolvedValue([]) },
    EstudianteMateria: { findAll: jest.fn().mockResolvedValue([]) },
  };
});

jest.mock('../src/services/emailService', () => ({
  enviarCredenciales: jest.fn().mockResolvedValue(true),
  enviarRecuperacionPassword: jest.fn().mockResolvedValue(true),
  enviarNotificacionDirector: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/services/whatsappService', () => ({
  notificarDirectorNuevoDocente: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/services/n8n.service', () => ({
  emit: jest.fn().mockResolvedValue(true),
  healthCheck: jest.fn().mockResolvedValue({ ok: true }),
}));

const authRoutes = require('../src/routes/authRoutes');
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Controller', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('rechaza login sin credenciales', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });

    it('rechaza login con email inválido', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noemail', password: 'test' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/register', () => {
    it('rechaza registro sin campos requeridos', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/perfil', () => {
    it('rechaza sin token', async () => {
      const res = await request(app)
        .get('/api/auth/perfil');
      expect(res.status).toBe(401);
    });
  });
});
