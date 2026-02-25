// Actualización de rutas para permitir acceso a directores - 2026-02-10
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  lookupEstudianteByEmail,
  loginEstudianteByCedula,
  subirEstudiantes,
  subirProyeccionCupos,
  obtenerHistorialCargas,
  listarEstudiantes,
  getEstudianteLoad,
  inscribirEstudiantesManual,
  desinscribirEstudiante,
  inscribirNivelCompleto
} = require('../controllers/estudianteController');
const { verificarAuth, verificarAdmin, verificarRol } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  }
});

/**
 * @route   GET /api/estudiantes
 * @desc    Listar estudiantes (admin)
 * @access  Private (admin)
 */
router.get(
  '/',
  verificarAuth,
  verificarRol('director', 'admin'),
  listarEstudiantes
);

router.get(
  '/:id/load',
  verificarAuth,
  verificarRol('director', 'admin'),
  getEstudianteLoad
);

/**
 * @route   GET /api/estudiantes/lookup
 * @desc    Buscar estudiante por email institucional
 * @access  Public
 */
router.get('/lookup', lookupEstudianteByEmail);

/**
 * @route   GET /api/estudiantes/login/:cedula
 * @desc    Login estudiante por cedula (carga datos + materias)
 * @access  Public
 */
router.get('/login/:cedula', loginEstudianteByCedula);

/**
 * @route   POST /api/estudiantes/subir
 * @desc    Subir listado de estudiantes desde Excel (PROCESAMIENTO DIRECTO)
 * @access  Private (admin)
 */
router.post(
  '/subir',
  verificarAuth,
  verificarRol('director', 'admin'),
  upload.single('archivo'),
  subirEstudiantes
);

/**
 * @route   POST /api/estudiantes/sync-proyeccion
 * @desc    Sincronizar carga académica (inscripciones) desde Excel "Proyección de Cupos"
 * @access  Private (admin, director)
 */
router.post(
  '/sync-proyeccion',
  verificarAuth,
  verificarRol('director', 'admin'),
  upload.single('archivo'),
  subirProyeccionCupos
);

/**
 * @route   GET /api/estudiantes/historial-cargas
 * @desc    Obtener historial de cargas de estudiantes
 * @access  Private (admin)
 */
router.get(
  '/historial-cargas',
  verificarAuth,
  verificarRol('director', 'admin'),
  obtenerHistorialCargas
);

/**
 * Gestión manual de inscripciones
 */
router.post(
  '/inscribir-manual',
  verificarAuth,
  verificarRol('director', 'admin'),
  inscribirEstudiantesManual
);

router.post(
  '/inscribir-nivel',
  verificarAuth,
  verificarRol('director', 'admin'),
  inscribirNivelCompleto
);

router.delete(
  '/:estudiante_id/clase/:clase_id',
  verificarAuth,
  verificarRol('director', 'admin'),
  desinscribirEstudiante
);

module.exports = router;
