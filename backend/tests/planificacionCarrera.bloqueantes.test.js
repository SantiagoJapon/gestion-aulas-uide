// ============================================================
// Tests de los tres bloqueantes detectados en la auditoría contra el
// informe del módulo de planificación colaborativa:
//
//   B1 — EN_REVISION no protegía nada: _buscarBloqueOcupadoSolapado solo
//        miraba CONFIRMADO, así que dos carreras podían reservar el mismo
//        aula/horario y el choque recién aparecía al confirmar (regla 3.2).
//   B2 — La reversión automática por vencimiento de plazo no existía, y el
//        esquema no guardaba la "última versión CONFIRMADO conocida" que la
//        regla 3.2 manda restaurar.
//   B3 — Cubierto por la migración (índices parciales) y verificado contra
//        Postgres real en planificacionCarrera.concurrencia.test.js; acá
//        solo se comprueba que el modelo declare los dos índices.
//
// Mismo patrón de mocks que planificacionCarrera.service.test.js.
// ============================================================

const fakeTransaction = { LOCK: { UPDATE: 'UPDATE' } };

jest.mock('../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (cb) => cb(fakeTransaction)),
    query: jest.fn().mockResolvedValue([]),
    fn: jest.fn(),
    col: jest.fn(),
    where: jest.fn(),
    define: jest.fn(),
  },
}));

jest.mock('../src/services/distribucion.service', () => ({
  buscarAulaOptima: jest.fn(),
  convertirHoraAMinutos: jest.fn((hora) => {
    if (!hora || typeof hora !== 'string') return 0;
    const partes = hora.split(':');
    if (partes.length !== 2) return 0;
    return (parseInt(partes[0]) || 0) * 60 + (parseInt(partes[1]) || 0);
  }),
}));

