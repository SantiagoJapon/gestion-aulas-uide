const express = require('express');
const router = express.Router();

const N8nService = require('../services/n8n.service');
const { verificarAuth, verificarRol } = require('../middleware/auth');

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
 * @route   POST /api/n8n/emit
 * @desc    Emitir evento a n8n (fire-and-forget)
 * @access  Private (admin)
 */
router.post('/emit', verificarAuth, verificarRol('admin'), async (req, res) => {
  try {
    const { eventType, payload } = req.body;

    if (!eventType) {
      return res.status(400).json({ success: false, message: 'eventType es requerido' });
    }

    N8nService.emit(eventType, payload || {});

    res.json({ success: true, message: 'Evento emitido a n8n' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al emitir evento',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/n8n/query
 * @desc    Consulta IA a n8n (request-response, bajo demanda)
 * @access  Private (admin)
 */
router.post('/query', verificarAuth, verificarRol('admin'), async (req, res) => {
  try {
    const { prompt, contexto } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'prompt es requerido' });
    }

    const result = await N8nService.query({ prompt, contexto });

    res.json({
      success: true,
      message: 'Consulta IA completada',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'n8n no disponible para consulta IA',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/n8n/retry
 * @desc    Reintentar eventos fallidos en cola Redis
 * @access  Private (admin)
 */
router.post('/retry', verificarAuth, verificarRol('admin'), async (req, res) => {
  try {
    const reenviados = await N8nService.retryFailedEvents();

    res.json({
      success: true,
      message: `${reenviados} eventos reenviados`,
      reenviados,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al reintentar eventos',
      error: error.message,
    });
  }
});

module.exports = router;
