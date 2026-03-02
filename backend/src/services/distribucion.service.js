const { Clase, Aula, Distribucion, Carrera } = require('../models');
const { Op } = require('sequelize');
const { normalizarTexto } = require('../utils/textUtils');

// ============================================
// REGLAS DE DISTRIBUCIÓN UIDE
// ============================================
// Única regla fija: el Auditorio NO se asigna en distribución automática.
// Se reserva manualmente para eventos institucionales.
//
// Las prioridades de aulas por carrera se gestionan desde la BD:
// - aula.restriccion_carrera → carrera con prioridad (no exclusiva)
// - aula.es_prioritaria = true → la carrera indicada tiene prioridad de scoring
// - Cualquier otra carrera SÍ puede usar el aula si hay disponibilidad
// ============================================

// Excluye de la distribución automática solo el Auditorio
// (tipo AUDITORIO o restriccion_carrera = 'AUDITORIO_INSTITUCIONAL')
function aulaExcluidaDeDistribucion(aula) {
  const tipo = normalizarTexto(aula.tipo || '');
  const restriccion = normalizarTexto(aula.restriccion_carrera || '');
  return tipo === 'auditorio' || restriccion === 'auditorio_institucional';
}


class DistribucionService {

  async ejecutarDistribucion(carreraId = null) {
    try {
      console.log(`🚀 Iniciando GRAN DISTRIBUCIÓN MAESTRA... ${carreraId ? `(Filtro Carrera: ${carreraId})` : '(TOTAL INSTITUCIONAL)'}`);

      let nombreCarrera = null;
      if (carreraId) {
        const carrera = await Carrera.findByPk(carreraId);
        if (carrera) nombreCarrera = carrera.carrera;
      }

      // 1. LIMPIEZA
      const whereClasesLimpieza = {};
      if (nombreCarrera) whereClasesLimpieza.carrera = nombreCarrera;

      const clasesLimpieza = await Clase.findAll({ attributes: ['id', 'materia'], where: whereClasesLimpieza });
      if (clasesLimpieza.length > 0) {
        await Distribucion.destroy({ where: { clase_id: clasesLimpieza.map(c => c.id) } });
        await Clase.update({ aula_asignada: null }, { where: whereClasesLimpieza });
      }

      // 2. CARGAR CLASES Y AULAS
      const whereClases = { aula_asignada: null };
      if (nombreCarrera) whereClases.carrera = nombreCarrera;

      const todasLasClases = await Clase.findAll({ where: whereClases });
      const todasAulas = await Aula.findAll({
        where: { estado: 'disponible' },
        order: [['capacidad', 'ASC']]
      });
      const aulas = todasAulas.filter(a => !aulaExcluidaDeDistribucion(a));

      // Cargar ocupación actual
      const aulasOcupadas = {};
      const clasesConAula = await Clase.findAll({ where: { aula_asignada: { [Op.not]: null } } });
      for (const c of clasesConAula) {
        if (!aulasOcupadas[c.aula_asignada]) aulasOcupadas[c.aula_asignada] = [];
        aulasOcupadas[c.aula_asignada].push({
          dia: c.dia,
          inicio: this.convertirHoraAMinutos(c.hora_inicio),
          fin: this.convertirHoraAMinutos(c.hora_fin)
        });
      }

      // ==========================================
      // 🏆 RANKING DE PRIORIDAD (Procesamiento por Fases)
      // ==========================================

      // Fase 1: Materias con requerimientos de Aula Específica (Labs, Talleres, Audiencias)
      const fase1 = todasLasClases.filter(c => {
        const mat = normalizarTexto(c.materia);
        return mat.includes('LAB') || mat.includes('TALLER') || mat.includes('AUDIENCIA') || mat.includes('PRACTI');
      });

      // Fase 2: Clases Masivas (Prioridad por cupo)
      const fase2 = todasLasClases.filter(c => !fase1.includes(c) && c.num_estudiantes >= 35)
        .sort((a, b) => b.num_estudiantes - a.num_estudiantes);

      // Fase 3: Resto de clases
      const fase3 = todasLasClases.filter(c => !fase1.includes(c) && !fase2.includes(c));

      console.log(`📊 Plan de Distribución: Fase1=${fase1.length}, Fase2=${fase2.length}, Fase3=${fase3.length}`);

      let exitosas = 0;
      let fallidas = 0;
      let sobrecupos = 0;

      const procesarFase = async (listaClases, estrictoCapacidad = true) => {
        for (const clase of listaClases) {
          const result = this.buscarAulaOptima(clase, aulas, aulasOcupadas, estrictoCapacidad);
          if (result) {
            await this.confirmarAsignacion(clase, result.aula, aulasOcupadas, result.isOvercapacity);
            exitosas++;
            if (result.isOvercapacity) sobrecupos++;
          } else {
            clase._failed = true;
          }
        }
      };

      // Ejecución de fases
      await procesarFase(fase1, true);
      await procesarFase(fase2, true);
      await procesarFase(fase3, true);

      // Fase de Reintento (Flexibilidad de cupo para las que fallaron)
      const fallidasFase123 = todasLasClases.filter(c => c._failed);
      if (fallidasFase123.length > 0) {
        console.log(`⚠️ Intentando asignar ${fallidasFase123.length} clases fallidas con flexibilidad de cupo...`);
        for (const clase of fallidasFase123) {
          const result = this.buscarAulaOptima(clase, aulas, aulasOcupadas, false); // No estricto
          if (result) {
            await this.confirmarAsignacion(clase, result.aula, aulasOcupadas, true);
            exitosas++;
            sobrecupos++;
          } else {
            fallidas++;
            console.log(`  ❌ SIN ESPACIO: ${clase.materia} (${clase.num_estudiantes} est) no encontró aula en ningún horario.`);
          }
        }
      }

      return {
        success: true,
        mensaje: 'Distribución Maestra completada',
        estadisticas: {
          total: todasLasClases.length,
          exitosas,
          fallidas,
          sobrecupos,
          eficiencia: ((exitosas / todasLasClases.length) * 100).toFixed(1) + '%'
        }
      };

    } catch (error) {
      console.error('❌ Error en gran distribución:', error);
      throw error;
    }
  }

