const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { fixEncoding } = require('../utils/encoding');

const Carrera = sequelize.define('Carrera', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  carrera: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'La carrera ya existe'
    },
    validate: {
      notEmpty: {
        msg: 'El nombre de la carrera no puede estar vacío'
      }
    },
    get() {
      const rawValue = this.getDataValue('carrera');
      return fixEncoding(rawValue);
    }
  },
  carrera_normalizada: {
    type: DataTypes.STRING(120),
    allowNull: true,
    comment: 'Nombre de carrera normalizado para comparaciones'
  },
  activa: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'uploads_carreras',
  timestamps: false
});

module.exports = Carrera;
