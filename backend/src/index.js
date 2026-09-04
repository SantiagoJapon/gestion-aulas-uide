require('dotenv').config();
require('../scripts/validate-env.js');
const app = require('./app');
const { testConnection, syncDatabase } = require('./config/database');
const { seedData } = require('./utils/seed');
const expirarPendientes = require('./cron/expirePendientes');
const revertirPlanificacionesVencidas = require('./cron/revertirPlanificacionesVencidas');

const PORT = process.env.PORT || 3000;

const iniciarServidor = async () => {
  try {
    // Probar conexión a la base de datos
    await testConnection();

    // Cargar todos los modelos y relaciones antes de sincronizar
    require('./models');

    // Sincronizar modelos con la base de datos
    // En producción: usar migraciones (npx sequelize-cli db:migrate)
    // En desarrollo: alter:true para que Sequelize aplique cambios automáticamente
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('🔄 Sincronizando modelos con PostgreSQL...');
    await syncDatabase({
      alter: !isProduction,
      force: false
    });
    if (isProduction) {
      console.log('🔒 DB: modo seguro (usar migraciones en producción: npm run db:migrate)');
    }
    console.log('✅ Modelos sincronizados');

    // Sembrar datos iniciales si es necesario
    await seedData();

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log('========================================');

      // Cron: expirar reservas pendientes cada hora
      setInterval(() => {
        expirarPendientes().catch(err =>
          console.error('[CRON] Error en expirarPendientes:', err.message)
        );
      }, 60 * 60 * 1000); // cada 1 hora
      console.log('⏰ Cron de expiración de pendientes activado (cada 1h)');

      // Cron: revertir borradores reabiertos cuyo plazo venció (regla 3.2
      // del módulo de planificación colaborativa). Se corre una vez al
      // arranque además del intervalo: si el servidor estuvo caído justo
      // cuando vencía un plazo, no hay que esperar una hora más.
      revertirPlanificacionesVencidas().catch(err =>
        console.error('[CRON] Error en revertirPlanificacionesVencidas:', err.message)
      );
      setInterval(() => {
        revertirPlanificacionesVencidas().catch(err =>
          console.error('[CRON] Error en revertirPlanificacionesVencidas:', err.message)
        );
      }, 60 * 60 * 1000); // cada 1 hora
      console.log('⏰ Cron de reversión por vencimiento de plazo activado (cada 1h)');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

iniciarServidor();
