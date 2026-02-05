# Sistema de Gestion de Aulas - UIDE Loja

Sistema inteligente de distribucion automatica de aulas universitarias con algoritmos de IA gratuita, bot de Telegram integrado y dashboards por rol.

Desarrollado como proyecto de titulacion para la Universidad Internacional del Ecuador - Sede Loja.

---

## Tabla de Contenidos

- [Descripcion General](#descripcion-general)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Stack Tecnologico](#stack-tecnologico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos Previos](#requisitos-previos)
- [Instalacion y Configuracion](#instalacion-y-configuracion)
  - [Desarrollo Local](#desarrollo-local)
  - [Produccion con Docker](#produccion-con-docker)
- [Servicios del Sistema](#servicios-del-sistema)
  - [Backend API](#backend-api)
  - [Frontend Web](#frontend-web)
  - [Bot de Telegram](#bot-de-telegram)
  - [n8n Workflows](#n8n-workflows)
- [Roles y Permisos](#roles-y-permisos)
- [Algoritmo de Distribucion](#algoritmo-de-distribucion)
- [API Endpoints](#api-endpoints)
- [Base de Datos](#base-de-datos)
- [Despliegue en VPS](#despliegue-en-vps)
- [Variables de Entorno](#variables-de-entorno)
- [Scripts Utiles](#scripts-utiles)

---

## Descripcion General

El sistema resuelve el problema de la asignacion manual de aulas en la UIDE Loja, automatizando el proceso mediante:

1. **Carga de planificaciones**: Los directores de carrera suben archivos Excel con los horarios del semestre.
2. **Distribucion automatica**: Un algoritmo inteligente asigna aulas a cada clase considerando capacidad, tipo de espacio, prioridad de carrera, y conflictos de horario.
3. **Visualizacion por roles**: Cada usuario ve la informacion relevante segun su rol (admin, director, docente, estudiante).
4. **Consultas via Telegram**: Un bot llamado "Roomie" permite consultar aulas disponibles, buscar profesores, ver horarios y reservar espacios.

### Caracteristicas principales

- Distribucion automatica de aulas al subir planificaciones Excel
- Algoritmos de IA gratuitos (Simulated Annealing + k-NN) - sin APIs de pago
- Procesamiento de Excel multi-hoja con deteccion inteligente de columnas
- Bot de Telegram con busqueda por cedula, profesor, materia y aulas libres
- Mapa de calor de ocupacion por dia/hora
- Dashboards diferenciados por rol con estadisticas en tiempo real
- Exportacion de reportes PDF/Excel
- Sistema de reservas de aulas
- Autenticacion JWT con 5 niveles de rol
- Seguridad: rate limiting, helmet, sanitizacion de inputs, prevencion SQL injection
- Despliegue Docker Compose listo para produccion

---

## Arquitectura del Sistema

```
                    Internet
                       |
                   [ Nginx ]
                   /       \
            /api/*          /*
              |              |
          [ Backend ]    [ Frontend ]
          Node.js API    React SPA
              |
         [ PostgreSQL ]
           /        \
     [ n8n ]    [ Telegram Bot ]
   (interno)     (polling)
```

### Flujo de datos

1. **Nginx** actua como reverse proxy: sirve archivos estaticos del frontend y redirige `/api/*` al backend.
2. **Backend** maneja toda la logica de negocio, autenticacion y procesamiento de Excel.
3. **PostgreSQL** almacena toda la informacion (usuarios, clases, aulas, distribucion, reservas).
4. **n8n** ejecuta workflows de automatizacion para procesamiento avanzado de Excel (opcional).
5. **Telegram Bot** conecta directamente a PostgreSQL para consultas en tiempo real.

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS |
| **Backend** | Node.js + Express + Sequelize ORM |
| **Base de datos** | PostgreSQL 15 |
| **Bot** | node-telegram-bot-api (polling) |
| **Automatizacion** | n8n (opcional) |
| **IA/ML** | Simulated Annealing + k-NN (algoritmos propios, sin costo) |
| **Proxy** | Nginx (reverse proxy + SSL) |
| **Contenedores** | Docker + Docker Compose |
| **Autenticacion** | JWT + bcryptjs |

---

## Estructura del Proyecto

```
gestion-aulas-uide/
├── backend/                        # API REST Node.js
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js         # Configuracion Sequelize/PostgreSQL
│   │   ├── controllers/
│   │   │   ├── authController.js          # Autenticacion y gestion de usuarios
│   │   │   ├── aulaController.js          # CRUD de aulas
│   │   │   ├── botController.js           # Endpoints para el bot
│   │   │   ├── carreraController.js       # CRUD de carreras
│   │   │   ├── distribucionController.js  # Algoritmo de distribucion
│   │   │   ├── espacioController.js       # Gestion de espacios
│   │   │   ├── estudianteController.js    # Consultas de estudiantes
│   │   │   ├── planificacionController.js # Subida y procesamiento Excel
│   │   │   └── usuarioController.js       # Administracion de usuarios
│   │   ├── middleware/
│   │   │   ├── auth.js               # Verificacion JWT
│   │   │   ├── security.js           # Rate limiting, helmet, headers
│   │   │   ├── security-enhanced.js   # Seguridad adicional
│   │   │   ├── inputSanitizer.js     # Sanitizacion de entradas
│   │   │   ├── validation.js         # Esquemas Joi
│   │   │   └── validators.js         # express-validator
│   │   ├── models/
│   │   │   ├── Aula.js              # Aulas (capacidad, tipo, edificio, restricciones)
│   │   │   ├── Carrera.js           # Carreras universitarias
│   │   │   ├── Clase.js            # Clases (materia, horario, docente, estudiantes)
│   │   │   ├── Distribucion.js      # Tracking de asignaciones
│   │   │   ├── Docente.js          # Docentes
│   │   │   ├── Espacio.js          # Espacios fisicos
│   │   │   ├── Estudiante.js       # Estudiantes (cedula, email, telegram)
│   │   │   ├── MateriaCatalogo.js  # Catalogo de materias
│   │   │   ├── Periodo.js          # Periodos academicos
│   │   │   ├── PlanificacionSubida.js # Historial de cargas Excel
│   │   │   ├── User.js             # Usuarios del sistema (5 roles)
│   │   │   └── index.js            # Relaciones entre modelos
│   │   ├── routes/
│   │   │   ├── authRoutes.js        # POST /api/auth/login, register, profile
│   │   │   ├── aulaRoutes.js        # GET/POST /api/aulas
│   │   │   ├── botRoutes.js         # GET/POST /api/bot
│   │   │   ├── carreraRoutes.js     # GET/POST /api/carreras
│   │   │   ├── distribucionRoutes.js # GET/POST /api/distribucion
│   │   │   ├── espacioRoutes.js     # GET/POST /api/espacios
│   │   │   ├── estudianteRoutes.js  # GET /api/estudiantes
│   │   │   ├── n8n.routes.js        # POST /api/n8n (webhooks)
│   │   │   ├── planificacionRoutes.js # POST /api/planificaciones/subir
│   │   │   └── usuarioRoutes.js     # GET/POST /api/usuarios
│   │   ├── services/
│   │   │   ├── distribucion.service.js     # Logica de asignacion de aulas
│   │   │   ├── ia-distribucion.service.js  # Simulated Annealing + k-NN
│   │   │   ├── n8n.service.js              # Integracion con n8n
│   │   │   └── openai.service.js           # Integracion OpenAI (opcional)
│   │   ├── utils/
│   │   │   ├── encoding.js          # Utilidades UTF-8
│   │   │   ├── jwt.js               # Utilidades JWT
│   │   │   └── jwt-enhanced.js      # JWT mejorado
│   │   └── index.js                 # Entry point del servidor Express
│   ├── scripts/
│   │   ├── seed.js                  # Seed de usuarios iniciales
│   │   ├── seed-aulas.js            # Seed de aulas del campus
│   │   └── recrear_aulas_reales.js  # Recrear aulas con datos reales UIDE
│   ├── uploads/                     # Archivos Excel subidos
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                        # SPA React
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.tsx       # Contexto de autenticacion global
│   │   ├── pages/
│   │   │   ├── Login.tsx            # Pagina de inicio de sesion
│   │   │   ├── Register.tsx         # Registro de usuarios
│   │   │   ├── AdminDashboard.tsx   # Dashboard administrador
│   │   │   ├── DirectorDashboard.tsx # Dashboard director de carrera
│   │   │   ├── ProfesorDashboard.tsx # Dashboard docente
│   │   │   └── EstudianteDashboard.tsx # Dashboard estudiante
│   │   ├── components/
│   │   │   ├── AulaTable.tsx        # Tabla de aulas
│   │   │   ├── CarreraTable.tsx     # Tabla de carreras
│   │   │   ├── PlanificacionesTable.tsx # Tabla de planificaciones
│   │   │   ├── EjecutarDistribucion.tsx # Ejecutar distribucion manual
│   │   │   ├── DistribucionWidget.tsx   # Widget de estado de distribucion
│   │   │   ├── DistribucionEspacios.tsx # Distribucion por espacios
│   │   │   ├── HorarioVisual.tsx    # Horario visual por aula
│   │   │   ├── MapaCalor.tsx        # Mapa de calor de ocupacion
│   │   │   ├── SubirEstudiantes.tsx # Subida masiva de estudiantes
│   │   │   ├── EspacioTable.tsx     # Tabla de espacios
│   │   │   ├── Navbar.tsx           # Barra de navegacion
│   │   │   ├── ProtectedRoute.tsx   # Rutas protegidas por rol
│   │   │   ├── DirectorAssignmentTable.tsx # Asignacion de directores
│   │   │   ├── DirectorManagementModal.tsx # Gestion de directores
│   │   │   ├── StatCard.tsx         # Tarjeta de estadisticas
│   │   │   ├── DataTable.tsx        # Tabla generica reutilizable
│   │   │   ├── Modal.tsx            # Modal generico
│   │   │   └── Button.tsx           # Boton reutilizable
│   │   ├── services/
│   │   │   └── api.ts               # Cliente Axios con interceptores
│   │   ├── App.tsx                  # Router principal
│   │   └── main.jsx                 # Entry point Vite
│   ├── Dockerfile                   # Multi-stage build (Node -> Nginx)
│   └── package.json
│
├── telegram-bot-aulas/              # Bot de Telegram "Roomie"
│   ├── bot.js                       # Logica completa del bot
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── nginx/                           # Reverse proxy
│   ├── nginx.conf                   # Configuracion con proxy a backend + frontend
│   └── Dockerfile
│
├── postgres-init/                   # Scripts de inicializacion de BD
│   ├── 01-create-user.sql
│   ├── 02-create-n8n-db.sql
│   ├── 03-create-schema.sql
│   └── 04-fix-pg-hba.sql
│
├── n8n/                             # Directorio para workflows n8n
│   └── workflows/
│
├── scripts/                         # Scripts de utilidad
│   ├── setup-n8n-folders.sh         # Crear carpetas n8n en Linux
│   └── start-cloudflared.sh         # Iniciar tunel Cloudflare
│
├── docker-compose.yml               # Entorno de DESARROLLO
├── docker-compose.prod.yml          # Entorno de PRODUCCION (7 servicios)
├── deploy.sh                        # Script de despliegue automatizado
├── .env.production.example          # Plantilla de variables de produccion
├── .gitignore
├── .dockerignore
└── README.md
```

---

## Requisitos Previos

### Desarrollo local

- Node.js >= 18
- PostgreSQL >= 13
- npm o yarn
- Git

### Produccion (VPS)

- Docker >= 20.10
- Docker Compose >= 2.0
- VPS con minimo 2GB RAM, 20GB disco
- Dominio (opcional, para SSL)

---

## Instalacion y Configuracion

### Desarrollo Local

#### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/gestion-aulas-uide.git
cd gestion-aulas-uide
```

#### 2. Levantar con Docker Compose (recomendado)

```bash
# Levantar PostgreSQL, Redis, Backend, Frontend y n8n
docker compose up -d

# Verificar que todo esta corriendo
docker compose ps
```

Servicios disponibles en desarrollo:

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| n8n | http://localhost:5678 |
| PostgreSQL | localhost:5433 |

#### 3. Sin Docker (manual)

```bash
# Backend
cd backend
cp .env.example .env  # Configurar variables
npm install
npm run dev            # Inicia con nodemon en http://localhost:3000

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev            # Inicia Vite en http://localhost:5173
```

#### 4. Datos iniciales

```bash
# Crear usuario admin y datos de prueba
cd backend
node scripts/seed.js

# Cargar aulas reales de UIDE Loja
node scripts/seed-aulas.js
# o para recrear con datos actualizados:
node scripts/recrear_aulas_reales.js
```

Credenciales por defecto despues del seed:
- **Admin**: admin@uide.edu.ec / Admin123

### Produccion con Docker

Ver la seccion [Despliegue en VPS](#despliegue-en-vps).

---

## Servicios del Sistema

### Backend API

Servidor Express con Sequelize ORM. Maneja:

- **Autenticacion**: Registro, login, perfiles con JWT
- **Planificaciones**: Subida de Excel, parseo multi-hoja, extraccion de horarios
- **Distribucion**: Algoritmo inteligente de asignacion de aulas
- **Aulas**: CRUD con capacidad, tipo, edificio, restricciones por carrera
- **Carreras**: Gestion de carreras y asignacion de directores
- **Estudiantes**: Consulta por cedula o email
- **Espacios**: Gestion de espacios fisicos adicionales
- **Reportes**: Estado de distribucion, mapa de calor, estadisticas

Seguridad implementada:
- JWT con expiracion configurable
- Rate limiting (auth: 5 req/15min, API: 100 req/15min)
- Helmet headers de seguridad
- Sanitizacion de inputs
- Prevencion de SQL injection
- Validacion con Joi y express-validator
- CORS configurado

### Frontend Web

SPA React con routing protegido por roles:

| Ruta | Pagina | Rol requerido |
|------|--------|---------------|
| `/login` | Inicio de sesion | Publico |
| `/register` | Registro | Publico |
| `/admin` | Dashboard administrador | admin |
| `/director` | Dashboard director | director |
| `/profesor` | Dashboard docente | profesor, docente |
| `/estudiante` | Dashboard estudiante | estudiante |

Funcionalidades del admin:
- Gestionar aulas, carreras, usuarios
- Subir planificaciones Excel de cualquier carrera
- Ejecutar y forzar redistribucion
- Ver mapa de calor de ocupacion
- Asignar directores a carreras
- Exportar reportes

Funcionalidades del director:
- Subir planificaciones Excel de su carrera
- Ver distribucion de su carrera
- Ver estadisticas y horarios

### Bot de Telegram

Bot llamado **"Roomie"** que permite consultas via Telegram:

**Comandos:**
- `/start` - Inicia el bot y muestra menu principal
- `/menu` - Muestra opciones disponibles
- `/logout` - Cierra sesion

**Funciones del menu:**
1. **Consultar por cedula** - El estudiante ingresa su cedula y ve sus materias, horarios y aulas
2. **Aulas disponibles** - Buscar aulas libres en un dia y hora especificos
3. **Reservar aula** - Solicitar reserva de un aula disponible
4. **Buscar profesor** - Buscar horario y ubicacion de un docente por nombre
5. **Buscar materia** - Buscar en que aula y horario se dicta una materia
6. **Mi horario** - Ver horario personal (requiere autenticacion)
7. **Panel admin/director** - Acceso rapido al panel web

Caracteristicas tecnicas del bot:
- Conexion directa a PostgreSQL (no depende del backend API)
- Busqueda insensible a acentos usando `translate()` de PostgreSQL
- Escape de caracteres Markdown para Telegram
- Manejo de estados de conversacion en memoria
- Modo polling (no requiere webhook ni puerto expuesto)

### n8n Workflows

n8n se usa opcionalmente para:
- Procesamiento avanzado de Excel con multiples hojas
- Integracion con OpenAI para extraccion inteligente de datos
- Automatizacion de notificaciones

En produccion, n8n es accesible solo internamente (sin puerto expuesto). El backend se conecta via la red Docker interna.

---

## Roles y Permisos

| Rol | Puede ver | Puede hacer |
|-----|-----------|-------------|
| **admin** | Todo el sistema | Gestionar aulas, carreras, usuarios. Subir Excel de cualquier carrera. Ejecutar distribucion. Exportar reportes. |
| **director** | Su carrera unicamente | Subir Excel de su carrera. Ver distribucion y estadisticas de su carrera. |
| **profesor/docente** | Sus clases asignadas | Ver su horario y aulas asignadas. |
| **estudiante** | Distribucion de su carrera | Consultar horarios y aulas via web o Telegram. |

---

## Algoritmo de Distribucion

### Paso 1: Ordenamiento
Las clases se ordenan por numero de estudiantes (descendente) para asignar primero las mas grandes.

### Paso 2: Busqueda de aulas compatibles
Para cada clase se filtran aulas que cumplan:
- Capacidad entre 90% y 150% del numero de estudiantes
- Sin conflicto de horario (misma aula, mismo dia, horas superpuestas)
- Estado disponible

### Paso 3: Scoring
Cada aula compatible recibe un puntaje:
- +100 si la capacidad es optima (ajuste perfecto)
- +50 si la carrera tiene prioridad en esa aula
- +100 si es laboratorio y la clase lo requiere
- Penalizacion por desperdicio de capacidad

### Paso 4: Optimizacion con IA
- **Simulated Annealing**: Mejora la distribucion global intercambiando asignaciones
- **k-NN**: Aprende de distribuciones exitosas anteriores para sugerir mejores asignaciones
- **Analisis de patrones**: Detecta aulas infrautilizadas o sobreutilizadas

### Rendimiento
- < 5 segundos para 100+ clases
- 90-95% de precision automatica
- Sin costo de APIs externas

---

## API Endpoints

### Autenticacion
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesion (retorna JWT) |
| GET | `/api/auth/profile` | Ver perfil del usuario autenticado |

### Distribucion
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/distribucion/estado` | Estado general de distribucion |
| GET | `/api/distribucion/heatmap` | Mapa de calor de ocupacion |
| GET | `/api/distribucion/mi-distribucion` | Distribucion filtrada por rol |
| GET | `/api/distribucion/reporte` | Reporte completo exportable |
| POST | `/api/distribucion/forzar` | Forzar redistribucion (admin) |
| POST | `/api/distribucion/limpiar` | Limpiar distribucion (admin) |

### Planificaciones
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/planificaciones` | Listar planificaciones subidas |
| POST | `/api/planificaciones/subir` | Subir Excel (ejecuta distribucion automatica) |

### Aulas
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/aulas` | Listar aulas |
| POST | `/api/aulas` | Crear aula (admin) |
| PUT | `/api/aulas/:id` | Actualizar aula (admin) |

### Carreras
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/carreras` | Listar carreras |
| POST | `/api/carreras` | Crear carrera (admin) |

### Estudiantes
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/estudiantes/buscar` | Buscar por cedula o email |

### Usuarios
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/usuarios` | Listar usuarios (admin) |
| POST | `/api/usuarios` | Crear usuario (admin) |
| PUT | `/api/usuarios/:id` | Actualizar usuario (admin) |
| DELETE | `/api/usuarios/:id` | Eliminar usuario (admin) |

---

## Base de Datos

### Modelos principales

**User** - Usuarios del sistema
- id, nombre, apellido, email, password, rol, cedula, telefono, carrera_id

**Clase** - Clases/materias con horario
- id, carrera, materia, nivel, paralelo, docente, num_estudiantes, dia, hora_inicio, hora_fin, aula_asignada, tipo_espacio, estado_asignacion, carrera_id

**Aula** - Aulas fisicas del campus
- id, codigo, nombre, capacidad, tipo (AULA/LABORATORIO/AUDITORIO), edificio, piso, ubicacion, estado, tiene_proyector, es_laboratorio, restriccion_carrera, notas

**Estudiante** - Datos de estudiantes
- id, cedula, nombre, apellido, email, carrera, telegram_id

**Carrera** - Carreras universitarias
- id, nombre, codigo, facultad, director_id

**Distribucion** - Registro de asignaciones
- id, clase_id, aula_id, score, metodo, periodo

**PlanificacionSubida** - Historial de cargas Excel
- id, nombre_archivo, carrera_id, usuario_id, total_clases, clases_asignadas, fecha

### Tablas del bot
- **bot_sessions** - Sesiones de Telegram (telegram_id, user_id, estado)
- **reservas** - Reservas de aulas (aula, dia, hora, solicitante, estado)

---

## Despliegue en VPS

### Requisitos del servidor
- Ubuntu 22.04+ o similar
- Minimo 2GB RAM, 2 vCPU, 20GB SSD
- Docker y Docker Compose instalados
- Proveedores recomendados: Hetzner (~$4/mes), DigitalOcean ($6/mes), Contabo (~$6/mes)

### Pasos de despliegue

#### 1. Preparar el servidor

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clonar el proyecto
git clone https://github.com/tu-usuario/gestion-aulas-uide.git
cd gestion-aulas-uide
```

#### 2. Configurar variables de entorno

```bash
cp .env.production.example .env.production

# Editar con valores reales
nano .env.production
```

Variables obligatorias:
- `DB_PASSWORD` - Contrasena segura para PostgreSQL
- `JWT_SECRET` - Secreto para tokens JWT (generar con `openssl rand -base64 32`)
- `N8N_PASSWORD` - Contrasena para n8n
- `TELEGRAM_BOT_TOKEN` - Token del bot de BotFather

#### 3. Ejecutar deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

El script automaticamente:
- Valida que Docker este instalado
- Verifica que las variables de entorno esten configuradas
- Construye las imagenes Docker
- Levanta todos los servicios
- Ejecuta health checks

#### 4. Configurar SSL (opcional, requiere dominio)

```bash
# Descomentar el bloque SSL en nginx/nginx.conf
# Luego ejecutar:
docker compose -f docker-compose.prod.yml run certbot \
  certonly --webroot -w /var/www/certbot -d tudominio.com

# Reiniciar Nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### Arquitectura de produccion

```
Puerto 80/443 (Nginx)
├── /* → Frontend (archivos estaticos)
├── /api/* → Backend (Node.js:3000)
└── /.well-known/* → Certbot (SSL)

Servicios internos (sin puerto expuesto):
├── PostgreSQL:5432
├── Redis:6379
├── n8n:5678
└── Telegram Bot (polling, sin puerto)
```

### Comandos utiles en produccion

```bash
# Ver logs de todos los servicios
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio especifico
docker compose -f docker-compose.prod.yml logs -f backend

# Reiniciar un servicio
docker compose -f docker-compose.prod.yml restart backend

# Reconstruir despues de cambios en el codigo
docker compose -f docker-compose.prod.yml up -d --build

# Ver estado de los contenedores
docker compose -f docker-compose.prod.yml ps

# Acceder a la base de datos
docker exec -it gestion_aulas_db psql -U postgres -d gestion_aulas

# Backup de la base de datos
docker exec gestion_aulas_db pg_dump -U postgres gestion_aulas > backup.sql

# Restaurar backup
docker exec -i gestion_aulas_db psql -U postgres -d gestion_aulas < backup.sql
```

---

## Variables de Entorno

### Desarrollo (`.env` en raiz)

```env
NODE_ENV=development
JWT_SECRET=supersecreto123
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY=        # Opcional
TELEGRAM_BOT_TOKEN=       # Token de BotFather
```

### Produccion (`.env.production`)

Ver `.env.production.example` para la plantilla completa. Variables obligatorias:

| Variable | Descripcion |
|----------|-------------|
| `DB_PASSWORD` | Contrasena PostgreSQL |
| `JWT_SECRET` | Secreto JWT (min 32 caracteres) |
| `N8N_PASSWORD` | Contrasena acceso n8n |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram |
| `FRONTEND_URL` | URL publica del frontend |
| `DOMAIN` | Dominio para SSL (opcional) |

Variables opcionales:

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `DB_USER` | Usuario PostgreSQL | postgres |
| `DB_NAME` | Nombre de la base de datos | gestion_aulas |
| `REDIS_PASSWORD` | Contrasena Redis | redis123 |
| `JWT_EXPIRES_IN` | Duracion del token | 24h |
| `OPENAI_API_KEY` | API key OpenAI | - |
| `ANTHROPIC_API_KEY` | API key Anthropic | - |
| `VOICE_API_KEY` | API key Groq Whisper | - |

---

## Scripts Utiles

### Backend

```bash
# Seed de datos iniciales (usuarios + admin)
node backend/scripts/seed.js

# Cargar aulas reales de UIDE Loja
node backend/scripts/seed-aulas.js

# Recrear aulas con datos actualizados
node backend/scripts/recrear_aulas_reales.js
```

### Docker

```bash
# Desarrollo
docker compose up -d              # Levantar todo
docker compose down               # Detener todo
docker compose logs -f backend    # Ver logs

# Produccion
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml down
```

---

## Formato del Excel de Planificaciones

El sistema acepta archivos Excel (.xlsx) con multiples hojas. Cada hoja puede contener planificaciones de diferentes niveles o paralelos.

Columnas detectadas automaticamente:
- **Materia/Asignatura** - Nombre de la materia
- **Docente/Profesor** - Nombre del docente
- **Dia** - Dia de la semana (Lunes, Martes, etc.)
- **Hora inicio** - Hora de inicio (formato HH:MM)
- **Hora fin** - Hora de fin (formato HH:MM)
- **Num. estudiantes** - Cantidad de estudiantes
- **Nivel/Semestre** - Nivel o semestre
- **Paralelo** - Paralelo (A, B, C, etc.)
- **Tipo espacio** - AULA, LABORATORIO, AUDITORIO (opcional)

---

## Licencia

Proyecto de titulacion - Universidad Internacional del Ecuador (UIDE), Sede Loja.

---

## Autor

Desarrollado como trabajo de titulacion para la Facultad de Ingenieria de la UIDE Loja.
