'use strict';

// ============================================================
// B2 — Snapshot de la última versión CONFIRMADO de cada bloque.
//
// La regla 3.2 del informe dice: si un director reabre el borrador y no
// vuelve a confirmar antes del vencimiento del plazo, el sistema debe
// revertir automáticamente esos bloques "a su última versión CONFIRMADO
// conocida".
//
// Esa versión no existía en ningún lado. `flujo_planificacion_versiones`
// guarda numero_version / estado_resultante / creado_por, pero NO las
// asignaciones (aula, día, hora). Y reabrirBorrador() hace
// UPDATE ... SET estado = 'EN_REVISION' directamente sobre el bloque, así
// que la información necesaria para revertir se destruía en el mismo
// momento en que iba a hacer falta.
//
// Estas cuatro columnas son un snapshot, NO una segunda fuente de verdad:
// las columnas vivas (aula_id, dia, hora_inicio, hora_fin) siguen siendo
// la única respuesta a "dónde está esta clase ahora". El snapshot solo
// responde "dónde estaba la última vez que quedó CONFIRMADO", y únicamente
// lo lee el job de reversión.
//
// Backfill: los bloques que hoy ya están CONFIRMADO se consideran su
// propia última versión confirmada, que es exactamente lo que son.
// ============================================================

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'bloques_disponibilidad',
        'aula_id_confirmada',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'aulas', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Snapshot: aula de la última versión CONFIRMADO. Solo lo lee el job de reversión (regla 3.2).',
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'bloques_disponibilidad',
        'dia_confirmado',
        { type: Sequelize.STRING(20), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'bloques_disponibilidad',
        'hora_inicio_confirmada',
        { type: Sequelize.TIME, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'bloques_disponibilidad',
        'hora_fin_confirmada',
        { type: Sequelize.TIME, allowNull: true },
        { transaction }
      );

      // Backfill: lo que ya está CONFIRMADO es su propia última versión.
      await sequelize.query(
        `
        UPDATE bloques_disponibilidad
           SET aula_id_confirmada     = aula_id,
               dia_confirmado         = dia,
               hora_inicio_confirmada = hora_inicio,
               hora_fin_confirmada    = hora_fin
         WHERE estado = 'CONFIRMADO';
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('bloques_disponibilidad', 'hora_fin_confirmada', { transaction });
      await queryInterface.removeColumn('bloques_disponibilidad', 'hora_inicio_confirmada', { transaction });
      await queryInterface.removeColumn('bloques_disponibilidad', 'dia_confirmado', { transaction });
      await queryInterface.removeColumn('bloques_disponibilidad', 'aula_id_confirmada', { transaction });
    });
  },
};