jest.mock('../src/utils/directorScope', () => ({
  obtenerDirectoresDeCarrera: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/models', () => ({
  FlujoPlanificacion: { findOne: jest.fn(), findOrCreate: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() },
  FlujoPlanificacionVersion: { findOne: jest.fn(), create: jest.fn() },
  BloqueDisponibilidad: {
    update: jest.fn(),
    findOrCreate: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  ConflictoDeteccion: { count: jest.fn(), create: jest.fn(), findOne: jest.fn(), update: jest.fn() },
  ReasignacionExcepcional: { create: jest.fn(), count: jest.fn() },
  AuditoriaBloqueDisponibilidad: Object.assign(
    { create: jest.fn(), findAll: jest.fn() },
    {
      ORIGENES_MANUALES: ['ENVIO', 'CONFIRMACION', 'REAPERTURA', 'FILL_GAPS', 'REASIGNACION_EXCEPCIONAL'],
    }
  ),
  FechaLimiteExtendida: { create: jest.fn(), findOne: jest.fn() },
  PreviewDistribucion: { create: jest.fn(), findByPk: jest.fn() },
  Carrera: { findByPk: jest.fn() },
  Clase: { findByPk: jest.fn(), findAll: jest.fn() },
  Aula: { findAll: jest.fn() },
  User: { findAll: jest.fn() },
  Notificacion: { create: jest.fn() },
}));

const models = require('../src/models');
const service = require('../src/services/planificacionCarrera.service');

function crearFlujoMock(overrides = {}) {
  const flujo = {
    id: 1,
    carrera_id: 10,
    periodo_id: null,
    estado: 'BORRADOR',
    fecha_limite: null,
    fecha_confirmacion: null,
    ...overrides,
  };
  flujo.save = jest.fn().mockResolvedValue(flujo);
  return flujo;
}

function crearBloqueMock(overrides = {}) {
  const bloque = {
    id: 100,
    clase_id: 1,
    aula_id: null,
    dia: null,
    hora_inicio: null,
    hora_fin: null,
    estado: 'LIBRE',
    flujo_planificacion_id: null,
    aula_id_confirmada: null,
    dia_confirmado: null,
    hora_inicio_confirmada: null,
    hora_fin_confirmada: null,
    ...overrides,
  };
  bloque.save = jest.fn().mockResolvedValue(bloque);
  return bloque;
}

beforeEach(() => {
  jest.clearAllMocks();
  models.FechaLimiteExtendida.findOne.mockResolvedValue(null);
  models.FlujoPlanificacionVersion.findOne.mockResolvedValue(null);
  models.FlujoPlanificacionVersion.create.mockResolvedValue({});
  models.ConflictoDeteccion.count.mockResolvedValue(0);
  models.ConflictoDeteccion.create.mockResolvedValue({ id: 1 });
  models.ConflictoDeteccion.findOne.mockResolvedValue(null);
  models.ConflictoDeteccion.update.mockResolvedValue([1]);
  models.BloqueDisponibilidad.findAll.mockResolvedValue([]);
  models.Notificacion.create.mockResolvedValue({});
  models.Carrera.findByPk.mockResolvedValue({ id: 10, carrera: 'Carrera Test' });
  models.User.findAll.mockResolvedValue([]);
  models.AuditoriaBloqueDisponibilidad.create.mockResolvedValue({ id: 1 });
  models.AuditoriaBloqueDisponibilidad.findAll.mockResolvedValue([]);
});

// ============================================================
// B1 — EN_REVISION bloquea a otras carreras
// ============================================================

describe('B1 — EN_REVISION de otra carrera bloquea el envío (regla 3.2)', () => {
  test('un bloque EN_REVISION ajeno genera conflicto, no se escribe el bloque propio', async () => {
    const flujoPropio = crearFlujoMock({ id: 1, carrera_id: 10 });
    models.FlujoPlanificacion.findOrCreate.mockResolvedValue([flujoPropio, false]);

    // Psicología (flujo 99) ya tiene reservado AULA 5 el lunes 08-10.
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      crearBloqueMock({
        id: 900, clase_id: 77, aula_id: 5, dia: 'Lunes',
        hora_inicio: '08:00', hora_fin: '10:00',
        estado: 'EN_REVISION', flujo_planificacion_id: 99,
      }),
    ]);

    const bloquePropio = crearBloqueMock({ id: 100, clase_id: 1 });
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloquePropio, false]);
    models.Clase.findByPk.mockResolvedValue(null); // sugerencia degradada, no importa acá

    const { flujo, conflictos } = await service.enviarPlanificacion({
      carreraId: 10,
      usuarioId: 1,
      bloques: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
    });

    expect(conflictos).toHaveLength(1);
    expect(bloquePropio.estado).toBe('LIBRE'); // no se pisó la reserva ajena
    expect(flujo.estado).not.toBe('ENVIADA'); // con conflicto pendiente no avanza
  });

  test('un bloque EN_REVISION del PROPIO flujo no bloquea: el director puede intercambiar sus aulas', async () => {
    const flujoPropio = crearFlujoMock({ id: 1, carrera_id: 10 });
    models.FlujoPlanificacion.findOrCreate.mockResolvedValue([flujoPropio, false]);

    // El envío anterior de esta misma carrera dejó la clase 2 en AULA 5.
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      crearBloqueMock({
        id: 200, clase_id: 2, aula_id: 5, dia: 'Lunes',
        hora_inicio: '08:00', hora_fin: '10:00',
        estado: 'EN_REVISION', flujo_planificacion_id: 1,
      }),
    ]);

    const bloquePropio = crearBloqueMock({ id: 100, clase_id: 1 });
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloquePropio, false]);

    const { flujo, conflictos } = await service.enviarPlanificacion({
      carreraId: 10,
      usuarioId: 1,
      bloques: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
    });

    expect(conflictos).toHaveLength(0);
    expect(bloquePropio.estado).toBe('EN_REVISION');
    expect(flujo.estado).toBe('ENVIADA');
  });

  test('dos clases del mismo envío al mismo aula/horario: la segunda es conflicto', async () => {
    const flujoPropio = crearFlujoMock({ id: 1, carrera_id: 10 });
    models.FlujoPlanificacion.findOrCreate.mockResolvedValue([flujoPropio, false]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]);

    const bloque1 = crearBloqueMock({ id: 101, clase_id: 1 });
    const bloque2 = crearBloqueMock({ id: 102, clase_id: 2 });
    models.BloqueDisponibilidad.findOrCreate
      .mockResolvedValueOnce([bloque1, false])
      .mockResolvedValueOnce([bloque2, false]);

    const { conflictos } = await service.enviarPlanificacion({
      carreraId: 10,
      usuarioId: 1,
      bloques: [
        { claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' },
        { claseId: 2, aulaId: 5, dia: 'Lunes', horaInicio: '09:00', horaFin: '11:00' },
      ],
    });

    expect(conflictos).toHaveLength(1);
    expect(conflictos[0].claseId).toBe(2);
    expect(bloque1.estado).toBe('EN_REVISION');
    expect(bloque2.estado).toBe('LIBRE');
  });
});

