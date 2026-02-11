const { Clase, Aula, Distribucion, Carrera } = require('../models');
const { Op } = require('sequelize');

// ============================================
// REGLAS DE DISTRIBUCIÓN UIDE
// ============================================
// 1. Auditorio: NO se asigna en distribución automática (se reserva con aprobación admin, uso para eventos)
// 2. Sala de Audiencias: solo para Derecho
// 3. Aula 20 (Lab Psicología): solo para Psicología
// 4. Aulas C15-C18: solo para Arquitectura (Taller de maquetería)
// 5. Laboratorios 1, 2, 3: prioridad para Informática, otras escuelas solo si sobra espacio
// ============================================

const REGLAS_AULAS = {
  // Aulas excluidas de distribución automática (reservables manualmente con aprobación admin)
  excluidas_distribucion: ['AUDITORIO'],

  // Aulas exclusivas por carrera (solo esa carrera puede usarlas)
  // Códigos y nombres reales de la BD:
  //   AUDIENCIAS / Sala de Audiencias → Derecho
  //   AULA20 / Aula 20 - Laboratorio de Psicología → Psicología
  //   C15,C16,C17,C18 / Aula C15-C18 - Arquitectura → Arquitectura (Taller maquetería)
  exclusivas: {
    'SALA DE AUDIENCIAS': ['DERECHO'],
    'AUDIENCIAS': ['DERECHO'],
    'AULA 20': ['PSICOLOGIA', 'PSICOLOGÍA'],
    'AULA20': ['PSICOLOGIA', 'PSICOLOGÍA'],
    'LABORATORIO DE PSICOLOGIA': ['PSICOLOGIA', 'PSICOLOGÍA'],
    'C15': ['ARQUITECTURA'],
    'C16': ['ARQUITECTURA'],
    'C17': ['ARQUITECTURA'],
    'C18': ['ARQUITECTURA'],
  },

  // Aulas con prioridad para una carrera (otras pueden usarlas si sobran)
  // Códigos reales: LAB1, LAB2, LAB3
  prioridad: {
    'LABORATORIO 1': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS', 'TECNOLOGIA', 'TECNOLOGÍA'],
    'LABORATORIO 2': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS', 'TECNOLOGIA', 'TECNOLOGÍA'],
    'LABORATORIO 3': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS', 'TECNOLOGIA', 'TECNOLOGÍA'],
    'LAB1': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS', 'TECNOLOGIA', 'TECNOLOGÍA'],
    'LAB2': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS', 'TECNOLOGIA', 'TECNOLOGÍA'],
    'LAB3': ['INFORMATICA', 'INFORMÁTICA', 'SISTEMAS', 'TECNOLOGIA', 'TECNOLOGÍA'],
  }
};

