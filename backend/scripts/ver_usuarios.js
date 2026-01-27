const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

(async () => {
  try {
    await sequelize.authenticate();
    
    console.log('\n📊 USUARIOS EN LA BASE DE DATOS:\n');
    
    // Admin
    const [admin] = await sequelize.query(
      "SELECT * FROM usuarios WHERE rol = 'admin' LIMIT 1",
      { type: QueryTypes.SELECT }
    );
    
    if (admin) {
      console.log('👤 ADMIN:');
      console.log(`   Email: ${admin.email}`);
      console.log('   Password: admin123\n');
    }
    
    // Directores con sus carreras
    const directores = await sequelize.query(`
      SELECT u.email, u.nombre, u.apellido, u.carrera_director, c.carrera
      FROM usuarios u
      LEFT JOIN carreras c ON c.id = u.carrera_director
      WHERE u.rol = 'director'
      ORDER BY u.email
    `, { type: QueryTypes.SELECT });
    
    console.log('👥 DIRECTORES (Password: uide2024):');
    directores.forEach(dir => {
      console.log(`   - ${dir.email} → ${dir.carrera || 'Sin carrera'}`);
    });
    
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
