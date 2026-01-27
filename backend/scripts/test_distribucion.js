const { sequelize } = require('../src/config/database');
const DistribucionService = require('../src/services/distribucion.service');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a BD');
    
    const resultado = await DistribucionService.ejecutarDistribucion();
    console.log('\n✅ DISTRIBUCIÓN EXITOSA:');
    console.log('  - Total Procesadas:', resultado.totalProcesadas);
    console.log('  - Exitosas:', resultado.exitosas);
    console.log('  - Fallidas:', resultado.fallidas);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
