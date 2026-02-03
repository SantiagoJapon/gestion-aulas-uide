// ============================================
// SCRIPT: Limpiar TODOS los datos de la BD
// ============================================
// Elimina todos los datos de todas las tablas para empezar desde cero
// Respeta el orden de dependencias FK

const { sequelize } = require('../src/config/database');

async function limpiarTodo() {
  try {
    console.log('🗑️  LIMPIANDO TODOS LOS DATOS DE LA BASE DE DATOS...\n');

    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Orden de eliminación (respetar FK)
    const tablas = [
      'distribucion',
      'planificaciones_subidas',
      'clases',
      'estudiantes',
      'docentes',
      'materias_catalogo',
      'periodos',
      'uploads_carreras',
      'aulas',
      'usuarios'
    ];

    for (const tabla of tablas) {
      try {
        const [results] = await sequelize.query(`DELETE FROM ${tabla}`);
        const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM ${tabla}`);
        console.log(`  ✅ ${tabla} → limpiada (${countResult[0].total} registros restantes)`);
      } catch (err) {
        if (err.message.includes('does not exist') || err.message.includes('no existe')) {
          console.log(`  ⏭️  ${tabla} → no existe aún (se creará al sincronizar)`);
        } else {
          console.log(`  ⚠️  ${tabla} → error: ${err.message}`);
        }
      }
    }

    // Resetear secuencias de auto-increment
    console.log('\n🔄 Reseteando secuencias de IDs...');
    for (const tabla of tablas) {
      try {
        await sequelize.query(`ALTER SEQUENCE IF EXISTS ${tabla}_id_seq RESTART WITH 1`);
      } catch (err) {
        // Ignorar si no existe la secuencia
      }
    }

    console.log('\n✅ BASE DE DATOS LIMPIA');
    console.log('\n📝 Siguiente paso:');
    console.log('   1. Reiniciar el backend (sincronizará nuevas tablas)');
    console.log('   2. node backend/scripts/seed-aulas.js');
    console.log('   3. node backend/scripts/crear_usuarios_directos.js');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

limpiarTodo();
