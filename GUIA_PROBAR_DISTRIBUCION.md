# 🎯 GUÍA: Cómo Probar la Distribución Automática

## ✅ CONFIRMACIÓN: Perfil de Directores

**SÍ**, cuando un director hace login, su perfil incluye la información de su carrera:

```json
{
  "usuario": {
    "nombre": "Raquel",
    "apellido": "Veintimilla",
    "rol": "director",
    "carrera_director": 1,
    "carrera": {
      "id": 1,
      "nombre": "Derecho",
      "normalizada": "derecho"
    }
  }
}
```

---

## 🚀 CÓMO PROBAR LA DISTRIBUCIÓN AUTOMÁTICA

La distribución automática asigna aulas a las clases basándose en:
- Horarios de las clases
- Capacidad de estudiantes
- Disponibilidad de aulas
- Optimización de conflictos

### 📋 REQUISITOS PREVIOS

Antes de probar la distribución, necesitas:
1. ✅ Backend corriendo (puerto 3000)
2. ✅ Frontend corriendo (puerto 5173)
3. ✅ Estudiantes cargados en el sistema
4. ✅ Planificaciones/horarios cargados

---

## 🎬 PASO A PASO

### PASO 1: Login como Admin

1. Abre http://localhost:5173
2. Login con:
   - Email: `admin@uide.edu.ec`
   - Password: `admin123`

---

### PASO 2: Subir Estudiantes (Si no lo has hecho)

1. Ve a **"Gestión de Estudiantes"**
2. Click en **"Subir Estudiantes"**
3. Selecciona un archivo Excel con este formato:

```
| CÉDULA      | APELLIDOS Y NOMBRES | NIVEL | ESCUELA    |
|-------------|---------------------|-------|------------|
| 1234567890  | Pérez García Juan   | 1     | Derecho    |
| 0987654321  | López María         | 1     | Derecho    |
```

4. Click en **"Subir"**
5. Espera la confirmación

**Ejemplo de archivo**: Crea un Excel con al menos 10-20 estudiantes para pruebas

---

### PASO 3: Subir Planificación (Obligatorio)

1. Ve a **"Planificaciones"** (en el menú principal)
2. Click en **"Subir Planificación"**
3. Selecciona un archivo Excel con este formato (fila 9 en adelante):

```
Fila 9 (encabezados):
ESCUELA | CARRERA | NIVEL | Materia | Docente | L | M | X | J | V | S

Fila 10+:
Derecho | Derecho | 1 | Derecho Civil I | Dr. Pérez | 7-9 | | 7-9 | | |
Derecho | Derecho | 1 | Constitucional | Dra. López | | 9-11 | | 9-11 | |
```

**IMPORTANTE**:
- La fila 9 debe tener los encabezados exactamente como se muestra
- Los horarios se ponen en las columnas de días (L=Lunes, M=Martes, etc.)
- Formato de hora: `7-9`, `9-11`, `11-13`, `14-16`, etc.

4. Click en **"Subir"**
5. Espera la confirmación: "Planificación subida exitosamente"

---

### PASO 4: Ejecutar Distribución Automática

**Opción A: Desde el Frontend (Recomendado)**

1. Ve a **"Distribución de Aulas"**
2. Verás un resumen:
   - Total de clases
   - Clases sin aula asignada
   - Aulas disponibles
3. Click en el botón **"Ejecutar Distribución"** o **"Forzar Distribución"**
4. Espera a que el algoritmo procese (puede tardar unos segundos)
5. Verás un mensaje de confirmación

**Opción B: Desde Script (Para Debug)**

```powershell
cd backend
node scripts/test_distribucion.js
```

---

### PASO 5: Ver Resultados

#### 📊 Ver Estado de la Distribución

1. En **"Distribución de Aulas"**, verás:
   - Clases asignadas
   - Clases sin asignar
   - Conflictos detectados

#### 🗺️ Ver Mapa de Calor

1. Ve a **"Mapa de Calor"** (en el menú)
2. Verás una tabla visual:
   - **Columnas**: Días de la semana (Lunes a Sábado)
   - **Filas**: Bloques horarios (7-9, 9-11, etc.)
   - **Colores**:
     - 🟢 Verde (LOW): Baja ocupación
     - 🟡 Amarillo (MEDIUM): Ocupación media
     - 🔴 Rojo (HIGH): Alta ocupación
3. **Click en cualquier celda** para ver detalles de las clases

#### 📋 Ver Lista de Asignaciones

1. Ve a **"Mi Distribución"**
2. Verás una tabla con:
   - Materia
   - Docente
   - Horario
   - **Aula asignada**
   - Capacidad

---

## 🧪 PRUEBA RÁPIDA CON SCRIPT

Creé un script para probar toda la funcionalidad:

```powershell
cd backend
node scripts/test_distribucion_completa.js
```

Este script:
1. Hace login
2. Verifica el estado actual
3. Ejecuta la distribución
4. Muestra los resultados
5. Obtiene el mapa de calor

---

## 📁 ARCHIVOS EXCEL DE PRUEBA

### Ejemplo 1: Estudiantes de Derecho

```csv
CÉDULA,APELLIDOS Y NOMBRES,NIVEL,ESCUELA
1234567890,Pérez García Juan Carlos,1,Derecho
0987654321,López Martínez María Elena,1,Derecho
1122334455,González Ramírez Pedro,1,Derecho
5566778899,Rodríguez Silva Ana,1,Derecho
2233445566,Morales Castro Luis,1,Derecho
```

