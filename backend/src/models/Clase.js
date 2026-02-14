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
      model: 'uploads_carreras',
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
    type: DataTypes.STRING,  // Cambiado de INTEGER a STRING para almacenar código de aula (ej: "A-01")
    allowNull: true
  },
  aula_sugerida: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nombre_archivo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  periodo_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'periodos',
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
  materia_catalogo_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'materias_catalogo',
      key: 'id'
    }
  }
}, {
  tableName: 'clases',
  timestamps: false,
  indexes: [
    { fields: ['dia'] },
    { fields: ['hora_inicio'] },
    { fields: ['hora_fin'] },
    { fields: ['aula_asignada'] },
    { fields: ['docente_id'] }
  ]
});

module.exports = Clase;
