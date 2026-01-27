const express = require('express');
const router = express.Router();
const aulaController = require('../controllers/aulaController');
const { verificarAuth, verificarAdmin } = require('../middleware/auth');

// ========================================
// RUTAS PÚBLICAS (lectura)
// ========================================

/**
 * @route   GET /api/aulas
 * @desc    Listar todas las aulas (con filtros opcionales)
 * @access  Public
 * @query   edificio, carrera, capacidadMin, estado, es_laboratorio
 */
router.get('/', aulaController.getAllAulas);

/**
 * @route   GET /api/aulas/stats/summary
 * @desc    Obtener estadísticas de aulas
 * @access  Public
 */
router.get('/stats/summary', aulaController.getAulasStats);

/**
 * @route   GET /api/aulas/:id
 * @desc    Obtener una aula por ID
 * @access  Public
 */
router.get('/:id', aulaController.getAulaById);

// ========================================
// RUTAS PROTEGIDAS (solo admin)
// ========================================

/**
 * @route   POST /api/aulas
 * @desc    Crear nueva aula
 * @access  Private (solo admin)
 */
router.post('/', verificarAuth, verificarAdmin, aulaController.createAula);

/**
 * @route   PUT /api/aulas/:id
 * @desc    Actualizar aula
 * @access  Private (solo admin)
 */
router.put('/:id', verificarAuth, verificarAdmin, aulaController.updateAula);

/**
 * @route   DELETE /api/aulas/:id
 * @desc    Desactivar aula (cambia estado a 'no_disponible')
 * @access  Private (solo admin)
 */
router.delete('/:id', verificarAuth, verificarAdmin, aulaController.deleteAula);

module.exports = router;



