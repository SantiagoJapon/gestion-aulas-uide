const express = require('express');
const router = express.Router();
const busquedaController = require('../controllers/busquedaController');
const { verificarAuth } = require('../middleware/auth');

// Todas las búsquedas requieren estar logueado
router.use(verificarAuth);

// ¿Dónde está el docente?
router.get('/docente', busquedaController.buscarDocente);

// ¿Qué hay en esta aula ahora?
router.get('/aula', busquedaController.estadoAula);

module.exports = router;
