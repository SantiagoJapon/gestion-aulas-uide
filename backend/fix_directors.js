
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'gestion_aulas',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const emails_to_fix = [
    'raquel.veintimilla@uide.edu.ec',
    'lorena.conde@uide.edu.ec',
    'freddy.salazar@uide.edu.ec',
    'domenica.burneo@uide.edu.ec',
    'franklin.chacon@uide.edu.ec',
    'mercy.namicela@uide.edu.ec'
];

async function fixDirectors() {
    try {
        await client.connect();
        console.log('Connectado a la base de datos.');

        // 1. Check current status
        console.log('--- Estado Actual ---');
        const checkRes = await client.query(`SELECT id, nombre, apellido, email, rol FROM users WHERE email = ANY($1)`, [emails_to_fix]);
        checkRes.rows.forEach(row => {
            console.log(`${row.email}: ${row.rol}`);
        });

        // 2. Update roles
        console.log('\n--- Actualizando Roles a "director" ---');
        const updateRes = await client.query(`UPDATE users SET rol = 'director' WHERE email = ANY($1)`, [emails_to_fix]);
        console.log(`Filas actualizadas: ${updateRes.rowCount}`);

        // 3. Verify
        console.log('\n--- Verificando Cambios ---');
        const verifyRes = await client.query(`SELECT id, nombre, apellido, email, rol FROM users WHERE email = ANY($1)`, [emails_to_fix]);
        verifyRes.rows.forEach(row => {
            console.log(`${row.email}: ${row.rol}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixDirectors();
