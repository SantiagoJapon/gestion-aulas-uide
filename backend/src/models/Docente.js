const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Docente = sequelize.define('Docente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  titulo_pregrado: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  titulo_posgrado: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tipo: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Tiempo Completo'
  },
  carrera_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'uploads_carreras',
      key: 'id'
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  }
}, {
  tableName: 'docentes',
  timestamps: false,
  indexes: [
    { fields: ['carrera_id'] },
    { fields: ['usuario_id'] }
  ]
});

module.exports = Docente;
