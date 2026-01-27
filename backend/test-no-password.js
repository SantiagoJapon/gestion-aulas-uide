// Probar con trust (sin enviar contraseña)
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'gestion_aulas',
    user: 'admin',
    // NO incluir password
  });

  console.log('Probando conexión SIN enviar contraseña (usando trust)...\n');

  try {
    await client.connect();
    console.log('✅ Conexión exitosa sin contraseña!');

    const result = await client.query('SELECT NOW(), current_user, version()');
    console.log('\nResultado:');
    console.log('  Usuario:', result.rows[0].current_user);
    console.log('  Timestamp:', result.rows[0].now);
    console.log('  Versión:', result.rows[0].version.substring(0, 50) + '...');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nCódigo de error:', error.code);
    console.error('\nStacktrace:', error.stack.substring(0, 500));
    process.exit(1);
  }
}

testConnection();
