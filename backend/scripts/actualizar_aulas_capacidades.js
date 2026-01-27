require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { Aula } = require('../src/models');

async function actualizarAulas() {
  try {
    console.log('🔄 Actualizando capacidades y restricciones de aulas...\n');
    
    await sequelize.authenticate();

    // Definir todas las aulas con sus capacidades y restricciones
    const aulas = [
      // AUDITORIO - Libre para el próximo semestre
      { codigo: 'AUDITORIO', capacidad: 55, tipo: 'AUDITORIO', restriccion_carrera: null, notas: 'Libre para el próximo semestre' },
      
      // LABORATORIOS - Informática (prioridad)
      { codigo: 'LABORATORIO 1', capacidad: 30, tipo: 'LABORATORIO', restriccion_carrera: 'Informática', notas: 'Prioridad Informática, otras escuelas pueden usar' },
      { codigo: 'LABORATORIO 2', capacidad: 21, tipo: 'LABORATORIO', restriccion_carrera: 'Informática', notas: 'Prioridad Informática, otras escuelas pueden usar' },
      { codigo: 'LABORATORIO 3', capacidad: 21, tipo: 'LABORATORIO', restriccion_carrera: 'Informática', notas: 'Prioridad Informática, otras escuelas pueden usar' },
      
      // SALA DE AUDIENCIAS - Solo Derecho
      { codigo: 'SALA DE AUDIENCIAS', capacidad: 20, tipo: 'SALA_ESPECIAL', restriccion_carrera: 'Derecho', notas: 'Exclusivo para Derecho' },
      
      // AULA 20 - Solo Psicología
      { codigo: 'AULA 20 LABORATORIO DE PSICOLOGIA', capacidad: 25, tipo: 'LABORATORIO', restriccion_carrera: 'Psicología', notas: 'Exclusivo para Psicología' },
      
      // AULAS 16, 17, 18 - Arquitectura (Taller de maquetería)
      { codigo: 'AULA C16 AIRL', capacidad: 24, tipo: 'AULA', restriccion_carrera: 'Arquitectura', notas: 'Taller de maquetería - Arquitectura' },
      { codigo: 'AULA C17 AIRL', capacidad: 24, tipo: 'AULA', restriccion_carrera: 'Arquitectura', notas: 'Taller de maquetería - Arquitectura' },
      { codigo: 'AULA C18 AIRL', capacidad: 24, tipo: 'AULA', restriccion_carrera: 'Arquitectura', notas: 'Taller de maquetería - Arquitectura' },
      
      // AULAS GENERALES
      { codigo: 'AULA B4', capacidad: 24, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA B8', capacidad: 27, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA B7', capacidad: 27, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA B6', capacidad: 27, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA B5', capacidad: 62, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA C10', capacidad: 60, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA C11', capacidad: 27, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA C12', capacidad: 30, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA C13', capacidad: 27, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA C14', capacidad: 27, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA C15', capacidad: 27, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA C19 PAPELERA', capacidad: 25, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA C21', capacidad: 27, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA C22', capacidad: 27, tipo: 'AULA', restriccion_carrera: null },
      { codigo: 'AULA C23', capacidad: 27, tipo: 'AULA', restriccion_carrera: null },
    ];

    console.log('📊 Actualizando aulas:\n');
    
    let actualizadas = 0;
    let noEncontradas = [];

    for (const aulaData of aulas) {
      const aula = await Aula.findOne({ where: { codigo: aulaData.codigo } });
      
      if (aula) {
        await aula.update({
          capacidad: aulaData.capacidad,
          tipo: aulaData.tipo,
          restriccion_carrera: aulaData.restriccion_carrera,
          notas: aulaData.notas || aula.notas,
          estado: 'DISPONIBLE'
        });
        
        const restriccion = aulaData.restriccion_carrera ? `→ ${aulaData.restriccion_carrera}` : '→ General';
        console.log(`  ✅ ${aulaData.codigo.padEnd(35)} Capacidad: ${String(aulaData.capacidad).padStart(2)} ${restriccion}`);
        actualizadas++;
      } else {
        noEncontradas.push(aulaData.codigo);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Aulas actualizadas: ${actualizadas}`);
    
    if (noEncontradas.length > 0) {
      console.log(`\n⚠️  Aulas no encontradas (${noEncontradas.length}):`);
      noEncontradas.forEach(codigo => console.log(`   - ${codigo}`));
      console.log('\n💡 Estas aulas necesitan ser creadas primero en el sistema.');
    }

    console.log('\n🎯 RESTRICCIONES CONFIGURADAS:');
    console.log('   • Auditorio: Libre para el próximo semestre');
    console.log('   • Sala de Audiencias: Solo Derecho');
    console.log('   • Aula 20 Lab. Psicología: Solo Psicología');
    console.log('   • Aulas 16, 17, 18: Arquitectura (Taller maquetería)');
    console.log('   • Laboratorios 1, 2, 3: Informática (prioridad)');
    console.log('='.repeat(80));

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

actualizarAulas();
