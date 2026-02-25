/**
 * Script para limpiar datos de ejemplo de la base de datos.
 * Elimina: carreras, aulas, usuarios directors.
 * Conserva: usuarios admin.
 */

const { sequelize } = require('../config/database');
const Usuario = require('../models/User');
const Carrera = require('../models/Carrera');
const Aula = require('../models/Aula');

async function limpiarDatosEjemplo() {
    try {
        console.log('🧹 Iniciando limpieza de datos de ejemplo...\n');

        // 1. Eliminar usuarios directors (no admin)
        const directorsEliminados = await Usuario.destroy({
            where: { rol: 'director' }
        });
        console.log(`✅ Eliminados ${directorsEliminados} usuarios director`);

        // 2. Eliminar usuarios estudiantes
        const estudiantesEliminados = await Usuario.destroy({
            where: { rol: 'estudiante' }
        });
        console.log(`✅ Eliminados ${estudiantesEliminados} usuarios estudiante`);

        // 3. Eliminar usuarios docentes
        const docentesEliminados = await Usuario.destroy({
            where: { rol: 'docente' }
        });
        console.log(`✅ Eliminados ${docentesEliminados} usuarios docente`);

        // 4. Eliminar todas las carreras (usar CASCADE para eliminar dependientes)
        await sequelize.query('TRUNCATE "uploads_carreras" CASCADE');
        console.log(`✅ Eliminadas todas las carreras`);

        // 5. Eliminar todas las aulas (usar CASCADE)
        await sequelize.query('TRUNCATE "aulas" CASCADE');
        console.log(`✅ Eliminadas todas las aulas`);

        // 6. Verificar que queda el admin
        const adminCount = await Usuario.count({ where: { rol: 'admin' } });
        console.log(`\nℹ️  Usuarios admin restantes: ${adminCount}`);

        console.log('\n✅ Limpieza completada - solo queda el usuario admin');

    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
    } finally {
        await sequelize.close();
    }
}

limpiarDatosEjemplo();
