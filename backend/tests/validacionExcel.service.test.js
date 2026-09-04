// Tests de validarClasesExcel (Fase 6a). Puro — sin DB, sin transacción.
// Verifica los 4 tipos de conflicto por separado y que el motor
// (buscarAulaOptima/aulaDisponibleEnHorario) se reutilice sin modificarse.

const { validarClasesExcel, TIPOS } = require('../src/services/validacionExcel.service');

function crearFila({
  fila,
  materia = 'Calculo I',
  ciclo = '1',
  paralelo = 'A',
  dia = 'Lunes',
  hora_inicio = '08:00',
  hora_fin = '10:00',
  num_estudiantes = 30,
  carrera = 'Ingenieria',
  aulaCodigo = 'AULA-101',
  aulaCapacidad = 40,
}) {
  return { fila, materia, ciclo, paralelo, dia, hora_inicio, hora_fin, num_estudiantes, carrera, aulaCodigo, aulaCapacidad };
}

function crearAula({ id, codigo, capacidad, estado = 'disponible' }) {
  return { id, codigo, nombre: codigo, capacidad, tipo: 'AULA', estado, restriccion_carrera: null, es_prioritaria: false };
}

describe('validarClasesExcel — caso limpio', () => {
  test('sin conflictos: todas las filas pasan a ok, cero conflictos', () => {
    const filas = [
      crearFila({ fila: 1, aulaCodigo: 'AULA-101', dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' }),
      crearFila({ fila: 2, materia: 'Fisica I', aulaCodigo: 'AULA-102', dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' }),
    ];
    const { ok, conflictos, estadisticas } = validarClasesExcel(filas, {}, [crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 })]);

    expect(ok).toHaveLength(2);
    expect(conflictos).toHaveLength(0);
    expect(estadisticas).toEqual({ totalFilas: 2, sinConflicto: 2, conConflicto: 0 });
  });
});

describe('validarClasesExcel — SOBRECUPO', () => {
  test('num_estudiantes > aulaCapacidad: reporta conflicto y sugiere alternativa que sí entra', () => {
    const filas = [crearFila({ fila: 1, num_estudiantes: 50, aulaCodigo: 'AULA-CHICA', aulaCapacidad: 30 })];
    const aulas = [
      crearAula({ id: 1, codigo: 'AULA-CHICA', capacidad: 30 }),
      crearAula({ id: 2, codigo: 'AULA-GRANDE', capacidad: 60 }),
    ];

    const { ok, conflictos } = validarClasesExcel(filas, {}, aulas);

    expect(ok).toHaveLength(0);
    expect(conflictos).toHaveLength(1);
    expect(conflictos[0].tipo).toBe(TIPOS.SOBRECUPO);
    expect(conflictos[0].filas).toEqual([1]);
    expect(conflictos[0].sugerencia).toEqual(
      expect.objectContaining({ aulaCodigo: 'AULA-GRANDE', isOvercapacity: false })
    );
  });

  test('sin aula resuelta (aulaCapacidad null): no evalúa sobrecupo — nada que comparar', () => {
    const filas = [crearFila({ fila: 1, num_estudiantes: 50, aulaCodigo: null, aulaCapacidad: null })];
    const { ok, conflictos } = validarClasesExcel(filas, {}, []);

    expect(conflictos).toHaveLength(0);
    expect(ok).toHaveLength(1);
  });
});

describe('validarClasesExcel — CHOQUE_INTERNO', () => {
  test('2 filas del mismo Excel, misma aula/día, horas solapadas: reporta el par completo', () => {
    const filas = [
      crearFila({ fila: 1, materia: 'Calculo I', aulaCodigo: 'AULA-101', dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' }),
      crearFila({ fila: 2, materia: 'Fisica I', aulaCodigo: 'AULA-101', dia: 'Lunes', hora_inicio: '09:00', hora_fin: '11:00' }),
    ];
    const { ok, conflictos } = validarClasesExcel(filas, {}, [crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 })]);

    expect(ok).toHaveLength(0); // ambas filas quedan marcadas, no solo una
    expect(conflictos).toHaveLength(1);
    expect(conflictos[0].tipo).toBe(TIPOS.CHOQUE_INTERNO);
    expect(conflictos[0].filas).toEqual([1, 2]);
  });

  test('misma aula/día pero horas NO solapadas: no reporta nada', () => {
    const filas = [
      crearFila({ fila: 1, materia: 'Calculo I', aulaCodigo: 'AULA-101', dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' }),
      crearFila({ fila: 2, materia: 'Fisica I', aulaCodigo: 'AULA-101', dia: 'Lunes', hora_inicio: '10:00', hora_fin: '12:00' }),
    ];
    const { conflictos } = validarClasesExcel(filas, {}, [crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 })]);

    expect(conflictos).toHaveLength(0);
  });
});

describe('validarClasesExcel — CHOQUE_CONFIRMADO', () => {
  test('la fila choca contra algo ya CONFIRMADO en el sistema (legado o colaborativo): reporta y sugiere alternativa', () => {
    const filas = [crearFila({ fila: 1, aulaCodigo: 'AULA-101', dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' })];
    const ocupacionExistente = { 'AULA-101': [{ dia: 'Lunes', inicio: 8 * 60, fin: 10 * 60 }] };
    const aulas = [
      crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 }),
      crearAula({ id: 2, codigo: 'AULA-102', capacidad: 40 }),
    ];

    const { ok, conflictos } = validarClasesExcel(filas, ocupacionExistente, aulas);

    expect(ok).toHaveLength(0);
    expect(conflictos).toHaveLength(1);
    expect(conflictos[0].tipo).toBe(TIPOS.CHOQUE_CONFIRMADO);
    expect(conflictos[0].sugerencia.aulaCodigo).toBe('AULA-102');
  });

  test('no reporta CHOQUE_INTERNO duplicado cuando el problema real es contra lo ya confirmado', () => {
    const filas = [crearFila({ fila: 1, aulaCodigo: 'AULA-101', dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00' })];
    const ocupacionExistente = { 'AULA-101': [{ dia: 'Lunes', inicio: 8 * 60, fin: 10 * 60 }] };

    const { conflictos } = validarClasesExcel(filas, ocupacionExistente, [crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 })]);

    // Una sola fila, un solo tipo de conflicto — no hay par posible para
    // CHOQUE_INTERNO (necesita 2+ filas en la misma aula+día).
    expect(conflictos).toHaveLength(1);
    expect(conflictos[0].tipo).toBe(TIPOS.CHOQUE_CONFIRMADO);
  });
});

describe('validarClasesExcel — MATERIA_DUPLICADA', () => {
  test('misma materia+ciclo+paralelo repetida en el Excel: reporta todas las filas involucradas', () => {
    const filas = [
      crearFila({ fila: 1, materia: 'Calculo I', ciclo: '1', paralelo: 'A', aulaCodigo: 'AULA-101' }),
      crearFila({ fila: 2, materia: 'Calculo I', ciclo: '1', paralelo: 'A', aulaCodigo: 'AULA-102', dia: 'Martes' }),
    ];
    const { conflictos } = validarClasesExcel(filas, {}, [
      crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 }),
      crearAula({ id: 2, codigo: 'AULA-102', capacidad: 40 }),
    ]);

    expect(conflictos).toHaveLength(1);
    expect(conflictos[0].tipo).toBe(TIPOS.MATERIA_DUPLICADA);
    expect(conflictos[0].filas).toEqual([1, 2]);
  });

  test('mismo nombre de materia pero distinto paralelo: NO es duplicado (es un caso legítimo)', () => {
    const filas = [
      crearFila({ fila: 1, materia: 'Calculo I', ciclo: '1', paralelo: 'A', aulaCodigo: 'AULA-101' }),
      crearFila({ fila: 2, materia: 'Calculo I', ciclo: '1', paralelo: 'B', aulaCodigo: 'AULA-102', dia: 'Martes' }),
    ];
    const { conflictos } = validarClasesExcel(filas, {}, [
      crearAula({ id: 1, codigo: 'AULA-101', capacidad: 40 }),
      crearAula({ id: 2, codigo: 'AULA-102', capacidad: 40 }),
    ]);

    expect(conflictos.filter((c) => c.tipo === TIPOS.MATERIA_DUPLICADA)).toHaveLength(0);
  });
});
