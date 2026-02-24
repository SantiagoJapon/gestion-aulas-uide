const { Client } = require('pg');
require('dotenv').config();

async function fixDatabase() {
    const client = new Client({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'gestion_aulas',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT || 5433,
    });

    try {
        await client.connect();

        console.log('--- Corrigiendo Problema de Enum en Reservas ---');

        // 1. Verificar si la tabla existe
        const tableCheck = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reservas')");
        if (tableCheck.rows[0].exists) {
            console.log('La tabla reservas existe.');

            // 2. Remover default si existe
            console.log('Removiendo default de columna estado...');
            await client.query('ALTER TABLE reservas ALTER COLUMN estado DROP DEFAULT');

            // 3. Crear el tipo ENUM si no existe
            console.log('Creando tipo enum_reservas_estado si no existe...');
            await client.query(`
                DO $$ BEGIN
                    CREATE TYPE "enum_reservas_estado" AS ENUM('activa', 'cancelada', 'pendiente_aprobacion', 'rechazada', 'finalizada');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `);

            // 4. Convertir la columna al tipo ENUM usando CAST
            console.log('Convirtiendo columna estado a enum_reservas_estado...');
            // Primero nos aseguramos de que no haya valores nulos o vacíos si no se permiten, o que sean válidos
            await client.query(`
                UPDATE reservas 
                SET estado = 'activa' 
                WHERE estado IS NULL OR estado NOT IN ('activa', 'cancelada', 'pendiente_aprobacion', 'rechazada', 'finalizada')
            `);

            await client.query(`
                ALTER TABLE reservas 
                ALTER COLUMN estado TYPE "enum_reservas_estado" 
                USING (estado::"enum_reservas_estado")
            `);

            // 5. Volver a poner el default
            console.log('Restableciendo default a "activa"...');
            await client.query('ALTER TABLE reservas ALTER COLUMN estado SET DEFAULT \'activa\'');

            console.log('Conversión manual completada.');
        } else {
            console.log('La tabla reservas no existe. Sequelize debería crearla desde cero sin problemas.');
        }

        console.log('\n--- Verificando Usuarios ---');
        await client.query('UPDATE usuarios SET carrera_director = NULL WHERE carrera_director IS NOT NULL AND carrera_director NOT IN (SELECT carrera FROM uploads_carreras)');

        console.log('Correcciones terminadas.');

    } catch (err) {
        console.error('Error durante la corrección:', err.message);
        if (err.detail) console.error('Detalle:', err.detail);
    } finally {
        await client.end();
        process.exit();
    }
}

fixDatabase();