  /**
   * Confirma la asignación de un aula a una clase
   */
  async confirmarAsignacion(clase, aula, aulasOcupadas, isOvercapacity = false) {
    await clase.update({
      aula_asignada: aula.codigo,
      // Guardar metadato de sobrecupo si es necesario
      // (Podríamos agregar una columna 'notificaciones' o similar en el futuro)
    });

    if (clase.dia && clase.hora_inicio && clase.hora_fin) {
      await Distribucion.create({
        clase_id: clase.id,
        aula_id: aula.id,
        dia: clase.dia,
        hora_inicio: clase.hora_inicio,
        hora_fin: clase.hora_fin,
        estado: isOvercapacity ? 'sobrecupo' : 'confirmada'
      });
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

    const logMsg = isOvercapacity
      ? `  ⚠️ SOBRECUPO: ${clase.materia} (${clase.num_estudiantes} est) → ${aula.codigo} (Cap: ${aula.capacidad})`
      : `  ✅ OK: ${clase.materia} (${clase.num_estudiantes} est) → ${aula.codigo} (Cap: ${aula.capacidad})`;
    console.log(logMsg);
  }

  /**
   * Busca el aula óptima para una clase.
   *
   * Reglas:
   *  - Solo el Auditorio queda excluido (ya filtrado antes de llegar aquí).
   *  - Todas las demás aulas pueden ser usadas por cualquier carrera.
   *  - Si un aula tiene restriccion_carrera + es_prioritaria=true, recibe un
   *    bonus de score cuando la clase pertenece a esa carrera prioritaria.
   *    Las demás carreras también pueden usar el aula, solo con menor prioridad.
   */
  buscarAulaOptima(clase, aulas, aulasOcupadas, estrictoCapacidad = true) {
    let mejorAula = null;
    let menorScore = Infinity;
    let isOvercapacity = false;

    const carreraNorm = normalizarTexto(clase.carrera);

    // Si la clase tiene aula_sugerida, intentar acotar la búsqueda a aulas que coincidan
    const aulaSugerida = clase.aula_sugerida ? normalizarTexto(clase.aula_sugerida) : null;
    const aulasFiltradas = aulaSugerida
      ? aulas.filter(aula => {
        const nombreAula = normalizarTexto(aula.nombre);
        const codigoAula = normalizarTexto(aula.codigo);
        return aulaSugerida.split(' ').some(p =>
          p.length > 3 && (nombreAula.includes(p) || codigoAula.includes(p))
        );
      })
      : aulas;

    const aulasParaBuscar = aulasFiltradas.length > 0 ? aulasFiltradas : aulas;

    if (aulaSugerida && aulasFiltradas.length > 0) {
      console.log(`[Distribucion] "${clase.materia}" tiene aula_sugerida: "${clase.aula_sugerida}" → ${aulasFiltradas.length} candidatas`);
    }

    for (const aula of aulasParaBuscar) {
      // Capacidad mínima en modo estricto
      if (estrictoCapacidad && aula.capacidad < (clase.num_estudiantes || 1)) continue;

      // Verificar disponibilidad en el horario
      if (!this.aulaDisponibleEnHorario(aula.codigo, clase, aulasOcupadas)) continue;

      // ── SCORING ──────────────────────────────────────────────────────────
      // Menor score = mejor asignación.
      const diferenciaCapacidad = Math.abs(aula.capacidad - (clase.num_estudiantes || 1));

      // Bonus de prioridad: el aula tiene una carrera preferente en la BD
      // y la clase pertenece a esa carrera → se favorece esta asignación.
      let bonusPrioridad = 0;
      if (aula.es_prioritaria && aula.restriccion_carrera) {
        const restriccionNorm = normalizarTexto(aula.restriccion_carrera);
        if (carreraNorm.includes(restriccionNorm) || restriccionNorm.includes(carreraNorm)) {
          bonusPrioridad = 1000;
        }
      }

      // Bonus por coincidencia con aula_sugerida
      const matchesSugerencia = aulaSugerida && (
        normalizarTexto(aula.nombre).includes(aulaSugerida) ||
        normalizarTexto(aula.codigo).includes(aulaSugerida)
      );

      const score = diferenciaCapacidad - bonusPrioridad - (matchesSugerencia ? 2000 : 0);

      if (score < menorScore) {
        menorScore = score;
        mejorAula = aula;
        isOvercapacity = aula.capacidad < (clase.num_estudiantes || 1);
      }
    }

    return mejorAula ? { aula: mejorAula, isOvercapacity } : null;
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
