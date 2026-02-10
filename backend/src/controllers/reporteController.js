const ReporteService = require('../services/reporte.service');
const { ReporteHistorial, User, Carrera } = require('../models');

/**
 * Resuelve el carrera_id según el rol del usuario.
 * Directores solo pueden ver/generar reportes de su propia carrera.
 */
async function resolverCarreraId(usuario, carreraIdSolicitado) {
    if (usuario.rol === 'director' && usuario.carrera_director) {
        const carreraObj = await Carrera.findOne({ where: { carrera: usuario.carrera_director } });
        return carreraObj ? carreraObj.id : null;
    }
    return carreraIdSolicitado || null;
}

/**
 * Controller para la gestión de reportes ejecutivos e historial
 */
class ReporteController {

    /**
     * Genera un nuevo reporte y lo guarda en el historial
     */
    async generarReporte(req, res) {
        try {
            const { carrera_id: carreraIdBody, nombre, tipo = 'GENERAL' } = req.body;
            const usuario_id = req.usuario.id;
            const carrera_id = await resolverCarreraId(req.usuario, carreraIdBody);

            // 1. Obtener métricas detalladas
            const metricas = await ReporteService.obtenerMetricas({ carrera_id });

            // 2. Determinar el nombre del reporte si no se provee
            let nombreFinal = nombre;
            if (!nombreFinal) {
                const fecha = new Date().toLocaleDateString('es-EC');
                nombreFinal = `Reporte Ejecutivo ${tipo} - ${fecha}`;
            }

            // 3. Generar el archivo PDF físico
            const fileName = await ReporteService.generarPDF(metricas, {
                nombre: nombreFinal,
                usuario: `${req.usuario.nombre} ${req.usuario.apellido}`
            });

            // 4. Guardar en historial
            const reporte = await ReporteHistorial.create({
                nombre: nombreFinal,
                tipo,
                filtros: { carrera_id },
                metadatos: metricas,
                ruta_archivo: fileName,
                usuario_id
            });

            res.status(201).json({
                success: true,
                mensaje: 'Reporte generado exitosamente',
                reporte
            });

        } catch (error) {
            console.error('Error al generar reporte:', error);
            res.status(500).json({
                success: false,
                error: 'Error al generar el reporte',
                message: error.message
            });
        }
    }

    /**
     * Obtiene el historial de reportes generados
     */
    async obtenerHistorial(req, res) {
        try {
            const { tipo } = req.query;
            const where = {};
            if (tipo) where.tipo = tipo;

            // Directores solo ven reportes que ellos generaron
            if (req.usuario.rol === 'director') {
                where.usuario_id = req.usuario.id;
            }

            const historial = await ReporteHistorial.findAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'generadoPor',
                        attributes: ['id', 'nombre', 'apellido', 'email']
                    }
                ],
                order: [['fecha_generacion', 'DESC']]
            });

            res.json({
                success: true,
                total: historial.length,
                historial
            });
        } catch (error) {
            console.error('Error al obtener historial de reportes:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener historial'
            });
        }
    }

    /**
     * Obtiene las métricas en tiempo real (sin guardar en historial)
     */
    async obtenerMetricasActuales(req, res) {
        try {
            const { carrera_id: carreraIdQuery } = req.query;
            const carrera_id = await resolverCarreraId(req.usuario, carreraIdQuery);
            const metricas = await ReporteService.obtenerMetricas({ carrera_id });

            res.json({
                success: true,
                metricas
            });
        } catch (error) {
            console.error('Error al obtener métricas actuales:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener métricas'
            });
        }
    }

    /**
     * Eliminar un reporte del historial
     */
    async eliminarReporte(req, res) {
        try {
            const { id } = req.params;
            const reporte = await ReporteHistorial.findByPk(id);

            if (!reporte) {
                return res.status(404).json({ success: false, error: 'Reporte no encontrado' });
            }

            await reporte.destroy();
            res.json({ success: true, mensaje: 'Registro de reporte eliminado' });
        } catch (error) {
            console.error('Error al eliminar reporte:', error);
            res.status(500).json({ success: false, error: 'Error al eliminar reporte' });
        }
    }

    /**
     * Descarga un archivo PDF del historial
     */
    async descargarReporte(req, res) {
        try {
            const { id } = req.params;
            const reporte = await ReporteHistorial.findByPk(id);

            if (!reporte || !reporte.ruta_archivo) {
                return res.status(404).json({ success: false, error: 'Archivo no encontrado' });
            }

            const path = require('path');
            const fs = require('fs');
            const filePath = path.join(__dirname, '../../uploads/reportes', reporte.ruta_archivo);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ success: false, error: 'El archivo físico no existe en el servidor' });
            }

            res.download(filePath, reporte.ruta_archivo);
        } catch (error) {
            console.error('Error al descargar reporte:', error);
            res.status(500).json({ success: false, error: 'Error al procesar la descarga' });
        }
    }
}

module.exports = new ReporteController();
