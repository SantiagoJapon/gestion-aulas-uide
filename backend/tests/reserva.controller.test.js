// jest-setup.js handles env vars before this file loads

const request = require('supertest');
const express = require('express');
const { generarToken } = require('../src/utils/jwt');

// Mock models
jest.mock('../src/models', () => {
  // Mock factories — each call to findByPk returns a fresh copy
  const reservaData = {
    1: {
      id: 1, aula_codigo: 'AULA-101', dia: 'Lunes', fecha: '2026-07-10',
      hora_inicio: '08:00', hora_fin: '10:00', estado: 'pendiente_aprobacion',
      usuario_id: 1, solicitante_nombre: 'Docente Sistemas', motivo: 'Clase especial',
      usuario: { id: 1, nombre: 'Docente', carrera_director: 'Ingenieria en Sistemas' },
    },
    2: {
      id: 2, aula_codigo: 'AULA-202', dia: 'Martes', fecha: '2026-07-11',
      hora_inicio: '10:00', hora_fin: '12:00', estado: 'pendiente_aprobacion',
      usuario_id: 3, solicitante_nombre: 'Docente Derecho', motivo: 'Tutoria',
      usuario: { id: 3, nombre: 'Docente2', carrera_director: 'Derecho' },
    },
    3: {
      id: 3, aula_codigo: 'AULA-303', dia: 'Miercoles', fecha: '2026-07-12',
      hora_inicio: '14:00', hora_fin: '16:00', estado: 'rechazada',
      usuario_id: 1, solicitante_nombre: 'Docente Sistemas', motivo: 'Evento',
      usuario: { id: 1, nombre: 'Docente', carrera_director: 'Ingenieria en Sistemas' },
    },
    4: {
      id: 4, aula_codigo: 'AULA-404', dia: 'Jueves', fecha: '2026-07-13',
      hora_inicio: '08:00', hora_fin: '10:00', estado: 'cancelada',
      usuario_id: 1, solicitante_nombre: 'Docente Sistemas', motivo: 'Seminario',
      usuario: { id: 1, nombre: 'Docente', carrera_director: 'Ingenieria en Sistemas' },
    },
    5: {
      id: 5, aula_codigo: 'AULA-505', dia: 'Viernes', fecha: '2026-07-14',
      hora_inicio: '10:00', hora_fin: '12:00', estado: 'activa',
      usuario_id: 1, solicitante_nombre: 'Docente Sistemas', motivo: 'Conferencia',
      usuario: { id: 1, nombre: 'Docente', carrera_director: 'Ingenieria en Sistemas' },
    },
  };

  const freshReserva = (id) => {
    const base = reservaData[id];
    if (!base) return null;
    return { ...base, save: jest.fn().mockResolvedValue(true) };
  };

  return {
    Reserva: {
      findByPk: jest.fn().mockImplementation((id) => Promise.resolve(freshReserva(Number(id)))),
      findAll: jest.fn().mockImplementation(() =>
        Promise.resolve(Object.keys(reservaData).map(id => freshReserva(Number(id))))
      ),
      findAndCountAll: jest.fn().mockImplementation(() =>
        Promise.resolve({
          rows: Object.keys(reservaData).map(id => freshReserva(Number(id))),
          count: Object.keys(reservaData).length,
        })
      ),
    },
    User: {
      findByPk: jest.fn().mockImplementation((id) => {
        const users = {
          1: { id: 1, nombre: 'Director', rol: 'director', carrera_director: 'Ingenieria en Sistemas', estado: 'activo' },
          2: { id: 2, nombre: 'Admin', rol: 'admin', carrera_director: null, estado: 'activo' },
          5: { id: 5, nombre: 'Docente', rol: 'docente', carrera_director: null, estado: 'activo' },
        };
        return Promise.resolve(users[id] || null);
      }),
      findOne: jest.fn().mockResolvedValue(null),
    },
    Estudiante: { findByPk: jest.fn().mockResolvedValue(null) },
    Aula: { findAll: jest.fn().mockResolvedValue([]) },
    Clase: { findAll: jest.fn().mockResolvedValue([]) },
    Distribucion: { findAll: jest.fn().mockResolvedValue([]) },
    Espacio: { findAll: jest.fn().mockResolvedValue([]) },
    Notificacion: { create: jest.fn() },
    Carrera: {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.carrera === 'Ingenieria en Sistemas') return Promise.resolve({ id: 1, carrera: 'Ingenieria en Sistemas' });
        if (where.carrera === 'Derecho') return Promise.resolve({ id: 2, carrera: 'Derecho' });
        return Promise.resolve(null);
      }),
    },
  };
});

jest.mock('../src/services/n8n.service', () => ({
  emit: jest.fn().mockResolvedValue(true),
}));

const reservaRoutes = require('../src/routes/reservaRoutes');
const app = express();
app.use(express.json());
app.use('/api/reservas', reservaRoutes);

describe('Reserva Controller - Access Control', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/reservas/todas', () => {
    it('admin ve todas las reservas', async () => {
      const token = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });
      const res = await request(app)
        .get('/api/reservas/todas')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('docente no puede acceder a /todas', async () => {
      const token = generarToken({ id: 5, email: 'doc@uide.edu.ec', rol: 'docente' });
      const res = await request(app)
        .get('/api/reservas/todas')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/reservas/pendientes', () => {
    it('admin ve todas las pendientes', async () => {
      const token = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });
      const res = await request(app)
        .get('/api/reservas/pendientes')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('docente no puede ver pendientes', async () => {
      const token = generarToken({ id: 5, email: 'doc@uide.edu.ec', rol: 'docente' });
      const res = await request(app)
        .get('/api/reservas/pendientes')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/reservas/:id/estado', () => {
    it('admin puede cambiar estado', async () => {
      const token = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });
      const res = await request(app)
        .patch('/api/reservas/1/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'activa' });
      expect(res.status).toBe(200);
    });

    it('estado inválido retorna 400', async () => {
      const token = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });
      const res = await request(app)
        .patch('/api/reservas/1/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'invalido' });
      expect(res.status).toBe(400);
    });

    it('reserva inexistente retorna 404', async () => {
      const token = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });
      const res = await request(app)
        .patch('/api/reservas/999/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'activa' });
      expect(res.status).toBe(404);
    });

    // ── Tests de máquina de estados ──────────────────────────

    it('no puede cambiar reserva rechazada (terminal)', async () => {
      const token = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });
      const res = await request(app)
        .patch('/api/reservas/3/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'activa' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/terminal|inválida/i);
    });

    it('no puede cambiar reserva cancelada (terminal)', async () => {
      const token = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });
      const res = await request(app)
        .patch('/api/reservas/4/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'activa' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/terminal|inválida/i);
    });

    it('admin puede aprobar reserva pendiente → activa', async () => {
      const token = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });
      const res = await request(app)
        .patch('/api/reservas/1/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'activa' });
      expect(res.status).toBe(200);
    });

    it('admin puede rechazar reserva pendiente → rechazada', async () => {
      const token = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });
      const res = await request(app)
        .patch('/api/reservas/2/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'rechazada' });
      expect(res.status).toBe(200);
    });

    it('no puede cambiar reserva activa a rechazada (solo cancelada)', async () => {
      const token = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });
      const res = await request(app)
        .patch('/api/reservas/5/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'rechazada' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inválida/i);
    });
  });
});
