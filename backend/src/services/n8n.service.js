const axios = require('axios');

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

class N8nService {
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
        {
          accion: 'subir_planificacion',
          carrera_id: planificacionData.carrera_id,
          periodo: planificacionData.periodo,
          archivo_url: planificacionData.archivo_url,
          archivo_base64: planificacionData.archivo_base64, // Soporte para base64
          nombre_archivo: planificacionData.nombre_archivo,
          timestamp: new Date().toISOString(),
        },
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
   * Enviar alumnos a n8n para procesamiento con IA
   * @param {string} archivoBase64 - Excel en base64
   * @returns {Promise<Object>}
   */
  static async subirEstudiantes(archivoBase64) {
    try {
      console.log('📤 Enviando estudiantes a n8n Maestro (subir_estudiantes)...');
      const response = await axios.post(
        `${N8N_WEBHOOK_URL}/maestro`,
        {
          accion: 'subir_estudiantes',
          archivo_base64: archivoBase64,
          timestamp: new Date().toISOString(),
        },
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
        { accion: 'obtener_estado' },
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
        {
          accion: 'distribuir_aulas',
          carrera_id: carreraId
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 180000 // 3 minutos para distribución compleja
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
        {
          accion: 'notificar_director',
          datos: {
            nombre: datosDirector.nombre,
            telefono: datosDirector.telefono || null,
            password_temporal: datosDirector.password,
            carrera: datosDirector.carrera
          },
          timestamp: new Date().toISOString()
        },
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
    const response = await axios.post(
      `${N8N_WEBHOOK_URL}/maestro`,
      {
        accion: 'reporte_distribucion',
        carrera_id: datos.carrera_id || null,
        usuario_id: datos.usuario_id || null,
        estadisticas: datos.estadisticas,
        timestamp: datos.timestamp || new Date().toISOString()
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000   // 15 s — si n8n no responde, el .catch() del caller lo absorbe
      }
    );
    console.log('✅ n8n notificado de distribución completada');
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

















