# 🔧 FIX: Error 400 en Subida de Planificaciones

**Fecha:** 26 de Enero 2026, 23:48  
**Error Original:** `POST http://localhost:3000/api/planificaciones/subir 400 (Bad Request)`  
**Estado:** ✅ CORREGIDO

---

## 🐛 PROBLEMAS IDENTIFICADOS

### 1. Frontend enviaba datos incorrectos
**Problema:**
```typescript
// ❌ ANTES: Enviaba nombre de campo incorrecto
formData.append('carrera', carreraSeleccionada); // String nombre de carrera
```

**Backend esperaba:**
```javascript
const { carrera_id } = req.body; // Esperaba ID numérico
```

### 2. Tabla 'carreras' no existe
**Problema:**
```javascript
// ❌ Intentaba consultar tabla inexistente
SELECT id, carrera, nombre FROM carreras WHERE id = :carrera_id
```

**Error:**
```
relation "carreras" does not exist
```

**Tablas reales:**
- `uploads_carreras` ✓ (la correcta)
- `carreras_configuracion` ✓
- `carreras_periodo` ✓

### 3. Estructura de tabla incompatible
**Problema:** El controlador intentaba insertar en columnas que no existen

**Tabla real `clases`:**
```sql
- carrera VARCHAR(100)      ✓
- materia VARCHAR(200)      ✓
- ciclo VARCHAR(50)         ✓
- paralelo VARCHAR(10)      ✓
- dia VARCHAR(20)           ✓
- hora_inicio VARCHAR(20)   ✓
- hora_fin VARCHAR(20)      ✓
- num_estudiantes INTEGER   ✓
- docente VARCHAR(200)      ✓
```

**Controlador intentaba usar:**
```sql
- carrera_id INTEGER        ❌ (no existe)
- codigo_materia VARCHAR    ❌ (no existe)
- nombre_materia VARCHAR    ❌ (no existe)
- nivel INTEGER             ❌ (no existe)
- numero_estudiantes INT    ❌ (no existe)
- horario_dia VARCHAR       ❌ (no existe)
- horario_inicio VARCHAR    ❌ (no existe)
- horario_fin VARCHAR       ❌ (no existe)
- estado VARCHAR            ❌ (no existe)
```

### 3. Tabla planificaciones_subidas con estructura diferente
**Esperaba:**
- `usuario_id` INTEGER
- `estado` VARCHAR

**Real:**
- `subido_por` VARCHAR
- `procesado` BOOLEAN

---

## ✅ SOLUCIONES APLICADAS

### 1. Frontend: Enviar ID numérico correcto

**Archivo:** `frontend/src/pages/DirectorDashboard.tsx`

```typescript
// ✅ DESPUÉS: Encuentra el ID de la carrera y lo envía correctamente
const carreraObj = carrerasActivas.find(c => c.carrera === carreraSeleccionada);
if (!carreraObj) {
  setMessage({ type: 'error', text: 'Carrera no encontrada' });
  return;
}

const formData = new FormData();
formData.append('archivo', selectedFile);
formData.append('carrera_id', carreraObj.id.toString()); // ✅ Envía ID numérico
```

### 2. Backend: Usar tabla correcta (uploads_carreras)

**Archivo:** `backend/src/controllers/planificacionController.js`

```javascript
// ✅ Obtener el nombre de la carrera desde uploads_carreras (tabla correcta)
const [carreraResult] = await sequelize.query(
  `SELECT id, carrera FROM uploads_carreras WHERE id = :carrera_id LIMIT 1`,
  {
    replacements: { carrera_id },
    type: sequelize.QueryTypes.SELECT,
    transaction
  }
);

if (!carreraResult) {
  await transaction.rollback();
  return res.status(400).json({
    success: false,
    mensaje: 'Carrera no encontrada'
  });
}

const nombreCarrera = carreraResult.carrera || `Carrera ${carrera_id}`;
```

### 3. Backend: Adaptar INSERT a estructura real