function normalizarTexto(texto) {
  if (!texto) return '';
  return texto.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function aulaExcluidaDeDistribucion(aula) {
  const nombre = normalizarTexto(aula.nombre);
  const codigo = normalizarTexto(aula.codigo);
  const tipo = normalizarTexto(aula.tipo);

  // Auditorio: no se asigna automáticamente (se reserva con aprobación admin)
  for (const excluida of REGLAS_AULAS.excluidas_distribucion) {
    if (nombre.includes(excluida) || codigo.includes(excluida) || tipo === excluida) {
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
  /**
   * Ejecuta la distribución automática de aulas
   * @param {number|null} carreraId - ID de la carrera para filtrar (opcional)
   */
  async ejecutarDistribucion(carreraId = null) {
    try {
      console.log(`🚀 Iniciando distribución automática de aulas... ${carreraId ? `(Carrera ID: ${carreraId})` : '(GLOBLAL)'}`);

      // Obtener nombre de carrera si se pasó ID
      let nombreCarrera = null;
      if (carreraId) {
        const carrera = await Carrera.findByPk(carreraId);
        if (carrera) nombreCarrera = carrera.carrera;
      }

      // PASO 0: Limpiar distribución previa de esta carrera para evitar duplicados/errores
      console.log(`🧹 Limpiando distribución previa para ${nombreCarrera || 'GLOBAL'}...`);
      const whereClasesLimpieza = {};
      if (nombreCarrera) whereClasesLimpieza.carrera = nombreCarrera;

      const clasesLimpieza = await Clase.findAll({
        attributes: ['id'],
        where: whereClasesLimpieza
      });

      if (clasesLimpieza.length > 0) {
        const idsLimpieza = clasesLimpieza.map(c => c.id);
        await Distribucion.destroy({
          where: { clase_id: idsLimpieza }
        });
        console.log(`   ✅ Eliminados registros de distribución de ${idsLimpieza.length} clases.`);
      }

      // PASO 1: Validar aulas pre-asignadas (Solo de esta carrera si se especifica)
      await this.validarAulasPreasignadas(nombreCarrera);

      // PASO 2: Obtener clases PENDIENTES de distribución
      // Si hay carreraId, solo buscamos las de esa carrera
      const whereClases = {
        aula_asignada: null
      };

      if (nombreCarrera) {
        whereClases.carrera = nombreCarrera;
      }

      const clases = await Clase.findAll({
        where: whereClases,
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

      // Obtener todas las aulas disponibles
      const todasAulas = await Aula.findAll({
        where: {
          estado: { [Op.iLike]: 'DISPONIBLE' }
        },
        order: [['capacidad', 'ASC']]
      });

      const aulas = todasAulas.filter(a => !aulaExcluidaDeDistribucion(a));

      // PASO CRITICO: Cargar ocupación GLOBAL (de TODAS las carreras)
      // para no sobrescribir ni chocar con otras clases ya asignadas
      const aulasOcupadas = {};
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
      const clasesRestantes = [];

      // PASO 3: Asignar (Igual que antes, pero 'clases' está filtrado)
      for (const clase of clases) {
        const aulaAsignada = this.buscarAulaOptima(clase, aulas, aulasOcupadas, true);
        if (aulaAsignada) {
          await this.confirmarAsignacion(clase, aulaAsignada, aulasOcupadas);
          exitosas++;
        } else {
          clasesRestantes.push(clase);
        }
      }

      // PASO 4: Asignar restantes
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

    if (clase.dia && clase.hora_inicio && clase.hora_fin) {
      await Distribucion.create({
        clase_id: clase.id,
        aula_id: aula.id,
        dia: clase.dia,
        hora_inicio: clase.hora_inicio,
        hora_fin: clase.hora_fin
      });
    } else {
      console.log(`  ⚠️ Clase ${clase.materia} sin horario completo - solo se asignó aula, sin registro en distribución`);
    }

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
        if (!isNaN(carreraId)) {
          const carrera = await Carrera.findByPk(carreraId);
          if (carrera) {
            whereClause.carrera = carrera.carrera;
          }
        } else {
          // Si es un string (nombre de carrera), usarlo directamente
          whereClause.carrera = carreraId;
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
   * @param {string|null} nombreCarrera - Nombre de la carrera para filtrar (opcional)
   */
  async validarAulasPreasignadas(nombreCarrera = null) {
    try {
      console.log(`🔍 Validando aulas pre-asignadas del excel... ${nombreCarrera ? `(Carrera: ${nombreCarrera})` : '(VARIAS)'}\n`);

      const whereClause = {
        aula_asignada: { [Op.not]: null }
      };

      if (nombreCarrera) {
        whereClause.carrera = nombreCarrera;
      }

      // Obtener clases con aula ya asignada
      const clasesPreasignadas = await Clase.findAll({
        where: whereClause,
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

        // 1. Verificar estado base del aula
        if (aula.estado && aula.estado.toUpperCase() !== 'DISPONIBLE') {
          console.log(`   ⚠️  Aula ${aulaCode} no está DISPONIBLE (${aula.estado}) → Reasignando...`);
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
          // Confirmar asignación - crear registro en distribucion si no existe
          clasesParAula[aulaCode].push(clase);

          // Sanitize 'dia' to fit in VARCHAR(20)
          let diaSanitized = (clase.dia || '').trim().replace(/\s+/g, ' ');
          if (diaSanitized.length > 20) {
            console.warn(`⚠️ Truncando día "${diaSanitized}" a 20 caracteres.`);
            diaSanitized = diaSanitized.substring(0, 20);
          }

          const [distribucion, created] = await Distribucion.findOrCreate({
            where: { clase_id: clase.id },
            defaults: {
              aula_id: aula.id,
              dia: diaSanitized || null,
              hora_inicio: clase.hora_inicio || null,
              hora_fin: clase.hora_fin || null,
              estado: 'confirmada'
            }
          });

          if (!created) {
            await distribucion.update({
              aula_id: aula.id,
              dia: diaSanitized || null,
              hora_inicio: clase.hora_inicio || null,
              hora_fin: clase.hora_fin || null,
              estado: 'confirmada'
            });
          }

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
