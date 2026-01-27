require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { testConnection, syncDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// CORS - DEBE IR PRIMERO
// ========================================
// CORS - Configuración para permitir peticiones del frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========================================
// MIDDLEWARES DE SEGURIDAD
// ========================================

// Seguridad mejorada
const { 
  helmetConfig, 
  authLimiter, 
  apiLimiter, 
  writeLimiter,
  sanitizeInput,
  securityLogger,
  validateOrigin,
  preventSQLInjection
} = require('./middleware/security');

// Helmet - Configuración mejorada de headers de seguridad
app.use(helmetConfig);

// Validar origen de requests
app.use(validateOrigin);

// Prevenir SQL Injection
app.use(preventSQLInjection);

// Sanitización de inputs
app.use(sanitizeInput);

// Logging de seguridad
app.use(securityLogger);

// Rate Limiting - Diferentes límites según el tipo de endpoint
// app.use('/api/auth/', authLimiter); // DESHABILITADO - Sin límite de intentos de autenticación
// app.use('/api/', apiLimiter); // DESHABILITADO TEMPORALMENTE - Límite general para API (para pruebas)

// ========================================
// MIDDLEWARES DE PARSEO
// ========================================

// Body parser con soporte UTF-8
app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));

// Configurar charset UTF-8 en todas las respuestas
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Logger - Solo en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ========================================
// RUTAS
// ========================================

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'API de Gestión de Aulas UIDE Loja',
    version: '1.0.0',
    status: 'running'
  });
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Ruta para verificar conexión a BD
app.get('/api/status', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      api: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      api: 'ok',
      database: 'error',
      error: error.message
    });
  }
});

// Rutas de autenticación
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Rutas de aulas
const aulaRoutes = require('./routes/aulaRoutes');
app.use('/api/aulas', aulaRoutes);

// Rutas de estudiantes (lookup por email)
const estudianteRoutes = require('./routes/estudianteRoutes');
app.use('/api/estudiantes', estudianteRoutes);

// Rutas de carreras habilitadas
const carreraRoutes = require('./routes/carreraRoutes');
app.use('/api/carreras', carreraRoutes);

// Rutas de integración con n8n
const n8nRoutes = require('./routes/n8n.routes');
app.use('/api/n8n', n8nRoutes);

// Rutas de planificaciones
const planificacionRoutes = require('./routes/planificacionRoutes');
app.use('/api/planificaciones', planificacionRoutes);

// Rutas de usuarios (admin)
const usuarioRoutes = require('./routes/usuarioRoutes');
app.use('/api/usuarios', usuarioRoutes);

// Rutas de distribución (proxy a n8n)
const distribucionRoutes = require('./routes/distribucionRoutes');
app.use('/api/distribucion', distribucionRoutes);

// Rutas del Bot
console.log('Cargando rutas del Bot: /disponibilidad, /docente, /reserva');
const botRoutes = require('./routes/botRoutes');
app.use('/api/bot', botRoutes);

// ========================================
// MANEJO DE ERRORES
// ========================================

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path
  });
});

// Manejador de errores global - No exponer detalles en producción
app.use((err, req, res, next) => {
  // Log completo del error (solo en servidor)
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.statusCode || 500;
  
  // En producción, no exponer detalles del error
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Mensaje genérico para errores del servidor
  const message = statusCode === 500 && !isDevelopment
    ? 'Error interno del servidor'
    : err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    error: message,
    ...(isDevelopment && { 
      stack: err.stack,
      details: err.details 
    })
  });
});

// ========================================
// INICIAR SERVIDOR Y CONECTAR A BD
// ========================================

const iniciarServidor = async () => {
  try {
    // Probar conexión a la base de datos
    await testConnection();

    // ⚡ SQLITE: Sincronizar modelos sin perder datos
    console.log('🔄 Sincronizando modelos con SQLite...');
    await syncDatabase({
      alter: false,
      force: false  // NO borrar datos existentes
    });
    console.log('✅ Modelos sincronizados');

    // Crear usuarios si no existen
    const Usuario = require('./models/User');
    const Carrera = require('./models/Carrera');
    const Aula = require('./models/Aula');
    const bcrypt = require('bcryptjs');

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
          piso: Math.floor((i-1) / 5) + 1,
          tipo: 'AULA',
          disponible: true
        });
      }

      // El modelo User tiene hook beforeCreate que hashea el password automáticamente
      // Por eso pasamos passwords SIN hashear

      // Crear admin
      await Usuario.create({
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@uide.edu.ec',
        password: 'admin123',  // Sin hashear - el hook lo hará
        rol: 'admin',
        estado: 'activo'
      });

      // Crear directores
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
          password: 'uide2024',  // Sin hashear - el hook lo hará
          rol: 'director',
          carrera_director: carreras[dir.carrera].id,
          estado: 'activo'
        });
      }

      console.log('✅ Usuarios creados: 1 admin + 6 directores');
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

iniciarServidor();

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

module.exports = app;
