// Script para probar la conexión a la base de datos
const { testConnection } = require('./src/config/database');

async function testDB() {
  console.log('Probando conexión a PostgreSQL...\n');
  const isConnected = await testConnection();

  if (isConnected) {
    console.log('\n✅ La conexión a la base de datos está funcionando correctamente');
    process.exit(0);
  } else {
    console.log('\n❌ No se pudo conectar a la base de datos');
    process.exit(1);
  }
}

testDB();
