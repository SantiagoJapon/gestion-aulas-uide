/**
 * Asigna CARGA DE EJEMPLO (una clase HOY) al docente y estudiante demo para
 * que sus paneles muestren datos. Idempotente.
 *
 * Requiere haber corrido antes: node src/utils/seedDemoUsers.js
 * Uso: node src/utils/seedDemoCarga.js   (desde la carpeta backend)
 */
const { sequelize } = require('../config/database');
const User = require('../models/User');
const Estudiante = require('../models/Estudiante');
const Docente = require('../models/Docente');
const Clase = require('../models/Clase');
const EstudianteMateria = require('../models/EstudianteMateria');

const CARRERA_ID = 8;
const CARRERA_NOMBRE = 'Ingeniería en Sistemas de Información';
const CEDULA_DEMO = '1700000001';

// Día en español para "hoy" (formato usado en la tabla clases: 'Lunes', 'Martes'...)
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const DIA_HOY = DIAS[new Date().getDay()];

async function run() {
  await sequelize.authenticate();
  console.log(`✅ BD OK — asignando carga para el día: ${DIA_HOY}`);

  // Resolver entidades demo.
  const docenteUser = await User.findOne({ where: { email: 'docente.demo@uide.edu.ec' } });
  const docente = docenteUser ? await Docente.findOne({ where: { usuario_id: docenteUser.id } }) : null;
  const estudiante = await Estudiante.findOne({ where: { cedula: CEDULA_DEMO } });
  const director = await User.findOne({ where: { email: 'director.demo@uide.edu.ec' } });

  if (!docente || !estudiante) {
    throw new Error('Faltan usuarios demo. Corre primero: node src/utils/seedDemoUsers.js');
  }

  // Corrección cosmética: nombre de carrera correcto en director y estudiante.
  if (director && director.carrera_director !== CARRERA_NOMBRE) {
    director.carrera_director = CARRERA_NOMBRE;
    await director.save();
    console.log('♻️  Actualizado carrera_director del director');
  }
  if (estudiante.escuela !== CARRERA_NOMBRE) {
    estudiante.escuela = CARRERA_NOMBRE;
    await estudiante.save();
    console.log('♻️  Actualizada escuela del estudiante');
  }

  // Crear (o reutilizar) una clase de ejemplo para HOY, asignada al docente demo.
  const [clase, claseCreated] = await Clase.findOrCreate({
    where: {
      docente_id: docente.id,
      materia: 'FUNDAMENTOS DE PROGRAMACIÓN (DEMO)',
      dia: DIA_HOY,
      hora_inicio: '09:00',
    },
    defaults: {
      carrera_id: CARRERA_ID,
      carrera: CARRERA_NOMBRE,
      materia: 'FUNDAMENTOS DE PROGRAMACIÓN (DEMO)',
      ciclo: '1',
      paralelo: 'A',
      dia: DIA_HOY,
      hora_inicio: '09:00',
      hora_fin: '11:00',
      num_estudiantes: 1,
      docente: 'Daniel Docente',
      docente_id: docente.id,
      aula_asignada: 'A-20',
    },
  });
  console.log(`${claseCreated ? '🆕' : '♻️ '} Clase demo (id ${clase.id}) — ${clase.materia} · ${clase.dia} ${clase.hora_inicio}-${clase.hora_fin} · Aula ${clase.aula_asignada}`);

  // Matricular al estudiante demo en esa clase.
  const [, matCreated] = await EstudianteMateria.findOrCreate({
    where: { estudiante_id: estudiante.id, clase_id: clase.id },
    defaults: { estudiante_id: estudiante.id, clase_id: clase.id },
  });
  console.log(`   ${matCreated ? '🆕' : '♻️ '} Matrícula estudiante↔clase`);

  console.log('\n🎉 Carga demo lista. El docente y el estudiante ahora tienen una clase HOY.');
}

run()
  .then(() => sequelize.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error asignando carga demo:', err.message);
    console.error(err);
    process.exit(1);
  });
