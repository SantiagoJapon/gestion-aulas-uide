# 🧪 GUÍA DE PRUEBA PASO A PASO

**Vamos a probar todo el sistema para verificar que funciona correctamente**

---

## 📋 PASO 0: Preparación

### Verificar que todo esté instalado:

```bash
cd backend
npm install
```

### Iniciar el backend:

```bash
npm start
```

**Deberías ver**:
```
🚀 Servidor corriendo en http://localhost:3000
✅ Base de datos conectada
✅ Modelos sincronizados
```

---

## 🔑 PASO 1: Crear/Login como Admin

### Opción A: Si ya tienes un admin, login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@uide.edu.ec\",\"password\":\"tu_password\"}"
```

### Opción B: Si no tienes admin, crear uno:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"nombre\":\"Admin\",
    \"apellido\":\"Sistema\",
    \"email\":\"admin@uide.edu.ec\",
    \"password\":\"admin123\",
    \"rol\":\"admin\"
  }"
```

**Guarda el token que recibes**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Exporta el token** (para usarlo en los siguientes comandos):

```bash
# En Windows PowerShell
$token = "TU_TOKEN_AQUI"

# En Linux/Mac
export TOKEN="TU_TOKEN_AQUI"
```

---

## 🏫 PASO 2: Crear una Carrera (si no existe)

```bash
# Windows PowerShell
curl -X POST http://localhost:3000/api/carreras `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d "{\"carrera\":\"Derecho\",\"codigo\":\"DER\",\"activa\":true}"

# Linux/Mac
curl -X POST http://localhost:3000/api/carreras \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"carrera":"Derecho","codigo":"DER","activa":true}'
```

**Respuesta esperada**:
```json
{
  "success": true,
  "carrera": {
    "id": 1,
    "carrera": "Derecho",
    "codigo": "DER",
    "activa": true
  }
}
```

**Guarda el `id` de la carrera** (normalmente es 1)

---

## 📤 PASO 3: Preparar el Excel de Planificación

Necesitas un archivo Excel con estas columnas (puedes usar el ejemplo que ya tienes):

| codigo_materia | nombre_materia | nivel | paralelo | numero_estudiantes | horario_dia | horario_inicio | horario_fin | docente |
|----------------|----------------|-------|----------|-------------------|-------------|----------------|-------------|---------|
| DER-101 | Derecho Civil I | 1 | A | 35 | Lunes | 08:00 | 10:00 | Dr. García |
| DER-102 | Derecho Penal | 1 | A | 40 | Lunes | 10:00 | 12:00 | Dr. López |
| DER-103 | Derecho Constitucional | 2 | A | 38 | Martes | 08:00 | 10:00 | Dra. Martínez |

**Si ya tienes `planificacion_derecho_ejemplo.xlsx`, úsalo directamente**

---

## 🚀 PASO 4: Subir Planificación (¡MOMENTO CLAVE!)

**Este es el momento donde verás la magia de la distribución automática**

```bash
# Windows PowerShell
curl -X POST http://localhost:3000/api/planificaciones/subir `
  -H "Authorization: Bearer $token" `
  -F "file=@planificacion_derecho_ejemplo.xlsx" `
  -F "carrera_id=1"

# Linux/Mac
curl -X POST http://localhost:3000/api/planificaciones/subir \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@planificacion_derecho_ejemplo.xlsx" \
  -F "carrera_id=1"
```

### 🎯 **QUÉ ESPERAR**:

En la consola del backend verás:

```
📚 45 clases en el Excel
💾 Guardando clases en la base de datos...
✅ Planificación guardada: 45 clases

🤖 Ejecutando distribución automática de aulas...
🚀 Iniciando distribución automática de aulas...
📋 Clases pendientes: 45
🏢 Aulas disponibles: 50

✅ Asignada: Derecho Civil I → Aula A-101
✅ Asignada: Derecho Penal → Aula A-102
✅ Asignada: Derecho Constitucional → Aula B-201
...

✅ Distribución completada
   - Asignadas: 42
   - Sin aula: 3
   - Errores: 0

🧠 Aplicando optimización con IA...
   - Utilización promedio: 78.5%
   - Sugerencias: 2
