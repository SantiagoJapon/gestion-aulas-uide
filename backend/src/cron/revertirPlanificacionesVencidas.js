/**
 * Cron: reversión automática de borradores reabiertos que vencieron.
 *
 * Implementa la regla 3.2 del módulo de planificación colaborativa: si un
 * director reabre su planificación y no vuelve a confirmarla antes de la
 * fecha límite vigente, sus bloques no pueden quedar huérfanos en
 * EN_REVISION indefinidamente — vuelven a su última versión CONFIRMADO
 * conocida (snapshot en bloques_disponibilidad.*_confirmad*), o se liberan
 * si nunca tuvieron una.
 *
 * La lógica vive en planificacionCarrera.service.revertirBorradoresVencidos();
 * este archivo es solo el disparador. Corre cada hora desde src/index.js y
 * también se puede invocar a mano:
 *
 *   node src/cron/revertirPlanificacionesVencidas.js
 *
 * Es idempotente: una segunda corrida no encuentra bloques EN_REVISION
 * vencidos porque la primera ya los resolvió.
 */

const planificacionCarreraService = require('../services/planificacionCarrera.service');

const revertirPlanificacionesVencidas = async () => {
  try {
    const resultados = await planificacionCarreraService.revertirBorradoresVencidos();

    if (resultados.length === 0) return resultados;

    const totalRestaurados = resultados.reduce((acc, r) => acc + r.restaurados.length, 0);
    const totalLiberados = resultados.reduce((acc, r) => acc + r.liberados.length, 0);
    console.log(
      `[CRON] Reversión por vencimiento: ${resultados.length} flujo(s) procesado(s), ` +
      `${totalRestaurados} bloque(s) restaurado(s), ${totalLiberados} liberado(s)`
    );

    return resultados;
  } catch (error) {
    console.error('[CRON] Error al revertir planificaciones vencidas:', error.message);
    return [];
  }
};

if (require.main === module) {
  const { testConnection } = require('../config/database');
  testConnection()
    .then(() => revertirPlanificacionesVencidas())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = revertirPlanificacionesVencidas;
