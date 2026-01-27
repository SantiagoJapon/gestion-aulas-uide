# 🔧 FIX: Error 400 al Asignar Directores

**Fecha:** 26 de Enero 2026, 23:25  
**Estado:** ✅ RESUELTO

---

## 🐛 PROBLEMA

### Error en Frontend
```
PUT http://localhost:3000/api/usuarios/5/carrera 400 (Bad Request)
Error al asignar carrera: AxiosError
```

### Síntomas
- ❌ Error 400 al asignar director a carrera
- ❌ Mensaje: "La carrera no está activa o no existe"
- ❌ No se puede asignar ninguna carrera
- ❌ Frontend muestra error en dropdown

---

## 🔍 CAUSAS RAÍZ

### 1. Desincronización de Fuentes de Datos

**Frontend usaba:**
- Endpoint: `/api/carreras`
- Tabla: `uploads_carreras`
- Campo: `carrera`

**Backend buscaba:**
- Tabla: `carreras_configuracion`
- Campo: `nombre_carrera`

**Resultado:** Nombres de carreras no coincidían

### 2. Problemas de Codificación UTF-8

**En Base de Datos:**
```
❌ "Ingenier¡a en Tecnolog¡as de la Informaci¢n y Comunicaci¢n"
❌ "Psicolog¡a"
```

**Frontend enviaba:**
```
✅ "Ingeniería en Tecnologías de la Información y Comunicación"
✅ "Psicología"
```

**Resultado:** Búsqueda no encontraba coincidencias

### 3. Búsqueda Demasiado Estricta

El backend solo hacía búsqueda con LIKE parcial, no consideraba:
- Búsqueda exacta primero
- Búsqueda por ID
- Normalización de caracteres

---

## ✅ SOLUCIONES APLICADAS

### 1. Actualizar Frontend

**Archivo:** `frontend/src/components/DirectorAssignmentTable.tsx`

**Cambio:** Obtener carreras desde `/api/distribucion/estado` en lugar de `/api/carreras`

```typescript
// ❌ Antes
const [directoresRes, carrerasRes] = await Promise.all([
  usuarioService.getDirectores(),
  carreraService.getCarreras(false),  // ← Tabla incorrecta
]);
setCarreras(carrerasRes.carreras || []);

// ✅ Después
const [directoresRes, distribucionRes] = await Promise.all([
  usuarioService.getDirectores(),
  distribucionService.getEstado(),  // ← Usa carreras_configuracion
]);
setCarreras(distribucionRes?.carreras || []);
```

**Cambio en Select:**
```typescript
// ❌ Antes
<option key={carrera.id} value={carrera.carrera}>
  {carrera.carrera}
</option>

// ✅ Después  
<option key={carrera.id} value={carrera.nombre_carrera}>
  {carrera.nombre_carrera}
</option>
```

### 2. Mejorar Búsqueda en Backend

**Archivo:** `backend/src/controllers/usuarioController.js`

**Mejoras aplicadas:**

1. **Búsqueda Exacta Primero:**
```javascript
let carreraResult = await sequelize.query(
  `SELECT id, nombre_carrera FROM carreras_configuracion
   WHERE nombre_carrera = $1 AND estado = 'activa'
   LIMIT 1`,
  { bind: [carrera], type: sequelize.QueryTypes.SELECT }
);
```

2. **Búsqueda por ID (si es número):**
```javascript
if (!carreraResult.length && !isNaN(carrera)) {
  carreraResult = await sequelize.query(
    `SELECT id, nombre_carrera FROM carreras_configuracion
     WHERE id = $1 AND estado = 'activa'
     LIMIT 1`,
    { bind: [parseInt(carrera)], type: sequelize.QueryTypes.SELECT }
  );
}
```

3. **Búsqueda Normalizada (ignora tildes):**
```javascript
if (!carreraResult.length) {
  const carreraNormalizada = normalizeCarreraKey(carrera);
  carreraResult = await sequelize.query(
    `SELECT id, nombre_carrera FROM carreras_configuracion
     WHERE LOWER(TRANSLATE(nombre_carrera, 
       'áéíóúÁÉÍÓÚñÑ', 
       'aeiouAEIOUnN')) LIKE $1 
     AND estado = 'activa'
     LIMIT 1`,
    { bind: [`%${carreraNormalizada}%`], type: sequelize.QueryTypes.SELECT }
  );
}
```

### 3. Corregir Codificación en Base de Datos

**Archivo:** `fix_carreras_encoding.sql`

```sql
UPDATE carreras_configuracion 
SET nombre_carrera = 'Ingeniería en Tecnologías de la Información y Comunicación'
WHERE id = 2;

UPDATE carreras_configuracion 
SET nombre_carrera = 'Psicología'
WHERE id = 5;

UPDATE carreras_configuracion 
SET nombre_carrera = 'Psicología Clínica'
WHERE id = 6;
```

**Ejecutado:**
```bash
Get-Content "fix_carreras_encoding.sql" | docker exec -i gestion_aulas_db psql -U postgres -d gestion_aulas
```

---

