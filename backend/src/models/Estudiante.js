const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Estudiante = sequelize.define('Estudiante', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cedula: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  escuela: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  nivel: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  edad: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  telegram_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  fecha_registro: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'estudiantes',
  timestamps: false
});

module.exports = Estudiante;
