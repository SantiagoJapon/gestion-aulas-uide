const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Sequelize } = require('sequelize');
const { Aula, Clase, Distribucion } = require('./src/models');

async function seed() {
  try {
    // 1. Crear Aula
    const aula = await Aula.create({
      nombre: 'A-205',
      codigo: 'A-205-L',
      ubicacion: 'Edificio A, Piso 2',
      capacidad: 30,
      tipo: 'LABORATORIO',
      estado: 'DISPONIBLE',
      recursos: ['proyector', 'computadoras']
    });
    console.log('✅ Aula creada:', aula.nombre);

    // 2. Crear Clase (con Docente)
    const clase = await Clase.create({
      nrc: '12345',
      codigo_materia: 'SIS-101',
      materia: 'Programación I',
      docente: 'Ing. Juan Pérez',
      dia: 'LUNES',
      hora_inicio: '09:00:00',
      hora_fin: '11:00:00',
      modalidad: 'presencial',
      cupos: 25
    });
    console.log('✅ Clase creada:', clase.materia, 'Docente:', clase.docente);

    // 3. Crear Distribución (Asignación)
    await Distribucion.create({
      clase_id: clase.id,
      aula_id: aula.id,
      dia: 'LUNES',
      hora_inicio: '09:00:00',
      hora_fin: '11:00:00',
      fecha_asignacion: new Date()
    });
    console.log('✅ Distribución creada para LUNES 09:00-11:00');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding:', error);
    process.exit(1);
  }
}

seed();
