// Test de wiring HTTP + RBAC de POST /validar (Fase 6a). La lógica de
// detección de conflictos ya está cubierta en validacionExcel.service.test.js
// — acá solo se prueba: ruta montada, auth real (verificarAuth/verificarRol
// sin mock), RBAC de carrera para director, y que NUNCA se llame a nada
// que escriba (Clase.destroy/create, Docente.findOrCreate, User.create).

const request = require('supertest');
const express = require('express');
const { generarToken } = require('../src/utils/jwt');

// Catálogo compartido: director id=1 tiene asignada solo la carrera 10
// (vía DirectorCarrera), igual que en planificacionCarreraController.test.js.
// verificarAuth pasa por User.findByPk -> resolverCarrerasDeDirector
// (DirectorCarrera.findAll + Carrera.findAll con {raw:true}) — todo eso
// hay que mockearlo para que la cadena real de auth.js no rompa.
const CARRERAS = { 10: { id: 10, carrera: 'Ingenieria' }, 20: { id: 20, carrera: 'Psicologia' } };

jest.mock('../src/models', () => ({
  User: {
    findByPk: jest.fn().mockImplementation((id) => {
      const users = {
        1: { id: 1, nombre: 'Director', apellido: 'Uno', rol: 'director', carrera_director: null, estado: 'activo' },
        2: { id: 2, nombre: 'Admin', apellido: 'Sistema', rol: 'admin', carrera_director: null, estado: 'activo' },
      };
      return Promise.resolve(users[id] || null);
    }),
    create: jest.fn(),
    findOne: jest.fn(),
  },
  DirectorCarrera: {
    findAll: jest.fn().mockImplementation(({ where }) => {
      if (where.usuario_id === 1) return Promise.resolve([{ carrera_id: 10 }]);
      return Promise.resolve([]);
    }),
  },
  Carrera: {
    findByPk: jest.fn().mockImplementation((id) => Promise.resolve(CARRERAS[id] || null)),
    findAll: jest.fn().mockImplementation(({ where }) => {
      const ids = where?.id || [];
      return Promise.resolve(ids.map((id) => CARRERAS[id]).filter(Boolean));
    }),
    findOne: jest.fn().mockResolvedValue(null),
  },
  Aula: {
    findAll: jest.fn().mockResolvedValue([
      { id: 1, codigo: 'AULA-101', nombre: 'Aula 101', capacidad: 40, estado: 'disponible', tipo: 'AULA', restriccion_carrera: null, es_prioritaria: false },
    ]),
  },
  Clase: { destroy: jest.fn(), create: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
  Docente: { findOrCreate: jest.fn() },
  BloqueDisponibilidad: { findAll: jest.fn().mockResolvedValue([]) },
  MateriaCatalogo: { findOrCreate: jest.fn() },
  PlanificacionSubida: { create: jest.fn(), update: jest.fn() },
  Estudiante: { findByPk: jest.fn().mockResolvedValue(null) },
}));

jest.mock('../src/services/excel-parser.service', () => ({
  processExcel: jest.fn(),
}));

const models = require('../src/models');
const { processExcel } = require('../src/services/excel-parser.service');

const planificacionRoutes = require('../src/routes/planificacionRoutes');
const app = express();
app.use(express.json());
app.use('/api/planificaciones', planificacionRoutes);

const tokenDirectorCarrera10 = generarToken({ id: 1, email: 'director@uide.edu.ec', rol: 'director' });
const tokenAdmin = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });

beforeEach(() => {
  jest.clearAllMocks();
  models.Carrera.findByPk.mockImplementation((id) => {
    const catalogo = { 10: { id: 10, carrera: 'Ingenieria' }, 20: { id: 20, carrera: 'Psicologia' } };
    return Promise.resolve(catalogo[id] || null);
  });
  models.Aula.findAll.mockResolvedValue([
    { id: 1, codigo: 'AULA-101', nombre: 'Aula 101', capacidad: 40, estado: 'disponible', tipo: 'AULA', restriccion_carrera: null, es_prioritaria: false },
  ]);
});

describe('POST /api/planificaciones/validar', () => {
  test('sin archivo adjunto: 400', async () => {
    const res = await request(app)
      .post('/api/planificaciones/validar')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('carrera_id', '10');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('sin carrera_id: 400', async () => {
    const res = await request(app)
      .post('/api/planificaciones/validar')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .attach('archivo', Buffer.from('contenido-dummy'), 'plan.xlsx');

    expect(res.status).toBe(400);
    expect(res.body.mensaje).toMatch(/carrera_id/);
  });

  test('director con carrera 10 asignada pide validar la carrera 20 (no es suya): 403, nunca llega a parsear el excel', async () => {
    const res = await request(app)
      .post('/api/planificaciones/validar')
      .set('Authorization', `Bearer ${tokenDirectorCarrera10}`)
      .field('carrera_id', '20')
      .attach('archivo', Buffer.from('contenido-dummy'), 'plan.xlsx');

    expect(res.status).toBe(403);
    expect(processExcel).not.toHaveBeenCalled();
  });

  test('excel con sobrecupo: 200, devuelve el conflicto con sugerencia, y NUNCA escribe nada', async () => {
    processExcel.mockReturnValue({
      clases: [
        { materia: 'Calculo I', ciclo: '1', paralelo: 'A', dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00', num_estudiantes: 50, docente: null, aula: 'AULA-101' },
      ],
      hojaUsada: 'Hoja1',
      totalHojas: 1,
    });

    const res = await request(app)
      .post('/api/planificaciones/validar')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('carrera_id', '10')
      .attach('archivo', Buffer.from('contenido-dummy'), 'plan.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.ok).toHaveLength(0);
    expect(res.body.conflictos).toHaveLength(1);
    expect(res.body.conflictos[0].tipo).toBe('SOBRECUPO');

    // El punto central de Fase 6a: validar nunca persiste ni dispara efectos.
    expect(models.Clase.destroy).not.toHaveBeenCalled();
    expect(models.Clase.create).not.toHaveBeenCalled();
    expect(models.Docente.findOrCreate).not.toHaveBeenCalled();
    expect(models.User.create).not.toHaveBeenCalled();
    expect(models.PlanificacionSubida.create).not.toHaveBeenCalled();
  });

  test('excel sin filas con materia válida: 200 con listas vacías, no 400 ni 500', async () => {
    processExcel.mockReturnValue({ clases: [{ materia: '', dia: 'Lunes' }], hojaUsada: 'Hoja1', totalHojas: 1 });

    const res = await request(app)
      .post('/api/planificaciones/validar')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('carrera_id', '10')
      .attach('archivo', Buffer.from('contenido-dummy'), 'plan.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.ok).toEqual([]);
    expect(res.body.conflictos).toEqual([]);
  });
});
