# 🏛️ Sistema de Gestión de Aulas UIDE - AI Powered

![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)
![Status](https://img.shields.io/badge/status-ready_for_deployment-success.svg)
![Tech](https://img.shields.io/badge/stack-Full_Stack_/_AI_/_Automation-darkgreen.svg)

## 🌟 Visión General
Este sistema es una solución integral de **última generación** diseñada para optimizar la asignación de espacios físicos en la **Universidad Internacional del Ecuador (UIDE)**. Mediante el uso de Inteligencia Artificial (n8n + GPT-4o), automatización de workflows y una interfaz web premium con estética macOS, el sistema transforma planificaciones académicas complejas en una distribución eficiente y libre de conflictos.

---

## 🏗️ Arquitectura del Ecosistema
El proyecto se basa en cuatro pilares fundamentales interconectados:

1.  **🚀 Backend (Node.js/Express):** El núcleo lógico. Maneja la persistencia en PostgreSQL, la seguridad JWT y los servicios de procesamiento inteligente de archivos.
2.  **🎨 Frontend (React/TypeScript):** Dashboard administrativo con diseño "Apple-Style" que ofrece una experiencia de usuario fluida y visualmente impactante.
3.  **🧠 n8n Master Workflow:** El cerebro de automatización. Orquestamos la validación de carreras, parsing de estudiantes con IA y algoritmos avanzados de distribución.
4.  **🤖 Telegram Bot:** Interfaz de consulta rápida para estudiantes y docentes, permitiendo búsquedas de aulas y horarios en tiempo real.

---

## 🚀 Características Élite

### 1. Motor de Extracción Inteligente (AI Parser)
*   **Deduplicación ADN:** Algoritmo que identifica clases únicas mediante claves compuestas (`materia|docente|paralelo|ciclo`), eliminando el ruido de hojas repetidas en Excels de Derecho y Arquitectura.
*   **Extracción de Metadatos:** Captura automática de perfiles de docentes (Títulos de pregrado/posgrado, email y dedicación) directamente desde la planificación.
*   **Normalización Lingüística:** Tratamiento de tildes, mayúsculas y espacios para asegurar la integridad de los datos.

### 2. Distribución y Resolución de Conflictos
*   **Algoritmo Maestro:** Asignación inteligente de aulas basada en capacidad, equipamiento y cercanía.
*   **Detección en Tiempo Real:** Alertas visuales inmediatas sobre colisiones de horarios (mismo aula, mismo tiempo).
*   **Dashboard para Directores:** Estadísticas detalladas de cumplimiento por carrera y herramientas de ajuste manual.

### 3. Automatización con n8n
*   **Integración `/maestro`:** Endpoint centralizado que orquesta todas las acciones IA.
*   **Parsing con GPT-4o:** Procesamiento de listas de estudiantes desestructuradas para convertirlas en datos relacionales.
*   **Health Check:** Sistema de monitoreo de disponibilidad del workflow.

### 4. Interfaz Premium (macOS Style)
*   **Dark Mode Nativo:** Estética visual profunda y profesional.
*   **Componentes Widgets:** Layout modular basado en tarjetas con micro-animaciones y Glassmorphism.

---

## 🛠️ Stack Tecnológico
*   **Base:** Node.js, TypeScript, Vite.
*   **Estilo:** Tailwind CSS, Material Symbols, Lucide Icons.
*   **Base de Datos:** PostgreSQL (Relacional), Redis (Caché/n8n).
*   **Automatización:** n8n (Workflow Automation).
*   **Inteligencia:** OpenAI GPT-4o / Anthropic Claude.
*   **Despliegue:** Docker, Docker Compose, PM2.

---

## 📂 Estructura del Proyecto
```bash
├── backend/                # API RESTful, Modelos Sequelize y Servicios
│   ├── src/controllers/    # Lógica de endpoints (Planificación, Distribución)
│   ├── src/services/       # Motor ExcelParser, Distribuidor Local, n8nService
│   └── src/models/         # Definición de tablas (Aulas, Docentes, Clases)
├── frontend/               # Aplicación React + Vite
│   ├── src/pages/          # Admin, Director, Estudiante Dashboards
│   ├── src/components/     # UI Components (Modales, Horarios Visuales)
│   └── src/services/       # Cliente API (Axios)
├── n8n/                    # Workflows JSON y Configuración de automatización
├── telegram-bot-aulas/     # Bot de Telegram independiente (Node.js)
├── docker-compose.yml      # Orquestación de contenedores (Prod & Dev)
└── .env                    # Variables de entorno críticas
```

---

## ⚙️ Instalación y Despliegue (Docker-First)

Para levantar todo el ecosistema en un entorno de desarrollo o producción:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/SantiagoJapon/gestion-aulas-uide.git
    cd gestion-aulas-uide
    ```

2.  **Configurar Variables de Entorno:**
    Crea un archivo `.env` en la raíz basado en el ejemplo proporcionado.

3.  **Levantar con Docker Compose:**
    ```bash
    docker-compose up -d
    ```

4.  **Acceso:**
    *   **Frontend:** `http://localhost:5173`
    *   **Backend API:** `http://localhost:3000`
    *   **n8n Editor:** `http://localhost:5678`

---

## 🧪 Verificación del Sistema
Para asegurar que el motor de deduplicación está funcionando al 100%:
1. Sube un archivo Excel de planificación (Arquitectura/Derecho).
2. El sistema filtrará automáticamente los "recesos" y "almuerzos".
3. Los docentes se sincronizarán con sus títulos profesionales.
4. El contador de clases reflejará únicamente las secciones académicas únicas.

---

## 🛡️ Mantenimiento
Para reiniciar servicios en producción (PM2):
```bash
pm2 restart backend
pm2 restart telegram-bot
```

Desarrollado por Santiago Japón para la **UIDE** by Antigravity AI.
