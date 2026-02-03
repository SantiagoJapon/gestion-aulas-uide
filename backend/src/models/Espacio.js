const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Espacio = sequelize.define('Espacio', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: {
      msg: 'El código del espacio ya existe'
    },
    validate: {
      notEmpty: {
        msg: 'El código del espacio no puede estar vacío'
      }
    }
  },
  nombre: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El nombre del espacio no puede estar vacío'
      }
    }
  },
  tipo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: {
        args: [['BIBLIOTECA', 'SALA_DESCANSO', 'ZONA_TRABAJO', 'CUBICULO', 'OTRO']],
        msg: 'El tipo debe ser: BIBLIOTECA, SALA_DESCANSO, ZONA_TRABAJO, CUBICULO u OTRO'
      }
    }
  },
  capacidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: {
        msg: 'La capacidad debe ser un número entero'
      },
      min: {
        args: [1],
        msg: 'La capacidad debe ser al menos 1'
      }
    }
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'DISPONIBLE',
    validate: {
      isIn: {
        args: [['DISPONIBLE', 'NO_DISPONIBLE', 'MANTENIMIENTO']],
        msg: 'El estado debe ser: DISPONIBLE, NO_DISPONIBLE o MANTENIMIENTO'
      }
    }
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'espacios',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['codigo']
    },
    {
      fields: ['tipo']
    },
    {
      fields: ['estado']
    }
  ]
});

module.exports = Espacio;
