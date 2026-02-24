const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const incidenciaController = require('../controllers/incidenciaController');
const { verificarAuth } = require('../middleware/auth');

// ── Multer diskStorage para fotos de evidencia ────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads/incidencias');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `inc_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'));
        }
    }
});

// ── Rutas ────────────────────────────────────────────────────────────────────
router.use(verificarAuth);

router.post('/', upload.single('foto'), incidenciaController.crearIncidencia);
router.get('/', incidenciaController.listarIncidencias);
router.put('/:id/estado', incidenciaController.actualizarEstado);

module.exports = router;
