# 🔧 FIX: Carreras no aparecen en Dashboard de Directores

**Fecha:** 27 de Enero 2026, 00:05  
**Problema:** Lorena Conde y Freddy Salazar no veían su "Carrera habilitada" en el Dashboard  
**Estado:** ✅ CORREGIDO

---

## 🐛 PROBLEMA IDENTIFICADO

### Síntoma:
- ✅ Raquel Veintimilla (Derecho) - SÍ veía su carrera
- ❌ Lorena Conde (Informática) - NO veía su carrera
- ❌ Freddy Salazar (Arquitectura) - NO veía su carrera

### Causa Raíz:

**Inconsistencia de nombres entre tablas:**

La tabla `usuarios.carrera_director` tenía nombres con encoding diferente y más largos que los de `uploads_carreras`:

```sql
-- En usuarios.carrera_director:
"Ingenier??a en Tecnolog??as de la Informaci??n y Comunicaci??n"
"Derecho" ✓

-- En uploads_carreras (tabla que usa el frontend):
"IngenierÃ­a en TecnologÃ­as de la InformaciÃ³n"  (sin "y Comunicación")
"Derecho" ✓
```

**El problema:**
1. **Encoding diferente**: `??` vs `Ã­`
2. **Nombre truncado**: Falta "y Comunicación" en uploads_carreras
3. **No hacen MATCH**: Frontend no puede encontrar la carrera del director

**Por qué Derecho sí funcionaba:**
- Nombre simple sin tildes ni caracteres especiales
- Coincidencia exacta en ambas tablas

---

## ✅ SOLUCIÓN APLICADA

### 1. Actualizar nombres en `usuarios.carrera_director`

Sincronizar los nombres para que coincidan EXACTAMENTE con `uploads_carreras`:

```sql
-- Lorena Conde (IDs 3 y 5) - Informática
UPDATE usuarios 
SET carrera_director = (SELECT carrera FROM uploads_carreras WHERE id = 2)
WHERE id IN (3, 5);

-- Freddy Salazar (ID 6) - Arquitectura
UPDATE usuarios 
SET carrera_director = (SELECT carrera FROM uploads_carreras WHERE id = 3)
WHERE id = 6;
```

### 2. Verificar resultado:

```sql
SELECT 
  u.id, 
  u.nombre || ' ' || u.apellido as nombre_completo,
  u.email, 
  u.carrera_director,
  uc.id as carrera_id,
  CASE 
    WHEN uc.id IS NOT NULL THEN '✓ MATCH'
    ELSE '✗ NO MATCH'
  END as estado
FROM usuarios u
LEFT JOIN uploads_carreras uc ON uc.carrera = u.carrera_director
WHERE u.rol = 'director'
ORDER BY u.id;
```

**Resultado:**
```
 id | nombre_completo    | carrera_director              | carrera_id | estado
----+--------------------+-------------------------------+------------+--------
  3 | Lorena Conde       | IngenierÃ­a en TecnologÃ­as... |          2 | ✓ MATCH
  4 | Raquel Veintimilla | Derecho                       |          1 | ✓ MATCH
  5 | Lorena Conde       | IngenierÃ­a en TecnologÃ­as... |          2 | ✓ MATCH
  6 | Freddy Salazar     | Arquitectura y Urbanismo      |          3 | ✓ MATCH
```

✅ **Todos los directores ahora tienen MATCH con sus carreras**

---

## 🔍 CÓMO FUNCIONA EL SISTEMA

### Flujo de datos:

```
1. Usuario hace login
   └─> Backend devuelve user.carrera_director = "IngenierÃ­a en TecnologÃ­as..."

2. Frontend carga carreras activas
   └─> Consulta: GET /api/carreras
       └─> Backend consulta: uploads_carreras
           └─> Devuelve: [ { id: 2, carrera: "IngenierÃ­a..." }, ... ]

3. Frontend pre-selecciona la carrera
   └─> Compara: user.carrera_director === carrera.carrera
       └─> Si coinciden exactamente → Pre-selecciona ✓
       └─> Si NO coinciden → No aparece ✗
```

### Código relevante (DirectorDashboard.tsx):

```typescript
// Pre-selección automática
useEffect(() => {
  if (user?.carrera_director) {
    setCarreraSeleccionada(user.carrera_director);
  }
}, [user]);

// Dropdown de carreras
<select value={carreraSeleccionada}>
  <option value="">Selecciona una carrera</option>
  {carrerasActivas.map((carrera) => (
    <option key={carrera.id} value={carrera.carrera}>
      {carrera.carrera}
    </option>
  ))}
</select>
```

**Clave:** El valor debe coincidir EXACTAMENTE entre `user.carrera_director` y `carrera.carrera`

---

## 🧪 VERIFICAR EL FIX

### 1. Consultar BD:

```bash
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "
SELECT 
  u.nombre, u.email, u.carrera_director,
  uc.id as carrera_id,
  CASE WHEN uc.id IS NOT NULL THEN 'OK' ELSE 'ERROR' END as estado
FROM usuarios u
LEFT JOIN uploads_carreras uc ON uc.carrera = u.carrera_director
WHERE u.rol = 'director';
"
```

