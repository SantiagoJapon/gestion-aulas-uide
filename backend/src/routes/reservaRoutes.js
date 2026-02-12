const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
const { verificarAuth } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verificarAuth);

// Crear una nueva reserva
router.post('/', reservaController.crearReserva);

// Listar mis reservas
router.get('/mis-reservas', reservaController.misReservas);

// Cancelar reserva (:id)
router.delete('/:id', reservaController.cancelarReserva);

module.exports = router;
