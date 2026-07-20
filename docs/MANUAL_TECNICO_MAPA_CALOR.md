# Manual Técnico del Programador — Mapa de Calor y Planificación de Aulas

**Sistema SIGEA UIDE**  
**Versión del Documento:** 1.0  
**Fecha:** Julio 2026  
**Proyecto:** `gestion-aulas-uide`

---

## Tabla de Contenidos

- [1. Introducción](#1-introduccion)
- [2. Visión General del Sistema](#2-visión-general-del-sistema)
- [3. Guía de Configuración del Entorno de Desarrollo](#3-guía-de-configuración-del-entorno-de-desarrollo)
- [4. Arquitectura y Diseño Detallado](#4-arquitectura-y-diseño-detallado)
- [5. API y Endpoints del Módulo de Mapa de Calor](#5-api-y-endpoints-del-módulo-de-mapa-de-calor)
- [6. Flujos de Trabajo Críticos](#6-flujos-de-trabajo-críticos)
- [7. Componentes Frontend](#7-componentes-frontend)
- [8. Estrategia de Pruebas](#8-estrategia-de-pruebas)
- [9. Guía de Despliegue](#9-guía-de-despliegue)
- [10. Resolución de Problemas (Troubleshooting)](#10-resolución-de-problemas-troubleshooting)
- [11. Apéndices](#11-apéndices)

---

## 1. Introducción

### 1.1. Propósito del Manual

Este manual describe la arquitectura, componentes, configuración y operación del módulo de **Mapa de Calor y Planificación de Aulas** del sistema SIGEA UIDE (Sistema de Gestión de Espacios Académicos). Sirve como fuente de verdad única para cualquier desarrollador que necesite entender, mantener o extender este módulo.

### 1.2. Alcance

Este manual cubre exclusivamente:

- El componente de **Mapa de Calor** (vista general y vista detallada Hora vs Aula).
- Los endpoints de API relacionados con distribución y heatmap.
- Los modelos de datos: `Aulas`, `Clases`, `Distribucion`, `Carreras`, `Reservas`.
- La lógica de cálculo de ocupación y filtros.
- Los componentes React que renderizan el mapa de calor.

### 1.3. Público Objetivo

- Desarrolladores de software (frontend y backend).
- Ingenieros de DevOps.
- Arquitectos de solución.
- Directores de carrera que necesiten entender la lógica de filtrado por rol.

### 1.4. Glosario de Términos

| Término | Definición |
|---------|------------|
| **Ocupación** | Porcentaje de estudiantes asignados a un aula respecto a su capacidad máxima. Se calcula como `(num_estudiantes / capacidad_aula) * 100`. |
| **Franja Horaria** | Bloque de tiempo del día: Mañana (7:00–12:00), Tarde (13:00–18:00), Noche (19:00–22:00). |
| **Aula** | Espacio físico con capacidad definida (ej. `A-01`, `LAB-03`). Puede ser AULA, LABORATORIO, SALA_ESPECIAL o AUDITORIO. |
| **Carrera** | Programa académico (ej. "Arquitectura", "Derecho"). Cada carrera tiene un director asignado. |
| **Clase** | Una sesión programada de una materia en un día y hora específica, con un docente y número de estudiantes. |
| **Distribución** | Resultado del algoritmo de asignación de aulas a clases. Almacena la relación `clase_id → aula_id`. |
| **Mapa de Calor** | Visualización matricial (Hora × Día o Hora × Aula) que muestra la intensidad de ocupación mediante colores. |
| **Nivel de Ocupación** | EMPTY (0%), LOW (<40%), MEDIUM (40-79%), HIGH (≥80%). |
| **Mapa Detallado** | Variante del mapa de calor que muestra la ocupación individual de cada aula en cada franja horaria. |
| **Sobrecupo** | Estado cuando `num_estudiantes > capacidad_aula`. Se marca en rojo en la interfaz. |

---

## 2. Visión General del Sistema

### 2.1. Arquitectura de Alto Nivel

El sistema sigue una arquitectura **cliente-servidor** con separación clara entre frontend y backend:

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO / NAVEGADOR                     │
│                   React + TypeScript + Vite                  │
│                   Puerto: 5173 (dev)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/HTTPS (proxy /api → :3001)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     NGINX (Reverse Proxy)                    │
│                   Puerto: 80/443 (prod)                      │
│                   /api → backend:3001                        │
│                   / → frontend:80                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND — Node.js + Express                │
│                   Puerto: 3001 (dev) / 3000 (Docker)         │
│                   JWT Auth · Rate Limiting · Helmet           │
└────────┬──────────────────────────────┬─────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│   PostgreSQL 15     │    │      Redis 7 (Alpine)            │
│   Puerto: 5433      │    │      Puerto: 6379                │
│   DB: gestion_aulas │    │      Cache + Colas n8n           │
└─────────────────────┘    └─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│            WhatsApp Bot (Node.js) — Puerto: 3020             │
│            Evolution API — Puerto: 8080                      │
│            n8n Workflows — Puerto: 5678                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. Tecnologías y Versiones

| Capa | Tecnología | Versión | Justificación |
|------|-----------|---------|---------------|
| **Frontend** | React | 18.3.1 | Biblioteca UI declarativa, ecosistema maduro |
| | TypeScript | 5.6.3 | Seguridad de tipos, mejor DX |
| | Vite | 5.4.5 | Build tool ultrarrápido con HMR |
| | Tailwind CSS | 3.4.13 | Utility-first CSS, diseño responsivo |
| | Axios | 1.7.7 | Cliente HTTP con interceptores |
| | React Router DOM | 6.26.0 | Enrutamiento SPA |
| | date-fns | 4.1.0 | Manipulación de fechas ligera |
| | Lucide React | 0.563.0 | Iconografía |
| **Backend** | Node.js | ≥18.0.0 | Runtime JavaScript server-side |
| | Express | 4.18.2 | Framework HTTP minimalista |
| | Sequelize | 6.35.0 | ORM para PostgreSQL |
| | PostgreSQL (driver) | 8.11.0 (pg) | Cliente PostgreSQL nativo |
| | JSON Web Token | 9.0.2 | Autenticación stateless |
| | Helmet | 7.1.0 | Headers de seguridad HTTP |
| | Express Rate Limit | 7.1.5 | Protección contra abuso |
| | bcryptjs | 2.4.3 | Hashing de contraseñas |
| | Joi | 17.11.0 | Validación de esquemas |
| | Multer | 1.4.5-lts.1 | Upload de archivos |
| | xlsx | 0.18.5 | Parseo de archivos Excel |
| | Nodemailer | 8.0.1 | Envío de emails |
| | pdfmake | 0.3.3 | Generación de PDFs |
| **Base de Datos** | PostgreSQL | 15 | ACID, JSONB, rendimiento en consultas complejas |
| | Redis | 7 (Alpine) | Caché, colas de mensajes |
| **Infraestructura** | Docker | Compose v3.8 | Contenedores y orquestación |
| | Nginx | (implícito en prod) | Reverse proxy, SSL, servir estáticos |
| | Evolution API | 2.3.7 | Gateway WhatsApp |
| | n8n | latest | Automatización de workflows |
| **Testing** | Jest | 30.2.0 | Framework de pruebas Node.js |
| | Supertest | 7.2.2 | Testing de endpoints HTTP |
| **Control de Versiones** | Git | — | Control de versiones distribuido |

### 2.3. Repositorio de Código — Estructura

```
gestion-aulas-uide/
├── backend/                    # API REST (Node.js + Express + Sequelize)
│   ├── src/
│   │   ├── app.js              # Configuración Express (CORS, middleware, rutas)
│   │   ├── index.js            # Punto de entrada (init DB + listen)
│   │   ├── config/
│   │   │   ├── database.js     # Configuración Sequelize + PostgreSQL
│   │   │   └── database-cli.js # Config CLI para migraciones
│   │   ├── controllers/        # Lógica de negocio por dominio
│   │   │   ├── distribucionController.js  ← MAPA DE CALOR
│   │   │   ├── planificacionController.js
│   │   │   ├── reservaController.js
│   │   │   ├── authController.js
│   │   │   ├── aulaController.js
│   │   │   ├── carreraController.js
│   │   │   └── ...
│   │   ├── models/             # Modelos Sequelize (1 tabla = 1 archivo)
│   │   │   ├── Aula.js
│   │   │   ├── Clase.js
│   │   │   ├── Distribucion.js
│   │   │   ├── Carrera.js
│   │   │   ├── Reserva.js
│   │   │   ├── User.js
│   │   │   ├── Estudiante.js
│   │   │   ├── Docente.js
│   │   │   └── index.js        # Barrel export + asociaciones
│   │   ├── routes/             # Definición de rutas Express
│   │   │   ├── distribucionRoutes.js  ← RUTAS HEATMAP
│   │   │   ├── reservaRoutes.js
│   │   │   ├── index.js        # Monta todas las rutas bajo /api
│   │   │   └── ...
│   │   ├── services/           # Servicios de lógica de negocio
│   │   │   ├── distribucion.service.js  ← ALGORITMO DE DISTRIBUCIÓN
│   │   │   ├── emailService.js
│   │   │   ├── excel-parser.service.js
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   ├── auth.js         # verificarAuth, verificarAdmin, verificarRol
│   │   │   └── security.js     # Helmet, rate limiting, sanitización
│   │   ├── utils/
│   │   │   ├── jwt.js          # Generar/verificar tokens JWT
│   │   │   ├── encoding.js     # fixEncoding (UTF-8/Latin1)
│   │   │   └── textUtils.js    # convertirHora, normalizarTexto
│   │   └── cron/               # Tareas programadas
│   ├── tests/                  # Pruebas unitarias y de integración
│   │   ├── jest-setup.js
│   │   ├── auth.controller.test.js
│   │   ├── auth.middleware.test.js
│   │   ├── reserva.controller.test.js
│   │   ├── excel-parser.test.js
│   │   └── jwt.test.js
│   ├── migrations/             # Migraciones Sequelize
│   └── package.json
├── frontend/                   # SPA (React + TypeScript + Vite)
│   ├── src/
│   │   ├── main.jsx            # Entry point React
│   │   ├── App.tsx             # Router principal
│   │   ├── components/
│   │   │   ├── MapaCalor.tsx           ← MAPA DE CALOR (vista general)
│   │   │   ├── director/
│   │   │   │   └── MapaCalorDetallado.tsx  ← MAPA DETALLADO (Hora vs Aula)
│   │   │   ├── ClaseEditModal.tsx      # Modal para editar clases
│   │   │   ├── layout/
│   │   │   │   └── DashboardLayout.tsx # Sidebar + navegación
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── AdminDashboard.tsx      # Dashboard admin (usa heatmap)
│   │   │   └── DirectorDashboard.tsx   # Dashboard director (usa heatmap)
│   │   ├── services/
│   │   │   ├── api.ts                  # Barrel de servicios + tipos
│   │   │   └── api/
│   │   │       └── axiosInstance.ts    # Instancia Axios + interceptores
│   │   ├── context/                    # React Context (Auth, etc.)
│   │   ├── hooks/                      # Custom hooks
│   │   └── utils/                      # Utilidades
│   ├── vite.config.ts          # Proxy /api → :3001
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── whatsapp-bot-aulas/         # Bot de WhatsApp (Node.js)
├── n8n/                        # Workflows n8n
├── nginx/                      # Configuración Nginx (prod)
├── scripts/                    # Scripts de utilidad
├── docker-compose.yml          # Desarrollo local
├── docker-compose.prod.yml     # Producción
├── deploy.sh                   # Script de despliegue VPS
├── .env.example                # Template de variables de entorno
└── .env.production.example     # Template para producción
```

---

## 3. Guía de Configuración del Entorno de Desarrollo

### 3.1. Prerrequisitos

| Software | Versión Mínima | Propósito |
|----------|---------------|-----------|
| Node.js | 18.0.0+ | Runtime backend y frontend |
| npm | 9.0.0+ | Gestor de paquetes |
| Docker | 23.0+ | Contenedores |
| Docker Compose | v2.0+ | Orquestación |
| Git | 2.30+ | Control de versiones |
| PostgreSQL | 15+ (via Docker) | Base de datos |

### 3.2. Clonación del Repositorio

```bash
git clone https://github.com/tu-usuario/gestion-aulas-uide.git
cd gestion-aulas-uide
```

### 3.3. Configuración del Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo .env
cp ../.env.example ../.env
# Editar .env con valores locales (ver 3.3.1)

# Levantar PostgreSQL + Redis
docker compose up -d postgres redis

# Ejecutar migraciones
npm run db:migrate

# Iniciar servidor de desarrollo
npm run dev
# El backend escucha en http://localhost:3001
```

#### 3.3.1. Variables de Entorno Críticas (.env)

```bash
# Base de datos
DB_HOST=localhost          # 'postgres' si usa Docker
DB_PORT=5433               # 5433 en docker-compose.yml (mapeado a 5432)
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=gestion_aulas

# JWT (OBLIGATORIO generar uno seguro)
JWT_SECRET=$(openssl rand -base64 48)

# Frontend
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Puerto backend
PORT=3001

# SMTP (para envío de emails)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-correo@outlook.com
SMTP_PASS=tu-password-de-aplicacion
SMTP_FROM="SIGEA UIDE" <tu-correo@outlook.com>

# WhatsApp Bot
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=tu-api-key
EVOLUTION_INSTANCE=botuide
```

### 3.4. Configuración del Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
# El frontend escucha en http://localhost:5173
# Proxy automático /api → http://127.0.0.1:3001
```

La configuración de proxy está en `vite.config.ts`:

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
      secure: false
    }
  }
}
```

### 3.5. Configuración de Servicios Dependientes

```bash
# Levantar todos los servicios (PostgreSQL, Redis, n8n, Evolution API, Bot)
docker compose up -d

# Verificar estado
docker compose ps

# Logs en tiempo real
docker compose logs -f
```

Puertos por servicio:

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| PostgreSQL | 5433 (host) → 5432 (container) | Base de datos |
| Redis | 6379 | Caché |
| Backend | 3001 | API REST |
| Frontend | 5173 | SPA |
| n8n | 5678 | Workflows |
| Evolution API | 8080 | WhatsApp Gateway |
| WhatsApp Bot | 3020 | Bot de WhatsApp |

---

## 4. Arquitectura y Diseño Detallado

### 4.1. Modelo de Datos (Base de Datos)

#### Diagrama Entidad-Relación (simplificado para el módulo)

```
┌──────────────────┐       ┌──────────────────┐
│  uploads_carreras │       │      aulas        │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ carrera          │       │ codigo (UNIQUE)  │
│ carrera_normaliz.│       │ nombre           │
│ activa           │       │ capacidad        │
└────────┬─────────┘       │ tipo             │
         │                 │ edificio         │
         │                 │ piso             │
         │                 │ estado           │
         │                 │ restriccion_carr.│
         │                 │ es_prioritaria   │
         │                 │ equipamiento(JB) │
         │                 └────────┬─────────┘
         │                          │
         │                          │ aula_id
         │                          ▼
┌────────┴─────────┐       ┌──────────────────┐
│     clases        │       │   distribucion    │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │◄──────│ clase_id (FK)    │
│ carrera_id (FK)  │       │ aula_id (FK)     │
│ carrera (texto)  │       │ dia              │
│ materia          │       │ hora_inicio      │
│ ciclo            │       │ hora_fin         │
│ paralelo         │       │ fecha_asignacion │
│ dia              │       └──────────────────┘
│ hora_inicio      │
│ hora_fin         │
│ num_estudiantes  │
│ docente          │
│ aula_asignada    │──→ aulas.codigo (texto)
│ aula_sugerida    │
│ docente_id (FK)  │──→ docentes.id
│ materia_cat_id   │──→ materias_catalogo.id
│ periodo_id (FK)  │──→ periodos.id
└──────────────────┘
```

#### Tabla: `aulas`

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `codigo` | VARCHAR(50) | UNIQUE, NOT NULL | Código del aula (ej. `A-01`, `LAB-03`) |
| `nombre` | VARCHAR(200) | NOT NULL | Nombre descriptivo |
| `capacidad` | INTEGER | NOT NULL, ≥1 | Capacidad máxima de estudiantes |
| `tipo` | VARCHAR(50) | NOT NULL | `AULA`, `LABORATORIO`, `SALA_ESPECIAL`, `AUDITORIO` |
| `edificio` | VARCHAR(50) | NULLABLE | Nombre del edificio |
| `piso` | INTEGER | NULLABLE | Número de piso |
| `restriccion_carrera` | TEXT | NULLABLE | JSON array o lista separada por comas de carreras con prioridad |
| `es_prioritaria` | BOOLEAN | DEFAULT false | Si tiene prioridad para carreras restringidas |
| `equipamiento` | JSONB | NULLABLE | Equipamiento del aula |
| `estado` | VARCHAR(50) | DEFAULT 'disponible' | `disponible`, `no_disponible`, `mantenimiento`, `ocupada` |
| `notas` | TEXT | NULLABLE | Observaciones |

**Índices:**
- `UNIQUE` en `codigo`
- `INDEX` en `tipo`, `estado`, `restriccion_carrera`

#### Tabla: `clases`

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `carrera_id` | INTEGER | FK → uploads_carreras.id | Referencia a carrera |
| `carrera` | VARCHAR | NULLABLE | Nombre de la carrera (texto redundante) |
| `materia` | VARCHAR | NULLABLE | Nombre de la materia |
| `ciclo` | VARCHAR | NULLABLE | Nivel (ej. "1", "Octavo") |
| `paralelo` | VARCHAR | DEFAULT 'A' | Paralelo (A, B, C...) |
| `dia` | VARCHAR | NULLABLE | Día de la semana |
| `hora_inicio` | VARCHAR | NULLABLE | Hora de inicio (ej. "08:00") |
| `hora_fin` | VARCHAR | NULLABLE | Hora de fin (ej. "10:00") |
| `num_estudiantes` | INTEGER | DEFAULT 0 | Cantidad de estudiantes inscritos |
| `docente` | VARCHAR | NULLABLE | Nombre del docente |
| `docente_id` | INTEGER | FK → docentes.id | Referencia a docente |
| `aula_asignada` | VARCHAR | NULLABLE | Código del aula asignada (ej. `A-01`) |
| `aula_sugerida` | VARCHAR | NULLABLE | Aula sugerida por el algoritmo |
| `materia_catalogo_id` | INTEGER | FK → materias_catalogo.id | Referencia al catálogo |
| `periodo_id` | INTEGER | FK → periodos.id | Período académico |
| `nombre_archivo` | VARCHAR | NULLABLE | Archivo de origen (planificación) |

**Índices:**
- `INDEX` en `dia`, `hora_inicio`, `hora_fin`, `aula_asignada`, `docente_id`, `carrera_id`, `ciclo`, `paralelo`, `nombre_archivo`
- `COMPOSITE INDEX` en `(carrera_id, ciclo, paralelo)`

#### Tabla: `distribucion`

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `clase_id` | INTEGER | FK → clases.id, NOT NULL | Clase asignada |
| `aula_id` | INTEGER | FK → aulas.id, NOT NULL | Aula asignada |
| `dia` | VARCHAR(50) | NOT NULL | Día de la semana |
| `hora_inicio` | TIME | NOT NULL | Hora de inicio |
| `hora_fin` | TIME | NOT NULL | Hora de fin |
| `fecha_asignacion` | DATE | DEFAULT NOW | Fecha de la asignación |

**Índices:**
- `idx_distribucion_clase` en `clase_id`
- `idx_distribucion_aula` en `aula_id`
- `idx_distribucion_horario` en `(dia, hora_inicio, hora_fin)`

#### Tabla: `uploads_carreras` (model: Carrera)

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `carrera` | VARCHAR(100) | UNIQUE, NOT NULL | Nombre de la carrera |
| `carrera_normalizada` | VARCHAR(120) | NULLABLE | Nombre normalizado (sin tildes, minúsculas) |
| `activa` | BOOLEAN | DEFAULT true | Si la carrera está activa |

### 4.2. Lógica de Negocio (Backend)

#### Algoritmo de Cálculo de Ocupación

El cálculo de ocupación se realiza en `distribucionController.js` en dos endpoints:

**1. Mapa de Calor General (`obtenerMapaCalor`)** — Línea 192:

```
Ocupación = (aulas_ocupadas_en_celda / total_aulas_disponibles) × 100
```

- Se obtienen todas las clases con `aula_asignada IS NOT NULL`.
- Se itera por cada clase y se marca la celda `(día, hora)` como ocupada.
- El total de aulas disponibles se obtiene de `SELECT COUNT(*) FROM aulas WHERE estado = 'disponible'`.
- Niveles: EMPTY (0%), LOW (<40%), MEDIUM (40-69%), HIGH (≥70%).

**2. Mapa de Calor Detallado (`obtenerMapaCalorDetallado`)** — Línea 329:

```
Ocupación de celda = (estudiantes / capacidad_aula) × 100
```

- Se itera por cada aula filtrada y cada hora del día.
- Para cada celda `(aula_id, hora, día)`, se busca si hay una clase asignada.
- Si hay clase: `ocupacion = (num_estudiantes / aula.capacidad) * 100`.
- Si no hay clase: `null` (celda vacía).

**Fórmula clave:**
```javascript
ocupacion = parseFloat(((estudiantes / capacidad) * 100).toFixed(1))
// Ejemplo: 45 estudiantes / 60 capacidad = 75.0%
```

#### Endpoint `/api/distribucion/heatmap-detallado`

**Descripción:** Devuelve una matriz de ocupación individual por aula (Hora × Aula) con filtros avanzados.

**Método:** `GET`

**Autenticación:** JWT Bearer Token (roles: `admin`, `director`)

**Parámetros de Consulta (Query Parameters):**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `carrera_id` | number | No | Filtrar por carrera. El director siempre fuerza su carrera. |
| `edificio` | string | No | Filtrar por edificio (solo admin). |
| `capacidad_minima` | number | No | Filtrar aulas con capacidad ≥ este valor. |
| `dias` | string | No | Lista separada por comas: `"Lunes,Martes,Miércoles"`. |
| `franja` | string | No | `"manana"` (7-12), `"tarde"` (13-18), `"noche"` (19-22). |

**Ejemplo de Solicitud:**
```http
GET /api/distribucion/heatmap-detallado?carrera_id=5&edificio=Edificio+Principal&dias=Lunes,Martes&franja=manana
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Ejemplo de Respuesta (200 OK):**
```json
{
  "success": true,
  "aulas": [
    {
      "id": 1,
      "codigo": "A-01",
      "nombre": "Aula 101",
      "capacidad": 40,
      "tipo": "AULA",
      "edificio": "Edificio Principal",
      "piso": 1
    },
    {
      "id": 2,
      "codigo": "A-02",
      "nombre": "Aula 102",
      "capacidad": 35,
      "tipo": "AULA",
      "edificio": "Edificio Principal",
      "piso": 1
    }
  ],
  "horas": [7, 8, 9, 10, 11, 12],
  "dias": ["Lunes", "Martes"],
  "datos": {
    "1_8_Lunes": {
      "ocupacion": 75.0,
      "clase": "Derecho Penal",
      "docente": "Dr. García",
      "estudiantes": 30,
      "capacidad_aula": 40,
      "carrera": "Derecho",
      "clase_id": 123
    },
    "1_9_Lunes": null,
    "2_8_Lunes": {
      "ocupacion": 57.1,
      "clase": "Cálculo I",
      "docente": "Ing. López",
      "estudiantes": 20,
      "capacidad_aula": 35,
      "carrera": "Arquitectura",
      "clase_id": 124
    }
  },
  "filtros_disponibles": {
    "edificios": ["Edificio Principal", "Edificio Norte", "Edificio Sur"]
  },
  "estadisticas": {
    "total_aulas": 25,
    "promedio_ocupacion": 42.3
  }
}
```

**Estructura del mapa `datos`:**
- Key: `"${aulaId}_${hora}_${dia}"` (ej. `"1_8_Lunes"`)
- Value: Objeto `CeldaOcupacion` o `null` si la celda está vacía.

**Códigos de Error:**

| Código | Descripción |
|--------|-------------|
| 400 | Parámetros inválidos |
| 401 | No autenticado |
| 403 | Sin permisos (solo admin/director) |
| 500 | Error interno del servidor |

#### Módulo de Filtros

Los filtros se aplican en cascada en el controller:

1. **Filtro por carrera (`carrera_id`):**
   - Si el usuario es `director`, se fuerza `carrera_id = usuario.carrera_director`.
   - Si el usuario es `admin`, se puede pasar `carrera_id` como parámetro.
   - Filtra aulas cuya `restriccion_carrera` incluya la carrera seleccionada (o sea `NULL` = libre para todos).

2. **Filtro por edificio:**
   - Solo disponible para rol `admin`.
   - Agrega `WHERE a.edificio = :edificio` a la consulta de aulas.

3. **Filtro por capacidad mínima:**
   - Agrega `WHERE a.capacidad >= :capacidad_minima`.

4. **Filtro por días:**
   - Parámetro `dias` separado por comas.
   - Se valida contra la lista permitida: `['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']`.

5. **Filtro por franja horaria:**
   - `"manana"` → horas 7-12
   - `"tarde"` → horas 13-18
   - `"noche"` → horas 19-22

### 4.3. Autenticación y Autorización

#### Flujo JWT

```
1. Login → POST /api/auth/login { email, password }
2. Respuesta → { token: "eyJ...", usuario: { id, rol, ... } }
3. Frontend almacena token en localStorage
4. Cada request → Header: Authorization: Bearer eyJ...
5. Middleware verificarAuth → decodifica JWT → adjunta req.usuario
6. Middleware verificarRol('admin', 'director') → valida rol
```

#### Control de Acceso por Rol en Heatmap

| Endpoint | Admin | Director | Docente | Estudiante |
|----------|-------|----------|---------|------------|
| `GET /heatmap` | ✅ (todas las carreras) | ✅ (solo su carrera) | ❌ | ❌ |
| `GET /heatmap-detallado` | ✅ (filtros completos) | ✅ (solo su carrera, sin filtro edificio) | ❌ | ❌ |
| `PUT /clase/:id` | ✅ | ✅ (solo su carrera) | ❌ | ❌ |
| `POST /clase` | ✅ | ✅ (solo su carrera) | ❌ | ❌ |
| `GET /disponibilidad` | ✅ | ✅ | ❌ | ❌ |

---

## 5. API y Endpoints del Módulo de Mapa de Calor

### 5.1. Endpoints de Distribución

Todos los endpoints requieren autenticación JWT (`verificarAuth`).

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/api/distribucion/estado` | admin, director | Estado general de distribución por carrera |
| `GET` | `/api/distribucion/heatmap` | admin, director | Mapa de calor general (Día × Hora) |
| `GET` | `/api/distribucion/heatmap-detallado` | admin, director | Mapa de calor detallado (Hora × Aula) |
| `GET` | `/api/distribucion/horario` | admin, director | Horario visual |
| `GET` | `/api/distribucion/clases` | admin, director | Todas las clases con estado de distribución |
| `GET` | `/api/distribucion/clase/:id` | admin, director | Detalle de una clase específica |
| `POST` | `/api/distribucion/clase` | admin, director | Crear clase manual |
| `PUT` | `/api/distribucion/clase/:id` | admin, director | Actualizar clase (re-asignar aula) |
| `DELETE` | `/api/distribucion/clase/:id` | admin, director | Eliminar clase |
| `GET` | `/api/distribucion/disponibilidad` | admin, director | Consultar aulas disponibles para un horario |
| `POST` | `/api/distribucion/ejecutar` | admin, director | Ejecutar algoritmo de distribución |
| `POST` | `/api/distribucion/forzar` | admin | Forzar redistribución completa |
| `POST` | `/api/distribucion/limpiar` | admin | Limpiar distribución actual |
| `GET` | `/api/distribucion/mi-distribucion` | todos | Ver clases propias (filtrado por rol) |
| `GET` | `/api/distribucion/reporte` | admin, director | Reporte de distribución |
| `GET` | `/api/distribucion/docentes-carga` | admin, director | Estadísticas de carga docente |
| `GET` | `/api/distribucion/simulado` | admin | Simulación de distribución |
| `GET` | `/api/distribucion/cuadro` | admin | Cuadro simple de clases |

### 5.2. Documentación Detallada del Endpoint Heatmap Detallado

**Nombre:** Mapa de Calor Detallado (Hora vs Aula)

**Endpoint:** `GET /api/distribucion/heatmap-detallado`

**Proporciona:** Una matriz bidimensional donde:
- **Filas** = Horas del día (7:00 a 21:00, o filtrado por franja)
- **Columnas** = Aulas disponibles (filtradas por edificio, capacidad, carrera)
- **Celdas** = Porcentaje de ocupación individual del aula en esa hora

**Algoritmo interno:**

```javascript
// 1. Obtener aulas filtradas
SELECT a.* FROM aulas a
WHERE a.estado = 'disponible'
  [AND a.edificio = :edificio]
  [AND a.capacidad >= :capacidad_minima]
  [AND (a.restriccion_carrera LIKE '%:carrera%')]
ORDER BY a.edificio, a.piso, a.codigo

// 2. Obtener clases con aula asignada en esas aulas
SELECT c.*, a.id as aula_id
FROM clases c
JOIN aulas a ON a.codigo = c.aula_asignada
WHERE a.id IN (:aulaIds)
  [AND c.carrera_id = :carreraId]

// 3. Construir matriz de datos
FOR each dia IN diasFiltro:
  FOR each aula IN aulas:
    FOR each hora IN horasFiltro:
      key = "${aula.id}_${hora}_${dia}"
      IF clase exists at (aula, hora, dia):
        datos[key] = {
          ocupacion: (estudiantes / capacidad) * 100,
          clase: materia,
          docente: nombre_docente,
          estudiantes, capacidad_aula, carrera, clase_id
        }
      ELSE:
        datos[key] = null

// 4. Calcular estadísticas
promedio_ocupacion = SUM(datos[key].ocupacion) / COUNT(datos[key])
```

**Filtros aplicados en cascada:**
1. Estado del aula = 'disponible'
2. Edificio (si se proporciona)
3. Capacidad mínima (si se proporciona)
4. Restricción de carrera (si se proporciona `carrera_id`)
5. Días seleccionados (si se proporciona `dias`)
6. Franja horaria (si se proporciona `franja`)

---

## 6. Flujos de Trabajo Críticos

### 6.1. Flujo de Carga del Mapa de Calor Detallado

```
[Frontend]                         [Backend]                       [PostgreSQL]
     │                                  │                                │
     │ 1. GET /distribucion/            │                                │
     │    heatmap-detallado             │                                │
     │    ?carrera_id=5&edificio=X      │                                │
     │─────────────────────────────────>│                                │
     │                                  │ 2. SELECT FROM aulas           │
     │                                  │    WHERE estado='disponible'   │
     │                                  │    AND edificio=:edificio      │
     │                                  │───────────────────────────────>│
     │                                  │<─────── aulas[] ──────────────│
     │                                  │                                │
     │                                  │ 3. SELECT FROM clases          │
     │                                  │    JOIN aulas ON codigo=       │
     │                                  │    aula_asignada               │
     │                                  │    WHERE a.id IN (:aulaIds)    │
     │                                  │───────────────────────────────>│
     │                                  │<─────── clases[] ─────────────│
     │                                  │                                │
     │                                  │ 4. Construir matriz datos{}   │
     │                                  │    Calcular ocupación %        │
     │                                  │                                │
     │<─────────────────────────────────│ 5. JSON Response               │
     │    { aulas, horas, datos, ... }  │                                │
     │                                  │                                │
     │ 6. Renderizar tabla HTML         │                                │
     │    Colorear celdas según %       │                                │
     │    Mostrar tooltip on hover      │                                │
```

### 6.2. Flujo de Edición de Clase desde el Mapa de Calor

```
1. Admin hace clic en celda del mapa de calor
2. Se muestra tooltip con detalles de la clase
3. Admin hace clic en "Editar" (abre ClaseEditModal)
4. Modal carga datos vía GET /distribucion/clase/:id
5. Admin modifica: materia, dia, hora_inicio, hora_fin, aula_asignada, docente, num_estudiantes
6. Frontend envía PUT /distribucion/clase/:id
7. Backend:
   a. Valida permisos (director solo su carrera)
   b. Ejecuta UPDATE en tabla `clases`
   c. Si hay aula_asignada, INSERT ON CONFLICT en tabla `distribucion`
   d. Commit de transacción
8. Frontend recarga datos del mapa de calor
```

### 6.3. Flujo de Lógica de "Reasignación Inteligente" de Aulas

El componente `MapaCalorDetallado` incluye un sistema de sugerencias de alternativas:

```typescript
// Cuando el usuario hace clic en "Buscar alternativas" en una celda:
const sugerirAlternativas = (aula, hora, dia) => {
  // 1. Obtener la ocupación actual de la celda
  const actual = datos[`${aula.id}_${hora}_${dia}`];
  
  // 2. Filtrar aulas candidatas:
  //    - Misma o mayor capacidad que los estudiantes actuales
  //    - Excluye el aula actual
  return data.aulas
    .filter(a => a.id !== aula.id && a.capacidad >= actual.estudiantes)
    .map(a => ({
      aula: a,
      ocupacion: datos[`${a.id}_${hora}_${dia}`]?.ocupacion || 0,
      clase: datos[`${a.id}_${hora}_${dia}`]?.clase || null
    }))
    // 3. Priorizar aulas con alta ocupación (70%+) como candidatas
    .filter(a => a.ocupacion >= 70)
    // 4. Ordenar por mayor ocupación primero
    .sort((a, b) => b.ocupacion - a.ocupacion)
    .slice(0, 3); // Top 3 alternativas
};
```

### 6.4. Flujo de Filtros en Cascada

```
Usuario cambia filtro (edificio, franja, días, etc.)
  │
  ▼
useEffect detecta cambio en dependencias [carreraId, edificio, capacidadMin, diasSel, franja]
  │
  ▼
loadData() se ejecuta
  │
  ▼
Construir parámetros de query:
  params = {
    carrera_id: carreraId,     // Fuerza director su carrera
    edificio: edificio,        // Solo admin
    capacidad_minima: capacidadMin,
    dias: diasSel.join(','),   // Array → string
    franja: franja             // '' | 'manana' | 'tarde' | 'noche'
  }
  │
  ▼
GET /api/distribucion/heatmap-detallado?carrera_id=5&edificio=X&dias=Lunes,Martes&franja=manana
  │
  ▼
Backend aplica filtros en SQL y devuelve matriz filtrada
  │
  ▼
React re-renderiza la tabla con nuevos datos
```

---

## 7. Componentes Frontend

### 7.1. Componente `MapaCalor.tsx`

**Ubicación:** `frontend/src/components/MapaCalor.tsx`

**Props:**
```typescript
interface MapaCalorProps {
  carreraId?: number;      // Filtrar por carrera
  titulo?: string;         // Título personalizado
  showExport?: boolean;    // Mostrar botones de exportación
}
```

**Funcionalidades:**
- Tabla HTML responsiva (Hora × Día de la semana).
- Colores por nivel: EMPTY (blanco), LOW (verde), MEDIUM (amarillo), HIGH (rojo).
- Click en celda → modal con detalle de clases (materia, docente, estudiantes, aula, carrera).
- Barra de controles con navegación de semana y estadísticas resumen.
- Botón de actualización manual.
- Diseño glassmorphism con Tailwind CSS.

**Endpoint consume:** `GET /api/distribucion/heatmap`

### 7.2. Componente `MapaCalorDetallado.tsx`

**Ubicación:** `frontend/src/components/director/MapaCalorDetallado.tsx`

**Props:**
```typescript
interface Props {
  carreraId?: number;    // ID de carrera (el director fuerza su carrera)
  esAdmin?: boolean;     // Si es admin, muestra filtro de edificio
}
```

**Funcionalidades:**
- Tabla HTML responsiva (Hora × Aula) con **sticky headers**.
- **Filtros en cascada:**
  - Selector de edificio (solo admin).
  - Input de capacidad mínima.
  - Checkboxes de días (Lunes a Sábado).
  - Selector de franja horaria (Mañana/Tarde/Noche).
- **Semáforo de colores por celda:**
  - Verde claro (0%): LIBRE
  - Verde (<40%): Baja ocupación
  - Amarillo (40-79%): Media ocupación
  - Rojo (≥80%): Alta ocupación
- **Tooltip flotante** al hover con:
  - Nombre de la materia
  - Docente
  - Número de estudiantes / capacidad
  - Barra de progreso de ocupación
  - Carrera
  - Badge de sobrecupo si aplica
- **Modal de alternativas:** "Buscar alternativas" en celdas de baja ocupación sugiere 3 aulas cercanas con alta ocupación.
- **Toggle "Agrupar 2h":** Combinar celdas de 2 horas consecutivas en una sola.
- **Estadísticas:** Total de aulas, promedio de ocupación.
- Diseño sticky con `position: sticky` para headers de aulas.

**Endpoint consume:** `GET /api/distribucion/heatmap-detallado`

### 7.3. Integración en Dashboards

**AdminDashboard.tsx** (línea 39):
```typescript
const [activeTab, setActiveTab] = useState<
  'general' | 'heatmap' | 'distribucion' | ...
>('general');

// En el render:
case 'heatmap':
  return <MapaCalorDetallado esAdmin={true} />;
```

**DirectorDashboard.tsx:**
```typescript
case 'heatmap':
  return <MapaCalorDetallado />;
// El director no necesita pasar carreraId — el backend fuerza su carrera
```

### 7.4. Tipos TypeScript Relevantes

Definidos en `frontend/src/services/api.ts`:

```typescript
interface AulaInfo {
  id: number;
  codigo: string;
  nombre: string;
  capacidad: number;
  tipo: string;
  edificio: string;
  piso: number;
}

interface CeldaOcupacion {
  ocupacion: number;      // Porcentaje 0-100
  clase: string;          // Nombre de la materia
  docente: string;        // Nombre del docente
  estudiantes: number;    // Número de estudiantes
  capacidad_aula: number; // Capacidad del aula
  carrera: string;        // Nombre de la carrera
  clase_id: number;       // ID de la clase (para edición)
}

interface MapaCalorDetalladoResponse {
  success: boolean;
  aulas: AulaInfo[];
  horas: number[];                        // [7, 8, 9, ..., 21]
  dias: string[];                         // ["Lunes", "Martes", ...]
  datos: Record<string, CeldaOcupacion | null>; // Key: "aulaId_hora_dia"
  filtros_disponibles: {
    edificios: string[];
  };
  estadisticas: {
    total_aulas: number;
    promedio_ocupacion: number;
  };
}
```

### 7.5. Servicios API (Frontend)

Funciones en `distribucionService` (`api.ts`):

```typescript
// Mapa de calor general
getMapaCalor: async (carreraId?: number): Promise<MapaCalorResponse>

// Mapa de calor detallado (nuevo)
getMapaCalorDetallado: async (filtros?: {
  carrera_id?: number;
  edificio?: string;
  capacidad_minima?: number;
  dias?: string;
  franja?: string;
}): Promise<MapaCalorDetalladoResponse>

// Obtener clase por ID (para modal de edición)
getClaseById: async (id: number)

// Actualizar clase
updateClase: async (id: number, data: any)

// Consultar disponibilidad
getDisponibilidadAulas: async (params: {
  dia: string; hora_inicio: string; hora_fin: string;
  capacidad_minima?: number;
})
```

---

## 8. Estrategia de Pruebas

### 8.1. Pruebas Unitarias

**Framework:** Jest 30.2.0  
**Ubicación:** `backend/tests/`  
**Comando:** `npm test`

Archivos de prueba existentes:

| Archivo | Cubre |
|---------|-------|
| `auth.controller.test.js` | Login, registro, cambio de contraseña |
| `auth.middleware.test.js` | Verificación JWT, roles |
| `reserva.controller.test.js` | CRUD de reservas, conflictos |
| `excel-parser.test.js` | Parseo de archivos Excel |
| `jwt.test.js` | Generación/verificación de tokens |

**Configuración Jest** (`package.json`):
```json
{
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"],
    "setupFiles": ["./tests/jest-setup.js"]
  }
}
```

### 8.2. Pruebas de Integración

Para probar el endpoint de heatmap detallado:

```bash
# 1. Asegurar que el backend esté corriendo
curl http://localhost:3001/api/health

# 2. Obtener token de autenticación
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@uide.edu.ec","password":"uide2024"}' \
  | jq -r '.token')

# 3. Probar heatmap detallado
curl -s "http://localhost:3001/api/distribucion/heatmap-detallado" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 4. Probar con filtros
curl -s "http://localhost:3001/api/distribucion/heatmap-detallado?carrera_id=5&franja=manana" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 8.3. Pruebas End-to-End (E2E)

**Herramienta:** Navegador manual + herramientas de QA del proyecto.

**Escenarios críticos:**

1. **Carga del mapa de calor:**
   - Login como admin → Navegar a "Mapa de Calor" → Verificar que la tabla carga.
   - Login como director → Verificar que solo ve su carrera.

2. **Filtros:**
   - Cambiar edificio → Verificar que las aulas se filtran.
   - Cambiar franja → Verificar que las horas se filtran.
   - Seleccionar días → Verificar que solo se muestran esos días.

3. **Edición de clase:**
   - Hacer clic en una celda ocupada → Verificar tooltip.
   - Hacer clic en "Editar" → Modal se abre con datos correctos.
   - Modificar aula → Guardar → Verificar que el mapa se actualiza.

4. **Reasignación inteligente:**
   - Hacer clic en "Buscar alternativas" → Verificar que se sugieren 3 aulas.
   - Verificar que las aulas sugeridas tienen alta ocupación.

---

## 9. Guía de Despliegue

### 9.1. Compilación del Frontend

```bash
cd frontend
npm run build
# Genera dist/ con archivos estáticos optimizados
```

### 9.2. Despliegue en Producción (VPS Hostinger)

**Requisitos del VPS:**
- Ubuntu 22.04
- Mínimo 2 CPU / 4GB RAM / 40GB SSD
- Docker + Docker Compose instalados
- Puerto 80/443 abierto

**Pasos:**

```bash
# 1. Clonar repositorio en el VPS
ssh usuario@tu-vps
git clone https://github.com/tu-usuario/gestion-aulas-uide.git
cd gestion-aulas-uide

# 2. Configurar variables de entorno
cp .env.production.example .env.production
nano .env.production
# Editar: DB_PASSWORD, JWT_SECRET, SMTP_USER, SMTP_PASS, EVOLUTION_API_KEY

# 3. Ejecutar script de despliegue
chmod +x deploy.sh
./deploy.sh
```

**El script `deploy.sh` ejecuta:**
1. Verifica Docker y Docker Compose.
2. Valida variables de entorno críticas.
3. Build de imágenes Docker.
4. Levanta servicios (`docker compose -f docker-compose.prod.yml up -d`).
5. Espera 15 segundos para que los servicios inicien.
6. Health check del backend (`GET /api/health`).
7. Verificación del frontend.
8. Configuración SSL con Let's Encrypt (si `DOMAIN` está configurado).

**Post-despliegue:**
```bash
# Escanear QR de WhatsApp
bash scripts/setup-evolution-instance.sh

# Importar workflows n8n
# (ver GUIA_PRUEBAS_LOCAL.md para instrucciones)
```

### 9.3. Comandos Útiles en Producción

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Ver logs del backend
docker compose -f docker-compose.prod.yml logs backend

# Ver estado de servicios
docker compose -f docker-compose.prod.yml ps

# Reiniciar servicios
docker compose -f docker-compose.prod.yml restart

# Detener todo
docker compose -f docker-compose.prod.yml down

# Actualizar código
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Verificar salud del sistema
curl http://localhost/api/health
```

---

## 10. Resolución de Problemas (Troubleshooting)

### 10.1. Problemas Comunes de Configuración

| Error | Causa Probable | Solución |
|-------|---------------|----------|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL no está corriendo | `docker compose up -d postgres` |
| `password authentication failed` | Credenciales incorrectas en `.env` | Verificar `DB_USER`, `DB_PASSWORD` en `.env` |
| `JWT_SECRET is not defined` | Falta `JWT_SECRET` en `.env` | Generar: `openssl rand -base64 48` |
| `CORS error` | `FRONTEND_URL` no coincide | Verificar `ALLOWED_ORIGINS` en `.env` |
| `Cannot find module` | Dependencias no instaladas | `cd backend && npm install` |
| `SequelizeDatabaseError: column does not exist` | Migración pendiente | `npm run db:migrate` |

### 10.2. Problemas de Rendimiento

**El mapa de calor carga lentamente:**

1. **Revisar índices de PostgreSQL:**
   ```sql
   -- Verificar índices en tabla clases
   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'clases';
   
   -- Crear índices faltantes si es necesario
   CREATE INDEX IF NOT EXISTS idx_clases_aula_dia 
   ON clases(aula_asignada, dia);
   
   CREATE INDEX IF NOT EXISTS idx_clases_dia_hora 
   ON clases(dia, hora_inicio, hora_fin);
   ```

2. **Revisar tamaño de la respuesta JSON:**
   - Si hay muchas aulas (>50), considerar paginación o filtros por defecto.
   - Usar el filtro de franja horaria para reducir el volumen.

3. **Optimizar consultas N+1:**
   - El endpoint actual usa 2 queries principales (aulas + clases).
   - Evitar queries dentro de loops.

### 10.3. Logs y Monitoreo

**Backend logs:**
```bash
# En desarrollo
# Los logs se imprimen en consola del servidor (npm run dev)

# En producción
docker compose -f docker-compose.prod.yml logs -f backend

# Filtrar errores
docker compose -f docker-compose.prod.yml logs backend 2>&1 | grep "❌"
```

**Health check endpoint:**
```bash
curl http://localhost:3001/api/health
# Responde: { status: "healthy", version: "1.0.0", uptime: ... }
```

**Log del controlador de distribución:**
- Los errores se loguean con `handle500(res, error, 'contexto')`.
- El contexto indica la función que falló (ej. `'obtenerMapaCalorDetallado'`).
- En desarrollo, el stack trace se incluye en la respuesta.

---

## 11. Apéndices

### 11.1. Guía de Estilo de Código

**Backend (JavaScript/Node.js):**
- Convención de nombres: `camelCase` para variables/funciones, `PascalCase` para modelos.
- Cada controller es un archivo独立 con funciones exportadas.
- Cada ruta es un archivo independiente que importa el controller.
- Usar `async/await` en lugar de callbacks.
- Manejar errores con `try/catch` y `handle500()`.

**Frontend (TypeScript/React):**
- Componentes funcionales con hooks.
- Convención de archivos: `PascalCase.tsx` para componentes.
- Interfaces TypeScript definidas en `services/api.ts`.
- Estilos con Tailwind CSS utility classes.
- Un componente por archivo.

### 11.2. Convenciones de Commits

Formato: Conventional Commits

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Tipos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Documentación
- `style`: Formato (no afecta lógica)
- `refactor`: Refactorización
- `test`: Pruebas
- `chore`: Mantenimiento

**Ejemplos:**
```
feat(heatmap): add detailed classroom occupancy view
fix(heatmap): fix occupancy calculation for empty cells
docs(api): document heatmap-detallado endpoint
refactor(distribucion): extract SQL queries to service layer
```

### 11.3. Mantenimiento del Documento

Este manual es un **documento vivo**. Debe actualizarse:

- Con cada **release mayor** del sistema.
- Cuando se **agreguen o modifiquen endpoints** de API.
- Cuando se **cambien modelos de datos** relevantes.
- Cuando se **modifique la lógica de cálculo** de ocupación.
- Cuando se **agreguen o reemplacen** componentes frontend.

**Responsable:** El desarrollador que implemente el cambio debe actualizar la sección correspondiente.

---

## Referencias Rápidas

### Endpoints Principales del Módulo

| Función | Endpoint | Método |
|---------|----------|--------|
| Mapa de calor general | `/api/distribucion/heatmap` | GET |
| Mapa de calor detallado | `/api/distribucion/heatmap-detallado` | GET |
| Estado distribución | `/api/distribucion/estado` | GET |
| Editar clase | `/api/distribucion/clase/:id` | PUT |
| Crear clase | `/api/distribucion/clase` | POST |
| Eliminar clase | `/api/distribucion/clase/:id` | DELETE |
| Disponibilidad aulas | `/api/distribucion/disponibilidad` | GET |
| Ejecutar distribución | `/api/distribucion/ejecutar` | POST |
| Mi distribución | `/api/distribucion/mi-distribucion` | GET |

### Archivos Clave

| Archivo | Función |
|---------|---------|
| `backend/src/controllers/distribucionController.js` | Toda la lógica de heatmap y distribución |
| `backend/src/routes/distribucionRoutes.js` | Definición de rutas |
| `backend/src/models/Aula.js` | Modelo de aulas |
| `backend/src/models/Clase.js` | Modelo de clases |
| `backend/src/models/Distribucion.js` | Modelo de distribución |
| `frontend/src/components/MapaCalor.tsx` | Mapa de calor general |
| `frontend/src/components/director/MapaCalorDetallado.tsx` | Mapa de calor detallado |
| `frontend/src/services/api.ts` | Servicios API + tipos TypeScript |
| `frontend/src/pages/AdminDashboard.tsx` | Dashboard admin (usa heatmap) |
