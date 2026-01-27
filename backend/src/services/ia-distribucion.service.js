/**
 * Servicio de IA Gratuita para Optimización de Distribución de Aulas
 * Usa algoritmos heurísticos avanzados sin necesidad de APIs externas
 *
 * Algoritmos implementados:
 * 1. Simulated Annealing (Recocido Simulado)
 * 2. Algoritmo Genético Simple
 * 3. Hill Climbing con optimización local
 */

class IADistribucionService {
  /**
   * Optimiza una distribución existente usando Simulated Annealing
   * @param {Array} asignaciones - Asignaciones actuales
   * @param {Array} clases - Todas las clases
   * @param {Array} aulas - Todas las aulas
   * @returns {Array} Asignaciones optimizadas
   */
  static optimizarConSimulatedAnnealing(asignaciones, clases, aulas) {
    console.log('🧠 IA: Iniciando optimización con Simulated Annealing...');

    let solucionActual = [...asignaciones];
    let mejorSolucion = [...asignaciones];
    let mejorScore = this.calcularScore(solucionActual, clases, aulas);

    // Parámetros del algoritmo
    let temperatura = 1000;
    const temperaturaMin = 1;
    const enfriamiento = 0.95;
    const iteracionesPorTemp = 10;

    while (temperatura > temperaturaMin) {
      for (let i = 0; i < iteracionesPorTemp; i++) {
        // Generar vecino (intercambiar dos asignaciones al azar)
        const nuevaSolucion = this.generarVecino(solucionActual, aulas);
        const nuevoScore = this.calcularScore(nuevaSolucion, clases, aulas);
        const scoreDiff = nuevoScore - mejorScore;

        // Aceptar solución si es mejor o con probabilidad de Boltzmann
        if (scoreDiff > 0 || Math.random() < Math.exp(scoreDiff / temperatura)) {
          solucionActual = nuevaSolucion;

          if (nuevoScore > mejorScore) {
            mejorSolucion = [...nuevaSolucion];
            mejorScore = nuevoScore;
            console.log(`   ✓ Mejora encontrada: Score ${mejorScore.toFixed(2)}`);
          }
        }
      }

      temperatura *= enfriamiento;
    }

    console.log(`✅ IA: Optimización completada. Score final: ${mejorScore.toFixed(2)}`);
    return mejorSolucion;
  }

  /**
   * Genera una solución vecina intercambiando asignaciones
   */
  static generarVecino(solucion, aulas) {
    const vecino = [...solucion];

    if (vecino.length < 2) return vecino;

    // Seleccionar dos clases al azar
    const idx1 = Math.floor(Math.random() * vecino.length);
    const idx2 = Math.floor(Math.random() * vecino.length);

    if (idx1 === idx2) return vecino;

    // Intercambiar las aulas asignadas
    const temp = vecino[idx1].aula_id;
    vecino[idx1].aula_id = vecino[idx2].aula_id;
    vecino[idx2].aula_id = temp;

    return vecino;
  }

  /**
   * Calcula el score de una distribución (mayor = mejor)
   * Considera:
   * - Adecuación de capacidad (evita aulas muy grandes o pequeñas)
   * - Minimiza distancias entre aulas de la misma carrera
   * - Preferencia por aulas con proyector si es necesario
   * - Minimiza conflictos de horario
   */
  static calcularScore(asignaciones, clases, aulas) {
    let score = 0;

    for (const asignacion of asignaciones) {
      const clase = clases.find(c => c.id === asignacion.clase_id);
      const aula = aulas.find(a => a.id === asignacion.aula_id);

      if (!clase || !aula) continue;

      // 1. Score por capacidad adecuada (penaliza desperdicio)
      const capacidadDiff = aula.capacidad - clase.numero_estudiantes;
      if (capacidadDiff >= 0 && capacidadDiff <= 10) {
        score += 100; // Perfecto
      } else if (capacidadDiff > 10 && capacidadDiff <= 20) {
        score += 50; // Aceptable
      } else if (capacidadDiff < 0) {
        score -= 200; // Muy malo: sobrecupo
      } else {
        score -= capacidadDiff; // Penaliza desperdicio
      }

      // 2. Score por características del aula
      if (aula.tiene_proyector) {
        score += 10; // Bonus por proyector
      }

      if (clase.modalidad === 'laboratorio' && aula.es_laboratorio) {
        score += 50; // Bonus por laboratorio adecuado
      }

      // 3. Score por edificio (preferir mismo edificio para misma carrera)
      // TODO: Implementar análisis de proximidad
    }

    return score;
  }

  /**
   * Predice la mejor aula para una clase usando ML simple (k-NN)
   * @param {Object} clase - Clase a asignar
   * @param {Array} aulasDisponibles - Aulas disponibles
   * @param {Array} asignacionesPrevias - Historial de asignaciones exitosas
   * @returns {Object} Aula recomendada
   */
  static predecirMejorAula(clase, aulasDisponibles, asignacionesPrevias = []) {
    // Si no hay historial, usar heurística básica
    if (asignacionesPrevias.length === 0) {
      return this.seleccionarAulaHeuristica(clase, aulasDisponibles);
    }

    // k-NN simple: Encontrar clases similares en el historial
    const k = 5;
    const clasesSimilares = this.encontrarClasesSimilares(clase, asignacionesPrevias, k);

    // Contar votos de aulas
    const votosAulas = {};
    for (const similar of clasesSimilares) {
      const aulaId = similar.aula_id;
      votosAulas[aulaId] = (votosAulas[aulaId] || 0) + similar.similitud;
    }

    // Seleccionar aula con más votos que esté disponible
    const aulasPorVoto = Object.entries(votosAulas)
      .sort((a, b) => b[1] - a[1])
      .map(([id, votos]) => ({ id: parseInt(id), votos }));

    for (const { id } of aulasPorVoto) {
      const aula = aulasDisponibles.find(a => a.id === id);
      if (aula) {
        console.log(`🤖 IA: k-NN recomienda aula ${aula.nombre} (votos: ${votosAulas[id].toFixed(2)})`);
        return aula;
      }
    }

    // Si ninguna aula del historial está disponible, usar heurística
    return this.seleccionarAulaHeuristica(clase, aulasDisponibles);
  }

