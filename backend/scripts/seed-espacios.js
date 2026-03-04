/**
 * SEED: Espacios del campus UIDE Loja
 *
 * Pobla la tabla 'espacios' con salas, biblioteca y zonas de trabajo.
 * Estos espacios aparecen en el buscador de disponibilidad bajo la sección
 * "Espacios (Biblioteca, Salas)".
 *
 * Uso en producción:
 *   docker exec -it gestion_aulas_backend node /app/scripts/seed-espacios.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { sequelize } = require('../src/config/database');
require('../src/models');
const Espacio = require('../src/models/Espacio');

const espacios = [
  // ── BIBLIOTECA ────────────────────────────────────────────────────────────
  {
    codigo: 'BIB-GENERAL',
    nombre: 'Biblioteca General',
    tipo: 'BIBLIOTECA',
    capacidad: 60,
    estado: 'DISPONIBLE',
    descripcion: 'Sala principal de lectura y consulta de material bibliográfico.'
  },
  {
    codigo: 'BIB-SALA1',
    nombre: 'Sala de Lectura Silenciosa',
    tipo: 'BIBLIOTECA',
    capacidad: 20,
    estado: 'DISPONIBLE',
    descripcion: 'Sala de silencio estricto para estudio individual.'
  },

  // ── SALAS DE TRABAJO GRUPAL ───────────────────────────────────────────────
  {
    codigo: 'SALA-GRP-1',
    nombre: 'Sala de Trabajo Grupal 1',
    tipo: 'ZONA_TRABAJO',
    capacidad: 10,
    estado: 'DISPONIBLE',
    descripcion: 'Sala equipada con pantalla y pizarrón para trabajos en equipo.'
  },
  {
    codigo: 'SALA-GRP-2',
    nombre: 'Sala de Trabajo Grupal 2',
    tipo: 'ZONA_TRABAJO',
    capacidad: 10,
    estado: 'DISPONIBLE',
    descripcion: 'Sala equipada con pantalla y pizarrón para trabajos en equipo.'
  },
  {
    codigo: 'SALA-GRP-3',
    nombre: 'Sala de Trabajo Grupal 3',
    tipo: 'ZONA_TRABAJO',
    capacidad: 8,
    estado: 'DISPONIBLE',
    descripcion: 'Sala pequeña para reuniones y tutorías grupales.'
  },

  // ── CUBÍCULOS ─────────────────────────────────────────────────────────────
  {
    codigo: 'CUB-01',
    nombre: 'Cubículo de Estudio 1',
    tipo: 'CUBICULO',
    capacidad: 4,
    estado: 'DISPONIBLE',
    descripcion: 'Cubículo individual o para estudio en pareja.'
  },
  {
    codigo: 'CUB-02',
    nombre: 'Cubículo de Estudio 2',
    tipo: 'CUBICULO',
    capacidad: 4,
    estado: 'DISPONIBLE',
    descripcion: 'Cubículo individual o para estudio en pareja.'
  },
  {
    codigo: 'CUB-03',
    nombre: 'Cubículo de Estudio 3',
    tipo: 'CUBICULO',
    capacidad: 4,
    estado: 'DISPONIBLE',
    descripcion: 'Cubículo individual o para estudio en pareja.'
  },
  {
    codigo: 'CUB-04',
    nombre: 'Cubículo de Estudio 4',
    tipo: 'CUBICULO',
    capacidad: 4,
    estado: 'DISPONIBLE',
    descripcion: 'Cubículo individual o para estudio en pareja.'
  },

  // ── SALA DE DESCANSO ─────────────────────────────────────────────────────
  {
    codigo: 'SALA-DESCANSO',
    nombre: 'Sala de Descanso Estudiantil',
    tipo: 'SALA_DESCANSO',
    capacidad: 25,
    estado: 'DISPONIBLE',
    descripcion: 'Área común de descanso con mesas y zona de refrigerios.'
  },
];

async function seedEspacios() {
  try {
    console.log('🌱 Iniciando seed de espacios...\n');
    await sequelize.authenticate();

    let creados = 0;
    let omitidos = 0;

    for (const esp of espacios) {
      const [, created] = await Espacio.findOrCreate({
        where: { codigo: esp.codigo },
        defaults: esp
      });

      if (created) {
        console.log(`  ✅ Creado: ${esp.codigo} — ${esp.nombre}`);
        creados++;
      } else {
        console.log(`  ⏭️  Ya existe: ${esp.codigo} — ${esp.nombre}`);
        omitidos++;
      }
    }

    console.log('\n─────────────────────────────────────────────');
    console.log(`Espacios creados:  ${creados}`);
    console.log(`Espacios omitidos: ${omitidos} (ya existían)`);
    console.log('✅ Seed completado.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed de espacios:', err.message);
    process.exit(1);
  }
}

seedEspacios();
