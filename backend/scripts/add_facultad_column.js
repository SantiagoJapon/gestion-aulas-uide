const { sequelize } = require('../src/config/database');

async function addFacultadColumn() {
    try {
        const tableInfo = await sequelize.getQueryInterface().describeTable('uploads_carreras');

        if (!tableInfo.facultad) {
            console.log('Adding "facultad" column to "uploads_carreras" table...');
            await sequelize.query('ALTER TABLE uploads_carreras ADD COLUMN facultad VARCHAR(150);');
            console.log('Column "facultad" added successfully.');
        } else {
            console.log('Column "facultad" already exists.');
        }
    } catch (error) {
        console.error('Error adding column:', error);
    } finally {
        await sequelize.close();
    }
}

addFacultadColumn();
