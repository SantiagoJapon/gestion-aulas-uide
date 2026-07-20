// Mock de modelos para poder require() el servicio sin tocar la BD real.
jest.mock('../src/models', () => ({
  Clase: {},
  Aula: {},
  Distribucion: {},
  Carrera: {},
}));

const distribucionService = require('../src/services/distribucion.service');

/**
 * Fabrica un aula "tipo Sequelize" con el método tienePrioridad,
 * igual al modelo real (Aula.prototype.tienePrioridad).
 */
function crearAula({ codigo, capacidad, restriccion_carrera = null, es_prioritaria = false }) {
  return {
    codigo,
    nombre: codigo,
    capacidad,
    restriccion_carrera,
    es_prioritaria,
    tienePrioridad(carrera) {
      if (!this.restriccion_carrera) return false;
      const valor = this.restriccion_carrera.toLowerCase();
      const busqueda = (carrera || '').toLowerCase();
      if (valor.startsWith('[') && valor.endsWith(']')) {
        try {
          const arr = JSON.parse(valor);
          return arr.map(c => c.toLowerCase()).includes(busqueda);
        } catch (e) { /* fallback abajo */ }
      }
      return valor.split(',').map(c => c.trim()).includes(busqueda);
    },
  };
}

describe('DistribucionService.buscarAulaOptima — restricción exclusiva de carrera', () => {
  test('NO asigna un aula exclusiva de Psicologia a una clase de Ingenieria, aunque este libre', () => {
    const aulaPsico = crearAula({ codigo: 'PSICO-101', capacidad: 40, restriccion_carrera: 'Psicologia', es_prioritaria: true });
    const clase = { id: 1, materia: 'Calculo I', carrera: 'Ingenieria', num_estudiantes: 30, dia: null, hora_inicio: null, hora_fin: null };

    const resultado = distribucionService.buscarAulaOptima(clase, [aulaPsico], {}, true);

    expect(resultado).toBeNull();
  });

  test('SI asigna el aula exclusiva a la carrera correcta', () => {
    const aulaPsico = crearAula({ codigo: 'PSICO-101', capacidad: 40, restriccion_carrera: 'Psicologia', es_prioritaria: true });
    const clase = { id: 2, materia: 'Neuropsicologia', carrera: 'Psicologia', num_estudiantes: 30, dia: null, hora_inicio: null, hora_fin: null };

    const resultado = distribucionService.buscarAulaOptima(clase, [aulaPsico], {}, true);

    expect(resultado).not.toBeNull();
    expect(resultado.aula.codigo).toBe('PSICO-101');
  });

  test('Aula con dos carreras prioritarias (Ingenieria + Arquitectura) acepta ambas y rechaza terceras', () => {
    const aulaCompartida = crearAula({
      codigo: 'LAB-DUAL',
      capacidad: 25,
      restriccion_carrera: JSON.stringify(['Ingenieria', 'Arquitectura']),
      es_prioritaria: true,
    });

    const claseIngenieria = { id: 3, materia: 'Estructuras', carrera: 'Ingenieria', num_estudiantes: 20, dia: null, hora_inicio: null, hora_fin: null };
    const claseArquitectura = { id: 4, materia: 'Diseño', carrera: 'Arquitectura', num_estudiantes: 20, dia: null, hora_inicio: null, hora_fin: null };
    const claseDerecho = { id: 5, materia: 'Civil I', carrera: 'Derecho', num_estudiantes: 20, dia: null, hora_inicio: null, hora_fin: null };

    expect(distribucionService.buscarAulaOptima(claseIngenieria, [aulaCompartida], {}, true).aula.codigo).toBe('LAB-DUAL');
    expect(distribucionService.buscarAulaOptima(claseArquitectura, [aulaCompartida], {}, true).aula.codigo).toBe('LAB-DUAL');
    expect(distribucionService.buscarAulaOptima(claseDerecho, [aulaCompartida], {}, true)).toBeNull();
  });

  test('Aula sin restriccion_carrera sigue siendo de uso general para cualquier carrera', () => {
    const aulaLibre = crearAula({ codigo: 'AULA-GEN', capacidad: 40, restriccion_carrera: null, es_prioritaria: false });
    const clase = { id: 6, materia: 'Etica', carrera: 'Cualquier Carrera', num_estudiantes: 30, dia: null, hora_inicio: null, hora_fin: null };

    const resultado = distribucionService.buscarAulaOptima(clase, [aulaLibre], {}, true);

    expect(resultado).not.toBeNull();
    expect(resultado.aula.codigo).toBe('AULA-GEN');
  });

  test('restriccion_carrera definida pero es_prioritaria=false NO es exclusiva (compatibilidad hacia atras)', () => {
    const aulaNoExclusiva = crearAula({ codigo: 'AULA-SOFT', capacidad: 40, restriccion_carrera: 'Psicologia', es_prioritaria: false });
    const clase = { id: 7, materia: 'Calculo I', carrera: 'Ingenieria', num_estudiantes: 30, dia: null, hora_inicio: null, hora_fin: null };

    const resultado = distribucionService.buscarAulaOptima(clase, [aulaNoExclusiva], {}, true);

    expect(resultado).not.toBeNull();
    expect(resultado.aula.codigo).toBe('AULA-SOFT');
  });
});
