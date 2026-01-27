const express = require('express');
const router = express.Router();

const N8nService = require('../services/n8n.service');
const { verificarAuth } = require('../middleware/auth');

/**
 * @route   GET /api/n8n/health
 * @desc    Verificar que n8n está disponible
 * @access  Private
 */
router.get('/health', verificarAuth, async (req, res) => {
  try {
    const isHealthy = await N8nService.healthCheck();

    res.json({
      success: isHealthy,
      message: isHealthy ? 'n8n está disponible' : 'n8n no responde',
      n8n_url: process.env.N8N_WEBHOOK_URL,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al verificar n8n',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/n8n/test/extract
 * @desc    Probar extracción de datos con IA
 * @access  Private
 */
router.post('/test/extract', verificarAuth, async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el campo "texto" para procesar',
      });
    }

    const result = await N8nService.extractDataFromFile(texto);

    res.json({
      success: true,
      message: 'Extracción completada',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al extraer datos',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/n8n/test/asignar
 * @desc    Probar asignación automática
 * @access  Private
 */
router.post('/test/asignar', verificarAuth, async (req, res) => {
  try {
    const { materias, aulas_disponibles } = req.body;

    if (!materias || !aulas_disponibles) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren materias y aulas_disponibles',
      });
    }

    const result = await N8nService.asignarAulas({
      materias,
      aulas_disponibles,
      restricciones: req.body.restricciones || {},
      periodo: req.body.periodo || '2025-1',
      carrera_id: req.body.carrera_id,
    });

    res.json({
      success: true,
      message: 'Asignación completada',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en asignación automática',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/n8n/notify
 * @desc    Enviar notificación de evento a n8n
 * @access  Private
 */
router.post('/notify', verificarAuth, async (req, res) => {
  try {
    const { event, data } = req.body;

    await N8nService.notifyEvent(event, data);

    res.json({
      success: true,
      message: 'Notificación enviada',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/n8n/status/:executionId
 * @desc    Obtener estado de una ejecución
 * @access  Private
 */
router.get('/status/:executionId', verificarAuth, async (req, res) => {
  try {
    const { executionId } = req.params;

    const status = await N8nService.getWorkflowStatus(executionId);

    res.json(status);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado',
      error: error.message,
    });
  }
});

module.exports = router;


