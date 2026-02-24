const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
const { verificarAuth } = require('../middleware/auth');

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

module.exports = router;
