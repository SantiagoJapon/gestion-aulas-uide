require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log('🔍 Probando conexión SIN password (trust mode)...\n');

const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'gestion_aulas',
  username: process.env.DB_USER || 'postgres',
  password: '', // Sin password para trust
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  logging: (msg) => console.log('🔍 Sequelize:', msg),
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ Conexión exitosa SIN password!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err.message);
    console.log('\n💡 Intentando con password...\n');
    
    // Intentar con password
    const sequelize2 = new Sequelize({
      database: process.env.DB_NAME || 'gestion_aulas',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123',
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      dialect: 'postgres',
      logging: (msg) => console.log('🔍 Sequelize:', msg),
    });
    
    return sequelize2.authenticate()
      .then(() => {
        console.log('✅ Conexión exitosa CON password!');
        process.exit(0);
      })
      .catch((err2) => {
        console.error('❌ Error con password:', err2.message);
        process.exit(1);
      });
  });






