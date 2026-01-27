const { Sequelize } = require('sequelize');
require('dotenv').config();

// ⚡ CONFIGURACIÓN SQLITE - SOLUCIÓN DE EMERGENCIA
// No requiere servidor PostgreSQL, todo en un archivo local
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente');
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
    console.log('✅ Modelos sincronizados con la base de datos');
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
