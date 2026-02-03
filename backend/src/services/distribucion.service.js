const { Clase, Aula, Distribucion, Carrera } = require('../models');
const { Op } = require('sequelize');

// ============================================
// REGLAS DE DISTRIBUCIÓN UIDE
// ============================================
// 1. Auditorio: queda LIBRE (no se asigna a ninguna clase)
// 2. Sala de Audiencias: solo para Derecho
// 3. Aula 20 (Lab Psicología): solo para Psicología
// 4. Aulas 16, 17, 18: solo para Arquitectura (Taller de maquetería)
// 5. Laboratorios 1, 2, 3: prioridad para Informática, otras escuelas solo si sobra espacio
// ============================================

const REGLAS_AULAS = {
  // Aulas que NUNCA se asignan
  bloqueadas: ['AUDITORIO'],

  // Aulas exclusivas por carrera (solo esa carrera puede usarlas)
  exclusivas: {
    'SALA DE AUDIENCIAS': ['DERECHO'],
    'AULA 20': ['PSICOLOGIA', 'PSICOLOGÍA'],
    'AULA 16': ['ARQUITECTURA'],
    'AULA 17': ['ARQUITECTURA'],
    'AULA 18': ['ARQUITECTURA'],
  },

  // Aulas con prioridad para una carrera (otras pueden usarlas si sobran)
  prioridad: {
    'LABORATORIO 1': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS'],
    'LABORATORIO 2': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS'],
    'LABORATORIO 3': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS'],
    'LAB 1': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS'],
    'LAB 2': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS'],
    'LAB 3': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS'],
  }
};

