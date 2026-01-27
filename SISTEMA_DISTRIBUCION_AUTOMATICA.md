# 🤖 SISTEMA DE DISTRIBUCIÓN AUTOMÁTICA DE AULAS

## ✅ ESTADO DE IMPLEMENTACIÓN

```
🟢 Backend: FUNCIONANDO (planificacionController + routes)
🟢 Base de Datos: TABLAS CREADAS (planificaciones_subidas)
🟢 Frontend: COMPONENTE CREADO (SubirPlanificacion.tsx)
🟡 N8N: PENDIENTE DE CONFIGURAR
```

---

## 📊 FLUJO COMPLETO DEL SISTEMA

```
1. ADMIN habilita carreras 
   (Arquitectura, Derecho, Ingeniería TI)
            ↓
2. DIRECTOR sube Excel con planificación
            ↓
3. Backend valida y guarda en tabla `clases`
            ↓
4. 🤖 TRIGGER AUTOMÁTICO → Llama a n8n webhook
            ↓
5. N8N ejecuta algoritmo inteligente:
   ✅ Verifica capacidad aulas vs estudiantes
   ✅ Considera preferencias de aulas
   ✅ Detecta conflictos de horarios
   ✅ Asigna aulas óptimas
            ↓
6. Actualiza BD (campo `aula_asignada` en `clases`)
            ↓
7. Notifica resultados y actualiza vistas
```

---

## 📋 FORMATO DEL EXCEL DE PLANIFICACIÓN

### Columnas Requeridas:

| Columna              | Tipo    | Ejemplo                  | Descripción                    |
|----------------------|---------|--------------------------|--------------------------------|
| `codigo_materia`     | Text    | DER101                   | Código único de la materia     |
| `nombre_materia`     | Text    | Derecho Civil I          | Nombre completo de la materia  |
| `nivel`              | Number  | 1                        | Nivel o semestre               |
| `paralelo`           | Text    | A                        | Paralelo/sección               |
| `numero_estudiantes` | Number  | 45                       | Cantidad de estudiantes        |
| `horario_dia`        | Text    | Lunes                    | Día de la semana               |
| `horario_inicio`     | Text    | 08:00                    | Hora de inicio (HH:MM)         |
| `horario_fin`        | Text    | 10:00                    | Hora de fin (HH:MM)            |
| `docente`            | Text    | Dr. Juan Pérez           | Nombre del docente             |

### Ejemplo de Excel:

```
codigo_materia | nombre_materia        | nivel | paralelo | numero_estudiantes | horario_dia | horario_inicio | horario_fin | docente
---------------|----------------------|-------|----------|-------------------|-------------|----------------|-------------|------------------
DER101         | Derecho Civil I      | 1     | A        | 45                | Lunes       | 08:00          | 10:00       | Dr. Juan Pérez
DER102         | Derecho Penal I      | 1     | A        | 40                | Martes      | 08:00          | 10:00       | Dra. María López
DER103         | Derecho Romano       | 1     | B        | 38                | Miércoles   | 08:00          | 10:00       | Dr. Carlos Ruiz
DER201         | Derecho Civil II     | 2     | A        | 35                | Jueves      | 08:00          | 10:00       | Dr. Juan Pérez
DER202         | Derecho Laboral      | 2     | A        | 32                | Viernes     | 08:00          | 10:00       | Dra. Ana García
```

---

## 🎭 ROLES Y PERMISOS

### 👨‍💼 ADMINISTRADOR
**Puede:**
- ✅ Ver distribución de TODAS las carreras
- ✅ Habilitar/deshabilitar carreras para subir planificación
- ✅ Ejecutar distribución manual
- ✅ Resolver conflictos
- ✅ Aprobar/rechazar planificaciones

**Endpoints:**
- `GET /api/planificaciones/distribucion` - Ver todas las distribuciones
- `POST /api/planificaciones/distribucion/ejecutar` - Ejecutar manualmente
- `GET /api/planificaciones/conflictos/:carrera_id` - Ver conflictos

