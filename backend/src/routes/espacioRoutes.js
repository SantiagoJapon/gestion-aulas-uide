const express = require('express');
const router = express.Router();
const espacioController = require('../controllers/espacioController');
const { verificarAuth, verificarAdmin } = require('../middleware/auth');

// Lectura - cualquier usuario autenticado
router.get('/', verificarAuth, espacioController.getAllEspacios);
router.get('/stats/summary', verificarAuth, espacioController.getEspaciosStats);
router.get('/:id', verificarAuth, espacioController.getEspacioById);

// Escritura - solo admin
router.post('/', verificarAuth, verificarAdmin, espacioController.createEspacio);
router.put('/:id', verificarAuth, verificarAdmin, espacioController.updateEspacio);
router.delete('/:id', verificarAuth, verificarAdmin, espacioController.deleteEspacio);

module.exports = router;
