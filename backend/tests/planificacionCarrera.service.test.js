// Mocks puros (mismo patrón que distribucion.service.test.js): permite
// require() del servicio sin tocar la BD real. Los tests de concurrencia
// real (advisory lock contra Postgres) viven en
// planificacionCarrera.concurrencia.test.js.

const fakeTransaction = { LOCK: { UPDATE: 'UPDATE' } };

jest.mock('../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (cb) => cb(fakeTransaction)),
    query: jest.fn().mockResolvedValue([]),
    fn: jest.fn(),
    col: jest.fn(),
    where: jest.fn(),
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
  FlujoPlanificacion: { findOne: jest.fn(), findOrCreate: jest.fn() },
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
    { ORIGENES_MANUALES: ['ENVIO', 'CONFIRMACION', 'REAPERTURA', 'FILL_GAPS', 'REASIGNACION_EXCEPCIONAL'] }
  ),
  FechaLimiteExtendida: { create: jest.fn(), findOne: jest.fn() },
  Carrera: { findByPk: jest.fn() },
  Clase: { findByPk: jest.fn(), findAll: jest.fn() },
  Aula: { findAll: jest.fn() },
  User: { findAll: jest.fn() },
  Notificacion: { create: jest.fn() },
}));

const models = require('../src/models');
const { sequelize } = require('../src/config/database');
const distribucionService = require('../src/services/distribucion.service');
const { obtenerDirectoresDeCarrera } = require('../src/utils/directorScope');
const service = require('../src/services/planificacionCarrera.service');

/** Fabrica una instancia "tipo Sequelize" con .save() mockeado. */
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

// ============================================
// reabrirBorrador
// ============================================
describe('reabrirBorrador', () => {
  test('lanza error si no existe flujo para la carrera/período', async () => {
    models.FlujoPlanificacion.findOne.mockResolvedValue(null);

    await expect(
      service.reabrirBorrador({ carreraId: 10, usuarioId: 1 })
    ).rejects.toThrow(/no existe planificación/i);
  });

  test('idempotente: si ya está BORRADOR no toca bloques ni versiona', async () => {
    const flujo = crearFlujoMock({ estado: 'BORRADOR' });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);

    const resultado = await service.reabrirBorrador({ carreraId: 10, usuarioId: 1 });

    expect(resultado).toBe(flujo);
    expect(flujo.save).not.toHaveBeenCalled();
    expect(models.BloqueDisponibilidad.update).not.toHaveBeenCalled();
    expect(models.FlujoPlanificacionVersion.create).not.toHaveBeenCalled();
  });

  test('CONFIRMADA -> BORRADOR: bloques CONFIRMADO/EN_REVISION del flujo pasan a EN_REVISION (no a LIBRE)', async () => {
    const flujo = crearFlujoMock({ estado: 'CONFIRMADA', fecha_limite: null });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);

    // Desde I5 los bloques se recorren y guardan uno por uno en vez de un
    // UPDATE masivo: la regla 7 exige registrar el estado ANTERIOR de cada
    // bloque, y un UPDATE en bloque lo pisa sin dejar forma de saberlo.
    const bloqueConfirmado = crearBloqueMock({
      id: 100, clase_id: 1, estado: 'CONFIRMADO', flujo_planificacion_id: flujo.id,
    });
    const bloqueEnRevision = crearBloqueMock({
      id: 101, clase_id: 2, estado: 'EN_REVISION', flujo_planificacion_id: flujo.id,
    });
    models.BloqueDisponibilidad.findAll.mockResolvedValue([bloqueConfirmado, bloqueEnRevision]);

    await service.reabrirBorrador({ carreraId: 10, usuarioId: 1 });

    expect(flujo.estado).toBe('BORRADOR');
    expect(flujo.save).toHaveBeenCalledTimes(1);

    // Solo se consultan los bloques del flujo, y solo en esos dos estados.
    expect(models.BloqueDisponibilidad.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ flujo_planificacion_id: flujo.id }),
      })
    );

    // Ambos quedan EN_REVISION. Ninguno se libera a LIBRE.
    expect(bloqueConfirmado.estado).toBe('EN_REVISION');
    expect(bloqueEnRevision.estado).toBe('EN_REVISION');
    expect(bloqueConfirmado.save).toHaveBeenCalledTimes(1);
    expect(bloqueEnRevision.save).toHaveBeenCalledTimes(1);

    expect(models.FlujoPlanificacionVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ estado_resultante: 'BORRADOR' }),
      expect.anything()
    );
  });

  test('rechaza reabrir si la fecha límite general ya venció y no hay extensión', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const flujo = crearFlujoMock({ estado: 'ENVIADA', fecha_limite: ayer });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);
    models.FechaLimiteExtendida.findOne.mockResolvedValue(null);

    await expect(
      service.reabrirBorrador({ carreraId: 10, usuarioId: 1 })
    ).rejects.toThrow(/fecha límite ya venció/i);

    expect(flujo.save).not.toHaveBeenCalled();
  });

  test('permite reabrir si la fecha límite general venció PERO hay una extensión vigente', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const flujo = crearFlujoMock({ estado: 'ENVIADA', fecha_limite: ayer });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);
    models.FechaLimiteExtendida.findOne.mockResolvedValue({ nueva_fecha: manana });

    await service.reabrirBorrador({ carreraId: 10, usuarioId: 1 });

    expect(flujo.estado).toBe('BORRADOR');
  });
});

