// ============================================
// ROUTES: Planificaciones
// ============================================

const express = require('express');
const router = express.Router();
const planificacionController = require('../controllers/planificacionController');
const { verificarAuth, verificarRol, verificarAdmin } = require('../middleware/auth');

// Subir planificación (Director o Admin)
router.post(
  '/subir',
  verificarAuth,
  verificarRol('director', 'admin'),
  planificacionController.uploadMiddleware,
  planificacionController.subirPlanificacion
);

// Ver estado de distribución (según rol) - todas las carreras
router.get(
  '/distribucion',
  verificarAuth,
  planificacionController.obtenerEstadoDistribucion
);

// Ver estado de distribución (según rol) - por carrera específica
router.get(
  '/distribucion/:carrera_id',
  verificarAuth,
  planificacionController.obtenerEstadoDistribucion
);

// Ejecutar distribución manual (Solo Admin)
router.post(
  '/distribucion/ejecutar',
  verificarAuth,
  verificarAdmin,
  planificacionController.ejecutarDistribucionManual
);

// Detectar conflictos
router.get(
  '/conflictos/:carrera_id',
  verificarAuth,
  verificarRol('director', 'admin'),
  planificacionController.detectarConflictos
);

// Listar planificaciones subidas (Admin ve todas, Director solo las de su carrera)
router.get(
  '/listar',
  verificarAuth,
  verificarRol('director', 'admin'),
  planificacionController.listarPlanificaciones
);

// Descargar planificación
router.get(
  '/descargar/:id',
  verificarAuth,
  verificarRol('director', 'admin'),
  planificacionController.descargarPlanificacion
);

module.exports = router;
