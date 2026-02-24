const { Client } = require('pg');
require('dotenv').config();

async function fixForeignKey() {
    const client = new Client({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'gestion_aulas',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT || 5433,
    });

    try {
        await client.connect();

        console.log('--- Buscando usuarios con carrera_director inválida ---');
        const usersRes = await client.query(`
            SELECT id, nombre, email, rol, carrera_director 
            FROM usuarios 
            WHERE carrera_director IS NOT NULL 
            AND carrera_director NOT IN (SELECT carrera FROM uploads_carreras)
        `);

        console.log(`Se encontraron ${usersRes.rows.length} usuarios con valores inválidos:`);
        usersRes.rows.forEach(row => {
            console.log(`ID: ${row.id}, Email: ${row.email}, Carrera Director: ${row.carrera_director}`);
        });

        console.log('\n--- Carreras disponibles en uploads_carreras ---');
        const carrerasRes = await client.query('SELECT carrera FROM uploads_carreras');
        carrerasRes.rows.forEach(row => {
            console.log(`- ${row.carrera}`);
        });

        if (usersRes.rows.length > 0) {
            console.log('\nIntentando arreglar los problemas...');
            // En este caso, si carrera_director es '3', tal vez sea un ID?
            // Pero el modelo usa el nombre de la carrera.
            // Si no sabemos a qué carrera se refiere, podríamos ponerlo a NULL

            for (const row of usersRes.rows) {
                if (row.carrera_director === '3') {
                    // Buscar si existe una carrera con ID 3
                    const carreraById = await client.query('SELECT carrera FROM uploads_carreras WHERE id = 3');
                    if (carreraById.rows.length > 0) {
                        const correctName = carreraById.rows[0].carrera;
                        console.log(`Cambiando carrera_director de '3' a '${correctName}' para el usuario ${row.email}`);
                        await client.query('UPDATE usuarios SET carrera_director = $1 WHERE id = $2', [correctName, row.id]);
                    } else {
                        console.log(`No se encontró carrera con ID 3. Seteando carrera_director a NULL para ${row.email}`);
                        await client.query('UPDATE usuarios SET carrera_director = NULL WHERE id = $1', [row.id]);
                    }
                } else {
                    console.log(`Valor '${row.carrera_director}' no reconocido. Seteando a NULL para ${row.email}`);
                    await client.query('UPDATE usuarios SET carrera_director = NULL WHERE id = $1', [row.id]);
                }
            }
            console.log('Corrección completada.');
        } else {
            console.log('No se encontraron usuarios para corregir.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
        process.exit();
    }
}

fixForeignKey();
