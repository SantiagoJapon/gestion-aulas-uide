const { Client } = require('pg');

async function checkUser() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'gestion_aulas',
        password: 'postgres',
        port: 5433,
    });

    try {
        await client.connect();
        const res = await client.query("SELECT id, nombre, email, rol::text as role_text, length(rol::text) as len FROM usuarios WHERE nombre ILIKE '%Lorena%'");
        res.rows.forEach(r => {
            console.log(`User: ${r.nombre}, Rol: '${r.role_text}', Length: ${r.len}`);
        });
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
        process.exit();
    }
}

checkUser();