```

### **Respuesta JSON**:

```json
{
  "success": true,
  "mensaje": "Planificación subida y aulas distribuidas automáticamente",
  "resultado": {
    "clases_guardadas": 45,
    "errores": null,
    "distribucion": {
      "estado": "completada",
      "mensaje": "Distribución de aulas completada exitosamente",
      "estadisticas": {
        "total_procesadas": 45,
        "asignadas": 42,
        "sin_aula": 3,
        "errores": 0
      },
      "clases_asignadas": 42,
      "clases_pendientes": 3,
      "porcentaje_exito": 93
    }
  }
}
```

**✅ Si ves esto, la distribución automática está funcionando!**

---

## 📊 PASO 5: Ver el Estado de la Distribución

```bash
# Windows PowerShell
curl -X GET http://localhost:3000/api/distribucion/estado `
  -H "Authorization: Bearer $token"

# Linux/Mac
curl -X GET http://localhost:3000/api/distribucion/estado \
  -H "Authorization: Bearer $TOKEN"
```

**Verás**:
```json
{
  "success": true,
  "estadisticas": {
    "total_clases": 45,
    "clases_asignadas": 42,
    "clases_pendientes": 3,
    "total_carreras": 1,
    "porcentaje_completado": 93
  },
  "carreras": [
    {
      "id": 1,
      "nombre_carrera": "Derecho",
      "estado": "activa",
      "total_clases": 45,
      "clases_asignadas": 42,
      "clases_pendientes": 3,
      "porcentaje_completado": 93
    }
  ]
}
```

---

## 🔥 PASO 6: Ver el Mapa de Calor

```bash
# Windows PowerShell
curl -X GET "http://localhost:3000/api/distribucion/heatmap?carrera_id=1" `
  -H "Authorization: Bearer $token"

# Linux/Mac
curl -X GET "http://localhost:3000/api/distribucion/heatmap?carrera_id=1" \
  -H "Authorization: Bearer $TOKEN"
```

**Verás algo como**:
```json
{
  "success": true,
  "estadisticas": {
    "total_aulas_disponibles": 50,
    "total_slots_ocupados": 120,
    "promedio_ocupacion": 65,
    "total_clases_programadas": 180,
    "total_estudiantes": 3500
  },
  "puntos": [
    {
      "dia": "Lunes",
      "hora": 8,
      "aulas_ocupadas": 15,
      "total_clases": 18,
      "total_estudiantes": 350,
      "porcentaje_ocupacion": 30,
      "nivel": "LOW"
    },
    {
      "dia": "Lunes",
      "hora": 9,
      "aulas_ocupadas": 35,
      "total_clases": 38,
      "total_estudiantes": 800,
      "porcentaje_ocupacion": 70,
      "nivel": "HIGH"
    }
  ],
  "detalles": {
    "Lunes_8": [
      {
        "aula_codigo": "A-101",
        "aula_nombre": "Aula A-101",
        "aula_capacidad": 40,
        "materia": "Derecho Civil I",
        "docente": "Dr. García",
        "estudiantes": 35,
        "nivel": "1",
        "paralelo": "A",
        "porcentaje_ocupacion": 88,
        "carrera": "Derecho"
      }
    ]
  }
}
```

---

## 👁️ PASO 7: Ver Mi Distribución (según rol)

```bash
# Windows PowerShell
curl -X GET http://localhost:3000/api/distribucion/mi-distribucion `
  -H "Authorization: Bearer $token"

# Linux/Mac
curl -X GET http://localhost:3000/api/distribucion/mi-distribucion \
  -H "Authorization: Bearer $TOKEN"
