const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Registro de auditoría de una reasignación excepcional del admin sobre
 * un bloque CONFIRMADO. `motivo` es obligatorio a nivel de modelo y de
 * negocio (nunca una rama condicional silenciosa dentro del flujo normal
 * de distribución — siempre pasa por este registro + notificación).
 */
const ReasignacionExcepcional = sequelize.define('ReasignacionExcepcional', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bloque_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'bloques_disponibilidad',
      key: 'id'
    }
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  motivo: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El motivo de la reasignación excepcional es obligatorio'
      }
    }
  }
}, {
  tableName: 'reasignaciones_excepcionales',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['bloque_id'] }
  ]
});

module.exports = ReasignacionExcepcional;
