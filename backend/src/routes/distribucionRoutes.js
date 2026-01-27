const express = require('express');
const router = express.Router();

const {
  getEstadoDistribucion,
  forzarDistribucion,
  ejecutarDistribucionAutomatica,
  obtenerHorario,
  limpiarDistribucion
} = require('../controllers/distribucionController');

const { verificarAuth, verificarAdmin, verificarRol } = require('../middleware/auth');

router.get('/estado', verificarAuth, verificarAdmin, getEstadoDistribucion);
router.post('/forzar', verificarAuth, verificarAdmin, forzarDistribucion);

// Nuevos endpoints
router.post('/ejecutar', verificarAuth, verificarAdmin, ejecutarDistribucionAutomatica);
router.get('/horario', verificarAuth, verificarRol('director', 'admin'), obtenerHorario);
router.post('/limpiar', verificarAuth, verificarAdmin, limpiarDistribucion);

module.exports = router;
