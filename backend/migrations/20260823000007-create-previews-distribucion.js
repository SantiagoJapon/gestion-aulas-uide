'use strict';

// ============================================================
// I4 — El preview de la distribución general no existía como entidad.
//
// El contrato de §5.3 define `aprobar { preview_id }`, pero el endpoint
// de aplicar tomaba `req.body.propuestas`: un array arbitrario del
// cliente, sin vínculo con ningún cálculo previo. El servicio revalida el
// estado de cada bloque antes de escribir (así que nunca podía pisar un
// CONFIRMADO), pero un cliente podía escribir cualquier aula/día/hora
// sobre bloques LIBRE saltándose el motor heurístico por completo.
//
// Guardar el preview cierra eso y trae tres cosas más:
//  - Idempotencia: aplicar dos veces el mismo preview no duplica trabajo,
//    la segunda vez se rechaza por estado.
//  - Evidencia: queda registrado qué se le mostró al admin cuando aprobó,
//    no solo qué se escribió después.
//  - Diagnóstico: si el resultado no coincide con lo previsto, se puede
//    comparar el payload contra lo que quedó en la base.
//
// El payload va completo en JSONB (propuestas + sin_cambios + sin_asignar)
// porque las tres listas juntas son lo que el admin vio. Guardar solo las
// propuestas perdería justamente la evidencia que §3.4 pide mostrar.
// ============================================================

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('previews_distribucion', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      carrera_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'uploads_carreras', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'NULL = corrida institucional (todas las carreras).',
      },
      periodo_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'periodos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Snapshot de lo que se le mostró al admin: propuestas, sinCambios, sinAsignar, estadisticas.',
      },

      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'PENDIENTE',
        comment: 'PENDIENTE | APLICADO | DESCARTADO',
      },

      creado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      aplicado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      aplicado_en: { type: Sequelize.DATE, allowNull: true },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('previews_distribucion', ['estado']);
    await queryInterface.addIndex('previews_distribucion', ['carrera_id', 'periodo_id']);
    await queryInterface.addIndex('previews_distribucion', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('previews_distribucion');
  },
};
