const { Client } = require('pg');

async function syncEstudiantes() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'gestion_aulas',
        password: 'postgres',
        port: 5433,
    });

    try {
        await client.connect();

        const newName = 'Ingeniería en Tecnologías de la Información';

        // Actualizar variaciones de Informática/Sistemas/Tecnologías de la Información
        const res = await client.query(`
            UPDATE estudiantes 
            SET escuela = $1 
            WHERE escuela ILIKE '%Informática%' 
               OR escuela ILIKE '%Informatica%' 
               OR escuela ILIKE '%Sistemas de Información%'
               OR escuela ILIKE '%Tecnologías de la Información%'
               OR escuela ILIKE '%Tecnologias de la Información%'
               OR escuela ILIKE '%Tecnologias de la Informacion%'
        `, [newName]);

        console.log(`Updated ${res.rowCount} students to '${newName}'`);

        // También actualizar Derecho etc para remover el " - Loja" si queremos consistencia, 
        // pero el usuario dijo "donde digan Derecho", así que el sufijo no molesta tanto si el filtro es part-of.
        // Sin embargo, para consistencia con el catálogo de carreras sería mejor limpiarlos.

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
        process.exit();
    }
}

syncEstudiantes();