// ============================================================
// B2 — snapshot + reversión automática
// ============================================================

describe('B2 — snapshot de la última versión CONFIRMADO', () => {
  test('confirmar escribe el snapshot junto con el estado', async () => {
    const flujo = crearFlujoMock({ id: 1, estado: 'ENVIADA' });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);

    const bloque = crearBloqueMock({
      id: 100, clase_id: 1, aula_id: 5, dia: 'Lunes',
      hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'EN_REVISION', flujo_planificacion_id: 1,
    });
    // 1ª llamada: bloques EN_REVISION del flujo. 2ª: búsqueda de solapamiento.
    models.BloqueDisponibilidad.findAll
      .mockResolvedValueOnce([bloque])
      .mockResolvedValue([]);

    await service.confirmarPlanificacion({ carreraId: 10, usuarioId: 1 });

    expect(bloque.estado).toBe('CONFIRMADO');
    expect(bloque.aula_id_confirmada).toBe(5);
    expect(bloque.dia_confirmado).toBe('Lunes');
    expect(bloque.hora_inicio_confirmada).toBe('08:00');
    expect(bloque.hora_fin_confirmada).toBe('10:00');
  });

  test('reasignación excepcional actualiza el snapshot a la nueva ubicación', async () => {
    const bloque = crearBloqueMock({
      id: 100, clase_id: 1, aula_id: 5, dia: 'Lunes',
      hora_inicio: '08:00', hora_fin: '10:00', estado: 'CONFIRMADO',
      aula_id_confirmada: 5, dia_confirmado: 'Lunes',
      hora_inicio_confirmada: '08:00', hora_fin_confirmada: '10:00',
    });
    models.BloqueDisponibilidad.findByPk.mockResolvedValue(bloque);
    models.ReasignacionExcepcional.create.mockResolvedValue({ id: 1 });
    models.Clase.findByPk.mockResolvedValue({ id: 1, carrera_id: 10 });

    await service.reasignacionExcepcional({
      bloqueId: 100, adminId: 2, motivo: 'Aula en mantenimiento programado',
      nuevaAulaId: 9,
    });

    expect(bloque.aula_id).toBe(9);
    expect(bloque.aula_id_confirmada).toBe(9); // el snapshot sigue a la nueva verdad
  });
});

