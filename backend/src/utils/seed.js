const Usuario = require('../models/User');
const Carrera = require('../models/Carrera');
const Aula = require('../models/Aula');

/**
 * Seadea datos iniciales en la base de datos si no existen usuarios administradores.
 */
const seedData = async () => {
    try {
        const adminCount = await Usuario.count({ where: { rol: 'admin' } });
        if (adminCount === 0) {
            console.log('🔐 Creando usuarios iniciales...');

            // Crear carreras
            const carreras = await Carrera.bulkCreate([
                { carrera: 'Derecho', carrera_normalizada: 'derecho', activa: true },
                { carrera: 'Informática', carrera_normalizada: 'informatica', activa: true },
                { carrera: 'Arquitectura', carrera_normalizada: 'arquitectura', activa: true },
                { carrera: 'Psicología', carrera_normalizada: 'psicologia', activa: true },
                { carrera: 'Business', carrera_normalizada: 'business', activa: true }
            ]);

            // Crear aulas
            for (let i = 1; i <= 20; i++) {
                const codigo = `A-${String(i).padStart(2, '0')}`;
                await Aula.create({
                    nombre: `Aula ${codigo}`,
                    codigo: codigo,
                    capacidad: 30,
                    edificio: 'Principal',
                    piso: Math.floor((i - 1) / 5) + 1,
                    tipo: 'AULA',
                    estado: 'DISPONIBLE'
                });
            }

            // El modelo User tiene hook beforeCreate que hashea el password automáticamente
            // Por eso pasamos passwords SIN hashear

            // Crear admin
            const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'uide2024';
            await Usuario.create({
                nombre: 'Admin',
                apellido: 'Sistema',
                email: 'admin@uide.edu.ec',
                password: adminPassword,
                rol: 'admin',
                estado: 'activo'
            });

            // Crear directores
            const directorPassword = process.env.DEFAULT_DIRECTOR_PASSWORD || 'uide2024';
            const directoresData = [
                { nombre: 'Raquel', apellido: 'Veintimilla', email: 'raquel.veintimilla@uide.edu.ec', carrera: 0 },
                { nombre: 'Lorena', apellido: 'Conde', email: 'lorena.conde@uide.edu.ec', carrera: 1 },
                { nombre: 'Freddy', apellido: 'Salazar', email: 'freddy.salazar@uide.edu.ec', carrera: 2 },
                { nombre: 'Domenica', apellido: 'Burneo', email: 'domenica.burneo@uide.edu.ec', carrera: 3 },
                { nombre: 'Franklin', apellido: 'Chacon', email: 'franklin.chacon@uide.edu.ec', carrera: 4 },
                { nombre: 'Mercy', apellido: 'Namicela', email: 'mercy.namicela@uide.edu.ec', carrera: 4 }
            ];

            for (const dir of directoresData) {
                await Usuario.create({
                    nombre: dir.nombre,
                    apellido: dir.apellido,
                    email: dir.email,
                    password: directorPassword,
                    rol: 'director',
                    carrera_director: carreras[dir.carrera].carrera,
                    estado: 'activo'
                });
            }

            console.log('✅ Usuarios creados: 1 admin + 6 directores');
        }
    } catch (error) {
        console.error('❌ Error al sembrar datos iniciales:', error);
    }
};

module.exports = { seedData };
