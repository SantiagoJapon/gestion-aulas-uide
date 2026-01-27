require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { Aula } = require('../src/models');

async function recrearAulas() {
  try {
    console.log('🔄 Recreando aulas con datos reales...\n');
    
    await sequelize.authenticate();

    // 1. Eliminar aulas de prueba
    console.log('🗑️  Eliminando aulas de prueba...');
    await Aula.destroy({ where: {}, truncate: true });
    console.log('   ✅ Aulas anteriores eliminadas\n');

    // 2. Crear aulas reales con capacidades y restricciones correctas
    const aulasReales = [
      // AUDITORIO - Libre para el próximo semestre
      { 
        codigo: 'AUDITORIO', 
        nombre: 'Auditorio Principal',
        capacidad: 55, 
        tipo: 'AUDITORIO', 
        ubicacion: 'Edificio Principal',
        edificio: 'Principal',
        restriccion_carrera: null, 
        estado: 'DISPONIBLE',
        notas: 'Libre para el próximo semestre'
      },
      
      // LABORATORIOS - Informática (prioridad)
      { 
        codigo: 'LABORATORIO 1', 
        nombre: 'Laboratorio de Computación 1',
        capacidad: 30, 
        tipo: 'LABORATORIO', 
        ubicacion: 'Edificio de Informática',
        edificio: 'Informática',
        restriccion_carrera: 'Informática', 
        estado: 'DISPONIBLE',
        equipamiento: 'Computadoras, Proyector',
        notas: 'Prioridad Informática, otras escuelas pueden usar'
      },
      { 
        codigo: 'LABORATORIO 2', 
        nombre: 'Laboratorio de Computación 2',
        capacidad: 21, 
        tipo: 'LABORATORIO', 
        ubicacion: 'Edificio de Informática',
        edificio: 'Informática',
        restriccion_carrera: 'Informática', 
        estado: 'DISPONIBLE',
        equipamiento: 'Computadoras, Proyector',
        notas: 'Prioridad Informática, otras escuelas pueden usar'
      },
      { 
        codigo: 'LABORATORIO 3', 
        nombre: 'Laboratorio de Computación 3',
        capacidad: 21, 
        tipo: 'LABORATORIO', 
        ubicacion: 'Edificio de Informática',
        edificio: 'Informática',
        restriccion_carrera: 'Informática', 
        estado: 'DISPONIBLE',
        equipamiento: 'Computadoras, Proyector',
        notas: 'Prioridad Informática, otras escuelas pueden usar'
      },
      
      // SALA DE AUDIENCIAS - Solo Derecho
      { 
        codigo: 'SALA DE AUDIENCIAS', 
        nombre: 'Sala de Audiencias',
        capacidad: 20, 
        tipo: 'SALA_ESPECIAL', 
        ubicacion: 'Edificio de Derecho',
        edificio: 'Derecho',
        restriccion_carrera: 'Derecho', 
        estado: 'DISPONIBLE',
        equipamiento: 'Mobiliario especializado',
        notas: 'Exclusivo para Derecho'
      },
      
      // AULA 20 - Solo Psicología
      { 
        codigo: 'AULA 20 LABORATORIO DE PSICOLOGIA', 
        nombre: 'Laboratorio de Psicología',
        capacidad: 25, 
        tipo: 'LABORATORIO', 
        ubicacion: 'Edificio C',
        edificio: 'C',
        piso: '2',
        restriccion_carrera: 'Psicología', 
        estado: 'DISPONIBLE',
        notas: 'Exclusivo para Psicología'
      },
      
      // AULAS 16, 17, 18 - Arquitectura (Taller de maquetería)
      { 
        codigo: 'AULA C16 AIRL', 
        nombre: 'Taller de Maquetería 1',
        capacidad: 24, 
        tipo: 'AULA', 
        ubicacion: 'Edificio C',
        edificio: 'C',
        piso: '1',
        restriccion_carrera: 'Arquitectura', 
        estado: 'DISPONIBLE',
        notas: 'Taller de maquetería - Arquitectura'
      },
      { 
        codigo: 'AULA C17 AIRL', 
        nombre: 'Taller de Maquetería 2',
        capacidad: 24, 
        tipo: 'AULA', 
        ubicacion: 'Edificio C',
        edificio: 'C',
        piso: '1',
        restriccion_carrera: 'Arquitectura', 
        estado: 'DISPONIBLE',
        notas: 'Taller de maquetería - Arquitectura'
      },
      { 
        codigo: 'AULA C18 AIRL', 
        nombre: 'Taller de Maquetería 3',
        capacidad: 24, 
        tipo: 'AULA', 
        ubicacion: 'Edificio C',
        edificio: 'C',
        piso: '1',
        restriccion_carrera: 'Arquitectura', 
        estado: 'DISPONIBLE',
        notas: 'Taller de maquetería - Arquitectura'
      },
      
      // AULAS GENERALES - Edificio B
      { codigo: 'AULA B4', nombre: 'Aula B4', capacidad: 24, tipo: 'AULA', ubicacion: 'Edificio B', edificio: 'B', piso: '1', estado: 'DISPONIBLE' },
      { codigo: 'AULA B5', nombre: 'Aula B5', capacidad: 62, tipo: 'AULA', ubicacion: 'Edificio B', edificio: 'B', piso: '1', estado: 'DISPONIBLE' },
      { codigo: 'AULA B6', nombre: 'Aula B6', capacidad: 27, tipo: 'AULA', ubicacion: 'Edificio B', edificio: 'B', piso: '1', estado: 'DISPONIBLE' },
      { codigo: 'AULA B7', nombre: 'Aula B7', capacidad: 27, tipo: 'AULA', ubicacion: 'Edificio B', edificio: 'B', piso: '1', estado: 'DISPONIBLE' },
      { codigo: 'AULA B8', nombre: 'Aula B8', capacidad: 27, tipo: 'AULA', ubicacion: 'Edificio B', edificio: 'B', piso: '1', estado: 'DISPONIBLE' },
      
      // AULAS GENERALES - Edificio C
      { codigo: 'AULA C10', nombre: 'Aula C10', capacidad: 60, tipo: 'AULA', ubicacion: 'Edificio C', edificio: 'C', piso: '1', estado: 'DISPONIBLE' },
      { codigo: 'AULA C11', nombre: 'Aula C11', capacidad: 27, tipo: 'AULA', ubicacion: 'Edificio C', edificio: 'C', piso: '1', estado: 'DISPONIBLE' },
      { codigo: 'AULA C12', nombre: 'Aula C12', capacidad: 30, tipo: 'AULA', ubicacion: 'Edificio C', edificio: 'C', piso: '1', estado: 'DISPONIBLE' },
      { codigo: 'AULA C13', nombre: 'Aula C13', capacidad: 27, tipo: 'AULA', ubicacion: 'Edificio C', edificio: 'C', piso: '1', estado: 'DISPONIBLE' },
      { codigo: 'AULA C14', nombre: 'Aula C14', capacidad: 27, tipo: 'AULA', ubicacion: 'Edificio C', edificio: 'C', piso: '1', estado: 'DISPONIBLE' },
      { codigo: 'AULA C15', nombre: 'Aula C15', capacidad: 27, tipo: 'AULA', ubicacion: 'Edificio C', edificio: 'C', piso: '1', estado: 'DISPONIBLE' },
      { codigo: 'AULA C19 PAPELERA', nombre: 'Aula C19 Papelera', capacidad: 25, tipo: 'AULA', ubicacion: 'Edificio C', edificio: 'C', piso: '1', estado: 'DISPONIBLE' },
      { codigo: 'AULA C21', nombre: 'Aula C21', capacidad: 27, tipo: 'AULA', ubicacion: 'Edificio C', edificio: 'C', piso: '2', estado: 'DISPONIBLE' },
      { codigo: 'AULA C22', nombre: 'Aula C22', capacidad: 27, tipo: 'AULA', ubicacion: 'Edificio C', edificio: 'C', piso: '2', estado: 'DISPONIBLE' },
      { codigo: 'AULA C23', nombre: 'Aula C23', capacidad: 27, tipo: 'AULA', ubicacion: 'Edificio C', edificio: 'C', piso: '2', estado: 'DISPONIBLE' },
    ];

    console.log('📊 Creando aulas reales:\n');
    
    for (const aulaData of aulasReales) {
      await Aula.create(aulaData);
      
      const restriccion = aulaData.restriccion_carrera ? ` [${aulaData.restriccion_carrera}]` : '';
      const tipo = aulaData.tipo === 'LABORATORIO' ? '🔬' : aulaData.tipo === 'AUDITORIO' ? '🎭' : aulaData.tipo === 'SALA_ESPECIAL' ? '⚖️' : '📚';
      console.log(`  ${tipo} ${aulaData.codigo.padEnd(38)} Cap: ${String(aulaData.capacidad).padStart(2)}${restriccion}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Total de aulas creadas: ${aulasReales.length}`);
    console.log('\n🎯 RESTRICCIONES CONFIGURADAS:');
    console.log('   • Auditorio: Libre para el próximo semestre');
    console.log('   • Sala de Audiencias: Solo Derecho ⚖️');
    console.log('   • Aula 20 Lab. Psicología: Solo Psicología 🧠');
    console.log('   • Aulas C16, C17, C18: Arquitectura (Taller maquetería) 🏛️');
    console.log('   • Laboratorios 1, 2, 3: Informática (prioridad) 💻');
    console.log('='.repeat(80));
    console.log('\n✅ Base de datos actualizada correctamente!\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

recrearAulas();
