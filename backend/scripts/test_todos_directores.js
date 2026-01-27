const axios = require('axios');

const directores = [
  { email: 'raquel.veintimilla@uide.edu.ec', nombre: 'Mgs. Raquel Veintimilla', carrera: 'Derecho' },
  { email: 'lorena.conde@uide.edu.ec', nombre: 'Mgs. Lorena Conde', carrera: 'Informática' },
  { email: 'freddy.salazar@uide.edu.ec', nombre: 'Mgs. Freddy Salazar', carrera: 'Arquitectura' },
  { email: 'domenica.burneo@uide.edu.ec', nombre: 'Mgs. Domenica Burneo', carrera: 'Psicología' },
  { email: 'franklin.chacon@uide.edu.ec', nombre: 'PhD. Franklin Chacon', carrera: 'Business' },
  { email: 'mercy.namicela@uide.edu.ec', nombre: 'Mgs. Mercy Namicela', carrera: 'Business (Coordinadora)' }
];

async function testTodosDirectores() {
  console.log('🧪 Probando login de TODOS los directores...\n');
  console.log('='.repeat(70));
  console.log('');

  let exitosos = 0;
  let fallidos = 0;

  for (const director of directores) {
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email: director.email,
        password: 'uide2024'
      });

      const { usuario } = response.data;

      console.log(`✅ ${director.nombre}`);
      console.log(`   Email: ${director.email}`);
      console.log(`   Carrera asignada: ${usuario.carrera ? usuario.carrera.nombre : 'NINGUNA'}`);
      console.log(`   Carrera esperada: ${director.carrera}`);
      
      if (usuario.carrera && usuario.carrera.nombre) {
        console.log('   ✓ Información de carrera cargada correctamente');
        exitosos++;
      } else {
        console.log('   ✗ ERROR: No se cargó información de carrera');
        fallidos++;
      }
      console.log('');

    } catch (error) {
      console.log(`❌ ${director.nombre}`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      console.log('');
      fallidos++;
    }
  }

  console.log('='.repeat(70));
  console.log('');
  console.log('📊 RESUMEN:');
  console.log(`   ✅ Exitosos: ${exitosos}/${directores.length}`);
  console.log(`   ❌ Fallidos: ${fallidos}/${directores.length}`);
  console.log('');

  if (fallidos === 0) {
    console.log('🎉 ¡TODOS LOS DIRECTORES TIENEN SU CARRERA ASIGNADA CORRECTAMENTE!');
  } else {
    console.log('⚠️  Algunos directores no tienen su carrera asignada');
  }
}

testTodosDirectores();
