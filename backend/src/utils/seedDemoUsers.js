/**
 * Crea usuarios de ejemplo para DIRECTOR, DOCENTE y ESTUDIANTE.
 * Idempotente: si ya existen (por email/cédula) no los duplica.
 * Uso:  node src/utils/seedDemoUsers.js   (desde la carpeta backend)
 *
 * Credenciales resultantes:
 *   Director:   director.demo@uide.edu.ec / demo1234
 *   Docente:    docente.demo@uide.edu.ec  / demo1234
 *   Estudiante: cédula 1700000001
 */
const { sequelize } = require('../config/database');
const User = require('../models/User');
const Estudiante = require('../models/Estudiante');
const Docente = require('../models/Docente');
const Carrera = require('../models/Carrera');
const DirectorCarrera = require('../models/DirectorCarrera');

const DEMO_PASSWORD = 'demo1234';

async function run() {
  await sequelize.authenticate();
  console.log('✅ Conexión a BD OK');

  // Tomamos la primera carrera existente para vincular director/docente/estudiante.
  const carrera = await Carrera.findOne({ order: [['id', 'ASC']] });
  if (carrera) {
    console.log(`ℹ️  Carrera de referencia: [${carrera.id}] ${carrera.nombre}`);
  } else {
    console.log('⚠️  No hay carreras en uploads_carreras; se crean sin vínculo de carrera.');
  }

  // ---------- DIRECTOR ----------
  const [director, dirCreated] = await User.findOrCreate({
    where: { email: 'director.demo@uide.edu.ec' },
    defaults: {
      nombre: 'Diana',
      apellido: 'Directora',
      password: DEMO_PASSWORD,
      rol: 'director',
      carrera_director: carrera ? carrera.nombre : 'Carrera Demo',
      estado: 'activo',
      requiere_cambio_password: false,
    },
  });
  console.log(`${dirCreated ? '🆕' : '♻️ '} Director: ${director.email} (id ${director.id})`);

  if (carrera) {
    const [, linkCreated] = await DirectorCarrera.findOrCreate({
      where: { usuario_id: director.id, carrera_id: carrera.id },
      defaults: { usuario_id: director.id, carrera_id: carrera.id },
    });
    console.log(`   ${linkCreated ? '🆕' : '♻️ '} Vínculo director↔carrera`);
  }

  // ---------- DOCENTE ----------
  const [docenteUser, docCreated] = await User.findOrCreate({
    where: { email: 'docente.demo@uide.edu.ec' },
    defaults: {
      nombre: 'Daniel',
      apellido: 'Docente',
      password: DEMO_PASSWORD,
      rol: 'docente',
      estado: 'activo',
      requiere_cambio_password: false,
    },
  });
  console.log(`${docCreated ? '🆕' : '♻️ '} Docente: ${docenteUser.email} (id ${docenteUser.id})`);

  // Registro en tabla docentes vinculado al usuario.
  const [, docRowCreated] = await Docente.findOrCreate({
    where: { usuario_id: docenteUser.id },
    defaults: {
      nombre: 'Daniel Docente',
      email: docenteUser.email,
      tipo: 'Tiempo Completo',
      carrera_id: carrera ? carrera.id : null,
      usuario_id: docenteUser.id,
    },
  });
  console.log(`   ${docRowCreated ? '🆕' : '♻️ '} Registro en tabla docentes`);

  // ---------- ESTUDIANTE ----------
  const CEDULA_DEMO = '1700000001';
  const [estudiante, estCreated] = await Estudiante.findOrCreate({
    where: { cedula: CEDULA_DEMO },
    defaults: {
      cedula: CEDULA_DEMO,
      nombre: 'Esteban Estudiante',
      escuela: carrera ? carrera.nombre : 'Carrera Demo',
      nivel: 'Primer Nivel',
      email: 'estudiante.demo@uide.edu.ec',
      fecha_registro: new Date(),
    },
  });
  console.log(`${estCreated ? '🆕' : '♻️ '} Estudiante: cédula ${estudiante.cedula} (id ${estudiante.id})`);

  console.log('\n🎉 Usuarios de ejemplo listos:');
  console.log('   Director:   director.demo@uide.edu.ec / demo1234');
  console.log('   Docente:    docente.demo@uide.edu.ec  / demo1234');
  console.log('   Estudiante: cédula 1700000001');
}

run()
  .then(() => sequelize.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error sembrando usuarios demo:', err.message);
    console.error(err);
    process.exit(1);
  });
