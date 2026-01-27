# ✅ INSTRUCCIONES FINALES - Distribución Automática

## 🎉 LO QUE YA ESTÁ FUNCIONANDO

```
✅ Backend con planificacionController.js
✅ Routes de planificación (/api/planificaciones/*)
✅ Tabla planificaciones_subidas en BD
✅ Componente React SubirPlanificacion.tsx
✅ Middleware de autenticación y roles
✅ Sistema de triggers automáticos
```

---

## 🚀 PRÓXIMOS PASOS PARA COMPLETAR

### PASO 1: Integrar Componente en Frontend (5 minutos)

#### 1.1 Agregar ruta en `App.tsx` o router:

```typescript
// frontend/src/App.tsx o donde tengas las rutas

import SubirPlanificacion from './components/director/SubirPlanificacion';

// Dentro de tus rutas:
<Route 
  path="/director/planificacion" 
  element={<SubirPlanificacion />} 
/>
```

#### 1.2 Agregar opción en el menú del director:

```typescript
// En tu componente de navegación del director
<NavLink 
  to="/director/planificacion"
  className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 rounded-lg"
>
  <FileSpreadsheet size={20} />
  Subir Planificación
</NavLink>
```

---

### PASO 2: Configurar N8N (10 minutos)

#### 2.1 Iniciar N8N si no está corriendo:

```powershell
# Verificar si está corriendo
docker ps | Select-String "n8n"

# Si no está, iniciarlo
docker-compose up -d n8n

# Esperar 30 segundos
Start-Sleep -Seconds 30

# Verificar logs
docker logs gestion_aulas_n8n --tail 20
```

#### 2.2 Acceder a N8N:

```
URL: http://localhost:5678
Usuario: admin@uide.edu.ec
Password: (crear al primer acceso)
```

#### 2.3 Importar Workflow:

1. Click en **"Workflows"** en el menú izquierdo
2. Click en **"Import from file"**
3. Seleccionar: `n8n/workflows/workflow_maestro_FINAL.json`
4. Click en **"Import"**

#### 2.4 Configurar Credenciales PostgreSQL:

1. Click en el nodo **"PostgreSQL"**
2. Click en **"Create New Credential"**
3. Llenar:
   ```
   Host: db
   Database: gestion_aulas
   User: postgres
   Password: [tu_password_de_.env]
   Port: 5432
   ```
4. Click **"Save"**

#### 2.5 Activar Workflow:

1. Click en el toggle **"Active"** (arriba derecha)
2. Debería cambiar a color verde
3. Verificar que diga: "Workflow is active"

---

### PASO 3: Crear Excel de Prueba (2 minutos)

Crea un archivo Excel con estas columnas y datos:

**Nombre:** `planificacion_derecho_test.xlsx`

| codigo_materia | nombre_materia | nivel | paralelo | numero_estudiantes | horario_dia | horario_inicio | horario_fin | docente |
|----------------|----------------|-------|----------|-------------------|-------------|----------------|-------------|---------------|
| DER101 | Introducción al Derecho | 1 | A | 45 | Lunes | 08:00 | 10:00 | Dr. Juan Pérez |
| DER102 | Derecho Romano | 1 | A | 40 | Martes | 08:00 | 10:00 | Dra. María López |
| DER103 | Derecho Constitucional | 1 | B | 38 | Miércoles | 08:00 | 10:00 | Dr. Carlos Ruiz |
| DER104 | Derecho Civil I | 1 | A | 35 | Jueves | 10:00 | 12:00 | Dr. Juan Pérez |
| DER105 | Derecho Penal I | 1 | A | 32 | Viernes | 08:00 | 10:00 | Dra. Ana García |

---

### PASO 4: Probar el Sistema (5 minutos)

#### 4.1 Desde Postman:

```bash
POST http://localhost:3000/api/planificaciones/subir

Headers:
Authorization: Bearer [obtener_token_del_login]

Body (form-data):
archivo: planificacion_derecho_test.xlsx
carrera_id: 1
```

**Respuesta esperada:**
```json
{
  "success": true,
  "mensaje": "Planificación subida. Distribución automática en progreso...",
  "resultado": {
    "clases_guardadas": 5,
    "distribucion": {
      "estado": "en_progreso"
    }
  }
}
```

#### 4.2 Verificar en Base de Datos:

```powershell
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT codigo_materia, nombre_materia, estado, aula_asignada FROM clases WHERE carrera_id = 1;"
```

