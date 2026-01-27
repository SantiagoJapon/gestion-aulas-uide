# 📚 GUÍA: Subir Estudiantes desde Excel

## ✅ SISTEMA IMPLEMENTADO

El sistema procesa archivos Excel **directamente en el backend** sin necesidad de n8n.

---

## 📊 FORMATO DEL EXCEL

### 📝 PRIMERA HOJA: Estudiantes (REQUERIDA)

El sistema usa automáticamente la **primera hoja** del Excel (sin importar su nombre: "Sheet1", "Estudiantes", "Hoja1", etc.).

**Columnas requeridas:**

| Columna | Requerido | Ejemplo | Notas |
|---------|-----------|---------|-------|
| `cedula` | ✅ | 1234567890 | 10 dígitos, cédula ecuatoriana válida |
| `nombres` | ✅ | Juan Carlos | Nombres del estudiante |
| `apellidos` | ✅ | Pérez García | Apellidos del estudiante |
| `email` | ❌ | juan.perez@uide.edu.ec | Correo institucional |
| `telefono` | ❌ | 0991234567 | Teléfono celular |
| `escuela` | ❌ | Derecho | Nombre de la carrera/escuela |
| `carrera` | ❌ | Derecho | Alternativa a escuela |
| `nivel` | ❌ | 1 | Nivel/semestre actual |

**Ejemplo:**

```
cedula       | nombres       | apellidos        | email                   | telefono    | escuela  | nivel
1234567890   | Juan Carlos   | Pérez García     | juan@uide.edu.ec       | 0991234567  | Derecho  | 1
0987654321   | María         | González López   | maria@uide.edu.ec      | 0999876543  | Derecho  | 1
1122334455   | Carlos        | Rodríguez        | carlos@uide.edu.ec     | 0981122334  | TICs     | 2
```

---

### 📚 SEGUNDA HOJA: Materias Inscritas (OPCIONAL)

Si existe una **segunda hoja**, el sistema procesará las inscripciones a materias.

**Columnas requeridas:**

| Columna | Requerido | Ejemplo | Notas |
|---------|-----------|---------|-------|
| `cedula_estudiante` | ✅ | 1234567890 | Debe existir en la 1ra hoja |
| `codigo_materia` | ✅ | DER101 | Se busca en tabla `clases` campo `materia` |
| `nivel` | ❌ | 1 | Se busca en campo `ciclo` de `clases` |
| `paralelo` | ❌ | A | Paralelo de la clase |

**Ejemplo:**

```
cedula_estudiante | codigo_materia | nivel | paralelo
1234567890        | DER101         | 1     | A
1234567890        | DER102         | 1     | A
0987654321        | DER101         | 1     | A
```

**IMPORTANTE:** 
- La búsqueda de materias es **flexible** (usa `ILIKE` para coincidencias parciales)
- Si la materia no existe en `clases`, se registra el error pero no falla todo el proceso
- Si no existe la tabla `estudiantes_materias`, esta hoja se ignora sin problemas

---

## 🚀 CÓMO SUBIR EL EXCEL

### Método 1: Desde el Frontend (Recomendado)

1. **Abrir:** http://localhost:5173/login
2. **Login como admin**
3. **Ir al Panel de Admin**
4. **Buscar:** "Subir Listado de Estudiantes"
5. **Seleccionar** tu archivo Excel
6. **Click** "Subir y Procesar"
7. **Esperar** resultado (5-30 segundos según tamaño)

### Método 2: Con la Página de Prueba

1. **Abrir:** `test-subir-estudiantes.html` en el navegador
2. **Obtener token:**
   - Login en el frontend
   - Abrir DevTools (F12)
   - Console: `localStorage.getItem('token')`
3. **Pegar token** en el campo
4. **Seleccionar Excel**
5. **Subir**

### Método 3: Con Postman/cURL

```bash
curl -X POST http://localhost:3000/api/estudiantes/subir \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -F "archivo=@estudiantes.xlsx"
```

