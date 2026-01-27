# 🤖 ACTIVAR N8N - Paso a Paso

## 🎯 OBJETIVO
Activar el workflow de N8N para que la distribución automática funcione cuando subes una planificación.

---

## ✅ ESTADO ACTUAL

```
🟢 N8N: CORRIENDO (http://localhost:5678)
🔴 WEBHOOK: NO REGISTRADO
   Error: "The requested webhook 'POST maestro' is not registered"
   Causa: Workflow no está importado o no está activo
```

---

## 📋 PASOS PARA ACTIVAR

### PASO 1: Acceder a N8N (1 min)

1. Abrir navegador
2. Ir a: **http://localhost:5678**
3. Si es primera vez, crear cuenta:
   - Email: `admin@uide.edu.ec`
   - Password: `admin123` (o el que prefieras)
   - Click "Get Started"

---

### PASO 2: Importar Workflow (2 min)

1. En el menú izquierdo, click en **"Workflows"**
2. Click en botón **"Add workflow"** (arriba derecha)
3. En el menú que se abre, click en: **"Import from file"**
4. Navegar a: `n8n/workflows/workflow_maestro_FINAL.json`
5. Seleccionar el archivo
6. Click **"Open"** o **"Import"**
7. El workflow se abrirá en el editor

**Deberías ver:**
- Varios nodos conectados
- Un nodo "Webhook" al inicio
- Nodos de PostgreSQL
- Nodos de lógica (Function, IF, etc.)

---

### PASO 3: Configurar Credenciales de PostgreSQL (3 min)

1. Click en cualquier nodo **"Postgres"** (hay varios)
2. En el panel derecho, busca **"Credential to connect with"**
3. Click en el dropdown
4. Click en **"Create New Credential"**
5. Llenar los datos:

```
Name: PostgreSQL UIDE
Host: db
Database: gestion_aulas
User: postgres
Password: [revisar en backend/.env - DB_PASSWORD]
Port: 5432
SSL: Disable
```

6. Click **"Save"**
7. Seleccionar esta credencial en TODOS los nodos PostgreSQL del workflow

**Tip:** Haz click en cada nodo PostgreSQL y asigna la misma credencial

---

### PASO 4: Verificar el Webhook (1 min)

1. Click en el nodo **"Webhook"** (primer nodo del workflow)
2. En el panel derecho, verificar:
   ```
   HTTP Method: POST
   Path: maestro
   ```
3. La URL completa debe ser: `http://localhost:5678/webhook/maestro`

**Esto es lo que el backend va a llamar.**

---

### PASO 5: ACTIVAR EL WORKFLOW (1 min) ⭐

1. Busca el toggle **"Active"** (arriba a la derecha del editor)
2. Click para activarlo
3. Debe cambiar a **verde** y decir **"Active"**
4. Click en **"Save"** (botón al lado)

**MUY IMPORTANTE:** El workflow DEBE estar en estado "Active" para que funcione.

---

### PASO 6: Verificar que Funciona (2 min)

#### A. Desde PowerShell:
```powershell
Invoke-WebRequest -Uri "http://localhost:5678/webhook/maestro" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"accion": "obtener_estado"}' `
  -UseBasicParsing
```

**Respuesta esperada:**
```json
{
  "success": true,
  "mensaje": "Webhook funcionando"
}
```

**Si ves error 404:** El workflow no está activo. Vuelve al PASO 5.

#### B. Ver en N8N:
1. En el menú izquierdo, click en **"Executions"**
2. Deberías ver una ejecución reciente
3. Click en ella para ver detalles
4. Debe mostrar "Success" en verde

---

## ✅ VERIFICACIÓN FINAL

Una vez activado, prueba el flujo completo:

### 1. Crear Excel de Prueba:

Crear archivo `test_planificacion.xlsx` con:

| codigo_materia | nombre_materia | nivel | paralelo | numero_estudiantes | horario_dia | horario_inicio | horario_fin | docente |
|---|---|---|---|---|---|---|---|---|
| TEST101 | Materia de Prueba | 1 | A | 30 | Lunes | 08:00 | 10:00 | Dr. Test |

### 2. Subir desde Postman:

```bash
POST http://localhost:3000/api/planificaciones/subir

Headers:
Authorization: Bearer [obtener con login]

Body (form-data):
archivo: test_planificacion.xlsx
carrera_id: 1
```

### 3. Verificar en BD:

```powershell
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "
SELECT 
  codigo_materia, 
  nombre_materia, 
  estado, 
  aula_asignada,
  horario_dia
FROM clases 
WHERE codigo_materia = 'TEST101';
"
```

**Deberías ver:**
```
 codigo_materia | nombre_materia    | estado   | aula_asignada | horario_dia 
----------------|-------------------|----------|---------------|-------------
 TEST101        | Materia de Prueba | asignada | 3             | Lunes
```

✅ Si `estado = 'asignada'` y `aula_asignada` tiene un número → **¡FUNCIONA!**

### 4. Ver en N8N:

1. Ir a: http://localhost:5678
2. Click en **"Executions"**
3. Deberías ver una nueva ejecución
4. Click en ella
5. Ver que todos los nodos se ejecutaron (verde)

---

## 🔧 TROUBLESHOOTING

### Error: "Workflow not found"
**Solución:** El workflow no se importó correctamente. Repite el PASO 2.

### Error: "PostgreSQL connection failed"
**Solución:** 
1. Verifica las credenciales
2. Asegúrate de usar `Host: db` (no localhost)
3. Verifica el password en backend/.env

### Error: "Webhook still returns 404"
**Solución:**
1. Verifica que el workflow esté **Active** (toggle verde)
2. Guarda el workflow después de activarlo
3. Recarga la página de n8n
4. Verifica en "Executions" que no haya errores

### El webhook funciona pero no asigna aulas
**Solución:**
1. Verifica que haya aulas en la tabla `aulas`
2. Verifica que las aulas tengan capacidad suficiente
3. Revisa los logs de n8n en la ejecución

---

## 📚 DOCUMENTACIÓN RELACIONADA

- `SISTEMA_DISTRIBUCION_AUTOMATICA.md` - Flujo completo del sistema
- `INSTRUCCIONES_FINALES_DISTRIBUCION.md` - Guía de implementación
- `RESUMEN_EJECUTIVO_FINAL.md` - Estado general del proyecto

---

## ✅ CHECKLIST FINAL

- [ ] Accediste a http://localhost:5678
- [ ] Importaste `workflow_maestro_FINAL.json`
- [ ] Configuraste credenciales de PostgreSQL en todos los nodos
- [ ] Activaste el workflow (toggle verde)
- [ ] Guardaste el workflow
- [ ] Probaste el webhook con PowerShell
- [ ] Verificaste que responde (no da 404)
- [ ] Subiste una planificación de prueba
- [ ] Verificaste en BD que se asignaron aulas
- [ ] Viste la ejecución en N8N Executions

---

**🎉 Una vez completados estos pasos, ¡el sistema estará 100% funcionando!**

---

**⏱️ Tiempo estimado:** 10 minutos  
**🎯 Resultado:** Distribución automática de aulas funcionando completamente
