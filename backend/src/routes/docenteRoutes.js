const express = require('express');
const router = express.Router();
const docenteController = require('../controllers/docenteController');
const { verificarAuth, verificarRol } = require('../middleware/auth');

// Dashboard de docentes: Accesible para Admin y Director
router.get('/', verificarAuth, verificarRol('admin', 'director'), docenteController.getDocentes);

// Crear nuevo docente manual
router.post('/', verificarAuth, verificarRol('admin', 'director'), docenteController.createDocente);

// Detalle de docente
router.get('/:id', verificarAuth, verificarRol('admin', 'director'), docenteController.getDocenteById);

// Actualizar docente
router.put('/:id', verificarAuth, verificarRol('admin', 'director'), docenteController.updateDocente);

// Actualizar teléfono de docente (para WhatsApp)
router.put('/:id/telefono', verificarAuth, verificarRol('admin', 'director'), docenteController.updateTelefono);

// Crear cuenta individual para un docente (sin cuenta previa)
router.post('/:id/crear-cuenta', verificarAuth, verificarRol('admin', 'director'), docenteController.crearCuentaDocente);

// Generar credenciales masivamente para docentes sin cuenta
router.post('/generar-credenciales', verificarAuth, verificarRol('admin', 'director'), docenteController.generarCredencialesMasivo);

module.exports = router;
