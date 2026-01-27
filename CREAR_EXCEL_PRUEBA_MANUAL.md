# 📊 CREAR EXCEL DE PRUEBA - Manual Rápido

## 🎯 OBJETIVO
Crear un archivo Excel simple para probar la subida de planificaciones.

---

## 📋 OPCIÓN 1: Crear en Microsoft Excel

### Paso 1: Abrir Excel
1. Abrir Microsoft Excel
2. Crear nuevo libro en blanco

### Paso 2: Crear Headers (Fila 1)

**Escribir exactamente estos headers en la fila 1:**

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| codigo_materia | nombre_materia | nivel | paralelo | numero_estudiantes | horario_dia | horario_inicio | horario_fin | docente |

### Paso 3: Agregar Datos de Prueba (Filas 2-4)

**Fila 2:**
```
TEST101 | Materia de Prueba 1 | 1 | A | 30 | Lunes | 08:00 | 10:00 | Prof. Test
```

**Fila 3:**
```
TEST102 | Materia de Prueba 2 | 1 | A | 25 | Martes | 10:00 | 12:00 | Prof. Test
```

**Fila 4:**
```
TEST103 | Materia de Prueba 3 | 1 | B | 35 | Miércoles | 14:00 | 16:00 | Prof. Test
```

### Paso 4: Guardar
- **Archivo → Guardar como**
- Nombre: `planificacion_PRUEBA_RAPIDA.xlsx`
- Ubicación: `C:\Users\sjapo\OneDrive\Documents\Proyectos\gestion-aulas-uide\`
- Tipo: **Libro de Excel (.xlsx)**

---

## 📋 OPCIÓN 2: Copiar y Pegar

### Paso 1: Copiar esta tabla completa

```
codigo_materia	nombre_materia	nivel	paralelo	numero_estudiantes	horario_dia	horario_inicio	horario_fin	docente
TEST101	Materia de Prueba 1	1	A	30	Lunes	08:00	10:00	Prof. Test
TEST102	Materia de Prueba 2	1	A	25	Martes	10:00	12:00	Prof. Test
TEST103	Materia de Prueba 3	1	B	35	Miércoles	14:00	16:00	Prof. Test
```

### Paso 2: Pegar en Excel
1. Abrir Excel nuevo
2. Click en celda A1
3. Pegar (Ctrl+V)
4. Guardar como `planificacion_PRUEBA_RAPIDA.xlsx`

---

## 📋 OPCIÓN 3: Usar Google Sheets

### Paso 1: Crear en Google Sheets
1. Ir a: https://sheets.google.com
2. Crear nueva hoja
3. Pegar los datos de arriba

### Paso 2: Descargar como Excel
1. **Archivo → Descargar → Microsoft Excel (.xlsx)**
2. Renombrar a: `planificacion_PRUEBA_RAPIDA.xlsx`
3. Mover a: `C:\Users\sjapo\OneDrive\Documents\Proyectos\gestion-aulas-uide\`

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

El archivo debe tener:
- ✅ 4 filas totales (1 header + 3 datos)
- ✅ 9 columnas exactas
- ✅ Headers en la fila 1
- ✅ Formato .xlsx (no .xls)
- ✅ Ubicado en la carpeta del proyecto

---

## 🧪 PROBAR LA SUBIDA

### Desde Postman:

1. **Abrir Postman**

2. **Crear nueva request:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/planificaciones/subir`

3. **Headers:**
   ```
   Authorization: Bearer [tu_token]
   ```
   
   Para obtener el token, primero haz login:
   ```
   POST http://localhost:3000/api/auth/login
   Body (JSON):
   {
     "email": "admin@uide.edu.ec",
     "password": "admin123"
   }
   ```

4. **Body:**
   - Seleccionar: `form-data`
   - Agregar dos campos:

   | Key | Type | Value |
   |-----|------|-------|
   | archivo | File | [seleccionar planificacion_PRUEBA_RAPIDA.xlsx] |
   | carrera_id | Text | 1 |

5. **Click en Send**

### Respuesta esperada:

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

---

## 🔍 VERIFICAR EN BASE DE DATOS

```powershell
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT codigo_materia, nombre_materia, nivel, estado, aula_asignada FROM clases WHERE codigo_materia LIKE 'TEST%';"
```

**Deberías ver:**
```
 codigo_materia | nombre_materia      | nivel | estado   | aula_asignada 
----------------|---------------------|-------|----------|---------------
 TEST101        | Materia de Prueba 1 | 1     | asignada | 5
 TEST102        | Materia de Prueba 2 | 1     | asignada | 7
 TEST103        | Materia de Prueba 3 | 1     | asignada | 3
```

✅ Si `estado = 'asignada'` → **¡FUNCIONA!**
⚠️ Si `estado = 'pendiente'` → N8N no está activo, activa el workflow

---

## 🎯 SIGUIENTE PASO

Una vez que tengas el Excel:

```powershell
# Ejecutar el script de prueba
.\test_distribucion_completa.ps1
```

O sigue la **GUIA_VISUAL_N8N.md** para activar el workflow de n8n.

---

**⏱️ Tiempo estimado:** 2 minutos para crear el Excel  
**🎯 Resultado:** Excel listo para probar el sistema
