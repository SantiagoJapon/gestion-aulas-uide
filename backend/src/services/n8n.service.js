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
      console.log('📤 Enviando planificación a n8n...');

      const response = await axios.post(
        `${N8N_WEBHOOK_URL}/procesar-planificacion`,
        {
          planificacion_id: planificacionData.id,
          carrera_id: planificacionData.carrera_id,
          periodo: planificacionData.periodo,
          archivo_url: planificacionData.archivo_url,
          datos: planificacionData.datos_procesados,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 segundos para procesamiento
        }
      );

      console.log('✅ n8n respondió exitosamente');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error al enviar a n8n:', error.message);

      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          'n8n no está disponible. Verifica que esté corriendo.'
        );
      }

      if (error.response) {
        throw new Error(
          `n8n error: ${error.response.status} - ${JSON.stringify(
            error.response.data
          )}`
        );
      }

      throw new Error('Error al comunicarse con n8n');
    }
  }

  /**
   * Solicitar asignación automática de aulas
   * @param {Object} data - Materias y restricciones
   * @returns {Promise<Object>}
   */
  static async asignarAulas(data) {
    try {
      console.log('🤖 Solicitando asignación automática de aulas...');

      const response = await axios.post(
        `${N8N_WEBHOOK_URL}/asignar-aulas`,
        {
          materias: data.materias,
          aulas_disponibles: data.aulas_disponibles,
          restricciones: data.restricciones,
          periodo: data.periodo,
          carrera_id: data.carrera_id,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minutos para asignación compleja
        }
      );

      console.log('✅ Asignación completada');
      return {
        success: true,
        asignaciones: response.data.asignaciones,
        conflictos: response.data.conflictos || [],
        metricas: response.data.metricas,
      };
    } catch (error) {
      console.error('❌ Error en asignación automática:', error.message);
      throw new Error('Error al asignar aulas con IA');
    }
  }

  /**
   * Extraer datos de archivo Excel con IA
   * @param {String} fileContent - Contenido del archivo
   * @returns {Promise<Object>}
   */
  static async extractDataFromFile(fileContent) {
    try {
      console.log('🔍 Extrayendo datos con IA...');

      const response = await axios.post(
        `${N8N_WEBHOOK_URL}/extraer-datos-excel`,
        {
          content: fileContent,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 90000, // 90 segundos para extracción
        }
      );

      console.log('✅ Datos extraídos exitosamente');
      return {
        success: true,
        materias: response.data.materias,
        metadata: response.data.metadata,
      };
    } catch (error) {
      console.error('❌ Error al extraer datos:', error.message);
      throw new Error('Error al extraer datos del archivo');
    }
  }

  /**
   * Verificar salud de n8n
   * @returns {Promise<Boolean>}
   */
  static async healthCheck() {
    try {
      // Intentar hacer ping a n8n (/healthz)
      const baseUrl = N8N_WEBHOOK_URL.replace('/webhook', '');
      const response = await axios.get(`${baseUrl}/healthz`, {
        timeout: 5000,
      });

      return response.status === 200;
    } catch (error) {
      // Si el endpoint /healthz no existe, intentar con webhook base
      try {
        await axios.get(N8N_WEBHOOK_URL, { timeout: 5000 });
        return true;
      } catch (err) {
        console.error('n8n health check failed:', err.message);
        return false;
      }
    }
  }

  /**
   * Obtener estado de un workflow
   * @param {String} executionId - ID de ejecución
   * @returns {Promise<Object>}
   */
  static async getWorkflowStatus(executionId) {
    try {
      const response = await axios.get(
        `${N8N_WEBHOOK_URL}/status/${executionId}`,
        { timeout: 5000 }
      );

      return {
        success: true,
        status: response.data.status,
        progress: response.data.progress,
        result: response.data.result,
      };
    } catch (error) {
      console.error(
        'Error al obtener estado del workflow:',
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Notificar a n8n sobre un evento
   * @param {String} event - Tipo de evento
   * @param {Object} data - Datos del evento
   */
  static async notifyEvent(event, data) {
    try {
      await axios.post(
        `${N8N_WEBHOOK_URL}/eventos`,
        {
          event,
          data,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      console.log(`📢 Evento '${event}' enviado a n8n`);
    } catch (error) {
      // No lanzar error, solo loguear
      console.warn(
        `⚠️ No se pudo notificar evento a n8n: ${error.message}`
      );
    }
  }

  /**
   * Obtener estado de distribución desde n8n
   * @returns {Promise<Object>}
   */
  static async getDistribucionEstado() {
    try {
      const response = await axios.get(
        `${N8N_WEBHOOK_URL}/admin/estado-distribucion`,
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      console.error('Error al obtener estado de distribución:', error.message);
      throw new Error('No se pudo obtener el estado de distribución');
    }
  }

  /**
   * Forzar distribución manualmente en n8n
   * @param {string|null} authHeader - Authorization header opcional
   * @returns {Promise<Object>}
   */
  static async forzarDistribucion(authHeader = null) {
    try {
      const response = await axios.post(
        `${N8N_WEBHOOK_URL}/admin/forzar-distribucion`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {})
          },
          timeout: 20000
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error al forzar distribución:', error.message);
      throw new Error('No se pudo forzar la distribución');
    }
  }
}

module.exports = N8nService;

















