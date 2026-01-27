const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');
// const { verificarApiKey } = require('../middleware/auth'); // Opcional para seguridad

// Rutas públicas para el bot (o protegidas por API Key si se implementa)
router.get('/disponibilidad', botController.buscarDisponibilidad);
router.get('/docente', botController.ubicarDocente);
router.post('/reserva', botController.crearReserva);

// Endpoint de health específico para el bot
router.get('/ping', (req, res) => res.json({ status: 'bot_api_ok' }));

module.exports = router;
