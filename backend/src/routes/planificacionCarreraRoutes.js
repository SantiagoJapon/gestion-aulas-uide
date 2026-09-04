// ============================================
// ROUTES: Planificación colaborativa por carrera (Fase 4)
// ============================================
// Montado en /api/planificacion-colaborativa (routes/index.js).
// Separado de planificacionRoutes.js (legado: subida de excel) a
// propósito — dominios distintos, mismo patrón que distribucionRoutes.js
// vive separado de planificacionRoutes.js.
//
// Las rutas /admin/* se declaran ANTES que /:carreraId/* para que
// Express siempre pruebe primero los literales explícitos.

const express = require('express');
const router = express.Router();
const controller = require('../controllers/planificacionCarreraController');
const { verificarAuth, verificarRol, verificarAdmin } = require('../middleware/auth');

router.use(verificarAuth);

// ------------------------------------------------------------
// Admin exclusivo
// ------------------------------------------------------------
router.get('/admin/pendientes', verificarAdmin, controller.detectarCarrerasSinEnviar);
router.post('/admin/crear-flujo', verificarAdmin, controller.crearFlujo);
router.post('/admin/fill-gaps/calcular', verificarAdmin, controller.calcularFillGaps);
router.post('/admin/fill-gaps/aplicar', verificarAdmin, controller.aplicarFillGaps);
router.post('/admin/reasignacion-excepcional', verificarAdmin, controller.reasignacionExcepcional);
router.post('/admin/:carreraId/fecha-limite/extender', verificarAdmin, controller.extenderFechaLimite);
router.get('/admin/trazabilidad/metricas', verificarAdmin, controller.metricasTrazabilidad);

// ------------------------------------------------------------
// Auditoría de un bloque (admin, o director sobre su propia carrera)
// ------------------------------------------------------------
router.get('/bloques/:bloqueId/historial', verificarRol('director', 'admin'), controller.historialBloque);

// ------------------------------------------------------------
// Director (o admin) — sobre una carrera propia
// ------------------------------------------------------------
router.get('/:carreraId/estado', verificarRol('director', 'admin'), controller.obtenerEstado);
router.post('/:carreraId/reabrir', verificarRol('director', 'admin'), controller.reabrirBorrador);
router.post('/:carreraId/sugerir', verificarRol('director', 'admin'), controller.sugerirAula);
router.post('/:carreraId/enviar', verificarRol('director', 'admin'), controller.enviarPlanificacion);
router.post('/:carreraId/confirmar', verificarRol('director', 'admin'), controller.confirmarPlanificacion);

module.exports = router;
