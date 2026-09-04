// Tests de enriquecerConModuloColaborativo (Fase 7a). Puro salvo por la
// única query a BloqueDisponibilidad.findAll — mockeada, sin DB real.

jest.mock('../src/models', () => ({
  Aula: {},
  BloqueDisponibilidad: { findAll: jest.fn() },
}));

const models = require('../src/models');
const { enriquecerConModuloColaborativo } = require('../src/utils/vistaClases');

function claseLegado(overrides = {}) {
  return {
    id: 1,
    materia: 'Interfaces y Multimedia',
    aula_asignada: 'A-C17',
    aula_nombre: 'C17',
    aula_capacidad: 40,
    dia: 'Viernes',
    hora_inicio: '18:00',
    hora_fin: '21:00',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('enriquecerConModuloColaborativo — sin bloques', () => {
  test('lista vacía: devuelve vacía sin consultar BloqueDisponibilidad', async () => {
    const res = await enriquecerConModuloColaborativo([]);
    expect(res).toEqual([]);
    expect(models.BloqueDisponibilidad.findAll).not.toHaveBeenCalled();
  });

  test('clase sin bloque asociado: fuente legado, nada sobrescrito', async () => {
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]);
    const [res] = await enriquecerConModuloColaborativo([claseLegado()]);

    expect(res.fuente).toBe('legado');
    expect(res.bloque_estado).toBeNull();
    expect(res.aula_asignada).toBe('A-C17'); // intacto
  });

  test('clase con bloque LIBRE: se trata igual que sin bloque (no hay compromiso real)', async () => {
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      { clase_id: 1, estado: 'LIBRE', aula: null, dia: null, hora_inicio: null, hora_fin: null },
    ]);
    const [res] = await enriquecerConModuloColaborativo([claseLegado()]);

    expect(res.fuente).toBe('legado');
    expect(res.aula_asignada).toBe('A-C17');
  });
});

describe('enriquecerConModuloColaborativo — CONFIRMADO', () => {
  test('sobrescribe aula/dia/hora con lo que confirmó el director (caso real: A-C17 legado → LAB 3 confirmado)', async () => {
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      {
        clase_id: 1,
        estado: 'CONFIRMADO',
        dia: 'Viernes',
        hora_inicio: '18:00:00', // columna TIME de Postgres, con segundos
        hora_fin: '21:00:00',
        aula: { codigo: 'LAB 3', nombre: 'Laboratorio 3', capacidad: 21 },
      },
    ]);
    const [res] = await enriquecerConModuloColaborativo([claseLegado()]);

    expect(res.fuente).toBe('colaborativo_confirmado');
    expect(res.bloque_estado).toBe('CONFIRMADO');
    expect(res.aula_asignada).toBe('LAB 3'); // ya no A-C17
    expect(res.aula_capacidad).toBe(21);
    expect(res.hora_inicio).toBe('18:00'); // recortado, sin segundos
  });

  test('CONFIRMADO sin aula asociada (integridad rota, defensivo): mantiene el aula legada en vez de escribir null', async () => {
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      { clase_id: 1, estado: 'CONFIRMADO', dia: 'Viernes', hora_inicio: '18:00:00', hora_fin: '21:00:00', aula: null },
    ]);
    const [res] = await enriquecerConModuloColaborativo([claseLegado()]);

    expect(res.aula_asignada).toBe('A-C17'); // fallback al legado, no null
    expect(res.fuente).toBe('colaborativo_confirmado');
  });
});

describe('enriquecerConModuloColaborativo — EN_REVISION', () => {
  test('marca la clase como en_revision pero NO sobrescribe nada (no es compromiso institucional todavía)', async () => {
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      { clase_id: 1, estado: 'EN_REVISION', dia: 'Viernes', hora_inicio: '18:00:00', hora_fin: '21:00:00', aula: { codigo: 'LAB 3', nombre: 'Laboratorio 3', capacidad: 21 } },
    ]);
    const [res] = await enriquecerConModuloColaborativo([claseLegado()]);

    expect(res.fuente).toBe('colaborativo_en_revision');
    expect(res.bloque_estado).toBe('EN_REVISION');
    expect(res.aula_asignada).toBe('A-C17'); // intacto — igual que el caso real de hoy
  });
});

describe('enriquecerConModuloColaborativo — múltiples clases', () => {
  test('cada clase se resuelve independientemente según su propio bloque', async () => {
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      { clase_id: 1, estado: 'CONFIRMADO', dia: 'Lunes', hora_inicio: '08:00:00', hora_fin: '10:00:00', aula: { codigo: 'AULA-A', nombre: 'A', capacidad: 30 } },
      { clase_id: 2, estado: 'EN_REVISION', dia: 'Martes', hora_inicio: '10:00:00', hora_fin: '12:00:00', aula: { codigo: 'AULA-B', nombre: 'B', capacidad: 30 } },
    ]);
    const clases = [claseLegado({ id: 1 }), claseLegado({ id: 2 }), claseLegado({ id: 3 })];

    const res = await enriquecerConModuloColaborativo(clases);

    expect(res.find((c) => c.id === 1).fuente).toBe('colaborativo_confirmado');
    expect(res.find((c) => c.id === 2).fuente).toBe('colaborativo_en_revision');
    expect(res.find((c) => c.id === 3).fuente).toBe('legado'); // sin bloque
  });
});
