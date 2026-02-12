const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HistorialCarga = sequelize.define('HistorialCarga', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  archivo_nombre: {
    type: DataTypes.STRING,
    allowNull: true
  },
  registros_procesados: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  estado: {
    type: DataTypes.STRING,
    defaultValue: 'pendiente'
  },
  fecha_carga: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  detalles: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'historial_cargas',
  timestamps: false,
  underscored: true
});

module.exports = HistorialCarga;
