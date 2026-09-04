const { Clase, Aula, Distribucion, Carrera } = require('../models');
const { Op, fn, col, where: seqWhere } = require('sequelize');
const sequelize = { where: seqWhere, fn, col };
const { normalizarTexto } = require('../utils/textUtils');

// ============================================
// REGLAS DE DISTRIBUCIÓN UIDE
// ============================================
// Única regla fija: el Auditorio NO se asigna en distribución automática.
// Se reserva manualmente para eventos institucionales.
//
// Las restricciones de aulas por carrera se gestionan desde la BD:
// - aula.restriccion_carrera → carrera(s) con acceso (string, CSV o JSON array)
// - aula.es_prioritaria = true → la restricción es EXCLUSIVA: solo esa(s)
//   carrera(s) pueden recibir esta aula en la distribución. Ninguna otra
//   carrera puede usarla, aunque esté libre en el horario.
// - Si es_prioritaria = false (o restriccion_carrera es NULL) → aula libre
//   para cualquier carrera.
// ============================================

// Excluye de la distribución automática solo el Auditorio
// (tipo AUDITORIO o restriccion_carrera = 'AUDITORIO_INSTITUCIONAL')
// Excluye de la distribución automática solo el Auditorio
// (tipo AUDITORIO o restriccion_carrera incluye 'AUDITORIO_INSTITUCIONAL')
function aulaExcluidaDeDistribucion(aula) {
  const tipo = (aula.tipo || '').toLowerCase();
  const restriccion = (aula.restriccion_carrera || '').toLowerCase();

  const esAuditorio = tipo === 'auditorio' || tipo === 'sala_magna';
  const esInstitucional = restriccion.includes('auditorio_institucional');

  return esAuditorio || esInstitucional;
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
        where: sequelize.where(sequelize.fn('UPPER', sequelize.col('estado')), 'DISPONIBLE'),
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
          eficiencia: todasLasClases.length > 0 ? ((exitosas / todasLasClases.length) * 100).toFixed(1) + '%' : '0.0%'
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
   *  - Si un aula tiene restriccion_carrera + es_prioritaria=true, es
   *    EXCLUSIVA de esa(s) carrera(s): se descarta por completo para
   *    cualquier otra carrera, sin importar disponibilidad.
   *  - El resto de aulas (sin restricción exclusiva) pueden ser usadas por
   *    cualquier carrera.
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
      const numEstudiantes = clase.num_estudiantes || 1;

      // ── RESTRICCIÓN EXCLUSIVA ────────────────────────────────────────────
      // Si el aula tiene es_prioritaria=true + restriccion_carrera definida,
      // es EXCLUSIVA de esa(s) carrera(s). Ninguna otra carrera puede usarla,
      // sin importar disponibilidad u optimización de score.
      if (aula.es_prioritaria && aula.restriccion_carrera) {
        const tienePrioridad = typeof aula.tienePrioridad === 'function'
          ? aula.tienePrioridad(clase.carrera)
          : normalizarTexto(aula.restriccion_carrera).includes(carreraNorm);

        if (!tienePrioridad) continue; // Aula exclusiva de otra(s) carrera(s): descartar
      }

      // Capacidad mínima en modo estricto
      if (estrictoCapacidad && aula.capacidad < numEstudiantes) continue;

      // Capacidad mínima INCLUSO en modo NO estricto (Seguridad: no más del 25% de sobrecupo)
      // Esto evita que clases de 60 terminen en aulas de 20 (300% sobrecupo)
      const sobrecupoMaximoPermitido = 1.25; // 25% de flexibilidad
      if (!estrictoCapacidad && (aula.capacidad * sobrecupoMaximoPermitido) < numEstudiantes) {
        continue;
      }

      // Verificar disponibilidad en el horario
      if (!this.aulaDisponibleEnHorario(aula.codigo, clase, aulasOcupadas)) continue;

      // ── SCORING ──────────────────────────────────────────────────────────
      // Menor score = mejor asignación.
      const diferenciaCapacidad = Math.abs(aula.capacidad - numEstudiantes);

      // Bonus de prioridad: el aula tiene una(s) carrera(s) preferente(s) en la BD
      // y la clase pertenece a alguna de esas carreras → se favorece esta asignación.
      let bonusPrioridad = 0;
      if (aula.es_prioritaria && aula.restriccion_carrera) {
        // Usar el método del modelo para mayor precisión
        if (typeof aula.tienePrioridad === 'function') {
          if (aula.tienePrioridad(clase.carrera)) {
            bonusPrioridad = 1000;
          }
        } else {
          // Fallback por si acaso no es una instancia de modelo completa
          const restriccionNorm = normalizarTexto(aula.restriccion_carrera);
          if (restriccionNorm.includes(carreraNorm)) {
            bonusPrioridad = 1000;
          }
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
        isOvercapacity = aula.capacidad < numEstudiantes;
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
      if (Array.isArray(carreraId)) {
        // Lista de ids o nombres (ej: director asignado a varias carreras)
        const idsNumericos = carreraId.filter((c) => !isNaN(c));
        const nombresDirectos = carreraId.filter((c) => isNaN(c));
        let nombres = [...nombresDirectos];
        if (idsNumericos.length > 0) {
          const carreras = await Carrera.findAll({ where: { id: idsNumericos }, attributes: ['carrera'], raw: true });
          nombres = nombres.concat(carreras.map((c) => c.carrera));
        }
        if (nombres.length > 0) {
          whereClause.carrera = { [Op.in]: nombres };
        }
      } else if (carreraId) {
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

  // ============================================================
  // FASE 3 — Distribución "fill the gaps" (módulo de planificación
  // colaborativa). Método NUEVO, aditivo — no reemplaza ni modifica
  // ejecutarDistribucion() (que sigue intacto para los endpoints legado
  // /distribucion/ejecutar y /distribucion/forzar).
  //
  // Diferencias clave frente a ejecutarDistribucion():
  //   - NUNCA escribe en la base de datos. 100% lectura — devuelve una
  //     propuesta. La escritura vive en
  //     planificacionCarrera.service.js#aplicarDistribucionFillGaps(),
  //     que además re-verifica CONFIRMADO justo antes de tocar cada bloque
  //     (restricción de arquitectura: esta función ni siquiera tiene el
  //     import de nada con permiso de escritura sobre bloques_disponibilidad).
  //   - Nunca limpia nada primero (a diferencia del paso 1 de
  //     ejecutarDistribucion, que siempre hace destroy+null antes de
  //     reasignar). No hay "reshuffle" — solo huecos.
  //   - Candidatas: clases sin bloque_disponibilidad, o con bloque en
  //     estado LIBRE. Bloques CONFIRMADO (inmutables) y EN_REVISION (un
  //     director editando activamente) quedan fuera del cálculo por
  //     completo — ni se leen para reasignar, ni se tocan.
  //   - Reutiliza buscarAulaOptima() (motor heurístico existente) tal
  //     cual, sin ninguna modificación — mismo scoring, mismo manejo de
  //     restricción exclusiva por carrera, mismo reintento no-estricto
  //     con hasta 25% de sobrecupo.
  // ============================================================
  // periodoId acota el cálculo a un período: `undefined` mantiene el
  // comportamiento transversal histórico, `null` son las clases sin período
  // asignado. Sin filtro, la distribución mezclaba clases de períodos
  // distintos y trataba un aula ocupada el año pasado como ocupada hoy.
  async calcularDistribucionFillGaps(carreraId = null, periodoId = undefined) {
    // Requires diferidos: mantiene el import top-of-file del archivo
    // intacto (solo Clase/Aula/Distribucion/Carrera), sin tocar una
    // línea de código preexistente en este servicio.
    const { BloqueDisponibilidad } = require('../models');
    const { construirOcupacionActual, registrarOcupacionEnMemoria } = require('../utils/ocupacionAulas');

    let nombreCarrera = null;
    if (carreraId) {
      const carrera = await Carrera.findByPk(carreraId);
      if (carrera) nombreCarrera = carrera.carrera;
    }

    const whereClases = {};
    if (nombreCarrera) whereClases.carrera = nombreCarrera;
    if (periodoId !== undefined) whereClases.periodo_id = periodoId;

    const todasLasClasesScope = await Clase.findAll({ where: whereClases });
    const bloquesExistentes = todasLasClasesScope.length > 0
      ? await BloqueDisponibilidad.findAll({ where: { clase_id: todasLasClasesScope.map((c) => c.id) } })
      : [];
    const bloquePorClase = new Map(bloquesExistentes.map((b) => [b.clase_id, b]));

    // Candidatas: sin bloque + sin asignación legado, o bloque LIBRE.
    const candidatas = todasLasClasesScope.filter((c) => {
      const bloque = bloquePorClase.get(c.id);
      if (!bloque) return !c.aula_asignada;
      return bloque.estado === 'LIBRE';
    });

    const todasAulas = await Aula.findAll({
      where: sequelize.where(sequelize.fn('UPPER', sequelize.col('estado')), 'DISPONIBLE')
    });
    const aulas = todasAulas.filter(a => !aulaExcluidaDeDistribucion(a));

    // El complemento de `candidatas`: lo que la distribución NO va a tocar.
    // §3.4 exige que el preview muestre esto explícitamente, porque es la
    // mitad de la evidencia con la que el admin aprueba: antes se filtraba
    // en silencio arriba y nunca se le mostraba, así que aprobaba viendo
    // solo lo que cambiaba y no lo que quedaba fijo.
    //
    // Se usa todasAulas (no `aulas`) para resolver el código: un bloque
    // confirmado puede estar en un aula excluida de la distribución, y
    // seguir siendo una restricción real que el admin necesita ver.
    const aulaPorId = new Map(todasAulas.map((a) => [a.id, a]));
    const setCandidatas = new Set(candidatas.map((c) => c.id));
    const sinCambios = todasLasClasesScope
      .filter((c) => !setCandidatas.has(c.id))
      .map((c) => {
        const bloque = bloquePorClase.get(c.id);
        const aula = bloque?.aula_id ? aulaPorId.get(bloque.aula_id) : null;

        let motivo;
        if (bloque?.estado === 'CONFIRMADO') {
          motivo = 'CONFIRMADO por su carrera: restricción fija de esta distribución';
        } else if (bloque?.estado === 'EN_REVISION') {
          motivo = 'EN_REVISION: un director lo está editando';
        } else {
          motivo = 'Asignación previa de la distribución maestra';
        }

        return {
          claseId: c.id,
          materia: c.materia,
          carrera: c.carrera,
          estado: bloque?.estado || 'LEGADO',
          aulaCodigo: aula ? aula.codigo : (c.aula_asignada || null),
          dia: bloque?.dia || c.dia || null,
          horaInicio: bloque?.hora_inicio || c.hora_inicio || null,
          horaFin: bloque?.hora_fin || c.hora_fin || null,
          motivo,
        };
      });

    // Ocupación fija de partida: legado (Clase.aula_asignada) + CONFIRMADO
    // (bloques_disponibilidad). Cada asignación propuesta dentro de esta
    // misma corrida se agrega en memoria para no chocar con la siguiente.
    const ocupacion = await construirOcupacionActual({ periodoId });

    // Mismo ranking de fases que ejecutarDistribucion(), para mantener
    // la misma prioridad institucional (labs/talleres > masivas > resto).
    const fase1 = candidatas.filter(c => {
      const mat = normalizarTexto(c.materia);
      return mat.includes('LAB') || mat.includes('TALLER') || mat.includes('AUDIENCIA') || mat.includes('PRACTI');
    });
    const fase2 = candidatas.filter(c => !fase1.includes(c) && c.num_estudiantes >= 35)
      .sort((a, b) => b.num_estudiantes - a.num_estudiantes);
    const fase3 = candidatas.filter(c => !fase1.includes(c) && !fase2.includes(c));

    // Equidad entre carreras (solo en corrida institucional, sin carreraId):
    // agrupa cada fase por carrera (preservando el orden/criterio interno de
    // la fase — ej. num_estudiantes desc en fase2) y las intercala en
    // round-robin. Sin esto, una carrera con muchas clases insertadas antes
    // en la tabla agota las aulas buenas de una fase antes de que otra
    // carrera reciba su primer turno. No cambia buscarAulaOptima ni el
    // criterio de orden dentro de cada carrera — solo el orden ENTRE
    // carreras al procesar la fase.
    const agruparPorCarrera = (lista) => {
      const porCarrera = new Map();
      for (const clase of lista) {
        const key = clase.carrera || '';
        if (!porCarrera.has(key)) porCarrera.set(key, []);
        porCarrera.get(key).push(clase);
      }
      return porCarrera;
    };

    const intercalarPorCarrera = (lista) => {
      const colas = [...agruparPorCarrera(lista).values()];
      const resultado = [];
      let quedanPendientes = colas.some(cola => cola.length > 0);
      while (quedanPendientes) {
        quedanPendientes = false;
        for (const cola of colas) {
          if (cola.length > 0) {
            resultado.push(cola.shift());
            if (cola.length > 0) quedanPendientes = true;
          }
        }
      }
      return resultado;
    };

    const fase1Equitativa = intercalarPorCarrera(fase1);
    const fase2Equitativa = intercalarPorCarrera(fase2);
    const fase3Equitativa = intercalarPorCarrera(fase3);

    const propuestas = [];

    const intentarAsignar = (clase, estrictoCapacidad) => {
      const resultado = this.buscarAulaOptima(clase, aulas, ocupacion, estrictoCapacidad);
      if (!resultado) return false;
      propuestas.push({
        claseId: clase.id,
        materia: clase.materia,
        carrera: clase.carrera,
        aulaId: resultado.aula.id,
        aulaCodigo: resultado.aula.codigo,
        dia: clase.dia,
        horaInicio: clase.hora_inicio,
        horaFin: clase.hora_fin,
        isOvercapacity: !!resultado.isOvercapacity
      });
      registrarOcupacionEnMemoria(ocupacion, {
        aulaCodigo: resultado.aula.codigo,
        dia: clase.dia,
        horaInicio: clase.hora_inicio,
        horaFin: clase.hora_fin
      });
      return true;
    };

    const procesarFase = (lista, estrictoCapacidad) => {
      for (const clase of lista) {
        if (!intentarAsignar(clase, estrictoCapacidad)) {
          clase._sinAsignarFillGaps = true;
        }
      }
    };

    procesarFase(fase1Equitativa, true);
    procesarFase(fase2Equitativa, true);
    procesarFase(fase3Equitativa, true);

    // Reintento no estricto (mismo 25% de flexibilidad que el motor original).
    // También intercalado por carrera — la flexibilidad de sobrecupo es un
    // recurso escaso igual que las aulas, aplica la misma regla de equidad.
    const sinAsignar = [];
    const fallidasFase123 = intercalarPorCarrera(candidatas.filter(c => c._sinAsignarFillGaps));
    for (const clase of fallidasFase123) {
      if (!intentarAsignar(clase, false)) {
        sinAsignar.push({ claseId: clase.id, materia: clase.materia, motivo: 'Sin aula disponible en el horario' });
      }
    }

    return {
      // Nombres del contrato de §5.3: las dos listas separadas con las que
      // el admin aprueba. `propuestas` y `sinCambios` quedan como alias
      // internos para no romper a los consumidores que ya existían.
      nuevas_asignaciones: propuestas,
      sin_cambios: sinCambios,
      propuestas,
      sinCambios,
      sinAsignar,
      estadisticas: {
        totalClasesEnAlcance: todasLasClasesScope.length,
        totalCandidatas: candidatas.length,
        sinCambios: sinCambios.length,
        propuestas: propuestas.length,
        sinAsignar: sinAsignar.length
      }
    };
  }
}

module.exports = new DistribucionService();
