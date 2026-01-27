// RESTAURAR LAS CREDENCIALES ANTIGUAS (DirectorUide2026!)
const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function restaurarCredenciales() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Generar hash para la contraseña antigua
    const passwordDirectores = await bcrypt.hash('DirectorUide2026!', 10);
    
    console.log('🔄 Actualizando contraseñas de directores...\n');
    
    // Actualizar todos los directores
    await sequelize.query(`
      UPDATE usuarios 
      SET password = ? 
      WHERE rol = 'director'
    `, {
      replacements: [passwordDirectores],
      type: QueryTypes.UPDATE
    });
    
    console.log('✅ Contraseñas actualizadas exitosamente\n');
    console.log('📝 NUEVAS CREDENCIALES:\n');
    console.log('👥 DIRECTORES (Password: DirectorUide2026!):');
    console.log('   - raquel.veintimilla@uide.edu.ec');
    console.log('   - lorena.conde@uide.edu.ec');
    console.log('   - freddy.salazar@uide.edu.ec');
    console.log('   - domenica.burneo@uide.edu.ec');
    console.log('   - franklin.chacon@uide.edu.ec');
    console.log('   - mercy.namicela@uide.edu.ec');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

restaurarCredenciales();
