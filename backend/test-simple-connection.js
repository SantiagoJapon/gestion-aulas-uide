// Test simple de conexión
require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL);
console.log('🔍 DB_USER:', process.env.DB_USER);
console.log('🔍 DB_PASSWORD:', process.env.DB_PASSWORD ? 'EXISTE' : 'NO EXISTE');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    connectTimeout: 5000
  }
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ ✅ ✅ CONEXIÓN EXITOSA ✅ ✅ ✅');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ ERROR:', err.message);
    console.error('Código:', err.parent?.code);
    console.error('Severidad:', err.parent?.severity);
    process.exit(1);
  });






