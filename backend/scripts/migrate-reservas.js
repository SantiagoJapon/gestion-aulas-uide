/**
 * MIGRACIÓN: Recrear tabla reservas con esquema actual
 *
 * Uso en producción:
 *   docker exec -it gestion_aulas_backend node /app/scripts/migrate-reservas.js
 *
 * Qué hace:
 *   1. Elimina la tabla 'reservas' antigua (esquema viejo con aula_id, telegram_id, etc.)
 *   2. Elimina el tipo ENUM de estado si existe (para evitar conflictos)
 *   3. Recrea la tabla con el esquema correcto actual via Sequelize sync
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function migrar() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // Cargar todos los modelos para que las asociaciones estén disponibles
    require('../src/models');
    const Reserva = require('../src/models/Reserva');

    // 1. Verificar esquema actual de la tabla reservas
    console.log('🔍 Verificando esquema actual de la tabla reservas...');
    const columnas = await sequelize.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'reservas'
       ORDER BY ordinal_position`,
      { type: QueryTypes.SELECT }
    );

    if (columnas.length === 0) {
      console.log('   ℹ️  La tabla reservas NO existe. Se creará desde cero.\n');
    } else {
      console.log(`   Columnas actuales (${columnas.length}):`, columnas.map(c => c.column_name).join(', '));
      const tieneEsquemaViejo = columnas.some(c => c.column_name === 'aula_id' || c.column_name === 'telegram_id');
      const tieneEsquemaNuevo = columnas.some(c => c.column_name === 'aula_codigo' && c.column_name === 'fecha');

      if (!tieneEsquemaViejo) {
        const tieneFecha = columnas.some(c => c.column_name === 'fecha');
        const tieneAulaCodigo = columnas.some(c => c.column_name === 'aula_codigo');
        if (tieneFecha && tieneAulaCodigo) {
          console.log('\n✅ La tabla reservas ya tiene el esquema correcto. No se requiere migración.');
          process.exit(0);
        }
      }
      console.log('   ⚠️  Se detectó esquema viejo. Procediendo con la migración...\n');
    }

    // 2. Eliminar tabla antigua
    console.log('🗑️  Eliminando tabla reservas antigua...');
    await sequelize.query('DROP TABLE IF EXISTS "reservas" CASCADE', { type: QueryTypes.RAW });
    console.log('   ✅ Tabla eliminada\n');

    // 3. Eliminar ENUM type de estado si existe (PostgreSQL lo conserva separado de la tabla)
    console.log('🧹 Eliminando tipos ENUM obsoletos...');
    await sequelize.query('DROP TYPE IF EXISTS "enum_reservas_estado" CASCADE', { type: QueryTypes.RAW });
    console.log('   ✅ Tipos ENUM limpiados\n');

    // 4. Recrear con esquema correcto
    console.log('🔧 Creando tabla reservas con esquema actualizado...');
    await Reserva.sync({ force: true });
    console.log('   ✅ Tabla reservas creada correctamente\n');

    // 5. Verificar
    const nuevasColumnas = await sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'reservas' ORDER BY ordinal_position`,
      { type: QueryTypes.SELECT }
    );
    console.log('✅ Migración completada. Columnas nuevas:', nuevasColumnas.map(c => c.column_name).join(', '));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    console.error(err);
    process.exit(1);
  }
}

migrar();
