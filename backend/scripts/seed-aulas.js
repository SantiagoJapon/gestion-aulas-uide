require('dotenv').config();
const { sequelize, Aula } = require('../src/models');

/**
 * Script para insertar todas las aulas del sistema UIDE Loja
 * Basado en la especificación completa proporcionada
 */

const aulas = [
  {
    nombre: 'AUDITORIO',
    capacidad: 55,
    prioridad_carreras: [], // Libre para todos
    edificio: 'Auditorio',
    tiene_proyector: true,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Disponible para todos, próximo semestre'
  },
  {
    nombre: 'LABORATORIO 1',
    capacidad: 30,
    prioridad_carreras: ['Ingeniería en Tecnologías de la Información'],
    edificio: 'Laboratorios',
    tiene_proyector: true,
    es_laboratorio: true,
    estado: 'disponible',
    notas: 'Prioridad alta para TI'
  },
  {
    nombre: 'LABORATORIO 2',
    capacidad: 21,
    prioridad_carreras: ['Ingeniería en Tecnologías de la Información'],
    edificio: 'Laboratorios',
    tiene_proyector: true,
    es_laboratorio: true,
    estado: 'disponible',
    notas: 'Labs TI prioritarios'
  },
  {
    nombre: 'LABORATORIO 3',
    capacidad: 21,
    prioridad_carreras: ['Ingeniería en Tecnologías de la Información'],
    edificio: 'Laboratorios',
    tiene_proyector: true,
    es_laboratorio: true,
    estado: 'disponible',
    notas: 'Labs TI prioritarios'
  },
  {
    nombre: 'SALA DE AUDIENCIAS',
    capacidad: 20,
    prioridad_carreras: ['Derecho'],
    edificio: 'Edificio B',
    tiene_proyector: true,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Prioridad estricta Derecho'
  },
  {
    nombre: 'AULA 20 LABORATORIO DE PSICOLOGIA',
    capacidad: 25,
    prioridad_carreras: ['Psicología Clínica'],
    edificio: 'Edificio C',
    tiene_proyector: true,
    es_laboratorio: true,
    estado: 'disponible',
    notas: 'Prioridad Psicología'
  },
  {
    nombre: 'AULA C18 ARQ',
    capacidad: 24,
    prioridad_carreras: ['Arquitectura y Urbanismo'],
    edificio: 'Edificio C',
    tiene_proyector: true,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Taller maquetería'
  },
  {
    nombre: 'AULA C16 ARQ',
    capacidad: 24,
    prioridad_carreras: ['Arquitectura y Urbanismo'],
    edificio: 'Edificio C',
    tiene_proyector: true,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Taller maquetería'
  },
  {
    nombre: 'AULA C17 ARQ',
    capacidad: 27,
    prioridad_carreras: ['Arquitectura y Urbanismo'],
    edificio: 'Edificio C',
    tiene_proyector: true,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula Arquitectura'
  },
  {
    nombre: 'AULA C15 ARQ',
    capacidad: 27,
    prioridad_carreras: ['Arquitectura y Urbanismo'],
    edificio: 'Edificio C',
    tiene_proyector: true,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula Arquitectura'
  },
  {
    nombre: 'AULA B4',
    capacidad: 24,
    prioridad_carreras: [],
    edificio: 'Edificio B',
    tiene_proyector: false,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula general'
  },
  {
    nombre: 'AULA B8',
    capacidad: 27,
    prioridad_carreras: [],
    edificio: 'Edificio B',
    tiene_proyector: false,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula general'
  },
  {
    nombre: 'AULA B7',
    capacidad: 27,
    prioridad_carreras: [],
    edificio: 'Edificio B',
    tiene_proyector: false,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula general'
  },
  {
    nombre: 'AULA B6',
    capacidad: 27,
    prioridad_carreras: [],
    edificio: 'Edificio B',
    tiene_proyector: false,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula general'
  },
  {
    nombre: 'AULA B5',
    capacidad: 62,
    prioridad_carreras: [],
    edificio: 'Edificio B',
    tiene_proyector: true,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Alta capacidad'
  },
  {
    nombre: 'AULA C10',
    capacidad: 60,
    prioridad_carreras: [],
    edificio: 'Edificio C',
    tiene_proyector: true,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Alta capacidad'
  },
  {
    nombre: 'AULA C11',
    capacidad: 27,
    prioridad_carreras: [],
    edificio: 'Edificio C',
    tiene_proyector: false,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula general'
  },
  {
    nombre: 'AULA C12',
    capacidad: 30,
    prioridad_carreras: [],
    edificio: 'Edificio C',
    tiene_proyector: false,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula general'
  },
  {
    nombre: 'AULA C13',
    capacidad: 27,
    prioridad_carreras: [],
    edificio: 'Edificio C',
    tiene_proyector: false,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula general'
  },
  {
    nombre: 'AULA C14',
    capacidad: 27,
    prioridad_carreras: [],
    edificio: 'Edificio C',
    tiene_proyector: false,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula general'
  },
  {
    nombre: 'AULA C21',
    capacidad: 27,
    prioridad_carreras: [],
    edificio: 'Edificio C',
    tiene_proyector: false,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula general'
  },
  {
    nombre: 'AULA C22',
    capacidad: 24,
    prioridad_carreras: [],
    edificio: 'Edificio C',
    tiene_proyector: false,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula general'
  },
  {
    nombre: 'AULA C23',
    capacidad: 27,
    prioridad_carreras: [],
    edificio: 'Edificio C',
    tiene_proyector: false,
    es_laboratorio: false,
    estado: 'disponible',
    notas: 'Aula general'
  }
];

async function seedAulas() {
  try {
    console.log('🌱 Iniciando seed de aulas...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');

    // Sincronizar modelo (solo estructura, no datos)
    await sequelize.sync({ alter: true });
    console.log('✅ Modelo Aula sincronizado');

    let creadas = 0;
    let actualizadas = 0;
    let errores = 0;

    // Insertar o actualizar cada aula
    for (const aulaData of aulas) {
      try {
        const [aula, created] = await Aula.upsert(aulaData, {
          returning: true
        });

        if (created) {
          console.log(`✅ Aula creada: ${aulaData.nombre}`);
          creadas++;
        } else {
          console.log(`🔄 Aula actualizada: ${aulaData.nombre}`);
          actualizadas++;
        }
      } catch (error) {
        console.error(`❌ Error con aula ${aulaData.nombre}:`, error.message);
        errores++;
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Creadas: ${creadas}`);
    console.log(`   🔄 Actualizadas: ${actualizadas}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📦 Total procesadas: ${aulas.length}`);

    // Mostrar estadísticas
    const totalAulas = await Aula.count();
    const porEdificio = await Aula.findAll({
      attributes: [
        'edificio',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.col('capacidad')), 'capacidad_total']
      ],
      group: ['edificio'],
      raw: true
    });

    console.log('\n📈 Estadísticas:');
    console.log(`   Total de aulas en BD: ${totalAulas}`);
    console.log('\n   Por edificio:');
    porEdificio.forEach(ed => {
      console.log(`   - ${ed.edificio || 'Sin edificio'}: ${ed.total} aulas, capacidad total: ${ed.capacidad_total}`);
    });

    console.log('\n✅ Seed de aulas completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed de aulas:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedAulas();
}

module.exports = { seedAulas, aulas };




