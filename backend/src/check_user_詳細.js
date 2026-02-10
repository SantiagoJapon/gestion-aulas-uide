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
        const res = await client.query("SELECT id, nombre, email, rol, char_length(rol) as len FROM usuarios WHERE nombre ILIKE '%Lorena%'");
        res.rows.forEach(r => {
            console.log(`User: ${r.nombre}, Rol: '${r.rol}', Length: ${r.len}`);
        });
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
        process.exit();
    }
}

checkUser();
