// Probar con localhost
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'gestion_aulas',
    user: 'admin',
    password: 'admin',
  });

  console.log('Probando con localhost...\n');

  try {
    await client.connect();
    console.log('✅ Conexión exitosa!');

    const result = await client.query('SELECT NOW(), current_user');
    console.log('\nResultado:');
    console.log('  Usuario:', result.rows[0].current_user);
    console.log('  Timestamp:', result.rows[0].now);

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('  Código:', error.code);
    process.exit(1);
  }
}

testConnection();
