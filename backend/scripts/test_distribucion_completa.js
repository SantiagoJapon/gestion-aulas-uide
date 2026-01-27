const axios = require('axios');

async function testDistribucionCompleta() {
  try {
    console.log('🧪 PRUEBA COMPLETA DE DISTRIBUCIÓN\n');
    console.log('='.repeat(70));

    // 1. Login
    console.log('\n📝 PASO 1: Login como admin...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@uide.edu.ec',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso\n');

    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Verificar clases disponibles
    console.log('📚 PASO 2: Verificando clases sin aula...');
    try {
      const estadoResponse = await axios.get('http://localhost:3000/api/distribucion/estado', { headers });
      const { total_clases, clases_sin_aula, aulas_disponibles } = estadoResponse.data;
      
      console.log(`   Total clases: ${total_clases || 0}`);
      console.log(`   Sin aula: ${clases_sin_aula || 0}`);
      console.log(`   Aulas disponibles: ${aulas_disponibles || 20}`);
      
      if (clases_sin_aula === 0) {
        console.log('\n⚠️  No hay clases sin aula. Primero debes:');
        console.log('   1. Subir estudiantes desde el frontend');
        console.log('   2. Subir planificaciones desde el frontend');
        console.log('   3. Luego ejecutar este script');
        return;
      }
    } catch (error) {
      console.log('⚠️  No se pudo obtener estado. Puede ser normal si no hay clases aún.');
      console.log('   Continúa subiendo estudiantes y planificaciones desde el frontend.');
      return;
    }

    // 3. Ejecutar distribución
    console.log('\n🤖 PASO 3: Ejecutando algoritmo de distribución...');
    try {
      const distribucionResponse = await axios.post(
        'http://localhost:3000/api/distribucion/generar',
        {},
        { headers }
      );
      
      console.log('✅ Distribución completada');
      console.log(`   Mensaje: ${distribucionResponse.data.message || distribucionResponse.data.mensaje}`);
      
      if (distribucionResponse.data.asignadas) {
        console.log(`   Clases asignadas: ${distribucionResponse.data.asignadas}`);
      }
    } catch (error) {
      console.log('❌ Error al ejecutar distribución:', error.response?.data?.error || error.message);
      return;
    }

    // 4. Verificar resultados
    console.log('\n📊 PASO 4: Verificando resultados...');
    try {
      const estadoFinal = await axios.get('http://localhost:3000/api/distribucion/estado', { headers });
      console.log(`   Clases sin aula después: ${estadoFinal.data.clases_sin_aula || 0}`);
      console.log(`   Clases asignadas: ${estadoFinal.data.clases_asignadas || 0}`);
    } catch (error) {
      console.log('⚠️  No se pudo verificar estado final');
    }

    // 5. Ver mapa de calor
    console.log('\n🗺️  PASO 5: Obteniendo mapa de calor...');
    try {
      const mapaResponse = await axios.get('http://localhost:3000/api/distribucion/heatmap', { headers });
      const { puntos } = mapaResponse.data;
      
      if (puntos && puntos.length > 0) {
        console.log(`✅ Mapa de calor generado: ${puntos.length} puntos de datos`);
        
        // Contar por nivel
        const niveles = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        puntos.forEach(p => {
          if (niveles[p.nivel] !== undefined) niveles[p.nivel]++;
        });
        
        console.log('   📈 Distribución de ocupación:');
        console.log(`      🟢 LOW (baja): ${niveles.LOW}`);
        console.log(`      🟡 MEDIUM (media): ${niveles.MEDIUM}`);
        console.log(`      🔴 HIGH (alta): ${niveles.HIGH}`);
      } else {
        console.log('⚠️  Mapa de calor vacío - puede ser normal si no hay datos');
      }
    } catch (error) {
      console.log('⚠️  No se pudo obtener mapa de calor:', error.response?.data?.error || error.message);
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 ¡PRUEBA COMPLETADA!\n');
    console.log('📌 Próximos pasos:');
    console.log('   1. Abre el frontend: http://localhost:5173');
    console.log('   2. Login como admin o director');
    console.log('   3. Ve al Mapa de Calor para ver la distribución visual');
    console.log('   4. Ve a "Mi Distribución" para ver la lista completa');

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  El backend no está corriendo');
      console.error('   Ejecuta: cd backend && node src/index.js');
    }
  }
}

testDistribucionCompleta();
