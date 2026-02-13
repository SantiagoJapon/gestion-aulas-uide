const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El nombre no puede estar vacío'
      },
      len: {
        args: [2, 100],
        msg: 'El nombre debe tener entre 2 y 100 caracteres'
      }
    }
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El apellido no puede estar vacío'
      },
      len: {
        args: [2, 100],
        msg: 'El apellido debe tener entre 2 y 100 caracteres'
      }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: {
      msg: 'Este email ya está registrado'
    },
    validate: {
      isEmail: {
        msg: 'Debe proporcionar un email válido'
      },
      notEmpty: {
        msg: 'El email no puede estar vacío'
      }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'La contraseña no puede estar vacía'
      },
      len: {
        args: [6, 255],
        msg: 'La contraseña debe tener al menos 6 caracteres'
      }
    }
  },
  rol: {
    type: DataTypes.ENUM('admin', 'director', 'profesor', 'docente', 'estudiante'),
    allowNull: false,
    defaultValue: 'estudiante',
    validate: {
      isIn: {
        args: [['admin', 'director', 'profesor', 'docente', 'estudiante']],
        msg: 'El rol debe ser: admin, director, profesor, docente o estudiante'
      }
    }
  },
  cedula: {
    type: DataTypes.STRING(10),
    allowNull: true,
    unique: {
      msg: 'Esta cédula ya está registrada'
    },
    validate: {
      len: {
        args: [10, 10],
        msg: 'La cédula debe tener 10 dígitos'
      },
      isNumeric: {
        msg: 'La cédula debe contener solo números'
      }
    }
  },
  telefono: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
      len: {
        args: [7, 10],
        msg: 'El teléfono debe tener entre 7 y 10 dígitos'
      }
    }
  },
  carrera_director: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    allowNull: false,
    defaultValue: 'activo'
  }
}, {
  tableName: 'usuarios',
  timestamps: true,
  hooks: {
    // Hook para encriptar la contraseña antes de crear el usuario
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    // Hook para encriptar la contraseña antes de actualizar
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Método de instancia para verificar contraseña
User.prototype.verificarPassword = async function (passwordIngresado) {
  return await bcrypt.compare(passwordIngresado, this.password);
};

// Método de instancia para obtener datos públicos (sin contraseña)
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

// Método estático para obtener nombre completo
User.prototype.getNombreCompleto = function () {
  return `${this.nombre} ${this.apellido}`;
};

module.exports = User;
