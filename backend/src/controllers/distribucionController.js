const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const distribucionService = require('../services/distribucion.service');
const { Carrera, Clase, Aula, Docente, EstudianteMateria, Estudiante, BloqueDisponibilidad } = require('../models');
const { Op } = require('sequelize');
const { enriquecerConModuloColaborativo } = require('../utils/vistaClases');

/**
 * Función centralizada para loggeo de errores 500
 */
const handle500 = (res, error, context) => {
  console.error(` [500] Error en ${context}:`, error);
  res.status(500).json({
    success: false,
    error: `Error en ${context}`,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

const { fixEncoding } = require('../utils/encoding');
const { convertirHora, normalizarTexto } = require('../utils/textUtils');

const getEstadoDistribucion = async (req, res) => {
  try {
    const { carrera_id } = req.query;
    let whereClauseTotal = '';
    let whereClauseCarreras = '';
    const replacements = {};

    if (carrera_id && !isNaN(carrera_id)) {
      whereClauseTotal = 'WHERE c.carrera_id = :carrera_id';
      whereClauseCarreras = 'WHERE ca.id = :carrera_id';
      replacements.carrera_id = parseInt(carrera_id);
    } else {
      // Filtrar por carreras activas por defecto
      whereClauseTotal = 'INNER JOIN uploads_carreras ca_filter ON c.carrera_id = ca_filter.id WHERE ca_filter.activa = true';
    }

    // Obtener estadísticas de distribución
    const stats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clases,
        COUNT(DISTINCT d.clase_id) as clases_asignadas,
        COUNT(DISTINCT ca_f.carrera) as total_carreras
      FROM clases c
      LEFT JOIN distribucion d ON d.clase_id = c.id
      INNER JOIN uploads_carreras ca_f ON c.carrera_id = ca_f.id
      WHERE ca_f.activa = true ${carrera_id && !isNaN(carrera_id) ? ' AND ca_f.id = :carrera_id' : ''}
    `, {
      replacements,
      type: QueryTypes.SELECT
    });

    const statsRow = stats[0] || { total_clases: 0, clases_asignadas: 0, total_carreras: 0 };
    const clases_pendientes = (parseInt(statsRow.total_clases) || 0) - (parseInt(statsRow.clases_asignadas) || 0);

    // Obtener carreras con su estado
    // Usamos subquery lateral para obtener solo un director por carrera y evitar duplicados
    const carreras = await sequelize.query(`
      SELECT
        ca.id,
        ca.carrera as nombre_carrera,
        'activa' as estado,
        COUNT(DISTINCT c.id) as total_clases,
        COUNT(DISTINCT d.clase_id) as clases_asignadas,
        dir.nombre as director_nombre,
        dir.email as director_email
      FROM uploads_carreras ca
      LEFT JOIN clases c ON c.carrera_id = ca.id
      LEFT JOIN distribucion d ON d.clase_id = c.id
      LEFT JOIN LATERAL (
        SELECT u.nombre, u.email
        FROM usuarios u
        WHERE u.rol = 'director'
          AND (
            u.id IN (SELECT dc.usuario_id FROM director_carreras dc WHERE dc.carrera_id = ca.id)
            OR u.carrera_director = ca.carrera
          )
        LIMIT 1
      ) dir ON true
      WHERE ca.activa = true ${carrera_id && !isNaN(carrera_id) ? ' AND ca.id = :carrera_id' : ''}
      GROUP BY ca.id, ca.carrera, dir.nombre, dir.email
      ORDER BY ca.carrera
    `, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      estadisticas: {
        total_clases: parseInt(statsRow.total_clases) || 0,
        clases_asignadas: parseInt(statsRow.clases_asignadas) || 0,
        clases_pendientes: clases_pendientes,
        total_carreras: parseInt(statsRow.total_carreras) || 0,
        porcentaje_completado: statsRow.total_clases > 0
          ? Math.round((statsRow.clases_asignadas / statsRow.total_clases) * 100)
          : 0
      },
      carreras: carreras.map(c => ({
        ...c,
        nombre_carrera: fixEncoding(c.nombre_carrera),
        director_nombre: fixEncoding(c.director_nombre),
        total_clases: parseInt(c.total_clases) || 0,
        clases_asignadas: parseInt(c.clases_asignadas) || 0,
        clases_pendientes: (parseInt(c.total_clases) || 0) - (parseInt(c.clases_asignadas) || 0),
        porcentaje_completado: c.total_clases > 0
          ? Math.round((c.clases_asignadas / c.total_clases) * 100)
          : 0
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handle500(res, error, 'getEstadoDistribucion');
  }
};

/**
 * Ejecutar distribución (solo algoritmo local)
 * n8n ya NO participa en el flujo crítico de distribución.
 * Usado por ambos endpoints: /ejecutar y /forzar
 */
const ejecutarDistribucionLocal = async (req, res) => {
  try {
    console.log('🎯 Ejecutando distribución de aulas (algoritmo local)...');

    let carreraId = req.query.carrera_id || req.body.carrera_id;
    const usuario = req.usuario;

    // Seguridad: un director solo puede ejecutar la distribución sobre
    // alguna de sus propias carreras (el algoritmo opera sobre una a la vez).
    if (usuario && usuario.rol === 'director') {
      const carreraIds = usuario.carreraIds || [];
      if (carreraIds.length === 0) {
        return res.status(403).json({ success: false, mensaje: 'No tienes ninguna carrera asignada' });
      }
      const solicitadoNum = carreraId ? parseInt(carreraId) : null;
      if (solicitadoNum && !carreraIds.includes(solicitadoNum)) {
        return res.status(403).json({ success: false, mensaje: 'No tienes permiso para distribuir esta carrera' });
      }
      carreraId = solicitadoNum || carreraIds[0];
    }

    const resultado = await distribucionService.ejecutarDistribucion(carreraId);
    res.json(resultado);
  } catch (error) {
    console.error('Error al ejecutar distribución:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al ejecutar la distribución',
      error: error.message
    });
  }
};

// Alias: ambos endpoints usan el mismo handler
const forzarDistribucion = ejecutarDistribucionLocal;
const ejecutarDistribucionAutomatica = ejecutarDistribucionLocal;

// ============================================
// OBTENER HORARIO
// ============================================
const obtenerHorario = async (req, res) => {
  try {
    const usuario = req.usuario;
    let carreraId = req.query.carrera_id;

    // Si es director, solo puede ver sus carreras asignadas (soporta varias)
    if (usuario.rol === 'director') {
      carreraId = usuario.carreraIds || [];
    }

    const horario = await distribucionService.obtenerHorario(carreraId);

    res.json({
      success: true,
      horario: horario
    });
  } catch (error) {
    console.error('Error al obtener horario:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener horario',
      error: error.message
    });
  }
};

// ============================================
// LIMPIAR DISTRIBUCIÓN
// ============================================
const limpiarDistribucion = async (req, res) => {
  try {
    console.log('🗑️  Admin solicitó limpiar distribución');

    const resultado = await distribucionService.limpiarDistribucion();

    res.json(resultado);
  } catch (error) {
    console.error('Error al limpiar distribución:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al limpiar la distribución',
      error: error.message
    });
  }
};

// ============================================
// OBTENER MAPA DE CALOR
// ============================================
const obtenerMapaCalor = async (req, res) => {
  try {
    const usuario = req.usuario;
    let carreraId = req.query.carrera_id;
    let carreraIds = null;

    if (usuario.rol === 'director') {
      carreraIds = usuario.carreraIds || [];
    }

    let whereClause = '';
    const replacements = {};
    if (carreraIds) {
      // Director: puede tener 0, 1 o varias carreras asignadas
      if (carreraIds.length > 0) {
        whereClause = 'AND c.carrera_id IN (:carrera_ids)';
        replacements.carrera_ids = carreraIds;
      } else {
        whereClause = 'AND 1=0';
      }
    } else if (carreraId) {
      if (!isNaN(carreraId)) {
        whereClause = 'AND c.carrera_id = :carrera_id';
      } else {
        whereClause = 'AND c.carrera = :carrera_id';
      }
      replacements.carrera_id = carreraId;
    }

    const clases = await sequelize.query(`
      SELECT
        c.id, c.materia, c.carrera, c.dia, c.hora_inicio, c.hora_fin,
        c.num_estudiantes, c.docente, c.aula_asignada,
        a.id as aula_id, a.nombre as aula_nombre, a.capacidad as aula_capacidad
      FROM clases c
      LEFT JOIN aulas a ON a.codigo = c.aula_asignada
      WHERE c.aula_asignada IS NOT NULL ${whereClause}
      ORDER BY c.dia, c.hora_inicio
    `, {
      replacements,
      type: QueryTypes.SELECT
    });

    const [statsAulas] = await sequelize.query(`
      SELECT COUNT(*) as total FROM aulas WHERE estado = 'disponible'
    `, { type: QueryTypes.SELECT });

    const totalAulas = parseInt(statsAulas.total) || 1;
    const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const HORAS = Array.from({ length: 15 }, (_, i) => i + 7); // 7-21

    const ocupacion = {};
    const detalles = [];

    for (const dia of DIAS) {
      ocupacion[dia] = {};
      for (const hora of HORAS) {
        ocupacion[dia][hora] = { clases: [], aulas_ocupadas: 0 };
      }
    }

    for (const clase of clases) {
      if (!clase.dia || !clase.hora_inicio) continue;

      const horaInicio = parseInt(clase.hora_inicio.split(':')[0]);
      const horaFin = parseInt((clase.hora_fin || clase.hora_inicio).split(':')[0]);

      for (let h = horaInicio; h < horaFin; h++) {
        if (ocupacion[clase.dia] && ocupacion[clase.dia][h]) {
          const capacidadAula = clase.aula_capacidad || 0;
          const numEstudiantes = clase.num_estudiantes || 0;
          ocupacion[clase.dia][h].clases.push({
            materia: clase.materia,
            aula: clase.aula_asignada,
            docente: clase.docente || 'Sin asignar',
            estudiantes: numEstudiantes,
            capacidad_aula: capacidadAula,
            sobrecupo: capacidadAula > 0 && numEstudiantes > capacidadAula,
            porcentaje_uso: capacidadAula > 0 ? Math.round((numEstudiantes / capacidadAula) * 100) : null,
            carrera: clase.carrera
          });
          ocupacion[clase.dia][h].aulas_ocupadas++;
        }
      }
    }

    const puntos = [];
    const horasPico = {};

    for (const dia of DIAS) {
      for (const hora of HORAS) {
        const dato = ocupacion[dia][hora];
        const porcentajeOcupacion = (dato.aulas_ocupadas / totalAulas) * 100;

        let nivel = 'EMPTY';
        if (porcentajeOcupacion > 0 && porcentajeOcupacion < 40) nivel = 'LOW';
        else if (porcentajeOcupacion >= 40 && porcentajeOcupacion < 70) nivel = 'MEDIUM';
        else if (porcentajeOcupacion >= 70) nivel = 'HIGH';

        puntos.push({
          dia, hora, nivel,
          porcentaje_ocupacion: parseFloat(porcentajeOcupacion.toFixed(2)),
          aulas_ocupadas: dato.aulas_ocupadas,
          total_aulas: totalAulas,
          clases_activas: dato.clases.length
        });

        if (dato.clases.length > 0) {
          detalles.push({ dia, hora, clases: dato.clases });
        }

        if (porcentajeOcupacion >= 70) {
          const horaKey = `${String(hora).padStart(2, '0')}:00`;
          horasPico[horaKey] = (horasPico[horaKey] || 0) + 1;
        }
      }
    }

    const topHorasPico = Object.entries(horasPico)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hora]) => hora);

    const promedioOcupacion = puntos.length > 0
      ? (puntos.reduce((sum, p) => sum + p.porcentaje_ocupacion, 0) / puntos.length).toFixed(2)
      : 0;

    res.json({
      success: true,
      estadisticas: {
        total_aulas: totalAulas,
        total_clases: clases.length,
        promedio_ocupacion: parseFloat(promedioOcupacion),
        horas_pico: topHorasPico
      },
      puntos,
      detalles,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    handle500(res, error, 'obtenerMapaCalor');
  }
};

// ============================================
// MAPA DE CALOR DETALLADO: Hora vs Aula con % de ocupación individual
// ============================================
const obtenerMapaCalorDetallado = async (req, res) => {
  try {
    const usuario = req.usuario;
    let carreraId = req.query.carrera_id;
    const esDirector = usuario.rol === 'director';
    const carreraIdsDirector = esDirector ? (usuario.carreraIds || []) : null;
    const carreraNombresDirector = esDirector ? (usuario.carreraNombres || []) : null;
    const edificio = req.query.edificio;
    const capacidadMinima = parseInt(req.query.capacidad_minima) || 0;
    const diasParam = req.query.dias; // "Lunes,Martes,Miercoles"
    const franja = req.query.franja; // "manana" | "tarde" | "noche" | ""

    // Si es director sin carrera_id explícito, ya no forzamos un solo valor:
    // usamos directamente sus listas de ids/nombres más abajo.
    if (esDirector) {
      carreraId = null;
    }

    const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    let diasFiltro = DIAS;
    if (diasParam) {
      const selected = diasParam.split(',').map(d => d.trim());
      diasFiltro = DIAS.filter(d => selected.some(s => d.toLowerCase().startsWith(s.toLowerCase())));
    }

    const HORAS = Array.from({ length: 15 }, (_, i) => i + 7); // 7-21
    let horasFiltro = HORAS;
    if (franja === 'manana') horasFiltro = HORAS.filter(h => h >= 7 && h <= 12);
    else if (franja === 'tarde') horasFiltro = HORAS.filter(h => h >= 13 && h <= 18);
    else if (franja === 'noche') horasFiltro = HORAS.filter(h => h >= 19 && h <= 22);

    // 1) Obtener aulas según filtros
    let whereAula = "WHERE a.estado = 'disponible'";
    const replacements = {};
    if (edificio) {
      whereAula += ' AND a.edificio = :edificio';
      replacements.edificio = edificio;
    }
    if (capacidadMinima > 0) {
      whereAula += ' AND a.capacidad >= :capacidad_minima';
      replacements.capacidad_minima = capacidadMinima;
    }

    // Si es director, obtener aulas disponibles para CUALQUIERA de sus carreras
    if (esDirector) {
      if (carreraNombresDirector.length > 0) {
        whereAula += ` AND (a.restriccion_carrera IS NULL OR ${carreraNombresDirector
          .map((_, i) => `a.restriccion_carrera LIKE '%' || :carrera_busqueda_${i} || '%'`)
          .join(' OR ')})`;
        carreraNombresDirector.forEach((nombre, i) => {
          replacements[`carrera_busqueda_${i}`] = nombre;
        });
      } else {
        // Director sin carreras asignadas: no debe ver ninguna aula
        whereAula += ' AND 1=0';
      }
    } else if (carreraId) {
      whereAula += ` AND (a.restriccion_carrera IS NULL OR a.restriccion_carrera LIKE '%' || :carrera_busqueda || '%')`;
      replacements.carrera_busqueda = String(carreraId);
    }

    const aulas = await sequelize.query(`
      SELECT a.id, a.codigo, a.nombre, a.capacidad, a.tipo, a.edificio, a.piso, a.restriccion_carrera
      FROM aulas a
      ${whereAula}
      ORDER BY a.edificio, a.piso, a.codigo
    `, {
      replacements,
      type: QueryTypes.SELECT
    });

    if (aulas.length === 0) {
      return res.json({ success: true, aulas: [], horas: horasFiltro, dias: diasFiltro, datos: {}, estadisticas: { total_aulas: 0, promedio_ocupacion: 0 } });
    }

    // 2) Obtener clases con aula_asignada en esas aulas
    const aulaIds = aulas.map(a => a.id);
    const filtroCarreraClases = esDirector
      ? (carreraIdsDirector.length > 0 ? 'AND c.carrera_id IN (:carreraIds)' : 'AND 1=0')
      : (carreraId && !isNaN(Number(carreraId)) ? 'AND c.carrera_id = :carreraId' : '');
    const clases = await sequelize.query(`
      SELECT
        c.id, c.materia, c.carrera, c.dia, c.hora_inicio, c.hora_fin,
        c.num_estudiantes, c.docente, c.aula_asignada,
        a.id as aula_id
      FROM clases c
      JOIN aulas a ON a.codigo = c.aula_asignada
      WHERE a.id IN (:aulaIds)
        AND c.aula_asignada IS NOT NULL
      ${filtroCarreraClases}
      ORDER BY c.dia, c.hora_inicio
    `, {
      replacements: {
        aulaIds,
        ...(esDirector && carreraIdsDirector.length > 0 ? { carreraIds: carreraIdsDirector } : {}),
        ...(!esDirector && carreraId && !isNaN(Number(carreraId)) ? { carreraId: Number(carreraId) } : {})
      },
      type: QueryTypes.SELECT
    });

    // 2.5) Fase 7b: fusionar lo CONFIRMADO en el módulo colaborativo dentro
    // del mismo scope de aulas ya filtrado (aulaIds). bloques_disponibilidad
    // es más reciente que Clase.aula_asignada cuando existe — puede apuntar
    // a OTRA aula (el director la movió) o cubrir una clase que el legado
    // nunca asignó. Sin esto el heatmap muestra ocupación que ya no es
    // cierta. EN_REVISION queda afuera a propósito (mismo criterio que
    // calcularDistribucionFillGaps): no es un compromiso institucional
    // todavía, no debe pintar el mapa como ocupado.
    const bloquesConfirmados = await BloqueDisponibilidad.findAll({
      where: { estado: 'CONFIRMADO', aula_id: { [Op.in]: aulaIds } },
      include: [
        { model: Aula, as: 'aula', attributes: ['id', 'codigo'] },
        { model: Clase, as: 'clase', attributes: ['id', 'materia', 'carrera', 'carrera_id', 'num_estudiantes', 'docente'] }
      ]
    });

    const idsConBloqueConfirmado = new Set(bloquesConfirmados.filter(b => b.clase).map(b => b.clase_id));
    const clasesLegadoVigentes = clases.filter(c => !idsConBloqueConfirmado.has(c.id));

    const clasesDesdeColaborativo = bloquesConfirmados
      .filter(b => b.clase && b.aula)
      .filter(b => {
        // Mismo scope de carrera que ya aplica la query legado de arriba.
        if (esDirector) return carreraIdsDirector.includes(b.clase.carrera_id);
        if (carreraId && !isNaN(Number(carreraId))) return b.clase.carrera_id === Number(carreraId);
        return true;
      })
      .map(b => ({
        id: b.clase.id,
        materia: b.clase.materia,
        carrera: b.clase.carrera,
        dia: b.dia,
        hora_inicio: b.hora_inicio ? b.hora_inicio.slice(0, 5) : null,
        hora_fin: b.hora_fin ? b.hora_fin.slice(0, 5) : null,
        num_estudiantes: b.clase.num_estudiantes,
        docente: b.clase.docente,
        aula_asignada: b.aula.codigo
      }));

    const clasesUnificadas = [...clasesLegadoVigentes, ...clasesDesdeColaborativo];

    // 3) Construir matriz: aulaId_hora -> { ocupacion, clase, docente, estudiantes, carrera }
    const datos = {};
    for (const dia of diasFiltro) {
      for (const aula of aulas) {
        for (const hora of horasFiltro) {
          const key = `${aula.id}_${hora}_${dia}`;
          datos[key] = null;
        }
      }
    }

    for (const clase of clasesUnificadas) {
      if (!clase.dia || !clase.hora_inicio) continue;
      if (!diasFiltro.includes(clase.dia)) continue;

      const horaInicio = parseInt(clase.hora_inicio.split(':')[0]);
      const horaFin = parseInt((clase.hora_fin || clase.hora_inicio).split(':')[0]);

      const aula = aulas.find(a => a.codigo === clase.aula_asignada);
      if (!aula) continue;

      for (let h = horaInicio; h < horaFin; h++) {
        if (!horasFiltro.includes(h)) continue;
        const key = `${aula.id}_${h}_${clase.dia}`;
        const capacidad = aula.capacidad || 1;
        const estudiantes = clase.num_estudiantes || 0;
        datos[key] = {
          ocupacion: parseFloat(((estudiantes / capacidad) * 100).toFixed(1)),
          clase: clase.materia,
          docente: clase.docente || 'Sin asignar',
          estudiantes,
          capacidad_aula: capacidad,
          carrera: clase.carrera,
          clase_id: clase.id
        };
      }
    }

    // 4) Calcular estadísticas
    let totalOcupacion = 0;
    let celdasOcupadas = 0;
    for (const key of Object.keys(datos)) {
      if (datos[key]) {
        totalOcupacion += datos[key].ocupacion;
        celdasOcupadas++;
      }
    }
    const promedioOcupacion = celdasOcupadas > 0 ? parseFloat((totalOcupacion / celdasOcupadas).toFixed(1)) : 0;

    // 5) Obtener edificios disponibles para el filtro
    const edificios = await sequelize.query(`
      SELECT DISTINCT a.edificio FROM aulas a WHERE a.estado = 'disponible' AND a.edificio IS NOT NULL ORDER BY a.edificio
    `, { type: QueryTypes.SELECT });

    res.json({
      success: true,
      aulas: aulas.map(a => ({ id: a.id, codigo: a.codigo, nombre: a.nombre, capacidad: a.capacidad, tipo: a.tipo, edificio: a.edificio, piso: a.piso })),
      horas: horasFiltro,
      dias: diasFiltro,
      datos,
      filtros_disponibles: {
        edificios: edificios.map(e => e.edificio)
      },
      estadisticas: {
        total_aulas: aulas.length,
        promedio_ocupacion: promedioOcupacion
      }
    });

  } catch (error) {
    handle500(res, error, 'obtenerMapaCalorDetallado');
  }
};

// ============================================
// OBTENER CLASES CON DISTRIBUCIÓN (PARA VISTA ADMIN)
// ============================================
const getClasesDistribucion = async (req, res) => {
  try {
    // Obtener todas las clases con info de aula
    const clases = await sequelize.query(`
      SELECT
        c.id,
        c.carrera,
        c.materia,
        c.ciclo,
        c.paralelo,
        c.dia,
        c.hora_inicio,
        c.hora_fin,
        c.num_estudiantes,
        c.docente,
        c.aula_asignada,
        a.nombre as aula_nombre,
        a.capacidad as aula_capacidad
      FROM clases c
      LEFT JOIN aulas a ON a.codigo = c.aula_asignada
      ORDER BY c.carrera, c.ciclo, c.materia
    `, { type: QueryTypes.SELECT });

    // Fase 7b: enriquecer con lo CONFIRMADO/EN_REVISION del módulo
    // colaborativo ANTES de detectar conflictos/sobrecupo — así esos
    // cálculos usan el aula/horario real (el que confirmó el director),
    // no el legado desactualizado. Sin esto, el admin ve una clase como
    // "asignada" en un aula que el director ya movió a otra.
    const clasesEnriquecidas = await enriquecerConModuloColaborativo(clases);

    // Detectar conflictos: misma aula, mismo día, horarios solapados
    const conflictos = new Set();
    const clasesConAula = clasesEnriquecidas.filter(c => c.aula_asignada);

    for (let i = 0; i < clasesConAula.length; i++) {
      for (let j = i + 1; j < clasesConAula.length; j++) {
        const a = clasesConAula[i];
        const b = clasesConAula[j];

        if (a.aula_asignada === b.aula_asignada && a.dia === b.dia) {
          const inicioA = convertirHora(a.hora_inicio);
          const finA = convertirHora(a.hora_fin);
          const inicioB = convertirHora(b.hora_inicio);
          const finB = convertirHora(b.hora_fin);

          if (inicioA < finB && finA > inicioB) {
            conflictos.add(a.id);
            conflictos.add(b.id);
          }
        }
      }
    }

    // Agregar estado a cada clase (incluye sobrecupo, igual que getMiDistribucion).
    // 'en_revision' es nuevo (Fase 7b): un director la está trabajando en el
    // módulo colaborativo, todavía no confirmó. Se evalúa antes que
    // pendiente/asignada para no mostrarla como silenciosamente resuelta ni
    // silenciosamente pendiente; conflicto sigue primero porque ya opera
    // sobre el aula real (enriquecida) y es la señal más grave.
    const clasesConEstado = clasesEnriquecidas.map(c => {
      const numEst = c.num_estudiantes || 0;
      const capAula = c.aula_capacidad || 0;
      const esSobrecupo = c.aula_asignada && capAula > 0 && numEst > capAula;
      const porcentajeUso = capAula > 0 ? Math.round((numEst / capAula) * 100) : null;

      let estado;
      if (conflictos.has(c.id)) estado = 'conflicto';
      else if (c.fuente === 'colaborativo_en_revision') estado = 'en_revision';
      else if (!c.aula_asignada) estado = 'pendiente';
      else if (esSobrecupo) estado = 'sobrecupo';
      else estado = 'asignada';

      return {
        ...c,
        materia: fixEncoding(c.materia),
        carrera: fixEncoding(c.carrera),
        docente: fixEncoding(c.docente),
        sobrecupo: !!esSobrecupo,
        porcentaje_uso: porcentajeUso,
        estado
      };
    });

    // Contadas desde clasesConEstado.estado (mutuamente excluyente por
    // construcción arriba) en vez de recalcular desde aula_asignada crudo —
    // una clase en_revision puede tener aula_asignada legado no-nulo (ej.
    // A-C17 legado mientras el director la mueve a otra aula) y contarla
    // dos veces daría estadísticas inconsistentes.
    const totalClases = clasesConEstado.length;
    const asignadas = clasesConEstado.filter(c => c.estado === 'asignada' || c.estado === 'sobrecupo').length;
    const enRevision = clasesConEstado.filter(c => c.estado === 'en_revision').length;
    const pendientes = clasesConEstado.filter(c => c.estado === 'pendiente').length;
    const totalConflictos = conflictos.size;
    const totalSobrecupos = clasesConEstado.filter(c => c.sobrecupo).length;

    res.json({
      success: true,
      clases: clasesConEstado,
      estadisticas: {
        total_clases: totalClases,
        asignadas,
        en_revision: enRevision,
        pendientes,
        conflictos: totalConflictos,
        sobrecupos: totalSobrecupos,
        porcentaje_completado: totalClases > 0 ? Math.round((asignadas / totalClases) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error al obtener clases de distribución:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener clases de distribución',
      message: error.message
    });
  }
};

// convertirHora y normalizarTexto ahora vienen de utils/textUtils.js


/**
 * Normaliza un ciclo/nivel a número entero.
 * Soporta formatos: "Octavo", "8vo", "8", "OCTAVO", "8VO", etc.
 */
function normalizarCiclo(valor) {
  if (!valor) return null;
  const v = valor.toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Si ya es un número directo
  const num = parseInt(v);
  if (!isNaN(num) && num > 0 && num <= 12) return num;

  // Extraer número de abreviaciones: "1ro", "2do", "3ro", "4to", "5to", "6to", "7mo", "8vo", "9no", "10mo"
  const matchAbrev = v.match(/^(\d+)/);
  if (matchAbrev) {
    const n = parseInt(matchAbrev[1]);
    if (n > 0 && n <= 12) return n;
  }

  // Texto completo a número
  const textoANumero = {
    'primero': 1, 'segundo': 2, 'tercero': 3, 'cuarto': 4,
    'quinto': 5, 'sexto': 6, 'septimo': 7, 'octavo': 8,
    'noveno': 9, 'decimo': 10, 'undecimo': 11, 'duodecimo': 12
  };

  return textoANumero[v] || null;
}



const updateClase = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { materia, ciclo, paralelo, dia, hora_inicio, hora_fin, aula_asignada, docente, num_estudiantes } = req.body;
    const usuario = req.usuario;

    // Buscar la clase
    const [clase] = await sequelize.query(
      'SELECT * FROM clases WHERE id = $1',
      { bind: [id], type: QueryTypes.SELECT, transaction }
    );

    if (!clase) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Clase no encontrada' });
    }

    // Seguridad: Si es director, validar que la clase pertenezca a alguna de sus carreras
    if (usuario.rol === 'director' && !(usuario.carreraIds || []).includes(clase.carrera_id)) {
      await transaction.rollback();
      return res.status(403).json({ success: false, error: 'No tienes permiso para modificar esta clase' });
    }

    // Formatear horas a formato 24h HH:MM:SS
    const formatTime = (t) => {
      if (!t) return null;
      let str = String(t).trim();
      const match12 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?$/i);
      if (match12) {
        let hrs = parseInt(match12[1], 10);
        const mins = match12[2];
        const ampm = match12[4];
        if (ampm) {
          const isPM = ampm.toLowerCase().includes('p');
          if (isPM && hrs < 12) hrs += 12;
          if (!isPM && hrs === 12) hrs = 0;
        }
        return `${String(hrs).padStart(2, '0')}:${mins}:00`;
      }
      return str;
    };

    const hInicio = formatTime(hora_inicio) || clase.hora_inicio;
    const hFin = formatTime(hora_fin) || clase.hora_fin;
    const diaClase = dia || clase.dia;
    const numEst = (num_estudiantes !== undefined && num_estudiantes !== null && !isNaN(num_estudiantes)) ? Number(num_estudiantes) : clase.num_estudiantes;

    // Actualizar la clase
    await sequelize.query(`
      UPDATE clases
      SET materia = COALESCE(NULLIF($1, ''), materia),
          dia = $2,
          hora_inicio = $3,
          hora_fin = $4,
          aula_asignada = $5,
          docente = COALESCE(NULLIF($6, ''), docente),
          num_estudiantes = $7,
          ciclo = COALESCE(NULLIF($8, ''), ciclo),
          paralelo = COALESCE(NULLIF($9, ''), paralelo)
      WHERE id = $10
    `, {
      bind: [
        materia || null,
        diaClase,
        hInicio,
        hFin,
        aula_asignada || null,
        docente || null,
        numEst,
        ciclo || null,
        paralelo || null,
        id
      ],
      type: QueryTypes.UPDATE,
      transaction
    });

    // Si se asignó un aula, actualizar también la tabla de distribución
    if (aula_asignada) {
      // Buscar el ID numérico del aula a partir de su código
      const [aulaRow] = await sequelize.query(
        'SELECT id FROM aulas WHERE codigo = $1 LIMIT 1',
        { bind: [aula_asignada], type: QueryTypes.SELECT, transaction }
      );

      if (aulaRow) {
        const [distRow] = await sequelize.query(
          'SELECT id FROM distribucion WHERE clase_id = $1 LIMIT 1',
          { bind: [id], type: QueryTypes.SELECT, transaction }
        );

        if (distRow) {
          await sequelize.query(`
            UPDATE distribucion
            SET aula_id = $1, dia = $2, hora_inicio = $3, hora_fin = $4
            WHERE clase_id = $5
          `, {
            bind: [aulaRow.id, diaClase, hInicio, hFin, id],
            type: QueryTypes.UPDATE,
            transaction
          });
        } else {
          await sequelize.query(`
            INSERT INTO distribucion (clase_id, aula_id, dia, hora_inicio, hora_fin)
            VALUES ($1, $2, $3, $4, $5)
          `, {
            bind: [id, aulaRow.id, diaClase, hInicio, hFin],
            type: QueryTypes.INSERT,
            transaction
          });
        }
      }
    }

    await transaction.commit();
    res.json({ success: true, mensaje: 'Clase actualizada correctamente' });
  } catch (error) {
    await transaction.rollback();
    handle500(res, error, 'updateClase');
  }
};

const checkDisponibilidad = async (req, res) => {
  try {
    const { dia, hora_inicio, hora_fin, capacidad_minima } = req.query;

    if (!dia || !hora_inicio || !hora_fin) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros de tiempo' });
    }

    // Buscar aulas que NO estén ocupadas en ese rango y tengan capacidad
    const aulasLibres = await sequelize.query(`
      SELECT a.id, a.codigo, a.nombre, a.capacidad, a.edificio, a.tipo
      FROM aulas a
      WHERE a.estado = 'disponible'
      AND a.capacidad >= $1
      AND a.codigo NOT IN (
        SELECT aula_asignada FROM clases 
        WHERE dia = $2 
        AND aula_asignada IS NOT NULL
        AND (
          (hora_inicio < $3 AND hora_fin > $2) OR -- Solapamiento
          (hora_inicio < $4 AND hora_fin > $3)
        )
      )
      ORDER BY a.capacidad ASC
    `, {
      bind: [capacidad_minima || 0, dia, hora_inicio, hora_fin],
      type: QueryTypes.SELECT
    });

    res.json({ success: true, aulas: aulasLibres });
  } catch (error) {
    handle500(res, error, 'checkDisponibilidad');
  }
};

// ============================================
// MI DISTRIBUCIÓN (para profesores/directores)
// ============================================
const getMiDistribucion = async (req, res) => {
  try {
    const usuario = req.usuario;
    let whereClause = '';
    const replacements = {};

    // Filtrar según rol
    if (usuario.rol === 'profesor' || usuario.rol === 'docente') {
      // 1. Intentar buscar por vinculación directa de ID (Más preciso)
      const docenteRecord = await Docente.findOne({ where: { usuario_id: usuario.id } });

      if (docenteRecord) {
        whereClause = 'WHERE (c.docente_id = :docente_id OR LOWER(c.docente) LIKE LOWER(:docente_nombre))';
        replacements.docente_id = docenteRecord.id;
        replacements.docente_nombre = `%${docenteRecord.nombre}%`;
      } else {
        // Fallback: Buscar por nombre del usuario
        const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
        if (nombreCompleto) {
          whereClause = 'WHERE LOWER(c.docente) LIKE LOWER(:docente)';
          replacements.docente = `%${nombreCompleto}%`;
        }
      }
    } else if (usuario.rol === 'director') {
      if (req.query.como_docente === 'true') {
        // El director quiere ver SUS PROPIAS clases como docente
        const docenteRecord = await Docente.findOne({ where: { usuario_id: usuario.id } });
        if (docenteRecord) {
          whereClause = 'WHERE (c.docente_id = :docente_id OR LOWER(c.docente) LIKE LOWER(:docente_nombre))';
          replacements.docente_id = docenteRecord.id;
          replacements.docente_nombre = `%${docenteRecord.nombre}%`;
        } else {
          const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
          whereClause = nombreCompleto
            ? 'WHERE LOWER(c.docente) LIKE LOWER(:docente)'
            : 'WHERE 1=0';
          if (nombreCompleto) replacements.docente = `%${nombreCompleto}%`;
        }
      } else {
        // Ve las clases de TODAS sus carreras asignadas
        const carreraIds = usuario.carreraIds || [];
        whereClause = carreraIds.length > 0 ? 'WHERE c.carrera_id IN (:carreraIds)' : 'WHERE 1=0';
        replacements.carreraIds = carreraIds;
      }
    } else if (usuario.rol === 'estudiante') {
      // Cargar datos del estudiante para filtrar por carrera
      const estRecord = await Estudiante.findByPk(usuario.id);

      // 1. VERIFICACIÓN DE INSCRIPCIONES ESPECÍFICAS
      const inscripciones = await EstudianteMateria.findAll({
        where: { estudiante_id: usuario.id }
      });

      if (inscripciones.length > 0) {
        const claseIds = inscripciones.map(ins => ins.clase_id);
        // Filtrar por carrera del estudiante para evitar mostrar clases de otras carreras
        if (estRecord && estRecord.escuela) {
          whereClause = 'WHERE c.id IN (:claseIds) AND LOWER(c.carrera) LIKE LOWER(:carreraEst)';
          replacements.claseIds = claseIds;
          replacements.carreraEst = `%${estRecord.escuela}%`;
          console.log(`🎯 Filtrando ${claseIds.length} materias específicas para el estudiante ${usuario.id} (${estRecord.escuela})`);
        } else {
          whereClause = 'WHERE c.id IN (:claseIds)';
          replacements.claseIds = claseIds;
          console.log(`🎯 Filtrando ${claseIds.length} materias específicas para el estudiante ${usuario.id}`);
        }
      } else {
        // FALLBACK: buscar por nivel (ciclo) y carrera del estudiante
        // Usar findByPk porque usuario.id es el id de la tabla estudiantes
        if (estRecord && estRecord.escuela) {
          const cicloNum = estRecord.nivel ? normalizarCiclo(estRecord.nivel) : null;
          // Pre-query: obtener IDs de clases del ciclo de la carrera del estudiante
          const clasesCarrera = await sequelize.query(
            `SELECT id, ciclo FROM clases WHERE LOWER(carrera) LIKE LOWER(:carrera)`,
            { replacements: { carrera: `%${estRecord.escuela}%` }, type: QueryTypes.SELECT }
          );
          const idsFiltrados = cicloNum
            ? clasesCarrera.filter(c => normalizarCiclo(c.ciclo) === cicloNum).map(c => c.id)
            : clasesCarrera.map(c => c.id);

          if (idsFiltrados.length > 0) {
            whereClause = 'WHERE c.id IN (:claseIds)';
            replacements.claseIds = idsFiltrados;
            console.log(`📚 Estudiante ${usuario.id}: ciclo ${cicloNum || 'todos'}, ${idsFiltrados.length} clases encontradas en ${estRecord.escuela}`);
          } else {
            whereClause = 'WHERE 1=0';
          }
        } else {
          console.log(`⚠️  Estudiante ${usuario.id} sin datos de escuela/carrera.`);
          whereClause = 'WHERE 1=0';
        }
      }
    }

    // Si hay carrera_id en query, usarlo como filtro adicional (si es admin o similar)
    if (req.query.carrera_id && usuario.rol !== 'estudiante') {
      const prefix = whereClause ? 'AND' : 'WHERE';
      if (!isNaN(req.query.carrera_id)) {
        whereClause += ` ${prefix} c.carrera_id = :carrera_id`;
        replacements.carrera_id = parseInt(req.query.carrera_id);
      }
    }

    const clases = await sequelize.query(`
      SELECT
        c.id, c.materia, c.carrera, c.ciclo, c.paralelo,
        c.dia, c.hora_inicio, c.hora_fin,
        c.num_estudiantes, c.docente, c.aula_asignada,
        a.nombre as aula_nombre, a.capacidad as aula_capacidad, a.edificio
      FROM clases c
      LEFT JOIN aulas a ON a.codigo = c.aula_asignada
      ${whereClause}
      ORDER BY c.dia, c.hora_inicio
    `, {
      replacements,
      type: QueryTypes.SELECT
    });

    // Detectar conflictos en las clases obtenidas
    const conflictos = new Set();
    const clasesConAula = clases.filter(c => c.aula_asignada && c.dia && c.hora_inicio);
    // ... (resto del código de conflictos se mantiene igual)

    for (let i = 0; i < clasesConAula.length; i++) {
      for (let j = i + 1; j < clasesConAula.length; j++) {
        const a = clasesConAula[i];
        const b = clasesConAula[j];

        if (a.aula_asignada === b.aula_asignada && a.dia === b.dia) {
          const inicioA = convertirHora(a.hora_inicio);
          const finA = convertirHora(a.hora_fin);
          const inicioB = convertirHora(b.hora_inicio);
          const finB = convertirHora(b.hora_fin);

          if (inicioA < finB && finA > inicioB) {
            conflictos.add(a.id);
            conflictos.add(b.id);
          }
        }
      }
    }

    const total = clases.length;
    const asignadas = clases.filter(c => c.aula_asignada).length;

    const clasesConEstado = clases.map(c => {
      const numEst = c.num_estudiantes || 0;
      const capAula = c.aula_capacidad || 0;
      const esSobrecupo = c.aula_asignada && capAula > 0 && numEst > capAula;
      const porcentajeUso = capAula > 0 ? Math.round((numEst / capAula) * 100) : null;

      let estado;
      if (!c.aula_asignada) estado = 'pendiente';
      else if (conflictos.has(c.id)) estado = 'conflicto';
      else if (esSobrecupo) estado = 'sobrecupo';
      else estado = 'asignada';

      return {
        ...c,
        materia: fixEncoding(c.materia),
        carrera: fixEncoding(c.carrera),
        docente: fixEncoding(c.docente),
        aula: c.aula_nombre || c.aula_asignada || 'S/A',
        sobrecupo: !!esSobrecupo,
        porcentaje_uso: porcentajeUso,
        estado
      };
    });

    const sobrecupos = clasesConEstado.filter(c => c.sobrecupo).length;

    res.json({
      success: true,
      rol: usuario.rol,
      estadisticas: {
        total_clases: total,
        clases_asignadas: asignadas,
        clases_pendientes: total - asignadas,
        conflictos: conflictos.size,
        sobrecupos,
        porcentaje_completado: total > 0 ? Math.round((asignadas / total) * 100) : 0
      },
      clases: clasesConEstado
    });
  } catch (error) {
    handle500(res, error, 'getMiDistribucion');
  }
};

// ============================================
// REPORTE DE DISTRIBUCIÓN (resumen rápido)
// ============================================
const getReporteDistribucion = async (req, res) => {
  try {
    const carreraId = req.query.carrera_id;
    let whereClause = '';
    const replacements = {};

    if (carreraId) {
      if (!isNaN(carreraId)) {
        whereClause = 'WHERE c.carrera_id = :carrera_id';
        replacements.carrera_id = parseInt(carreraId);
      } else {
        whereClause = 'WHERE c.carrera = :carrera_id';
        replacements.carrera_id = carreraId;
      }
    }

    const clases = await sequelize.query(`
      SELECT
        c.carrera, c.materia, c.dia, c.hora_inicio, c.hora_fin,
        c.num_estudiantes, c.docente, c.aula_asignada,
        a.nombre as aula_nombre, a.capacidad as aula_capacidad
      FROM clases c
      LEFT JOIN aulas a ON a.codigo = c.aula_asignada
      ${whereClause}
      ORDER BY c.carrera, c.dia, c.hora_inicio
    `, {
      replacements,
      type: QueryTypes.SELECT
    });

    const total = clases.length;
    const asignadas = clases.filter(c => c.aula_asignada).length;

    res.json({
      success: true,
      formato: req.query.formato || 'json',
      estadisticas: {
        total_clases: total,
        clases_asignadas: asignadas,
        clases_pendientes: total - asignadas,
        porcentaje_completado: total > 0 ? Math.round((asignadas / total) * 100) : 0
      },
      clases: clases.map(c => ({
        ...c,
        materia: fixEncoding(c.materia),
        carrera: fixEncoding(c.carrera),
        docente: fixEncoding(c.docente)
      }))
    });
  } catch (error) {
    handle500(res, error, 'getReporteDistribucion');
  }
};

// ============================================
// CARGA DOCENTE: Estadísticas por profesor
// ============================================
const getDocentesCarga = async (req, res) => {
  try {
    const carreraId = req.query.carrera_id;
    let whereClause = "WHERE c.docente IS NOT NULL AND TRIM(c.docente) <> ''";
    const replacements = {};

    if (req.usuario.rol === 'director') {
      const carreraIds = req.usuario.carreraIds || [];
      whereClause += carreraIds.length > 0 ? ' AND c.carrera_id IN (:carrera_ids)' : ' AND 1=0';
      replacements.carrera_ids = carreraIds;
    } else if (carreraId) {
      if (!isNaN(carreraId)) {
        whereClause += ' AND c.carrera_id = :carrera_id';
        replacements.carrera_id = parseInt(carreraId);
      } else {
        whereClause += ' AND LOWER(c.carrera) = LOWER(:carrera)';
        replacements.carrera = carreraId;
      }
    }

    // Obtener clases agrupadas por docente
    const carga = await sequelize.query(`
      SELECT
        c.docente,
        COUNT(c.id) as total_clases,
        COUNT(CASE WHEN c.aula_asignada IS NOT NULL AND TRIM(c.aula_asignada) <> '' THEN 1 END) as clases_asignadas,
        COALESCE(
          SUM(
            CASE
              WHEN c.hora_inicio IS NOT NULL AND c.hora_fin IS NOT NULL THEN
                (EXTRACT(HOUR FROM CAST(c.hora_fin AS TIME)) * 60 + EXTRACT(MINUTE FROM CAST(c.hora_fin AS TIME))) -
                (EXTRACT(HOUR FROM CAST(c.hora_inicio AS TIME)) * 60 + EXTRACT(MINUTE FROM CAST(c.hora_inicio AS TIME)))
              ELSE 0
            END
          ) / 60.0,
          0
        ) as horas_totales
      FROM clases c
      ${whereClause}
      GROUP BY c.docente
      ORDER BY c.docente
    `, { replacements, type: QueryTypes.SELECT });

    // Detectar conflictos de horario por docente (mismo profesor, mismo día, horas solapadas)
    const conflictos = await sequelize.query(`
      SELECT
        c1.docente,
        COUNT(*) as num_conflictos
      FROM clases c1
      INNER JOIN clases c2
        ON LOWER(TRIM(c1.docente)) = LOWER(TRIM(c2.docente))
        AND c1.id < c2.id
        AND c1.dia = c2.dia
        AND c1.hora_inicio < c2.hora_fin
        AND c1.hora_fin > c2.hora_inicio
      ${whereClause.replace(/c\./g, 'c1.')}
      GROUP BY c1.docente
    `, { replacements, type: QueryTypes.SELECT });

    const conflictoMap = {};
    for (const c of conflictos) {
      conflictoMap[c.docente?.toLowerCase()?.trim()] = parseInt(c.num_conflictos) || 0;
    }

    const resultado = carga.map(d => ({
      docente: fixEncoding(d.docente),
      total_clases: parseInt(d.total_clases) || 0,
      clases_asignadas: parseInt(d.clases_asignadas) || 0,
      horas_totales: parseFloat(parseFloat(d.horas_totales).toFixed(1)) || 0,
      conflictos: conflictoMap[d.docente?.toLowerCase()?.trim()] || 0
    }));

    res.json({ success: true, docentes: resultado });
  } catch (error) {
    handle500(res, error, 'getDocentesCarga');
  }
};

module.exports = {
  getEstadoDistribucion,
  forzarDistribucion,
  ejecutarDistribucionAutomatica,
  obtenerHorario,
  limpiarDistribucion,
  obtenerMapaCalor,
  getClasesDistribucion,
  updateClase,
  checkDisponibilidad,
  getMiDistribucion,
  getReporteDistribucion,
  getDocentesCarga
};

// ============================================
// DISTRIBUCIÓN SIMULADA (USANDO TABLA CLASES)
// ============================================
const getDistribucionSimulada = async (req, res) => {
  try {
    const carrerasFiltro = (req.query.carreras || '').split(',').map(s => s.trim()).filter(Boolean);

    const aulasDisponibles = await sequelize.query(`
      SELECT id, codigo, nombre, capacidad, edificio, tipo, estado,
             restriccion_carrera, es_prioritaria
      FROM aulas
      WHERE estado = 'disponible'
        AND tipo != 'AUDITORIO'
        AND (restriccion_carrera IS NULL OR restriccion_carrera != 'AUDITORIO_INSTITUCIONAL')
        AND codigo IS NOT NULL
      ORDER BY capacidad DESC
    `, { type: QueryTypes.SELECT });

    const whereCarrera = carrerasFiltro.length > 0 ? `AND c.carrera IN (:carreras)` : '';
    const clases = await sequelize.query(`
      SELECT
        c.id, c.carrera, c.materia, c.ciclo, c.paralelo, c.dia,
        c.hora_inicio, c.hora_fin, c.num_estudiantes, c.docente, c.aula_asignada
      FROM clases c
      WHERE c.dia IS NOT NULL
        AND c.hora_inicio IS NOT NULL
        AND c.materia IS NOT NULL
        ${whereCarrera}
      ORDER BY c.carrera, c.ciclo, c.materia
    `, {
      replacements: { carreras: carrerasFiltro },
      type: QueryTypes.SELECT
    });

    const ocupacion = {};
    for (const aula of aulasDisponibles) {
      ocupacion[aula.codigo] = { Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [] };
    }

    function toMin(hora) {
      if (!hora || typeof hora !== 'string') return 0;
      const [hh, mm] = hora.split(':');
      return (parseInt(hh) || 0) * 60 + (parseInt(mm) || 0);
    }
    function libre(aulaCodigo, dia, inicio, fin) {
      const bloques = ocupacion[aulaCodigo]?.[dia] || [];
      return !bloques.some(b => inicio < b.fin && fin > b.inicio);
    }

    const asignacionesSimuladas = {};
    const conflictos = new Set();

    const clasesOrdenadas = clases.slice().sort((a, b) => (b.num_estudiantes || 0) - (a.num_estudiantes || 0));

    for (const clase of clasesOrdenadas) {
      const dia = clase.dia;
      const inicio = toMin(clase.hora_inicio);
      const fin = toMin(clase.hora_fin || clase.hora_inicio);

      if (clase.aula_asignada) {
        const aulaCodigo = clase.aula_asignada;
        if (ocupacion[aulaCodigo]) {
          const conflictosPrevios = ocupacion[aulaCodigo][dia].some(b => inicio < b.fin && fin > b.inicio);
          if (conflictosPrevios) conflictos.add(clase.id);
          ocupacion[aulaCodigo][dia].push({ inicio, fin, clase_id: clase.id });
        }
        continue;
      }

      const capacidadNecesaria = Math.ceil((clase.num_estudiantes || 0) * 1.1);
      const carreraNorm = (clase.carrera || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Ordenar candidatas: prioritarias para esta carrera primero, luego por menor diferencia de capacidad
      const candidatasOrdenadas = aulasDisponibles
        .filter(a => (a.capacidad || 0) >= capacidadNecesaria && libre(a.codigo, dia, inicio, fin))
        .sort((a, b) => {
          const aPrio = a.es_prioritaria && a.restriccion_carrera &&
            carreraNorm.includes((a.restriccion_carrera || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
          const bPrio = b.es_prioritaria && b.restriccion_carrera &&
            carreraNorm.includes((b.restriccion_carrera || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
          if (aPrio && !bPrio) return -1;
          if (!aPrio && bPrio) return 1;
          return (a.capacidad || 0) - (b.capacidad || 0);
        });
      const candidata = candidatasOrdenadas[0] || null;

      if (candidata) {
        asignacionesSimuladas[clase.id] = candidata.codigo;
        ocupacion[candidata.codigo][dia].push({ inicio, fin, clase_id: clase.id });
      }
    }

    const clasesConEstado = clases.map(c => ({
      ...c,
      materia: fixEncoding(c.materia),
      carrera: fixEncoding(c.carrera),
      docente: fixEncoding(c.docente),
      aula_simulada: asignacionesSimuladas[c.id] || null,
      estado: c.aula_asignada
        ? (conflictos.has(c.id) ? 'conflicto' : 'asignada')
        : (asignacionesSimuladas[c.id] ? 'simulada' : 'pendiente')
    }));

    const totalClases = clasesConEstado.length;
    const asignadasReales = clasesConEstado.filter(c => c.estado === 'asignada').length;
    const simuladas = clasesConEstado.filter(c => c.estado === 'simulada').length;
    const pendientes = totalClases - asignadasReales - simuladas;
    const totalConflictos = clasesConEstado.filter(c => c.estado === 'conflicto').length;

    res.json({
      success: true,
      clases: clasesConEstado,
      estadisticas: {
        total_clases: totalClases,
        asignadas: asignadasReales,
        simuladas,
        pendientes,
        conflictos: totalConflictos,
        porcentaje_completado: totalClases > 0 ? Math.round(((asignadasReales + simuladas) / totalClases) * 100) : 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en distribución simulada:', error);
    res.status(500).json({
      success: false,
      error: 'Error al simular distribución',
      message: error.message
    });
  }
};

module.exports.getDistribucionSimulada = getDistribucionSimulada;

// ============================================
// CUADRO SIMPLE CON DATOS DE LA TABLA CLASES
// (SIN PROCESAMIENTO DE DISTRIBUCIÓN)
// ============================================
const getCuadroClases = async (req, res) => {
  try {
    const limite = parseInt(req.query.limit) || 50;
    const clases = await sequelize.query(`
      SELECT
        id,
        carrera,
        materia,
        ciclo,
        paralelo,
        dia,
        hora_inicio,
        hora_fin,
        num_estudiantes,
        docente,
        aula_sugerida
      FROM clases
      WHERE materia IS NOT NULL AND TRIM(materia) <> ''
      ORDER BY carrera NULLS LAST, materia
      LIMIT :limit
    `, {
      replacements: { limit: limite },
      type: QueryTypes.SELECT
    });
    const mapeadas = clases.map(c => ({
      id: c.id,
      carrera: fixEncoding(c.carrera),
      materia: fixEncoding(c.materia),
      ciclo: fixEncoding(c.ciclo),
      paralelo: fixEncoding(c.paralelo),
      dia: fixEncoding(c.dia),
      hora_inicio: c.hora_inicio,
      hora_fin: c.hora_fin,
      num_estudiantes: c.num_estudiantes,
      docente: fixEncoding(c.docente),
      aula_asignada: c.aula_sugerida || null,
      estado: c.aula_sugerida ? 'asignada' : 'pendiente'
    }));
    res.json({ success: true, clases: mapeadas, total: mapeadas.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener cuadro de clases', message: error.message });
  }
};

const getClaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await sequelize.query(`
      SELECT
        c.id, c.materia, c.ciclo, c.paralelo, c.docente,
        c.dia, c.hora_inicio, c.hora_fin, c.num_estudiantes,
        c.aula_asignada, c.aula_sugerida, c.carrera_id,
        c.docente_id
      FROM clases c
      WHERE c.id = :id
    `, {
      replacements: { id },
      type: sequelize.QueryTypes.SELECT
    });

    const clase = rows[0];

    if (!clase) {
      return res.status(404).json({ success: false, mensaje: 'Clase no encontrada' });
    }

    res.json({ success: true, clase });
  } catch (error) {
    console.error('Error al obtener clase:', error);
    res.status(500).json({ success: false, mensaje: 'Error al obtener clase' });
  }
};

const deleteClase = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const usuario = req.usuario;

    const [clase] = await sequelize.query(
      'SELECT * FROM clases WHERE id = $1',
      { bind: [id], type: QueryTypes.SELECT, transaction }
    );

    if (!clase) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Clase no encontrada' });
    }

    // Seguridad: Si es director, validar que la clase pertenezca a alguna de sus carreras
    if (usuario.rol === 'director' && !(usuario.carreraIds || []).includes(clase.carrera_id)) {
      await transaction.rollback();
      return res.status(403).json({ success: false, error: 'No tienes permiso para eliminar esta clase' });
    }

    // Eliminar de distribución primero
    await sequelize.query('DELETE FROM distribucion WHERE clase_id = $1', {
      bind: [id],
      type: QueryTypes.DELETE,
      transaction
    });

    // Eliminar asociaciones de estudiantes
    await sequelize.query('DELETE FROM estudiantes_materias WHERE clase_id = $1', {
      bind: [id],
      type: QueryTypes.DELETE,
      transaction
    });

    // Eliminar la clase
    await sequelize.query('DELETE FROM clases WHERE id = $1', {
      bind: [id],
      type: QueryTypes.DELETE,
      transaction
    });

    await transaction.commit();
    res.json({ success: true, mensaje: 'Clase eliminada correctamente' });
  } catch (error) {
    await transaction.rollback();
    handle500(res, error, 'deleteClase');
  }
};

const createClase = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      materia_catalogo_id,
      docente_id,
      dia,
      hora_inicio,
      hora_fin,
      paralelo,
      ciclo,
      num_estudiantes = 0
    } = req.body;
    const usuario = req.usuario;

    // 1. Validar materia del catálogo
    const materia = await MateriaCatalogo.findByPk(materia_catalogo_id);
    if (!materia) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Materia no encontrada en el catálogo' });
    }

    // 2. Obtener Carrera
    const carrera = await Carrera.findByPk(materia.carrera_id);
    if (!carrera) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Carrera asociada a la materia no encontrada' });
    }

    // Seguridad: Director solo crea clases en alguna de sus carreras asignadas
    if (usuario.rol === 'director' && !(usuario.carreraIds || []).includes(carrera.id)) {
      await transaction.rollback();
      return res.status(403).json({ success: false, error: 'No tienes permiso para crear clases en esta carrera' });
    }

    // 3. Obtener Docente
    const docente = await Docente.findByPk(docente_id);
    if (!docente) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Docente no encontrado' });
    }

    // 4. Validar conflictos del docente
    const conflicto = await sequelize.query(`
      SELECT id, materia, dia, hora_inicio, hora_fin 
      FROM clases 
      WHERE docente_id = :docente_id 
        AND dia = :dia 
        AND (
          (hora_inicio < :hora_fin AND hora_fin > :hora_inicio)
        )
      LIMIT 1
    `, {
      replacements: { docente_id, dia, hora_inicio, hora_fin },
      type: QueryTypes.SELECT,
      transaction
    });

    if (conflicto.length > 0) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: `Conflicto de horario: El docente ya tiene la clase "${conflicto[0].materia}" en este horario.`
      });
    }

    // 5. Crear la clase
    const nuevaClase = await Clase.create({
      carrera_id: carrera.id,
      carrera: carrera.carrera,
      materia: materia.nombre,
      materia_catalogo_id: materia.id,
      ciclo: ciclo || materia.ciclo?.toString() || '',
      paralelo: paralelo || 'A',
      dia,
      hora_inicio,
      hora_fin,
      docente: docente.nombre,
      docente_id: docente.id,
      num_estudiantes
    }, { transaction });

    await transaction.commit();
    res.status(201).json({
      success: true,
      mensaje: 'Clase manual creada correctamente',
      clase: nuevaClase
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    handle500(res, error, 'createClase');
  }
};

module.exports = {
  getEstadoDistribucion,
  forzarDistribucion,
  ejecutarDistribucionAutomatica,
  obtenerHorario,
  limpiarDistribucion,
  obtenerMapaCalor,
  obtenerMapaCalorDetallado,
  getClasesDistribucion,
  getMiDistribucion,
  getReporteDistribucion,
  getDocentesCarga,
  getDistribucionSimulada,
  getCuadroClases,
  getClaseById,
  updateClase,
  deleteClase,
  createClase,
  checkDisponibilidad
};
