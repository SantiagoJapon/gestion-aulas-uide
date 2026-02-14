const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { sequelize } = require('../config/database');
const Models = require('../models');

async function syncDatabase() {
    try {
        console.log('🔄 Sincronizando base de datos...');
        // Usamos alter: true para intentar modificar las tablas sin borrarlas
        // Si hay cambios drásticos, podría requerir force: true (cuidado, borra datos)
        await sequelize.sync({ alter: true });
        console.log('✅ Base de datos sincronizada correctamente.');
    } catch (error) {
        console.error('❌ Error al sincronizar la base de datos:', error);
    } finally {
        await sequelize.close();
    }
}

syncDatabase();