```

**Como Admin verás**:
```json
{
  "success": true,
  "rol": "admin",
  "estadisticas": {
    "total": 45,
    "asignadas": 42,
    "pendientes": 3,
    "porcentaje_completado": 93
  },
  "clases": [
    {
      "id": 1,
      "codigo_materia": "DER-101",
      "nombre_materia": "Derecho Civil I",
      "nivel": "1",
      "paralelo": "A",
      "numero_estudiantes": 35,
      "horario_dia": "Lunes",
      "horario_inicio": "08:00:00",
      "horario_fin": "10:00:00",
      "docente": "Dr. García",
      "estado": "asignada",
      "aula_asignada": 1,
      "aula_nombre": "Aula A-101",
      "aula_codigo": "A-101",
      "aula_capacidad": 40
    }
  ],
  "por_dia": {
    "Lunes": [...],
    "Martes": [...],
    "Miércoles": [...]
  }
}
```

---

## 📈 PASO 8: Generar Reporte Completo

```bash
# Windows PowerShell
curl -X GET "http://localhost:3000/api/distribucion/reporte?carrera_id=todas" `
  -H "Authorization: Bearer $token"

# Linux/Mac
curl -X GET "http://localhost:3000/api/distribucion/reporte?carrera_id=todas" \
  -H "Authorization: Bearer $TOKEN"
```

**Recibirás un JSON enorme** con:
- Resumen ejecutivo
- Distribución por carrera
- Distribución por día
- Distribución por horario
- Uso de aulas
- Top 10 aulas más usadas
- Top 10 docentes con más clases

---

## 🔧 PASO 9: Probar Redistribución Manual

Si quieres limpiar todo y volver a distribuir:

### 9.1. Limpiar distribución:

```bash
# Windows PowerShell
curl -X POST http://localhost:3000/api/distribucion/limpiar `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d "{\"carreraId\":null}"

# Linux/Mac
curl -X POST http://localhost:3000/api/distribucion/limpiar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"carreraId":null}'
```

### 9.2. Forzar nueva distribución:

```bash
# Windows PowerShell
curl -X POST http://localhost:3000/api/distribucion/forzar `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d "{\"carreraId\":null,\"soloNuevas\":true,\"forzar\":false}"

# Linux/Mac
curl -X POST http://localhost:3000/api/distribucion/forzar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"carreraId":null,"soloNuevas":true,"forzar":false}'
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Marca cada uno a medida que lo pruebes:

- [ ] ✅ Backend arranca sin errores
- [ ] ✅ Puedes hacer login como admin
- [ ] ✅ Puedes crear una carrera
- [ ] ✅ Puedes subir planificación Excel
- [ ] ✅ Las aulas se asignan automáticamente (ves logs en consola)
- [ ] ✅ El porcentaje de éxito es > 90%
- [ ] ✅ Puedes ver el estado de distribución
- [ ] ✅ El mapa de calor muestra datos
- [ ] ✅ Tu distribución muestra clases según tu rol
- [ ] ✅ Puedes generar reporte completo
- [ ] ✅ Puedes limpiar y redistribuir

---

## 🐛 PROBLEMAS COMUNES

### Error: "Cannot read property 'id' of undefined"
**Causa**: La carrera no existe
**Solución**: Crea la carrera primero (Paso 2)

### Error: "No aulas disponibles"
**Causa**: La tabla `aulas` está vacía
**Solución**: Ejecutar seed de aulas (si existe) o crear aulas manualmente

### Error: "Token inválido"
**Causa**: El token expiró o es incorrecto
**Solución**: Haz login nuevamente

### Excel no se procesa correctamente
**Causa**: Columnas con nombres incorrectos
**Solución**: Verifica que las columnas tengan los nombres exactos del Paso 3

---

## 📸 CAPTURAS DE ÉXITO

**Cuando todo funciona, deberías ver**:

### En la consola del backend:
```
🤖 Ejecutando distribución automática de aulas...
✅ Asignada: Derecho Civil I → Aula A-101
✅ Asignada: Derecho Penal → Aula A-102
...
✅ Distribución completada
   - Asignadas: 42
   - Sin aula: 3
🧠 Aplicando optimización con IA...
   - Utilización promedio: 78.5%
```

### En la respuesta HTTP:
```json
{
  "success": true,
  "distribucion": {
    "estado": "completada",
    "porcentaje_exito": 93
  }
}
```

---

## 🎯 SIGUIENTE: Integrar Bot de Telegram

Una vez que **TODOS los checkboxes** estén marcados, podemos integrar el bot de Telegram para que:

1. Los usuarios consulten aulas disponibles
2. Hagan reservas
3. Vean su horario
4. Reciban notificaciones

**Pero primero, prueba todo esto y dime qué ves** ✅