---

## 📊 RESPUESTA ESPERADA

### Éxito:
```json
{
  "success": true,
  "mensaje": "Estudiantes procesados exitosamente",
  "resultado": {
    "estudiantes_nuevos": 5,
    "estudiantes_actualizados": 2,
    "total_estudiantes": 7,
    "inscripciones_guardadas": 15,
    "errores": null,
    "total_errores": 0,
    "timestamp": "2026-01-26T19:30:00.000Z"
  }
}
```

### Con errores parciales:
```json
{
  "success": true,
  "mensaje": "Proceso completado con algunos errores",
  "resultado": {
    "estudiantes_nuevos": 5,
    "estudiantes_actualizados": 2,
    "total_estudiantes": 7,
    "inscripciones_guardadas": 12,
    "errores": [
      "Fila 8: Cédula inválida (1234567)",
      "Sheet2 Fila 15: Estudiante no encontrado (9999999999)"
    ],
    "total_errores": 2,
    "timestamp": "2026-01-26T19:30:00.000Z"
  }
}
```

---

## 🔍 VERIFICAR EN BASE DE DATOS

### Ver estudiantes insertados:
```sql
SELECT 
  id,
  cedula, 
  nombre, 
  email, 
  nivel, 
  escuela,
  fecha_registro
FROM estudiantes 
ORDER BY id DESC 
LIMIT 10;
```

### Ver inscripciones:
```sql
SELECT 
  e.cedula,
  e.nombre,
  c.materia as nombre_materia,
  c.ciclo,
  c.paralelo
FROM estudiantes_materias em
JOIN estudiantes e ON e.id = em.estudiante_id
JOIN clases c ON c.id = em.clase_id
ORDER BY e.cedula
LIMIT 20;
```

### Ver historial de cargas:
```sql
SELECT 
  id,
  archivo_nombre,
  registros_procesados,
  estado,
  fecha_carga,
  detalles::json->'estudiantes_nuevos' as nuevos,
  detalles::json->'estudiantes_actualizados' as actualizados,
  detalles::json->'inscripciones' as inscripciones
FROM historial_cargas
ORDER BY id DESC
LIMIT 5;
```

---

## ✅ CARACTERÍSTICAS

- ✅ **Hojas flexibles**: Usa 1ra y 2da hoja (sin importar nombres)
- ✅ **Validación de cédulas**: Algoritmo oficial ecuatoriano
- ✅ **Transaccional**: Todo o nada (atomicidad ACID)
- ✅ **Duplicados**: Actualiza automáticamente si existe
- ✅ **Errores detallados**: Muestra fila exacta del error
- ✅ **Logs completos**: En consola del backend
- ✅ **Historial**: Registra todas las cargas
- ✅ **Sin n8n**: No requiere servicios externos
- ✅ **Rápido**: ~1-2 segundos para 100 estudiantes

---

## 🐛 ERRORES COMUNES

### ❌ "Faltan columnas requeridas: cedula, nombres, apellidos"
**Causa:** El Excel no tiene las columnas con esos nombres exactos  
**Solución:** Asegúrate de que la primera fila tenga: `cedula`, `nombres`, `apellidos`

### ❌ "Cédula inválida"
**Causa:** La cédula no cumple con el algoritmo de validación  
**Solución:** Usa cédulas ecuatorianas válidas (10 dígitos)

### ❌ "Estudiante no encontrado" (en Sheet2)
**Causa:** La cédula en la 2da hoja no existe en la 1ra  
**Solución:** Verifica que todas las cédulas de Sheet2 estén en Sheet1

### ❌ "Clase no encontrada" (en Sheet2)
**Causa:** La materia no existe en la tabla `clases`  
**Solución:** Las materias deben ser subidas primero por los directores

### ❌ "Solo se permiten archivos Excel"
**Causa:** El archivo no es `.xlsx` o `.xls`  
**Solución:** Guarda el archivo como Excel (no CSV)

