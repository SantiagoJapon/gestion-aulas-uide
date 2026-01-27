// SETUP RAPIDO CON SQLITE - NO NECESITA POSTGRESQL
const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');

// USAR SQLITE - NO NECESITA SERVIDOR
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
  dialectOptions: {
    // Desactivar foreign keys para setup rápido
    foreignKeys: false
  }
});

console.log('🚀 USANDO SQLITE - NO NECESITA POSTGRESQL');
console.log('');

// Definir modelos
const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellido: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  rol: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'estudiante' },
  cedula: { type: DataTypes.STRING(20) },
  telefono: { type: DataTypes.STRING(20) },
  carrera_director: { type: DataTypes.INTEGER },
  estado: { type: DataTypes.STRING(20), defaultValue: 'activo' }
}, {
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Carrera = sequelize.define('Carrera', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  carrera: { type: DataTypes.STRING(100), allowNull: false },
  carrera_normalizada: { type: DataTypes.STRING(100), unique: true },
  activa: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'carreras',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Aula = sequelize.define('Aula', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  capacidad: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'AULA' },
  restriccion_carrera: { type: DataTypes.STRING(100) },
  es_prioritaria: { type: DataTypes.BOOLEAN, defaultValue: false },
  edificio: { type: DataTypes.STRING(50) },
  piso: { type: DataTypes.INTEGER },
  equipamiento: { type: DataTypes.TEXT },
  estado: { type: DataTypes.STRING(50), defaultValue: 'DISPONIBLE' },
  notas: { type: DataTypes.TEXT }
}, {
  tableName: 'aulas',
  timestamps: false
});

const Clase = sequelize.define('Clase', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  carrera_id: { type: DataTypes.INTEGER },
  carrera: { type: DataTypes.STRING(100) },
  materia: { type: DataTypes.STRING(100) },
  ciclo: { type: DataTypes.STRING(50) },
  paralelo: { type: DataTypes.STRING(10) },
  dia: { type: DataTypes.STRING(20) },
  hora_inicio: { type: DataTypes.STRING(10) },
  hora_fin: { type: DataTypes.STRING(10) },
  num_estudiantes: { type: DataTypes.INTEGER },
  docente: { type: DataTypes.STRING(100) },
  aula_asignada: { type: DataTypes.INTEGER }
}, {
  tableName: 'clases',
  timestamps: false
});

const Distribucion = sequelize.define('Distribucion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  clase_id: { type: DataTypes.INTEGER },
  aula_id: { type: DataTypes.INTEGER },
  dia: { type: DataTypes.STRING(20) },
  hora_inicio: { type: DataTypes.STRING(10) },
  hora_fin: { type: DataTypes.STRING(10) },
  fecha_asignacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'distribucion',
  timestamps: false
});

async function setup() {
  try {
    // Desactivar foreign keys en SQLite
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    console.log('📦 Creando tablas...');
    await sequelize.sync({ force: true });
    console.log('✅ Tablas creadas\n');

    // Crear carreras
    console.log('📚 Creando carreras...');
    const carreras = [
      { carrera: 'Derecho', carrera_normalizada: 'derecho', activa: true },
      { carrera: 'Informática', carrera_normalizada: 'informatica', activa: true },
      { carrera: 'Arquitectura', carrera_normalizada: 'arquitectura', activa: true },
      { carrera: 'Psicología', carrera_normalizada: 'psicologia', activa: true },
      { carrera: 'Business', carrera_normalizada: 'business', activa: true }
    ];

    const carrerasCreadas = {};
    for (const carr of carreras) {
      const carrera = await Carrera.create(carr);
      carrerasCreadas[carr.carrera_normalizada] = carrera.id;
      console.log(`  ✓ ${carr.carrera} (ID: ${carrera.id})`);
    }
    console.log('');

    // Crear aulas de ejemplo
    console.log('🏢 Creando aulas de ejemplo...');
    for (let i = 1; i <= 20; i++) {
      await Aula.create({
        nombre: `Aula ${i < 10 ? '0' + i : i}`,
        codigo: `A-${i < 10 ? '0' + i : i}`,
        capacidad: 30 + (i * 2),
        tipo: i <= 15 ? 'AULA' : 'LABORATORIO',
        edificio: i <= 10 ? 'Edificio A' : 'Edificio B',
        piso: Math.ceil(i / 5),
        estado: 'DISPONIBLE',
        es_prioritaria: false
      });
    }
    console.log('  ✓ 20 aulas creadas\n');

    // Generar contraseñas
    console.log('🔐 Generando contraseñas...');
    const passwordAdmin = await bcrypt.hash('admin123', 10);
    const passwordDirectores = await bcrypt.hash('uide2024', 10);
    console.log('  ✓ Contraseñas generadas\n');

    // Crear admin
    console.log('👤 Creando administrador...');
    await Usuario.create({
      nombre: 'Admin',
      apellido: 'Sistema',
      email: 'admin@uide.edu.ec',
      password: passwordAdmin,
      rol: 'admin',
      estado: 'activo'
    });
    console.log('  ✓ admin@uide.edu.ec (Password: admin123)\n');

    // Crear directores
    console.log('👥 Creando directores...');
    const directores = [
      { nombre: 'Raquel', apellido: 'Veintimilla', email: 'raquel.veintimilla@uide.edu.ec', carrera: 'derecho' },
      { nombre: 'Lorena', apellido: 'Conde', email: 'lorena.conde@uide.edu.ec', carrera: 'informatica' },
      { nombre: 'Freddy', apellido: 'Salazar', email: 'freddy.salazar@uide.edu.ec', carrera: 'arquitectura' },
      { nombre: 'Domenica', apellido: 'Burneo', email: 'domenica.burneo@uide.edu.ec', carrera: 'psicologia' },
      { nombre: 'Franklin', apellido: 'Chacon', email: 'franklin.chacon@uide.edu.ec', carrera: 'business' },
      { nombre: 'Mercy', apellido: 'Namicela', email: 'mercy.namicela@uide.edu.ec', carrera: 'business' }
    ];

    for (const dir of directores) {
      await Usuario.create({
        nombre: dir.nombre,
        apellido: dir.apellido,
        email: dir.email,
        password: passwordDirectores,
        rol: 'director',
        carrera_director: carrerasCreadas[dir.carrera],
        estado: 'activo'
      });
      console.log(`  ✓ ${dir.email}`);
    }
    console.log('    Password para todos: uide2024\n');

    console.log('========================================');
    console.log('✅ ¡TODO LISTO!');
    console.log('========================================');
    console.log('');
    console.log('CREDENCIALES:');
    console.log('');
    console.log('👤 ADMIN:');
    console.log('   Email: admin@uide.edu.ec');
    console.log('   Password: admin123');
    console.log('');
    console.log('👥 DIRECTORES (Password: uide2024):');
    console.log('   - raquel.veintimilla@uide.edu.ec');
    console.log('   - lorena.conde@uide.edu.ec');
    console.log('   - freddy.salazar@uide.edu.ec');
    console.log('   - domenica.burneo@uide.edu.ec');
    console.log('   - franklin.chacon@uide.edu.ec');
    console.log('   - mercy.namicela@uide.edu.ec');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await sequelize.close();
  }
}

setup();
