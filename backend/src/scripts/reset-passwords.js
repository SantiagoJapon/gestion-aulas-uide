require('dotenv').config();
const { sequelize } = require('../config/database');
const { User: Usuario } = require('../models');

const resetPasswords = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a BD establecida.');

        const usuarios = [
            { email: 'admin@uide.edu.ec', pass: 'admin123' },
            { email: 'raquel.veintimilla@uide.edu.ec', pass: 'uide2024' },
            { email: 'lorena.conde@uide.edu.ec', pass: 'uide2024' },
            { email: 'freddy.salazar@uide.edu.ec', pass: 'uide2024' },
            { email: 'domenica.burneo@uide.edu.ec', pass: 'uide2024' },
            { email: 'franklin.chacon@uide.edu.ec', pass: 'uide2024' },
            { email: 'mercy.namicela@uide.edu.ec', pass: 'uide2024' }
        ];

        for (const u of usuarios) {
            const usuario = await Usuario.findOne({ where: { email: u.email } });
            if (usuario) {
                // Asignamos la contraseña en texto plano.
                // El hook 'beforeUpdate' del modelo User detectará el cambio y lo hasheará automáticamente.
                usuario.password = u.pass;
                await usuario.save();
                console.log(`✅ Password actualizado para: ${u.email} -> ${u.pass}`);
            } else {
                console.warn(`⚠️ Usuario no encontrado: ${u.email}`);
            }
        }

        console.log('🏁 Proceso finalizado.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

resetPasswords();
