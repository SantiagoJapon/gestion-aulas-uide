const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlanificacionSubida = sequelize.define('PlanificacionSubida', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  carrera_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'carreras',
      key: 'id'
    }
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  nombre_archivo_original: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nombre_archivo_guardado: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ruta_archivo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  total_clases: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  estado: {
    type: DataTypes.STRING,
    defaultValue: 'procesado' // procesado, error, pendiente
  }
}, {
  tableName: 'planificaciones_subidas',
  timestamps: true,
  createdAt: 'fecha_subida',
  updatedAt: false
});

module.exports = PlanificacionSubida;