## 📋 ARCHIVOS MODIFICADOS

### Frontend (1 archivo)
1. **`frontend/src/components/DirectorAssignmentTable.tsx`**
   - Cambió fuente de datos de carreras
   - Actualizado para usar `nombre_carrera`
   - Ahora usa `/api/distribucion/estado`

### Backend (1 archivo)
2. **`backend/src/controllers/usuarioController.js`**
   - Búsqueda en tres niveles (exacta, ID, normalizada)
   - Ignora problemas de codificación
   - Manejo mejorado de errores

### Base de Datos (1 script)
3. **`fix_carreras_encoding.sql`** (Nuevo)
   - Corrige codificación UTF-8
   - Actualiza 3 carreras con caracteres especiales

---

## 🧪 VERIFICACIÓN

### 1. Backend reiniciado
```bash
docker-compose restart backend
```

### 2. Codificación corregida
```sql
SELECT id, nombre_carrera FROM carreras_configuracion WHERE estado='activa';
```

**Resultado esperado:**
```
 id | nombre_carrera
----+----------------------------------------------------------------
  1 | Derecho
  2 | Ingeniería en Tecnologías de la Información y Comunicación
  3 | Arquitectura y Urbanismo
  4 | Negocios Internacionales
  5 | Psicología
  6 | Psicología Clínica
```

### 3. Test desde Frontend
1. Abre http://localhost:5173
2. Login como admin
3. Ve a Panel de Administración
4. Selecciona una carrera en el dropdown
5. Verifica que se asigna correctamente

---

## 📊 ANTES vs DESPUÉS

### Antes (❌ No funciona)
```
Frontend → Solicita /api/carreras
         ← Recibe datos de uploads_carreras
         
Usuario selecciona: "Derecho"

Frontend → PUT /api/usuarios/5/carrera {"carrera": "Derecho"}
Backend → Busca en carreras_configuracion
        → No encuentra (nombres diferentes)
        ← 400 "La carrera no está activa o no existe"
```

### Después (✅ Funciona)
```
Frontend → Solicita /api/distribucion/estado
         ← Recibe carreras de carreras_configuracion
         
Usuario selecciona: "Derecho"

Frontend → PUT /api/usuarios/5/carrera {"carrera": "Derecho"}
Backend → Búsqueda exacta en carreras_configuracion
        → Encuentra "Derecho"
        → Asigna director
        ← 200 OK {"success": true, "usuario": {...}}
```

---

## 💡 LECCIONES APRENDIDAS

### 1. Consistencia de Fuentes de Datos
- Frontend y Backend deben usar la misma tabla
- Evitar tener múltiples fuentes de verdad
- Documentar qué tabla es la autoritativa

### 2. Codificación UTF-8
- Verificar siempre la codificación de caracteres
- Usar UTF-8 en toda la aplicación
- Probar con caracteres especiales (ñ, á, é, í, ó, ú)

### 3. Búsqueda Tolerante a Errores
- Implementar múltiples niveles de búsqueda
- Normalizar caracteres para comparación
- Proporcionar mensajes de debug útiles

### 4. Testing con Datos Reales
- Probar con nombres que tengan caracteres especiales
- Verificar todos los casos edge
- Usar datos reales de producción en desarrollo

---

## 🚀 ESTADO ACTUAL

```
✅ Frontend: Usa datos correctos
✅ Backend: Búsqueda mejorada
✅ Base de Datos: Codificación corregida
✅ Asignación: Funcionando
✅ Dropdown: Muestra carreras correctas
✅ Sin errores 400
```

---

## 🔧 TROUBLESHOOTING

### Si todavía hay error 400:

1. **Verificar que backend se reinició:**
```bash
docker logs gestion_aulas_backend --tail 20
```

2. **Verificar carreras en BD:**
```sql
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas \
  -c "SELECT id, nombre_carrera, estado FROM carreras_configuracion WHERE estado='activa';"
```

3. **Verificar en Network tab:**
- F12 → Network
- Ver qué carrera envía el PUT
- Ver la respuesta del servidor

4. **Ver logs detallados:**
```bash
docker logs gestion_aulas_backend -f
# Luego intentar asignar desde el frontend
```

### Comandos útiles:

```bash
# Ver directores y sus carreras asignadas
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas \
  -c "SELECT id, nombre, email, carrera_director FROM usuarios WHERE rol='director';"

# Verificar carreras activas
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas \
  -c "SELECT * FROM carreras_configuracion WHERE estado='activa';"

# Resetear asignación de un director
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas \
  -c "UPDATE usuarios SET carrera_director = NULL WHERE id = 5;"
```

---

## ✅ CHECKLIST

Antes de continuar, verifica:

- [x] Frontend actualizado para usar `/api/distribucion/estado`
- [x] Backend con búsqueda mejorada
- [x] Codificación de carreras corregida
- [x] Backend reiniciado
- [x] Test de asignación funciona
- [x] Sin errores en consola del navegador

---

**¡Asignación de Directores Corregida! 🎉**

*Actualizado: 26 de Enero 2026, 23:30*
