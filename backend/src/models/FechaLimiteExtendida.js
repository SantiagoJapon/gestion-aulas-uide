const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Extensión de fecha límite por carrera individual. Nunca sobrescribe
 * la fecha límite general (FlujoPlanificacion.fecha_limite) — queda
 * registrada aquí; el servicio de negocio decide cuál fecha aplica
 * (la más reciente extensión vigente del mismo período, si existe).
 *
 * periodo_id acota la extensión al período en que se concedió. Sin él,
 * una extensión de 2025-1 seguía siendo la fecha vigente en todos los
 * períodos posteriores y la carrera quedaba con el plazo abierto para
 * siempre.
 */
const FechaLimiteExtendida = sequelize.define('FechaLimiteExtendida', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  carrera_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'uploads_carreras',
      key: 'id'
    }
  },
  periodo_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'periodos',
      key: 'id'
    }
  },
  nueva_fecha: {
    type: DataTypes.DATE,
    allowNull: false
  },
  autorizado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  }
}, {
  tableName: 'fechas_limite_extendidas',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['carrera_id'] },
    { fields: ['carrera_id', 'periodo_id'], name: 'idx_fechas_limite_carrera_periodo' }
  ]
});

module.exports = FechaLimiteExtendida;
