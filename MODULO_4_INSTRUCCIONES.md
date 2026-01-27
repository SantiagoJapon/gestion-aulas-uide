# 📋 MÓDULO 4: Subir Estudiantes con n8n

## 🎯 Objetivo
Permitir al administrador subir un archivo Excel con estudiantes que será procesado automáticamente por n8n.

---

## ✅ IMPLEMENTACIÓN COMPLETADA

### 1. Base de Datos
✅ Tabla `historial_cargas` creada con:
- Registro de todas las cargas de archivos
- Tracking de estudiantes procesados
- Estado (completado/error/en_proceso)
- Detalles en formato JSON

### 2. Backend
✅ **Controller** (`backend/src/controllers/estudianteController.js`):
- `subirEstudiantes()`: Recibe Excel, convierte a base64, envía a n8n
- `obtenerHistorialCargas()`: Lista últimas 20 cargas
- `verificarConexionN8n()`: Verifica estado de n8n

✅ **Routes** (`backend/src/routes/estudianteRoutes.js`):
- `POST /api/estudiantes/subir` - Subir Excel (admin)
- `GET /api/estudiantes/historial-cargas` - Ver historial (admin)
- `GET /api/estudiantes/verificar-n8n` - Verificar conexión (admin)

### 3. Frontend
✅ **Componente** (`frontend/src/components/SubirEstudiantes.tsx`):
- Selección de archivo con validación
- Verificación de conexión con n8n en tiempo real
- Indicador de progreso durante procesamiento
- Resultado detallado (estudiantes guardados, inscripciones)
- Historial de cargas recientes
- Mensajes de error detallados

---

## 🚀 CÓMO USAR

### Paso 1: Integrar en AdminDashboard

Edita `frontend/src/pages/AdminDashboard.tsx`:

```typescript
import SubirEstudiantes from '../components/SubirEstudiantes';

// En el componente, agrega:
<SubirEstudiantes />
```

### Paso 2: Crear Excel de Prueba

El archivo debe tener **2 hojas (sheets)**:

#### **Sheet1: Estudiantes**
| cedula | nombres | apellidos | email | telefono | carrera_id | nivel |
|--------|---------|-----------|-------|----------|------------|-------|
| 1234567890 | Juan Carlos | Pérez García | juan.perez@uide.edu.ec | 0991234567 | 1 | 1 |
| 0987654321 | María Fernanda | González López | maria.gonzalez@uide.edu.ec | 0999876543 | 1 | 1 |
| 1122334455 | Carlos Alberto | Rodríguez Martínez | carlos.rodriguez@uide.edu.ec | 0981122334 | 2 | 1 |

**Campos:**
- `cedula`: 10 dígitos (obligatorio, único)
- `nombres`: Nombres del estudiante (obligatorio)
- `apellidos`: Apellidos del estudiante (obligatorio)
- `email`: Correo institucional @uide.edu.ec (obligatorio)
- `telefono`: 10 dígitos
- `carrera_id`: ID de la carrera (debe existir en `uploads_carreras`)
- `nivel`: Nivel actual (1-10)

#### **Sheet2: Materias Inscritas**
| cedula_estudiante | codigo_materia | nivel | paralelo |
|-------------------|----------------|-------|----------|
| 1234567890 | DER101 | 1 | A |
| 1234567890 | DER102 | 1 | A |
| 0987654321 | DER101 | 1 | A |
| 1122334455 | ING201 | 1 | A |

**Campos:**
- `cedula_estudiante`: Debe coincidir con Sheet1
- `codigo_materia`: Código de la materia (debe existir en tabla `clases`)
- `nivel`: Nivel de la materia
- `paralelo`: Paralelo asignado (A, B, C, etc.)

### Paso 3: Verificar n8n

Antes de subir:

```bash
# Verificar que n8n esté corriendo
docker ps | grep n8n

# Si no está, iniciarlo
docker-compose up -d n8n
```

### Paso 4: Subir desde el Frontend

1. Ir al **Panel de Administrador**
2. Buscar sección **"Subir Listado de Estudiantes"**
3. Verificar que aparezca:
   - 🟢 "Sistema de procesamiento conectado" (verde)
4. Click en **"Haz clic o arrastra un archivo Excel aquí"**
5. Seleccionar tu archivo Excel
6. Click en **"Subir y Procesar"**
7. Esperar resultado (puede tardar 30-60 segundos)

---

## 🔍 VERIFICAR RESULTADOS

### En la Base de Datos

```sql
-- Ver estudiantes agregados
SELECT id, cedula, nombre, escuela, nivel, email 
FROM estudiantes 
ORDER BY id DESC 
LIMIT 10;

-- Ver inscripciones a materias (si existe la tabla)
SELECT 
  e.cedula,
  e.nombre,
  em.codigo_materia,
  em.nivel,
  em.paralelo
FROM estudiantes e
JOIN estudiantes_materias em ON em.estudiante_id = e.id
ORDER BY e.cedula, em.codigo_materia;

-- Ver historial de cargas
SELECT 
  id,
  archivo_nombre,
  registros_procesados,
  estado,
  fecha_carga
FROM historial_cargas
ORDER BY id DESC
LIMIT 5;
```

