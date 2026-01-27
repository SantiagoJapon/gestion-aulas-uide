const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const Aula = sequelize.define('Aula', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: {
      msg: 'El código del aula ya existe'
    },
    validate: {
      notEmpty: {
        msg: 'El código del aula no puede estar vacío'
      }
    }
  },
  nombre: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El nombre del aula no puede estar vacío'
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
  tipo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: {
        args: [['AULA', 'LABORATORIO', 'SALA_ESPECIAL', 'AUDITORIO']],
        msg: 'El tipo debe ser: AULA, LABORATORIO, SALA_ESPECIAL o AUDITORIO'
      }
    }
  },
  restriccion_carrera: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Carrera con restricción/prioridad para esta aula. NULL = libre para todos'
  },
  es_prioritaria: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  edificio: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  piso: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  equipamiento: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Equipamiento del aula en formato JSON'
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'DISPONIBLE',
    validate: {
      isIn: {
        args: [['DISPONIBLE', 'NO_DISPONIBLE', 'MANTENIMIENTO', 'OCUPADA']],
        msg: 'El estado debe ser: DISPONIBLE, NO_DISPONIBLE, MANTENIMIENTO o OCUPADA'
      }
    }
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'aulas',
  timestamps: false, // La nueva tabla no tiene timestamps
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
    },
    {
      fields: ['restriccion_carrera']
    }
  ]
});

// Método de instancia para verificar si una carrera tiene prioridad/restricción
Aula.prototype.tienePrioridad = function(carrera) {
  if (!this.restriccion_carrera) {
    return false;
  }
  return this.restriccion_carrera.toLowerCase() === carrera.toLowerCase();
};

// Método de instancia para verificar si el aula está disponible
Aula.prototype.estaDisponible = function() {
  return this.estado === 'DISPONIBLE';
};

// Método de instancia para obtener datos públicos
Aula.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

// Método estático para buscar aulas disponibles por capacidad
Aula.findByCapacidad = async function(capacidadMinima) {
  return await Aula.findAll({
    where: {
      capacidad: {
        [Op.gte]: capacidadMinima
      },
      estado: 'DISPONIBLE'
    },
    order: [['capacidad', 'ASC']]
  });
};

// Método estático para buscar aulas por prioridad de carrera
Aula.findByCarrera = async function(carrera) {
  const { Sequelize } = require('sequelize');
  return await Aula.findAll({
    where: {
      estado: 'DISPONIBLE',
      [Op.or]: [
        { restriccion_carrera: carrera },
        { restriccion_carrera: null }
      ]
    },
    order: [
      // Primero las que tienen prioridad para esta carrera
      [Sequelize.literal(`CASE WHEN restriccion_carrera = '${carrera}' THEN 0 ELSE 1 END`), 'ASC'],
      ['capacidad', 'ASC']
    ]
  });
};

module.exports = Aula;