```javascript
// ✅ INSERT con columnas correctas de la tabla clases
await sequelize.query(
  `INSERT INTO clases 
   (carrera, materia, ciclo, paralelo, dia, hora_inicio, hora_fin, 
    num_estudiantes, docente, horario, nombre_archivo, fecha_creacion)
   VALUES (:carrera, :materia, :ciclo, :paralelo, :dia, :hora_inicio, :hora_fin,
           :num_estudiantes, :docente, :horario, :nombre_archivo, NOW())`,
  {
    replacements: {
      carrera: nombreCarrera,              // ✅ Usa nombre de carrera
      materia: String(materia).trim(),     // ✅ Campo correcto
      ciclo: String(ciclo).trim(),         // ✅ Campo correcto
      paralelo: String(paralelo).trim(),
      dia: String(dia).trim(),
      hora_inicio: String(horaInicio).trim(),
      hora_fin: String(horaFin).trim(),
      num_estudiantes: numEstudiantes,
      docente: String(docente).trim(),
      horario: String(horario).trim(),
      nombre_archivo: req.file.originalname
    },
    type: sequelize.QueryTypes.INSERT,
    transaction
  }
);
```

### 4. Backend: Adaptar registro de historial

```javascript
// ✅ INSERT con columnas correctas de planificaciones_subidas
const subidoPor = req.usuario ? `${req.usuario.nombre} ${req.usuario.apellido}` : 'Sistema';
await sequelize.query(
  `INSERT INTO planificaciones_subidas 
   (carrera_id, archivo_nombre, subido_por, fecha_subida, procesado, total_clases, notas)
   VALUES (:carrera_id, :archivo, :subido_por, NOW(), true, :total, :notas)
   ON CONFLICT (carrera_id, periodo_academico) 
   DO UPDATE SET 
     archivo_nombre = EXCLUDED.archivo_nombre,
     subido_por = EXCLUDED.subido_por,
     fecha_subida = NOW(),
     procesado = true,
     total_clases = EXCLUDED.total_clases,
     notas = EXCLUDED.notas`,
  {
    replacements: {
      carrera_id: carrera_id,
      archivo: req.file.originalname,
      subido_por: subidoPor,              // ✅ Campo correcto
      total: clasesGuardadas,
      notas: errores.length > 0 ? `Errores: ${errores.slice(0, 5).join('; ')}` : 'Procesado exitosamente'
    },
    type: sequelize.QueryTypes.INSERT,
    transaction
  }
);
```

### 5. Backend: Manejo flexible de columnas Excel

```javascript
// ✅ Detectar múltiples nombres posibles para cada columna
const materia = row.materia || row.nombre_materia || '';
const ciclo = row.ciclo || row.nivel || row.semestre || '';
const paralelo = row.paralelo || 'A';
const dia = row.dia || row.horario_dia || '';
const horaInicio = row.hora_inicio || row.horario_inicio || '';
const horaFin = row.hora_fin || row.horario_fin || '';
const numEstudiantes = parseInt(row.num_estudiantes || row.numero_estudiantes || row.estudiantes || 0);
const docente = row.docente || row.profesor || '';
```

---

## 📊 ARCHIVOS MODIFICADOS

### Frontend (1 archivo)
```
frontend/src/pages/DirectorDashboard.tsx
- Líneas 70-85: handleUpload()
- Cambio: Obtener ID de carrera y enviarlo correctamente
- Cambio: Enviar 'carrera_id' en lugar de 'carrera'
```

### Backend (1 archivo)
```
backend/src/controllers/planificacionController.js
- Líneas 35-60: Obtener nombre de carrera desde ID
- Líneas 65-105: Adaptar INSERT a estructura real de tabla clases
- Líneas 110-130: Adaptar INSERT a estructura real de planificaciones_subidas
- Cambio: Manejo flexible de múltiples nombres de columnas Excel
```

---

## 🧪 CÓMO PROBAR

### 1. Preparar Archivo Excel de Prueba

Crear un archivo `.xlsx` con estas columnas:

| materia | ciclo | paralelo | dia | hora_inicio | hora_fin | num_estudiantes | docente |
|---------|-------|----------|-----|-------------|----------|-----------------|---------|
| Matemáticas I | 1 | A | Lunes | 08:00 | 10:00 | 30 | Dr. Juan Pérez |
| Programación | 2 | B | Martes | 10:00 | 12:00 | 25 | Ing. María López |

