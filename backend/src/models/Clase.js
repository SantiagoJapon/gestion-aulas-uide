const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Clase = sequelize.define('Clase', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  carrera_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'carreras',
      key: 'id'
    }
  },
  carrera: {
    type: DataTypes.STRING,
    allowNull: false
  },
  materia: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ciclo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paralelo: {
    type: DataTypes.STRING,
    defaultValue: 'A'
  },
  dia: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hora_inicio: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hora_fin: {
    type: DataTypes.STRING,
    allowNull: true
  },
  num_estudiantes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  docente: {
    type: DataTypes.STRING,
    allowNull: true
  },
  aula_asignada: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'clases',
  timestamps: false
});

module.exports = Clase;