describe('B2 — reversión automática por vencimiento (regla 3.2)', () => {
  test('bloque EN_REVISION con snapshot vuelve a CONFIRMADO en su ubicación previa', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const flujo = crearFlujoMock({ id: 1, carrera_id: 10, estado: 'BORRADOR', fecha_limite: ayer });
    models.FlujoPlanificacion.findAll.mockResolvedValue([flujo]);
    models.FlujoPlanificacion.findByPk.mockResolvedValue(flujo);

    const bloque = crearBloqueMock({
      id: 100, clase_id: 1,
      aula_id: 9, dia: 'Martes', hora_inicio: '14:00', hora_fin: '16:00', // edición sin confirmar
      estado: 'EN_REVISION', flujo_planificacion_id: 1,
      aula_id_confirmada: 5, dia_confirmado: 'Lunes',
      hora_inicio_confirmada: '08:00', hora_fin_confirmada: '10:00',
    });
    models.BloqueDisponibilidad.findAll
      .mockResolvedValueOnce([bloque]) // bloques EN_REVISION del flujo
      .mockResolvedValue([]); // sin solapamiento contra la ubicación previa

    const resultados = await service.revertirBorradoresVencidos();

    expect(resultados).toHaveLength(1);
    expect(resultados[0].restaurados).toEqual([1]);
    expect(bloque.estado).toBe('CONFIRMADO');
    expect(bloque.aula_id).toBe(5);
    expect(bloque.dia).toBe('Lunes');
    expect(flujo.estado).toBe('CONFIRMADA');
  });

  test('bloque EN_REVISION sin snapshot se libera en vez de quedar huérfano', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const flujo = crearFlujoMock({ id: 1, carrera_id: 10, estado: 'BORRADOR', fecha_limite: ayer });
    models.FlujoPlanificacion.findAll.mockResolvedValue([flujo]);
    models.FlujoPlanificacion.findByPk.mockResolvedValue(flujo);

    const bloque = crearBloqueMock({
      id: 100, clase_id: 1, aula_id: 9, dia: 'Martes',
      hora_inicio: '14:00', hora_fin: '16:00',
      estado: 'EN_REVISION', flujo_planificacion_id: 1,
    });
    models.BloqueDisponibilidad.findAll
      .mockResolvedValueOnce([bloque])
      .mockResolvedValue([]);

    const resultados = await service.revertirBorradoresVencidos();

    expect(bloque.estado).toBe('LIBRE');
    expect(resultados[0].restaurados).toHaveLength(0);
    expect(resultados[0].liberados).toHaveLength(1);
    expect(flujo.estado).toBe('BORRADOR'); // nunca tuvo versión confirmada
  });

  test('flujo dentro del plazo no se toca', async () => {
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const flujo = crearFlujoMock({ id: 1, carrera_id: 10, estado: 'BORRADOR', fecha_limite: manana });
    models.FlujoPlanificacion.findAll.mockResolvedValue([flujo]);

    const resultados = await service.revertirBorradoresVencidos();

    expect(resultados).toHaveLength(0);
    expect(models.FlujoPlanificacion.findByPk).not.toHaveBeenCalled();
  });

  test('si otra carrera ocupó la ubicación previa, el bloque se libera en vez de duplicar la reserva', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const flujo = crearFlujoMock({ id: 1, carrera_id: 10, estado: 'BORRADOR', fecha_limite: ayer });
    models.FlujoPlanificacion.findAll.mockResolvedValue([flujo]);
    models.FlujoPlanificacion.findByPk.mockResolvedValue(flujo);

    const bloque = crearBloqueMock({
      id: 100, clase_id: 1, aula_id: 9, dia: 'Martes',
      hora_inicio: '14:00', hora_fin: '16:00',
      estado: 'EN_REVISION', flujo_planificacion_id: 1,
      aula_id_confirmada: 5, dia_confirmado: 'Lunes',
      hora_inicio_confirmada: '08:00', hora_fin_confirmada: '10:00',
    });
    const ocupante = crearBloqueMock({
      id: 900, clase_id: 77, aula_id: 5, dia: 'Lunes',
      hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'CONFIRMADO', flujo_planificacion_id: 99,
    });
    models.BloqueDisponibilidad.findAll
      .mockResolvedValueOnce([bloque])
      .mockResolvedValue([ocupante]);

    const resultados = await service.revertirBorradoresVencidos();

    expect(bloque.estado).toBe('LIBRE');
    expect(resultados[0].liberados).toHaveLength(1);
  });
});

// ============================================================
// B3 — índices parciales en el modelo
// ============================================================

describe('B3 — unicidad de flujo con periodo_id NULL', () => {
  test('el modelo declara los dos índices parciales, no el combinado roto', () => {
    // Se lee el archivo fuente en vez de la instancia Sequelize: acá
    // sequelize está mockeado, así que define() no construye el modelo real.
    const fs = require('fs');
    const path = require('path');
    const fuente = fs.readFileSync(
      path.join(__dirname, '../src/models/FlujoPlanificacion.js'),
      'utf8'
    );

    expect(fuente).toContain('uniq_flujo_carrera_periodo');
    expect(fuente).toContain('uniq_flujo_carrera_sin_periodo');
    expect(fuente).not.toContain("name: 'unique_flujo_carrera_periodo'");
  });
});

// ============================================================
// I1 — Aislamiento por período
// ============================================================

