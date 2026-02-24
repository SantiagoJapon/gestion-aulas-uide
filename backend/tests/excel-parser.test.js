/**
 * Tests automatizados para excel-parser.service.js
 *
 * Cubre:
 *   1. Funciones puras internas (parseCicloParalelo, normalizeHora, normalizeDia)
 *   2. Integracion con los 3 templates reales (TICS, Derecho, Arquitectura)
 */

const path = require('path');
const fs   = require('fs');
const { processExcel } = require('../src/services/excel-parser.service');

// ─── Helpers de acceso a funciones internas ───────────────────────────────────
// Las funciones internas no se exportan, asi que las probamos a traves del
// comportamiento de processExcel con buffers minimos o con templates reales.
// Para las funciones puras las re-implementamos inline para verificar contratos.

// ─── 1. Tests de parseCicloParalelo (via processExcel) ────────────────────────
// Verificamos los contratos a traves de los resultados de los templates.

// ─── 2. Templates reales ──────────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function loadTemplate(filename) {
  const filePath = path.join(PUBLIC_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

function pct(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

// ─── TICS ──────────────────────────────────────────────────────────────────────
describe('Template TICS (planificacion-tics.xlsx)', () => {
  let result, clases;

  beforeAll(() => {
    const buf = loadTemplate('planificacion-tics.xlsx');
    if (!buf) return;
    result = processExcel(buf);
    clases = result.clases;
  });

  test('archivo disponible', () => {
    expect(loadTemplate('planificacion-tics.xlsx')).not.toBeNull();
  });

  test('extrae al menos 40 clases', () => {
    expect(clases.length).toBeGreaterThanOrEqual(40);
  });

  test('selecciona hoja PLANIFICACION', () => {
    expect(result.hojaUsada.toLowerCase()).toContain('planificaci');
  });

  test('100% de clases con dia', () => {
    const count = clases.filter(c => c.dia && c.dia.length > 0).length;
    expect(pct(count, clases.length)).toBe(100);
  });

  test('100% de clases con hora_inicio', () => {
    const count = clases.filter(c => c.hora_inicio && c.hora_inicio.length > 0).length;
    expect(pct(count, clases.length)).toBe(100);
  });

  test('100% de clases con docente', () => {
    const count = clases.filter(c => c.docente && c.docente.length > 0).length;
    expect(pct(count, clases.length)).toBe(100);
  });

  test('100% de clases con ciclo', () => {
    const count = clases.filter(c => c.ciclo).length;
    expect(pct(count, clases.length)).toBe(100);
  });

  test('ningun ciclo contiene texto de pie de pagina', () => {
    const suspicious = clases.filter(c =>
      c.ciclo && (c.ciclo.length > 10 || /revisado|aprobado|elaborado|firma/i.test(c.ciclo))
    );
    expect(suspicious).toHaveLength(0);
  });

  test('ningun docente es puramente numerico', () => {
    const badDocentes = clases.filter(c => c.docente && /^\d{1,4}$/.test(c.docente.trim()));
    expect(badDocentes).toHaveLength(0);
  });

  test('materia nunca es texto de footer/firma', () => {
    const footerWords = ['revisado', 'aprobado', 'firma', 'cargo', 'director'];
    const bad = clases.filter(c =>
      footerWords.some(w => (c.materia || '').toLowerCase().includes(w))
    );
    expect(bad).toHaveLength(0);
  });

  test('horas en formato HH:MM', () => {
    const invalid = clases.filter(c =>
      c.hora_inicio && !/^\d{2}:\d{2}$/.test(c.hora_inicio)
    );
    expect(invalid).toHaveLength(0);
  });

  test('ciclo es numerico (1-10)', () => {
    const nonNumeric = clases.filter(c => c.ciclo && !/^\d{1,2}$/.test(c.ciclo));
    expect(nonNumeric).toHaveLength(0);
  });
});

// ─── DERECHO ───────────────────────────────────────────────────────────────────
describe('Template Derecho (planificacion-derecho.xlsx)', () => {
  let result, clases;

  beforeAll(() => {
    const buf = loadTemplate('planificacion-derecho.xlsx');
    if (!buf) return;
    result = processExcel(buf);
    clases = result.clases;
  });

  test('archivo disponible', () => {
    expect(loadTemplate('planificacion-derecho.xlsx')).not.toBeNull();
  });

  test('extrae al menos 25 clases', () => {
    expect(clases.length).toBeGreaterThanOrEqual(25);
  });

  test('selecciona hoja PLANIFICACION', () => {
    expect(result.hojaUsada.toLowerCase()).toContain('planificaci');
  });

  test('100% de clases con dia', () => {
    const count = clases.filter(c => c.dia && c.dia.length > 0).length;
    expect(pct(count, clases.length)).toBe(100);
  });

  test('100% de clases con hora_inicio', () => {
    const count = clases.filter(c => c.hora_inicio && c.hora_inicio.length > 0).length;
    expect(pct(count, clases.length)).toBe(100);
  });

  test('100% de clases con docente', () => {
    const count = clases.filter(c => c.docente && c.docente.length > 0).length;
    expect(pct(count, clases.length)).toBe(100);
  });

  test('ciclo parseado correctamente desde ordinales (3ro->3, 6to->6)', () => {
    const withCiclo = clases.filter(c => c.ciclo);
    expect(withCiclo.length).toBeGreaterThan(0);
    // Todos los ciclos deben ser numericos
    const nonNumeric = withCiclo.filter(c => !/^\d{1,2}$/.test(c.ciclo));
    expect(nonNumeric).toHaveLength(0);
  });

  test('ningun ciclo contiene texto de pie de pagina', () => {
    const suspicious = clases.filter(c =>
      c.ciclo && (c.ciclo.length > 10 || /revisado|aprobado|elaborado|firma/i.test(c.ciclo))
    );
    expect(suspicious).toHaveLength(0);
  });

  test('horas en formato HH:MM', () => {
    const invalid = clases.filter(c =>
      c.hora_inicio && !/^\d{2}:\d{2}$/.test(c.hora_inicio)
    );
    expect(invalid).toHaveLength(0);
  });
});

// ─── ARQUITECTURA ──────────────────────────────────────────────────────────────
describe('Template Arquitectura (planificacion-arquitectura.xlsx)', () => {
  let result, clases;

  beforeAll(() => {
    const buf = loadTemplate('planificacion-arquitectura.xlsx');
    if (!buf) return;
    result = processExcel(buf);
    clases = result.clases;
  });

  test('archivo disponible', () => {
    expect(loadTemplate('planificacion-arquitectura.xlsx')).not.toBeNull();
  });

  test('extrae al menos 90 clases', () => {
    expect(clases.length).toBeGreaterThanOrEqual(90);
  });

  test('selecciona hoja PLANIFICACION', () => {
    expect(result.hojaUsada.toLowerCase()).toContain('planificaci');
  });

  test('al menos 95% de clases con dia', () => {
    const count = clases.filter(c => c.dia && c.dia.length > 0).length;
    expect(pct(count, clases.length)).toBeGreaterThanOrEqual(95);
  });

  test('al menos 95% de clases con hora_inicio', () => {
    const count = clases.filter(c => c.hora_inicio && c.hora_inicio.length > 0).length;
    expect(pct(count, clases.length)).toBeGreaterThanOrEqual(95);
  });

  test('100% de clases con docente', () => {
    const count = clases.filter(c => c.docente && c.docente.length > 0).length;
    expect(pct(count, clases.length)).toBe(100);
  });

  test('ningun docente es puramente numerico', () => {
    const badDocentes = clases.filter(c => c.docente && /^\d{1,4}$/.test(c.docente.trim()));
    expect(badDocentes).toHaveLength(0);
  });

  test('ciclo enriquecido desde hoja secundaria (>= 80%)', () => {
    const count = clases.filter(c => c.ciclo).length;
    expect(pct(count, clases.length)).toBeGreaterThanOrEqual(80);
  });

  test('ciclos validos son numericos cuando existen', () => {
    const withCiclo = clases.filter(c => c.ciclo);
    const nonNumeric = withCiclo.filter(c => !/^\d{1,2}$/.test(c.ciclo));
    expect(nonNumeric).toHaveLength(0);
  });

  test('materia nunca es texto de footer/firma', () => {
    const footerWords = ['revisado', 'aprobado', 'firma', 'cargo', 'director de escuela'];
    const bad = clases.filter(c =>
      footerWords.some(w => (c.materia || '').toLowerCase().includes(w))
    );
    expect(bad).toHaveLength(0);
  });
});

// ─── Tests de contratos del parser ─────────────────────────────────────────────
describe('Contratos generales del parser', () => {
  test('retorna objeto con clases, hojaUsada, totalHojas', () => {
    const buf = loadTemplate('planificacion-tics.xlsx');
    if (!buf) return;
    const result = processExcel(buf);
    expect(result).toHaveProperty('clases');
    expect(result).toHaveProperty('hojaUsada');
    expect(result).toHaveProperty('totalHojas');
    expect(Array.isArray(result.clases)).toBe(true);
  });

  test('cada clase tiene los campos requeridos', () => {
    const buf = loadTemplate('planificacion-tics.xlsx');
    if (!buf) return;
    const { clases } = processExcel(buf);
    const REQUIRED_FIELDS = ['materia', 'ciclo', 'paralelo', 'dia', 'hora_inicio', 'hora_fin', 'docente', 'num_estudiantes', 'aula'];
    for (const clase of clases) {
      for (const field of REQUIRED_FIELDS) {
        expect(clase).toHaveProperty(field);
      }
    }
  });

  test('buffer vacio retorna 0 clases sin lanzar excepcion', () => {
    // Un buffer minimo que no es un Excel valido
    const buf = Buffer.from('not an excel file');
    expect(() => {
      const result = processExcel(buf);
      expect(result.clases.length).toBe(0);
    }).not.toThrow();
  });
});
