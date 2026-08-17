const express = require('express');
const router = express.Router();

const {
  getCarreras,
  getMisCarreras,
  createCarrera,
  updateCarrera,
  deleteCarrera
} = require('../controllers/carreraController');

const { verificarAuth, verificarAdmin } = require('../middleware/auth');

router.get('/', verificarAuth, getCarreras);
router.get('/mis-carreras', verificarAuth, getMisCarreras);
router.post('/', verificarAuth, verificarAdmin, createCarrera);
router.put('/:id', verificarAuth, verificarAdmin, updateCarrera);
router.delete('/:id', verificarAuth, verificarAdmin, deleteCarrera);

module.exports = router;
