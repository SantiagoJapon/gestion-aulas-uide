const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const distribucionService = require('../services/distribucion.service');
const N8nService = require('../services/n8n.service');

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

const { fixEncoding } = require('../utils/encoding');

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
    }

    // Obtener estadísticas de distribución
    const stats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clases,
        COUNT(DISTINCT d.clase_id) as clases_asignadas,
        COUNT(DISTINCT c.carrera) as total_carreras
      FROM clases c
      LEFT JOIN distribucion d ON d.clase_id = c.id
      ${whereClauseTotal}
    `, {
      replacements,
      type: QueryTypes.SELECT
    });

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
      ${whereClauseCarreras}
      GROUP BY ca.id, ca.carrera, u.nombre, u.email
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
 * Ejecutar distribución via n8n (con fallback al algoritmo local)
 * Usado por ambos endpoints: /ejecutar y /forzar
 */
const ejecutarDistribucionViaN8n = async (req, res) => {
  try {
    console.log('🎯 Solicitada distribución de aulas...');

    // Intentar via n8n primero
    try {
      console.log('📤 Enviando a n8n...');
      const resultado = await N8nService.ejecutarDistribucion();
      console.log('✅ Distribución completada via n8n');
      return res.json(resultado);
    } catch (n8nError) {
      console.warn('⚠️ n8n no disponible, usando algoritmo local:', n8nError.message);
    }

    // Fallback: algoritmo local del backend
    const carreraId = req.query.carrera_id || req.body.carrera_id;
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
const forzarDistribucion = ejecutarDistribucionViaN8n;
const ejecutarDistribucionAutomatica = ejecutarDistribucionViaN8n;

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
      SELECT COUNT(*) as total FROM aulas WHERE estado = 'DISPONIBLE'
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

const updateClase = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { materia, dia, hora_inicio, hora_fin, aula_asignada, docente, num_estudiantes } = req.body;
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

    // Seguridad: Si es director, validar que la clase sea de su carrera
    if (usuario.rol === 'director' && clase.carrera !== usuario.carrera_director) {
      await transaction.rollback();
      return res.status(403).json({ success: false, error: 'No tienes permiso para modificar esta clase' });
    }

    // Actualizar la clase
    await sequelize.query(`
      UPDATE clases 
      SET materia = $1, dia = $2, hora_inicio = $3, hora_fin = $4, 
          aula_asignada = $5, docente = $6, num_estudiantes = $7
      WHERE id = $8
    `, {
      bind: [materia, dia, hora_inicio, hora_fin, aula_asignada, docente, num_estudiantes, id],
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
        await sequelize.query(`
          INSERT INTO distribucion (clase_id, aula_id, dia, hora_inicio, hora_fin)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (clase_id) DO UPDATE
          SET aula_id = EXCLUDED.aula_id,
              dia = EXCLUDED.dia,
              hora_inicio = EXCLUDED.hora_inicio,
              hora_fin = EXCLUDED.hora_fin
        `, {
          bind: [id, aulaRow.id, dia, hora_inicio, hora_fin],
          type: QueryTypes.INSERT,
          transaction
        });
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
      WHERE a.estado = 'DISPONIBLE'
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
      // Buscar clases del docente por nombre
      const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
      if (nombreCompleto) {
        whereClause = 'WHERE LOWER(c.docente) LIKE LOWER(:docente)';
        replacements.docente = `%${nombreCompleto}%`;
      }
    } else if (usuario.rol === 'director' && usuario.carrera_director) {
      whereClause = 'WHERE c.carrera = :carrera';
      replacements.carrera = usuario.carrera_director;
    }

    // Si hay carrera_id en query, usarlo como filtro adicional
    if (req.query.carrera_id) {
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

    res.json({
      success: true,
      rol: usuario.rol,
      estadisticas: {
        total_clases: total,
        clases_asignadas: asignadas,
        clases_pendientes: total - asignadas,
        conflictos: conflictos.size,
        porcentaje_completado: total > 0 ? Math.round((asignadas / total) * 100) : 0
      },
      clases: clases.map(c => ({
        ...c,
        materia: fixEncoding(c.materia),
        carrera: fixEncoding(c.carrera),
        docente: fixEncoding(c.docente),
        estado: !c.aula_asignada ? 'pendiente' : conflictos.has(c.id) ? 'conflicto' : 'asignada'
      }))
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

    if (req.usuario.rol === 'director' && req.usuario.carrera_director) {
      whereClause += ' AND LOWER(c.carrera) = LOWER(:carrera)';
      replacements.carrera = req.usuario.carrera_director;
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
      SELECT id, codigo, nombre, capacidad, edificio, tipo, estado
      FROM aulas
      WHERE estado = 'DISPONIBLE' AND codigo IS NOT NULL
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
