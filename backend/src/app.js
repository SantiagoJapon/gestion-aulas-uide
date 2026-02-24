const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const { testConnection } = require('./config/database');
const routes = require('./routes');
const {
    helmetConfig,
    authLimiter,
    apiLimiter,
    sanitizeInput,
    securityLogger,
    validateOrigin,
    preventSQLInjection
} = require('./middleware/security');

const app = express();

// ========================================
// OPTIMIZACIONES DE RENDIMIENTO
// ========================================
app.use(compression());

// ========================================
// CORS - DEBE IR PRIMERO
// ========================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5173',
        'http://localhost:3000'
    ];

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? allowedOrigins
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// ========================================
// MIDDLEWARES DE SEGURIDAD
// ========================================
app.use(helmetConfig);
app.use(validateOrigin);
app.use(preventSQLInjection);
app.use(sanitizeInput);
app.use(securityLogger);

// Rate Limiting
app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);

// ========================================
// MIDDLEWARES DE PARSEO
// ========================================
app.use(express.json({ charset: 'utf-8', limit: '10kb' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8', limit: '10kb' }));

// Configurar charset UTF-8 en todas las respuestas
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// Logger
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('tiny', {
        skip: (req, res) => res.statusCode < 400
    }));
}

// Estáticos
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ========================================
// RUTAS BÁSICAS / HEALTH
// ========================================
app.get('/', (req, res) => {
    res.json({
        message: 'API de Gestión de Aulas UIDE Loja',
        version: '1.0.0',
        status: 'running'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

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

// ========================================
// RUTAS DE LA API (MODULARIZADAS)
// ========================================
app.use('/api', routes);

// ========================================
// RUTAS DE APRENDIZAJE / DEBUG (SOLO DESARROLLO)
// ========================================
if (process.env.NODE_ENV === 'development') {
    app.get('/admin/aulas', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/admin/aulas.html'));
    });
}

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

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    const statusCode = err.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV === 'development';

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

module.exports = app;
