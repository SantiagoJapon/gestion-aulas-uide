# 🏛️ Sistema de Gestión de Aulas UIDE - Documentación Técnica Completa

![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)
![Status](https://img.shields.io/badge/status-ready_for_deployment-success.svg)
![Tech](https://img.shields.io/badge/stack-Full_Stack_/_AI_/_Automation-darkgreen.svg)

---

## 🆕 Novedades de la Versión 2.6.0

### Nuevas Funcionalidades
- **📧 Sistema de Envío de Emails**: Envío automático de credenciales de acceso a usuarios mediante nodemailer (SMTP)
- **📚 Catálogo de Materias**: Gestión centralizada del catálogo de materias por carrera
- **📊 Importación de Cupos**: Carga masiva de proyección de cupos por nivel
- **✅ Aprobación de Reservas**: Panel de administración para aprobar/rechazar solicitudes de reserva
- **🔐 Auto-login por Teléfono**: El bot de WhatsApp permite auto-login para usuarios registrados
- **👨‍🏫 Carga de Estudiantes**: Gestión de carga académica y asignación de estudiantes a materias

### Mejoras
- Rediseño del login con mascot UIDE
- Nuevo dashboard para docentes con información de próxima clase
- Mejoras en la distribución automática de aulas

---

## 📋 Tabla de Contenidos

1. [Visión General del Proyecto](#-visión-general-del-proyecto)
2. [Novedades (v2.6.0)](#-novedades-de-la-versión-260)
3. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Stack Tecnológico](#-stack-tecnológico)
4. [Estructura del Proyecto](#-estructura-del-proyecto)
5. [Backend - API REST](#-backend---api-rest)
   - [Modelos de Base de Datos](#modelos-de-base-de-datos)
   - [Controladores](#controladores)
   - [Servicios](#servicios)
   - [Rutas API](#rutas-api)
   - [Middleware de Seguridad](#middleware-de-seguridad)
6. [Frontend - Aplicación Web](#-frontend---aplicación-web)
   - [Arquitectura de Componentes](#arquitectura-de-componentes)
   - [Gestión de Estado](#gestión-de-estado)
   - [Páginas y Dashboards](#páginas-y-dashboards)
7. [Inteligencia Artificial y Automatización](#-inteligencia-artificial-y-automatización)
   - [Motor de Extracción Excel](#motor-de-extracción-excel)
   - [Algoritmos de Distribución](#algoritmos-de-distribución)
   - [Integración n8n](#integración-n8n)
8. [Bot de WhatsApp](#-bot-de-whatsapp)
9. [Seguridad del Sistema](#-seguridad-del-sistema)
   - [Autenticación y Autorización](#autenticación-y-autorización)
   - [Protección contra Amenazas](#protección-contra-amenazas)
   - [Validación de Datos](#validación-de-datos)
10. [Despliegue con Docker](#-despliegue-con-docker)
    - [Servicios Docker](#servicios-docker)
    - [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
11. [Funcionalidades por Rol](#-funcionalidades-por-rol)
12. [Guía de Instalación](#-guía-de-instalación)
13. [Mantenimiento](#-mantenimiento)

---

## 🌟 Visión General del Proyecto

El **Sistema de Gestión de Aulas UIDE** es una solución integral de última generación diseñada para optimizar la asignación de espacios físicos en la **Universidad Internacional del Ecuador (UIDE)**. El sistema transforma planificaciones académicas complejas en distribuciones eficientes y libres de conflictos mediante:

- **Inteligencia Artificial (IA)**: Algoritmos de optimización avanzada (Simulated Annealing, Algoritmos Genéticos, k-NN)
- **Automatización de Workflows**: Integración con n8n para procesamiento inteligente
- **Interfaz Web Premium**: Diseño estilo macOS con estética visual profesional
- **Bot de WhatsApp**: "Roomie" - Asistente virtual para consulta de aulas y reservas
- **Base de Datos Relacional**: PostgreSQL con modelo de datos optimizado

---

## 🏗️ Arquitectura del Sistema

El proyecto sigue una arquitectura de **microservicios** orquestada con Docker Compose:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                          │
│                    Puerto: 5173 (servido por Nginx)                        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTP/REST + JWT
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                          BACKEND (Node.js + Express)                       │
│                    Puerto: 3000                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Controllers  │  │   Services   │  │   Models     │  │  Middleware  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
│   PostgreSQL    │      │      Redis       │      │   WhatsApp Bot  │
│   Puerto: 5432  │      │   Puerto: 6379   │      │   Puerto: 3020  │
└────────────────┘      └───────────────────┘      └─────────────────┘
                                                        │
                                                ┌───────▼────────┐
                                                │  Evolution API │
                                                │  Puerto: 8080  │
                                                └────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         n8n (Workflow Automation)                          │
│                    Puerto: 5678                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Workflows: Maestro, Validación Carreras, Parsing IA, Distribución   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

### Backend
| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| **Node.js** | ≥18.0.0 | Runtime de JavaScript |
| **Express** | ^4.18.2 | Framework web minimalista |
| **Sequelize** | ^6.35.0 | ORM para PostgreSQL |
| **PostgreSQL** | 15 | Base de datos relacional |
| **JWT** | ^9.0.2 | Tokens de autenticación |
| **bcryptjs** | ^2.4.3 | Hash de contraseñas |
| **Helmet** | ^7.1.0 | Headers de seguridad HTTP |
| **express-rate-limit** | ^7.1.5 | Limitación de peticiones |
| **xlsx** | ^0.18.5 | Parsing de archivos Excel |
| **OpenAI** | ^4.20.0 | Integración con GPT-4 |
| **pdfmake** | ^0.3.3 | Generación de PDFs |
| **nodemailer** | ^8.0.1 | Envío de emails institucionales |

### Frontend
| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| **React** | ^18.3.1 | Biblioteca de UI |
| **TypeScript** | ^5.6.3 | Tipado estático |
| **Vite** | ^5.4.5 | Build tool moderno |
| **Tailwind CSS** | ^3.4.13 | Framework CSS utility-first |
| **React Router** | ^6.26.0 | Enrutamiento |
| **Axios** | ^1.7.7 | Cliente HTTP |
| **date-fns** | ^4.1.0 | Manipulación de fechas |
| **Lucide React** | ^0.563.0 | Iconos |
| **React Joyride** | ^2.9.3 | Tutoriales guiados |

### Infraestructura
| Tecnología | Descripción |
|------------|-------------|
| **Docker** | Contenedorización |
| **Docker Compose** | Orquestación |
| **n8n** | Automatización de workflows |
| **Redis** | Cache y cola de mensajes |
| **Evolution API** | Gateway de WhatsApp |

---

## 📂 Estructura del Proyecto

```
gestion-aulas-uide/
├── backend/                          # API RESTful Node.js
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # Configuración Sequelize + PostgreSQL
│   │   ├── controllers/             # Lógica de negocio
│   │   │   ├── authController.js    # Autenticación (login, register, perfil)
│   │   │   ├── aulaController.js    # Gestión de aulas
│   │   │   ├── distribucionController.js  # Distribución de clases
│   │   │   ├── estudianteController.js    # Gestión de estudiantes
│   │   │   ├── docenteController.js       # Gestión de docentes
│   │   │   ├── planificacionController.js # Carga de planificaciones
│   │   │   ├── reservaController.js      # Reservas de espacios
│   │   │   ├── reporteController.js      # Generación de reportes
│   │   │   ├── botController.js           # Integración con bot
│   │   │   ├── materiaController.js      # Catálogo de materias
│   │   │   └── ...
│   │   ├── services/                # Lógica especializada
│   │   │   ├── excel-parser.service.js    # Parser inteligente Excel
│   │   │   ├── distribucion.service.js    # Motor de distribución
│   │   │   ├── ia-distribucion.service.js # Algoritmos IA
│   │   │   ├── n8n.service.js            # Integración n8n
│   │   │   ├── openai.service.js         # OpenAI GPT-4o
│   │   │   ├── reporte.service.js        # Generación reportes
│   │   │   └── whatsappService.js        # WhatsApp API
│   │   ├── models/                   # Modelos Sequelize
│   │   │   ├── User.js               # Modelo de usuarios
│   │   │   ├── Aula.js               # Modelo de aulas
│   │   │   ├── Estudiante.js         # Modelo de estudiantes
│   │   │   ├── Carrera.js            # Modelo de carreras
│   │   │   ├── Clase.js              # Modelo de clases
│   │   │   ├── Distribucion.js       # Modelo de distribución
│   │   │   ├── Docente.js            # Modelo de docentes
│   │   │   ├── Reserva.js            # Modelo de reservas
│   │   │   └── index.js              # Relaciones entre modelos
│   │   ├── routes/                   # Definición de rutas API
│   │   ├── middleware/               # Middlewares Express
│   │   │   ├── auth.js               # Verificación JWT
│   │   │   ├── security.js           # Seguridad (Helmet, CORS, Rate Limit)
│   │   │   ├── validation.js         # Validación Joi
│   │   │   ├── validators.js         # Validación express-validator
│   │   │   ├── inputSanitizer.js     # Sanitización de entradas
│   │   │   └── csrf.js               # Protección CSRF
│   │   ├── utils/
│   │   │   ├── jwt.js                # Generación/verificación JWT
│   │   │   └── encoding.js           # Manejo de codificación UTF-8
│   │   └── index.js                  # Punto de entrada Express
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                         # Aplicación React
│   ├── src/
│   │   ├── components/              # Componentes reutilizables
│   │   │   ├── common/              # Componentes genéricos
│   │   │   │   ├── Button.tsx       # Botón personalizado
│   │   │   │   ├── Modal.tsx        # Modal reutilizable
│   │   │   │   ├── DataTable.tsx    # Tabla de datos
│   │   │   │   └── GuidedTour.tsx   # Tutorial guiado
│   │   │   ├── layout/              # Componentes de layout
│   │   │   │   ├── DashboardLayout.tsx    # Layout principal
│   │   │   │   ├── Navbar.tsx            # Barra de navegación
│   │   │   │   └── CommandKSearch.tsx     # Búsqueda global (Cmd+K)
│   │   │   ├── director/            # Componentes para Directores
│   │   │   │   └── SubirPlanificacion.tsx
│   │   │   ├── reservas/            # Componentes de reservas
│   │   │   │   └── ReservaWidget.tsx
│   │   │   └── *.tsx               # Varios componentes
│   │   ├── pages/                   # Páginas principales
│   │   │   ├── Login.tsx            # Login de usuarios
│   │   │   ├── Register.tsx         # Registro
│   │   │   ├── AdminDashboard.tsx   # Dashboard Administrador
│   │   │   ├── DirectorDashboard.tsx # Dashboard Director
│   │   │   ├── ProfesorDashboard.tsx # Dashboard Profesor
│   │   │   ├── EstudianteDashboard.tsx # Dashboard Estudiante
│   │   │   └── ForcePasswordChange.tsx # Cambio forzado de contraseña
│   │   ├── context/                  # Contextos React
│   │   │   └── AuthContext.tsx      # Estado de autenticación
│   │   ├── services/                # Servicios API
│   │   │   └── api.ts               # Cliente Axios
│   │   ├── App.tsx                  # Componente raíz
│   │   └── main.jsx                 # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
│
├── whatsapp-bot-aulas/               # Bot de WhatsApp "Roomie"
│   ├── bot.js                       # Lógica principal del bot
│   └── Dockerfile
│
├── n8n/                             # Workflows de automatización
│   ├── workflows/                   # Archivos JSON de workflows
│   └── credentials/                 # Credenciales encriptadas
│
├── docker-compose.yml               # Orquestación de servicios
├── docker-compose.prod.yml          # Producción
├── ecosystem.config.js              # Configuración PM2
└── README.md                        # Este documento
```

---

## 🔙 Backend - API REST

### Modelos de Base de Datos

El sistema utiliza **Sequelize ORM** con PostgreSQL. Los modelos principales son:

#### Modelo de Usuario ([`User.js`](backend/src/models/User.js))
```javascript
// Esquema de la tabla usuarios
{
  id: INTEGER PRIMARY KEY,
  nombre: STRING(100) NOT NULL,
  apellido: STRING(100) NOT NULL,
  email: STRING(255) UNIQUE NOT NULL,
  password: STRING(255) NOT NULL,  // bcrypt hash
  rol: ENUM('admin', 'director', 'profesor', 'docente', 'estudiante'),
  cedula: STRING(10) UNIQUE,
  telefono: STRING(10),
  carrera_director: STRING(100),   // FK a nombre de carrera (directores)
  estado: ENUM('activo', 'inactivo'),
  requiere_cambio_password: BOOLEAN
}
```

#### Modelo de Aula ([`Aula.js`](backend/src/models/Aula.js))
```javascript
{
  id: INTEGER PRIMARY KEY,
  nombre: STRING(50),
  codigo: STRING(20) UNIQUE,        // Código único: "A-01", "LAB-01"
  capacidad: INTEGER,
  edificio: STRING(50),
  piso: INTEGER,
  tipo: ENUM('AULA', 'LABORATORIO', 'AUDITORIO', 'SALON'),
  estado: ENUM('DISPONIBLE', 'MANTENIMIENTO', 'RESERVADA'),
  tiene_proyector: BOOLEAN,
  es_laboratorio: BOOLEAN
}
```

#### Modelo de Clase ([`Clase.js`](backend/src/models/Clase.js))
```javascript
{
  id: INTEGER PRIMARY KEY,
  materia: STRING(255),
  carrera_id: INTEGER,               // FK a Carrera
  materia_catalogo_id: INTEGER,      // FK a MateriaCatalogo
  docente_id: INTEGER,               // FK a Docente
  paralelo: STRING(20),
  ciclo: STRING(20),
  dia: STRING(20),                   // "Lunes", "Martes", etc.
  hora_inicio: TIME,
  hora_fin: TIME,
  numero_estudiantes: INTEGER,
  aula_asignada: STRING(20),         // FK al código del Aula
  modalidad: ENUM('presencial', 'virtual', 'laboratorio'),
  periodo_id: INTEGER                // FK a Periodo
}
```

#### Modelo de Distribución ([`Distribucion.js`](backend/src/models/Distribucion.js))
```javascript
{
  id: INTEGER PRIMARY KEY,
  clase_id: INTEGER NOT NULL,        // FK a Clase
  aula_id: INTEGER NOT NULL,         // FK a Aula
  dia: STRING(20),
  hora_inicio: TIME,
  hora_fin: TIME,
  periodo_id: INTEGER,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

#### Relaciones entre Modelos ([`index.js`](backend/src/models/index.js))

```javascript
// Usuario <-> Carrera (Directores)
User.belongsTo(Carrera, { foreignKey: 'carrera_director', targetKey: 'carrera' });
Carrera.hasMany(User, { foreignKey: 'carrera_director', as: 'directores' });

// Estudiante <-> Clase (Inscripciones) - Relación many-to-many
Estudiante.belongsToMany(Clase, { through: EstudianteMateria, ... });
Clase.belongsToMany(Estudiante, { through: EstudianteMateria, ... });

// Carrera <-> Clase
Carrera.hasMany(Clase, { foreignKey: 'carrera_id' });
Clase.belongsTo(Carrera, { foreignKey: 'carrera_id' });

// Aula <-> Clase (asignación)
Aula.hasMany(Clase, { foreignKey: 'aula_asignada', sourceKey: 'codigo' });
Clase.belongsTo(Aula, { foreignKey: 'aula_asignada', targetKey: 'codigo' });

// Clase <-> Distribucion
Clase.hasMany(Distribucion, { foreignKey: 'clase_id' });
Distribucion.belongsTo(Clase, { foreignKey: 'clase_id' });

// Docente <-> User (perfil académico + cuenta acceso)
Docente.belongsTo(User, { foreignKey: 'usuario_id' });
User.hasOne(Docente, { foreignKey: 'usuario_id' });
```

### Controladores

Los controladores manejan la lógica de negocio para cada recurso:

| Controlador | Funcionalidad |
|-------------|---------------|
| [`authController.js`](backend/src/controllers/authController.js) | Login, registro, perfil, cambio de contraseña |
| [`aulaController.js`](backend/src/controllers/aulaController.js) | CRUD de aulas, búsqueda, disponibilidad |
| [`estudianteController.js`](backend/src/controllers/estudianteController.js) | Gestión de estudiantes, inscripciones |
| [`docenteController.js`](backend/src/controllers/docenteController.js) | Docentes extraídos de planificaciones |
| [`distribucionController.js`](backend/src/controllers/distribucionController.js) | Distribución de clases, mapa de calor, reportes |
| [`planificacionController.js`](backend/src/controllers/planificacionController.js) | Carga y parsing de planificaciones Excel |
| [`reservaController.js`](backend/src/controllers/reservaController.js) | Reservas de espacios |
| [`reporteController.js`](backend/src/controllers/reporteController.js) | Generación de reportes ejecutivos |
| [`carreraController.js`](backend/src/controllers/carreraController.js) | Gestión de carreras |
| [`busquedaController.js`](backend/src/controllers/busquedaController.js) | Búsqueda global |
| [`incidenciaController.js`](backend/src/controllers/incidenciaController.js) | Gestión de incidencias |
| [`notificacionController.js`](backend/src/controllers/notificacionController.js) | Sistema de notificaciones |

### Servicios

#### Excel Parser Service ([`excel-parser.service.js`](backend/src/services/excel-parser.service.js))

El servicio de parsing de Excel implementa un sistema inteligente de detección de columnas:

```javascript
// Palabras clave para mapeo de columnas (ordenadas por prioridad)
const COLUMN_KEYWORDS = {
  // Específicos primero (evitar falsos positivos)
  codigo: ['codigo de la materia', 'codigo materia', 'cod materia'],
  materia: ['materia', 'asignatura', 'nombre materia', 'curso', 'taller'],
  docente: ['docente', 'profesor', 'teacher', 'instructor', 'catedratico'],
  paralelo: ['paralelo', 'grupo', 'seccion', 'division'],
  ciclo: ['ciclo', 'nivel', 'semestre', 'grado'],
  // ... más de 20 campos soportados
};

// Características principales:
// 1. Deduplicación ADN: Identifica clases únicas mediante clave compuesta
//    materia|docente|paralelo|ciclo
// 2. Extracción de metadatos: Perfiles de docentes desde planificaciones
// 3. Normalización lingüística: Manejo de tildes, mayúsculas, espacios
// 4. Detección dinámica: Mapeo automático de columnas por sinónimos
// 5. Manejo de celdas fusionadas y valores multilínea
```

#### IA Distribución Service ([`ia-distribucion.service.js`](backend/src/services/ia-distribucion.service.js))

Algoritmos de optimización implementados:

1. **Simulated Annealing (Recocido Simulado)**
   ```javascript
   // Optimización mediante exploración estocástica
   - Temperatura inicial: 1000
   - Enfriamiento: 0.95
   - Iteraciones por temperatura: 10
   - Criterio de aceptación: Probabilidad de Boltzmann
   ```

2. **Algoritmo k-NN (k-Nearest Neighbors)**
   ```javascript
   // Predicción de mejor aula basada en historial
   - Encuentra clases similares por: estudiantes, nivel, carrera, modalidad
   - Votación ponderada de aulas exitosas
   ```

3. **Selección Heurística**
   ```javascript
   // Scoring por capacidad adecuada
   - Perfecto (diff 0-10): +100 puntos
   - Aceptable (diff 10-20): +50 puntos
   - Sobrecupo (diff < 0): -200 puntos
   
   // Bonus por características
   - Proyector: +10 puntos
   - Laboratorio adecuado: +50 puntos
   ```

### Rutas API

| Método | Ruta | Descripción | Acceso |
|--------|------|-------------|--------|
| **Auth** | | | |
| POST | `/api/auth/register` | Registrar usuario | Público |
| POST | `/api/auth/login` | Iniciar sesión | Público |
| GET | `/api/auth/perfil` | Obtener perfil | Autenticado |
| PUT | `/api/auth/perfil` | Actualizar perfil | Autenticado |
| PUT | `/api/auth/cambiar-password` | Cambiar contraseña | Autenticado |
| POST | `/api/auth/crear-director` | Crear director | Admin |
| **Aulas** | | | |
| GET | `/api/aulas` | Listar todas las aulas | Público |
| GET | `/api/aulas/:id` | Obtener aula específica | Público |
| POST | `/api/aulas` | Crear aula | Admin |
| PUT | `/api/aulas/:id` | Actualizar aula | Admin |
| DELETE | `/api/aulas/:id` | Eliminar aula | Admin |
| GET | `/api/aulas/disponibilidad` | Ver disponibilidad | Autenticado |
| **Estudiantes** | | | |
| GET | `/api/estudiantes` | Listar estudiantes | Admin/Director |
| POST | `/api/estudiantes` | Crear estudiante | Admin |
| GET | `/api/estudiantes/login/:cedula` | Login por cédula | Público |
| **Distribución** | | | |
| GET | `/api/distribucion/estado` | Estado de distribución | Director/Admin |
| POST | `/api/distribucion/ejecutar` | Ejecutar distribución | Director/Admin |
| POST | `/api/distribucion/forzar` | Forzar distribución | Admin |
| GET | `/api/distribucion/horario` | Obtener horario | Director/Admin |
| GET | `/api/distribucion/heatmap` | Mapa de calor | Director/Admin |
| GET | `/api/distribucion/mi-distribucion` | Mi distribución | Todos |
| **Planificaciones** | | | |
| POST | `/api/planificaciones/upload` | Subir planificación | Director |
| GET | `/api/planificaciones` | Listar planificaciones | Director/Admin |
| **Reservas** | | | |
| GET | `/api/reservas` | Listar reservas | Autenticado |
| POST | `/api/reservas` | Crear reserva | Autenticado |
| GET | `/api/reservas/disponibles` | Aulas disponibles | Autenticado |
| **Reportes** | | | |
| GET | `/api/reportes/ejecutivo` | Reporte ejecutivo | Director/Admin |
| GET | `/api/reportes/pdf` | Generar PDF | Director/Admin |

### Middleware de Seguridad

El backend implementa múltiples capas de seguridad:

#### 1. Helmet.js ([`security.js`](backend/src/middleware/security.js:85))
```javascript
// Configuración de headers de seguridad
helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,      // 1 año
    includeSubDomains: true,
    preload: true
  }
});
```

#### 2. Rate Limiting
```javascript
// Limitación para autenticación (estricto)
authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 5,                      // 5 intentos
  skipSuccessfulRequests: true
});

// Limitación general API
apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500
});

// Limitación para operaciones de escritura
writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20   // 20 operaciones de escritura
});
```

#### 3. Validación de Origen
```javascript
const validateOrigin = (req, res, next) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  // En producción, validar origin contra lista blanca
};
```

#### 4. Prevención de SQL Injection
```javascript
const preventSQLInjection = (req, res, next) => {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/gi,
    /(--|;|\*|'|"|`)/g,
    /(\bOR\b.*=.*)/gi,
    /(\b1\s*=\s*1\b)/gi
  ];
  // Verificar body, query y params
};
```

#### 5. Autenticación JWT ([`auth.js`](backend/src/middleware/auth.js))
```javascript
const verificarAuth = async (req, res, next) => {
  // 1. Extraer token del header Authorization: Bearer <token>
  // 2. Verificar token con jwt.verify()
  // 3. Buscar usuario en BD (tabla usuarios o estudiantes)
  // 4. Verificar estado del usuario (debe estar 'activo')
  // 5. Adjuntar usuario al objeto req
};

const verificarRol = (...rolesPermitidos) => {
  // Verificar que el usuario tenga uno de los roles especificados
  // Retorna 403 si no tiene permisos
};
```

#### 6. Sanitización de Entradas ([`inputSanitizer.js`](backend/src/middleware/inputSanitizer.js))
- Escape de caracteres especiales
- Prevención XSS
- Normalización de texto

---

## 🎨 Frontend - Aplicación Web

### Arquitectura de Componentes

El frontend sigue una arquitectura de **componentes funcionales** con React y TypeScript:

```
src/
├── components/
│   ├── common/           # Componentes genéricos reutilizables
│   │   ├── Button.tsx    # Botón con variantes (primary, secondary, danger)
│   │   ├── Modal.tsx     # Modal genérico con portal
│   │   ├── DataTable.tsx # Tabla con paginación y ordenamiento
│   │   ├── FilterChips.tsx # Filtros visuales
│   │   └── GuidedTour.tsx  # Tutorial paso a paso (React Joyride)
│   │
│   ├── layout/           # Componentes de estructura
│   │   ├── DashboardLayout.tsx    # Layout principal con sidebar
│   │   ├── Navbar.tsx             # Barra de navegación
│   │   └── CommandKSearch.tsx     # Búsqueda global (Cmd+K)
│   │
│   ├── director/        # Componentes específicos de Directores
│   │   ├── SubirPlanificacion.tsx # Upload de Excel
│   │   └── DirectorModal.tsx      # Gestión de directores
│   │
│   ├── reservas/         # Componentes de reservas
│   │   └── ReservaWidget.tsx      # Widget de reservas
│   │
│   └── *.tsx            # Componentes de características
│
├── pages/               # Páginas principales
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── AdminDashboard.tsx
│   ├── DirectorDashboard.tsx
│   ├── ProfesorDashboard.tsx
│   └── EstudianteDashboard.tsx
│
├── context/             # Contextos React
│   └── AuthContext.tsx  # Estado global de autenticación
│
└── services/            # Servicios API
    └── api.ts           # Cliente Axios configurado
```

### Gestión de Estado

#### AuthContext ([`AuthContext.tsx`](frontend/src/context/AuthContext.tsx))

Proveedor de contexto que gestiona el estado de autenticación global:

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginEstudiante: (cedula: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}
```

**Características:**
- Persistencia en localStorage (rememberMe) o sessionStorage
- Verificación automática de token al cargar la app
- Limpieza de credenciales en logout
- Actualización de usuario en tiempo real

### Páginas y Dashboards

#### Dashboard de Administrador ([`AdminDashboard.tsx`](frontend/src/pages/AdminDashboard.tsx))
- Gestión de usuarios (crear, editar, eliminar)
- Gestión de carreras
- Gestión de aulas
- Reportes ejecutivos
- Configuración del sistema
- Estadísticas globales

#### Dashboard de Director ([`DirectorDashboard.tsx`](frontend/src/pages/DirectorDashboard.tsx))
- Subir planificaciones Excel
- Distribución automática de aulas
- Mapa de calor de ocupación
- Reportes por carrera
- Gestión de reservas
- Horario visual interactivo

#### Dashboard de Profesor ([`ProfesorDashboard.tsx`](frontend/src/pages/ProfesorDashboard.tsx))
- Ver mi horario
- Mis clases asignadas
- Reservar espacios
- Reportar incidencias

#### Dashboard de Estudiante ([`EstudianteDashboard.tsx`](frontend/src/pages/EstudianteDashboard.tsx))
- Ver horario de clases
- Buscar aulas disponibles
- Reservar espacios
- Consultar docente/materia

---

## 🧠 Inteligencia Artificial y Automatización

### Motor de Extracción Excel

El [`excel-parser.service.js`](backend/src/services/excel-parser.service.js) implementa:

1. **Deduplicación ADN**
   - Clave compuesta: `materia|docente|paralelo|ciclo`
   - Elimina duplicados de planificaciones

2. **Mapeo Dinámico de Columnas**
   - Soporta más de 20 sinónimos por campo
   - Detección automática de tipo de dato
   - Normalización de texto (UTF-8, tildes)

3. **Extracción de Metadatos**
   - Perfiles de docentes (títulos, email, dedicación)
   - Información de carreras

### Algoritmos de Distribución

El [`ia-distribucion.service.js`](backend/src/services/ia-distribucion.service.js) implementa:

| Algoritmo | Descripción | Complejidad |
|-----------|-------------|-------------|
| **Simulated Annealing** | Optimización global mediante recocido simulado | O(T × I) |
| **k-NN** | Predicción basada en vecinos más cercanos | O(n × k) |
| **Heurística** | Selección por scoring de capacidad | O(n × m) |

**Función de Scoring:**
```
score = 
  +100 (capacidad perfecta: diff 0-10)
  +50  (capacidad aceptable: diff 10-20)
  -200 (sobrecupo: diff < 0)
  +10  (proyector disponible)
  +50  (laboratorio para clase práctica)
```

### Integración n8n

El sistema utiliza **n8n** para automatización de workflows:

- **Workflow Maestro**: Orquestación central de acciones IA
- **Validación de Carreras**: Verificación de planes de estudio
- **Parsing con GPT-4o**: Procesamiento de listas de estudiantes
- **Distribución Automática**: Algoritmos de asignación
- **Health Check**: Monitoreo de disponibilidad

**Configuración en Docker:**
```yaml
n8n:
  image: docker.n8n.io/n8nio/n8n:latest
  environment:
    - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    - OPENAI_API_KEY=${OPENAI_API_KEY}
    - DB_TYPE=postgresdb
    - EXECUTIONS_MODE=regular
```

---

## 🤖 Bot de WhatsApp

El bot "Roomie" ([`bot.js`](whatsapp-bot-aulas/bot.js)) es un asistente conversacional que corre en WhatsApp:

### Características

1. **Autenticación por Cédula**
   - Integración con API del backend
   - Vinculación de número de teléfono

2. **Funcionalidades**
   - 🔍 Buscar aulas libres
   - 📅 Mis reservas
   - 👨‍🏫 Buscar profesor
   - 📚 Horario por materia
   - 📊 Estado general (director/admin)
   - 👤 Mi perfil

3. **Integración con Evolution API**
   - Envío de mensajes de texto
   - Botones interactivos
   - Listas de opciones

### Arquitectura Técnica

```javascript
// Stack del Bot
- Express.js: Servidor web
- Axios: Llamadas HTTP al backend
- pg: Conexión directa a PostgreSQL
- Evolution API: Gateway WhatsApp

// Optimizaciones
- Deduplicación de mensajes (evitar re-procesamiento)
- Limpieza de estados inactivos (cada 30 min)
- Cache en memoria de sesiones
- Fallback a texto si fallan botones
```

---

## 🛡️ Seguridad del Sistema

### Autenticación y Autorización

| Mecanismo | Implementación |
|-----------|----------------|
| **JWT** | HS256, expiración 1h (configurable) |
| **bcrypt** | Salt 10 rounds |
| **Roles** | admin, director, profesor, docente, estudiante |
| **Estado** | Solo usuarios activos pueden autenticarse |

### Protección contra Amenazas

| Amenaza | Protección |
|---------|------------|
| **Fuerza bruta** | Rate limiting (5 intentos/15min en auth) |
| **XSS** | Sanitización de inputs |
| **SQL Injection** | Validación de patrones peligrosos + Sequelize ORM |
| **CSRF** | Tokens en headers |
| **DoS** | Límite de payload 10KB |
| **Clickjacking** | X-Frame-Options: DENY |
| **MIME sniffing** | X-Content-Type-Options: nosniff |

### Validación de Datos

```javascript
// Contraseña: 8+ caracteres, mayúscula, minúscula, número
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Email: Solo correos institucionales
const emailPattern = /@uide\.edu\.ec$/;

// Validación dual: express-validator + Joi
router.post('/register', validarRegistro, validateRegisterJoi, registrarUsuario);
```

---

## 🐳 Despliegue con Docker

### Servicios Docker

| Servicio | Imagen | Puertos | Descripción |
|----------|--------|---------|-------------|
| **postgres** | postgres:15 | 5433:5432 | Base de datos |
| **redis** | redis:7-alpine | 6379:6379 | Cache/Colas |
| **backend** | Node.js | 3000:3000 | API REST |
| **frontend** | Nginx (Vite build) | 5173:80 | App web |
| **n8n** | n8nio/n8n:latest | 5678:5678 | Automatización |
| **evolution-api** | atendai/evolution-api | 8080:8080 | WhatsApp API |
| **whatsapp-bot** | Node.js | 3020:3020 | Bot Roomie |

### Configuración de Variables de Entorno

```bash
# Backend
NODE_ENV=production
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=gestion_aulas
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secure-secret

# Frontend
VITE_API_URL=http://localhost:3000

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# WhatsApp
EVOLUTION_API_KEY=your-api-key
EVOLUTION_INSTANCE=bot

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Sistema Gestión Aulas UIDE" <no-reply@uide.edu.ec>
```

### Redes

```yaml
networks:
  app_network:
    driver: bridge
```

Todos los servicios comparten la red `app_network` para comunicación interna:
- Backend accede a PostgreSQL via `postgres:5432`
- Bot accede a PostgreSQL via `gestion_aulas_db:5432`
- Frontend accede a Backend via `gestion_aulas_backend:3000`

---

## 👥 Funcionalidades por Rol

| Funcionalidad | Admin | Director | Profesor | Estudiante |
|---------------|:-----:|:--------:|:--------:|:----------:|
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ |
| Gestionar carreras | ✅ | ❌ | ❌ | ❌ |
| Gestionar aulas | ✅ | 🔄 | ❌ | ❌ |
| Gestionar materias (catálogo) | ✅ | ✅ | ❌ | ❌ |
| Subir planificación | ✅ | ✅ | ❌ | ❌ |
| Ejecutar distribución | ✅ | ✅ | ❌ | ❌ |
| Ver mapa de calor | ✅ | ✅ | ❌ | ❌ |
| Ver reportes | ✅ | ✅ | ❌ | ❌ |
| Carga de estudiantes | ✅ | ✅ | ❌ | ❌ |
| Importar cupos | ✅ | ✅ | ❌ | ❌ |
| Aprobar reservas | ✅ | ✅ | ❌ | ❌ |
| Ver mi horario | ✅ | ✅ | ✅ | ✅ |
| Reservar espacios | ✅ | ✅ | ✅ | ✅ |
| Reportar incidencia | ✅ | ✅ | ✅ | ✅ |
| Buscar aula | ✅ | ✅ | ✅ | ✅ |
| Buscar profesor | ✅ | ✅ | ✅ | ✅ |
| Estado general | ✅ | ✅ | ❌ | ❌ |
| Credenciales por email | ✅ | ✅ | ❌ | ❌ |

---

## 🚀 Guía de Instalación

### Requisitos Previos
- Docker >= 20.10
- Docker Compose >= 1.29
- 4GB RAM mínimo

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/SantiagoJapon/gestion-aulas-uide.git
   cd gestion-aulas-uide
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.production.example .env
   # Editar .env con valores reales
   ```

3. **Iniciar servicios**
   ```bash
   docker-compose up -d
   ```

4. **Verificar estado**
   ```bash
   docker-compose ps
   docker-compose logs -f backend
   ```

5. **Acceder a la aplicación**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - n8n: http://localhost:5678

---

## 🔧 Mantenimiento

### Comandos Útiles

```bash
# Reiniciar servicios
docker-compose restart backend

# Ver logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f whatsapp-bot

# Actualizar imágenes
docker-compose pull
docker-compose up -d

# Backup de base de datos
docker-compose exec postgres pg_dump -U postgres gestion_aulas > backup.sql

# Acceso a contenedores
docker-compose exec backend sh
docker-compose exec postgres psql -U postgres
```

### Generación de Secretos Seguros

```bash
# JWT Secret
openssl rand -base64 32

# Passwords
openssl rand -base64 24
```

---

## 📄 Resumen de Archivos Clave

| Archivo | Líneas | Propósito |
|---------|--------|------------|
| [`backend/src/index.js`](backend/src/index.js) | 413 | Servidor Express principal |
| [`backend/src/models/index.js`](backend/src/models/index.js) | 144 | Relaciones de modelos |
| [`backend/src/middleware/security.js`](backend/src/middleware/security.js) | 199 | Middleware de seguridad |
| [`backend/src/services/excel-parser.service.js`](backend/src/services/excel-parser.service.js) | 1500+ | Parser Excel inteligente |
| [`backend/src/services/ia-distribucion.service.js`](backend/src/services/ia-distribucion.service.js) | 317 | Algoritmos IA |
| [`whatsapp-bot-aulas/bot.js`](whatsapp-bot-aulas/bot.js) | 1662 | Bot de WhatsApp |
| [`frontend/src/context/AuthContext.tsx`](frontend/src/context/AuthContext.tsx) | 172 | Estado de autenticación |
| [`frontend/src/App.tsx`](frontend/src/App.tsx) | 117 | Enrutamiento principal |
| [`docker-compose.yml`](docker-compose.yml) | 221 | Orquestación Docker |

---

## 📄 Licencia y Autores

**Desarrollado por:** Santiago Japón para la **UIDE** by Antigravity AI.

**Versión:** 2.5.0

**Estado:** Ready for Deployment

---

*Última actualización: 2026-02-24*
