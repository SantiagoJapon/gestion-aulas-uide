const express = require('express');
const router = express.Router();

// Importar todas las rutas
const authRoutes = require('./authRoutes');
const aulaRoutes = require('./aulaRoutes');
const estudianteRoutes = require('./estudianteRoutes');
const carreraRoutes = require('./carreraRoutes');
const n8nRoutes = require('./n8n.routes');
const planificacionRoutes = require('./planificacionRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const distribucionRoutes = require('./distribucionRoutes');
const botRoutes = require('./botRoutes');
const espacioRoutes = require('./espacioRoutes');
const reporteRoutes = require('./reporteRoutes');
const reservaRoutes = require('./reservaRoutes');
const busquedaRoutes = require('./busquedaRoutes');
const notificacionRoutes = require('./notificacionRoutes');
const incidenciaRoutes = require('./incidenciaRoutes');
const docenteRoutes = require('./docenteRoutes');
const searchRoutes = require('./searchRoutes');

// Registrar rutas
router.use('/auth', authRoutes);
router.use('/aulas', aulaRoutes);
router.use('/estudiantes', estudianteRoutes);
router.use('/carreras', carreraRoutes);
router.use('/n8n', n8nRoutes);
router.use('/planificaciones', planificacionRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/distribucion', distribucionRoutes);
router.use('/bot', botRoutes);
router.use('/espacios', espacioRoutes);
router.use('/reportes', reporteRoutes);
router.use('/reservas', reservaRoutes);
router.use('/busqueda', busquedaRoutes);
router.use('/notificaciones', notificacionRoutes);
router.use('/incidencias', incidenciaRoutes);
router.use('/docentes', docenteRoutes);
router.use('/search', searchRoutes);

module.exports = router;
