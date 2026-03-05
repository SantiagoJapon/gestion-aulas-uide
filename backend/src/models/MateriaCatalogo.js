const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MateriaCatalogo = sequelize.define('MateriaCatalogo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigo: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  codigo_anthology: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  nombre: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  ciclo: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  creditos: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  horas_teoricas: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  horas_practicas: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  carrera_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'uploads_carreras',
      key: 'id'
    }
  },
  docente_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'docentes',
      key: 'id'
    }
  },
  docente_nombre: {
    type: DataTypes.STRING(200),
    allowNull: true
  }
}, {
  tableName: 'materias_catalogo',
  timestamps: false,
  indexes: [
    { fields: ['carrera_id'] },
    { fields: ['nombre'] }
  ]
});

module.exports = MateriaCatalogo;
