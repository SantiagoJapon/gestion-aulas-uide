// Test de wiring HTTP + RBAC del controller (Fase 4). La lógica de negocio
// (máquina de estados, advisory lock, motor heurístico) ya está cubierta
// en planificacionCarrera.service.test.js / distribucion.service.fillGaps.test.js
// / *.concurrencia.test.js — aquí solo se prueba: rutas montadas, auth real
// (verificarAuth/verificarRol/verificarAdmin reales, sin mock), passthrough
// correcto al servicio (mockeado), y mapeo de errores a status codes.

// jest-setup.js handles env vars before this file loads

const request = require('supertest');
const express = require('express');
const { generarToken } = require('../src/utils/jwt');

jest.mock('../src/models', () => ({
  User: {
    findByPk: jest.fn().mockImplementation((id) => {
      const users = {
        1: { id: 1, nombre: 'Director', apellido: 'Uno', rol: 'director', carrera_director: null, estado: 'activo' },
        2: { id: 2, nombre: 'Admin', apellido: 'Sistema', rol: 'admin', carrera_director: null, estado: 'activo' },
        5: { id: 5, nombre: 'Docente', apellido: 'X', rol: 'docente', carrera_director: null, estado: 'activo' },
      };
      return Promise.resolve(users[id] || null);
    }),
  },
  Estudiante: { findByPk: jest.fn().mockResolvedValue(null) },
  DirectorCarrera: {
    // Director id=1 tiene asignada solo la carrera 10
    findAll: jest.fn().mockImplementation(({ where }) => {
      if (where.usuario_id === 1) return Promise.resolve([{ carrera_id: 10 }]);
      return Promise.resolve([]);
    }),
  },
  Carrera: {
    findAll: jest.fn().mockImplementation(({ where }) => {
      const ids = where?.id || [];
      const catalogo = { 10: { id: 10, carrera: 'Ingenieria' } };
      return Promise.resolve(ids.map((id) => catalogo[id]).filter(Boolean));
    }),
  },
  Clase: { findByPk: jest.fn() },
  FlujoPlanificacion: { findOne: jest.fn().mockResolvedValue(null) },
  BloqueDisponibilidad: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../src/services/planificacionCarrera.service', () => ({
  reabrirBorrador: jest.fn(),
  sugerirAula: jest.fn(),
  enviarPlanificacion: jest.fn(),
  confirmarPlanificacion: jest.fn(),
  extenderFechaLimite: jest.fn(),
  detectarCarrerasSinEnviar: jest.fn(),
  aplicarDistribucionFillGaps: jest.fn(),
  crearPreviewDistribucion: jest.fn(),
  aplicarPreviewDistribucion: jest.fn(),
  obtenerMetricasTrazabilidad: jest.fn(),
  obtenerHistorialBloque: jest.fn(),
  reasignacionExcepcional: jest.fn(),
}));

jest.mock('../src/services/distribucion.service', () => ({
  calcularDistribucionFillGaps: jest.fn(),
}));

const models = require('../src/models');
const planificacionCarreraService = require('../src/services/planificacionCarrera.service');
const distribucionService = require('../src/services/distribucion.service');

const planificacionCarreraRoutes = require('../src/routes/planificacionCarreraRoutes');
const app = express();
app.use(express.json());
app.use('/api/planificacion-colaborativa', planificacionCarreraRoutes);

const tokenDirector = generarToken({ id: 1, email: 'director@uide.edu.ec', rol: 'director' });
const tokenAdmin = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });
const tokenDocente = generarToken({ id: 5, email: 'docente@uide.edu.ec', rol: 'docente' });

