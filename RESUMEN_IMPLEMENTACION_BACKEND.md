# 📊 RESUMEN DE IMPLEMENTACIÓN - BACKEND GESTION AULAS UIDE

**Fecha**: 2026-01-27
**Estado**: ✅ Backend Core Completado | ⚠️ Integración N8N Pendiente

---

## ✅ COMPLETADO

### 1. **Código Limpio y Optimizado**
- ✅ Eliminado código duplicado de `fixEncoding()` (estaba en 4 archivos)
- ✅ Creado módulo centralizado: [backend/src/utils/encoding.js](backend/src/utils/encoding.js)
- ✅ Funciones reutilizables: `fixEncoding`, `normalizeCarrera`, `normalizeCarreraKey`

**Impacto**: -120 líneas de código duplicado, mantenimiento más fácil

---

### 2. **Modelos de Base de Datos**
- ✅ Creado [backend/src/models/Clase.js](backend/src/models/Clase.js) - Modelo para clases/planificaciones
- ✅ Creado [backend/src/models/Distribucion.js](backend/src/models/Distribucion.js) - Modelo para asignaciones
- ✅ Actualizado [backend/src/models/index.js](backend/src/models/index.js) con relaciones:
  - Carrera ↔ Clase
  - Aula ↔ Clase
  - Clase ↔ Distribucion
  - Aula ↔ Distribucion

**Tablas BD**:
```sql
clases:       id, codigo_materia, nombre_materia, carrera_id, nivel, paralelo,
              horario_dia, horario_inicio, horario_fin, numero_estudiantes,
              docente, aula_asignada, estado

distribucion: id, clase_id, aula_id, dia, hora_inicio, hora_fin,
              fecha_asignacion
```

---

### 3. **Algoritmo Inteligente de Distribución de Aulas**
- ✅ Creado [backend/src/services/distribucion.service.js](backend/src/services/distribucion.service.js)

**Funcionalidades**:
- `ejecutarDistribucion()`: Asigna aulas automáticamente según:
  - ✅ Capacidad de estudiantes (con 10% margen)
  - ✅ Disponibilidad horaria (sin solapamientos)
  - ✅ Prioridad de carreras
  - ✅ Requisitos especiales (laboratorio, proyector)
  - ✅ Score de prioridad para asignación óptima

- `obtenerEstado()`: Estadísticas de distribución
- `limpiarDistribucion()`: Reiniciar asignaciones

**Algoritmo**:
1. Ordena clases por tamaño (más grandes primero)
2. Para cada clase, encuentra aulas compatibles
3. Calcula score de prioridad
4. Asigna mejor aula disponible
5. Actualiza BD en transacción

---

### 4. **Controllers y Endpoints**

#### **DistribucionController** ([backend/src/controllers/distribucionController.js](backend/src/controllers/distribucionController.js))

| Endpoint | Método | Acceso | Descripción |
|----------|--------|--------|-------------|
| `/api/distribucion/estado` | GET | Admin | Estadísticas globales de distribución |
| `/api/distribucion/heatmap` | GET | Admin | **Mapa de calor con niveles LOW/MEDIUM/HIGH** |
| `/api/distribucion/reporte` | GET | Admin | **Reporte completo (JSON para PDF/Excel)** |
| `/api/distribucion/mi-distribucion` | GET | Auth | **Vista por rol (Admin/Director/Docente/Estudiante)** |
| `/api/distribucion/forzar` | POST | Admin | Ejecutar distribución automática |
| `/api/distribucion/limpiar` | POST | Admin | Limpiar asignaciones |

---

### 5. **Visualización por Rol** ⭐ NUEVO

**Endpoint**: `GET /api/distribucion/mi-distribucion`

#### **Permisos por Rol**:

| Rol | Visualiza | Filtro |
|-----|-----------|--------|
| **Admin** | Todas las carreras | Puede filtrar por `carrera_id` |
| **Director** | Solo su carrera asignada | Automático según `carrera_director` |
| **Docente** | Clases donde es docente | Busca por nombre en campo `docente` |
| **Estudiante** | Clases de su escuela/carrera | Busca en tabla `estudiantes` por email |

**Respuesta incluye**:
- Estadísticas (total, asignadas, pendientes, porcentaje)
- Lista de clases con aula asignada
- Agrupación por día (para UI tipo calendario)

---

### 6. **Mapa de Calor Mejorado** 🔥 NUEVO

**Endpoint**: `GET /api/distribucion/heatmap`

