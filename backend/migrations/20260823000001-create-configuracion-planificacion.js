'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('configuracion_planificacion', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      periodo_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'periodos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      fecha_inicio_global: { type: Sequelize.DATEONLY, allowNull: true },
      fecha_fin_global: { type: Sequelize.DATEONLY, allowNull: true },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      fecha_asignacion: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      asignado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
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
    await queryInterface.addIndex('configuracion_planificacion', ['periodo_id']);
    await queryInterface.addIndex('configuracion_planificacion', ['activo']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('configuracion_planificacion');
  },
};