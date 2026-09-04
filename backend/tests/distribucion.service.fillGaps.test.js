// Tests de calcularDistribucionFillGaps (Fase 3). A diferencia de
// distribucion.service.test.js (que mockea todo `../src/models` con
// objetos vacíos), aquí SÍ mockeamos los métodos usados, para poder
// controlar candidatas/aulas/bloques y verificar:
//   1. Paridad con buscarAulaOptima() cuando no hay restricciones nuevas
//      (mismo resultado que el motor original, intacto).
//   2. CONFIRMADO se respeta como restricción fija (excluye la clase del
//      cálculo Y bloquea el hueco para las demás).
//   3. EN_REVISION se excluye del cálculo Y bloquea ocupación (regla 3.2:
//      reserva temporal que nadie más puede tomar mientras el director edita).
//   4. Nunca escribe nada en la base de datos — 100% lectura.

jest.mock('../src/models', () => ({
  Clase: { findAll: jest.fn() },
  Aula: { findAll: jest.fn() },
  Carrera: { findByPk: jest.fn(), create: jest.fn() },
  BloqueDisponibilidad: { findAll: jest.fn(), create: jest.fn(), update: jest.fn() },
}));

const models = require('../src/models');
const distribucionService = require('../src/services/distribucion.service');

/** Misma fábrica que distribucion.service.test.js (tienePrioridad real del modelo Aula). */
function crearAula({ id, codigo, capacidad, restriccion_carrera = null, es_prioritaria = false }) {
  return {
    id,
    codigo,
    nombre: codigo,
    capacidad,
    tipo: 'AULA',
    estado: 'disponible',
    restriccion_carrera,
    es_prioritaria,
    tienePrioridad(carrera) {
      if (!this.restriccion_carrera) return false;
      const valor = this.restriccion_carrera.toLowerCase();
      const busqueda = (carrera || '').toLowerCase();
      return valor.split(',').map((c) => c.trim()).includes(busqueda);
    },
  };
}

function crearClase({ id, carrera = 'Ingenieria', materia = 'Calculo I', num_estudiantes = 30, dia = 'Lunes', hora_inicio = '08:00', hora_fin = '10:00', aula_asignada = null }) {
  return { id, carrera, materia, num_estudiantes, dia, hora_inicio, hora_fin, aula_asignada };
}

beforeEach(() => {
  jest.clearAllMocks();
  models.Carrera.findByPk.mockResolvedValue(null); // sin filtro de carrera por defecto
  models.BloqueDisponibilidad.findAll.mockResolvedValue([]); // sin bloques previos por defecto
});

describe('calcularDistribucionFillGaps — paridad con el motor original', () => {
  // Corre el mismo escenario dos veces: una a través del wrapper nuevo,
  // otra directamente contra buscarAulaOptima sin modificar. Si difieren,
  // algo en el wrapper alteró el comportamiento original.
  test('sin ningún BloqueDisponibilidad ni aula_asignada previo: da el mismo resultado que llamar buscarAulaOptima directamente', async () => {
    const aula = crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 });
    const clase = crearClase({ id: 1 });

    models.Clase.findAll.mockResolvedValue([clase]);
    models.Aula.findAll.mockResolvedValue([aula]);

    const { propuestas } = await distribucionService.calcularDistribucionFillGaps();

    const resultadoDirecto = distribucionService.buscarAulaOptima(clase, [aula], {}, true);

    expect(propuestas).toHaveLength(1);
    expect(propuestas[0].aulaCodigo).toBe(resultadoDirecto.aula.codigo);
    expect(propuestas[0].claseId).toBe(clase.id);
    expect(propuestas[0].isOvercapacity).toBe(!!resultadoDirecto.isOvercapacity);
  });
});

describe('calcularDistribucionFillGaps — respeta CONFIRMADO como restricción fija', () => {
  test('clase con bloque CONFIRMADO: excluida de candidatas y su hueco queda ocupado para las demás', async () => {
    const aula = crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 });
    const claseConfirmada = crearClase({ id: 1, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' });
    const claseCandidata = crearClase({ id: 2, dia: 'Lunes', hora_inicio: '09:00', hora_fin: '11:00' }); // solapa con la confirmada

    models.Clase.findAll.mockResolvedValue([claseConfirmada, claseCandidata]);
    models.Aula.findAll.mockResolvedValue([aula]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      { clase_id: 1, estado: 'CONFIRMADO', aula_id: 1, dia: 'Lunes', hora_inicio: '08:00:00', hora_fin: '10:00:00', aula },
    ]);

    const { propuestas, sinAsignar } = await distribucionService.calcularDistribucionFillGaps();

    // La clase 1 (ya CONFIRMADA) nunca aparece como propuesta — no se recalcula.
    expect(propuestas.find((p) => p.claseId === 1)).toBeUndefined();
    // La clase 2 no tiene dónde caber: la única aula está ocupada por el CONFIRMADO en su horario.
    expect(propuestas.find((p) => p.claseId === 2)).toBeUndefined();
    expect(sinAsignar.map((s) => s.claseId)).toContain(2);
  });
});

