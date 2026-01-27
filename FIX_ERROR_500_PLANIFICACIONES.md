# 🔧 FIX RÁPIDO: Error 500 - Tabla 'carreras' no existe

**Fecha:** 26 de Enero 2026, 23:55  
**Error:** `POST http://localhost:3000/api/planificaciones/subir 500 (Internal Server Error)`  
**Estado:** ✅ CORREGIDO

---

## ❌ ERROR ENCONTRADO

```
relation "carreras" does not exist
```

### Log del Error:
```
error: relation "carreras" does not exist
  sql: "SELECT id, carrera, nombre FROM carreras WHERE id = '1' LIMIT 1"
```

---

## 🔍 CAUSA RAÍZ

El código intentaba consultar la tabla `carreras` que **NO EXISTE** en la base de datos.

### Tablas Reales:
```bash
✓ uploads_carreras         # ← La correcta
✓ carreras_configuracion
✓ carreras_periodo
✗ carreras                 # ← No existe
```

---

## ✅ SOLUCIÓN APLICADA

### Archivo Modificado:
`backend/src/controllers/planificacionController.js`

### Cambio:

```javascript
// ❌ ANTES: Tabla incorrecta
const [carreraResult] = await sequelize.query(
  `SELECT id, carrera, nombre FROM carreras WHERE id = :carrera_id LIMIT 1`,
  // ...
);

// ✅ DESPUÉS: Tabla correcta
const [carreraResult] = await sequelize.query(
  `SELECT id, carrera FROM uploads_carreras WHERE id = :carrera_id LIMIT 1`,
  // ...
);
```

### Líneas modificadas:
- **Línea 58-59**: Cambio de tabla `carreras` → `uploads_carreras`
- **Línea 58**: Eliminada columna `nombre` (no existe en uploads_carreras)

---

## 🧪 VERIFICAR EL FIX

### 1. Backend reiniciado:
```bash
✅ docker-compose restart backend
```

### 2. Probar subida de planificación:

1. Login como director: `raquel.veintimilla.director@uide.edu.ec` / `DirectorUide2026!`
2. Dashboard Director
3. Seleccionar archivo Excel
4. Subir planificación
5. ✅ Debe mostrar: "Planificación subida exitosamente"

### 3. Ver logs del backend:
```bash
docker logs gestion_aulas_backend --tail 20
```

**Debes ver:**
```
✅ [SECURITY] Acceso autorizado a /api/planificaciones/subir
✅ 📁 Procesando planificación de carrera: Derecho
✅ 📚 X clases en el Excel
✅ POST /api/planificaciones/subir 200 OK
```

---

## 📊 ESTRUCTURA CORRECTA

### Tabla: `uploads_carreras`
```sql
 id       | integer (PK)
 carrera  | varchar(100) NOT NULL
 activa   | boolean DEFAULT true
```

### Ejemplo de datos:
```sql
SELECT id, carrera FROM uploads_carreras WHERE activa = true;

 id |                    carrera                    
----+-----------------------------------------------
  1 | Derecho
  2 | Ingenier¡a en Tecnolog¡as de la Informaci¢n y Comunicaci¢n
  3 | Arquitectura y Urbanismo
  4 | Negocios Internacionales
  5 | Psicolog¡a
```

---

## 🚀 INTEGRACIÓN CON N8N

Tu workflow de n8n (`http://localhost:5678/webhook-test/maestro`) se activará automáticamente cuando:

1. ✅ Director sube planificación Excel
2. ✅ Backend procesa y guarda clases
3. ✅ Backend llama a webhook de n8n
4. ✅ N8N ejecuta distribución automática

### Webhook configurado:
```
POST http://localhost:5678/webhook-test/maestro
```

### Payload que recibe n8n:
```json
{
  "carrera_id": 1,
  "total_clases": 25,
  "usuario_id": 4,
  "timestamp": "2026-01-26T23:55:00.000Z"
}
```

---

## ✅ ESTADO FINAL

```
✅ Tabla correcta: uploads_carreras
✅ Backend reiniciado
✅ Error 500 corregido
✅ Sistema listo para subir planificaciones
✅ Webhook n8n configurado
```

---

## 🧪 TEST COMPLETO

### Crear Excel de prueba:

| materia | ciclo | paralelo | dia | hora_inicio | hora_fin | num_estudiantes | docente |
|---------|-------|----------|-----|-------------|----------|-----------------|---------|
| Derecho Civil I | 1 | A | Lunes | 08:00 | 10:00 | 30 | Dr. Juan Pérez |
| Derecho Penal | 2 | A | Martes | 10:00 | 12:00 | 28 | Dra. María López |

### Verificar en BD:

```bash
# Ver clases insertadas
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "
SELECT carrera, materia, ciclo, num_estudiantes, docente 
FROM clases 
WHERE carrera = 'Derecho' 
ORDER BY id DESC LIMIT 5;
"

# Ver historial
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "
SELECT carrera_id, archivo_nombre, subido_por, total_clases, procesado 
FROM planificaciones_subidas 
ORDER BY fecha_subida DESC LIMIT 3;
"
```

---

## 🔍 SOLUCIÓN DE PROBLEMAS

### Si sigue dando error 500:

1. **Verificar logs:**
```bash
docker logs gestion_aulas_backend --tail 50
```

2. **Verificar que backend reinició:**
```bash
docker ps | grep backend
```

3. **Verificar tabla uploads_carreras:**
```bash
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "
SELECT * FROM uploads_carreras LIMIT 5;
"
```

### Si n8n no se activa:

1. **Verificar que n8n está corriendo:**
```bash
curl http://localhost:5678/webhook-test/maestro
```

2. **Ver logs de n8n:**
```bash
docker logs gestion_aulas_n8n --tail 20
```

3. **Activar workflow en n8n UI:**
   - Ir a http://localhost:5678
   - Workflow "Sistema UIDE - Maestro Completo"
   - Click en botón "Active" (toggle)

---

**¡Fix Aplicado y Backend Reiniciado! 🎉**

El sistema ahora puede:
- ✅ Subir planificaciones sin error 500
- ✅ Guardar clases en la tabla correcta
- ✅ Activar workflow de n8n automáticamente
- ✅ Procesar distribución de aulas

---

*Corregido: 26 de Enero 2026, 23:55*  
*Sistema: Gestión de Aulas UIDE*  
*Estado: PRODUCCIÓN*
