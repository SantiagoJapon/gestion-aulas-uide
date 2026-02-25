const Usuario = require('../models/User');

/**
 * Seadea datos iniciales en la base de datos si no existen usuarios administradores.
 * NO crea datos de ejemplo - solo el usuario admin mínimo necesario.
 */
const seedData = async () => {
    try {
        const adminCount = await Usuario.count({ where: { rol: 'admin' } });
        if (adminCount === 0) {
            console.log('🔐 Creando usuario administrador inicial...');

            // Solo crear admin - sin datos de ejemplo
            const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'uide2024';
            await Usuario.create({
                nombre: 'Admin',
                apellido: 'Sistema',
                email: 'admin@uide.edu.ec',
                password: adminPassword,
                rol: 'admin',
                estado: 'activo'
            });

            console.log('✅ Usuario admin creado: admin@uide.edu.ec');
        } else {
            console.log('ℹ️  Ya existen usuarios en la base de datos - omitiendo seed');
        }
    } catch (error) {
        console.error('❌ Error al sembrar datos iniciales:', error);
    }
};

module.exports = { seedData };