describe('I1 — la resolución de fecha límite está acotada al período', () => {
  test('busca la extensión del período del flujo, no la última de la carrera', async () => {
    // ENVIADA, no BORRADOR: reabrirBorrador es idempotente y retorna antes
    // de resolver la fecha si el flujo ya está en BORRADOR.
    const flujo = crearFlujoMock({ id: 1, carrera_id: 10, periodo_id: 7, estado: 'ENVIADA' });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);
    models.FechaLimiteExtendida.findOne.mockResolvedValue(null);

    await service.reabrirBorrador({ carreraId: 10, periodoId: 7, usuarioId: 1 });

    expect(models.FechaLimiteExtendida.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { carrera_id: 10, periodo_id: 7 },
      })
    );
  });

  test('una extensión de otro período no mantiene el plazo abierto', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const flujo = crearFlujoMock({ id: 1, carrera_id: 10, periodo_id: 7, estado: 'CONFIRMADA', fecha_limite: ayer });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);
    // La consulta acotada al período 7 no encuentra la extensión de 2025-1.
    models.FechaLimiteExtendida.findOne.mockResolvedValue(null);

    await expect(
      service.reabrirBorrador({ carreraId: 10, periodoId: 7, usuarioId: 1 })
    ).rejects.toThrow(/fecha límite ya venció/i);
  });
});

describe('I1 — el conteo de conflictos está acotado al período', () => {
  test('confirmar filtra los conflictos por el período del flujo', async () => {
    const flujo = crearFlujoMock({ id: 1, carrera_id: 10, periodo_id: 7, estado: 'ENVIADA' });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);
    models.ConflictoDeteccion.count.mockResolvedValue(0);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]);

    await service.confirmarPlanificacion({ carreraId: 10, periodoId: 7, usuarioId: 1 });

    const argsConteo = models.ConflictoDeteccion.count.mock.calls[0][0];
    expect(argsConteo.where).toMatchObject({ resuelto: false, carrera_solicitante_id: 10 });
    // El filtro de período viaja por el include bloque -> clase.
    expect(JSON.stringify(argsConteo.include)).toContain('"periodo_id":7');
  });
});

describe('I1 — la búsqueda de solapamiento está acotada al período', () => {
  test('enviar filtra los bloques candidatos por el período del flujo', async () => {
    const flujo = crearFlujoMock({ id: 1, carrera_id: 10, periodo_id: 7 });
    models.FlujoPlanificacion.findOrCreate.mockResolvedValue([flujo, false]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]);
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([crearBloqueMock({ id: 100, clase_id: 1 }), false]);

    await service.enviarPlanificacion({
      carreraId: 10,
      periodoId: 7,
      usuarioId: 1,
      bloques: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
    });

    const argsBusqueda = models.BloqueDisponibilidad.findAll.mock.calls[0][0];
    expect(JSON.stringify(argsBusqueda.include)).toContain('"periodo_id":7');
  });

  test('sin período explícito el filtro es periodo_id NULL, no "todos los períodos"', async () => {
    const flujo = crearFlujoMock({ id: 1, carrera_id: 10, periodo_id: null });
    models.FlujoPlanificacion.findOrCreate.mockResolvedValue([flujo, false]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]);
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([crearBloqueMock({ id: 100, clase_id: 1 }), false]);

    await service.enviarPlanificacion({
      carreraId: 10,
      usuarioId: 1,
      bloques: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
    });

    const argsBusqueda = models.BloqueDisponibilidad.findAll.mock.calls[0][0];
    expect(argsBusqueda.include).toBeDefined();
    expect(JSON.stringify(argsBusqueda.include)).toContain('"periodo_id":null');
  });
});

// ============================================================
// I5 — Auditoría a nivel de bloque (regla 7)
// ============================================================

