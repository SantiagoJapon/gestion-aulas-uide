require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { Clase, Carrera } = require('../src/models');

async function contarClases() {
  try {
    console.log('📊 RESUMEN DE CLASES GUARDADAS\n');
    console.log('='.repeat(70));

    await sequelize.authenticate();

    // Contar total
    const totalClases = await Clase.count();
    console.log(`\n📚 TOTAL DE CLASES: ${totalClases}\n`);

    // Contar por carrera
    const carreras = await Carrera.findAll();
    
    console.log('📋 POR CARRERA:\n');
    
    for (const carrera of carreras) {
      const count = await Clase.count({
        where: { carrera: carrera.carrera }
      });
      
      if (count > 0) {
        console.log(`   ✅ ${carrera.carrera.padEnd(20)} → ${count} clases`);
      }
    }

    // Mostrar algunas clases de ejemplo
    console.log('\n📝 EJEMPLOS DE CLASES:\n');
    
    const ejemplos = await Clase.findAll({
      limit: 5,
      attributes: ['carrera', 'materia', 'docente', 'horario']
    });

    ejemplos.forEach((clase, i) => {
      console.log(`   ${i + 1}. ${clase.carrera} - ${clase.materia}`);
      console.log(`      Docente: ${clase.docente}`);
      console.log(`      Horario: ${clase.horario}\n`);
    });

    console.log('='.repeat(70));
    console.log('\n✅ Sistema listo para distribución automática!\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

contarClases();
