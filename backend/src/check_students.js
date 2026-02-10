const { Client } = require('pg');

async function checkStudents() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'gestion_aulas',
        password: 'postgres',
        port: 5433,
    });

    try {
        await client.connect();
        const res = await client.query("SELECT DISTINCT escuela FROM estudiantes LIMIT 20");
        console.log('Distinct escuelas in DB:');
        res.rows.forEach(r => {
            console.log(`- '${r.escuela}'`);
        });

        const count = await client.query("SELECT COUNT(*) FROM estudiantes");
        console.log(`Total students: ${count.rows[0].count}`);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
        process.exit();
    }
}

checkStudents();