describe('I5 — cada transición de bloque deja rastro', () => {
  test('fill-gaps por fin usa adminId: el admin ya no escribe CONFIRMADO en anonimato', async () => {
    const bloque = crearBloqueMock({ id: 100, clase_id: 1, estado: 'LIBRE' });
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloque, false]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]);

    await service.aplicarDistribucionFillGaps({
      propuestas: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
      adminId: 42,
    });

    expect(models.AuditoriaBloqueDisponibilidad.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clase_id: 1,
        estado_anterior: 'LIBRE',
        estado_nuevo: 'CONFIRMADO',
        origen: 'FILL_GAPS',
        usuario_id: 42,
      }),
      expect.anything()
    );
  });

  test('el rastro guarda la asignación anterior y la nueva', async () => {
    const bloque = crearBloqueMock({
      id: 100, clase_id: 1, estado: 'CONFIRMADO',
      aula_id: 5, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00',
    });
    models.BloqueDisponibilidad.findByPk.mockResolvedValue(bloque);
    models.ReasignacionExcepcional.create.mockResolvedValue({ id: 1 });
    models.Clase.findByPk.mockResolvedValue({ id: 1, carrera_id: 10 });

    await service.reasignacionExcepcional({
      bloqueId: 100, adminId: 7, motivo: 'Aula en mantenimiento', nuevaAulaId: 9,
    });

    const args = models.AuditoriaBloqueDisponibilidad.create.mock.calls[0][0];
    expect(args.origen).toBe('REASIGNACION_EXCEPCIONAL');
    expect(args.usuario_id).toBe(7);
    expect(args.asignacion_anterior).toMatchObject({ aula_id: 5, dia: 'Lunes' });
    expect(args.asignacion_nueva).toMatchObject({ aula_id: 9, dia: 'Lunes' });
  });

  test('la reversión automática se registra sin usuario: fue el sistema', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const flujo = crearFlujoMock({ id: 1, carrera_id: 10, estado: 'BORRADOR', fecha_limite: ayer });
    models.FlujoPlanificacion.findAll.mockResolvedValue([flujo]);
    models.FlujoPlanificacion.findByPk.mockResolvedValue(flujo);

    const bloque = crearBloqueMock({
      id: 100, clase_id: 1, aula_id: 9, dia: 'Martes',
      hora_inicio: '14:00', hora_fin: '16:00',
      estado: 'EN_REVISION', flujo_planificacion_id: 1,
      aula_id_confirmada: 5, dia_confirmado: 'Lunes',
      hora_inicio_confirmada: '08:00', hora_fin_confirmada: '10:00',
    });
    models.BloqueDisponibilidad.findAll
      .mockResolvedValueOnce([bloque])
      .mockResolvedValue([]);

    await service.revertirBorradoresVencidos();

    expect(models.AuditoriaBloqueDisponibilidad.create).toHaveBeenCalledWith(
      expect.objectContaining({ origen: 'REVERSION_AUTOMATICA', usuario_id: null }),
      expect.anything()
    );
  });

  test('reabrir audita el estado anterior real de cada bloque, no un UPDATE ciego', async () => {
    const flujo = crearFlujoMock({ id: 1, carrera_id: 10, estado: 'CONFIRMADA' });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);

    const bloqueConfirmado = crearBloqueMock({
      id: 100, clase_id: 1, estado: 'CONFIRMADO',
      aula_id: 5, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00',
      flujo_planificacion_id: 1,
    });
    models.BloqueDisponibilidad.findAll.mockResolvedValue([bloqueConfirmado]);

    await service.reabrirBorrador({ carreraId: 10, usuarioId: 3 });

    expect(bloqueConfirmado.estado).toBe('EN_REVISION');
    expect(models.AuditoriaBloqueDisponibilidad.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estado_anterior: 'CONFIRMADO',
        estado_nuevo: 'EN_REVISION',
        origen: 'REAPERTURA',
        usuario_id: 3,
      }),
      expect.anything()
    );
  });

  test('confirmar referencia la versión de planificación creada (regla 7)', async () => {
    const flujo = crearFlujoMock({ id: 1, estado: 'ENVIADA' });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);
    models.FlujoPlanificacionVersion.create.mockResolvedValue({ id: 555 });

    const bloque = crearBloqueMock({
      id: 100, clase_id: 1, aula_id: 5, dia: 'Lunes',
      hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'EN_REVISION', flujo_planificacion_id: 1,
    });
    models.BloqueDisponibilidad.findAll
      .mockResolvedValueOnce([bloque])
      .mockResolvedValue([]);

    await service.confirmarPlanificacion({ carreraId: 10, usuarioId: 1 });

    expect(models.AuditoriaBloqueDisponibilidad.create).toHaveBeenCalledWith(
      expect.objectContaining({ origen: 'CONFIRMACION', version_planificacion_id: 555 }),
      expect.anything()
    );
  });
});