### 👨‍🏫 DIRECTOR DE CARRERA
**Puede:**
- ✅ Subir planificación de SU carrera solamente
- ✅ Ver distribución de SU carrera
- ✅ Ver conflictos de SU carrera
- ❌ NO puede ver otras carreras
- ❌ NO puede ejecutar distribución manual

**Endpoints:**
- `POST /api/planificaciones/subir` - Subir planificación
- `GET /api/planificaciones/distribucion/:carrera_id` - Ver su distribución
- `GET /api/planificaciones/conflictos/:carrera_id` - Ver sus conflictos

### 👨‍🏫 DOCENTE
**Puede:**
- ✅ Ver SOLO sus clases asignadas
- ✅ Ver horario y aulas de sus clases
- ❌ NO puede subir planificaciones
- ❌ NO puede ejecutar distribución

**Endpoints:**
- `GET /api/planificaciones/mis-clases` - Ver solo sus clases

### 👨‍🎓 ESTUDIANTE
**Puede:**
- ✅ Ver SOLO las clases de sus materias inscritas
- ✅ Ver horario de sus clases
- ✅ Ver ubicación de aulas en mapa
- ❌ NO puede subir planificaciones
- ❌ NO puede ver distribución completa

**Endpoints:**
- `GET /api/estudiantes/mi-horario` - Ver su horario personal

---

## 🚀 INSTRUCCIONES DE USO

### Para DIRECTORES:

#### 1. Preparar el Excel
- Usar la plantilla con las 9 columnas requeridas
- Asegurarse de que todos los horarios estén completos
- Verificar que los códigos de materias sean únicos por nivel/paralelo

#### 2. Subir Planificación
```
1. Login en: http://localhost:5173/director
2. Ir a: "Subir Planificación"
3. Seleccionar archivo Excel
4. Click: "Subir y Distribuir Automáticamente"
5. Esperar confirmación
```

#### 3. Ver Resultado
- El sistema mostrará cuántas clases se guardaron
- La distribución comenzará automáticamente
- Verás el progreso en tiempo real
- Se actualizará cada 3 segundos

#### 4. Verificar Distribución
- Ver el dashboard con estadísticas
- Ver qué aulas fueron asignadas
- Identificar clases pendientes
- Ver conflictos si los hay

---

## 🤖 ALGORITMO DE DISTRIBUCIÓN (N8N)

### Criterios de Asignación:

#### 1. **Capacidad** (Prioridad ALTA)
```
capacidad_aula >= numero_estudiantes * 1.1
```
- Margen del 10% para comodidad
- Si no hay aulas suficientes, asignar la más cercana

#### 2. **Tipo de Aula** (Prioridad MEDIA)
```
Laboratorio → clases prácticas/talleres
Auditorio   → clases >100 estudiantes
Estándar    → clases regulares
```

#### 3. **Disponibilidad Horaria** (Prioridad CRÍTICA)
```
NO asignar si:
  - Misma aula
  - Mismo día
  - Horarios se solapan
```

#### 4. **Preferencias** (Prioridad BAJA)
```
- Aulas prioritarias para carreras específicas
- Edificios preferidos
- Pisos accesibles
```

#### 5. **Distribución Equitativa**
```
- Balancear entre edificios
- Evitar que una carrera monopolice un edificio
- Considerar distancias para estudiantes
```

### Algoritmo Paso a Paso:

```javascript
Para cada clase SIN aula asignada:
  1. Filtrar aulas con capacidad suficiente
  2. Filtrar aulas disponibles en ese horario
  3. Ordenar por:
     - Prioridad de carrera
     - Capacidad (más ajustada mejor)
     - Edificio preferido
  4. Asignar primera aula de la lista
  5. Marcar aula como ocupada en ese horario
  6. Si NO hay aulas disponibles → marcar como "conflicto"
```

---

## 🔔 NOTIFICACIONES Y EVENTOS

### Eventos Automáticos:

#### 1. `nueva_planificacion`
```javascript
// Se dispara cuando un director sube planificación
{
  carrera_id: 1,
  total_clases: 45,
  usuario_id: 5,
  timestamp: "2026-01-26T20:00:00Z"
}
```

