// ============================================
// SCRIPT: Limpiar clases demo
// ============================================
// Elimina todas las clases demo para empezar limpio con los excels reales

const { sequelize } = require('../src/config/database');
const { Clase, Distribucion } = require('../src/models');

async function limpiarClasesDemo() {
  try {
    console.log('🗑️  LIMPIANDO CLASES DEMO...\n');

    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    // Contar clases actuales
    const totalClases = await Clase.count();
    console.log(`📊 Clases actuales en BD: ${totalClases}`);

    // Eliminar todas las distribuciones primero
    const distEliminadas = await Distribucion.destroy({
      where: {},
      truncate: true
    });
    console.log(`✅ ${distEliminadas} distribuciones eliminadas`);

    // Eliminar todas las clases
    const clasesEliminadas = await Clase.destroy({
      where: {},
      truncate: true
    });

    console.log(`\n✅ ${clasesEliminadas} clases eliminadas exitosamente`);
    console.log('\n📝 AHORA:');
    console.log('   1. Los directores pueden subir sus planificaciones Excel');
    console.log('   2. El sistema procesará automáticamente cada Excel');
    console.log('   3. Cada nuevo Excel REEMPLAZARÁ las clases anteriores de esa carrera');
    console.log('   4. El admin ejecuta "Distribución" para asignar aulas');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

limpiarClasesDemo();