### ❌ "La hoja [nombre] no contiene datos"
**Causa:** La primera hoja está vacía  
**Solución:** Asegúrate de que la primera hoja tenga datos

---

## 💡 TIPS Y MEJORES PRÁCTICAS

### 1. Preparación del Excel
- ✅ Usa la primera fila como **encabezados**
- ✅ Los nombres de columnas deben ser **exactos** (minúsculas)
- ✅ No dejes filas vacías entre los datos
- ✅ Asegúrate de que las cédulas sean **texto** (no números)

### 2. Validación Previa
- ✅ Verifica que las cédulas sean válidas
- ✅ Asegúrate de que no haya duplicados
- ✅ Verifica que los emails sean `@uide.edu.ec`

### 3. Inscripciones (Sheet2)
- ✅ Las materias deben existir previamente en `clases`
- ✅ Si una materia no existe, se registra el error pero continúa
- ✅ Puedes omitir Sheet2 si solo quieres cargar estudiantes

### 4. Actualización de Datos
- ✅ Si un estudiante ya existe (misma cédula), se **actualiza** su información
- ✅ No se crean duplicados
- ✅ Las inscripciones previas se mantienen

---

## 📦 EJEMPLO COMPLETO

### Plantilla Excel Mínima:

**Hoja 1:**
```
cedula       | nombres  | apellidos
1234567890   | Juan     | Pérez
0987654321   | María    | González
```

### Plantilla Excel Completa:

**Hoja 1:**
```
cedula       | nombres       | apellidos        | email                | telefono    | escuela                        | nivel
1234567890   | Juan Carlos   | Pérez García     | juan@uide.edu.ec    | 0991234567  | Derecho                        | 1
0987654321   | María         | González López   | maria@uide.edu.ec   | 0999876543  | Derecho                        | 1
1122334455   | Carlos        | Rodríguez        | carlos@uide.edu.ec  | 0981122334  | Ingeniería en TICs             | 2
```

**Hoja 2:**
```
cedula_estudiante | codigo_materia           | nivel | paralelo
1234567890        | Introducción al Derecho  | 1     | A
1234567890        | Derecho Romano           | 1     | A
0987654321        | Introducción al Derecho  | 1     | A
```

---

## 🔧 COMANDOS ÚTILES

### Ver logs del backend:
```bash
docker logs -f gestion_aulas_backend
```

### Ver últimos estudiantes:
```bash
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT * FROM estudiantes ORDER BY id DESC LIMIT 5;"
```

### Ver historial:
```bash
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT * FROM historial_cargas ORDER BY id DESC LIMIT 5;"
```

### Limpiar tabla estudiantes (testing):
```bash
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "TRUNCATE estudiantes CASCADE;"
```

---

## 📞 SOPORTE

Si tienes problemas:

1. **Ver logs del backend:**
   ```bash
   docker logs gestion_aulas_backend --tail 100
   ```

2. **Verificar que xlsx esté instalado:**
   ```bash
   docker exec gestion_aulas_backend npm list xlsx
   ```
   Debe mostrar: `xlsx@0.18.5`

3. **Reiniciar backend:**
   ```bash
   docker-compose restart backend
   ```

---

## ✅ CHECKLIST

Antes de subir tu Excel:

- [ ] La primera hoja tiene columnas: `cedula`, `nombres`, `apellidos`
- [ ] Las cédulas son válidas (10 dígitos ecuatorianos)
- [ ] Los nombres de columnas están en **minúsculas**
- [ ] No hay filas vacías entre los datos
- [ ] El archivo es `.xlsx` o `.xls` (no CSV)
- [ ] El tamaño es menor a 10MB
- [ ] Tienes un token de admin válido
- [ ] El backend está corriendo (`docker ps | grep backend`)

---

**¡Listo para usar! 🎉**

Cualquier problema, revisa la sección de **Errores Comunes** o los **logs del backend**.
