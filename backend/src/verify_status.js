const { Client } = require('pg');

async function checkStatus() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'gestion_aulas',
        password: 'postgres',
        port: 5433,
    });

    try {
        await client.connect();

        const resDisp = await client.query("SELECT count(*) FROM aulas WHERE estado = 'DISPONIBLE'");
        console.log(`Aulas 'DISPONIBLE' (uppercase): ${resDisp.rows[0].count}`);

        const resLower = await client.query("SELECT count(*) FROM aulas WHERE estado = 'disponible'");
        console.log(`Aulas 'disponible' (lowercase): ${resLower.rows[0].count}`);

        if (parseInt(resLower.rows[0].count) > 0) {
            console.log('⚠️ WARNING: Found lowercase statuses. Fixing...');
            await client.query("UPDATE aulas SET estado = 'DISPONIBLE' WHERE estado = 'disponible'");
            console.log('Fixed lowercase statuses.');
        } else {
            console.log('✅ Statuses are standardized (No lowercase "disponible" found).');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
        process.exit();
    }
}

checkStatus();
