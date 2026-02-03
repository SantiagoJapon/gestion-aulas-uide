const express = require('express');
const router = express.Router();

const {
  getEstadoDistribucion,
  forzarDistribucion,
  ejecutarDistribucionAutomatica,
  obtenerHorario,
  limpiarDistribucion,
  obtenerMapaCalor,
  getClasesDistribucion
} = require('../controllers/distribucionController');
const { getDistribucionSimulada } = require('../controllers/distribucionController');
const { getCuadroClases } = require('../controllers/distribucionController');

const { verificarAuth, verificarAdmin, verificarRol } = require('../middleware/auth');

router.get('/estado', verificarAuth, verificarAdmin, getEstadoDistribucion);
router.post('/forzar', verificarAuth, verificarAdmin, forzarDistribucion);

// Nuevos endpoints
router.post('/ejecutar', verificarAuth, verificarAdmin, ejecutarDistribucionAutomatica);
router.get('/horario', verificarAuth, verificarRol('director', 'admin'), obtenerHorario);
router.post('/limpiar', verificarAuth, verificarAdmin, limpiarDistribucion);
router.get('/heatmap', verificarAuth, verificarRol('director', 'admin'), obtenerMapaCalor);
router.get('/clases', verificarAuth, verificarAdmin, getClasesDistribucion);
router.get('/simulado', verificarAuth, verificarAdmin, getDistribucionSimulada);
router.get('/cuadro', verificarAuth, verificarAdmin, getCuadroClases);

module.exports = router;
