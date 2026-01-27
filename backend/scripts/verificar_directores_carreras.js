const { Sequelize, DataTypes } = require('sequelize');

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
  rol: { type: DataTypes.ENUM('admin', 'director', 'profesor', 'docente', 'estudiante') },
  carrera_director: { type: DataTypes.INTEGER }
}, {
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Carrera = sequelize.define('Carrera', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  carrera: { type: DataTypes.STRING(100) },
  carrera_normalizada: { type: DataTypes.STRING(100) }
}, {
  tableName: 'carreras',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

async function verificar() {
  try {
    console.log('🔍 Verificando directores y carreras...\n');

    const carreras = await Carrera.findAll();
    console.log('📚 Carreras disponibles:');
    carreras.forEach(c => {
      console.log(`   ID ${c.id}: ${c.carrera}`);
    });
    console.log('');

    const directores = await Usuario.findAll({ where: { rol: 'director' } });
    console.log('👥 Directores registrados:');
    for (const dir of directores) {
      const carrera = carreras.find(c => c.id === dir.carrera_director);
      const carreraNombre = carrera ? carrera.carrera : 'SIN ASIGNAR';
      console.log(`   ${dir.nombre} ${dir.apellido} (${dir.email})`);
      console.log(`      → Carrera ID: ${dir.carrera_director} - ${carreraNombre}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

verificar();
