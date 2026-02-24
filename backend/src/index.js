require('dotenv').config();
const app = require('./app');
const { testConnection, syncDatabase } = require('./config/database');
const { seedData } = require('./utils/seed');

const PORT = process.env.PORT || 3000;

const iniciarServidor = async () => {
  try {
    // Probar conexión a la base de datos
    await testConnection();

    // Cargar todos los modelos y relaciones antes de sincronizar
    require('./models');

    // Sincronizar modelos con la base de datos sin perder datos
    console.log('🔄 Sincronizando modelos con PostgreSQL...');
    await syncDatabase({
      alter: true,
      force: false
    });
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