describe('calcularDistribucionFillGaps — EN_REVISION bloquea la ocupación (regla 3.2)', () => {
  // Cambio de conducta respecto de la versión anterior de este test, que
  // afirmaba que EN_REVISION "no bloquea ocupación". La regla 3.2 dice lo
  // contrario: EN_REVISION es una reserva temporal que nadie más puede
  // tomar. Si el motor puede asignar encima, el estado no protege nada y
  // el director que estaba editando pierde el espacio sin enterarse.
  test('clase con bloque EN_REVISION: no aparece como propuesta Y su horario queda bloqueado para las demás', async () => {
    const aula = crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 });
    const claseEnRevision = crearClase({ id: 1, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' });
    const claseCandidata = crearClase({ id: 2, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' }); // mismo horario

    models.Clase.findAll.mockResolvedValue([claseEnRevision, claseCandidata]);
    models.Aula.findAll.mockResolvedValue([aula]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      {
        clase_id: 1,
        estado: 'EN_REVISION',
        aula_id: 1,
        dia: 'Lunes',
        hora_inicio: '08:00:00',
        hora_fin: '10:00:00',
        aula: { id: 1, codigo: 'AULA-101' },
      },
    ]);

    const { propuestas, sinAsignar } = await distribucionService.calcularDistribucionFillGaps();

    expect(propuestas.find((p) => p.claseId === 1)).toBeUndefined(); // excluida del cálculo
    expect(propuestas.find((p) => p.claseId === 2)).toBeUndefined(); // el hueco NO está disponible
    expect(sinAsignar.find((s) => s.claseId === 2)).toBeDefined();
  });

  test('EN_REVISION en otro horario no bloquea: la candidata sí entra', async () => {
    const aula = crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 });
    const claseEnRevision = crearClase({ id: 1, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' });
    const claseCandidata = crearClase({ id: 2, dia: 'Lunes', hora_inicio: '10:00', hora_fin: '12:00' });

    models.Clase.findAll.mockResolvedValue([claseEnRevision, claseCandidata]);
    models.Aula.findAll.mockResolvedValue([aula]);
    models.BloqueDisponibilidad.findAll.mockResolvedValue([
      {
        clase_id: 1,
        estado: 'EN_REVISION',
        aula_id: 1,
        dia: 'Lunes',
        hora_inicio: '08:00:00',
        hora_fin: '10:00:00',
        aula: { id: 1, codigo: 'AULA-101' },
      },
    ]);

    const { propuestas } = await distribucionService.calcularDistribucionFillGaps();

    expect(propuestas.find((p) => p.claseId === 2)).toBeDefined();
    expect(propuestas.find((p) => p.claseId === 2).aulaCodigo).toBe('AULA-101');
  });
});

describe('calcularDistribucionFillGaps — equidad entre carreras (round-robin por fase)', () => {
  test('2 carreras compiten por 2 aulas en el mismo horario: cada una se lleva una, ninguna acapara las dos', async () => {
    const aula1 = crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 });
    const aula2 = crearAula({ id: 2, codigo: 'AULA-102', capacidad: 40 });

    // Orden de inserción deliberadamente desfavorable para CarreraB: sus dos
    // clases quedan últimas en el array, como pasaría si CarreraA cargó su
    // Excel primero. Sin round-robin, CarreraA agotaría las 2 aulas antes de
    // que CarreraB entre al loop.
    const claseA1 = crearClase({ id: 1, carrera: 'CarreraA', num_estudiantes: 30, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' });
    const claseA2 = crearClase({ id: 2, carrera: 'CarreraA', num_estudiantes: 30, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' });
    const claseB1 = crearClase({ id: 3, carrera: 'CarreraB', num_estudiantes: 30, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' });
    const claseB2 = crearClase({ id: 4, carrera: 'CarreraB', num_estudiantes: 30, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' });

    models.Clase.findAll.mockResolvedValue([claseA1, claseA2, claseB1, claseB2]);
    models.Aula.findAll.mockResolvedValue([aula1, aula2]);

    const { propuestas, sinAsignar } = await distribucionService.calcularDistribucionFillGaps();

    const propuestasPorCarrera = (carrera) => propuestas.filter((p) => p.carrera === carrera);

    // El punto central del fix: cada carrera se lleva exactamente 1 de las 2
    // aulas disponibles, no 2-0. Sin round-robin, CarreraA (procesada primero
    // en el array plano) se hubiera quedado con aula1 Y aula2.
    expect(propuestasPorCarrera('CarreraA')).toHaveLength(1);
    expect(propuestasPorCarrera('CarreraB')).toHaveLength(1);
    expect(propuestas).toHaveLength(2);
    expect(sinAsignar).toHaveLength(2); // una clase de cada carrera se queda sin aula — reparto parejo, no descarte de una sola
  });
});

describe('calcularDistribucionFillGaps — nunca escribe en la base de datos', () => {
  test('cero llamadas a create/update en cualquier modelo durante el cálculo', async () => {
    const aula = crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 });
    const clase = crearClase({ id: 1 });

    models.Clase.findAll.mockResolvedValue([clase]);
    models.Aula.findAll.mockResolvedValue([aula]);

    await distribucionService.calcularDistribucionFillGaps();

    expect(models.BloqueDisponibilidad.create).not.toHaveBeenCalled();
    expect(models.BloqueDisponibilidad.update).not.toHaveBeenCalled();
    expect(models.Carrera.create).not.toHaveBeenCalled();
  });

  test('estadisticas refleja candidatas/propuestas/sinAsignar correctamente', async () => {
    const aulaChica = crearAula({ id: 1, codigo: 'AULA-CHICA', capacidad: 10 });
    const claseGrande = crearClase({ id: 1, num_estudiantes: 100 }); // no cabe ni con 25% de flexibilidad

    models.Clase.findAll.mockResolvedValue([claseGrande]);
    models.Aula.findAll.mockResolvedValue([aulaChica]);

    const { estadisticas } = await distribucionService.calcularDistribucionFillGaps();

    expect(estadisticas.totalCandidatas).toBe(1);
    expect(estadisticas.propuestas).toBe(0);
    expect(estadisticas.sinAsignar).toBe(1);
  });
});