**Acción:** Llama a n8n webhook para distribuir

#### 2. `distribucion_completada`
```javascript
// Se dispara cuando n8n termina de distribuir
{
  carrera_id: 1,
  asignadas: 42,
  pendientes: 3,
  conflictos: 2
}
```

**Acción:** Actualiza vistas en tiempo real

#### 3. `conflicto_detectado`
```javascript
// Se dispara cuando se encuentra un conflicto
{
  clase_id: 123,
  problema: "Sin aula disponible",
  sugerencias: [...]
}
```

**Acción:** Notifica al director y admin

---

## 🧪 CÓMO PROBAR

### Paso 1: Verificar Backend
```powershell
# Ver logs del backend
docker logs gestion_aulas_backend --tail 20

# Deberías ver:
# ✅ Servidor corriendo en puerto 3000
# ✅ Routes de planificación registradas
```

### Paso 2: Crear Excel de Prueba

Crea un archivo `planificacion_test.xlsx` con estas columnas:

```
codigo_materia | nombre_materia | nivel | paralelo | numero_estudiantes | horario_dia | horario_inicio | horario_fin | docente
DER101         | Derecho Civil  | 1     | A        | 45                | Lunes       | 08:00          | 10:00       | Dr. Pérez
```

### Paso 3: Probar desde Postman

```bash
POST http://localhost:3000/api/planificaciones/subir

Headers:
Authorization: Bearer [tu_token]

Body (form-data):
archivo: [planificacion_test.xlsx]
carrera_id: 1
```

### Paso 4: Verificar en Base de Datos

```sql
-- Ver clases guardadas
SELECT codigo_materia, nombre_materia, nivel, paralelo, estado, aula_asignada 
FROM clases 
WHERE carrera_id = 1;

-- Ver planificaciones subidas
SELECT * FROM planificaciones_subidas ORDER BY fecha_subida DESC;
```

---

## 🔧 TROUBLESHOOTING

### Error: "No se pudo activar distribución automática"
**Causa:** n8n no está corriendo o el webhook no está configurado

**Solución:**
```bash
# 1. Verificar n8n
docker ps | grep n8n

# 2. Iniciar n8n si no está corriendo
docker-compose up -d n8n

# 3. Verificar webhook
curl -X POST http://localhost:5678/webhook/maestro \
  -H "Content-Type: application/json" \
  -d '{"accion": "obtener_estado"}'
```

### Error: "No tienes permisos para esta acción"
**Causa:** El usuario no tiene rol de director o admin

**Solución:**
```sql
-- Verificar rol del usuario
SELECT id, nombre, rol, carrera_director 
FROM usuarios 
WHERE email = 'tu_email@uide.edu.ec';

-- Actualizar a director si es necesario
UPDATE usuarios 
SET rol = 'director', carrera_director = 1 
WHERE id = [id_usuario];
```

### Error: "carrera_id es requerido"
**Causa:** No se envió el carrera_id en el body

**Solución:**
- Asegúrate de incluir `carrera_id` en el FormData
- Verifica que el usuario tenga asignada una carrera

---

## 📡 PRÓXIMOS PASOS

### Configurar N8N (PENDIENTE):

1. **Iniciar n8n:**
```bash
docker-compose up -d n8n
```

2. **Acceder a n8n:**
```
http://localhost:5678
```

3. **Importar workflow:**
- Workflows → Import from File
- Seleccionar `workflow_maestro_FINAL.json`
- Configurar credenciales de PostgreSQL

4. **Activar webhook:**
- Abrir el workflow
- Click en "Active" (toggle superior derecho)
- Verificar que la URL sea: `http://localhost:5678/webhook/maestro`

5. **Probar webhook:**
```bash
curl -X POST http://localhost:5678/webhook/maestro \
  -H "Content-Type: application/json" \
  -d '{
    "accion": "distribuir_aulas",
    "carrera_id": 1,
    "trigger": "manual"
  }'
```

---

## 🎯 ENDPOINTS DISPONIBLES

