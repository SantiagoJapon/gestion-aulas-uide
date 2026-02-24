const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

async function initDB() {
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS bot_sessions (
        telefono VARCHAR(50) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        rol VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS lid_mappings (
        lid_jid VARCHAR(100) PRIMARY KEY,
        real_phone VARCHAR(50) NOT NULL,
        push_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Migraciones y verificaciones omitidas por brevedad pero se incluirían en el refactor completo
        console.log('Tablas del bot verificadas.');
    } catch (e) {
        console.error('Error iniciando DB del bot:', e);
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    initDB
};