### Ejemplo 2: Planificación de Derecho

```
(Filas 1-8: Información general de la carrera)

Fila 9 (encabezados):
ESCUELA,CARRERA,NIVEL,Materia,Docente,L,M,X,J,V,S

Fila 10+:
Derecho,Derecho,1,Derecho Civil I,Dr. Juan Pérez,7-9,,7-9,,,
Derecho,Derecho,1,Derecho Constitucional,Dra. María López,,9-11,,9-11,,
Derecho,Derecho,1,Derecho Penal,Dr. Carlos Sánchez,,,11-13,,11-13,
```

---

## 🤖 CÓMO FUNCIONA EL ALGORITMO

El algoritmo de distribución:

1. **Obtiene todas las clases sin aula**
2. **Agrupa por bloques horarios** (día + hora)
3. **Para cada clase**:
   - Busca aulas disponibles en ese horario
   - Filtra por capacidad suficiente
   - Calcula conflictos potenciales
   - Optimiza usando Simulated Annealing
4. **Asigna el aula óptima**
5. **Guarda en la base de datos**

---

## ✅ VERIFICAR QUE TODO FUNCIONA

### Test 1: Backend Endpoints
```powershell
# Obtener token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@uide.edu.ec","password":"admin123"}'

# Ver estado de distribución (necesitas el token)
curl -H "Authorization: Bearer TU_TOKEN" \
  http://localhost:3000/api/distribucion/estado
```

### Test 2: Verificar Clases
```sql
-- En la base de datos SQLite
SELECT COUNT(*) FROM clases;
SELECT COUNT(*) FROM clases WHERE aula_id IS NULL;
```

### Test 3: Verificar Aulas
```sql
SELECT * FROM aulas LIMIT 5;
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "No hay clases sin aula"

**Causa**: No has subido planificaciones

**Solución**:
1. Ve a "Planificaciones"
2. Sube un archivo Excel de planificación
3. Vuelve a intentar

### Error: "No hay aulas disponibles"

**Causa**: Todas las aulas están ocupadas para ese horario

**Solución**:
1. Revisa el mapa de calor
2. Las aulas se crean automáticamente (20 aulas A-01 a A-20)
3. Si necesitas más, agrégalas desde "Gestión de Aulas"

### Error: "Cannot read property 'nombre' of undefined"

**Causa**: Error en los datos de entrada

**Solución**:
1. Verifica el formato del Excel
2. Asegúrate de que la fila 9 tenga los encabezados correctos
3. Los horarios deben ser en formato `7-9`, `9-11`, etc.

### Error: "Token inválido"

**Causa**: Sesión expirada

**Solución**:
1. Haz logout
2. Login nuevamente
3. Vuelve a intentar

---

## 📊 EJEMPLO COMPLETO DE PRUEBA

### 1. Preparar Datos de Prueba

Crea un archivo `estudiantes_prueba.xlsx`:
- 20 estudiantes de Derecho, nivel 1
- Cédulas válidas ecuatorianas

Crea un archivo `planificacion_derecho.xlsx`:
- 5 materias diferentes
- Horarios distribuidos en la semana
- Sin conflictos de horarios

### 2. Subir Datos

```
1. Login → admin@uide.edu.ec / admin123
2. Gestión Estudiantes → Subir estudiantes_prueba.xlsx
3. Planificaciones → Subir planificacion_derecho.xlsx
```

### 3. Ejecutar Distribución

```
4. Distribución de Aulas → Ver estado inicial
5. Click "Ejecutar Distribución"
6. Esperar confirmación
```

### 4. Verificar Resultados

```
7. Mapa de Calor → Ver visualización
8. Mi Distribución → Ver lista de asignaciones
9. Dashboard → Ver estadísticas
```

---

## 🎤 PARA LA PRESENTACIÓN

### Demostración Sugerida (5 minutos)

1. **Mostrar datos iniciales** (30 seg)
   - "Tenemos 20 estudiantes de Derecho"
   - "5 materias a distribuir"
   - "20 aulas disponibles"

2. **Ejecutar distribución** (1 min)
   - Click en "Ejecutar Distribución"
   - Mostrar progreso
   - Mostrar confirmación

3. **Mostrar mapa de calor** (2 min)
   - Explicar códigos de colores
   - Click en celdas para ver detalles
   - Mostrar optimización

4. **Mostrar lista de asignaciones** (1 min)
   - Ver todas las clases con aulas
   - Mostrar que no hay conflictos

5. **Login como director** (30 seg)
   - Mostrar vista filtrada por carrera
   - Confirmar que funciona el filtro

---

## 📞 COMANDOS ÚTILES

```powershell
# Verificar backend corriendo
netstat -ano | findstr :3000

# Ver logs del backend
# (En la terminal donde corre el backend)

# Limpiar distribución y volver a empezar
curl -X POST http://localhost:3000/api/distribucion/limpiar \
  -H "Authorization: Bearer TU_TOKEN"

# Forzar nueva distribución
curl -X POST http://localhost:3000/api/distribucion/generar \
  -H "Authorization: Bearer TU_TOKEN"
```

---

**✅ LISTO PARA PROBAR LA DISTRIBUCIÓN**

**Orden recomendado**:
1. ✅ Subir estudiantes
2. ✅ Subir planificaciones
3. ✅ Ejecutar distribución
4. ✅ Ver resultados en mapa de calor
5. ✅ Verificar asignaciones

**¡El sistema está listo para automatizar la asignación de aulas!** 🎉
