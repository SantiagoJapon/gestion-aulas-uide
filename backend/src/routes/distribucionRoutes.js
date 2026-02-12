const express = require('express');
const router = express.Router();

const {
  getEstadoDistribucion,
  forzarDistribucion,
  ejecutarDistribucionAutomatica,
  obtenerHorario,
  limpiarDistribucion,
  obtenerMapaCalor,
  getClasesDistribucion,
  getMiDistribucion,
  getReporteDistribucion,
  getDocentesCarga
} = require('../controllers/distribucionController');
const { getDistribucionSimulada } = require('../controllers/distribucionController');
const { getCuadroClases } = require('../controllers/distribucionController');

const { verificarAuth, verificarAdmin, verificarRol } = require('../middleware/auth');

router.get('/estado', verificarAuth, verificarRol('director', 'admin'), getEstadoDistribucion);
router.post('/forzar', verificarAuth, verificarAdmin, forzarDistribucion);

// Nuevos endpoints
router.post('/ejecutar', verificarAuth, verificarRol('director', 'admin'), ejecutarDistribucionAutomatica);
router.get('/horario', verificarAuth, verificarRol('director', 'admin'), obtenerHorario);
router.post('/limpiar', verificarAuth, verificarAdmin, limpiarDistribucion);
router.get('/heatmap', verificarAuth, verificarRol('director', 'admin'), obtenerMapaCalor);
router.get('/clases', verificarAuth, verificarRol('director', 'admin'), getClasesDistribucion);
router.get('/simulado', verificarAuth, verificarAdmin, getDistribucionSimulada);
router.get('/cuadro', verificarAuth, verificarAdmin, getCuadroClases);

// Mi distribución (profesores/directores/estudiantes ven sus clases)
router.get('/mi-distribucion', verificarAuth, verificarRol('profesor', 'docente', 'director', 'admin', 'estudiante'), getMiDistribucion);

// Reporte de distribución
router.get('/reporte', verificarAuth, verificarRol('director', 'admin'), getReporteDistribucion);

// Carga docente (horas, clases, conflictos por profesor)
router.get('/docentes-carga', verificarAuth, verificarRol('director', 'admin'), getDocentesCarga);

// Mantenimiento y Edición Manual
const { updateClase, checkDisponibilidad } = require('../controllers/distribucionController');
router.put('/clase/:id', verificarAuth, verificarRol('director', 'admin'), updateClase);
router.get('/disponibilidad', verificarAuth, verificarRol('director', 'admin'), checkDisponibilidad);

module.exports = router;
