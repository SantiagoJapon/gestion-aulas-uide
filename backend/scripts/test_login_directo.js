const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Conectar a SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

// Definir modelo igual que en el proyecto
const User = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  rol: {
    type: DataTypes.ENUM('admin', 'director', 'profesor', 'docente', 'estudiante'),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    defaultValue: 'activo'
  }
}, {
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Agregar método verificarPassword
User.prototype.verificarPassword = async function(passwordIngresado) {
  return await bcrypt.compare(passwordIngresado, this.password);
};

async function testLogin() {
  try {
    console.log('🔍 Probando login...\n');

    const email = 'admin@uide.edu.ec';
    const password = 'admin123';

    // Buscar usuario
    console.log(`1. Buscando usuario: ${email}`);
    const usuario = await User.findOne({
      where: { email },
      attributes: { include: ['password'] }
    });

    if (!usuario) {
      console.log('   ❌ Usuario NO encontrado');
      return;
    }
    console.log('   ✅ Usuario encontrado');
    console.log(`      Nombre: ${usuario.nombre} ${usuario.apellido}`);
    console.log(`      Rol: ${usuario.rol}`);
    console.log(`      Estado: ${usuario.estado || '(no definido)'}`);
    console.log('');

    // Verificar estado
    console.log(`2. Verificando estado...`);
    if (usuario.estado !== 'activo') {
      console.log(`   ❌ Usuario NO está activo (estado: ${usuario.estado})`);
      return;
    }
    console.log('   ✅ Usuario activo');
    console.log('');

    // Verificar password
    console.log(`3. Verificando password...`);
    console.log(`   Password ingresado: ${password}`);
    console.log(`   Hash almacenado: ${usuario.password.substring(0, 30)}...`);

    const passwordValido = await usuario.verificarPassword(password);
    console.log(`   ¿Coincide?: ${passwordValido ? '✅ SÍ' : '❌ NO'}`);

    if (passwordValido) {
      console.log('\n✅ LOGIN EXITOSO - Todo funcionando correctamente');
    } else {
      console.log('\n❌ LOGIN FALLIDO - Password no coincide');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testLogin();