function normalizarTexto(texto) {
  if (!texto) return '';
  return texto.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function aulaEstaBloqueada(aula) {
  const nombre = normalizarTexto(aula.nombre);
  const codigo = normalizarTexto(aula.codigo);
  const tipo = normalizarTexto(aula.tipo);

  // Regla 1: Auditorio nunca se asigna
  for (const bloqueada of REGLAS_AULAS.bloqueadas) {
    if (nombre.includes(bloqueada) || codigo.includes(bloqueada) || tipo === bloqueada) {
      return true;
    }
  }
  return false;
}

function aulaEsExclusiva(aula, carreraClase) {
  const nombre = normalizarTexto(aula.nombre);
  const codigo = normalizarTexto(aula.codigo);
  const carreraNorm = normalizarTexto(carreraClase);

  for (const [aulaKey, carreras] of Object.entries(REGLAS_AULAS.exclusivas)) {
    if (nombre.includes(aulaKey) || codigo.includes(aulaKey)) {
      // Esta aula es exclusiva: solo las carreras listadas pueden usarla
      return carreras.some(c => carreraNorm.includes(c)) ? 'permitida' : 'bloqueada';
    }
  }
  return 'sin_restriccion';
}

function aulaConPrioridad(aula) {
  const nombre = normalizarTexto(aula.nombre);
  const codigo = normalizarTexto(aula.codigo);

  for (const [aulaKey, carreras] of Object.entries(REGLAS_AULAS.prioridad)) {
    if (nombre.includes(aulaKey) || codigo.includes(aulaKey)) {
      return carreras;
    }
  }
  return null;
}

class DistribucionService {

  /**
   * Ejecuta la distribución automática de aulas
   */
  async ejecutarDistribucion() {
    try {
      console.log('🚀 Iniciando distribución automática de aulas...');
      console.log('📋 Reglas activas:');
      console.log('   - Auditorio: LIBRE (no se asigna)');
      console.log('   - Sala de Audiencias: solo Derecho');
      console.log('   - Aula 20 (Lab Psicología): solo Psicología');
      console.log('   - Aulas 16, 17, 18: solo Arquitectura');
      console.log('   - Labs 1, 2, 3: prioridad Informática\n');

      // PASO 1: Validar aulas pre-asignadas del excel
      await this.validarAulasPreasignadas();

      // PASO 2: Obtener todas las clases sin aula asignada
      const clases = await Clase.findAll({
        where: {
          aula_asignada: null
        },
        order: [['num_estudiantes', 'DESC']]
      });

      console.log(`📚 Clases a distribuir: ${clases.length}`);

      if (clases.length === 0) {
        return {
          success: true,
          mensaje: 'No hay clases pendientes de distribución',
          estadisticas: {
            total_procesadas: 0,
            exitosas: 0,
            fallidas: 0
          }
        };
      }

      // Obtener todas las aulas disponibles (excepto bloqueadas)
      const todasAulas = await Aula.findAll({
        where: {
          estado: { [Op.iLike]: 'disponible' }
        },
        order: [['capacidad', 'ASC']]
      });

      // Filtrar aulas bloqueadas (Auditorio)
      const aulas = todasAulas.filter(a => !aulaEstaBloqueada(a));
      const aulasBloqueadas = todasAulas.length - aulas.length;

      console.log(`🏛️  Aulas disponibles: ${aulas.length} (${aulasBloqueadas} bloqueadas por reglas)\n`);

      // Registro de horarios ocupados por aula
      const aulasOcupadas = {};

      // Cargar horarios de clases ya asignadas
      const clasesYaAsignadas = await Clase.findAll({
        where: { aula_asignada: { [Op.not]: null } }
      });
      for (const c of clasesYaAsignadas) {
        if (c.aula_asignada && c.dia && c.hora_inicio && c.hora_fin) {
          if (!aulasOcupadas[c.aula_asignada]) aulasOcupadas[c.aula_asignada] = [];
          aulasOcupadas[c.aula_asignada].push({
            dia: c.dia,
            inicio: this.convertirHoraAMinutos(c.hora_inicio),
            fin: this.convertirHoraAMinutos(c.hora_fin)
          });
        }
      }

      let exitosas = 0;
      let fallidas = 0;

      // PASO 3: Primero asignar clases con aulas exclusivas/prioritarias
      // (Informática a Labs, Derecho a Sala Audiencias, etc.)
      const clasesRestantes = [];

      for (const clase of clases) {
        const aulaAsignada = this.buscarAulaOptima(clase, aulas, aulasOcupadas, true);

        if (aulaAsignada) {
          await this.confirmarAsignacion(clase, aulaAsignada, aulasOcupadas);
          exitosas++;
        } else {
          clasesRestantes.push(clase);
        }
      }

      // PASO 4: Asignar clases restantes a aulas generales
      for (const clase of clasesRestantes) {
        const aulaAsignada = this.buscarAulaOptima(clase, aulas, aulasOcupadas, false);

        if (aulaAsignada) {
          await this.confirmarAsignacion(clase, aulaAsignada, aulasOcupadas);
          exitosas++;
        } else {
          fallidas++;
          console.log(`  ❌ ${clase.carrera} - ${clase.materia} (${clase.num_estudiantes} est.) → Sin aula disponible`);
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log(`✅ Distribución completada:`);
      console.log(`   • Total procesadas: ${clases.length}`);
      console.log(`   • Exitosas: ${exitosas}`);
      console.log(`   • Fallidas: ${fallidas}`);
      console.log('='.repeat(80));

      return {
        success: true,
        mensaje: 'Distribución completada exitosamente',
        estadisticas: {
          total_procesadas: clases.length,
          exitosas,
          fallidas
        }
      };

    } catch (error) {
      console.error('❌ Error en distribución:', error);
      throw error;
    }
  }

  /**
   * Confirma la asignación de un aula a una clase
   */
  async confirmarAsignacion(clase, aula, aulasOcupadas) {
    await clase.update({ aula_asignada: aula.codigo });

    await Distribucion.create({
      clase_id: clase.id,
      aula_id: aula.id,
      dia: clase.dia,
      hora_inicio: clase.hora_inicio,
      hora_fin: clase.hora_fin,
      estado: 'confirmada'
    });

    // Registrar horario ocupado
    if (clase.dia && clase.hora_inicio && clase.hora_fin) {
      if (!aulasOcupadas[aula.codigo]) aulasOcupadas[aula.codigo] = [];
      aulasOcupadas[aula.codigo].push({
        dia: clase.dia,
        inicio: this.convertirHoraAMinutos(clase.hora_inicio),
        fin: this.convertirHoraAMinutos(clase.hora_fin)
      });
    }

    console.log(`  ✅ ${clase.carrera} - ${clase.materia} (${clase.num_estudiantes} est.) → ${aula.codigo} (Cap: ${aula.capacidad})`);
  }

  /**
   * Busca el aula óptima para una clase respetando las reglas UIDE
   */
  buscarAulaOptima(clase, aulas, aulasOcupadas, soloConRegla) {
    let mejorAula = null;
    let menorDiferencia = Infinity;

    for (const aula of aulas) {
      // Verificar capacidad
      if (aula.capacidad < (clase.num_estudiantes || 1)) continue;

      // Verificar reglas de exclusividad
      const exclusividad = aulaEsExclusiva(aula, clase.carrera);
      if (exclusividad === 'bloqueada') continue;

      // Verificar prioridad (Labs 1,2,3 → Informática)
      const carrerasPrioritarias = aulaConPrioridad(aula);
      const carreraNorm = normalizarTexto(clase.carrera);
      const esPrioritaria = carrerasPrioritarias &&
        carrerasPrioritarias.some(c => carreraNorm.includes(c));

      if (soloConRegla) {
        // Primera pasada: solo asignar si hay match de regla
        if (exclusividad !== 'permitida' && !esPrioritaria) continue;
      } else {
        // Segunda pasada: evitar labs prioritarios si la clase no es de la carrera prioritaria
        if (carrerasPrioritarias && !esPrioritaria) continue;
      }

      // Verificar disponibilidad horaria
      if (!this.aulaDisponibleEnHorario(aula.codigo, clase, aulasOcupadas)) continue;

      // Buscar la de menor diferencia de capacidad
      const diferencia = aula.capacidad - (clase.num_estudiantes || 1);
      if (diferencia < menorDiferencia) {
        menorDiferencia = diferencia;
        mejorAula = aula;
      }
    }

    // Si no se encontró en segunda pasada, intentar con labs prioritarios (si sobran)
    if (!mejorAula && !soloConRegla) {
      for (const aula of aulas) {
        if (aula.capacidad < (clase.num_estudiantes || 1)) continue;

        const exclusividad = aulaEsExclusiva(aula, clase.carrera);
        if (exclusividad === 'bloqueada') continue;

        if (!this.aulaDisponibleEnHorario(aula.codigo, clase, aulasOcupadas)) continue;

        const diferencia = aula.capacidad - (clase.num_estudiantes || 1);
        if (diferencia < menorDiferencia) {
          menorDiferencia = diferencia;
          mejorAula = aula;
        }
      }
    }

    return mejorAula;
  }

  /**
   * Verifica si un aula está disponible en el horario de una clase
   */
  aulaDisponibleEnHorario(codigoAula, clase, aulasOcupadas) {
    if (!clase.dia || !clase.hora_inicio || !clase.hora_fin) return true;
    if (!aulasOcupadas[codigoAula]) return true;

    const inicio = this.convertirHoraAMinutos(clase.hora_inicio);
    const fin = this.convertirHoraAMinutos(clase.hora_fin);

    for (const ocupado of aulasOcupadas[codigoAula]) {
      if (ocupado.dia === clase.dia) {
        if (inicio < ocupado.fin && fin > ocupado.inicio) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Obtiene el horario de una carrera específica
   */
  async obtenerHorario(carreraId = null) {
    try {
      const whereClause = {};
      if (carreraId) {
        const carrera = await Carrera.findByPk(carreraId);
        if (carrera) {
          whereClause.carrera = carrera.carrera;
        }
      }

      const clases = await Clase.findAll({
        where: {
          ...whereClause,
          aula_asignada: { [Op.not]: null }
        },
        order: [['dia', 'ASC'], ['hora_inicio', 'ASC']]
      });

      // Obtener aulas y agregarlas manualmente
      const aulasMap = {};
      const aulas = await Aula.findAll();
      aulas.forEach(aula => {
        aulasMap[aula.codigo] = {
          id: aula.id,
          codigo: aula.codigo,
          nombre: aula.nombre,
          capacidad: aula.capacidad,
          tipo: aula.tipo
        };
      });

      // Agregar información del aula a cada clase
      const clasesConAula = clases.map(clase => {
        const claseJson = clase.toJSON();
        if (claseJson.aula_asignada && aulasMap[claseJson.aula_asignada]) {
          claseJson.aula = aulasMap[claseJson.aula_asignada];
        }
        return claseJson;
      });

      return clasesConAula;
    } catch (error) {
      console.error('Error al obtener horario:', error);
      throw error;
    }
  }

  /**
   * Valida las aulas pre-asignadas del excel y detecta conflictos
   */
  async validarAulasPreasignadas() {
    try {
      console.log('🔍 Validando aulas pre-asignadas del excel...\n');

      // Obtener clases con aula ya asignada
      const clasesPreasignadas = await Clase.findAll({
        where: {
          aula_asignada: { [Op.not]: null }
        },
        order: [['dia', 'ASC'], ['hora_inicio', 'ASC']]
      });

      if (clasesPreasignadas.length === 0) {
        console.log('   ℹ️  No hay clases pre-asignadas\n');
        return;
      }

      console.log(`📋 Clases pre-asignadas: ${clasesPreasignadas.length}`);

      let confirmadas = 0;
      let reasignadas = 0;
      let conflictos = 0;

      // Mapear clases por aula para detectar conflictos
      const clasesParAula = {};

      for (const clase of clasesPreasignadas) {
        const aulaCode = clase.aula_asignada;

        // Verificar que el aula exista
        const aula = await Aula.findOne({ where: { codigo: aulaCode } });
        if (!aula) {
          console.log(`   ⚠️  Aula "${aulaCode}" no encontrada → Reasignando...`);
          await clase.update({ aula_asignada: null });
          reasignadas++;
          continue;
        }

        // Verificar capacidad
        if (aula.capacidad < clase.num_estudiantes) {
          console.log(`   ⚠️  ${clase.materia}: Aula ${aulaCode} insuficiente (${aula.capacidad} < ${clase.num_estudiantes}) → Reasignando...`);
          await clase.update({ aula_asignada: null });
          reasignadas++;
          continue;
        }

        // Detectar conflictos de horario en la misma aula
        if (!clasesParAula[aulaCode]) {
          clasesParAula[aulaCode] = [];
        }

        let hayConflicto = false;
        for (const otraClase of clasesParAula[aulaCode]) {
          if (clase.dia === otraClase.dia) {
            // Verificar si los horarios se solapan
            const inicio1 = this.convertirHoraAMinutos(clase.hora_inicio);
            const fin1 = this.convertirHoraAMinutos(clase.hora_fin);
            const inicio2 = this.convertirHoraAMinutos(otraClase.hora_inicio);
            const fin2 = this.convertirHoraAMinutos(otraClase.hora_fin);

            if ((inicio1 < fin2 && fin1 > inicio2)) {
              console.log(`   ⚠️  CONFLICTO: ${clase.materia} y ${otraClase.materia} en ${aulaCode} el ${clase.dia} (${clase.hora_inicio}-${clase.hora_fin})`);
              hayConflicto = true;
              conflictos++;
              break;
            }
          }
        }

        if (hayConflicto) {
          // Reasignar porque hay conflicto
          await clase.update({ aula_asignada: null });
          reasignadas++;
        } else {
          // Confirmar asignación - crear registro en distribucion
          clasesParAula[aulaCode].push(clase);

          await Distribucion.create({
            clase_id: clase.id,
            aula_id: aula.id,
            dia: clase.dia,
            hora_inicio: clase.hora_inicio,
            hora_fin: clase.hora_fin,
            estado: 'confirmada'
          });

          confirmadas++;
          console.log(`   ✅ ${clase.carrera} - ${clase.materia} → ${aulaCode} CONFIRMADA`);
        }
      }

      console.log('\n' + '-'.repeat(80));
      console.log(`Validación completada:`);
      console.log(`   • Confirmadas: ${confirmadas}`);
      console.log(`   • Reasignadas: ${reasignadas}`);
      console.log(`   • Conflictos detectados: ${conflictos}`);
      console.log('-'.repeat(80) + '\n');

    } catch (error) {
      console.error('❌ Error al validar aulas pre-asignadas:', error);
      throw error;
    }
  }

  /**
   * Convierte hora en formato "HH:MM" a minutos desde medianoche
   */
  convertirHoraAMinutos(hora) {
    if (!hora || typeof hora !== 'string') return 0;
    const partes = hora.split(':');
    if (partes.length !== 2) return 0;
    const horas = parseInt(partes[0]) || 0;
    const minutos = parseInt(partes[1]) || 0;
    return horas * 60 + minutos;
  }

  /**
   * Limpia todas las asignaciones de aulas
   */
  async limpiarDistribucion() {
    try {
      // Limpiar tabla de distribución
      await Distribucion.destroy({ where: {}, truncate: true });
      
      // Limpiar aula_asignada de todas las clases
      await Clase.update(
        { aula_asignada: null },
        { where: {} }
      );

      return {
        success: true,
        mensaje: 'Distribución limpiada exitosamente'
      };
    } catch (error) {
      console.error('Error al limpiar distribución:', error);
      throw error;
    }
  }
}

module.exports = new DistribucionService();
