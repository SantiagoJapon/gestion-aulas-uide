const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100) },
  apellido: { type: DataTypes.STRING(100) },
  email: { type: DataTypes.STRING(255), unique: true },
  password: { type: DataTypes.STRING(255) },
  rol: { type: DataTypes.ENUM('admin', 'director', 'profesor', 'docente', 'estudiante') }
}, {
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

async function verificar() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión OK\n');

    const usuarios = await Usuario.findAll();
    console.log(`📊 Total usuarios: ${usuarios.length}\n`);

    for (const user of usuarios) {
      console.log(`👤 ${user.email} (${user.rol})`);
    }

    // Verificar password del admin
    console.log('\n🔐 Verificando password admin...');
    const admin = await Usuario.findOne({ where: { email: 'admin@uide.edu.ec' } });

    if (admin) {
      const passwordCorrecto = 'admin123';
      const match = await bcrypt.compare(passwordCorrecto, admin.password);
      console.log(`   Password almacenado (hash): ${admin.password.substring(0, 20)}...`);
      console.log(`   Probando con: ${passwordCorrecto}`);
      console.log(`   ¿Coincide?: ${match ? '✅ SÍ' : '❌ NO'}`);
    } else {
      console.log('   ❌ Admin no encontrado');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

verificar();
