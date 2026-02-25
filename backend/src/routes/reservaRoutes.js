const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
const { verificarAuth, verificarRol } = require('../middleware/auth');

// Consultar aulas disponibles — PUBLICA (el bot la usa sin JWT)
router.get('/disponibles', reservaController.buscarDisponibilidad);

// Las siguientes rutas requieren autenticación
router.use(verificarAuth);

// Crear una nueva reserva
router.post('/', reservaController.crearReserva);

// Listar mis reservas
router.get('/mis-reservas', reservaController.misReservas);

// Cancelar reserva (:id)
router.delete('/:id', reservaController.cancelarReserva);

// ── Admin / Director ──────────────────────────────────────────────────────────

// Ver todas las reservas (con filtros opcionales: ?fecha=&estado=)
router.get('/todas', verificarRol('admin', 'director'), reservaController.listarTodas);

// Ver reservas pendientes de aprobación (?estado= opcional para ver otras)
router.get('/pendientes', verificarRol('admin', 'director'), reservaController.listarPendientes);

// Aprobar o rechazar una reserva (PATCH /api/reservas/:id/estado)
router.patch('/:id/estado', verificarRol('admin', 'director'), reservaController.cambiarEstado);

module.exports = router;
