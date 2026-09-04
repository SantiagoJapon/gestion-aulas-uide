const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Historial de auditoría de cada transición de estado de un
 * FlujoPlanificacion. Una fila por cada envío/confirmación/reapertura.
 */
const FlujoPlanificacionVersion = sequelize.define('FlujoPlanificacionVersion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  flujo_planificacion_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'flujos_planificacion',
      key: 'id'
    }
  },
  numero_version: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  estado_resultante: {
    type: DataTypes.ENUM('BORRADOR', 'ENVIADA', 'CONFIRMADA'),
    allowNull: false
  },
  creado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  }
}, {
  tableName: 'flujo_planificacion_versiones',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['flujo_planificacion_id'] }
  ]
});

module.exports = FlujoPlanificacionVersion;
