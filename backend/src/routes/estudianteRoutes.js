const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  lookupEstudianteByEmail, 
  loginEstudianteByCedula, 
  subirEstudiantes,
  obtenerHistorialCargas
} = require('../controllers/estudianteController');
const { verificarAuth, verificarAdmin } = require('../middleware/auth');

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
  verificarAdmin,
  upload.single('archivo'),
  subirEstudiantes
);

/**
 * @route   GET /api/estudiantes/historial-cargas
 * @desc    Obtener historial de cargas de estudiantes
 * @access  Private (admin)
 */
router.get(
  '/historial-cargas',
  verificarAuth,
  verificarAdmin,
  obtenerHistorialCargas
);

module.exports = router;
