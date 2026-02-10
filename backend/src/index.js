require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { testConnection, syncDatabase } = require('./config/database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// CORS - DEBE IR PRIMERO
// ========================================
// CORS - Configuración para permitir peticiones del frontend
app.use(cors({
  origin: function (origin, callback) {
    const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');
    // Permitir requests sin origin (mismo servidor, curl, etc)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // En produccion Nginx maneja el proxy, no hay CORS real
    }
  },
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

// Rate Limiting - Habilitado en produccion
if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth/', authLimiter);
  app.use('/api/', apiLimiter);
}

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

app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

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

app.get('/admin/aulas', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/aulas.html'));
});

app.get('/admin/aulas-simulado', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Distribución simulada</title>
  <style>
  :root{--card:#ffffff;--muted:#6b7280;--primary:#8b004c}
  body{margin:0;background:#f7f6fb;color:#1f2937;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial}
  .container{max-width:1100px;margin:24px auto;padding:0 16px}
  .title{font-size:24px;font-weight:700}
  .subtitle{color:var(--muted);font-size:14px;margin-bottom:12px}
  .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
  .card{background:var(--card);border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  .card h3{margin:0 0 8px 0;font-size:14px;color:var(--muted);font-weight:600}
  .card .value{font-size:28px;font-weight:700}
  .table{margin-top:14px;background:var(--card);border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);overflow:hidden}
  table{width:100%;border-collapse:collapse}
  th,td{padding:12px;border-bottom:1px solid #f1f5f9;text-align:left;font-size:14px}
  th{font-size:12px;letter-spacing:.02em;color:var(--muted);text-transform:uppercase;background:#8b004c;color:#fff}
  .chip{display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:600}
  .chip.green{background:#dcfce7;color:#166534}
  .chip.yellow{background:#fef9c3;color:#854d0e}
  .chip.red{background:#fee2e2;color:#7f1d1d}
  .chip.blue{background:#dbeafe;color:#1e3a8a}
  </style></head><body>
  <div class="container">
    <div class="title">Distribución de espacios</div>
    <div class="subtitle">Simulación visual para captura</div>
    <div class="cards">
      <div class="card"><h3>Total de clases</h3><div id="distTotal" class="value">—</div></div>
      <div class="card"><h3>Asignadas + Simuladas</h3><div id="distAsignadasSim" class="value">—</div></div>
      <div class="card"><h3>Pendientes</h3><div id="distPendientes" class="value">—</div></div>
    </div>
    <div class="table">
      <table>
        <thead>
          <tr>
            <th>Carrera</th><th>Materia</th><th>Día</th><th>Horario</th><th>Estudiantes</th><th>Aula</th><th>Estado</th>
          </tr>
        </thead>
        <tbody id="tablaDistribucion"></tbody>
      </table>
    </div>
  </div>
  <script>
    const data = [
      { carrera: 'Arquitectura', materia: 'Fundamentos de Diseño', dia: 'Lun/Mie', horario: '07:00 - 09:00', estudiantes: 35, aula: 'LAB-204', estado: 'asignada' },
      { carrera: 'Derecho', materia: 'Introducción al Derecho', dia: 'Mar/Jue', horario: '11:00 - 13:00', estudiantes: 42, aula: 'ROOM-102', estado: 'conflicto' },
      { carrera: 'Administración', materia: 'Ética Empresarial', dia: 'Lun/Vie', horario: '14:00 - 16:00', estudiantes: 15, aula: 'AUD-1', estado: 'asignada' },
      { carrera: 'Arquitectura', materia: 'Bases Estructurales', dia: 'Vie', horario: '18:00 - 21:00', estudiantes: 22, aula: 'ROOM-305', estado: 'pendiente' },
      { carrera: 'Derecho', materia: 'Semiótica Visual', dia: 'Mié', horario: '07:00 - 09:00', estudiantes: 12, aula: 'LAB-101', estado: 'conflicto' },
      { carrera: 'Arquitectura', materia: 'Diseño de Interiores', dia: 'Mar', horario: '07:00 - 10:00', estudiantes: 35, aula: 'STUDIO-A', estado: 'asignada' },
      { carrera: 'Idiomas', materia: 'Inglés Técnico IV', dia: 'Mié/Vie', horario: '16:00 - 18:00', estudiantes: 18, aula: 'ROOM-201', estado: 'asignada' },
      { carrera: 'Derecho', materia: 'Derecho Constitucional', dia: 'Mar/Jue', horario: '08:00 - 10:00', estudiantes: 30, aula: 'ROOM-103', estado: 'simulada' },
      { carrera: 'Arquitectura', materia: 'Historia de la Arquitectura', dia: 'Lun', horario: '10:00 - 12:00', estudiantes: 28, aula: 'ROOM-205', estado: 'simulada' },
      { carrera: 'Derecho', materia: 'Derecho Penal', dia: 'Vie', horario: '09:00 - 11:00', estudiantes: 25, aula: 'ROOM-106', estado: 'asignada' }
    ];
    function chip(e){const m={asignada:'green',simulada:'blue',pendiente:'yellow',conflicto:'red'};const c=m[e]||'blue';return '<span class="chip '+c+'">'+e+'</span>';}
    function render(){
      const tbody=document.getElementById('tablaDistribucion');
      tbody.innerHTML=data.map(r=>'<tr><td>'+r.carrera+'</td><td>'+r.materia+'</td><td>'+r.dia+'</td><td>'+r.horario+'</td><td>'+r.estudiantes+'</td><td>'+r.aula+'</td><td>'+chip(r.estado)+'</td></tr>').join('');
      const total=data.length;
      const asignadas=data.filter(x=>x.estado==='asignada').length;
      const simuladas=data.filter(x=>x.estado==='simulada').length;
      const pendientes=data.filter(x=>x.estado==='pendiente').length;
      document.getElementById('distTotal').textContent=String(total);
      document.getElementById('distAsignadasSim').textContent=String(asignadas+simuladas);
      document.getElementById('distPendientes').textContent=String(pendientes);
    }
    render();
  </script>
  </body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
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

// Rutas de Espacios
const espacioRoutes = require('./routes/espacioRoutes');
app.use('/api/espacios', espacioRoutes);

// Rutas de Reportes
const reporteRoutes = require('./routes/reporteRoutes');
app.use('/api/reportes', reporteRoutes);

const { sequelize } = require('./config/database');
const { QueryTypes } = require('sequelize');

app.get('/admin/distribucion', async (req, res) => {
  try {
    const clases = await sequelize.query(`
      SELECT
        c.id, c.carrera, c.materia, c.ciclo, c.paralelo, c.dia,
        c.hora_inicio, c.hora_fin, c.num_estudiantes, c.docente, c.aula_sugerida,
        a.nombre AS aula_nombre, a.codigo AS aula_codigo
      FROM clases c
      LEFT JOIN aulas a 
        ON a.nombre = c.aula_sugerida OR a.codigo = c.aula_sugerida
      WHERE c.materia IS NOT NULL AND TRIM(c.materia) <> ''
      ORDER BY c.carrera NULLS LAST, c.materia
      LIMIT 50
    `, { type: QueryTypes.SELECT });

    const rows = clases.map(c => {
      const horario = `${(c.dia || '').toString()} ${(c.hora_inicio || '').toString()}-${(c.hora_fin || '').toString()}`.trim();
      const aula = (c.aula_nombre || c.aula_codigo || c.aula_sugerida || '').toString() || '—';
      const estado = c.aula_sugerida ? 'asignada' : 'pendiente';
      const chipCls = estado === 'asignada' ? 'green' : estado === 'pendiente' ? 'yellow' : 'blue';
      return `
        <tr>
          <td class="row-code">${(c.paralelo || '').toString()}</td>
          <td><strong>${(c.materia || '').toString()}</strong></td>
          <td>${(c.ciclo || '').toString()}</td>
          <td>${(c.docente || '').toString() || 'Unassigned'}</td>
          <td>${horario}</td>
          <td>${c.num_estudiantes || 0}</td>
          <td>${aula}</td>
          <td><span class="chip ${chipCls}">${estado}</span></td>
        </tr>
      `;
    }).join('');

    const total = clases.length;
    const asignadas = clases.filter(c => c.aula_sugerida).length;
    const pendientes = total - asignadas;

    const html = `
    <!DOCTYPE html>
    <html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Distribución de espacios</title>
    <style>
    :root{--bg:#f7f6fb;--card:#ffffff;--text:#1f2937;--muted:#6b7280;--primary:#8b004c}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial}
    .container{max-width:1100px;margin:24px auto;padding:0 16px}
    .title{font-size:24px;font-weight:700}.subtitle{color:var(--muted);font-size:14px;margin-bottom:12px}
    .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
    .card{background:var(--card);border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .card h3{margin:0 0 8px 0;font-size:14px;color:var(--muted);font-weight:600}.card .value{font-size:28px;font-weight:700}
    .table{margin-top:14px;background:var(--card);border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);overflow:hidden}
    table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #f1f5f9;text-align:left;font-size:14px}
    th{font-size:12px;letter-spacing:.02em;color:#fff;text-transform:uppercase;background:#6e003d}
    .row-code{font-weight:700;color:#8b0000}
    .chip{display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:600}
    .chip.green{background:#dcfce7;color:#166534}.chip.yellow{background:#fef9c3;color:#854d0e}.chip.blue{background:#dbeafe;color:#1e3a8a}
    </style></head><body>
    <div class="container">
      <div class="title">Distribución de espacios</div>
      <div class="subtitle">Tabla generada con datos reales de la base de datos</div>
      <div class="cards">
        <div class="card"><h3>Total de clases</h3><div class="value">${total}</div></div>
        <div class="card"><h3>Asignadas</h3><div class="value">${asignadas}</div></div>
        <div class="card"><h3>Pendientes</h3><div class="value">${pendientes}</div></div>
      </div>
      <div class="table">
        <table>
          <thead><tr>
            <th>Code</th><th>Subject</th><th>Level</th><th>Teacher</th><th>Schedule</th><th>Students</th><th>Room</th><th>Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    </body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    res.status(500).send(`<pre>Error al consultar clases: ${e.message}</pre>`);
  }
});
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

    // Sincronizar modelos con la base de datos sin perder datos
    console.log('🔄 Sincronizando modelos con PostgreSQL...');
    await syncDatabase({
      alter: false,
      force: false
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
          piso: Math.floor((i - 1) / 5) + 1,
          tipo: 'AULA',
          estado: 'DISPONIBLE'
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
          carrera_director: carreras[dir.carrera].carrera,
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
