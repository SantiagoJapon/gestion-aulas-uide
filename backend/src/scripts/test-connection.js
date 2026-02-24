const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('🔍 Test de conexión directa con pg.Client...\n');
console.log('Configuración:');
console.log('  Host:', process.env.DB_HOST || '127.0.0.1');
console.log('  Port:', process.env.DB_PORT || 5432);
console.log('  Database:', process.env.DB_NAME || 'gestion_aulas');
console.log('  User:', process.env.DB_USER || 'postgres');
console.log('  Password:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'NO DEFINIDA');
console.log('');

const client = new Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'gestion_aulas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

client.connect()
  .then(() => {
    console.log('✅ Conexión exitosa a PostgreSQL!');
    return client.query('SELECT current_user, current_database(), version()');
  })
  .then((result) => {
    console.log('\n📊 Información de la conexión:');
    console.log('  Usuario:', result.rows[0].current_user);
    console.log('  Base de datos:', result.rows[0].current_database);
    console.log('  Versión:', result.rows[0].version.split('\n')[0]);
    return client.end();
  })
  .then(() => {
    console.log('\n✅ Test completado exitosamente!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error de conexión:', err.message);
    console.error('  Código:', err.code);
    console.error('  Detalle:', err.detail);
    process.exit(1);
  });