**Deberías ver:**
```
 codigo_materia | nombre_materia         | estado    | aula_asignada 
----------------|------------------------|-----------|---------------
 DER101         | Introducción al Derecho| asignada  | 5
 DER102         | Derecho Romano         | asignada  | 7
 DER103         | Derecho Constitucional | asignada  | 12
```

#### 4.3 Ver Estado de Distribución:

```bash
GET http://localhost:3000/api/planificaciones/distribucion/1

Headers:
Authorization: Bearer [token]
```

**Respuesta esperada:**
```json
{
  "success": true,
  "estadisticas": {
    "total": 5,
    "asignadas": 5,
    "pendientes": 0,
    "porcentaje": "100.00"
  }
}
```

---

### PASO 5: Probar desde el Frontend (3 minutos)

1. **Login como director:**
```
URL: http://localhost:5173/director
Email: [tu_director@uide.edu.ec]
Password: [password]
```

2. **Ir a "Subir Planificación"**

3. **Subir el Excel de prueba**

4. **Ver el progreso en tiempo real:**
   - Deberías ver la barra de progreso
   - Se actualizará cada 3 segundos
   - Mostrará cuántas clases fueron asignadas

---

## 🎯 RESULTADO FINAL ESPERADO

### En el Dashboard del Director:

```
Estado Actual de Distribución
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Clases:    5
Asignadas:       5  ✅
Pendientes:      0  
Progreso:        100%  ━━━━━━━━━━━━━━ 

¡Planificación subida exitosamente!
✅ Clases guardadas: 5
🤖 Estado de distribución: La distribución de aulas se está procesando automáticamente
```

### En la Base de Datos:

```sql
SELECT 
  c.codigo_materia,
  c.nombre_materia,
  c.numero_estudiantes,
  a.nombre as aula,
  a.capacidad,
  c.horario_dia,
  c.horario_inicio || ' - ' || c.horario_fin as horario
FROM clases c
LEFT JOIN aulas a ON a.id = c.aula_asignada
WHERE c.carrera_id = 1
ORDER BY c.nivel, c.codigo_materia;
```

**Resultado:**
```
 codigo | nombre_materia         | estudiantes | aula      | capacidad | dia       | horario
--------|------------------------|-------------|-----------|-----------|-----------|------------
 DER101 | Introducción Derecho   | 45          | Aula 301  | 50        | Lunes     | 08:00-10:00
 DER102 | Derecho Romano         | 40          | Aula 205  | 45        | Martes    | 08:00-10:00
 DER103 | Derecho Constitucional | 38          | Aula 107  | 40        | Miércoles | 08:00-10:00
```

---

## 🔧 COMANDOS ÚTILES

### Verificar Backend:
```powershell
docker logs gestion_aulas_backend --tail 30
```

### Verificar N8N:
```powershell
docker logs gestion_aulas_n8n --tail 30
```

### Ver todas las clases:
```powershell
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT COUNT(*) as total, COUNT(aula_asignada) as asignadas FROM clases;"
```

### Limpiar clases para re-probar:
```powershell
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "DELETE FROM clases WHERE carrera_id = 1;"
```

---

## ⚠️ NOTAS IMPORTANTES

### 1. Sobre N8N:
- Si n8n no está configurado, el sistema seguirá funcionando
- Las clases se guardarán pero quedarán en estado "pendiente"
- Se puede ejecutar la distribución manualmente después

### 2. Sobre Roles:
- Solo **directores** y **admin** pueden subir planificaciones
- Cada director solo ve y sube planificación de SU carrera
- Admin puede ver y gestionar TODAS las carreras

### 3. Sobre Conflictos:
- El sistema detecta automáticamente conflictos de horarios
- Un conflicto ocurre cuando dos clases quieren la misma aula en el mismo horario
- Los conflictos se resuelven manualmente por el admin

---

## 📞 SOPORTE

Si algo no funciona:

1. **Verificar logs del backend:**
```powershell
docker logs gestion_aulas_backend --tail 50
```

2. **Verificar estado de n8n:**
```powershell
docker ps | Select-String "n8n"
curl http://localhost:5678/healthz
```

3. **Verificar base de datos:**
```sql
SELECT * FROM planificaciones_subidas ORDER BY fecha_subida DESC LIMIT 5;
SELECT COUNT(*), estado FROM clases GROUP BY estado;
```

---

**🎯 ¡Sistema listo para distribución automática de aulas!**

---

**Última actualización:** 26 de Enero 2026, 21:52  
**Estado:** ✅ BACKEND COMPLETO - N8N PENDIENTE  
**Siguiente:** Configurar N8N y probar distribución
