require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { Aula } = require('../src/models');

(async () => {
  try {
    await sequelize.authenticate();
    const aulas = await Aula.findAll({ 
      attributes: ['id', 'codigo', 'nombre', 'capacidad', 'tipo', 'restriccion_carrera'],
      order: [['codigo', 'ASC']]
    });
    
    console.log(`\n📊 Total de aulas en la BD: ${aulas.length}\n`);
    
    if (aulas.length === 0) {
      console.log('⚠️  No hay aulas en la base de datos\n');
    } else {
      aulas.forEach(a => {
        const restriccion = a.restriccion_carrera ? ` [${a.restriccion_carrera}]` : '';
        console.log(`  ${a.codigo.padEnd(30)} - Cap: ${String(a.capacidad).padStart(3)}${restriccion}`);
      });
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