**Respuesta**:
```json
{
  "success": true,
  "estadisticas": {
    "total_aulas_disponibles": 50,
    "total_slots_ocupados": 120,
    "promedio_ocupacion": 65,
    "total_clases_programadas": 180,
    "total_estudiantes": 3500
  },
  "puntos": [
    {
      "dia": "Lunes",
      "hora": 8,
      "aulas_ocupadas": 15,
      "total_clases": 18,
      "total_estudiantes": 350,
      "porcentaje_ocupacion": 75,
      "nivel": "HIGH"  // LOW / MEDIUM / HIGH
    }
  ],
  "detalles": {
    "Lunes_8": [
      {
        "aula_codigo": "A-101",
        "aula_nombre": "Aula A-101",
        "aula_capacidad": 40,
        "materia": "Cálculo II",
        "docente": "Dr. Arreaga",
        "estudiantes": 34,
        "porcentaje_ocupacion": 85,
        "carrera": "Ingeniería"
      }
    ]
  }
}
```

**Niveles de Ocupación**:
- 🟢 **LOW**: < 40% de aulas ocupadas
- 🟡 **MEDIUM**: 40-69% de aulas ocupadas
- 🔴 **HIGH**: ≥ 70% de aulas ocupadas

---

### 7. **Reporte Completo** 📈 NUEVO

**Endpoint**: `GET /api/distribucion/reporte?carrera_id=1&formato=json`

**Secciones del Reporte**:
1. **Resumen Ejecutivo**:
   - Total clases, aulas utilizadas, carreras activas
   - Total estudiantes y docentes
   - Promedio estudiantes por clase

2. **Distribución por Carrera**:
   - Clases, aulas, estudiantes, docentes por carrera

3. **Distribución por Día**:
   - Uso de aulas por día de la semana

4. **Distribución por Horario**:
   - Uso de aulas por franja horaria (7:00-21:00)

5. **Uso de Aulas**:
   - Detalle de cada aula (código, edificio, piso, clases asignadas, % ocupación)

6. **Top 10 Aulas Más Utilizadas**

7. **Top 10 Docentes con Más Clases**

**Uso**: El frontend puede consumir este JSON y exportarlo a PDF/Excel

---

## ⚠️ PENDIENTE

### 8. **Integración N8N**

**Problema Actual**: El backend llama a N8N pero los endpoints NO EXISTEN:

```javascript
// backend/src/services/n8n.service.js (líneas 140-260)
POST ${N8N_WEBHOOK_URL}/procesar-planificacion      // ❌ NO EXISTE
POST ${N8N_WEBHOOK_URL}/asignar-aulas               // ❌ NO EXISTE
POST ${N8N_WEBHOOK_URL}/admin/forzar-distribucion   // ❌ NO EXISTE
GET  ${N8N_WEBHOOK_URL}/healthz                     // ❌ NO EXISTE
```

**Solución 1 (Recomendada)**: Eliminar dependencia de N8N
- N8N actualmente solo hace routing, NO procesamiento IA
- La lógica de distribución **YA ESTÁ** en `distribucion.service.js`
- N8N_SOLO debe usarse para notificaciones (Telegram, email)

**Acciones**:
1. ✅ Actualizar `planificacionController.subirPlanificacion()` para llamar directamente a `DistribucionService.ejecutarDistribucion()`
2. ✅ Eliminar llamadas a N8N en distribución
3. ⚠️ Mantener N8N solo para:
   - Envío de notificaciones Telegram
   - Envío de emails
   - Webhooks externos (si necesario)

**Solución 2 (Alternativa)**: Implementar endpoints en N8N
- Crear workflows para cada endpoint faltante
- Más complejo, menos eficiente

---

### 9. **Workflows N8N - Limpieza**

**Problema**: 6 versiones del bot de Telegram en `n8n/workflows/`:
- telegram-bot-uide.json
- telegram-bot-uide-funcional.json
- telegram-bot-uide-polling.json
- telegram-bot-uide-polling-corregido.json
- telegram-bot-uide-polling-real.json
- telegram-bot-uide-simple-polling.json

**Acción**: Decidir cuál usar y eliminar el resto

---

### 10. **Bot de Telegram**

**Ubicación**: `telegram-bot-aulas/bot.js` (código independiente)

**Problema**: No está integrado con el backend Express
- Usa pool PostgreSQL directo (no Sequelize)
- No usa JWT del backend
- Funciona PERO está desconectado del sistema principal

**Funcionalidades Actuales**:
- ✅ `/start` - Autenticación por cédula
- ✅ `aulas [día] [hora]` - Listar aulas disponibles
- ✅ `reservar CODE DÍA HH:MM-HH:MM` - Crear reserva
- ✅ `mis reservas` - Ver reservas del usuario

**Acción Sugerida**:
1. Crear webhook en N8N para el bot
2. El bot llama a APIs del backend (con JWT)
3. Mantener consistencia con el sistema

---

## 📋 ENDPOINTS DISPONIBLES AHORA

### **Autenticación**
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Login (retorna JWT)

### **Estudiantes**
- `GET /api/estudiantes/login/:cedula` - Login estudiante por cédula
- `POST /api/estudiantes/subir` - Carga masiva Excel

