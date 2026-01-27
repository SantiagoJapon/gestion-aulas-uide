// SCRIPT PARA CREAR CLASES DE DEMOSTRACIÓN
// Esto permite que la distribución funcione AHORA para la presentación

const { sequelize } = require('../src/config/database');
const { Clase, Carrera } = require('../src/models');

async function crearClasesDemo() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    // Limpiar clases existentes
    await Clase.destroy({ where: {} });
    console.log('🗑️  Clases anteriores eliminadas');

    // Clases para INFORMÁTICA (carrera_id: 2)
    const clasesInformatica = [
      { materia: 'Programación I', carrera: 'Informática', ciclo: '1', paralelo: 'A', dia: 'Lunes', hora_inicio: '07:00', hora_fin: '09:00', num_estudiantes: 30, docente: 'Dr. García', carrera_id: 2 },
      { materia: 'Programación I', carrera: 'Informática', ciclo: '1', paralelo: 'A', dia: 'Miércoles', hora_inicio: '07:00', hora_fin: '09:00', num_estudiantes: 30, docente: 'Dr. García', carrera_id: 2 },
      { materia: 'Base de Datos I', carrera: 'Informática', ciclo: '2', paralelo: 'A', dia: 'Martes', hora_inicio: '09:00', hora_fin: '11:00', num_estudiantes: 28, docente: 'Ing. López', carrera_id: 2 },
      { materia: 'Base de Datos I', carrera: 'Informática', ciclo: '2', paralelo: 'A', dia: 'Jueves', hora_inicio: '09:00', hora_fin: '11:00', num_estudiantes: 28, docente: 'Ing. López', carrera_id: 2 },
      { materia: 'Redes', carrera: 'Informática', ciclo: '3', paralelo: 'A', dia: 'Lunes', hora_inicio: '11:00', hora_fin: '13:00', num_estudiantes: 25, docente: 'Msc. Ramírez', carrera_id: 2 },
      { materia: 'Sistemas Operativos', carrera: 'Informática', ciclo: '3', paralelo: 'B', dia: 'Viernes', hora_inicio: '14:00', hora_fin: '16:00', num_estudiantes: 22, docente: 'Dr. Pérez', carrera_id: 2 },
      { materia: 'Desarrollo Web', carrera: 'Informática', ciclo: '4', paralelo: 'A', dia: 'Martes', hora_inicio: '14:00', hora_fin: '16:00', num_estudiantes: 27, docente: 'Ing. Torres', carrera_id: 2 },
      { materia: 'Inteligencia Artificial', carrera: 'Informática', ciclo: '5', paralelo: 'A', dia: 'Miércoles', hora_inicio: '16:00', hora_fin: '18:00', num_estudiantes: 20, docente: 'PhD. Morales', carrera_id: 2 }
    ];

    // Clases para ADMINISTRACIÓN (carrera_id: 1)
    const clasesAdministracion = [
      { materia: 'Contabilidad Básica', carrera: 'Administración', ciclo: '1', paralelo: 'A', dia: 'Lunes', hora_inicio: '07:00', hora_fin: '09:00', num_estudiantes: 35, docente: 'CPA. Silva', carrera_id: 1 },
      { materia: 'Microeconomía', carrera: 'Administración', ciclo: '2', paralelo: 'A', dia: 'Martes', hora_inicio: '09:00', hora_fin: '11:00', num_estudiantes: 32, docente: 'Eco. Vargas', carrera_id: 1 },
      { materia: 'Marketing Digital', carrera: 'Administración', ciclo: '3', paralelo: 'A', dia: 'Miércoles', hora_inicio: '11:00', hora_fin: '13:00', num_estudiantes: 30, docente: 'Msc. Castro', carrera_id: 1 },
      { materia: 'Gestión Empresarial', carrera: 'Administración', ciclo: '4', paralelo: 'A', dia: 'Jueves', hora_inicio: '14:00', hora_fin: '16:00', num_estudiantes: 28, docente: 'MBA. Rojas', carrera_id: 1 },
      { materia: 'Finanzas Corporativas', carrera: 'Administración', ciclo: '5', paralelo: 'A', dia: 'Viernes', hora_inicio: '16:00', hora_fin: '18:00', num_estudiantes: 25, docente: 'Ing. Mendoza', carrera_id: 1 }
    ];

    // Insertar todas las clases
    await Clase.bulkCreate([...clasesInformatica, ...clasesAdministracion]);

    const total = await Clase.count();
    console.log(`✅ ${total} clases de demostración creadas exitosamente`);
    console.log(`   - Informática: ${clasesInformatica.length} clases`);
    console.log(`   - Administración: ${clasesAdministracion.length} clases`);
    console.log('');
    console.log('🚀 AHORA PUEDES:');
    console.log('   1. Ir al dashboard de admin');
    console.log('   2. Click en "Ejecutar Distribución"');
    console.log('   3. Ver el horario visual con las aulas asignadas');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

crearClasesDemo();
