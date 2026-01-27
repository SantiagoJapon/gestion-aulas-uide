const axios = require('axios');

async function testLoginDirector() {
  try {
    console.log('🧪 Probando login de director con información de carrera...\n');

    // Login como Raquel Veintimilla (Directora de Derecho)
    const loginData = {
      email: 'raquel.veintimilla@uide.edu.ec',
      password: 'uide2024'
    };

    console.log('📧 Intentando login con:', loginData.email);
    
    const response = await axios.post('http://localhost:3000/api/auth/login', loginData, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('\n✅ Login exitoso!\n');

    const { usuario, token } = response.data;

    console.log('👤 Información del usuario:');
    console.log(`   Nombre: ${usuario.nombre} ${usuario.apellido}`);
    console.log(`   Email: ${usuario.email}`);
    console.log(`   Rol: ${usuario.rol}`);
    console.log(`   Estado: ${usuario.estado}`);
    console.log('');

    if (usuario.carrera) {
      console.log('📚 Información de Carrera:');
      console.log(`   ID: ${usuario.carrera.id}`);
      console.log(`   Nombre: ${usuario.carrera.nombre}`);
      console.log(`   Normalizada: ${usuario.carrera.normalizada}`);
      console.log('');
      console.log('✅ ¡La información de carrera se carga correctamente!');
    } else {
      console.log('❌ No se encontró información de carrera');
      console.log(`   carrera_director ID: ${usuario.carrera_director}`);
    }

    console.log('');
    console.log('🔑 Token generado (primeros 50 caracteres):');
    console.log(`   ${token.substring(0, 50)}...`);

    // Probar obtener perfil con el token
    console.log('\n📋 Probando endpoint de perfil...\n');
    
    const perfilResponse = await axios.get('http://localhost:3000/api/auth/perfil', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const perfilUsuario = perfilResponse.data.usuario;
    console.log('✅ Perfil obtenido exitosamente');
    console.log('');
    console.log('👤 Datos del perfil:');
    console.log(`   Nombre: ${perfilUsuario.nombre} ${perfilUsuario.apellido}`);
    if (perfilUsuario.carrera) {
      console.log(`   Carrera: ${perfilUsuario.carrera.nombre}`);
      console.log('');
      console.log('✅ ¡El perfil también incluye la información de carrera!');
    } else {
      console.log('❌ El perfil NO incluye información de carrera');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  El backend no está corriendo en http://localhost:3000');
      console.error('   Ejecuta: cd backend && npm start');
    }
  }
}

testLoginDirector();