// ============================================
// enviarPlanificacion
// ============================================
describe('enviarPlanificacion', () => {
  test('sin conflicto: bloque pasa a EN_REVISION y flujo a ENVIADA', async () => {
    const flujo = crearFlujoMock({ estado: 'BORRADOR' });
    models.FlujoPlanificacion.findOrCreate.mockResolvedValue([flujo, false]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]); // sin bloques CONFIRMADO -> sin solapamiento
    const bloque = crearBloqueMock();
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloque, true]);

    const { flujo: flujoResultado, conflictos } = await service.enviarPlanificacion({
      carreraId: 10,
      usuarioId: 1,
      bloques: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
    });

    expect(conflictos).toHaveLength(0);
    expect(bloque.estado).toBe('EN_REVISION');
    expect(bloque.save).toHaveBeenCalledTimes(1);
    expect(flujoResultado.estado).toBe('ENVIADA');
    expect(models.FlujoPlanificacionVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ estado_resultante: 'ENVIADA' }),
      expect.anything()
    );
  });

  test('con conflicto contra bloque CONFIRMADO de otra carrera: NO toca el bloque propio, crea ConflictoDeteccion, flujo NO avanza a ENVIADA', async () => {
    const flujo = crearFlujoMock({ estado: 'BORRADOR' });
    models.FlujoPlanificacion.findOrCreate.mockResolvedValue([flujo, false]);

    // Bloque CONFIRMADO de otra carrera, mismo aula/día, horario solapado
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      { id: 999, clase_id: 999, hora_inicio: '08:00', hora_fin: '10:00' },
    ]);

    const bloquePropio = crearBloqueMock();
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloquePropio, true]);
    models.Clase.findByPk.mockResolvedValue({ id: 1, materia: 'Calculo I', carrera: 'Ingenieria' });
    models.Clase.findAll.mockResolvedValue([]); // ocupación legado, usada por sugerirAula() al armar la alternativa
    distribucionService.buscarAulaOptima.mockReturnValue(null);
    models.Aula.findAll.mockResolvedValue([]);

    const { flujo: flujoResultado, conflictos } = await service.enviarPlanificacion({
      carreraId: 10,
      usuarioId: 1,
      bloques: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '09:00', horaFin: '11:00' }],
    });

    expect(conflictos).toHaveLength(1);
    expect(bloquePropio.estado).toBe('LIBRE'); // sin tocar
    expect(bloquePropio.save).not.toHaveBeenCalled();
    expect(models.ConflictoDeteccion.create).toHaveBeenCalledTimes(1);
    expect(flujoResultado.estado).toBe('BORRADOR'); // no avanzó
    expect(flujo.save).not.toHaveBeenCalled();
  });

  test('rechaza enviar si el flujo ya está CONFIRMADA', async () => {
    const flujo = crearFlujoMock({ estado: 'CONFIRMADA' });
    models.FlujoPlanificacion.findOrCreate.mockResolvedValue([flujo, false]);

    await expect(
      service.enviarPlanificacion({ carreraId: 10, usuarioId: 1, bloques: [] })
    ).rejects.toThrow(/ya está confirmada/i);
  });
});

