'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('flujos_planificacion', 'configuracion_planificacion_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'configuracion_planificacion', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('flujos_planificacion', ['configuracion_planificacion_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('flujos_planificacion', 'configuracion_planificacion_id');
  },
};