# ⚡ QUICK START - 15 Minutos para Sistema Completo

## 🎯 OBJETIVO
Pasar de 90% → 100% en 15 minutos

---

## ✅ LO QUE YA TIENES (No tocar)

```
🟢 Backend funcionando en http://localhost:3000
🟢 N8N corriendo en http://localhost:5678
🟢 PostgreSQL con 1,127 estudiantes
🟢 Código completo y probado
```

---

## 🚀 LO QUE FALTA (Solo 3 cosas)

### 1️⃣ ACTIVAR N8N (10 minutos)

#### A. Abrir N8N
```
http://localhost:5678
```

#### B. Importar Workflow
1. Click **"Workflows"** (menú izquierdo)
2. Click **"Add workflow"** → **"Import from file"**
3. Buscar: `n8n/workflows/workflow_maestro_FINAL.json`
4. Click **"Import"**

#### C. Configurar PostgreSQL
1. Click en cualquier nodo **"Postgres"** (azul)
2. Click **"Credential to connect with"** → **"Create New"**
3. Llenar:
   ```
   Name: PostgreSQL UIDE
   Host: db
   Port: 5432
   Database: gestion_aulas
   User: postgres
   Password: postgres
   SSL: Disable
   ```
4. Click **"Save"**
5. Asignar esta credencial a TODOS los nodos PostgreSQL

#### D. Activar Workflow
1. Toggle **"Active"** (arriba derecha) → debe estar VERDE
2. Click **"Save"**

#### E. Verificar
```powershell
Invoke-WebRequest -Uri "http://localhost:5678/webhook/maestro" -Method POST -UseBasicParsing
```
✅ Si responde → FUNCIONA
❌ Si da 404 → Workflow no está activo

---

### 2️⃣ CREAR EXCEL DE PRUEBA (2 minutos)

#### Opción A: Copiar y Pegar (Más fácil)

1. Abrir Excel nuevo
2. Copiar esto COMPLETO (con Tab entre columnas):

```
codigo_materia	nombre_materia	nivel	paralelo	numero_estudiantes	horario_dia	horario_inicio	horario_fin	docente
TEST101	Materia de Prueba 1	1	A	30	Lunes	08:00	10:00	Prof. Test
TEST102	Materia de Prueba 2	1	A	25	Martes	10:00	12:00	Prof. Test
TEST103	Materia de Prueba 3	1	B	35	Miércoles	14:00	16:00	Prof. Test
```

3. Pegar en celda A1 (Ctrl+V)
4. Guardar como: `planificacion_PRUEBA_RAPIDA.xlsx`
5. Ubicación: Carpeta del proyecto

#### Opción B: Escribir Manual

**Fila 1 (Headers):**
| codigo_materia | nombre_materia | nivel | paralelo | numero_estudiantes | horario_dia | horario_inicio | horario_fin | docente |

**Fila 2:**
| TEST101 | Materia de Prueba 1 | 1 | A | 30 | Lunes | 08:00 | 10:00 | Prof. Test |

**Fila 3:**
| TEST102 | Materia de Prueba 2 | 1 | A | 25 | Martes | 10:00 | 12:00 | Prof. Test |

**Fila 4:**
| TEST103 | Materia de Prueba 3 | 1 | B | 35 | Miércoles | 14:00 | 16:00 | Prof. Test |

---

### 3️⃣ PROBAR (3 minutos)

#### A. Obtener Token

**En Postman:**
```
POST http://localhost:3000/api/auth/login

Body (JSON):
{
  "email": "admin@uide.edu.ec",
  "password": "admin123"
}
```

**Copiar el `token` de la respuesta**

#### B. Subir Planificación

**En Postman:**
```
POST http://localhost:3000/api/planificaciones/subir

Headers:
Authorization: Bearer [pegar_token_aquí]

Body (form-data):
- Key: archivo    Type: File    Value: [seleccionar planificacion_PRUEBA_RAPIDA.xlsx]
- Key: carrera_id Type: Text    Value: 1
```