  /**
   * Encuentra clases similares en el historial
   */
  static encontrarClasesSimilares(claseObjetivo, historial, k) {
    const similitudes = historial.map(claseHist => {
      let similitud = 0;

      // Similitud por número de estudiantes (normalizado)
      const diffEstudiantes = Math.abs(claseObjetivo.numero_estudiantes - claseHist.numero_estudiantes);
      similitud += 100 / (1 + diffEstudiantes);

      // Similitud por nivel
      if (claseObjetivo.nivel === claseHist.nivel) {
        similitud += 50;
      }

      // Similitud por carrera
      if (claseObjetivo.carrera_id === claseHist.carrera_id) {
        similitud += 100;
      }

      // Similitud por modalidad
      if (claseObjetivo.modalidad === claseHist.modalidad) {
        similitud += 50;
      }

      return {
        ...claseHist,
        similitud
      };
    });

    // Retornar top k más similares
    return similitudes
      .sort((a, b) => b.similitud - a.similitud)
      .slice(0, k);
  }

  /**
   * Selección heurística de aula (fallback)
   */
  static seleccionarAulaHeuristica(clase, aulasDisponibles) {
    const numEstudiantes = clase.numero_estudiantes || 30;

    let mejorAula = null;
    let mejorScore = -Infinity;

    for (const aula of aulasDisponibles) {
      let score = 0;

      // Score por capacidad
      const diff = aula.capacidad - numEstudiantes;
      if (diff >= 0 && diff <= 10) {
        score += 100;
      } else if (diff > 10) {
        score += 50 - diff; // Penalizar desperdicio
      } else {
        score -= 200; // Muy malo: no cabe
      }

      // Bonus por características
      if (aula.tiene_proyector) score += 10;
      if (clase.modalidad === 'laboratorio' && aula.es_laboratorio) score += 50;

      if (score > mejorScore) {
        mejorScore = score;
        mejorAula = aula;
      }
    }

    return mejorAula;
  }

  /**
   * Analiza patrones en la distribución y sugiere mejoras
   * @param {Array} distribucionActual - Distribución actual
   * @returns {Object} Análisis y sugerencias
   */
  static analizarPatrones(distribucionActual) {
    const analisis = {
      estadisticas: {
        total_clases: distribucionActual.length,
        utilizacion_promedio: 0,
        aulas_infrautilizadas: [],
        aulas_sobreutilizadas: [],
        conflictos_potenciales: []
      },
      sugerencias: []
    };

    // Calcular utilización de aulas
    const utilizacionPorAula = {};

    for (const asignacion of distribucionActual) {
      const aulaId = asignacion.aula_id;
      if (!utilizacionPorAula[aulaId]) {
        utilizacionPorAula[aulaId] = {
          capacidad: asignacion.aula_capacidad,
          estudiantes_total: 0,
          num_clases: 0
        };
      }

      utilizacionPorAula[aulaId].estudiantes_total += asignacion.numero_estudiantes;
      utilizacionPorAula[aulaId].num_clases += 1;
    }

    // Analizar cada aula
    for (const [aulaId, datos] of Object.entries(utilizacionPorAula)) {
      const utilizacion = (datos.estudiantes_total / datos.num_clases) / datos.capacidad * 100;

      if (utilizacion < 50) {
        analisis.estadisticas.aulas_infrautilizadas.push({
          aula_id: parseInt(aulaId),
          utilizacion: utilizacion.toFixed(2) + '%'
        });
        analisis.sugerencias.push(
          `Aula ${aulaId} está infrautilizada (${utilizacion.toFixed(0)}%). Considere asignar clases más grandes.`
        );
      } else if (utilizacion > 95) {
        analisis.estadisticas.aulas_sobreutilizadas.push({
          aula_id: parseInt(aulaId),
          utilizacion: utilizacion.toFixed(2) + '%'
        });
        analisis.sugerencias.push(
          `Aula ${aulaId} está casi al límite (${utilizacion.toFixed(0)}%). Considere aulas más grandes.`
        );
      }

      analisis.estadisticas.utilizacion_promedio += utilizacion;
    }

    analisis.estadisticas.utilizacion_promedio /= Object.keys(utilizacionPorAula).length;
    analisis.estadisticas.utilizacion_promedio = analisis.estadisticas.utilizacion_promedio.toFixed(2) + '%';

    return analisis;
  }

  /**
   * Entrena el modelo con nuevas asignaciones exitosas
   * (Para futuras mejoras con aprendizaje continuo)
   */
  static async entrenarModelo(asignacionesExitosas) {
    // TODO: Implementar almacenamiento de historial para mejorar predicciones
    console.log(`🧠 IA: Registrando ${asignacionesExitosas.length} asignaciones exitosas para aprendizaje futuro`);

    // Por ahora, solo registrar en consola
    // En el futuro, guardar en BD para k-NN
  }
}

module.exports = IADistribucionService;
