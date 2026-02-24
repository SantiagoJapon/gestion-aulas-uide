const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Modelo de Distribucion
 * Representa la asignación final de aulas a clases
 */
const Distribucion = sequelize.define('Distribucion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clase_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'clases',
      key: 'id'
    }
  },
  aula_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'aulas',
      key: 'id'
    }
  },
  dia: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  hora_inicio: {
    type: DataTypes.TIME,
    allowNull: false
  },
  hora_fin: {
    type: DataTypes.TIME,
    allowNull: false
  },
  fecha_asignacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'distribucion',
  timestamps: false,
  indexes: [
    {
      name: 'idx_distribucion_clase',
      fields: ['clase_id']
    },
    {
      name: 'idx_distribucion_aula',
      fields: ['aula_id']
    },
    {
      name: 'idx_distribucion_horario',
      fields: ['dia', 'hora_inicio', 'hora_fin']
    }
  ]
});

module.exports = Distribucion;