describe('I5 — métricas agregadas de trazabilidad', () => {
  test('calcula tasa de resolución de conflictos y proporción automático/manual', async () => {
    models.ConflictoDeteccion.count
      .mockResolvedValueOnce(10)  // total
      .mockResolvedValueOnce(7);  // resueltos
    models.ReasignacionExcepcional.count.mockResolvedValue(2);
    models.AuditoriaBloqueDisponibilidad.findAll.mockResolvedValue([
      { origen: 'ENVIO', total: '12' },
      { origen: 'CONFIRMACION', total: '5' },
      { origen: 'REVERSION_AUTOMATICA', total: '3' },
    ]);

    const m = await service.obtenerMetricasTrazabilidad({});

    expect(m.conflictos).toMatchObject({ total: 10, resueltos: 7, pendientes: 3, tasaResolucion: 0.7 });
    expect(m.reasignacionesExcepcionales.total).toBe(2);
    expect(m.cambiosDeBloque.manuales).toBe(17);
    expect(m.cambiosDeBloque.automaticos).toBe(3);
    expect(m.cambiosDeBloque.total).toBe(20);
    expect(m.cambiosDeBloque.tasaAutomatica).toBe(0.15);
  });

  test('sin datos no divide por cero: las tasas quedan en null', async () => {
    models.ConflictoDeteccion.count.mockResolvedValue(0);
    models.ReasignacionExcepcional.count.mockResolvedValue(0);
    models.AuditoriaBloqueDisponibilidad.findAll.mockResolvedValue([]);

    const m = await service.obtenerMetricasTrazabilidad({});

    expect(m.conflictos.tasaResolucion).toBeNull();
    expect(m.cambiosDeBloque.tasaAutomatica).toBeNull();
  });
});

// ============================================================
// I3 / I4 — Preview con dos listas, aplicado por id
// ============================================================

describe('I4 — aplicar exige un preview guardado, no un array del cliente', () => {
  test('preview inexistente: se rechaza', async () => {
    models.PreviewDistribucion.findByPk.mockResolvedValue(null);

    await expect(
      service.aplicarPreviewDistribucion({ previewId: 999, adminId: 1 })
    ).rejects.toThrow(/no encontrado/i);
  });

  test('preview ya aplicado: se rechaza (reintentar por red no redistribuye)', async () => {
    models.PreviewDistribucion.findByPk.mockResolvedValue({
      id: 1, estado: 'APLICADO', payload: { propuestas: [] },
    });

    await expect(
      service.aplicarPreviewDistribucion({ previewId: 1, adminId: 1 })
    ).rejects.toThrow(/ya fue aplicado/i);
  });

  test('aplica las propuestas del preview guardado y lo marca APLICADO', async () => {
    const preview = {
      id: 5,
      estado: 'PENDIENTE',
      created_at: new Date(),
      periodo_id: null,
      payload: {
        propuestas: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
        periodoId: null,
      },
      save: jest.fn(),
    };
    models.PreviewDistribucion.findByPk.mockResolvedValue(preview);

    const bloque = crearBloqueMock({ id: 100, clase_id: 1, estado: 'LIBRE' });
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloque, false]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]);

    const res = await service.aplicarPreviewDistribucion({ previewId: 5, adminId: 42 });

    expect(res.aplicadas).toEqual([1]);
    expect(bloque.estado).toBe('CONFIRMADO');
    expect(preview.estado).toBe('APLICADO');
    expect(preview.aplicado_por).toBe(42);
    expect(preview.save).toHaveBeenCalled();
  });
});

describe('I3 — el preview guarda las tres listas, no solo las propuestas', () => {
  test('crearPreviewDistribucion persiste sinCambios junto con las propuestas', async () => {
    const distribucionService = require('../src/services/distribucion.service');
    distribucionService.calcularDistribucionFillGaps = jest.fn().mockResolvedValue({
      propuestas: [{ claseId: 1, aulaId: 5 }],
      sinCambios: [{ claseId: 2, estado: 'CONFIRMADO', motivo: 'CONFIRMADO por su carrera' }],
      sinAsignar: [{ claseId: 3, motivo: 'Sin aula disponible' }],
      estadisticas: { totalClasesEnAlcance: 3, totalCandidatas: 2, sinCambios: 1, propuestas: 1, sinAsignar: 1 },
    });
    models.PreviewDistribucion.create.mockResolvedValue({ id: 9 });

    const res = await service.crearPreviewDistribucion({ carreraId: 10, periodoId: 7, adminId: 3 });

    expect(res.previewId).toBe(9);

    const guardado = models.PreviewDistribucion.create.mock.calls[0][0];
    expect(guardado.estado).toBe('PENDIENTE');
    expect(guardado.creado_por).toBe(3);
    // Las tres listas quedan como evidencia de lo que se le mostró al admin.
    expect(guardado.payload.propuestas).toHaveLength(1);
    expect(guardado.payload.sinCambios).toHaveLength(1);
    expect(guardado.payload.sinAsignar).toHaveLength(1);
  });
});

