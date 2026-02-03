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
  }
}, {
  tableName: 'materias_catalogo',
  timestamps: false
});

module.exports = MateriaCatalogo;