### 📤 Subir Planificación
```
POST /api/planificaciones/subir
Headers: Authorization: Bearer [token]
Body (form-data):
  - archivo: [Excel file]
  - carrera_id: [number]

Respuesta:
{
  "success": true,
  "mensaje": "Planificación subida. Distribución automática en progreso...",
  "resultado": {
    "clases_guardadas": 45,
    "distribucion": {
      "estado": "en_progreso",
      "mensaje": "La distribución de aulas se está procesando automáticamente"
    }
  }
}
```

### 📊 Ver Estado de Distribución
```
GET /api/planificaciones/distribucion/:carrera_id
Headers: Authorization: Bearer [token]

Respuesta:
{
  "success": true,
  "estadisticas": {
    "total": 45,
    "asignadas": 42,
    "pendientes": 3,
    "porcentaje": "93.33"
  },
  "clases": [...]
}
```

### 🔧 Ejecutar Distribución Manual (Solo Admin)
```
POST /api/planificaciones/distribucion/ejecutar
Headers: Authorization: Bearer [token]
Body (JSON):
{
  "carrera_id": 1
}
```

### ⚠️ Detectar Conflictos
```
GET /api/planificaciones/conflictos/:carrera_id
Headers: Authorization: Bearer [token]

Respuesta:
{
  "success": true,
  "total_conflictos": 2,
  "conflictos": [
    {
      "clase1_codigo": "DER101",
      "clase2_codigo": "ARQ201",
      "aula_nombre": "Aula 301",
      "horario_dia": "Lunes",
      "horario_inicio": "08:00",
      "horario_fin": "10:00"
    }
  ]
}
```

---

## 📁 ARCHIVOS CREADOS

```
backend/src/controllers/planificacionController.js  ✅
backend/src/routes/planificacionRoutes.js          ✅
frontend/src/components/director/SubirPlanificacion.tsx  ✅
SISTEMA_DISTRIBUCION_AUTOMATICA.md                 ✅ (este archivo)
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Backend:
- [x] Controller creado
- [x] Routes creadas y registradas
- [x] Tabla `planificaciones_subidas` creada
- [x] Variable `N8N_WEBHOOK_URL` configurada
- [x] Backend reconstruido y funcionando

### Frontend:
- [x] Componente `SubirPlanificacion.tsx` creado
- [ ] Agregar ruta en `App.tsx`
- [ ] Agregar opción en menú del director
- [ ] Conectar con contexto de usuario

### N8N:
- [ ] Iniciar contenedor n8n
- [ ] Importar workflow
- [ ] Configurar credenciales
- [ ] Activar webhook
- [ ] Probar distribución

### Testing:
- [ ] Crear Excel de prueba
- [ ] Subir planificación de prueba
- [ ] Verificar clases en BD
- [ ] Verificar que n8n se active
- [ ] Verificar aulas asignadas

---

## 🎯 RESULTADO ESPERADO

Cuando todo esté configurado:

1. **Director sube planificación** → ⏱️ ~2 segundos
2. **Backend guarda clases** → ⏱️ ~1 segundo
3. **N8N recibe trigger** → ⏱️ inmediato
4. **N8N ejecuta algoritmo** → ⏱️ ~10 segundos
5. **Aulas asignadas** → ⏱️ ~2 segundos
6. **Frontend actualizado** → ⏱️ ~3 segundos

**Tiempo total:** ~20 segundos desde subida hasta ver distribución completa.

---

## 📚 PRÓXIMOS PASOS

### 1. Configurar N8N (URGENTE)
- Iniciar contenedor
- Importar workflow
- Activar webhook

### 2. Integrar Frontend
- Agregar componente a routing
- Conectar con auth context
- Probar desde UI

### 3. Crear Documentación para Usuarios
- Guía para directores
- Manual de formato Excel
- Video tutorial

### 4. Implementar Características Avanzadas
- WebSocket para actualización en tiempo real
- Notificaciones push
- Exportar distribución a PDF
- Mapa interactivo del campus

---

**📌 Última actualización:** 26 de Enero 2026, 21:52  
**📌 Estado:** Backend funcionando, Frontend creado, N8N pendiente  
**📌 Siguiente paso:** Configurar N8N y probar distribución automática
