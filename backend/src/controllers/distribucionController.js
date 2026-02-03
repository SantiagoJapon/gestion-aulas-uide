const N8nService = require('../services/n8n.service');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Función centralizada para loggeo de errores 500
 */
const handle500 = (res, error, context) => {
  console.error(`❌ [500] Error en ${context}:`, error);
  res.status(500).json({
    success: false,
    error: `Error en ${context}`,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

// Función para corregir encoding UTF-8 mal codificado
const fixEncoding = (value) => {
  if (!value) return value;
  return value
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã"/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã'/g, 'Ñ')
    .replace(/Â/g, '')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã/g, 'Ü')
    .replace(/Â¿/g, '¿')
    .replace(/Â¡/g, '¡');
};

const getEstadoDistribucion = async (req, res) => {
  try {
    // Obtener estadísticas de distribución desde la base de datos
    const stats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clases,
        COUNT(DISTINCT d.clase_id) as clases_asignadas,
        COUNT(DISTINCT c.carrera) as total_carreras
      FROM clases c
      LEFT JOIN distribucion d ON d.clase_id = c.id
    `, { type: QueryTypes.SELECT });

    const statsRow = stats[0] || { total_clases: 0, clases_asignadas: 0, total_carreras: 0 };
    const clases_pendientes = (parseInt(statsRow.total_clases) || 0) - (parseInt(statsRow.clases_asignadas) || 0);

    // Obtener carreras con su estado
    const carreras = await sequelize.query(`
      SELECT 
        ca.id,
        ca.carrera as nombre_carrera,
        'activa' as estado,
        COUNT(DISTINCT c.id) as total_clases,
        COUNT(DISTINCT d.clase_id) as clases_asignadas,
        u.nombre as director_nombre,
        u.email as director_email
      FROM uploads_carreras ca
      LEFT JOIN clases c ON c.carrera_id = ca.id
      LEFT JOIN distribucion d ON d.clase_id = c.id
      LEFT JOIN usuarios u ON u.carrera_director = ca.carrera AND u.rol = 'director'
      GROUP BY ca.id, ca.carrera, u.nombre, u.email
      ORDER BY ca.carrera
    `, { type: QueryTypes.SELECT });

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

const forzarDistribucion = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || null;
    const data = await N8nService.forzarDistribucion(authHeader);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al forzar distribución',
      message: error.message
    });
  }
};

// ============================================
// EJECUTAR DISTRIBUCIÓN AUTOMÁTICA
// ============================================
const distribucionService = require('../services/distribucion.service');

const ejecutarDistribucionAutomatica = async (req, res) => {
  try {
    console.log('🎯 Admin solicitó distribución automática');

    const resultado = await distribucionService.ejecutarDistribucion();

    res.json(resultado);
  } catch (error) {
    console.error('Error al ejecutar distribución:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al ejecutar la distribución automática',
      error: error.message
    });
  }
};

// ============================================
// OBTENER HORARIO
// ============================================
const obtenerHorario = async (req, res) => {
  try {
    const usuario = req.usuario;
    let carreraId = req.query.carrera_id;

    // Si es director, solo puede ver su carrera
    if (usuario.rol === 'director' && usuario.carrera_director) {
      carreraId = usuario.carrera_director;
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

    if (usuario.rol === 'director' && usuario.carrera_director) {
      carreraId = usuario.carrera_director;
    }

    let whereClause = '';
    if (carreraId) {
      if (!isNaN(carreraId)) {
        whereClause = 'AND c.carrera_id = :carrera_id';
      } else {
        whereClause = 'AND c.carrera = :carrera_id';
      }
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
      replacements: { carrera_id: carreraId },
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
          ocupacion[clase.dia][h].clases.push({
            materia: clase.materia,
            aula: clase.aula_asignada,
            docente: clase.docente || 'Sin asignar',
            estudiantes: clase.num_estudiantes || 0,
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

    // Detectar conflictos: misma aula, mismo día, horarios solapados
    const conflictos = new Set();
    const clasesConAula = clases.filter(c => c.aula_asignada);

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

    // Agregar estado a cada clase
    const clasesConEstado = clases.map(c => ({
      ...c,
      materia: fixEncoding(c.materia),
      carrera: fixEncoding(c.carrera),
      docente: fixEncoding(c.docente),
      estado: !c.aula_asignada ? 'pendiente' : conflictos.has(c.id) ? 'conflicto' : 'asignada'
    }));

    const totalClases = clases.length;
    const asignadas = clases.filter(c => c.aula_asignada).length;
    const pendientes = totalClases - asignadas;
    const totalConflictos = conflictos.size;

    res.json({
      success: true,
      clases: clasesConEstado,
      estadisticas: {
        total_clases: totalClases,
        asignadas,
        pendientes,
        conflictos: totalConflictos,
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

function convertirHora(hora) {
  if (!hora || typeof hora !== 'string') return 0;
  const partes = hora.split(':');
  return (parseInt(partes[0]) || 0) * 60 + (parseInt(partes[1]) || 0);
}

module.exports = {
  getEstadoDistribucion,
  forzarDistribucion,
  ejecutarDistribucionAutomatica,
  obtenerHorario,
  limpiarDistribucion,
  obtenerMapaCalor,
  getClasesDistribucion
};

// ============================================
// DISTRIBUCIÓN SIMULADA (USANDO TABLA CLASES)
// ============================================
const getDistribucionSimulada = async (req, res) => {
  try {
    const carrerasFiltro = (req.query.carreras || '').split(',').map(s => s.trim()).filter(Boolean);

    const aulasDisponibles = await sequelize.query(`
      SELECT id, codigo, nombre, capacidad, edificio, tipo, estado
      FROM aulas
      WHERE estado = 'disponible' AND codigo IS NOT NULL
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
      const candidata = aulasDisponibles.find(a => (a.capacidad || 0) >= capacidadNecesaria && libre(a.codigo, dia, inicio, fin));

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

module.exports.getCuadroClases = getCuadroClases;
