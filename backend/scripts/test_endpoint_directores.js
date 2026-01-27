const axios = require('axios');

async function testEndpointDirectores() {
  try {
    console.log('🧪 Probando endpoint /api/usuarios?rol=director...\n');

    // Primero, obtener token de admin
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@uide.edu.ec',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Token obtenido\n');

    // Ahora obtener los directores
    const directoresResponse = await axios.get('http://localhost:3000/api/usuarios?rol=director', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const { usuarios, total } = directoresResponse.data;
    
    console.log(`📊 Total directores: ${total}\n`);
    console.log('👥 Directores con información de carrera:\n');
    console.log('='.repeat(70));

    usuarios.forEach(director => {
      console.log(`\n👤 ${director.nombre} ${director.apellido}`);
      console.log(`   Email: ${director.email}`);
      console.log(`   Carrera ID: ${director.carrera_director || 'No asignado'}`);
      console.log(`   Carrera Nombre: ${director.carrera_nombre || 'No asignado'}`);
      
      if (director.carrera_nombre) {
        console.log('   ✅ Información de carrera disponible');
      } else {
        console.log('   ❌ Sin información de carrera');
      }
    });

    console.log('\n' + '='.repeat(70));
    
    const conCarrera = usuarios.filter(d => d.carrera_nombre).length;
    const sinCarrera = usuarios.filter(d => !d.carrera_nombre).length;
    
    console.log(`\n📈 Resumen:`);
    console.log(`   ✅ Con carrera: ${conCarrera}/${total}`);
    console.log(`   ❌ Sin carrera: ${sinCarrera}/${total}`);
    
    if (conCarrera === total) {
      console.log('\n🎉 ¡TODOS los directores tienen carrera_nombre!');
    } else {
      console.log('\n⚠️  Algunos directores no tienen carrera_nombre');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testEndpointDirectores();
