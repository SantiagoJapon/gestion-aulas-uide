// ============================================================
// Controller: Planificación colaborativa por carrera (Fase 4)
// ============================================================
// Expone vía HTTP la máquina de estados de planificacionCarrera.service.js
// y la distribución "fill the gaps" de distribucion.service.js. RBAC usa
// el mecanismo JWT/verificarRol ya existente (auth.js) — sin sistema de
// permisos paralelo. Un director solo puede operar sobre carreras que
// tiene asignadas (usuario.carreraIds, resuelto por el middleware auth);
// un admin puede operar sobre cualquiera.
// ============================================================

const planificacionCarreraService = require('../services/planificacionCarrera.service');
const distribucionService = require('../services/distribucion.service');
const { Clase, FlujoPlanificacion, BloqueDisponibilidad, Carrera } = require('../models');

function verificarPropiedadCarrera(usuario, carreraId) {
  if (usuario.rol === 'admin') return true;
  if (usuario.rol === 'director') {
    const carreraIds = usuario.carreraIds || [];
    return carreraIds.includes(Number(carreraId));
  }
  return false;
}

/**
 * Los errores lanzados por el servicio son siempre mensajes de negocio
 * claros (estado inválido, motivo faltante, fecha vencida, conflicto de
 * último momento, etc.) — se devuelven tal cual como 400. "No encontrado"
 * se distingue por el texto del mensaje para devolver 404.
 */
function mapearError(res, error, contexto) {
  console.error(`❌ [planificacionCarrera] ${contexto}:`, error.message);
  const esNotFound = /no encontrad|no existe/i.test(error.message);
  return res.status(esNotFound ? 404 : 400).json({ success: false, error: error.message });
}

// ============================================
// Director (o admin) — sobre una carrera propia
// ============================================

exports.reabrirBorrador = async (req, res) => {
  try {
    const { carreraId } = req.params;
    if (!verificarPropiedadCarrera(req.usuario, carreraId)) {
      return res.status(403).json({ success: false, error: 'No tiene permiso sobre esta carrera' });
    }
    const { periodoId = null } = req.body;
    const flujo = await planificacionCarreraService.reabrirBorrador({
      carreraId: Number(carreraId),
      periodoId,
      usuarioId: req.usuarioId,
    });
    res.json({ success: true, flujo });
  } catch (error) {
    mapearError(res, error, 'reabrirBorrador');
  }
};

exports.sugerirAula = async (req, res) => {
  try {
    const { carreraId } = req.params;
    if (!verificarPropiedadCarrera(req.usuario, carreraId)) {
      return res.status(403).json({ success: false, error: 'No tiene permiso sobre esta carrera' });
    }
    const { claseId } = req.body;
    if (!claseId) {
      return res.status(400).json({ success: false, error: 'claseId es requerido' });
    }
    const clase = await Clase.findByPk(claseId);
    if (!clase) {
      return res.status(404).json({ success: false, error: 'Clase no encontrada' });
    }
    if (Number(clase.carrera_id) !== Number(carreraId)) {
      return res.status(403).json({ success: false, error: 'La clase no pertenece a esta carrera' });
    }

    const resultado = await planificacionCarreraService.sugerirAula({ clase, excluirClaseId: clase.id });
    if (!resultado) {
      return res.json({ success: true, sugerencia: null, mensaje: 'Sin aulas disponibles en ese horario' });
    }
    res.json({
      success: true,
      sugerencia: {
        aulaId: resultado.aula.id,
        aulaCodigo: resultado.aula.codigo,
        isOvercapacity: !!resultado.isOvercapacity,
      },
    });
  } catch (error) {
    mapearError(res, error, 'sugerirAula');
  }
};