beforeEach(() => {
  jest.clearAllMocks();
  models.User.findByPk.mockImplementation((id) => {
    const users = {
      1: { id: 1, nombre: 'Director', apellido: 'Uno', rol: 'director', carrera_director: null, estado: 'activo' },
      2: { id: 2, nombre: 'Admin', apellido: 'Sistema', rol: 'admin', carrera_director: null, estado: 'activo' },
      5: { id: 5, nombre: 'Docente', apellido: 'X', rol: 'docente', carrera_director: null, estado: 'activo' },
    };
    return Promise.resolve(users[id] || null);
  });
  models.DirectorCarrera.findAll.mockImplementation(({ where }) => {
    if (where.usuario_id === 1) return Promise.resolve([{ carrera_id: 10 }]);
    return Promise.resolve([]);
  });
  models.Carrera.findAll.mockImplementation(({ where }) => {
    const ids = where?.id || [];
    const catalogo = { 10: { id: 10, carrera: 'Ingenieria' } };
    return Promise.resolve(ids.map((id) => catalogo[id]).filter(Boolean));
  });
});

describe('planificacionCarreraRoutes — auth', () => {
  test('sin token: 401 en cualquier endpoint', async () => {
    const res = await request(app).get('/api/planificacion-colaborativa/10/estado');
    expect(res.status).toBe(401);
  });

  test('rol no autorizado (docente): 403 en endpoint de director', async () => {
    const res = await request(app)
      .post('/api/planificacion-colaborativa/10/reabrir')
      .set('Authorization', `Bearer ${tokenDocente}`)
      .send({});
    expect(res.status).toBe(403);
  });

  test('rol director en endpoint admin-exclusivo: 403', async () => {
    const res = await request(app)
      .post('/api/planificacion-colaborativa/admin/fill-gaps/calcular')
      .set('Authorization', `Bearer ${tokenDirector}`)
      .send({});
    expect(res.status).toBe(403);
  });
});

