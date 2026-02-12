const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');
const { verificarAuth } = require('../middleware/auth');

router.use(verificarAuth);

router.post('/', notificacionController.crearNotificacion);
router.get('/mis-notificaciones', notificacionController.misNotificaciones);
router.put('/:id/leida', notificacionController.marcarLeida);

module.exports = router;
