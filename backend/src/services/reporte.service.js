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

            if (carrera_id) {
                whereClase.carrera_id = carrera_id;
            }

            // 1. Resumen General
            const totalClases = await Clase.count({ where: whereClase });
            const clasesAsignadas = await Clase.count({
                where: {
                    ...whereClase,
                    aula_asignada: { [Op.not]: null }
                }
            });

            const huerfanosCount = totalClases - clasesAsignadas;
            const porcentajeExito = totalClases > 0 ? (clasesAsignadas / totalClases) * 100 : 0;

            // 2. Eficiencia de Capacidad (Solo para clases asignadas)
            const eficienciaQuery = `
        SELECT 
          AVG(CAST(c.num_estudiantes AS FLOAT) / CAST(NULLIF(a.capacidad, 0) AS FLOAT)) * 100 as eficiencia_promedio
        FROM clases c
        JOIN aulas a ON a.codigo = c.aula_asignada
        WHERE c.aula_asignada IS NOT NULL
        ${carrera_id ? 'AND c.carrera_id = :carrera_id' : ''}
      `;

            const [eficienciaResult] = await sequelize.query(eficienciaQuery, {
                replacements: { carrera_id },
                type: QueryTypes.SELECT
            });

            // 3. Uso por Edificio
            const usoEdificioQuery = `
        SELECT 
          a.edificio,
          COUNT(c.id) as total_clases,
          COUNT(DISTINCT a.id) as total_aulas_usadas
        FROM clases c
        JOIN aulas a ON a.codigo = c.aula_asignada
        WHERE c.aula_asignada IS NOT NULL
        ${carrera_id ? 'AND c.carrera_id = :carrera_id' : ''}
        GROUP BY a.edificio
        ORDER BY total_clases DESC
      `;

            const usoEdificios = await sequelize.query(usoEdificioQuery, {
                replacements: { carrera_id },
                type: QueryTypes.SELECT
            });

            // 4. Top 5 Aulas más usadas
            const topAulasQuery = `
        SELECT 
          a.nombre,
          a.codigo,
          a.edificio,
          COUNT(c.id) as total_clases
        FROM clases c
        JOIN aulas a ON a.codigo = c.aula_asignada
        WHERE c.aula_asignada IS NOT NULL
        ${carrera_id ? 'AND c.carrera_id = :carrera_id' : ''}
        GROUP BY a.id, a.nombre, a.codigo, a.edificio
        ORDER BY total_clases DESC
        LIMIT 5
      `;

            const topAulas = await sequelize.query(topAulasQuery, {
                replacements: { carrera_id },
                type: QueryTypes.SELECT
            });

            // 5. Distribución por Carrera (si es reporte general)
            let distribucionCarrera = [];
            if (!carrera_id) {
                const distCarreraQuery = `
          SELECT 
            carrera,
            COUNT(id) as total_clases,
            COUNT(CASE WHEN aula_asignada IS NOT NULL THEN 1 END) as asignadas
          FROM clases
          GROUP BY carrera
          ORDER BY total_clases DESC
        `;
                distribucionCarrera = await sequelize.query(distCarreraQuery, {
                    type: QueryTypes.SELECT
                });
            }

            // 6. Huérfanos Detalle (Clases sin aula)
            const huerfanosDetalle = await Clase.findAll({
                where: {
                    ...whereClase,
                    aula_asignada: null
                },
                limit: 10,
                attributes: ['materia', 'carrera', 'docente', 'num_estudiantes', 'dia', 'hora_inicio']
            });

            // 7. Estadísticas de Espacios Especiales (Biblioteca, etc.)
            let statsEspacios = [];
            try {
                statsEspacios = await Espacio.findAll({
                    attributes: [
                        'tipo',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
                        [sequelize.fn('SUM', sequelize.col('capacidad')), 'capacidad_total'],
                        [sequelize.literal("COUNT(CASE WHEN estado = 'DISPONIBLE' THEN 1 END)"), 'disponibles']
                    ],
                    group: ['tipo'],
                    raw: true
                });
            } catch (e) {
                // La tabla 'espacios' puede no existir aún
                console.warn('Tabla espacios no disponible:', e.message);
            }

            // 8. Carga Horaria por Docente
            const cargaDocenteQuery = `
        SELECT
          docente,
          COUNT(id) as total_clases,
          SUM(
            (EXTRACT(HOUR FROM CAST(hora_fin AS TIME)) * 60 + EXTRACT(MINUTE FROM CAST(hora_fin AS TIME))) -
            (EXTRACT(HOUR FROM CAST(hora_inicio AS TIME)) * 60 + EXTRACT(MINUTE FROM CAST(hora_inicio AS TIME)))
          ) / 60.0 as horas_totales
        FROM clases
        WHERE docente IS NOT NULL AND TRIM(docente) <> ''
          AND hora_inicio IS NOT NULL AND TRIM(hora_inicio) <> ''
          AND hora_fin IS NOT NULL AND TRIM(hora_fin) <> ''
          AND hora_inicio ~ '^[0-9]{1,2}:[0-9]{2}'
          AND hora_fin ~ '^[0-9]{1,2}:[0-9]{2}'
        ${carrera_id ? 'AND carrera_id = :carrera_id' : ''}
        GROUP BY docente
        ORDER BY horas_totales DESC
        LIMIT 10
      `;

            const cargaDocentes = await sequelize.query(cargaDocenteQuery, {
                replacements: { carrera_id },
                type: QueryTypes.SELECT
            });

            // 9. Estadísticas de Reservas (NUEVO)
            const statsReservasQuery = `
        SELECT 
          tipo_espacio,
          COUNT(*) as total,
          SUM(CASE WHEN es_grupal THEN 1 ELSE 0 END) as grupales,
          SUM(CASE WHEN NOT es_grupal THEN 1 ELSE 0 END) as individuales,
          AVG(num_personas) as promedio_personas
        FROM reservas
        WHERE estado IN ('activa', 'finalizada')
        GROUP BY tipo_espacio
      `;

            const statsReservas = await sequelize.query(statsReservasQuery, {
                type: QueryTypes.SELECT
            });

            return {
                resumen: {
                    total_clases: totalClases,
                    clases_asignadas: clasesAsignadas,
                    huerfanos: huerfanosCount,
                    porcentaje_exito: parseFloat(porcentajeExito.toFixed(2)),
                    eficiencia_capacidad: parseFloat((eficienciaResult?.eficiencia_promedio || 0).toFixed(2))
                },
                uso_edificios: usoEdificios,
                top_aulas: topAulas,
                distribucion_carrera: distribucionCarrera,
                huerfanos_detalle: huerfanosDetalle,
                stats_espacios: statsEspacios,
                carga_docentes: cargaDocentes,
                stats_reservas: statsReservas,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error al calcular métricas de reporte:', error);
            throw error;
        }
    }

    /**
     * Genera un archivo PDF con el diseño ejecutivo
     * @param {Object} metricas - Datos calculados previamente
     * @param {Object} info - Información extra (nombre, usuario)
     */
    async generarPDF(metricas, info = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                // Configuración de fuentes
                const fonts = {
                    Roboto: {
                        normal: path.join(__dirname, '../assets/fonts/Roboto/Roboto-Regular.ttf'),
                        bold: path.join(__dirname, '../assets/fonts/Roboto/Roboto-Medium.ttf'),
                        italics: path.join(__dirname, '../assets/fonts/Roboto/Roboto-Italic.ttf'),
                        bolditalics: path.join(__dirname, '../assets/fonts/Roboto/Roboto-MediumItalic.ttf')
                    }
                };

                const printer = new PdfPrinter(fonts);
                const colorPrimario = '#8b004c'; // Color institucional UIDE

                const docDefinition = {
                    pageSize: 'A4',
                    pageMargins: [40, 60, 40, 60],
                    header: {
                        stack: [
                            { text: 'UNIVERSIDAD INTERNACIONAL DEL ECUADOR', style: 'headerMain' },
                            { canvas: [{ type: 'line', x1: 40, y1: 5, x2: 555, y2: 5, lineWidth: 1, lineColor: colorPrimario }] }
                        ],
                        margin: [0, 20, 0, 0]
                    },
                    content: [
                        { text: info.nombre || 'REPORTE EJECUTIVO DE GESTIÓN DE ESPACIOS', style: 'docTitle' },

                        {
                            text: [
                                { text: 'Fecha de generación: ', bold: true },
                                { text: new Date().toLocaleString('es-EC') },
                                { text: '\nGenerado por: ', bold: true },
                                { text: info.usuario || 'Sistema' }
                            ],
                            style: 'infoSection'
                        },

                        { text: '1. RESUMEN EJECUTIVO', style: 'sectionTitle' },
                        {
                            text: `En el presente ciclo de gestión, el sistema ha procesado satisfactoriamente la distribución de espacios físicos. A continuación se presentan los indicadores clave de rendimiento (KPIs) obtenidos a partir de la configuración actual:`,
                            style: 'paragraph'
                        },

                        {
                            table: {
                                widths: ['*', '*', '*', '*'],
                                body: [
                                    [
                                        { text: 'Total Clases', style: 'tableHeader' },
                                        { text: 'Asignadas', style: 'tableHeader' },
                                        { text: 'Éxito', style: 'tableHeader' },
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
                            margin: [0, 10, 0, 20]
                        },

                        { text: '2. ANÁLISIS POR EDIFICIO', style: 'sectionTitle' },
                        {
                            table: {
                                widths: ['*', 'auto', 'auto'],
                                body: [
                                    [
                                        { text: 'Edificio / Bloque', style: 'tableHeader' },
                                        { text: 'Clases Asignadas', style: 'tableHeader' },
                                        { text: 'Espacios Utilizados', style: 'tableHeader' }
                                    ],
                                    ...metricas.uso_edificios.map(ed => [
                                        { text: ed.edificio || 'General', style: 'tableCell' },
                                        { text: ed.total_clases.toString(), style: 'tableCell' },
                                        { text: ed.total_aulas_usadas.toString(), style: 'tableCell' }
                                    ])
                                ]
                            },
                            layout: 'noBorders',
                            margin: [0, 5, 0, 20]
                        },

                        { text: '3. CLASES SIN ASIGNACIÓN (CRÍTICO)', style: 'sectionTitleRed' },
                        {
                            text: metricas.resumen.huerfanos > 0
                                ? `Se han detectado ${metricas.resumen.huerfanos} clases que no pudieron ser asignadas automáticamente debido a restricciones de capacidad o conflictos de horario. Se recomienda revisión manual.`
                                : 'No se han detectado conflictos de asignación. El 100% de las clases cuentan con un espacio asignado.',
                            style: 'paragraph'
                        },
                        metricas.resumen.huerfanos > 0 ? {
                            table: {
                                widths: ['*', 'auto', 'auto', 'auto'],
                                body: [
                                    [
                                        { text: 'Materia', style: 'tableHeader' },
                                        { text: 'Est.', style: 'tableHeader' },
                                        { text: 'Día', style: 'tableHeader' },
                                        { text: 'Hora', style: 'tableHeader' }
                                    ],
                                    ...metricas.huerfanos_detalle.map(h => [
                                        { text: h.materia, fontSize: 9 },
                                        { text: h.num_estudiantes.toString(), fontSize: 9 },
                                        { text: h.dia, fontSize: 9 },
                                        { text: h.hora_inicio, fontSize: 9 }
                                    ])
                                ]
                            },
                            margin: [0, 5, 0, 20]
                        } : null,

                        { text: '4. ESPACIOS ESPECIALES Y OTROS RECURSOS', style: 'sectionTitle' },
                        {
                            table: {
                                widths: ['*', 'auto', 'auto'],
                                body: [
                                    [
                                        { text: 'Tipo de Espacio', style: 'tableHeader' },
                                        { text: 'Capacidad Total', style: 'tableHeader' },
                                        { text: 'Estado Disponible', style: 'tableHeader' }
                                    ],
                                    ...metricas.stats_espacios.map(sp => [
                                        { text: sp.tipo, style: 'tableCell' },
                                        { text: (sp.capacidad_total || 0).toString(), style: 'tableCell' },
                                        { text: sp.disponibles.toString(), style: 'tableCell' }
                                    ])
                                ]
                            },
                            layout: 'headerLineOnly',
                            margin: [0, 5, 0, 20]
                        },

                        { text: '5. CUMPLIMIENTO CARGA HORARIA DOCENTE', style: 'sectionTitle' },
                        {
                            table: {
                                widths: ['*', 'auto', 'auto'],
                                body: [
                                    [
                                        { text: 'Docente', style: 'tableHeader' },
                                        { text: 'Total Clases', style: 'tableHeader' },
                                        { text: 'Horas Totales', style: 'tableHeader' }
                                    ],
                                    ...metricas.carga_docentes.map(cd => [
                                        { text: cd.docente, style: 'tableCell' },
                                        { text: cd.total_clases.toString(), style: 'tableCell' },
                                        { text: `${parseFloat(cd.horas_totales).toFixed(1)} hrs`, style: 'tableCell' }
                                    ])
                                ]
                            },
                            layout: 'lightHorizontalLines',
                            margin: [0, 5, 0, 20]
                        },

                        { text: '6. USO DINÁMICO DE ESPACIOS (BOT)', style: 'sectionTitle' },
                        {
                            text: `Este indicador mide el uso espontáneo de espacios reservables gestionados a través del Bot Roomie, diferenciando el uso individual del grupal:`,
                            style: 'paragraph'
                        },
                        {
                            table: {
                                widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                                body: [
                                    [
                                        { text: 'Tipo de Espacio', style: 'tableHeader' },
                                        { text: 'Total', style: 'tableHeader' },
                                        { text: 'Individual', style: 'tableHeader' },
                                        { text: 'Grupal', style: 'tableHeader' },
                                        { text: 'Prom. Pers.', style: 'tableHeader' }
                                    ],
                                    ...metricas.stats_reservas.map(sr => [
                                        { text: sr.tipo_espacio, style: 'tableCell' },
                                        { text: sr.total.toString(), style: 'tableCell' },
                                        { text: (sr.individuales || 0).toString(), style: 'tableCell' },
                                        { text: (sr.grupales || 0).toString(), style: 'tableCell' },
                                        { text: parseFloat(sr.promedio_personas || 1).toFixed(1), style: 'tableCell' }
                                    ])
                                ]
                            },
                            layout: 'headerLineOnly',
                            margin: [0, 5, 0, 20]
                        }
                    ],
                    styles: {
                        headerMain: { fontSize: 14, bold: true, color: colorPrimario, alignment: 'center' },
                        docTitle: { fontSize: 18, bold: true, margin: [0, 0, 0, 10], alignment: 'left' },
                        infoSection: { fontSize: 10, margin: [0, 0, 0, 20], color: '#444' },
                        sectionTitle: { fontSize: 14, bold: true, color: colorPrimario, margin: [0, 15, 0, 10] },
                        sectionTitleRed: { fontSize: 14, bold: true, color: '#b91c1c', margin: [0, 15, 0, 10] },
                        paragraph: { fontSize: 11, lineHeight: 1.4, margin: [0, 0, 0, 10], color: '#333' },
                        tableHeader: { fontSize: 10, bold: true, color: '#fff', fillColor: colorPrimario, margin: [5, 2, 5, 2] },
                        tableCell: { fontSize: 10, margin: [5, 2, 5, 2] }
                    },
                    footer: function (currentPage, pageCount) {
                        return { text: `Página ${currentPage} de ${pageCount}`, alignment: 'center', fontSize: 8, margin: [0, 20, 0, 0] };
                    }
                };

                const fileName = `reporte_ejecutivo_${Date.now()}.pdf`;
                const uploadDir = path.join(__dirname, '../../uploads/reportes');

                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

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
}

module.exports = new ReporteService();