// ============================================
// confirmarPlanificacion
// ============================================
describe('confirmarPlanificacion', () => {
  test('rechaza si el flujo no está ENVIADA', async () => {
    const flujo = crearFlujoMock({ estado: 'BORRADOR' });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);

    await expect(
      service.confirmarPlanificacion({ carreraId: 10, usuarioId: 1 })
    ).rejects.toThrow(/no se puede confirmar desde estado/i);
  });

  test('rechaza si hay conflictos sin resolver', async () => {
    const flujo = crearFlujoMock({ estado: 'ENVIADA' });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);
    models.ConflictoDeteccion.count.mockResolvedValue(2);

    await expect(
      service.confirmarPlanificacion({ carreraId: 10, usuarioId: 1 })
    ).rejects.toThrow(/2 conflicto\(s\) sin resolver/i);
  });

  test('feliz camino: toma advisory lock por aula+día y confirma todos los bloques EN_REVISION', async () => {
    const flujo = crearFlujoMock({ estado: 'ENVIADA' });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);
    models.ConflictoDeteccion.count.mockResolvedValue(0);

    const bloque1 = crearBloqueMock({ id: 1, aula_id: 5, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00', estado: 'EN_REVISION' });
    const bloque2 = crearBloqueMock({ id: 2, aula_id: 6, dia: 'Martes', hora_inicio: '10:00', hora_fin: '12:00', estado: 'EN_REVISION' });
    models.BloqueDisponibilidad.findAll
      .mockResolvedValueOnce([bloque1, bloque2]) // bloques EN_REVISION del flujo
      .mockResolvedValue([]); // sin CONFIRMADO solapado en el re-check

    await service.confirmarPlanificacion({ carreraId: 10, usuarioId: 1 });

    // 2 aulas distintas => 2 llamadas a pg_advisory_xact_lock
    expect(sequelize.query).toHaveBeenCalledTimes(2);
    expect(sequelize.query.mock.calls[0][0]).toMatch(/pg_advisory_xact_lock/);

    expect(bloque1.estado).toBe('CONFIRMADO');
    expect(bloque2.estado).toBe('CONFIRMADO');
    expect(flujo.estado).toBe('CONFIRMADA');
    expect(flujo.fecha_confirmacion).toBeInstanceOf(Date);
    expect(models.Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'CARRERA', carrera_id: 10 }),
      expect.anything()
    );
  });

  test('blindaje anti-carrera: si el re-check dentro del lock encuentra un CONFIRMADO solapado (colado por otra carrera), aborta', async () => {
    const flujo = crearFlujoMock({ estado: 'ENVIADA' });
    models.FlujoPlanificacion.findOne.mockResolvedValue(flujo);
    models.ConflictoDeteccion.count.mockResolvedValue(0);

    const bloque = crearBloqueMock({ id: 1, aula_id: 5, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00', estado: 'EN_REVISION' });
    models.BloqueDisponibilidad.findAll
      .mockResolvedValueOnce([bloque])
      .mockResolvedValue([{ id: 999, clase_id: 999, hora_inicio: '08:00', hora_fin: '10:00' }]); // ya confirmado por otra carrera

    await expect(
      service.confirmarPlanificacion({ carreraId: 10, usuarioId: 1 })
    ).rejects.toThrow(/conflicto de último momento/i);

    expect(flujo.estado).toBe('ENVIADA'); // no se marcó CONFIRMADA
  });
});

