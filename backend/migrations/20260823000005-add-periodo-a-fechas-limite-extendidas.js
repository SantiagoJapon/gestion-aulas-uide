'use strict';

// ============================================================
// I1 — `fechas_limite_extendidas` no tenía periodo_id.
//
// _resolverFechaLimiteVigente() buscaba la extensión más reciente por
// carrera, sin ninguna noción de período. Una extensión concedida para
// 2025-1 seguía siendo la fecha límite vigente en 2026-1 y en todos los
// períodos siguientes, para siempre: la carrera quedaba con el plazo
// abierto de forma permanente y nunca disparaba las alertas de
// vencimiento ni la reversión automática.
//
// Backfill: las filas existentes se atribuyen al período del flujo de esa
// misma carrera, cuando hay uno solo y no es ambiguo. Si la carrera tiene
// varios flujos con períodos distintos, la fila queda con periodo_id NULL
// — que en el modelo nuevo significa "extensión para el flujo sin
// período", el caso por defecto del módulo hoy. No se inventa una
// atribución que podría reabrir un plazo en el período equivocado.
// ============================================================

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'fechas_limite_extendidas',
        'periodo_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'periodos', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Período al que aplica la extensión. NULL = flujo sin período.',
        },
        { transaction }
      );

      // Backfill conservador: solo cuando la carrera tiene exactamente un
      // período distinto entre sus flujos, y ese período no es NULL.
      await sequelize.query(
        `
        WITH periodo_unico AS (
          SELECT carrera_id, MIN(periodo_id) AS periodo_id
            FROM flujos_planificacion
           WHERE periodo_id IS NOT NULL
           GROUP BY carrera_id
          HAVING COUNT(DISTINCT periodo_id) = 1
        )
        UPDATE fechas_limite_extendidas f
           SET periodo_id = p.periodo_id
          FROM periodo_unico p
         WHERE f.carrera_id = p.carrera_id
           AND f.periodo_id IS NULL;
        `,
        { transaction }
      );

      await queryInterface.addIndex(
        'fechas_limite_extendidas',
        ['carrera_id', 'periodo_id'],
        { name: 'idx_fechas_limite_carrera_periodo', transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        'fechas_limite_extendidas',
        'idx_fechas_limite_carrera_periodo',
        { transaction }
      );
      await queryInterface.removeColumn('fechas_limite_extendidas', 'periodo_id', { transaction });
    });
  },
};