exports.enviarPlanificacion = async (req, res) => {
  try {
    const { carreraId } = req.params;
    if (!verificarPropiedadCarrera(req.usuario, carreraId)) {
      return res.status(403).json({ success: false, error: 'No tiene permiso sobre esta carrera' });
    }
    const { periodoId = null, bloques } = req.body;
    if (!Array.isArray(bloques) || bloques.length === 0) {
      return res.status(400).json({ success: false, error: 'bloques debe ser un array no vacío' });
    }
    const resultado = await planificacionCarreraService.enviarPlanificacion({
      carreraId: Number(carreraId),
      periodoId,
      usuarioId: req.usuarioId,
      bloques,
    });
    res.json({ success: true, ...resultado });
  } catch (error) {
    mapearError(res, error, 'enviarPlanificacion');
  }
};

exports.confirmarPlanificacion = async (req, res) => {
  try {
    const { carreraId } = req.params;
    if (!verificarPropiedadCarrera(req.usuario, carreraId)) {
      return res.status(403).json({ success: false, error: 'No tiene permiso sobre esta carrera' });
    }
    const { periodoId = null } = req.body;
    const flujo = await planificacionCarreraService.confirmarPlanificacion({
      carreraId: Number(carreraId),
      periodoId,
      usuarioId: req.usuarioId,
    });
    res.json({ success: true, flujo });
  } catch (error) {
    mapearError(res, error, 'confirmarPlanificacion');
  }
};

exports.obtenerEstado = async (req, res) => {
  try {
    const { carreraId } = req.params;
    if (!verificarPropiedadCarrera(req.usuario, carreraId)) {
      return res.status(403).json({ success: false, error: 'No tiene permiso sobre esta carrera' });
    }
    const periodoId = req.query.periodoId || null;
    const flujo = await FlujoPlanificacion.findOne({
      where: { carrera_id: Number(carreraId), periodo_id: periodoId },
      include: [{ model: Carrera, as: 'carrera', attributes: ['id', 'carrera'] }],
    });
    const bloques = flujo
      ? await BloqueDisponibilidad.findAll({ where: { flujo_planificacion_id: flujo.id } })
      : [];
    res.json({ success: true, flujo, bloques });
  } catch (error) {
    mapearError(res, error, 'obtenerEstado');
  }
};

// ============================================
// Admin exclusivo
// ============================================

exports.extenderFechaLimite = async (req, res) => {
  try {
    const { carreraId } = req.params;
    const { nuevaFecha, periodoId = null } = req.body;
    if (!nuevaFecha) {
      return res.status(400).json({ success: false, error: 'nuevaFecha es requerida' });
    }
    const registro = await planificacionCarreraService.extenderFechaLimite({
      carreraId: Number(carreraId),
      periodoId: periodoId === null ? null : Number(periodoId),
      nuevaFecha,
      adminId: req.usuarioId,
    });
    res.status(201).json({ success: true, registro });
  } catch (error) {
    mapearError(res, error, 'extenderFechaLimite');
  }
};

exports.detectarCarrerasSinEnviar = async (req, res) => {
  try {
    const periodoId = req.query.periodoId || null;
    const vencidas = await planificacionCarreraService.detectarCarrerasSinEnviar({ periodoId });
    res.json({ success: true, vencidas });
  } catch (error) {
    mapearError(res, error, 'detectarCarrerasSinEnviar');
  }
};

exports.calcularFillGaps = async (req, res) => {
  try {
    const carreraId = req.body.carreraId || req.query.carreraId || null;
    // periodoId ausente = cálculo transversal (comportamiento histórico).
    // Enviar `periodoId: null` acota explícitamente a las clases sin período.
    const periodoRaw = req.body.periodoId !== undefined ? req.body.periodoId : req.query.periodoId;
    const periodoId = periodoRaw === undefined
      ? undefined
      : (periodoRaw === null || periodoRaw === '' || periodoRaw === 'null' ? null : Number(periodoRaw));

    // Guarda el preview y devuelve su id: aplicar ya no acepta un array
    // suelto del cliente, referencia este cálculo (§5.3).
    const resultado = await planificacionCarreraService.crearPreviewDistribucion({
      carreraId: carreraId ? Number(carreraId) : null,
      periodoId,
      adminId: req.usuarioId,
    });
    res.json({ success: true, periodoId: periodoId === undefined ? null : periodoId, ...resultado });
  } catch (error) {
    mapearError(res, error, 'calcularFillGaps');
  }
};