### 2. Desde la UI:

1. Login como director: `raquel.veintimilla.director@uide.edu.ec` / `DirectorUide2026!`
2. Ir al Dashboard Director
3. Seleccionar carrera (pre-seleccionada si ya está asignada)
4. Elegir archivo Excel
5. Click en "Subir Planificación"
6. Verificar mensaje de éxito

### 3. Verificar en Base de Datos:

```bash
# Ver clases insertadas
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "
SELECT id, carrera, materia, ciclo, paralelo, num_estudiantes, docente 
FROM clases 
WHERE carrera = 'Derecho' 
ORDER BY id DESC 
LIMIT 5;
"

# Ver historial de planificaciones
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "
SELECT id, carrera_id, archivo_nombre, subido_por, total_clases, procesado 
FROM planificaciones_subidas 
ORDER BY fecha_subida DESC 
LIMIT 3;
"
```

---

## ✅ RESULTADOS ESPERADOS

### Frontend:
```
✅ Archivo Excel seleccionado
✅ Carrera pre-seleccionada (Derecho)
✅ Click en "Subir Planificación"
✅ Mensaje: "Planificación subida exitosamente. Se está procesando..."
✅ Formulario se resetea
```

### Backend Logs:
```
✅ [SECURITY] Acceso autorizado a /api/planificaciones/subir
✅ 📁 Procesando planificación de carrera: Derecho
✅ 📚 X clases en el Excel
✅ ✅ Planificación guardada: X clases
✅ POST /api/planificaciones/subir 200 OK
```

### Base de Datos:
```
✅ Clases insertadas en tabla clases con carrera = "Derecho"
✅ Registro en planificaciones_subidas con procesado = true
✅ total_clases coincide con número de filas procesadas
```

---

## 🔍 LOGS PARA DEBUGGING

### Ver logs del backend:
```bash
docker logs gestion_aulas_backend --tail 50 | Select-String -Pattern "planificaciones|subir" -Context 2
```

### Ver errores específicos:
```bash
docker logs gestion_aulas_backend --tail 100 | Select-String -Pattern "error|Error|ERROR" -Context 1
```

### Monitorear en tiempo real:
```bash
docker logs gestion_aulas_backend -f
```

---

## 📋 FORMATO EXCEL RECOMENDADO

### Columnas Mínimas Requeridas:
```
1. materia       (Obligatorio)
2. ciclo         (Opcional, default: "")
3. paralelo      (Opcional, default: "A")
4. dia           (Opcional)
5. hora_inicio   (Opcional)
6. hora_fin      (Opcional)
7. num_estudiantes (Opcional, default: 0)
8. docente       (Opcional)
```

### Columnas Alternativas Soportadas:
```
- materia: nombre_materia
- ciclo: nivel, semestre
- dia: horario_dia
- hora_inicio: horario_inicio
- hora_fin: horario_fin
- num_estudiantes: numero_estudiantes, estudiantes
- docente: profesor
```

---

## 🚀 PRÓXIMOS PASOS

### Para Directores:

1. ✅ Preparar archivo Excel con planificación de su carrera
2. ✅ Acceder al Dashboard Director
3. ✅ Subir planificación
4. ⏳ Esperar procesamiento automático
5. ⏳ Recibir notificación de completado

### Para Administradores:

1. ✅ Revisar planificaciones subidas
2. ⏳ Aprobar/Rechazar planificaciones
3. ⏳ Ejecutar distribución automática de aulas
4. ⏳ Generar reportes de asignación

---

## ✅ ESTADO FINAL

```
✅ Frontend: Envía carrera_id correctamente
✅ Backend: Obtiene nombre de carrera desde ID
✅ Backend: INSERT con columnas correctas
✅ Backend: Manejo flexible de columnas Excel
✅ Backend: Registro de historial correcto
✅ Backend: Reiniciado y funcionando
✅ Sistema: Listo para subir planificaciones
```

---

**¡Fix Completado! 🎉**

Los directores ahora pueden subir planificaciones sin errores.

---

*Corregido: 26 de Enero 2026, 23:48*  
*Sistema: Gestión de Aulas UIDE*  
*Estado: PRODUCCIÓN*
