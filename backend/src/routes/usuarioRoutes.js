const express = require('express');
const router = express.Router();

const {
  getUsuarios,
  updateDirectorCarrera,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  resetPasswordUsuario,
  generarCredencialesUsuario
} = require('../controllers/usuarioController');

const { verificarAuth, verificarAdmin, verificarRol } = require('../middleware/auth');

// Listar usuarios (Admin ve todos, Director solo los de su carrera - manejado en controller)
router.get('/', verificarAuth, verificarRol('admin', 'director'), getUsuarios);

// Crear usuario (Admin o Director)
router.post('/', verificarAuth, verificarRol('admin', 'director'), createUsuario);

// Actualizar usuario general
router.put('/:id', verificarAuth, verificarRol('admin', 'director'), updateUsuario);

// Eliminar usuario
router.delete('/:id', verificarAuth, verificarRol('admin', 'director'), deleteUsuario);

// Resetear contraseña de un usuario (admin/director)
router.post('/:id/reset-password', verificarAuth, verificarRol('admin', 'director'), resetPasswordUsuario);

// Generar/restablecer credenciales de acceso para un director (solo admin)
router.post('/:id/generar-credenciales', verificarAuth, verificarRol('admin'), generarCredencialesUsuario);

// Específico para Admin: asignar carreras a directores
router.put('/:id/carrera', verificarAuth, verificarAdmin, updateDirectorCarrera);

module.exports = router;
