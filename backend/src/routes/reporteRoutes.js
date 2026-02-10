const express = require('express');
const router = express.Router();
const ReporteController = require('../controllers/reporteController');
const { verificarAuth, verificarAdmin, verificarRol } = require('../middleware/auth');

// Todos los reportes requieren autenticación
router.use(verificarAuth);

// Obtener métricas actuales (Admin o Directores pueden ver)
router.get('/metricas', ReporteController.obtenerMetricasActuales);

// Historial y generación: Admin y directores pueden ver/generar
router.get('/historial', verificarRol('admin', 'director'), ReporteController.obtenerHistorial);
router.post('/generar', verificarRol('admin', 'director'), ReporteController.generarReporte);
router.get('/descargar/:id', ReporteController.descargarReporte);
router.delete('/:id', verificarAdmin, ReporteController.eliminarReporte);

module.exports = router;
