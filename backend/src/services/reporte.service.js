const { Clase, Aula, Distribucion, Carrera, Espacio, sequelize, User } = require('../models');
const { Op, QueryTypes } = require('sequelize');
const PdfPrinter = require('pdfmake/js/Printer').default;
const fs = require('fs');
const path = require('path');

class ReporteService {
    /**
     * Genera las métricas necesarias para el reporte ejecutivo
     * @param {Object} filtros - Filtros aplicables (carrera_id, etc.)
     */
    async obtenerMetricas(filtros = {}) {
        try {
            const { carrera_id } = filtros;
            let whereClase = {};
            const carreraFilter = carrera_id ? 'AND c.carrera_id = :carrera_id' : '';
            const carreraFilterSimple = carrera_id ? 'AND carrera_id = :carrera_id' : '';
            const replacements = carrera_id ? { carrera_id } : {};

            if (carrera_id) {
                whereClase.carrera_id = carrera_id;
            }

            // 1. Resumen General
            const totalClases = await Clase.count({ where: whereClase });
            const clasesAsignadas = await Clase.count({
                where: { ...whereClase, aula_asignada: { [Op.not]: null } }
            });
            const huerfanosCount = totalClases - clasesAsignadas;
            const porcentajeExito = totalClases > 0 ? (clasesAsignadas / totalClases) * 100 : 0;

            // 2. Eficiencia de Capacidad
            const [eficienciaResult] = await sequelize.query(`
                SELECT AVG(CAST(c.num_estudiantes AS FLOAT) / CAST(NULLIF(a.capacidad, 0) AS FLOAT)) * 100 as eficiencia_promedio
                FROM clases c
                JOIN aulas a ON a.codigo = c.aula_asignada
                WHERE c.aula_asignada IS NOT NULL
                ${carreraFilter}
            `, { replacements, type: QueryTypes.SELECT });

            // 3. Indicadores de Calidad de Datos (health)
            const [healthResult] = await sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE dia IS NULL OR TRIM(dia) = '') as sin_horario,
                    COUNT(*) FILTER (WHERE num_estudiantes = 0 OR num_estudiantes IS NULL) as sin_estudiantes,
                    COUNT(*) FILTER (WHERE docente IS NULL OR TRIM(docente) = '') as sin_docente,
                    COUNT(*) FILTER (WHERE ciclo IS NULL OR TRIM(ciclo) = '') as sin_ciclo,
                    COUNT(*) FILTER (WHERE paralelo IS NULL OR TRIM(paralelo) = '') as sin_paralelo
                FROM clases
                WHERE 1=1 ${carreraFilterSimple}
            `, { replacements, type: QueryTypes.SELECT });

            // 4. Uso por Edificio
            const usoEdificios = await sequelize.query(`
                SELECT
                    a.edificio,
                    COUNT(c.id) as total_clases,
                    COUNT(DISTINCT a.id) as total_aulas_usadas,
                    AVG(CAST(c.num_estudiantes AS FLOAT) / NULLIF(a.capacidad, 0)) * 100 as eficiencia_promedio
                FROM clases c
                JOIN aulas a ON a.codigo = c.aula_asignada
                WHERE c.aula_asignada IS NOT NULL
                ${carreraFilter}
                GROUP BY a.edificio
                ORDER BY total_clases DESC
            `, { replacements, type: QueryTypes.SELECT });

            // 5. Top 10 Aulas más usadas
            const topAulas = await sequelize.query(`
                SELECT
                    a.nombre,
                    a.codigo,
                    a.edificio,
                    a.capacidad,
                    COUNT(c.id) as total_clases,
                    AVG(CAST(c.num_estudiantes AS FLOAT) / NULLIF(a.capacidad, 0)) * 100 as eficiencia
                FROM clases c
                JOIN aulas a ON a.codigo = c.aula_asignada
                WHERE c.aula_asignada IS NOT NULL
                ${carreraFilter}
                GROUP BY a.id, a.nombre, a.codigo, a.edificio, a.capacidad
                ORDER BY total_clases DESC
                LIMIT 10
            `, { replacements, type: QueryTypes.SELECT });

            // 6. Distribución por Carrera (solo reporte general)
            let distribucionCarrera = [];
            if (!carrera_id) {
                distribucionCarrera = await sequelize.query(`
                    SELECT
                        carrera,
                        COUNT(id) as total_clases,
                        COUNT(CASE WHEN aula_asignada IS NOT NULL THEN 1 END) as asignadas,
                        ROUND(COUNT(CASE WHEN aula_asignada IS NOT NULL THEN 1 END)::float / NULLIF(COUNT(id), 0) * 100, 1) as porcentaje
                    FROM clases
                    GROUP BY carrera
                    ORDER BY total_clases DESC
                `, { type: QueryTypes.SELECT });
            }

            // 7. Huérfanos Detalle (con todos los campos relevantes)
            const huerfanosDetalle = await Clase.findAll({
                where: { ...whereClase, aula_asignada: null },
                limit: 15,
                attributes: ['materia', 'carrera', 'docente', 'ciclo', 'paralelo', 'num_estudiantes', 'dia', 'hora_inicio', 'hora_fin']
            });

            // 8. Conflictos de Horario por Aula
            const conflictosAula = await sequelize.query(`
                SELECT
                    c1.aula_asignada as aula,
                    c1.dia,
                    c1.materia as materia1,
                    c1.docente as docente1,
                    c1.hora_inicio as inicio1,
                    c1.hora_fin as fin1,
                    c2.materia as materia2,
                    c2.docente as docente2,
                    c2.hora_inicio as inicio2,
                    c2.hora_fin as fin2
                FROM clases c1
                INNER JOIN clases c2
                    ON c1.aula_asignada = c2.aula_asignada
                    AND c1.dia = c2.dia
                    AND c1.id < c2.id
                    AND c1.hora_inicio < c2.hora_fin
                    AND c1.hora_fin > c2.hora_inicio
                WHERE c1.aula_asignada IS NOT NULL
                ${carreraFilter}
                ORDER BY c1.aula_asignada, c1.dia
                LIMIT 15
            `, { replacements, type: QueryTypes.SELECT });

            // 9. Sobrecupos
            const sobrecupos = await sequelize.query(`
                SELECT
                    c.materia,
                    c.carrera,
                    c.docente,
                    c.ciclo,
                    c.paralelo,
                    c.num_estudiantes,
                    a.nombre as aula_nombre,
                    a.capacidad,
                    ROUND((c.num_estudiantes::float / NULLIF(a.capacidad, 0)) * 100, 1) as porcentaje_uso
                FROM clases c
                JOIN aulas a ON a.codigo = c.aula_asignada
                WHERE c.aula_asignada IS NOT NULL
                    AND a.capacidad > 0
                    AND c.num_estudiantes > a.capacidad
                ${carreraFilter}
                ORDER BY porcentaje_uso DESC
                LIMIT 15
            `, { replacements, type: QueryTypes.SELECT });

            // 10. Carga Horaria por Docente (con conflictos)
            let cargaDocentes = [];
            try {
                cargaDocentes = await sequelize.query(`
                    SELECT
                        d.docente,
                        COUNT(d.id) as total_clases,
                        COUNT(CASE WHEN d.aula_asignada IS NOT NULL THEN 1 END) as clases_asignadas,
                        SUM(
                            (EXTRACT(HOUR FROM CAST(d.hora_fin AS TIME)) * 60 + EXTRACT(MINUTE FROM CAST(d.hora_fin AS TIME))) -
                            (EXTRACT(HOUR FROM CAST(d.hora_inicio AS TIME)) * 60 + EXTRACT(MINUTE FROM CAST(d.hora_inicio AS TIME)))
                        ) / 60.0 as horas_totales,
                        COALESCE((
                            SELECT COUNT(*)
                            FROM clases c1
                            INNER JOIN clases c2
                                ON LOWER(c1.docente) = LOWER(c2.docente)
                                AND c1.dia = c2.dia
                                AND c1.id < c2.id
                                AND c1.hora_inicio < c2.hora_fin
                                AND c1.hora_fin > c2.hora_inicio
                            WHERE LOWER(c1.docente) = LOWER(d.docente)
                        ), 0) as conflictos
                    FROM clases d
                    WHERE d.docente IS NOT NULL AND TRIM(d.docente) <> ''
                        AND d.hora_inicio IS NOT NULL AND TRIM(d.hora_inicio) <> ''
                        AND d.hora_fin IS NOT NULL AND TRIM(d.hora_fin) <> ''
                        AND d.hora_inicio ~ '^[0-9]{1,2}:[0-9]{2}'
                        AND d.hora_fin ~ '^[0-9]{1,2}:[0-9]{2}'
                    ${carreraFilterSimple}
                    GROUP BY d.docente
                    ORDER BY horas_totales DESC
                    LIMIT 15
                `, { replacements, type: QueryTypes.SELECT });
            } catch (e) {
                console.warn('Error al calcular carga docente:', e.message);
            }

            // 11. Estadísticas de Espacios Especiales
            let statsEspacios = [];
            try {
                statsEspacios = await Espacio.findAll({
                    attributes: [
                        'tipo',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
                        [sequelize.fn('SUM', sequelize.col('capacidad')), 'capacidad_total'],
                        [sequelize.literal("COUNT(CASE WHEN estado = 'disponible' THEN 1 END)"), 'disponibles']
                    ],
                    group: ['tipo'],
                    raw: true
                });
            } catch (e) {
                console.warn('Tabla espacios no disponible:', e.message);
            }

            // 12. Estadísticas de Reservas por Espacio
            let statsReservas = [];
            try {
                statsReservas = await sequelize.query(`
                    SELECT
                        tipo_espacio,
                        COUNT(*) as total,
                        SUM(CASE WHEN es_grupal THEN 1 ELSE 0 END) as grupales,
                        SUM(CASE WHEN NOT es_grupal THEN 1 ELSE 0 END) as individuales,
                        AVG(num_personas) as promedio_personas,
                        COUNT(CASE WHEN estado = 'activa' THEN 1 END) as activas,
                        COUNT(CASE WHEN estado = 'finalizada' THEN 1 END) as finalizadas
                    FROM reservas
                    WHERE estado IN ('activa', 'finalizada')
                    GROUP BY tipo_espacio
                    ORDER BY total DESC
                    LIMIT 10
                `, { type: QueryTypes.SELECT });
            } catch (e) {
                console.warn('Error al obtener estadísticas de reservas:', e.message);
            }

            // 13. Reservas por día de la semana
            let reservasPorDia = [];
            try {
                reservasPorDia = await sequelize.query(`
                    SELECT
                        TO_CHAR(fecha_inicio, 'Day') as dia_semana,
                        EXTRACT(DOW FROM fecha_inicio) as num_dia,
                        COUNT(*) as total
                    FROM reservas
                    WHERE estado IN ('activa', 'finalizada')
                    GROUP BY dia_semana, num_dia
                    ORDER BY num_dia
                `, { type: QueryTypes.SELECT });
            } catch (e) {
                console.warn('No se pudieron cargar reservas por día:', e.message);
            }

            return {
                resumen: {
                    total_clases: totalClases,
                    clases_asignadas: clasesAsignadas,
                    huerfanos: huerfanosCount,
                    porcentaje_exito: parseFloat(porcentajeExito.toFixed(2)),
                    eficiencia_capacidad: parseFloat((eficienciaResult?.eficiencia_promedio || 0).toFixed(2))
                },
                health: {
                    sin_horario: parseInt(healthResult?.sin_horario || 0),
                    sin_estudiantes: parseInt(healthResult?.sin_estudiantes || 0),
                    sin_docente: parseInt(healthResult?.sin_docente || 0),
                    sin_ciclo: parseInt(healthResult?.sin_ciclo || 0),
                    sin_paralelo: parseInt(healthResult?.sin_paralelo || 0)
                },
                uso_edificios: usoEdificios,
                top_aulas: topAulas,
                distribucion_carrera: distribucionCarrera,
                huerfanos_detalle: huerfanosDetalle,
                conflictos_aula: conflictosAula,
                sobrecupos,
                carga_docentes: cargaDocentes,
                stats_espacios: statsEspacios,
                stats_reservas: statsReservas,
                reservas_por_dia: reservasPorDia,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error al calcular métricas de reporte:', error);
            throw error;
        }
    }

    /**
     * Genera un archivo PDF con el diseño ejecutivo
     */
    async generarPDF(metricas, info = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const fonts = {
                    Roboto: {
                        normal: path.join(__dirname, '../assets/fonts/Roboto/Roboto-Regular.ttf'),
                        bold: path.join(__dirname, '../assets/fonts/Roboto/Roboto-Medium.ttf'),
                        italics: path.join(__dirname, '../assets/fonts/Roboto/Roboto-Italic.ttf'),
                        bolditalics: path.join(__dirname, '../assets/fonts/Roboto/Roboto-MediumItalic.ttf')
                    }
                };

                const printer = new PdfPrinter(fonts);
                const colorPrimario = '#8b004c';
                const colorRojo = '#b91c1c';
                const colorVerde = '#15803d';
                const colorAmbar = '#b45309';

                // ── helpers ──────────────────────────────────────────────
                const badge = (texto, color) => ({
                    text: texto,
                    fontSize: 8,
                    bold: true,
                    color: '#fff',
                    fillColor: color,
                    margin: [2, 1, 2, 1]
                });

                const sectionTitle = (num, texto, color = colorPrimario) => ({
                    text: `${num}. ${texto.toUpperCase()}`,
                    fontSize: 13,
                    bold: true,
                    color,
                    margin: [0, 18, 0, 8]
                });

                const emptyRow = (cols, texto) => [{
                    text: texto,
                    colSpan: cols,
                    alignment: 'center',
                    fontSize: 9,
                    italic: true,
                    color: '#888',
                    margin: [0, 4, 0, 4]
                }, ...Array(cols - 1).fill({})];

                // ── salud de datos ────────────────────────────────────────
                const h = metricas.health || {};
                const totalProblemas = (h.sin_horario || 0) + (h.sin_docente || 0) + (h.sin_estudiantes || 0);
                const estadoSalud = totalProblemas === 0 ? 'ÓPTIMO' : totalProblemas < 5 ? 'REGULAR' : 'CRÍTICO';
                const colorSalud = totalProblemas === 0 ? colorVerde : totalProblemas < 5 ? colorAmbar : colorRojo;

                const content = [
                    // PORTADA
                    { text: info.nombre || 'REPORTE EJECUTIVO DE GESTIÓN DE ESPACIOS', fontSize: 20, bold: true, margin: [0, 0, 0, 6] },
                    {
                        text: [
                            { text: 'Fecha de generación: ', bold: true },
                            { text: new Date().toLocaleString('es-EC') },
                            { text: '\nGenerado por: ', bold: true },
                            { text: info.usuario || 'Sistema' }
                        ],
                        fontSize: 10,
                        margin: [0, 0, 0, 20],
                        color: '#444'
                    },

                    // ── SECCIÓN 1: RESUMEN EJECUTIVO ──────────────────────
                    sectionTitle(1, 'Resumen Ejecutivo'),
                    {
                        table: {
                            widths: ['*', '*', '*', '*'],
                            body: [
                                [
                                    { text: 'Total Clases', style: 'tableHeader' },
                                    { text: 'Asignadas', style: 'tableHeader' },
                                    { text: '% Éxito', style: 'tableHeader' },
                                    { text: 'Eficiencia Cap.', style: 'tableHeader' }
                                ],
                                [
                                    { text: metricas.resumen.total_clases.toString(), style: 'tableCell' },
                                    { text: metricas.resumen.clases_asignadas.toString(), style: 'tableCell' },
                                    { text: `${metricas.resumen.porcentaje_exito}%`, style: 'tableCell' },
                                    { text: `${metricas.resumen.eficiencia_capacidad}%`, style: 'tableCell' }
                                ]
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 10]
                    },

                    // Indicadores de Calidad de Datos
                    {
                        table: {
                            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'Estado General de Datos', style: 'tableHeader' },
                                    { text: 'Sin Horario', style: 'tableHeader' },
                                    { text: 'Sin Docente', style: 'tableHeader' },
                                    { text: 'Sin Estudiantes', style: 'tableHeader' },
                                    { text: 'Sin Ciclo', style: 'tableHeader' },
                                    { text: 'Sin Paralelo', style: 'tableHeader' }
                                ],
                                [
                                    badge(estadoSalud, colorSalud),
                                    { text: (h.sin_horario || 0).toString(), style: 'tableCell', color: h.sin_horario > 0 ? colorRojo : colorVerde, bold: true },
                                    { text: (h.sin_docente || 0).toString(), style: 'tableCell', color: h.sin_docente > 0 ? colorAmbar : colorVerde, bold: true },
                                    { text: (h.sin_estudiantes || 0).toString(), style: 'tableCell', color: h.sin_estudiantes > 0 ? colorAmbar : colorVerde, bold: true },
                                    { text: (h.sin_ciclo || 0).toString(), style: 'tableCell' },
                                    { text: (h.sin_paralelo || 0).toString(), style: 'tableCell' }
                                ]
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 20]
                    },

                    // ── SECCIÓN 2: ANÁLISIS POR EDIFICIO ─────────────────
                    sectionTitle(2, 'Análisis por Edificio'),
                    {
                        table: {
                            widths: ['*', 'auto', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'Edificio / Bloque', style: 'tableHeader' },
                                    { text: 'Clases Asignadas', style: 'tableHeader' },
                                    { text: 'Aulas Usadas', style: 'tableHeader' },
                                    { text: 'Eficiencia', style: 'tableHeader' }
                                ],
                                ...(metricas.uso_edificios.length > 0
                                    ? metricas.uso_edificios.map(ed => [
                                        { text: ed.edificio || 'General', style: 'tableCell' },
                                        { text: ed.total_clases.toString(), style: 'tableCell' },
                                        { text: ed.total_aulas_usadas.toString(), style: 'tableCell' },
                                        { text: `${parseFloat(ed.eficiencia_promedio || 0).toFixed(1)}%`, style: 'tableCell' }
                                    ])
                                    : [emptyRow(4, 'Sin datos de edificios')]
                                )
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 20]
                    },

                    // ── SECCIÓN 3: AULAS MÁS UTILIZADAS ──────────────────
                    sectionTitle(3, 'Aulas Más Utilizadas'),
                    {
                        text: 'Ranking de los espacios con mayor demanda. La eficiencia mide el promedio de ocupación (estudiantes vs. capacidad).',
                        fontSize: 10,
                        color: '#555',
                        margin: [0, 0, 0, 6]
                    },
                    {
                        table: {
                            widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
                            body: [
                                [
                                    { text: '#', style: 'tableHeader' },
                                    { text: 'Aula', style: 'tableHeader' },
                                    { text: 'Código', style: 'tableHeader' },
                                    { text: 'Edificio', style: 'tableHeader' },
                                    { text: 'Capacidad', style: 'tableHeader' },
                                    { text: 'Clases / Efic.', style: 'tableHeader' }
                                ],
                                ...(metricas.top_aulas.length > 0
                                    ? metricas.top_aulas.map((a, i) => [
                                        { text: `${i + 1}`, style: 'tableCell', bold: i < 3 },
                                        { text: a.nombre, style: 'tableCell', bold: i < 3 },
                                        { text: a.codigo, style: 'tableCell' },
                                        { text: a.edificio || '-', style: 'tableCell' },
                                        { text: a.capacidad?.toString() || '-', style: 'tableCell' },
                                        { text: `${a.total_clases}  (${parseFloat(a.eficiencia || 0).toFixed(1)}%)`, style: 'tableCell' }
                                    ])
                                    : [emptyRow(6, 'Sin datos de uso de aulas')]
                                )
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 20]
                    },

                    // ── SECCIÓN 4: CLASES SIN ASIGNACIÓN (CRÍTICO) ────────
                    sectionTitle(4, 'Clases sin Asignación de Aula', metricas.resumen.huerfanos > 0 ? colorRojo : colorVerde),
                    {
                        text: metricas.resumen.huerfanos > 0
                            ? `Se detectaron ${metricas.resumen.huerfanos} clases sin aula asignada. Requieren revisión manual.`
                            : 'Todas las clases tienen aula asignada. Sin conflictos de asignación.',
                        fontSize: 10,
                        color: metricas.resumen.huerfanos > 0 ? colorRojo : colorVerde,
                        bold: true,
                        margin: [0, 0, 0, 6]
                    },
                    metricas.huerfanos_detalle.length > 0 ? {
                        table: {
                            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'Materia', style: 'tableHeader' },
                                    { text: 'Carrera', style: 'tableHeader' },
                                    { text: 'Docente', style: 'tableHeader' },
                                    { text: 'Ciclo / Par.', style: 'tableHeader' },
                                    { text: 'Est.', style: 'tableHeader' },
                                    { text: 'Día / Hora', style: 'tableHeader' }
                                ],
                                ...metricas.huerfanos_detalle.map(h => [
                                    { text: h.materia || '-', fontSize: 8 },
                                    { text: h.carrera || '-', fontSize: 8 },
                                    { text: h.docente || 'Sin asignar', fontSize: 8, italics: !h.docente },
                                    { text: `${h.ciclo || '-'} / ${h.paralelo || '-'}`, fontSize: 8 },
                                    { text: (h.num_estudiantes || 0).toString(), fontSize: 8 },
                                    { text: `${h.dia || '-'} ${h.hora_inicio || ''}`, fontSize: 8 }
                                ])
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 20]
                    } : { text: '', margin: [0, 0, 0, 20] },

                    // ── SECCIÓN 5: CONFLICTOS DE HORARIO ─────────────────
                    sectionTitle(5, 'Conflictos de Horario Detectados', metricas.conflictos_aula.length > 0 ? colorRojo : colorVerde),
                    {
                        text: metricas.conflictos_aula.length > 0
                            ? `⚠ ${metricas.conflictos_aula.length} solapamientos detectados: dos o más clases asignadas al mismo aula en el mismo horario.`
                            : '✓ No se detectaron conflictos de horario en aulas.',
                        fontSize: 10,
                        color: metricas.conflictos_aula.length > 0 ? colorRojo : colorVerde,
                        bold: true,
                        margin: [0, 0, 0, 6]
                    },
                    metricas.conflictos_aula.length > 0 ? {
                        table: {
                            widths: ['auto', 'auto', '*', 'auto', '*', 'auto'],
                            body: [
                                [
                                    { text: 'Aula', style: 'tableHeader' },
                                    { text: 'Día', style: 'tableHeader' },
                                    { text: 'Clase 1', style: 'tableHeader' },
                                    { text: 'Horario 1', style: 'tableHeader' },
                                    { text: 'Clase 2', style: 'tableHeader' },
                                    { text: 'Horario 2', style: 'tableHeader' }
                                ],
                                ...metricas.conflictos_aula.map(c => [
                                    { text: c.aula, fontSize: 8, bold: true, color: colorRojo },
                                    { text: c.dia, fontSize: 8 },
                                    { text: c.materia1 + (c.docente1 ? `\n${c.docente1}` : ''), fontSize: 8 },
                                    { text: `${c.inicio1}–${c.fin1}`, fontSize: 8 },
                                    { text: c.materia2 + (c.docente2 ? `\n${c.docente2}` : ''), fontSize: 8 },
                                    { text: `${c.inicio2}–${c.fin2}`, fontSize: 8 }
                                ])
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 20]
                    } : { text: '', margin: [0, 0, 0, 20] },

                    // ── SECCIÓN 6: SOBRECUPOS ─────────────────────────────
                    sectionTitle(6, 'Aulas con Sobrecupo', metricas.sobrecupos.length > 0 ? colorAmbar : colorVerde),
                    {
                        text: metricas.sobrecupos.length > 0
                            ? `${metricas.sobrecupos.length} clases superan la capacidad del aula asignada.`
                            : '✓ No se detectaron sobrecupos de capacidad.',
                        fontSize: 10,
                        color: metricas.sobrecupos.length > 0 ? colorAmbar : colorVerde,
                        bold: true,
                        margin: [0, 0, 0, 6]
                    },
                    metricas.sobrecupos.length > 0 ? {
                        table: {
                            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'Materia', style: 'tableHeader' },
                                    { text: 'Docente', style: 'tableHeader' },
                                    { text: 'Ciclo / Par.', style: 'tableHeader' },
                                    { text: 'Aula', style: 'tableHeader' },
                                    { text: 'Cap.', style: 'tableHeader' },
                                    { text: 'Est. / %', style: 'tableHeader' }
                                ],
                                ...metricas.sobrecupos.map(s => [
                                    { text: s.materia, fontSize: 8 },
                                    { text: s.docente || '-', fontSize: 8 },
                                    { text: `${s.ciclo || '-'} / ${s.paralelo || '-'}`, fontSize: 8 },
                                    { text: s.aula_nombre, fontSize: 8 },
                                    { text: s.capacidad?.toString() || '-', fontSize: 8 },
                                    { text: `${s.num_estudiantes}  (${s.porcentaje_uso}%)`, fontSize: 8, color: colorRojo, bold: true }
                                ])
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 20]
                    } : { text: '', margin: [0, 0, 0, 20] },

                    // ── SECCIÓN 7: CARGA HORARIA DOCENTE ──────────────────
                    sectionTitle(7, 'Cumplimiento de Carga Horaria Docente'),
                    {
                        table: {
                            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'Docente', style: 'tableHeader' },
                                    { text: 'Total Clases', style: 'tableHeader' },
                                    { text: 'Asignadas', style: 'tableHeader' },
                                    { text: 'Horas Totales', style: 'tableHeader' },
                                    { text: 'Conflictos', style: 'tableHeader' }
                                ],
                                ...(metricas.carga_docentes.length > 0
                                    ? metricas.carga_docentes.map(cd => [
                                        { text: cd.docente, style: 'tableCell' },
                                        { text: cd.total_clases.toString(), style: 'tableCell' },
                                        { text: cd.clases_asignadas.toString(), style: 'tableCell' },
                                        { text: `${parseFloat(cd.horas_totales).toFixed(1)} hrs`, style: 'tableCell' },
                                        {
                                            text: cd.conflictos > 0 ? `⚠ ${cd.conflictos}` : '✓ 0',
                                            style: 'tableCell',
                                            color: cd.conflictos > 0 ? colorRojo : colorVerde,
                                            bold: cd.conflictos > 0
                                        }
                                    ])
                                    : [emptyRow(5, 'Sin datos de docentes')]
                                )
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 20]
                    },

                    // ── SECCIÓN 8: ESPACIOS ESPECIALES ───────────────────
                    sectionTitle(8, 'Espacios Especiales y Otros Recursos'),
                    {
                        table: {
                            widths: ['*', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'Tipo de Espacio', style: 'tableHeader' },
                                    { text: 'Capacidad Total', style: 'tableHeader' },
                                    { text: 'Disponibles', style: 'tableHeader' }
                                ],
                                ...(metricas.stats_espacios.length > 0
                                    ? metricas.stats_espacios.map(sp => [
                                        { text: sp.tipo, style: 'tableCell' },
                                        { text: (sp.capacidad_total || 0).toString(), style: 'tableCell' },
                                        { text: sp.disponibles.toString(), style: 'tableCell' }
                                    ])
                                    : [emptyRow(3, 'Sin datos de espacios especiales')]
                                )
                            ]
                        },
                        layout: 'headerLineOnly',
                        margin: [0, 0, 0, 20]
                    },

                    // ── SECCIÓN 9: RESERVAS DE ESPACIOS ──────────────────
                    sectionTitle(9, 'Uso de Espacios Reservables (Bot Roomie)'),
                    {
                        text: 'Actividad de reservas gestionadas a través del bot, diferenciando uso individual del grupal.',
                        fontSize: 10,
                        color: '#555',
                        margin: [0, 0, 0, 6]
                    },
                    {
                        table: {
                            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'Tipo de Espacio', style: 'tableHeader' },
                                    { text: 'Total', style: 'tableHeader' },
                                    { text: 'Individual', style: 'tableHeader' },
                                    { text: 'Grupal', style: 'tableHeader' },
                                    { text: 'Activas', style: 'tableHeader' },
                                    { text: 'Prom. Pers.', style: 'tableHeader' }
                                ],
                                ...(metricas.stats_reservas.length > 0
                                    ? metricas.stats_reservas.map(sr => [
                                        { text: sr.tipo_espacio, style: 'tableCell' },
                                        { text: sr.total.toString(), style: 'tableCell', bold: true },
                                        { text: (sr.individuales || 0).toString(), style: 'tableCell' },
                                        { text: (sr.grupales || 0).toString(), style: 'tableCell' },
                                        { text: (sr.activas || 0).toString(), style: 'tableCell', color: colorVerde },
                                        { text: parseFloat(sr.promedio_personas || 1).toFixed(1), style: 'tableCell' }
                                    ])
                                    : [emptyRow(6, 'Sin reservas registradas')]
                                )
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 10]
                    },

                    // Reservas por día de la semana
                    metricas.reservas_por_dia.length > 0 ? {
                        columns: [
                            {
                                width: 'auto',
                                stack: [
                                    { text: 'Distribución por día de la semana:', fontSize: 9, bold: true, margin: [0, 6, 0, 4] },
                                    {
                                        table: {
                                            widths: metricas.reservas_por_dia.map(() => 'auto'),
                                            body: [
                                                metricas.reservas_por_dia.map(r => ({ text: (r.dia_semana || '').trim(), fontSize: 8, bold: true, alignment: 'center' })),
                                                metricas.reservas_por_dia.map(r => ({ text: r.total.toString(), fontSize: 9, bold: true, alignment: 'center', color: colorPrimario }))
                                            ]
                                        },
                                        layout: 'lightHorizontalLines'
                                    }
                                ]
                            }
                        ],
                        margin: [0, 0, 0, 20]
                    } : { text: '', margin: [0, 0, 0, 20] }
                ];

                const docDefinition = {
                    pageSize: 'A4',
                    pageOrientation: 'portrait',
                    pageMargins: [40, 60, 40, 50],
                    header: {
                        stack: [
                            { text: 'UNIVERSIDAD INTERNACIONAL DEL ECUADOR — SISTEMA DE GESTIÓN DE AULAS', fontSize: 9, bold: true, color: colorPrimario, alignment: 'center' },
                            { canvas: [{ type: 'line', x1: 40, y1: 4, x2: 555, y2: 4, lineWidth: 0.5, lineColor: colorPrimario }] }
                        ],
                        margin: [0, 20, 0, 0]
                    },
                    content,
                    styles: {
                        tableHeader: { fontSize: 9, bold: true, color: '#fff', fillColor: colorPrimario, margin: [4, 3, 4, 3] },
                        tableCell: { fontSize: 9, margin: [4, 2, 4, 2] }
                    },
                    footer: (currentPage, pageCount) => ({
                        text: `Página ${currentPage} de ${pageCount}  •  Generado: ${new Date().toLocaleString('es-EC')}`,
                        alignment: 'center',
                        fontSize: 7,
                        color: '#aaa',
                        margin: [0, 10, 0, 0]
                    })
                };

                const fileName = `reporte_ejecutivo_${Date.now()}.pdf`;
                const uploadDir = path.join(__dirname, '../../uploads/reportes');
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

                const filePath = path.join(uploadDir, fileName);
                const pdfDoc = await printer.createPdfKitDocument(docDefinition);
                const stream = fs.createWriteStream(filePath);
                pdfDoc.pipe(stream);
                pdfDoc.end();
                stream.on('finish', () => resolve(fileName));
                stream.on('error', (err) => reject(err));

            } catch (error) {
                console.error('Error generando PDF:', error);
                reject(error);
            }
        });
    }
    /**
     * Genera un archivo Excel con el detalle de la distribución actual
     * @param {Object} filtros - Filtros (carrera_id)
     * @returns {Promise<Buffer>} - Buffer del archivo Excel
     */
    async generarExcel(filtros = {}) {
        const { carrera_id } = filtros;
        const XLSX = require('xlsx');

        // Obtener datos detallados de la distribución
        const query = `
            SELECT 
                c.carrera,
                c.materia,
                c.ciclo,
                c.paralelo,
                c.num_estudiantes,
                c.dia,
                c.hora_inicio,
                c.hora_fin,
                c.docente,
                a.nombre as aula_nombre,
                a.codigo as aula_codigo,
                a.edificio,
                a.piso,
                a.capacidad as aula_capacidad,
                CASE 
                    WHEN a.capacidad IS NULL THEN 'Pendiente'
                    WHEN a.capacidad < c.num_estudiantes THEN 'Sobrecupo (' || ROUND((CAST(c.num_estudiantes AS float)/NULLIF(a.capacidad,0)*100)::numeric, 1) || '%)'
                    ELSE 'OK' 
                END as estado_capacidad
            FROM clases c
            LEFT JOIN aulas a ON a.codigo = c.aula_asignada
            WHERE 1=1 ${carrera_id ? 'AND c.carrera_id = :carrera_id' : ''}
            ORDER BY c.carrera, c.ciclo, c.materia
        `;

        const data = await sequelize.query(query, {
            replacements: filtros,
            type: QueryTypes.SELECT
        });

        // Mapear a nombres de columnas amigables
        const rows = data.map(item => ({
            'Carrera': item.carrera || 'N/A',
            'Materia': item.materia,
            'Ciclo': item.ciclo || '',
            'Paralelo': item.paralelo || '',
            'Estudiantes': item.num_estudiantes || 0,
            'Día': item.dia || 'Sin asignar',
            'Hora Inicio': item.hora_inicio || '',
            'Hora Fin': item.hora_fin || '',
            'Docente': item.docente || '',
            'Aula Asignada': item.aula_nombre || 'SIN AULA',
            'Código Aula': item.aula_codigo || '',
            'Edificio': item.edificio || '',
            'Piso': item.piso || '',
            'Capacidad Aula': item.aula_capacidad || 0,
            'Estado': item.estado_capacidad
        }));

        // Crear el libro y la hoja
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);

        // Autofit columnas (aproximado)
        const colWidths = Object.keys(rows[0] || {}).map(key => ({
            wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2
        }));
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, "Distribución UIDE");

        // Generar el buffer
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
}

module.exports = new ReporteService();
