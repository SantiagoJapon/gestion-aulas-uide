# ⚡ INICIO RÁPIDO - PROBAR AHORA

**Todo está listo. Aquí está cómo empezar en 5 minutos.**

---

## 🚀 PASO 1: Iniciar el Backend

```bash
cd backend
npm install  # Si es primera vez
npm start
```

**Deberías ver**:
```
🚀 Servidor corriendo en http://localhost:3000
✅ Base de datos conectada
✅ Modelos sincronizados: Clase, Distribucion...
```

---

## 🔑 PASO 2: Obtener un Token JWT

### Opción A: Login como Admin

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@uide.edu.ec",
    "password": "tu_password"
  }'
```

### Opción B: Login como Director

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "director.derecho@uide.edu.ec",
    "password": "tu_password"
  }'
```

**Guarda el token** que recibes en `"token": "..."`

---

## 📤 PASO 3: Subir una Planificación

**Necesitas**:
- Un archivo Excel con las columnas:
  - codigo_materia
  - nombre_materia
  - nivel
  - paralelo
  - numero_estudiantes
  - horario_dia (Lunes, Martes, etc.)
  - horario_inicio (08:00)
  - horario_fin (10:00)
  - docente

**Ejemplo**: Ya tienes `planificacion_derecho_ejemplo.xlsx` en la raíz

```bash
curl -X POST http://localhost:3000/api/planificaciones/subir \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -F "file=@planificacion_derecho_ejemplo.xlsx" \
  -F "carrera_id=1"
```

**¡Espera 3-5 segundos!** 🤖

**Recibirás**:
```json
{
  "success": true,
  "mensaje": "Planificación subida y aulas distribuidas automáticamente",
  "resultado": {
    "clases_guardadas": 45,
    "distribucion": {
      "estado": "completada",
      "estadisticas": {
        "total_procesadas": 45,
        "asignadas": 42,
        "sin_aula": 3
      },
      "porcentaje_exito": 93
    }
  }
}
```

**¡Ya está! Las aulas se asignaron automáticamente** ✅

---

## 📊 PASO 4: Ver el Mapa de Calor

```bash
curl -X GET "http://localhost:3000/api/distribucion/heatmap" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

**Verás**:
```json
{
  "success": true,
  "estadisticas": {
    "total_aulas_disponibles": 50,
    "promedio_ocupacion": 65
  },
  "puntos": [
    {
      "dia": "Lunes",
      "hora": 9,
      "nivel": "HIGH",
      "porcentaje_ocupacion": 75
    }
  ],
  "detalles": {
    "Lunes_9": [
      {
        "aula_nombre": "A-101",
        "materia": "Cálculo II",
        "docente": "Dr. Arreaga",
        "estudiantes": 34
      }
    ]
  }
}
```

---

## 👁️ PASO 5: Ver Tu Distribución (según tu rol)

```bash
curl -X GET "http://localhost:3000/api/distribucion/mi-distribucion" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

**Si eres Admin**: Ves todo
**Si eres Director**: Solo tu carrera
**Si eres Docente**: Solo tus clases

---

## 📈 PASO 6: Generar Reporte Completo

```bash
curl -X GET "http://localhost:3000/api/distribucion/reporte?carrera_id=todas" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

**Recibirás un JSON enorme con**:
- Resumen ejecutivo
- Estadísticas por carrera
- Distribución por día
- Distribución por horario
- Top 10 aulas
- Top 10 docentes
- Uso detallado de aulas

**Puedes exportarlo a PDF/Excel desde el frontend**

---

## 🔧 PASO 7: Forzar Redistribución (Admin)

Si quieres redistribuir todo de nuevo:

```bash
# Primero limpiar
curl -X POST http://localhost:3000/api/distribucion/limpiar \
  -H "Authorization: Bearer TU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"carreraId": null}'

# Luego forzar
curl -X POST http://localhost:3000/api/distribucion/forzar \
  -H "Authorization: Bearer TU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "carreraId": null,
    "soloNuevas": true,
    "forzar": false
  }'
```

---

## 🧪 PRUEBAS CON POSTMAN

**Importa esta colección**:

```json
{
  "info": {
    "name": "UIDE Gestión Aulas",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Login Admin",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"admin@uide.edu.ec\",\"password\":\"admin123\"}"
        },
        "url": {
          "raw": "http://localhost:3000/api/auth/login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "auth", "login"]
        }
      }
    },
    {
      "name": "2. Subir Planificación",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"}
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {"key": "file", "type": "file", "src": "/path/to/planificacion.xlsx"},
            {"key": "carrera_id", "value": "1", "type": "text"}
          ]
        },
        "url": {
          "raw": "http://localhost:3000/api/planificaciones/subir",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "planificaciones", "subir"]
        }
      }
    },
    {
      "name": "3. Ver Mapa de Calor",
      "request": {
        "method": "GET",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"}
        ],
        "url": {
          "raw": "http://localhost:3000/api/distribucion/heatmap",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "distribucion", "heatmap"]
        }
      }
    },
    {
      "name": "4. Mi Distribución",
      "request": {
        "method": "GET",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"}
        ],
        "url": {
          "raw": "http://localhost:3000/api/distribucion/mi-distribucion",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "distribucion", "mi-distribucion"]
        }
      }
    },
    {
      "name": "5. Generar Reporte",
      "request": {
        "method": "GET",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"}
        ],
        "url": {
          "raw": "http://localhost:3000/api/distribucion/reporte?carrera_id=todas",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "distribucion", "reporte"],
          "query": [
            {"key": "carrera_id", "value": "todas"}
          ]
        }
      }
    }
  ]
}
```

**Guarda como**: `UIDE-API.postman_collection.json`

---

## 🐛 DEBUGGING

Si algo falla, revisa:

1. **Backend logs**: Mira la consola donde ejecutaste `npm start`
2. **Base de datos**: Verifica que PostgreSQL esté corriendo
3. **Token**: Asegúrate de estar usando un token válido
4. **Excel**: Verifica que el Excel tenga las columnas correctas

**Logs útiles**:
```
🤖 Ejecutando distribución automática de aulas...
✅ Distribución completada
   - Asignadas: 42
   - Sin aula: 3
   - Errores: 0
🧠 Aplicando optimización con IA...
   - Utilización promedio: 78.5%
   - Sugerencias: 2
```

---

## 🎯 VERIFICAR QUE TODO FUNCIONA

**Checklist**:
- [ ] Backend arranca sin errores
- [ ] Puedes hacer login y obtener token
- [ ] Puedes subir una planificación
- [ ] Las aulas se asignan automáticamente
- [ ] El mapa de calor muestra datos
- [ ] Mi distribución muestra clases según tu rol
- [ ] El reporte se genera correctamente

**Si todos están ✅ = TODO FUNCIONA** 🎉

---

## 📞 SIGUIENTE: Bot de Telegram

Una vez que el backend funcione, podemos integrar:
1. Bot de Telegram para consultas
2. Notificaciones automáticas
3. Reservas en tiempo real

**Pero primero, prueba el backend** ✅

---

## 💡 TIPS

- **Performance**: Para 100 clases toma ~3-5 segundos
- **IA**: Se ejecuta automáticamente, no necesitas activarla
- **Optimización**: Cuantas más planificaciones subes, mejor aprende
- **Reportes**: Genera el reporte al final del día para análisis

**¡Listo! Ahora tienes un sistema completo funcionando** 🚀