describe('planificacionCarreraRoutes — propiedad de carrera (director)', () => {
  test('director sobre carrera QUE NO tiene asignada: 403, servicio nunca se llama', async () => {
    const res = await request(app)
      .post('/api/planificacion-colaborativa/99/reabrir')
      .set('Authorization', `Bearer ${tokenDirector}`)
      .send({});
    expect(res.status).toBe(403);
    expect(planificacionCarreraService.reabrirBorrador).not.toHaveBeenCalled();
  });

  test('director sobre SU carrera (10): pasa, servicio se llama con los parámetros correctos', async () => {
    planificacionCarreraService.reabrirBorrador.mockResolvedValue({ id: 1, estado: 'BORRADOR' });

    const res = await request(app)
      .post('/api/planificacion-colaborativa/10/reabrir')
      .set('Authorization', `Bearer ${tokenDirector}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(planificacionCarreraService.reabrirBorrador).toHaveBeenCalledWith(
      expect.objectContaining({ carreraId: 10, usuarioId: 1 })
    );
  });

  test('admin sobre CUALQUIER carrera: pasa (no requiere carreraIds)', async () => {
    planificacionCarreraService.confirmarPlanificacion.mockResolvedValue({ id: 1, estado: 'CONFIRMADA' });

    const res = await request(app)
      .post('/api/planificacion-colaborativa/999/confirmar')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(200);
    expect(planificacionCarreraService.confirmarPlanificacion).toHaveBeenCalledWith(
      expect.objectContaining({ carreraId: 999 })
    );
  });
});

describe('planificacionCarreraRoutes — sugerirAula', () => {
  test('claseId inexistente: 404, servicio nunca se llama', async () => {
    models.Clase.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/planificacion-colaborativa/10/sugerir')
      .set('Authorization', `Bearer ${tokenDirector}`)
      .send({ claseId: 999 });

    expect(res.status).toBe(404);
    expect(planificacionCarreraService.sugerirAula).not.toHaveBeenCalled();
  });

  test('clase de OTRA carrera: 403', async () => {
    models.Clase.findByPk.mockResolvedValue({ id: 1, carrera_id: 20 });

    const res = await request(app)
      .post('/api/planificacion-colaborativa/10/sugerir')
      .set('Authorization', `Bearer ${tokenDirector}`)
      .send({ claseId: 1 });

    expect(res.status).toBe(403);
  });

  test('clase válida de la propia carrera: 200 con la sugerencia', async () => {
    models.Clase.findByPk.mockResolvedValue({ id: 1, carrera_id: 10 });
    planificacionCarreraService.sugerirAula.mockResolvedValue({
      aula: { id: 5, codigo: 'AULA-101' },
      isOvercapacity: false,
    });

    const res = await request(app)
      .post('/api/planificacion-colaborativa/10/sugerir')
      .set('Authorization', `Bearer ${tokenDirector}`)
      .send({ claseId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.sugerencia).toEqual({ aulaId: 5, aulaCodigo: 'AULA-101', isOvercapacity: false });
  });
});

describe('planificacionCarreraRoutes — mapeo de errores del servicio', () => {
  test('error de negocio (motivo faltante): 400', async () => {
    planificacionCarreraService.reasignacionExcepcional.mockRejectedValue(
      new Error('El motivo es obligatorio para una reasignación excepcional.')
    );

    const res = await request(app)
      .post('/api/planificacion-colaborativa/admin/reasignacion-excepcional')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ bloqueId: 1, motivo: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('error "no encontrado": 404', async () => {
    planificacionCarreraService.reasignacionExcepcional.mockRejectedValue(new Error('Bloque no encontrado.'));

    const res = await request(app)
      .post('/api/planificacion-colaborativa/admin/reasignacion-excepcional')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ bloqueId: 1, motivo: 'motivo valido' });

    expect(res.status).toBe(404);
  });
});

describe('planificacionCarreraRoutes — fill-gaps (admin)', () => {
  test('calcular: devuelve previewId y las DOS listas que exige §3.4', async () => {
    planificacionCarreraService.crearPreviewDistribucion.mockResolvedValue({
      previewId: 77,
      propuestas: [{ claseId: 1, aulaId: 5 }],
      sinCambios: [{ claseId: 2, estado: 'CONFIRMADO', motivo: 'CONFIRMADO por su carrera' }],
      sinAsignar: [],
      estadisticas: { totalClasesEnAlcance: 2, totalCandidatas: 1, sinCambios: 1, propuestas: 1, sinAsignar: 0 },
    });

    const res = await request(app)
      .post('/api/planificacion-colaborativa/admin/fill-gaps/calcular')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.previewId).toBe(77);
    expect(res.body.propuestas).toHaveLength(1);
    // Lo que NO cambia también viaja: es la mitad de la evidencia.
    expect(res.body.sinCambios).toHaveLength(1);
  });

  test('aplicar sin previewId: 400, servicio nunca se llama', async () => {
    const res = await request(app)
      .post('/api/planificacion-colaborativa/admin/fill-gaps/aplicar')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(400);
    expect(planificacionCarreraService.aplicarPreviewDistribucion).not.toHaveBeenCalled();
  });

  test('aplicar con un array de propuestas suelto: se ignora, exige previewId', async () => {
    // El agujero de I4: antes esto escribía asignaciones que el motor
    // heurístico nunca produjo.
    const res = await request(app)
      .post('/api/planificacion-colaborativa/admin/fill-gaps/aplicar')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ propuestas: [{ claseId: 1, aulaId: 999, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }] });

    expect(res.status).toBe(400);
    expect(planificacionCarreraService.aplicarPreviewDistribucion).not.toHaveBeenCalled();
    expect(planificacionCarreraService.aplicarDistribucionFillGaps).not.toHaveBeenCalled();
  });

  test('aplicar con previewId: delega al servicio', async () => {
    planificacionCarreraService.aplicarPreviewDistribucion.mockResolvedValue({
      previewId: 77, calculadoEn: new Date(), aplicadas: [1], omitidas: [],
    });

    const res = await request(app)
      .post('/api/planificacion-colaborativa/admin/fill-gaps/aplicar')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ previewId: 77 });

    expect(res.status).toBe(200);
    expect(planificacionCarreraService.aplicarPreviewDistribucion).toHaveBeenCalledWith(
      expect.objectContaining({ previewId: 77 })
    );
  });
});
