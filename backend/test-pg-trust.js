// Script para probar conexión con trust (sin contraseña)
require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  // Conexión sin contraseña (usando trust)
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'gestion_aulas',
    user: 'admin',
    // NO incluir password para usar trust
  });

  console.log('Intentando conectar SIN contraseña (trust)...\n');

  try {
    await client.connect();
    console.log('✅ Conexión exitosa con trust!');

    const result = await client.query('SELECT NOW(), version()');
    console.log('\nResultado de prueba:');
    console.log('  Fecha/Hora:', result.rows[0].now);
    console.log('  Versión:', result.rows[0].version.split(',')[0]);

    // Ahora probemos configurar la contraseña
    console.log('\nConfigurando contraseña para el usuario admin...');
    await client.query("ALTER USER admin WITH PASSWORD 'admin';");
    console.log('✅ Contraseña configurada');

    await client.end();

    // Ahora probemos CON contraseña
    console.log('\nProbando conexión con contraseña...');
    const client2 = new Client({
      host: '127.0.0.1',
      port: 5432,
      database: 'gestion_aulas',
      user: 'admin',
      password: 'admin',
    });

    await client2.connect();
    console.log('✅ Conexión exitosa CON contraseña!');
    await client2.end();

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testConnection();
