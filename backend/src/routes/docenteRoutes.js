const express = require('express');
const router = express.Router();
const docenteController = require('../controllers/docenteController');
const { verificarAuth, verificarRol } = require('../middleware/auth');

// Dashboard de docentes: Accesible para Admin y Director
router.get('/', verificarAuth, verificarRol('admin', 'director'), docenteController.getDocentes);

// Detalle de docente
router.get('/:id', verificarAuth, verificarRol('admin', 'director'), docenteController.getDocenteById);

// Actualizar docente
router.put('/:id', verificarAuth, verificarRol('admin'), docenteController.updateDocente);

module.exports = router;
