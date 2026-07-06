const axios = require('axios');
const crypto = require('crypto');
const redisQueue = require('./redisQueue');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';
const CONTRATO_VERSION = 'v1';

class N8nService {
  static _envelope(tipo, extra = {}) {
    return {
      version: CONTRATO_VERSION,
      tipo,
      evento_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...extra,
      // Preservado DESPUÉS del spread: extra.tipo (ej. 'reserva_creada') sobreescribe
      // el 'tipo' de arriba a propósito (sub-tipo del evento), pero el path del
      // webhook de n8n (/notificacion, /reporte) debe seguir siendo el eventType
      // original — si no, retryFailedEvents() reenviaría al path equivocado.
      _webhookPath: tipo
    };
  }

  /**
   * Emitir evento a n8n (fire-and-forget).
   * Intenta HTTP POST directo (timeout 5s). Si falla, encola en Redis.
   * El caller NO debe await-arlo — siempre resuelve sin error.
   *
   * @param {string} eventType  - 'notificacion' | 'reporte'
   * @param {Object} payload    - datos del evento (tipo, datos, etc.)
   */
  static emit(eventType, payload) {
    const evento = this._envelope(eventType, payload);

    setTimeout(() => {
      axios.post(`${N8N_WEBHOOK_URL}/${eventType}`, evento, { timeout: 5000 })
        .then(() => console.log(`✅ n8n event ${eventType} entregado directo`))
        .catch(async (err) => {
          console.warn(`⚠️ n8n no disponible para ${eventType}, encolando: ${err.message}`);
          await redisQueue.push('n8n:events', evento);
        });
    }, 0);

    return undefined;
  }

  /**
   * Consulta IA a n8n (request-response).
   * Usado para consultas bajo demanda del admin.
   * @throws si n8n no responde en 30s
   */
  static async query(payload) {
    const response = await axios.post(
      `${N8N_WEBHOOK_URL}/ia-consulta`,
      this._envelope('ia_consulta', payload),
      { timeout: 30000 }
    );
    return response.data;
  }

  /**
   * Verificar salud de n8n
   */
  static async healthCheck() {
    try {
      const baseUrl = N8N_WEBHOOK_URL.split('/webhook')[0];
      const response = await axios.get(`${baseUrl}/healthz`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Reintentar eventos fallidos en la cola Redis.
   * Llamado por cron o al iniciar el backend.
   * @returns {Promise<number>} eventos reenviados
   */
  static async retryFailedEvents() {
    const total = await redisQueue.length('n8n:events');
    if (total === 0) return 0;

    console.log(`🔄 Reintentando ${total} eventos n8n en cola...`);
    let reenviados = 0;

    const pendientes = [];
    for (let i = 0; i < total; i++) {
      const evento = await redisQueue.pop('n8n:events', 1);
      if (evento) pendientes.push(evento);
    }

    for (const evento of pendientes) {
      try {
        const path = evento._webhookPath || evento.tipo;
        await axios.post(`${N8N_WEBHOOK_URL}/${path}`, evento, { timeout: 5000 });
        reenviados++;
      } catch (err) {
        await redisQueue.push('n8n:events', evento);
      }
    }

    console.log(`✅ ${reenviados}/${total} eventos n8n reenviados`);
    return reenviados;
  }

  /**
   * Construye el reporte de distribución con template determinista ($0).
   */
  static construirReporteDistribucion(est) {
    const total = est.total || 0;
    const exitosas = est.exitosas || 0;
    const pct = total > 0 ? Math.round((exitosas / total) * 100) : 0;

    let texto =
      `📊 *Distribución de aulas completada*\n\n` +
      `Se asignaron *${exitosas} de ${total}* clases (${pct}%).\n` +
      `✅ Asignadas: ${exitosas}\n`;

    if (est.fallidas > 0) {
      texto += `⚠️ Sin aula: ${est.fallidas} (por choque de horario o falta de capacidad)\n`;
    }
    if (est.sobrecupos > 0) {
      texto += `🔴 Con sobrecupo: ${est.sobrecupos}\n`;
    }

    texto += est.fallidas === 0
      ? `\n🎉 Todas las clases quedaron asignadas correctamente.`
      : `\n📋 Revisa las clases sin aula en el panel de distribución.`;

    texto += `\n\n_UIDE · Sistema de Gestión de Aulas_`;
    return texto;
  }

  /**
   * Construye el mensaje de WhatsApp para eventos de notificación de reserva,
   * diferenciado por tipo (mismo patrón que construirReporteDistribucion: el
   * backend arma el texto final, n8n solo lo reenvía).
   *
   * @param {string} tipo - 'reserva_creada' | 'reserva_aprobada' | 'reserva_rechazada'
   * @param {Object} reserva - payload de la reserva (forma de buildReservaPayload,
   *   o el objeto reducido que usa el cron de expiración — ambos son tolerados).
   */
  static construirMensajeNotificacion(tipo, reserva = {}) {
    const espacio = reserva.espacio || 'el espacio solicitado';
    const cuando = [reserva.fecha, (reserva.hora_inicio && reserva.hora_fin) ? `${reserva.hora_inicio} a ${reserva.hora_fin}` : null]
      .filter(Boolean)
      .join(' de ');
    const motivo = reserva.motivo || reserva.motivo_rechazo || null;

    switch (tipo) {
      case 'reserva_creada':
        return (
          `📝 *Nueva solicitud de reserva*\n\n` +
          `Espacio: *${espacio}*\n` +
          (cuando ? `Cuándo: ${cuando}\n` : '') +
          (reserva.solicitante_nombre ? `Solicitante: ${reserva.solicitante_nombre}${reserva.solicitante_rol ? ` (${reserva.solicitante_rol})` : ''}\n` : '') +
          (motivo ? `Motivo: ${motivo}\n` : '') +
          `\n_UIDE · Sistema de Gestión de Aulas_`
        );
      case 'reserva_aprobada':
        return (
          `✅ *Reserva aprobada*\n\n` +
          `Tu reserva de *${espacio}*${cuando ? ` el ${cuando}` : ''} ha sido aprobada.\n` +
          `\n_UIDE · Sistema de Gestión de Aulas_`
        );
      case 'reserva_rechazada':
        return (
          `❌ *Reserva rechazada*\n\n` +
          `Tu solicitud de *${espacio}*${cuando ? ` el ${cuando}` : ''} fue rechazada.\n` +
          (motivo ? `Motivo: ${motivo}\n` : '') +
          `\n_UIDE · Sistema de Gestión de Aulas_`
        );
      default:
        return `Actualización de reserva (${tipo}): ${espacio}${cuando ? ` - ${cuando}` : ''}`;
    }
  }
}

module.exports = N8nService;
