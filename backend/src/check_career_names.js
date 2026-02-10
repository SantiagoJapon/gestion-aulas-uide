const { Client } = require('pg');

async function checkSpecific() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'gestion_aulas',
        password: 'postgres',
        port: 5433,
    });

    try {
        await client.connect();
        const res = await client.query("SELECT DISTINCT escuela FROM estudiantes WHERE escuela ILIKE '%Informática%' OR escuela ILIKE '%Informatica%' OR escuela ILIKE '%Sistemas%' OR escuela ILIKE '%Tecnolog%'");
        console.log('Found:', res.rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
        process.exit();
    }
}

checkSpecific();