### En el Frontend

El componente mostrará:
- ✅ "Estudiantes guardados: X"
- ✅ "Inscripciones guardadas: Y"
- Fecha y hora del procesamiento

---

## 🔧 TROUBLESHOOTING

### 🔴 Error: "Sistema de procesamiento desconectado"

**Causas posibles:**
- n8n no está corriendo
- Workflow no está activo
- URL incorrecta

**Solución:**
```bash
# 1. Verificar n8n
docker ps | grep n8n

# 2. Ver logs
docker logs n8n --tail 50

# 3. Iniciar si está apagado
docker-compose up -d n8n

# 4. Verificar en navegador
# Abrir: http://localhost:5678
# Ir a Workflows → workflow_maestro_FINAL
# Verificar que esté ACTIVO (toggle arriba a la derecha)
```

### 🔴 Error: "Solo se permiten archivos Excel"

El archivo debe ser `.xlsx` o `.xls`. Verifica que:
- El archivo no esté corrupto
- La extensión sea correcta
- El tamaño no supere 10MB

### 🔴 Error: "Error al procesar el archivo"

**Ver logs de n8n:**
```bash
docker logs n8n --tail 100
```

**Causas comunes:**
- Las materias del Sheet2 no existen en la tabla `clases`
- Los `carrera_id` no existen en `uploads_carreras`
- Formato del Excel incorrecto

**Solución para materias:**
```sql
-- Crear materias de ejemplo si no existen
INSERT INTO clases (codigo_materia, nombre_materia, nivel, paralelo, carrera_id) VALUES
('DER101', 'Introducción al Derecho', 1, 'A', 1),
('DER102', 'Derecho Romano', 1, 'A', 1),
('ING201', 'Programación I', 1, 'A', 2)
ON CONFLICT DO NOTHING;
```

### 🔴 Error: "Request failed with status code 404"

El workflow de n8n no está escuchando en `/webhook/maestro`.

**Solución:**
1. Abrir n8n: http://localhost:5678
2. Importar `workflow_maestro_FINAL.json`
3. Configurar credenciales PostgreSQL
4. **ACTIVAR el workflow** (muy importante)

---

## 📊 ESTRUCTURA DEL FLUJO

```
[Admin Panel] 
    ↓ Selecciona Excel
    ↓
[Frontend] SubirEstudiantes.tsx
    ↓ FormData con archivo
    ↓
[Backend] POST /api/estudiantes/subir
    ↓ Convierte a base64
    ↓
[n8n] webhook/maestro
    ↓ Lee Excel
    ↓ Procesa Sheet1 (estudiantes)
    ↓ Procesa Sheet2 (materias)
    ↓ Guarda en PostgreSQL
    ↓
[Respuesta a Backend]
    ↓ Registra en historial_cargas
    ↓
[Respuesta a Frontend]
    ↓ Muestra resultado al usuario
```

---

## 🧪 PRUEBA COMPLETA

### 1. Verificar servicios
```bash
docker ps
# Deben estar corriendo: postgres, backend, n8n
```

### 2. Verificar n8n
```bash
# Abrir en navegador
http://localhost:5678

# Verificar que workflow_maestro_FINAL esté ACTIVO
```

### 3. Crear Excel de prueba
- 2 sheets
- Al menos 3 estudiantes
- 5-6 inscripciones a materias

### 4. Subir desde interfaz
- Login como admin
- Ir a Dashboard Admin
- Sección "Subir Listado de Estudiantes"
- Verificar conexión verde
- Subir archivo
- Esperar resultado

### 5. Verificar en BD
```sql
SELECT COUNT(*) FROM estudiantes;
SELECT COUNT(*) FROM estudiantes_materias;
SELECT * FROM historial_cargas ORDER BY id DESC LIMIT 1;
```

---

## ✅ CHECKLIST

- [x] Tabla `historial_cargas` creada
- [x] Controller `estudianteController.js` actualizado
- [x] Routes `estudianteRoutes.js` actualizadas
- [x] Componente `SubirEstudiantes.tsx` creado
- [x] Backend reconstruido y corriendo
- [ ] Componente integrado en `AdminDashboard.tsx`
- [ ] n8n corriendo con workflow activo
- [ ] Probado con Excel de ejemplo
- [ ] Verificado en base de datos

---

## 📝 NOTAS TÉCNICAS

### Límites configurados:
- Tamaño máximo de archivo: **10MB**
- Timeout de procesamiento: **2 minutos (120 segundos)**
- Historial mostrado: **Últimas 20 cargas**

### Validaciones:
- Formato: Solo `.xlsx` o `.xls`
- Autenticación: Solo usuarios con rol `admin`
- Conexión n8n: Verificación previa antes de permitir upload

### Variables de entorno necesarias:
```env
N8N_WEBHOOK_URL=http://n8n:5678/webhook
```

---

¡Listo para usar! 🎉
