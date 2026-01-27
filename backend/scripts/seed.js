require('dotenv').config();
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');

/**
 * Script para crear datos de prueba en la base de datos
 */
async function seed() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...\n');

    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida\n');

    // Sincronizar modelos (esto creará las tablas)
    await sequelize.sync({ force: true });
    console.log('✅ Tablas sincronizadas\n');

    // Crear usuarios de prueba
    console.log('Creando usuarios de prueba...');

    const usuarioAdmin = await User.create({
      nombre: 'Admin',
      apellido: 'Sistema',
      email: 'admin@uide.edu.ec',
      password: 'Admin123',
      rol: 'admin',
      cedula: '1234567890',
      telefono: '0987654321',
      estado: 'activo'
    });
    console.log(`✅ Usuario admin creado: ${usuarioAdmin.email}`);

    const usuarioDocente = await User.create({
      nombre: 'María',
      apellido: 'González',
      email: 'maria.gonzalez@uide.edu.ec',
      password: 'Docente123',
      rol: 'docente',
      cedula: '0987654321',
      telefono: '0987654322',
      estado: 'activo'
    });
    console.log(`✅ Usuario docente creado: ${usuarioDocente.email}`);

    const usuarioEstudiante1 = await User.create({
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan.perez@uide.edu.ec',
      password: 'Estudiante123',
      rol: 'estudiante',
      cedula: '1111111111',
      telefono: '0987654323',
      estado: 'activo'
    });
    console.log(`✅ Usuario estudiante creado: ${usuarioEstudiante1.email}`);

    const usuarioEstudiante2 = await User.create({
      nombre: 'Ana',
      apellido: 'Martínez',
      email: 'ana.martinez@uide.edu.ec',
      password: 'Estudiante123',
      rol: 'estudiante',
      cedula: '2222222222',
      telefono: '0987654324',
      estado: 'activo'
    });
    console.log(`✅ Usuario estudiante creado: ${usuarioEstudiante2.email}`);

    console.log('\n========================================');
    console.log('🎉 Seed completado exitosamente!');
    console.log('========================================\n');

    console.log('Usuarios de prueba creados:');
    console.log('----------------------------------------');
    console.log('Admin:');
    console.log('  Email: admin@uide.edu.ec');
    console.log('  Password: Admin123');
    console.log('');
    console.log('Docente:');
    console.log('  Email: maria.gonzalez@uide.edu.ec');
    console.log('  Password: Docente123');
    console.log('');
    console.log('Estudiantes:');
    console.log('  Email: juan.perez@uide.edu.ec');
    console.log('  Password: Estudiante123');
    console.log('  Email: ana.martinez@uide.edu.ec');
    console.log('  Password: Estudiante123');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error al ejecutar seed:', error);
    process.exit(1);
  }
}

seed();
