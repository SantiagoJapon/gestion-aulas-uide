// Script EMERGENCIA - Lee credenciales del .env
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');

// LEER CREDENCIALES DEL .env
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'gestion_aulas';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin';

console.log('🔧 Usando credenciales del .env:');
console.log(`   Host: ${DB_HOST}`);
console.log(`   Port: ${DB_PORT}`);
console.log(`   Database: ${DB_NAME}`);
console.log(`   User: ${DB_USER}`);
console.log(`   Password: ${DB_PASSWORD}`);
console.log('');

// Configuración de la base de datos
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false
});

// Definir modelo de Usuario
const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  rol: {
    type: DataTypes.ENUM('admin', 'director', 'profesor', 'docente', 'estudiante'),
    allowNull: false,
    defaultValue: 'estudiante'
  },
  cedula: {
    type: DataTypes.STRING(20)
  },
  telefono: {
    type: DataTypes.STRING(20)
  },
  carrera_director: {
    type: DataTypes.INTEGER,
    references: {
      model: 'carreras',
      key: 'id'
    }
  },
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    defaultValue: 'activo'
  }
}, {
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Definir modelo de Carrera
const Carrera = sequelize.define('Carrera', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  carrera: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  carrera_normalizada: {
    type: DataTypes.STRING(100),
    unique: true
  },
  activa: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'carreras',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

async function crearUsuarios() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa\n');

    // 1. CREAR CARRERAS
    console.log('📚 Creando carreras...');
    const carreras = [
      { carrera: 'Derecho', carrera_normalizada: 'derecho', activa: true },
      { carrera: 'Informática', carrera_normalizada: 'informatica', activa: true },
      { carrera: 'Arquitectura', carrera_normalizada: 'arquitectura', activa: true },
      { carrera: 'Psicología', carrera_normalizada: 'psicologia', activa: true },
      { carrera: 'Business', carrera_normalizada: 'business', activa: true }
    ];

    const carrerasCreadas = {};
    for (const carr of carreras) {
      const [carrera] = await Carrera.findOrCreate({
        where: { carrera_normalizada: carr.carrera_normalizada },
        defaults: carr
      });
      carrerasCreadas[carr.carrera_normalizada] = carrera.id;
      console.log(`  ✓ ${carr.carrera} (ID: ${carrera.id})`);
    }
    console.log('');

    // 2. GENERAR CONTRASEÑAS HASHEADAS
    console.log('🔐 Generando contraseñas...');
    const passwordAdmin = await bcrypt.hash('admin123', 10);
    const passwordDirectores = await bcrypt.hash('uide2024', 10);
    console.log('  ✓ Contraseñas generadas\n');

    // 3. CREAR ADMIN
    console.log('👤 Creando administrador...');
    const [admin, adminCreated] = await Usuario.findOrCreate({
      where: { email: 'admin@uide.edu.ec' },
      defaults: {
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@uide.edu.ec',
        password: passwordAdmin,
        rol: 'admin',
        estado: 'activo'
      }
    });

    if (!adminCreated) {
      await admin.update({ password: passwordAdmin });
      console.log('  ✓ admin@uide.edu.ec (ACTUALIZADO)');
    } else {
      console.log('  ✓ admin@uide.edu.ec (CREADO)');
    }
    console.log('    Password: admin123\n');

    // 4. CREAR DIRECTORES
    console.log('👥 Creando directores...');
    const directores = [
      {
        nombre: 'Raquel',
        apellido: 'Veintimilla',
        email: 'raquel.veintimilla@uide.edu.ec',
        carrera: 'derecho'
      },
      {
        nombre: 'Lorena',
        apellido: 'Conde',
        email: 'lorena.conde@uide.edu.ec',
        carrera: 'informatica'
      },
      {
        nombre: 'Freddy',
        apellido: 'Salazar',
        email: 'freddy.salazar@uide.edu.ec',
        carrera: 'arquitectura'
      },
      {
        nombre: 'Domenica',
        apellido: 'Burneo',
        email: 'domenica.burneo@uide.edu.ec',
        carrera: 'psicologia'
      },
      {
        nombre: 'Franklin',
        apellido: 'Chacon',
        email: 'franklin.chacon@uide.edu.ec',
        carrera: 'business'
      },
      {
        nombre: 'Mercy',
        apellido: 'Namicela',
        email: 'mercy.namicela@uide.edu.ec',
        carrera: 'business'
      }
    ];

    for (const dir of directores) {
      const [director, created] = await Usuario.findOrCreate({
        where: { email: dir.email },
        defaults: {
          nombre: dir.nombre,
          apellido: dir.apellido,
          email: dir.email,
          password: passwordDirectores,
          rol: 'director',
          carrera_director: carrerasCreadas[dir.carrera],
          estado: 'activo'
        }
      });

      if (!created) {
        await director.update({
          password: passwordDirectores,
          carrera_director: carrerasCreadas[dir.carrera]
        });
        console.log(`  ✓ ${dir.email} (ACTUALIZADO)`);
      } else {
        console.log(`  ✓ ${dir.email} (CREADO)`);
      }
    }
    console.log('    Password para todos: uide2024\n');

    // 5. RESUMEN
    console.log('========================================');
    console.log('✅ USUARIOS CREADOS EXITOSAMENTE');
    console.log('========================================');
    console.log('');
    console.log('CREDENCIALES:');
    console.log('');
    console.log('👤 ADMIN:');
    console.log('   Email: admin@uide.edu.ec');
    console.log('   Password: admin123');
    console.log('');
    console.log('👥 DIRECTORES (Password para todos: uide2024):');
    console.log('   - raquel.veintimilla@uide.edu.ec (Derecho)');
    console.log('   - lorena.conde@uide.edu.ec (Informática)');
    console.log('   - freddy.salazar@uide.edu.ec (Arquitectura)');
    console.log('   - domenica.burneo@uide.edu.ec (Psicología)');
    console.log('   - franklin.chacon@uide.edu.ec (Business)');
    console.log('   - mercy.namicela@uide.edu.ec (Business - Coord.)');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.message.includes('password')) {
      console.error('');
      console.error('⚠️  EL PASSWORD DE POSTGRESQL ES INCORRECTO');
      console.error('');
      console.error('Actualiza backend/.env con el password correcto:');
      console.error('DB_PASSWORD=TU_PASSWORD_REAL');
      console.error('');
    }
  } finally {
    await sequelize.close();
  }
}

// Ejecutar
crearUsuarios();
