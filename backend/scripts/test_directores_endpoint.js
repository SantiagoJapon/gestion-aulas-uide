const { User, Carrera } = require('../src/models');

async function testDirectores() {
  try {
    console.log('🧪 Probando obtener directores con asociación...\n');

    const directores = await User.findAll({
      where: { rol: 'director' },
      include: [
        {
          model: Carrera,
          as: 'Carrera',
          attributes: ['id', 'carrera', 'carrera_normalizada'],
          required: false
        }
      ],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']]
    });

    console.log(`✅ ${directores.length} directores encontrados\n`);

    directores.forEach(dir => {
      const json = dir.toJSON();
      console.log(`👤 ${json.nombre} ${json.apellido}`);
      console.log(`   Email: ${json.email}`);
      console.log(`   Carrera ID: ${json.carrera_director}`);
      if (json.Carrera) {
        console.log(`   Carrera: ${json.Carrera.carrera}`);
      } else {
        console.log(`   Carrera: SIN ASIGNAR`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

testDirectores();
