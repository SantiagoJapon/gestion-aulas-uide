const { Sequelize } = require('sequelize');
require('dotenv').config();

if (!process.env.DB_PASSWORD) {
  console.warn('⚠️  ADVERTENCIA: DB_PASSWORD no está definido. Usando password por defecto. NO usar en producción.');
}

// Configuración PostgreSQL
const sequelize = new Sequelize(
  process.env.DB_NAME || 'gestion_aulas',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    pool: {
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Función para probar la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos PostgreSQL establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error.message);
    console.error('   Código:', error.parent?.code);
    console.error('   Detalle:', error.parent?.detail);
    return false;
  }
};

// Función para sincronizar modelos (solo en desarrollo)
const syncDatabase = async (options = {}) => {
  try {
    const { force = false, alter = false } = options;

    if (process.env.NODE_ENV === 'production' && force) {
      throw new Error('No se puede usar force:true en producción');
    }

    await sequelize.sync({ force, alter });
    console.log('✅ Modelos sincronizados con la base de datos PostgreSQL');
  } catch (error) {
    console.error('❌ Error al sincronizar modelos:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
};
