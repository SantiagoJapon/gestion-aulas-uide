const express = require('express');
const router = express.Router();
const configuracionPlanificacionController = require('../controllers/configuracionPlanificacionController');
const { verificarAuth, verificarRol, verificarAdmin } = require('../middleware/auth');

// Obtener configuración global actual
router.get('/', verificarAuth, verificarRol('admin'), configuracionPlanificacionController.obtenerConfiguracionGlobal);

// Actualizar configuración global (crear o modificar)
router.post(
  '/',
  verificarAuth,
  verificarAdmin,
  configuracionPlanificacionController.actualizarConfiguracionGlobal
);

// Obtener estado de todas las carreras respecto al período global
router.get(
  '/estado-carreras',
  verificarAuth,
  verificarAdmin,
  configuracionPlanificacionController.obtenerEstadoCaracteres
);

module.exports = router;