exports.aplicarFillGaps = async (req, res) => {
  try {
    // Solo previewId. Aceptar un array de propuestas del cliente permitía
    // escribir aula/día/hora arbitrarios sobre bloques LIBRE sin pasar por
    // el motor heurístico — el agujero que §5.3 cierra con preview_id.
    const { previewId } = req.body;
    if (!previewId) {
      return res.status(400).json({
        success: false,
        error: 'previewId es requerido. Calcule la distribución primero para obtenerlo.',
      });
    }
    const resultado = await planificacionCarreraService.aplicarPreviewDistribucion({
      previewId: Number(previewId),
      adminId: req.usuarioId,
    });
    res.json({ success: true, ...resultado });
  } catch (error) {
    mapearError(res, error, 'aplicarFillGaps');
  }
};

exports.reasignacionExcepcional = async (req, res) => {
  try {
    const { bloqueId, motivo, nuevaAulaId, nuevoDia, nuevaHoraInicio, nuevaHoraFin } = req.body;
    if (!bloqueId) {
      return res.status(400).json({ success: false, error: 'bloqueId es requerido' });
    }
    const resultado = await planificacionCarreraService.reasignacionExcepcional({
      bloqueId,
      adminId: req.usuarioId,
      motivo,
      nuevaAulaId,
      nuevoDia,
      nuevaHoraInicio,
      nuevaHoraFin,
    });
    res.json({ success: true, ...resultado });
  } catch (error) {
    mapearError(res, error, 'reasignacionExcepcional');
  }
};

/**
 * Métricas agregadas de trazabilidad (regla 7): conteos y tasas de
 * conflictos, reasignaciones excepcionales y cambios de bloque por origen.
 * Alimenta los resultados reportables del proyecto.
 */
exports.metricasTrazabilidad = async (req, res) => {
  try {
    // periodoId ausente = todas las corridas históricas.
    const periodoRaw = req.query.periodoId;
    const periodoId = periodoRaw === undefined
      ? undefined
      : (periodoRaw === '' || periodoRaw === 'null' ? null : Number(periodoRaw));
    const carreraId = req.query.carreraId ? Number(req.query.carreraId) : null;

    const metricas = await planificacionCarreraService.obtenerMetricasTrazabilidad({ periodoId, carreraId });
    res.json({ success: true, metricas });
  } catch (error) {
    mapearError(res, error, 'metricasTrazabilidad');
  }
};

/** Historial de cambios de un bloque: quién lo movió, cuándo y desde dónde. */
exports.historialBloque = async (req, res) => {
  try {
    const { bloqueId } = req.params;
    const bloque = await BloqueDisponibilidad.findByPk(Number(bloqueId));
    if (!bloque) {
      return res.status(404).json({ success: false, error: 'Bloque no encontrado' });
    }

    // Un director solo ve el historial de bloques de sus carreras.
    if (req.usuario.rol !== 'admin') {
      const clase = await Clase.findByPk(bloque.clase_id);
      if (!clase || !verificarPropiedadCarrera(req.usuario, clase.carrera_id)) {
        return res.status(403).json({ success: false, error: 'No tiene permiso sobre esta carrera' });
      }
    }

    const historial = await planificacionCarreraService.obtenerHistorialBloque({ bloqueId: Number(bloqueId) });
    res.json({ success: true, historial });
  } catch (error) {
    mapearError(res, error, 'historialBloque');
  }
};

exports.crearFlujo = async (req, res) => {
  try {
    const { carreraId, periodoId, fechaLimite } = req.body;
    if (!carreraId) {
      return res.status(400).json({ success: false, error: 'carreraId es requerido' });
    }
    const flujo = await planificacionCarreraService.crearOActualizarFlujo({
      carreraId: Number(carreraId),
      periodoId: periodoId || null,
      fechaLimite: fechaLimite || null,
      adminId: req.usuarioId,
    });
    res.status(201).json({ success: true, flujo });
  } catch (error) {
    mapearError(res, error, 'crearFlujo');
  }
};
