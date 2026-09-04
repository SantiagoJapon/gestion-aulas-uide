// Test de la guardia anti-cascada de subirPlanificacion (Fase 6b).
// Clase.destroy() dentro de subirPlanificacion() cascadea hacia
// bloques_disponibilidad (FK clase_id ON DELETE CASCADE). Esta guardia
// bloquea el upload con 409 si la carrera tiene bloques EN_REVISION o
// CONFIRMADO, salvo que el caller mande confirmarSobrescritura=true.
//
// No se re-testea el resto de subirPlanificacion() (creación de clases,
// docentes, WhatsApp, distribución automática) — eso es lógica preexistente
// y fuera de alcance de esta fase. Acá solo se prueba: la guardia bloquea
// cuando corresponde, deja pasar cuando corresponde, y en ningún caso de
// bloqueo se llega a parsear el Excel (fail-fast, sin trabajo desperdiciado).

const request = require('supertest');
const express = require('express');
const { generarToken } = require('../src/utils/jwt');

const mockTransaction = { commit: jest.fn().mockResolvedValue(), rollback: jest.fn().mockResolvedValue() };

jest.mock('../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(() => Promise.resolve(mockTransaction)),
  },
}));

const CARRERAS = { 10: { id: 10, carrera: 'Ingenieria' } };

jest.mock('../src/models', () => ({
  User: {
    findByPk: jest.fn().mockImplementation((id) => {
      const users = { 2: { id: 2, nombre: 'Admin', apellido: 'Sistema', rol: 'admin', carrera_director: null, estado: 'activo' } };
      return Promise.resolve(users[id] || null);
    }),
  },
  DirectorCarrera: { findAll: jest.fn().mockResolvedValue([]) },
  Carrera: {
    findByPk: jest.fn().mockImplementation((id) => Promise.resolve(CARRERAS[id] || null)),
    findAll: jest.fn().mockResolvedValue([]),
  },
  Estudiante: { findByPk: jest.fn().mockResolvedValue(null) },
  Clase: {}, // solo referenciado como `model:` en el include del guard — no necesita comportamiento propio
  BloqueDisponibilidad: { findAll: jest.fn() },
}));

jest.mock('../src/services/excel-parser.service', () => ({
  processExcel: jest.fn(),
}));

jest.mock('../src/services/openai.service', () => ({
  analizarExcelConIA: jest.fn(),
  esOpenAIConfigurado: jest.fn().mockReturnValue(false),
}));

jest.mock('../src/services/distribucion.service', () => ({}));
jest.mock('../src/services/n8n.service', () => ({ emit: jest.fn(), construirReporteDistribucion: jest.fn() }));

const models = require('../src/models');
const { processExcel } = require('../src/services/excel-parser.service');

const planificacionRoutes = require('../src/routes/planificacionRoutes');
const app = express();
app.use(express.json());
app.use('/api/planificaciones', planificacionRoutes);

const tokenAdmin = generarToken({ id: 2, email: 'admin@uide.edu.ec', rol: 'admin' });

beforeEach(() => {
  jest.clearAllMocks();
  mockTransaction.commit.mockClear();
  mockTransaction.rollback.mockClear();
});

describe('POST /api/planificaciones/subir — guardia anti-cascada (Fase 6b)', () => {
  test('carrera con un bloque EN_REVISION, sin confirmarSobrescritura: 409, nunca parsea el excel', async () => {
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      { clase_id: 877, estado: 'EN_REVISION', clase: { materia: 'Interfaces y Multimedia' } },
    ]);

    const res = await request(app)
      .post('/api/planificaciones/subir')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('carrera_id', '10')
      .attach('archivo', Buffer.from('contenido-dummy'), 'plan.xlsx');

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.bloquesEnRiesgo).toEqual([{ claseId: 877, materia: 'Interfaces y Multimedia', estado: 'EN_REVISION' }]);
    expect(processExcel).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });

  test('carrera con un bloque CONFIRMADO, sin confirmarSobrescritura: 409 igual que EN_REVISION', async () => {
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      { clase_id: 900, estado: 'CONFIRMADO', clase: { materia: 'Bases de Datos' } },
    ]);

    const res = await request(app)
      .post('/api/planificaciones/subir')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('carrera_id', '10')
      .attach('archivo', Buffer.from('contenido-dummy'), 'plan.xlsx');

    expect(res.status).toBe(409);
    expect(processExcel).not.toHaveBeenCalled();
  });

  test('mismos bloques en riesgo, con confirmarSobrescritura=true: la guardia deja pasar (llega a parsear el excel)', async () => {
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      { clase_id: 877, estado: 'EN_REVISION', clase: { materia: 'Interfaces y Multimedia' } },
    ]);
    // Sentinel: no importa completar el resto del pipeline (fuera de
    // alcance acá) — alcanza con probar que la guardia lo dejó pasar.
    processExcel.mockImplementation(() => { throw new Error('SENTINEL_PASADO_LA_GUARDIA'); });

    const res = await request(app)
      .post('/api/planificaciones/subir')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('carrera_id', '10')
      .field('confirmarSobrescritura', 'true')
      .attach('archivo', Buffer.from('contenido-dummy'), 'plan.xlsx');

    expect(processExcel).toHaveBeenCalledTimes(1);
    expect(res.status).not.toBe(409);
  });

  test('carrera sin bloques EN_REVISION/CONFIRMADO (ninguno, o solo LIBRE): la guardia no bloquea', async () => {
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]); // el mock ya filtra por estado en el where real; acá simula "no hay ninguno en esos estados"
    processExcel.mockImplementation(() => { throw new Error('SENTINEL_PASADO_LA_GUARDIA'); });

    const res = await request(app)
      .post('/api/planificaciones/subir')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('carrera_id', '10')
      .attach('archivo', Buffer.from('contenido-dummy'), 'plan.xlsx');

    expect(processExcel).toHaveBeenCalledTimes(1);
    expect(res.status).not.toBe(409);
  });

  test('la query de la guardia filtra por estado EN_REVISION/CONFIRMADO y por carrera_id — nunca trae bloques LIBRE de otra carrera', async () => {
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]);
    processExcel.mockImplementation(() => { throw new Error('SENTINEL_PASADO_LA_GUARDIA'); });

    await request(app)
      .post('/api/planificaciones/subir')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('carrera_id', '10')
      .attach('archivo', Buffer.from('contenido-dummy'), 'plan.xlsx');

    const llamada = models.BloqueDisponibilidad.findAll.mock.calls[0][0];
    expect(llamada.where.estado[require('sequelize').Op.in]).toEqual(['EN_REVISION', 'CONFIRMADO']);
    expect(llamada.include[0].where).toEqual({ carrera_id: '10' });
  });
});