**Click SEND**

#### C. Ver Resultado

**Respuesta esperada:**
```json
{
  "success": true,
  "mensaje": "Planificación subida. Distribución automática en progreso...",
  "resultado": {
    "clases_guardadas": 3,
    "distribucion": {
      "estado": "en_progreso"
    }
  }
}
```

✅ **"en_progreso"** → N8N está funcionando (¡PERFECTO!)
⚠️ **"pendiente"** → N8N no está activo (vuelve al paso 1)

#### D. Verificar en BD

```powershell
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT codigo_materia, nombre_materia, estado, aula_asignada FROM clases WHERE codigo_materia LIKE 'TEST%';"
```

**Deberías ver:**
```
 codigo_materia | nombre_materia      | estado   | aula_asignada 
----------------|---------------------|----------|---------------
 TEST101        | Materia de Prueba 1 | asignada | 3
 TEST102        | Materia de Prueba 2 | asignada | 5
 TEST103        | Materia de Prueba 3 | asignada | 7
```

✅ **estado = 'asignada'** y **aula_asignada tiene número** → ¡FUNCIONA!

---

## 🎉 ¡LISTO!

Si llegaste aquí y todo funcionó:

```
✅ Sistema de distribución automática funcionando
✅ Backend procesando planificaciones
✅ N8N asignando aulas inteligentemente
✅ Base de datos actualizada
```

---

## 📊 CHECKLIST RÁPIDO

- [ ] N8N abierto en http://localhost:5678
- [ ] Workflow importado
- [ ] Credencial PostgreSQL configurada (host: db)
- [ ] Workflow ACTIVO (toggle verde)
- [ ] Excel de prueba creado
- [ ] Token obtenido con login
- [ ] Planificación subida
- [ ] Respuesta dice "en_progreso"
- [ ] BD muestra estado='asignada'
- [ ] aula_asignada tiene número

---

## 🔧 SI ALGO NO FUNCIONA

### Problema: Webhook da 404
**Solución:** Workflow no está activo
```
1. Ir a http://localhost:5678
2. Abrir el workflow
3. Toggle "Active" debe estar VERDE
4. Click "Save"
```

### Problema: PostgreSQL connection failed
**Solución:** Host incorrecto
```
En credencial de n8n:
Host: db (NO localhost)
```

### Problema: No hay aulas disponibles
**Solución:** Crear algunas aulas
```powershell
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT COUNT(*) FROM aulas;"
```
Si es 0, necesitas crear aulas primero

### Problema: Token inválido
**Solución:** Hacer login de nuevo
```
POST http://localhost:3000/api/auth/login
Body: {"email":"admin@uide.edu.ec","password":"admin123"}
```

---

## 📚 DOCUMENTACIÓN COMPLETA

Si quieres más detalles:

- **`ACTIVAR_N8N_PASO_A_PASO.md`** - Guía detallada de N8N
- **`SISTEMA_DISTRIBUCION_AUTOMATICA.md`** - Flujo completo del sistema
- **`RESUMEN_FINAL_IMPLEMENTACION.md`** - Estado completo del proyecto

---

## 🎯 PRÓXIMOS PASOS (Opcional)

1. **Integrar en Frontend:**
   ```typescript
   // En App.tsx
   import SubirPlanificacion from './components/director/SubirPlanificacion';
   <Route path="/director/planificacion" element={<SubirPlanificacion />} />
   ```

2. **Usar con planificación real:**
   - Crear Excel con tu planificación completa
   - Subir desde el frontend
   - Ver distribución en tiempo real

3. **Personalizar algoritmo:**
   - Ajustar preferencias de aulas
   - Modificar prioridades
   - Agregar reglas específicas

---

**⏱️ Tiempo total:** 15 minutos  
**🎯 Resultado:** Sistema 100% funcionando  
**📌 Última actualización:** 26 de Enero 2026
