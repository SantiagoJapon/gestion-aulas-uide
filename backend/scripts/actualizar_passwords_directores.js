require('dotenv').config();
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');

async function actualizarPasswords() {
  try {
    console.log('🔄 Actualizando contraseñas de directores...\n');

    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Nuevas contraseñas
    const directores = [
      { email: 'raquel.veintimilla@uide.edu.ec', password: 'derecho2024', nombre: 'Raquel Veintimilla' },
      { email: 'lorena.conde@uide.edu.ec', password: 'informatica2024', nombre: 'Lorena Conde' },
      { email: 'freddy.salazar@uide.edu.ec', password: 'arquitectura2024', nombre: 'Freddy Salazar' },
      { email: 'domenica.burneo@uide.edu.ec', password: 'psicologia2024', nombre: 'Domenica Burneo' },
      { email: 'franklin.chacon@uide.edu.ec', password: 'business2024', nombre: 'Franklin Chacon' },
      { email: 'mercy.namicela@uide.edu.ec', password: 'business2024', nombre: 'Mercy Namicela' }
    ];

    console.log('📝 Actualizando contraseñas:\n');

    for (const dir of directores) {
      const usuario = await User.findOne({ where: { email: dir.email } });
      
      if (usuario) {
        // Actualizar password (el hook beforeUpdate hasheará automáticamente)
        usuario.password = dir.password;
        await usuario.save();
        
        console.log(`✅ ${dir.nombre}`);
        console.log(`   Email: ${dir.email}`);
        console.log(`   Nueva Password: ${dir.password}\n`);
      } else {
        console.log(`❌ NO ENCONTRADO: ${dir.nombre} (${dir.email})\n`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 ¡CONTRASEÑAS ACTUALIZADAS!\n');
    console.log('📋 Puedes usar las siguientes credenciales:\n');
    
    directores.forEach(dir => {
      console.log(`👤 ${dir.nombre}:`);
      console.log(`   Email: ${dir.email}`);
      console.log(`   Password: ${dir.password}\n`);
    });

    console.log('✅ Todas las contraseñas siguen el patrón: [carrera]2024');
    console.log('\nEjemplo: Lorena Conde → informatica2024\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

actualizarPasswords();