// ============================================================
// I2 — reintentos no acumulan conflictos, y confirmar toma lock
// ============================================================

describe('I2 — reenviar el mismo bloque no duplica ConflictoDeteccion', () => {
  test('el bloque SIGUE chocando: se actualiza la fila existente, no se crea otra', async () => {
    const flujoPropio = crearFlujoMock({ id: 1, carrera_id: 10 });
    models.FlujoPlanificacion.findOrCreate.mockResolvedValue([flujoPropio, false]);

    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      crearBloqueMock({
        id: 900, clase_id: 77, aula_id: 5, dia: 'Lunes',
        hora_inicio: '08:00', hora_fin: '10:00',
        estado: 'CONFIRMADO', flujo_planificacion_id: 99,
      }),
    ]);

    const bloquePropio = crearBloqueMock({ id: 100, clase_id: 1 });
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloquePropio, false]);
    models.Clase.findByPk.mockResolvedValue(null);

    const filaExistente = {
      id: 555,
      update: jest.fn().mockResolvedValue({ id: 555 }),
    };
    models.ConflictoDeteccion.findOne.mockResolvedValue(filaExistente);

    const { conflictos } = await service.enviarPlanificacion({
      carreraId: 10,
      usuarioId: 1,
      bloques: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
    });

    expect(conflictos).toHaveLength(1);
    expect(conflictos[0].conflictoId).toBe(555); // la fila reutilizada, no una nueva
    expect(filaExistente.update).toHaveBeenCalledTimes(1);
    expect(models.ConflictoDeteccion.create).not.toHaveBeenCalled();
  });

  test('el bloque YA NO choca: las filas previas se marcan resuelto=true', async () => {
    const flujoPropio = crearFlujoMock({ id: 1, carrera_id: 10 });
    models.FlujoPlanificacion.findOrCreate.mockResolvedValue([flujoPropio, false]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]); // el conflicto anterior ya no existe

    const bloquePropio = crearBloqueMock({ id: 100, clase_id: 1 });
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloquePropio, false]);
    models.ConflictoDeteccion.findOne.mockResolvedValue({ id: 555 }); // el director ya había chocado antes

    const { conflictos } = await service.enviarPlanificacion({
      carreraId: 10,
      usuarioId: 1,
      bloques: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
    });

    expect(conflictos).toHaveLength(0);
    expect(bloquePropio.estado).toBe('EN_REVISION');
    expect(models.ConflictoDeteccion.update).toHaveBeenCalledWith(
      { resuelto: true },
      expect.objectContaining({ where: { bloque_id: bloquePropio.id, resuelto: false } })
    );
  });

  test('sin conflicto previo: no se toca ConflictoDeteccion.update', async () => {
    const flujoPropio = crearFlujoMock({ id: 1, carrera_id: 10 });
    models.FlujoPlanificacion.findOrCreate.mockResolvedValue([flujoPropio, false]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]);

    const bloquePropio = crearBloqueMock({ id: 100, clase_id: 1 });
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloquePropio, false]);
    models.ConflictoDeteccion.findOne.mockResolvedValue(null);

    await service.enviarPlanificacion({
      carreraId: 10,
      usuarioId: 1,
      bloques: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
    });

    expect(models.ConflictoDeteccion.update).not.toHaveBeenCalled();
  });
});

describe('M2 — confirmarPlanificacion es idempotente si ya está CONFIRMADA', () => {
  test('doble clic / reintento: retorna el flujo sin tirar error ni volver a escribir', async () => {
    const flujo = crearFlujoMock({ id: 1, estado: 'CONFIRMADA' });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);

    const resultado = await service.confirmarPlanificacion({ carreraId: 10, usuarioId: 1 });

    expect(resultado).toBe(flujo);
    expect(flujo.save).not.toHaveBeenCalled();
    expect(models.BloqueDisponibilidad.findAll).not.toHaveBeenCalled();
    expect(models.FlujoPlanificacionVersion.create).not.toHaveBeenCalled();
  });
});
