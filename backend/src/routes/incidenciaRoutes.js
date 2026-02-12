const express = require('express');
const router = express.Router();
const incidenciaController = require('../controllers/incidenciaController');
const { verificarAuth } = require('../middleware/auth');

router.use(verificarAuth);

router.post('/', incidenciaController.crearIncidencia);
router.get('/', incidenciaController.listarIncidencias);
router.put('/:id/estado', incidenciaController.actualizarEstado);

module.exports = router;
