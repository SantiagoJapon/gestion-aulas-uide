const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Conflicto detectado al validar un bloque contra bloques CONFIRMADO
 * de otras carreras. `sugerencia_ia` guarda la propuesta de alternativas
 * generada por el motor heurístico envuelto (nunca decide, solo propone).
 */
const ConflictoDeteccion = sequelize.define('ConflictoDeteccion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bloque_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bloques_disponibilidad',
      key: 'id'
    }
  },
  carrera_solicitante_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'uploads_carreras',
      key: 'id'
    }
  },
  resuelto: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  sugerencia_ia: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'conflictos_deteccion',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['bloque_id'] },
    { fields: ['resuelto'] }
  ]
});

module.exports = ConflictoDeteccion;
