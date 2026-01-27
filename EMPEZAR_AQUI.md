# 🚀 EMPEZAR AQUÍ - PRUEBA EN 3 PASOS

**Todo está listo. Comienza probando el sistema de distribución automática.**

---

## ✅ REQUISITOS PREVIOS

1. PostgreSQL corriendo
2. Base de datos creada con las tablas necesarias
3. Node.js instalado

---

## 📝 PASO 1: INICIAR EL BACKEND (2 minutos)

```bash
cd backend
npm install
npm start
```

**✅ DEBERÍAS VER**:
```
🚀 Servidor corriendo en http://localhost:3000
✅ Base de datos conectada
✅ Modelos sincronizados
```

❌ **SI HAY ERROR**: Verifica que PostgreSQL esté corriendo y las credenciales en `.env`

---

## 🔑 PASO 2: OBTENER TOKEN DE ACCESO (30 segundos)

### Opción A: Login como Admin existente

```powershell
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"admin@uide.edu.ec\",\"password\":\"admin123\"}'
```

### Opción B: Crear nuevo Admin

```powershell
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{\"nombre\":\"Admin\",\"apellido\":\"Sistema\",\"email\":\"admin@uide.edu.ec\",\"password\":\"admin123\",\"rol\":\"admin\"}'
```

**GUARDA EL TOKEN** que recibes:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**EXPORTA EL TOKEN** para usar en los siguientes comandos:
```powershell
# PowerShell
$token = "TU_TOKEN_AQUI"
```

---

## 📤 PASO 3: SUBIR PLANIFICACIÓN Y VER LA MAGIA (3 minutos)

### 3.1. Crear una carrera (si no existe)

```powershell
curl -X POST http://localhost:3000/api/carreras -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d '{\"carrera\":\"Derecho\",\"codigo\":\"DER\",\"activa\":true}'
```

**Guarda el `id` que recibes** (ejemplo: `"id": 1`)

### 3.2. Subir planificación Excel

**Necesitas un Excel con estas columnas**:
- `codigo_materia`
- `nombre_materia` (o `materia`)
- `nivel`
- `paralelo`
- `numero_estudiantes`
- `horario_dia` (Lunes, Martes, Miércoles, Jueves, Viernes)
- `horario_inicio` (formato: 08:00)
- `horario_fin` (formato: 10:00)
- `docente`

**Si ya tienes** `planificacion_derecho_ejemplo.xlsx`, úsalo:

```powershell
curl -X POST http://localhost:3000/api/planificaciones/subir -H "Authorization: Bearer $token" -F "file=@planificacion_derecho_ejemplo.xlsx" -F "carrera_id=1"
```

### 3.3. ¡VER LA DISTRIBUCIÓN AUTOMÁTICA EN ACCIÓN!

**En la consola del backend verás**:
```
📚 45 clases procesadas
💾 Guardando en base de datos...
✅ Planificación guardada: 45 clases

🤖 Ejecutando distribución automática de aulas...
🚀 Iniciando distribución...
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

**Respuesta HTTP**:
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
        "sin_aula": 3,
        "errores": 0
      },
      "porcentaje_exito": 93
    }
  }
}
```

---

## 🎯 VERIFICACIONES RÁPIDAS

### Ver el estado general

```powershell
curl -X GET http://localhost:3000/api/distribucion/estado -H "Authorization: Bearer $token"
```

### Ver el mapa de calor

```powershell
curl -X GET "http://localhost:3000/api/distribucion/heatmap?carrera_id=1" -H "Authorization: Bearer $token"
```

**Verás niveles de ocupación**:
- 🟢 **LOW**: < 40% ocupación
- 🟡 **MEDIUM**: 40-69% ocupación
- 🔴 **HIGH**: ≥ 70% ocupación

### Ver mi distribución (según tu rol)

```powershell
curl -X GET http://localhost:3000/api/distribucion/mi-distribucion -H "Authorization: Bearer $token"
```

### Generar reporte completo

```powershell
curl -X GET "http://localhost:3000/api/distribucion/reporte?carrera_id=todas" -H "Authorization: Bearer $token"
```

---

## ✅ CHECKLIST DE ÉXITO

Marca cada uno cuando funcione:

- [ ] ✅ Backend inicia sin errores
- [ ] ✅ Puedo hacer login y obtener token
- [ ] ✅ Puedo crear una carrera
- [ ] ✅ Puedo subir el Excel de planificación
- [ ] ✅ Veo logs de distribución automática en consola
- [ ] ✅ El porcentaje de éxito es > 85%
- [ ] ✅ Puedo ver el estado de distribución
- [ ] ✅ El mapa de calor muestra datos
- [ ] ✅ Puedo ver mi distribución
- [ ] ✅ Puedo generar el reporte completo

---

## 🐛 PROBLEMAS COMUNES

### "Cannot connect to database"
**Solución**: Verifica que PostgreSQL esté corriendo y las credenciales en `backend/.env`

### "No aulas disponibles"
**Solución**: Necesitas crear aulas en la tabla `aulas`. Ejecuta el seed si existe, o crea manualmente:
```sql
INSERT INTO aulas (nombre, codigo, capacidad, edificio, piso, estado, tiene_proyector)
VALUES ('Aula A-101', 'A-101', 40, 'A', 1, 'disponible', true);
```

### "Token inválido"
**Solución**: El token expiró. Vuelve a hacer login (Paso 2)

### Excel no se procesa
**Solución**: Verifica que las columnas tengan exactamente los nombres indicados arriba

---

## 📊 QUÉ ESPERAR

**Tiempo de distribución**:
- 10 clases: ~1 segundo
- 50 clases: ~3 segundos
- 100 clases: ~5 segundos

**Precisión esperada**:
- 90-95% de clases asignadas automáticamente
- 5-10% requieren intervención manual (casos especiales)

**IA optimiza**:
- Utilización de aulas
- Evita desperdicio de capacidad
- Detecta patrones y sugiere mejoras

---

## 🎉 ¿TODO FUNCIONA?

**Si todos los checkboxes están marcados**, el sistema está listo y funcionando correctamente.

**Siguiente paso**: Integrar el bot de Telegram para que usuarios puedan:
1. Consultar aulas disponibles
2. Ver su horario
3. Hacer reservas
4. Recibir notificaciones

---

## 📞 GUÍAS COMPLETAS

Si necesitas más detalles:
- [GUIA_PRUEBA_PASO_A_PASO.md](GUIA_PRUEBA_PASO_A_PASO.md) - Guía detallada con todos los casos
- [INICIO_RAPIDO_AHORA.md](INICIO_RAPIDO_AHORA.md) - Inicio rápido en 5 minutos
- [IMPLEMENTACION_COMPLETA_FINAL.md](IMPLEMENTACION_COMPLETA_FINAL.md) - Documentación técnica completa

---

## 💡 TIPS FINALES

1. **Usa Postman** para pruebas más cómodas (importa la colección del `INICIO_RAPIDO_AHORA.md`)
2. **Revisa los logs** del backend para ver el proceso de distribución en tiempo real
3. **Prueba con diferentes carreras** para ver cómo maneja múltiples planificaciones
4. **El mapa de calor** se actualiza automáticamente con cada distribución

**¡Listo para probar!** 🚀
