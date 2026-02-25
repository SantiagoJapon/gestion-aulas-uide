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
        args: [['AULA', 'LABORATORIO', 'SALA_ESPECIAL', 'AUDITORIO', 'aula', 'laboratorio', 'sala_especial', 'auditorio']],
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
    defaultValue: 'disponible',
    validate: {
      isIn: {
        args: [['disponible', 'no_disponible', 'mantenimiento', 'ocupada']],
        msg: 'El estado debe ser: disponible, no_disponible, mantenimiento u ocupada'
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
Aula.prototype.tienePrioridad = function (carrera) {
  if (!this.restriccion_carrera) {
    return false;
  }
  return this.restriccion_carrera.toLowerCase() === carrera.toLowerCase();
};

// Método de instancia para verificar si el aula está disponible
Aula.prototype.estaDisponible = function () {
  return this.estado === 'disponible';
};

// Método de instancia para obtener datos públicos
Aula.prototype.toJSON = function () {
  const values = { ...this.get() };
  return values;
};

// Método estático para buscar aulas disponibles por capacidad
Aula.findByCapacidad = async function (capacidadMinima) {
  return await this.findAll({
    where: {
      estado: 'disponible',
      capacidad: { [sequelize.Sequelize.Op.gte]: capacidadMinima }
    },
    order: [['capacidad', 'ASC']]
  });
};

// Método estático para buscar aulas disponibles para una carrera.
// Retorna TODAS las aulas disponibles (no hay exclusivas), ordenadas por:
// 1. Aulas prioritarias para esta carrera primero
// 2. Luego por capacidad ascendente
Aula.findByCarrera = async function (carrera) {
  return await sequelize.query(`
    SELECT * FROM aulas
    WHERE estado = 'disponible'
      AND tipo != 'AUDITORIO'
      AND (restriccion_carrera IS NULL OR restriccion_carrera != 'AUDITORIO_INSTITUCIONAL')
    ORDER BY CASE WHEN es_prioritaria = true AND restriccion_carrera = :carrera THEN 0 ELSE 1 END ASC,
             capacidad ASC
  `, {
    replacements: { carrera },
    type: require('sequelize').QueryTypes.SELECT,
    model: Aula,
    mapToModel: true
  });
};

module.exports = Aula;

