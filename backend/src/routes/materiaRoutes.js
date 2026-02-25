const express = require('express');
const router = express.Router();
const materiaController = require('../controllers/materiaController');
const { verificarAuth, verificarRol } = require('../middleware/auth');

// Todas las rutas de materias requieren autenticación mínima
router.use(verificarAuth);

// Listar materias (Director o Admin)
router.get('/', verificarRol('director', 'admin'), materiaController.getMaterias);

// Detalle de materia
router.get('/:id', verificarRol('director', 'admin'), materiaController.getMateriaById);

// Crear materia
router.post('/', verificarRol('director', 'admin'), materiaController.createMateria);

// Actualizar materia
router.put('/:id', verificarRol('director', 'admin'), materiaController.updateMateria);

// Eliminar materia (borrado lógico)
router.delete('/:id', verificarRol('director', 'admin'), materiaController.deleteMateria);

// Sincronizar desde clases
router.post('/sync', verificarRol('director', 'admin'), materiaController.syncMaterias);

module.exports = router;
