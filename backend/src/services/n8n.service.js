const axios = require('axios');
const crypto = require('crypto');

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

// Versión del contrato de eventos. Ver n8n/CONTRATO-EVENTOS.md
const CONTRATO_VERSION = 'v1';

class N8nService {
  /**
   * Construye el envelope común de todos los eventos según el contrato.
   * @param {string} accion - nombre del evento
   * @param {Object} extra - campos específicos del evento
   */
  static _envelope(accion, extra = {}) {
    return {
      version: CONTRATO_VERSION,
      accion,
      evento_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...extra
    };
  }
  /**
   * Enviar planificación a n8n para procesamiento con IA
   * @param {Object} planificacionData - Datos de la planificación
   * @returns {Promise<Object>} - Resultado del procesamiento
   */
  static async processPlanificacion(planificacionData) {
    try {
      console.log('📤 Enviando planificación a n8n Maestro (subir_planificacion)...');

      const response = await axios.post(
        `${N8N_WEBHOOK_URL}/maestro`,
        this._envelope('subir_planificacion', {
          carrera_id: planificacionData.carrera_id,
          periodo: planificacionData.periodo,
          archivo_url: planificacionData.archivo_url,
          archivo_base64: planificacionData.archivo_base64, // Soporte para base64
          nombre_archivo: planificacionData.nombre_archivo,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 90000,
        }
      );

      console.log('✅ n8n (Planificación) respondió exitosamente');
      return response.data;
    } catch (error) {
      console.error('❌ Error al enviar planificación a n8n:', error.message);
      throw error;
    }
  }

  /**
   * @deprecated NO USAR. Los estudiantes se parsean de forma determinista en
   * estudianteController.subirEstudiantes (ruta POST /api/estudiantes/subir),
   * sin IA y sin costo. Este método con GPT-4o quedó como código muerto.
   * Se conserva solo por compatibilidad; será removido en una versión futura.
   *
   * @param {string} archivoBase64 - Excel en base64
   * @returns {Promise<Object>}
   */
  static async subirEstudiantes(archivoBase64) {
    try {
      console.log('📤 Enviando estudiantes a n8n Maestro (subir_estudiantes)...');
      const response = await axios.post(
        `${N8N_WEBHOOK_URL}/maestro`,
        this._envelope('subir_estudiantes', {
          archivo_base64: archivoBase64,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000,
        }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Error enviando estudiantes a n8n:', error.message);
      throw error;
    }
  }

  /**
   * Obtener estado de distribución desde el Maestro de n8n
   * @returns {Promise<Object>}
   */
  static async getDistribucionEstado() {
    try {
      const response = await axios.post(
        `${N8N_WEBHOOK_URL}/maestro`,
        this._envelope('obtener_estado'),
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      console.error('Error al obtener estado desde n8n Maestro:', error.message);
      throw new Error('No se pudo obtener el estado de distribución');
    }
  }

  /**
   * Ejecutar distribución de aulas via n8n (Maestro)
   * @returns {Promise<Object>}
   */
  static async ejecutarDistribucion(carreraId = null) {
    try {
      console.log(`📤 Enviando acción distribuir_aulas a n8n... ${carreraId ? `(Carrera: ${carreraId})` : ''}`);
      const response = await axios.post(
        `${N8N_WEBHOOK_URL}/maestro`,
        this._envelope('distribuir_aulas', {
          carrera_id: carreraId
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000 // 1 minuto — si n8n no responde, cae al algoritmo local
        }
      );
      console.log('✅ n8n completó la distribución');
      return response.data;
    } catch (error) {
      console.error('❌ Error al ejecutar distribución en n8n:', error.message);
      throw error;
    }
  }

  /**
   * Notificar a un director sus credenciales via WhatsApp (Evolution API a través de n8n)
   * @param {Object} datosDirector - Datos del director
   * @param {string} datosDirector.nombre - Nombre completo
   * @param {string} datosDirector.telefono - Número de teléfono WhatsApp
   * @param {string} datosDirector.password - Password temporal
   * @param {string} datosDirector.carrera - Nombre de la carrera asignada
   * @returns {Promise<Object>}
   */
  static async notificarDirector(datosDirector) {
    try {
      console.log(`📤 Enviando credenciales de director a n8n via WhatsApp (notificar_director)...`);
      const response = await axios.post(
        `${N8N_WEBHOOK_URL}/maestro`,
        this._envelope('notificar_director', {
          datos: {
            nombre: datosDirector.nombre,
            telefono: datosDirector.telefono || null,
            password_temporal: datosDirector.password,
            carrera: datosDirector.carrera
          }
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );
      console.log('✅ Credenciales de director enviadas a n8n');
      return response.data;
    } catch (error) {
      console.error('❌ Error al notificar director via n8n:', error.message);
      return null;
    }
  }

  /**
   * Notificar a n8n que una distribución se completó.
   * n8n usará GPT-4o para generar un reporte ejecutivo en lenguaje natural
   * y lo enviará al director de la carrera por WhatsApp.
   *
   * Este método es FIRE-AND-FORGET: el caller no debe await-arlo
   * y debe capturar el rechazo con .catch() para no propagar errores.
   *
   * @param {Object} datos
   * @param {number|null} datos.carrera_id
   * @param {number|null} datos.usuario_id
   * @param {Object} datos.estadisticas - { total, exitosas, fallidas, sobrecupos, eficiencia }
   * @param {string} datos.timestamp
   */
  static async notificarDistribucionCompletada(datos) {
    // El reporte se arma con TEMPLATE (costo $0). Solo se usa IA si
    // AI_REPORTE_DISTRIBUCION=true (apagado por defecto para controlar costo).
    const usarIa = String(process.env.AI_REPORTE_DISTRIBUCION).toLowerCase() === 'true';
    const mensaje = this.construirReporteDistribucion(datos.estadisticas || {});

    const response = await axios.post(
      `${N8N_WEBHOOK_URL}/maestro`,
      this._envelope('reporte_distribucion', {
        carrera_id: datos.carrera_id || null,
        usuario_id: datos.usuario_id || null,
        estadisticas: datos.estadisticas,
        mensaje,            // texto listo por template — n8n lo envía tal cual
        usar_ia: usarIa     // si false, n8n NO debe llamar a GPT
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000   // 15 s — si n8n no responde, el .catch() del caller lo absorbe
      }
    );
    console.log(`✅ n8n notificado de distribución completada (IA: ${usarIa ? 'sí' : 'no, template'})`);
    return response.data;
  }

  /**
   * Construye el reporte de distribución con un template determinista ($0).
   * Genera un texto en lenguaje natural a partir de las estadísticas, sin IA.
   * @param {Object} est - { total, exitosas, fallidas, sobrecupos, eficiencia }
   * @returns {string}
   */
  static construirReporteDistribucion(est) {
    const total = est.total || 0;
    const exitosas = est.exitosas || 0;
    const fallidas = est.fallidas || 0;
    const sobrecupos = est.sobrecupos || 0;
    const pct = total > 0 ? Math.round((exitosas / total) * 100) : 0;

    let texto =
      `📊 *Distribución de aulas completada*\n\n` +
      `Se asignaron *${exitosas} de ${total}* clases (${pct}%).\n` +
      `✅ Asignadas: ${exitosas}\n`;

    if (fallidas > 0) {
      texto += `⚠️ Sin aula: ${fallidas} (por choque de horario o falta de capacidad)\n`;
    }
    if (sobrecupos > 0) {
      texto += `🔴 Con sobrecupo: ${sobrecupos}\n`;
    }

    texto += fallidas === 0
      ? `\n🎉 Todas las clases quedaron asignadas correctamente.`
      : `\n📋 Revisa las clases sin aula en el panel de distribución.`;

    texto += `\n\n_UIDE · Sistema de Gestión de Aulas_`;
    return texto;
  }

  /**
   * Notificar a n8n un evento de reserva (creada/aprobada/rechazada).
   * n8n hace fan-out a WhatsApp + Email + notificación in-app.
   *
   * FIRE-AND-FORGET: el caller no debe await-arlo y debe usar .catch().
   * Ver contrato sección 3.3.
   *
   * @param {Object} datos
   * @param {string} datos.tipo - 'creada' | 'aprobada' | 'rechazada'
   * @param {Object} datos.reserva - datos de la reserva
   */
  static async notificarReserva(datos) {
    const response = await axios.post(
      `${N8N_WEBHOOK_URL}/maestro`,
      this._envelope('notificar_reserva', {
        tipo: datos.tipo,
        reserva: datos.reserva
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );
    console.log('✅ n8n notificado de reserva:', datos.tipo);
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
}

module.exports = N8nService;

