### **Planificaciones**
- `POST /api/planificaciones/subir` - Subir planificación Excel
- `GET /api/planificaciones/historial` - Historial de cargas

### **Distribución** ⭐ NUEVOS
- `GET /api/distribucion/estado` - Estadísticas globales
- `GET /api/distribucion/heatmap` - Mapa de calor
- `GET /api/distribucion/reporte` - Reporte completo
- `GET /api/distribucion/mi-distribucion` - Vista por rol
- `POST /api/distribucion/forzar` - Ejecutar distribución
- `POST /api/distribucion/limpiar` - Limpiar asignaciones

### **Usuarios**
- `GET /api/usuarios` - Listar usuarios
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios/:id` - Actualizar usuario
- `PUT /api/usuarios/:id/carrera` - Asignar carrera a director
- `DELETE /api/usuarios/:id` - Eliminar (soft delete)

### **Carreras**
- `GET /api/carreras` - Listar carreras habilitadas
- `POST /api/carreras` - Crear carrera
- `PUT /api/carreras/:id` - Actualizar carrera
- `DELETE /api/carreras/:id` - Eliminar carrera

### **Aulas**
- `GET /api/aulas` - Listar aulas

---

## 🚀 PRÓXIMOS PASOS (PRIORITARIOS)

### **Opción A: Sin N8N (Recomendado)**
1. Actualizar `planificacionController.subirPlanificacion()`
2. Llamar directamente a `DistribucionService.ejecutarDistribucion()`
3. Eliminar dependencia de N8N para distribución
4. N8N solo para notificaciones

### **Opción B: Con N8N**
1. Implementar workflows faltantes en N8N
2. Crear endpoints `/procesar-planificacion`, `/asignar-aulas`
3. Consolidar workflows del bot

---

## 🧪 CÓMO PROBAR

### 1. **Subir Planificación**
```bash
POST /api/planificaciones/subir
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data

# Body: archivo Excel con planificación
```

### 2. **Ejecutar Distribución Automática**
```bash
POST /api/distribucion/forzar
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "carreraId": null,     // null = todas las carreras
  "soloNuevas": true,    // true = solo clases sin aula asignada
  "forzar": false        // false = respetar asignaciones existentes
}
```

### 3. **Ver Mapa de Calor**
```bash
GET /api/distribucion/heatmap?carrera_id=1
Authorization: Bearer <JWT_TOKEN>
```

### 4. **Generar Reporte**
```bash
GET /api/distribucion/reporte?carrera_id=todas
Authorization: Bearer <JWT_TOKEN>
```

### 5. **Ver Mi Distribución (por Rol)**
```bash
# Admin ve todo
GET /api/distribucion/mi-distribucion
Authorization: Bearer <JWT_ADMIN>

# Director ve solo su carrera
GET /api/distribucion/mi-distribucion
Authorization: Bearer <JWT_DIRECTOR>

# Docente ve sus clases
GET /api/distribucion/mi-distribucion
Authorization: Bearer <JWT_DOCENTE>

# Estudiante ve su carrera
GET /api/distribucion/mi-distribucion
Authorization: Bearer <JWT_ESTUDIANTE>
```

---

## 📂 ARCHIVOS MODIFICADOS/CREADOS

### **Creados**:
- `backend/src/utils/encoding.js` - Utilidades de encoding UTF-8
- `backend/src/models/Clase.js` - Modelo Clase
- `backend/src/models/Distribucion.js` - Modelo Distribucion
- `backend/src/services/distribucion.service.js` - Algoritmo de distribución

### **Modificados**:
- `backend/src/controllers/authController.js` - Usa encoding centralizado
- `backend/src/controllers/usuarioController.js` - Usa encoding centralizado
- `backend/src/controllers/carreraController.js` - Usa encoding centralizado
- `backend/src/controllers/distribucionController.js` - **COMPLETAMENTE REFACTORIZADO**:
  - Nuevo: `getMiDistribucion()` - Vista por rol
  - Mejorado: `getMapaCalorDistribucion()` - Con niveles y detalles
  - Nuevo: `generarReporte()` - Reporte completo
  - Mejorado: `forzarDistribucion()` - Usa DistribucionService
  - Nuevo: `limpiarDistribucion()` - Limpia asignaciones
- `backend/src/routes/distribucionRoutes.js` - Rutas actualizadas
- `backend/src/models/index.js` - Relaciones entre modelos
- `backend/src/models/Carrera.js` - Usa encoding centralizado

---

## 🎯 DECISION REQUERIDA

**¿Qué hacer con N8N?**

**Opción 1 (Recomendada)**: Desacoplar distribución de N8N
- ✅ Más simple
- ✅ Más rápido
- ✅ Menos dependencias
- ✅ Código ya implementado

**Opción 2**: Mantener N8N para distribución
- ⚠️ Requiere implementar workflows
- ⚠️ Más complejo
- ⚠️ Latencia adicional

**¿Qué prefieres?**
