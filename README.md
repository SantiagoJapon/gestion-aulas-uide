# Sistema de Gestión de Aulas UIDE

Sistema web para la gestión de aulas de la Universidad Internacional del Ecuador (UIDE) - Campus Loja.

## 📋 Descripción

Aplicación full-stack desarrollada para gestionar aulas, reservas, horarios y recursos académicos del campus UIDE Loja. El sistema está construido con una arquitectura moderna separando frontend y backend.

## 🏗️ Arquitectura del Proyecto

El proyecto sigue una arquitectura de microservicios con separación clara entre frontend y backend:

```
gestion-aulas-uide/
├── backend/          # API REST con Node.js y Express
├── frontend/         # Aplicación React con Vite
├── database/         # Migraciones y seeds de PostgreSQL
├── nginx/            # Configuración del servidor web
├── n8n/              # Workflows de automatización
├── docs/             # Documentación del proyecto
└── scripts/           # Scripts de utilidad
```

## 🛠️ Stack Tecnológico

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js 5.1.0
- **ORM:** Sequelize 6.37.7
- **Base de Datos:** PostgreSQL 15 (Alpine)
- **Autenticación:** JWT (jsonwebtoken)
- **Validación:** express-validator
- **Seguridad:** Helmet, CORS, express-rate-limit
- **Uploads:** Multer
- **Logging:** Morgan
- **Desarrollo:** Nodemon

### Frontend
- **Framework:** React 18.3.1
- **Build Tool:** Vite 5.4.5
- **Routing:** React Router DOM 6.26.0
- **HTTP Client:** Axios 1.7.7
- **Estilos:** Tailwind CSS 3.4.13
- **PostCSS:** Autoprefixer

### Infraestructura
- **Contenedores:** Docker & Docker Compose
- **Base de Datos:** PostgreSQL 15 Alpine
- **Servidor Web:** Nginx (configuración pendiente)
- **Automatización:** n8n (workflows pendientes)

## 📁 Estructura de Directorios

### Backend (`/backend`)
```
backend/
├── src/
│   ├── config/       # Configuraciones (DB, JWT, etc.)
│   ├── controllers/  # Controladores de rutas
│   ├── middleware/   # Middlewares personalizados
│   ├── models/       # Modelos de Sequelize
│   ├── routes/       # Definición de rutas
│   ├── services/     # Lógica de negocio
│   └── utils/        # Utilidades y helpers
├── uploads/          # Archivos subidos (con .gitkeep)
└── package.json
```

### Frontend (`/frontend`)
```
frontend/
├── public/           # Archivos estáticos
├── src/
│   ├── components/   # Componentes reutilizables
│   ├── pages/        # Páginas/views
│   ├── services/     # Servicios API
│   ├── context/      # Context API de React
│   ├── hooks/        # Custom hooks
│   ├── utils/        # Utilidades
│   ├── styles/       # Estilos adicionales
│   ├── App.jsx       # Componente principal
│   ├── main.jsx      # Punto de entrada
│   └── index.css     # Estilos base con Tailwind
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

### Base de Datos (`/database`)
```
database/
├── migrations/       # Migraciones de Sequelize
└── seeds/           # Datos iniciales
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js (v18 o superior)
- Docker Desktop
- Git

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd gestion-aulas-uide
```

### 2. Configurar Backend

```bash
cd backend
npm install
```

Crear archivo `.env` en `backend/`:
```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gestion_aulas
DB_USER=admin
DB_PASSWORD=admin

# JWT
JWT_SECRET=tu_secret_key_super_segura
JWT_EXPIRES_IN=24h

# Servidor
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 3. Configurar Frontend

```bash
cd frontend
npm install
```

El frontend está configurado para conectarse al backend en `http://localhost:5000` a través del proxy de Vite.

### 4. Levantar Base de Datos con Docker

```bash
# Desde la raíz del proyecto
docker-compose up -d postgres
```

Verificar que PostgreSQL esté listo:
```bash
docker-compose logs -f postgres
# Esperar: "database system is ready to accept connections"
```

### 5. Conectar a la Base de Datos

```bash
docker exec -it gestion_aulas_db psql -U admin -d gestion_aulas
```

Comandos útiles en psql:
- `\dt` - Ver tablas
- `\l` - Listar bases de datos
- `\q` - Salir

## 🎨 Configuración de Tailwind CSS

El proyecto incluye colores personalizados de la marca UIDE:

```javascript
// tailwind.config.js
colors: {
  'uide-blue': '#003366',
  'uide-orange': '#FF6B35',
}
```

Uso en componentes:
```jsx
<div className="bg-uide-blue text-white">
  <h1 className="text-uide-orange">Título</h1>
</div>
```

## 🏃 Ejecución del Proyecto

### Desarrollo

**Backend:**
```bash
cd backend
npm run dev
# Servidor corriendo en http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm run dev
# Aplicación corriendo en http://localhost:3000
```

### Producción

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## 🐳 Docker Compose

### Servicios Configurados

- **PostgreSQL:** Puerto 5432
  - Usuario: `admin`
  - Contraseña: `admin` (cambiar en producción)
  - Base de datos: `gestion_aulas`
  - Volumen persistente: `postgres_data`

### Comandos Docker

```bash
# Levantar solo PostgreSQL
docker-compose up -d postgres

# Ver logs
docker-compose logs -f postgres

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

## 📝 Estado Actual del Proyecto

### ✅ Completado
- [x] Estructura de directorios del proyecto
- [x] Configuración inicial del backend (Express, Sequelize)
- [x] Configuración inicial del frontend (React, Vite)
- [x] Configuración de Tailwind CSS con colores UIDE
- [x] Docker Compose con PostgreSQL
- [x] Archivo `.gitignore` configurado
- [x] Proxy de Vite para API

### 🚧 Pendiente
- [ ] Modelos de base de datos (Aulas, Reservas, Usuarios, etc.)
- [ ] Migraciones de Sequelize
- [ ] Autenticación y autorización
- [ ] Controladores y rutas del backend
- [ ] Componentes del frontend
- [ ] Integración con n8n
- [ ] Configuración de Nginx
- [ ] Variables de entorno de producción
- [ ] Tests unitarios e integración

## 🔒 Seguridad

El proyecto incluye las siguientes medidas de seguridad configuradas:
- **Helmet:** Headers de seguridad HTTP
- **CORS:** Control de acceso cross-origin
- **Rate Limiting:** Protección contra ataques de fuerza bruta
- **JWT:** Autenticación basada en tokens
- **bcryptjs:** Hash de contraseñas
- **express-validator:** Validación de datos de entrada

## 📚 Próximos Pasos

1. **Modelado de Base de Datos**
   - Crear modelos: Usuario, Aula, Reserva, Horario, etc.
   - Generar migraciones

2. **Autenticación**
   - Implementar registro y login
   - Middleware de autenticación JWT
   - Roles y permisos

3. **API REST**
   - Endpoints CRUD para cada entidad
   - Validación de datos
   - Manejo de errores

4. **Frontend**
   - Componentes de UI
   - Routing con React Router
   - Context API para estado global
   - Integración con API

5. **Despliegue**
   - Configuración de Nginx
   - Variables de entorno de producción
   - CI/CD

## 👥 Autor

**Santiago Japon**

## 📄 Licencia

MIT

---

**Nota:** Este es un proyecto en desarrollo activo. La documentación se actualizará conforme avance el proyecto.

