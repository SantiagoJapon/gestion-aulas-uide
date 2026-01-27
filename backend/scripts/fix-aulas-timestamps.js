require('dotenv').config();
const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

/**
 * Script para corregir la tabla aulas agregando timestamps
 * Ejecuta SQL directamente para evitar problemas con Sequelize sync
 */
async function fixAulasTimestamps() {
  try {
    console.log('🔧 Corrigiendo tabla aulas...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');

    // Verificar si las columnas ya existen
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'aulas' 
      AND column_name IN ('created_at', 'updated_at')
    `);

    const existingColumns = results.map(r => r.column_name);
    console.log('📋 Columnas existentes:', existingColumns);

    // Agregar created_at si no existe
    if (!existingColumns.includes('created_at')) {
      console.log('➕ Agregando columna created_at...');
      await sequelize.query(`
        ALTER TABLE aulas 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      `);
      
      // Actualizar filas existentes
      await sequelize.query(`
        UPDATE aulas 
        SET created_at = CURRENT_TIMESTAMP 
        WHERE created_at IS NULL
      `);
      
      // Hacer NOT NULL
      await sequelize.query(`
        ALTER TABLE aulas 
        ALTER COLUMN created_at SET NOT NULL
      `);
      console.log('✅ Columna created_at agregada');
    } else {
      console.log('ℹ️  Columna created_at ya existe');
    }

    // Agregar updated_at si no existe
    if (!existingColumns.includes('updated_at')) {
      console.log('➕ Agregando columna updated_at...');
      await sequelize.query(`
        ALTER TABLE aulas 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      `);
      
      // Actualizar filas existentes
      await sequelize.query(`
        UPDATE aulas 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE updated_at IS NULL
      `);
      
      // Hacer NOT NULL
      await sequelize.query(`
        ALTER TABLE aulas 
        ALTER COLUMN updated_at SET NOT NULL
      `);
      console.log('✅ Columna updated_at agregada');
    } else {
      console.log('ℹ️  Columna updated_at ya existe');
    }

    // Verificar resultado final
    const [finalResults] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'aulas'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Estructura final de la tabla aulas:');
    finalResults.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('\n✅ Tabla aulas corregida exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al corregir tabla aulas:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixAulasTimestamps();
}

module.exports = { fixAulasTimestamps };