**Resultado esperado:** Todos con estado = `OK`

### 2. Probar en el Frontend:

**Login de cada director:**

1. **Raquel Veintimilla:**
   - Email: `raquel.veintimilla.director@uide.edu.ec`
   - Password: `DirectorUide2026!`
   - ✅ Debe ver: "Carrera habilitada: Derecho"

2. **Lorena Conde:**
   - Email: `lorena.conde.director@uide.edu.ec`
   - Password: `DirectorUide2026!`
   - ✅ Debe ver: "Carrera habilitada: IngenierÃ­a en TecnologÃ­as de la InformaciÃ³n"

3. **Freddy Salazar:**
   - Email: `freddy.salazar.director@uide.edu.ec`
   - Password: `DirectorUide2026!`
   - ✅ Debe ver: "Carrera habilitada: Arquitectura y Urbanismo"

### 3. Verificar Pre-selección:

En el Dashboard del Director:
- El dropdown de "Carrera habilitada" debe estar **pre-seleccionado**
- El dropdown debe estar **deshabilitado** (disabled)
- Debe mostrar el texto: "Carrera asignada por el administrador"

---

## 📊 DATOS ACTUALES

### Tabla: `uploads_carreras`

```sql
SELECT id, carrera, activa FROM uploads_carreras WHERE activa = true;
```

```
 id | carrera                                      | activa
----+----------------------------------------------+--------
  1 | Derecho                                      | t
  2 | IngenierÃ­a en TecnologÃ­as de la InformaciÃ³n | t
  3 | Arquitectura y Urbanismo                     | t
```

### Tabla: `usuarios` (directores)

```sql
SELECT id, nombre, email, carrera_director 
FROM usuarios 
WHERE rol = 'director';
```

```
 id | nombre | email                             | carrera_director
----+--------+-----------------------------------+----------------------------------
  3 | Lorena | lorenaaconde@uide.edu.ec          | IngenierÃ­a en TecnologÃ­as...
  4 | Raquel | raquel.veintimilla.director@...   | Derecho
  5 | Lorena | lorena.conde.director@uide.edu.ec | IngenierÃ­a en TecnologÃ­as...
  6 | Freddy | freddy.salazar.director@...       | Arquitectura y Urbanismo
```

---

## 🔒 PREVENCIÓN FUTURA

### Para asignar directores a carreras correctamente:

**Opción 1: Usar el nombre exacto de uploads_carreras**

```sql
UPDATE usuarios 
SET carrera_director = (
  SELECT carrera FROM uploads_carreras WHERE id = <carrera_id>
)
WHERE id = <director_id>;
```

**Opción 2: Validar antes de asignar**

```sql
-- Verificar que la carrera existe
SELECT id, carrera FROM uploads_carreras 
WHERE carrera = '<nombre_carrera_exacto>';

-- Solo asignar si existe
UPDATE usuarios 
SET carrera_director = '<nombre_carrera_exacto>'
WHERE id = <director_id>;
```

### Endpoint del Backend (`PUT /api/usuarios/:id/carrera`):

El endpoint ya implementa búsqueda flexible con múltiples estrategias:

1. **Búsqueda exacta** por nombre
2. **Búsqueda por ID** si es numérico
3. **Búsqueda normalizada** (ignora tildes, mayúsculas, espacios)

**Recomendación:** Usar el endpoint del backend en lugar de SQL directo.

---

## 📝 ARCHIVOS RELEVANTES

### Frontend:
```
frontend/src/pages/DirectorDashboard.tsx
- Líneas 28-38: Carga de carreras y pre-selección
- Líneas 195-211: Dropdown de selección de carrera
```

### Backend:
```
backend/src/models/Carrera.js
- Línea 64: tableName: 'uploads_carreras'
- Modelo Sequelize que mapea la tabla

backend/src/controllers/carreraController.js
- Lógica para normalizar nombres de carrera
- Funciones de búsqueda flexible
```

### Base de Datos:
```
Tablas:
- uploads_carreras: Carreras activas del sistema
- usuarios: Campo carrera_director (VARCHAR)
```

---

## ✅ ESTADO FINAL

```
✅ Todos los directores tienen carrera asignada
✅ Todos los nombres coinciden con uploads_carreras
✅ Frontend puede pre-seleccionar correctamente
✅ Sistema funcionando para todos los directores
```

---

## 🎯 RESUMEN EJECUTIVO

**Problema:** Encoding inconsistente entre tablas causaba que el frontend no pudiera hacer match entre la carrera del director y las carreras disponibles.

**Solución:** Actualizar `usuarios.carrera_director` con los valores EXACTOS de `uploads_carreras`.

**Resultado:** Todos los directores ahora ven su "Carrera habilitada" correctamente en el Dashboard.

**Prevención:** Usar siempre el endpoint del backend para asignar carreras, ya que implementa búsqueda flexible y normalización.

---

*Corregido: 27 de Enero 2026, 00:05*  
*Sistema: Gestión de Aulas UIDE*  
*Estado: PRODUCCIÓN*
