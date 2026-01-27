const express = require('express');
const router = express.Router();

const {
  getUsuarios,
  updateDirectorCarrera
} = require('../controllers/usuarioController');

const { verificarAuth, verificarAdmin } = require('../middleware/auth');

router.get('/', verificarAuth, verificarAdmin, getUsuarios);
router.put('/:id/carrera', verificarAuth, verificarAdmin, updateDirectorCarrera);

module.exports = router;