// ============================================
// reasignacionExcepcional
// ============================================
describe('reasignacionExcepcional', () => {
  test('rechaza sin motivo, sin tocar el bloque', async () => {
    await expect(
      service.reasignacionExcepcional({ bloqueId: 1, adminId: 2, motivo: '   ' })
    ).rejects.toThrow(/al menos 15 caracteres/i);

    expect(models.BloqueDisponibilidad.findByPk).not.toHaveBeenCalled();
  });

  // M1: §3.5 exige validar longitud mínima en backend, no confiar solo en
  // el frontend — un "." vacío-ish no debe pasar solo por no estar vacío.
  test('rechaza un motivo no vacío pero demasiado corto (M1)', async () => {
    await expect(
      service.reasignacionExcepcional({ bloqueId: 1, adminId: 2, motivo: 'urgente.' })
    ).rejects.toThrow(/al menos 15 caracteres/i);

    expect(models.BloqueDisponibilidad.findByPk).not.toHaveBeenCalled();
  });

  test('rechaza si el bloque no está CONFIRMADO', async () => {
    const bloque = crearBloqueMock({ estado: 'EN_REVISION' });
    models.BloqueDisponibilidad.findByPk.mockResolvedValue(bloque);

    await expect(
      service.reasignacionExcepcional({ bloqueId: 1, adminId: 2, motivo: 'Cambio urgente de aula' })
    ).rejects.toThrow(/solo se puede reasignar excepcionalmente un bloque CONFIRMADO/i);
  });

  test('feliz camino: actualiza bloque CONFIRMADO, registra motivo, notifica a los directores de la carrera afectada', async () => {
    const bloque = crearBloqueMock({ estado: 'CONFIRMADO', clase_id: 42 });
    models.BloqueDisponibilidad.findByPk.mockResolvedValue(bloque);
    models.ReasignacionExcepcional.create.mockResolvedValue({ id: 1 });
    models.Clase.findByPk.mockResolvedValue({ id: 42, carrera_id: 10 });
    obtenerDirectoresDeCarrera.mockResolvedValue([{ id: 5 }, { id: 6 }]);

    await service.reasignacionExcepcional({
      bloqueId: bloque.id,
      adminId: 2,
      motivo: 'Emergencia edilicia en el aula original',
      nuevaAulaId: 7,
    });

    expect(bloque.aula_id).toBe(7);
    expect(bloque.save).toHaveBeenCalledTimes(1);
    expect(models.ReasignacionExcepcional.create).toHaveBeenCalledWith(
      expect.objectContaining({ bloque_id: bloque.id, admin_id: 2, motivo: 'Emergencia edilicia en el aula original' }),
      expect.anything()
    );
    expect(models.Notificacion.create).toHaveBeenCalledTimes(2); // uno por director
    expect(models.Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'DIRECTA', destinatario_id: 5 }),
      expect.anything()
    );
  });
});

// ============================================
// detectarCarrerasSinEnviar / extenderFechaLimite
// ============================================
describe('detectarCarrerasSinEnviar', () => {
  test('flujo vencido sin extensión: notifica a admins y lo retorna', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    models.FlujoPlanificacion.findAll = jest.fn().mockResolvedValue([
      { id: 1, carrera_id: 10, carrera: { carrera: 'Psicologia' }, fecha_limite: ayer },
    ]);
    models.FechaLimiteExtendida.findOne.mockResolvedValue(null);
    models.User.findAll.mockResolvedValue([{ id: 1 }]);

    const vencidas = await service.detectarCarrerasSinEnviar({});

    expect(vencidas).toHaveLength(1);
    expect(models.Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'DIRECTA', destinatario_id: 1 })
    );
  });

  test('con extensión vigente futura: no notifica', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
    models.FlujoPlanificacion.findAll = jest.fn().mockResolvedValue([
      { id: 1, carrera_id: 10, carrera: { carrera: 'Psicologia' }, fecha_limite: ayer },
    ]);
    models.FechaLimiteExtendida.findOne.mockResolvedValue({ nueva_fecha: manana });

    const vencidas = await service.detectarCarrerasSinEnviar({});

    expect(vencidas).toHaveLength(0);
    expect(models.Notificacion.create).not.toHaveBeenCalled();
  });
});

// ============================================
// aplicarDistribucionFillGaps (Fase 3)
// ============================================
describe('aplicarDistribucionFillGaps', () => {
  test('propuesta sobre bloque LIBRE: se aplica y pasa a CONFIRMADO', async () => {
    const bloque = crearBloqueMock({ clase_id: 1, estado: 'LIBRE' });
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloque, false]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]); // sin CONFIRMADO solapado

    const { aplicadas, omitidas } = await service.aplicarDistribucionFillGaps({
      propuestas: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
      adminId: 2,
    });

    expect(bloque.estado).toBe('CONFIRMADO');
    expect(bloque.aula_id).toBe(5);
    expect(bloque.save).toHaveBeenCalledTimes(1);
    expect(aplicadas).toEqual([1]);
    expect(omitidas).toHaveLength(0);
  });

  test('propuesta sobre bloque que ya está CONFIRMADO (carrera condition): se omite, nunca se toca', async () => {
    const bloque = crearBloqueMock({ clase_id: 1, estado: 'CONFIRMADO', aula_id: 9 });
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloque, false]);

    const { aplicadas, omitidas } = await service.aplicarDistribucionFillGaps({
      propuestas: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
      adminId: 2,
    });

    expect(bloque.save).not.toHaveBeenCalled();
    expect(bloque.aula_id).toBe(9); // sin tocar
    expect(aplicadas).toHaveLength(0);
    expect(omitidas).toHaveLength(1);
    expect(omitidas[0].motivo).toMatch(/ya fue CONFIRMADO/i);
  });

  test('propuesta sobre bloque EN_REVISION: se omite, no pisa la edición activa de un director', async () => {
    const bloque = crearBloqueMock({ clase_id: 1, estado: 'EN_REVISION' });
    models.BloqueDisponibilidad.findOrCreate.mockResolvedValue([bloque, false]);

    const { aplicadas, omitidas } = await service.aplicarDistribucionFillGaps({
      propuestas: [{ claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
      adminId: 2,
    });

    expect(bloque.save).not.toHaveBeenCalled();
    expect(aplicadas).toHaveLength(0);
    expect(omitidas[0].motivo).toMatch(/EN_REVISION/i);
  });

  test('advisory lock: una llamada por clave (aula,dia) única, ignora duplicados', async () => {
    const bloque1 = crearBloqueMock({ clase_id: 1, estado: 'LIBRE' });
    const bloque2 = crearBloqueMock({ clase_id: 2, estado: 'LIBRE' });
    models.BloqueDisponibilidad.findOrCreate
      .mockResolvedValueOnce([bloque1, false])
      .mockResolvedValueOnce([bloque2, false]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([]);

    await service.aplicarDistribucionFillGaps({
      propuestas: [
        { claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' },
        { claseId: 2, aulaId: 5, dia: 'Lunes', horaInicio: '11:00', horaFin: '13:00' }, // misma aula+día, distinto horario
      ],
      adminId: 2,
    });

    expect(sequelize.query).toHaveBeenCalledTimes(1); // 1 clave única (5|Lunes), no 2
  });

  test('solapamiento contra CONFIRMADO ajeno detectado al aplicar: omite esa propuesta puntual, sigue con las demás (no aborta todo)', async () => {
    const bloque1 = crearBloqueMock({ clase_id: 1, estado: 'LIBRE' });
    const bloque2 = crearBloqueMock({ clase_id: 2, estado: 'LIBRE' });
    models.BloqueDisponibilidad.findOrCreate
      .mockResolvedValueOnce([bloque1, false])
      .mockResolvedValueOnce([bloque2, false]);
    // La clase 1 choca con un CONFIRMADO ya existente; la clase 2 no.
    models.BloqueDisponibilidad.findAll
      .mockResolvedValueOnce([{ id: 999, clase_id: 999, hora_inicio: '08:00', hora_fin: '10:00' }])
      .mockResolvedValueOnce([]);

    const { aplicadas, omitidas } = await service.aplicarDistribucionFillGaps({
      propuestas: [
        { claseId: 1, aulaId: 5, dia: 'Lunes', horaInicio: '09:00', horaFin: '11:00' },
        { claseId: 2, aulaId: 6, dia: 'Martes', horaInicio: '08:00', horaFin: '10:00' },
      ],
      adminId: 2,
    });

    expect(omitidas).toHaveLength(1);
    expect(omitidas[0].claseId).toBe(1);
    expect(bloque1.save).not.toHaveBeenCalled();
    expect(aplicadas).toEqual([2]);
    expect(bloque2.estado).toBe('CONFIRMADO');
  });
});

describe('extenderFechaLimite', () => {
  test('crea el registro sin tocar flujos_planificacion.fecha_limite', async () => {
    const nuevaFecha = new Date();
    models.FechaLimiteExtendida.create.mockResolvedValue({ id: 1 });

    await service.extenderFechaLimite({ carreraId: 10, nuevaFecha, adminId: 2 });

    expect(models.FechaLimiteExtendida.create).toHaveBeenCalledWith({
      carrera_id: 10,
      periodo_id: null,
      nueva_fecha: nuevaFecha,
      autorizado_por: 2,
    });
    expect(models.FlujoPlanificacion.findOne).not.toHaveBeenCalled();
  });

  test('la extensión queda anclada al período indicado (I1)', async () => {
    const nuevaFecha = new Date();
    models.FechaLimiteExtendida.create.mockResolvedValue({ id: 1 });

    await service.extenderFechaLimite({ carreraId: 10, periodoId: 7, nuevaFecha, adminId: 2 });

    expect(models.FechaLimiteExtendida.create).toHaveBeenCalledWith(
      expect.objectContaining({ carrera_id: 10, periodo_id: 7 })
    );
  });
});
