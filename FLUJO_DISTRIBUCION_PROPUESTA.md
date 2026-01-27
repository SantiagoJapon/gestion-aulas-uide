# 🔄 FLUJO DE DISTRIBUCIÓN DE AULAS - COMPARACIÓN

## 📊 SITUACIÓN ACTUAL (ROTA)

```
┌─────────────┐
│  Director   │ Sube planificación Excel
└──────┬──────┘
       │ POST /api/planificaciones/subir
       ▼
┌─────────────────────────────────┐
│   Backend Express               │
│   planificacionController.js    │
│                                 │
│   1. Lee Excel (XLSX)          │
│   2. Extrae clases             │
│   3. Guarda en BD (tabla: clases) │
└──────┬──────────────────────────┘
       │ Intenta llamar a N8N ❌
       │ POST /webhook/procesar-planificacion
       ▼
┌─────────────────────────────────┐
│   N8N (workflow_maestro)        │
│   ❌ ENDPOINT NO EXISTE         │
└──────┬──────────────────────────┘
       │ ⚠️ Falla silenciosamente
       │
       ▼
  ❌ NO SE ASIGNAN AULAS
  ❌ Clases quedan en estado "pendiente"
```

---

## ✅ OPCIÓN 1: SIN N8N (RECOMENDADA)

### **Ventajas**:
- ✅ Más simple y rápido
- ✅ Sin dependencias externas
- ✅ Código ya implementado
- ✅ Fácil de debuggear
- ✅ Sin latencia de red

### **Flujo Propuesto**:

```
┌─────────────┐
│  Director   │ Sube planificación Excel
└──────┬──────┘
       │ POST /api/planificaciones/subir
       ▼
┌─────────────────────────────────────────────┐
│   Backend Express                           │
│   planificacionController.js                │
│                                             │
│   1. Lee Excel (XLSX)                      │
│   2. Extrae clases                         │
│   3. Guarda en BD (tabla: clases)          │
│   4. ✅ Llama DIRECTAMENTE a:              │
│      DistribucionService.ejecutarDistribucion() │
└──────┬──────────────────────────────────────┘
       │ Distribución en el MISMO proceso
       ▼
┌─────────────────────────────────────────────┐
│   DistribucionService                       │
│   distribucion.service.js                   │
│                                             │
│   🤖 Algoritmo Inteligente:                │
│   ├─ Ordena clases por tamaño             │
│   ├─ Busca aulas compatibles              │
│   ├─ Calcula score de prioridad           │
│   ├─ Verifica disponibilidad horaria      │
│   ├─ Detecta conflictos                   │
│   └─ Asigna mejor aula                    │
│                                             │
│   Actualiza BD:                            │
│   ├─ clases.aula_asignada = aula_id      │
│   └─ distribucion (tabla) con detalles    │
└──────┬──────────────────────────────────────┘
       │ ✅ Distribución completada
       │
       ▼
┌─────────────────────────────────────────────┐
│   OPCIONAL: Notificaciones                  │
│   (Aquí SÍ usar N8N)                       │
│                                             │
│   POST /webhook/notificar                  │
│   ├─ Enviar Telegram al Director           │
│   ├─ Enviar Email                          │
│   └─ Webhook a otros sistemas              │
└─────────────────────────────────────────────┘
```

### **Tiempo de Ejecución**:
- ⚡ < 5 segundos para 100 clases
- ⚡ < 15 segundos para 500 clases

---

## 🔄 OPCIÓN 2: CON N8N (MÁS COMPLEJA)

### **Ventajas**:
- ✅ Separación de responsabilidades
- ✅ Escalabilidad (si crece mucho)
- ✅ Interfaz visual para workflows

### **Desventajas**:
- ⚠️ Más complejo
- ⚠️ Requiere implementar workflows
- ⚠️ Latencia de red (HTTP)
- ⚠️ Difícil de debuggear
- ⚠️ Punto único de falla

### **Flujo Propuesto**:

```
┌─────────────┐
│  Director   │ Sube planificación Excel
└──────┬──────┘
       │ POST /api/planificaciones/subir
       ▼
┌─────────────────────────────────────────────┐
│   Backend Express                           │
│   planificacionController.js                │
│                                             │
│   1. Lee Excel (XLSX)                      │
│   2. Extrae clases                         │
│   3. Guarda en BD (tabla: clases)          │
│   4. ⚠️ Llama a N8N vía HTTP              │
└──────┬──────────────────────────────────────┘
       │ POST http://n8n:5678/webhook/procesar-planificacion
       │ (Latencia: ~100-500ms)
       ▼
┌─────────────────────────────────────────────┐
│   N8N Workflow                              │
│   (HAY QUE IMPLEMENTARLO)                   │
│                                             │
│   Nodo 1: Webhook Trigger                  │
│   Nodo 2: HTTP Request a Backend           │
│           GET /api/distribucion/clases     │
│   Nodo 3: Function - Lógica de asignación │
│   Nodo 4: HTTP Request a Backend           │
│           POST /api/distribucion/asignar   │
│   Nodo 5: Notificaciones                   │
└──────┬──────────────────────────────────────┘
       │ ⚠️ Múltiples llamadas HTTP
       │
       ▼
┌─────────────────────────────────────────────┐
│   Backend Express                           │
│   Recibe asignaciones de N8N                │
│   Actualiza BD                              │
└─────────────────────────────────────────────┘
```

### **Tiempo de Ejecución**:
- ⚠️ ~10-30 segundos para 100 clases (HTTP overhead)
- ⚠️ ~30-60 segundos para 500 clases

### **Requiere Implementar**:
1. Workflow en N8N para procesamiento
2. Endpoints adicionales en Backend:
   - `GET /api/distribucion/clases-pendientes`
   - `POST /api/distribucion/asignar-batch`
3. Manejo de errores entre sistemas
4. Logs centralizados

---

## 🎯 RECOMENDACIÓN: OPCIÓN 1

### **Por qué Opción 1 es mejor**:

1. **Simplicidad**:
   - Todo el código en un solo lugar
   - Fácil de entender y mantener

2. **Performance**:
   - Sin latencia de red
   - Transacciones atómicas en BD

3. **Confiabilidad**:
   - Sin puntos de falla externos
   - Rollback automático si hay error

4. **Desarrollo**:
   - ✅ Código ya implementado
   - ✅ Probado y funcionando
   - ✅ Sin dependencias adicionales

5. **Debugging**:
   - Logs centralizados
   - Stack traces completos
   - Fácil de reproducir errores

---

## 🔧 ROL DE N8N EN OPCIÓN 1

N8N sigue siendo útil para:

### **1. Notificaciones Automáticas**
```
Distribución completada
   ↓
POST /webhook/notificar
   ├─ Telegram → Director
   ├─ Email → Admin
   └─ SMS → Coordinador
```

### **2. Bot de Telegram**
```
Usuario → /aulas lunes 10:00
   ↓
N8N procesa comando
   ↓
GET /api/distribucion/mi-distribucion
   ↓
Responde con aulas disponibles
```

### **3. Integraciones Externas**
```
Sistema externo → Webhook N8N
   ↓
N8N transforma datos
   ↓
POST /api/planificaciones/subir
```

### **4. Tareas Programadas**
```
Cron: Todos los días 7:00 AM
   ↓
N8N ejecuta workflow
   ├─ Generar reporte diario
   ├─ Enviar por email
   └─ Archivar en Google Drive
```

---

## 📋 CAMBIOS NECESARIOS PARA OPCIÓN 1

### **Archivo**: `backend/src/controllers/planificacionController.js`

**Línea ~195-236** (función `subirPlanificacion`):

**ANTES (ROTO)**:
```javascript
// Intentar activar distribución automática vía N8N
try {
  await axios.post(
    process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/maestro',
    {
      accion: 'subir_planificacion',
      carrera_id: carreraSeleccionada.id,
      trigger: 'auto',
      origen: 'nueva_planificacion'
    },
    { timeout: 120000 }
  );
  // ...
} catch (n8nError) {
  console.warn('⚠️ No se pudo activar distribución automática:', n8nError.message);
  // Falla silenciosamente ❌
}
```

**DESPUÉS (FUNCIONA)**:
```javascript
const DistribucionService = require('../services/distribucion.service');

// ...después de guardar clases...

// Ejecutar distribución automática DIRECTAMENTE
try {
  console.log('🚀 Iniciando distribución automática...');

  const resultado = await DistribucionService.ejecutarDistribucion({
    carreraId: carreraSeleccionada.id,
    soloNuevas: true,
    forzar: false
  });

  console.log('✅ Distribución completada:', resultado.estadisticas);

  res.json({
    success: true,
    mensaje: 'Planificación subida y aulas distribuidas automáticamente',
    resultado: {
      clases_guardadas: clasesGuardadas,
      errores: errores.length > 0 ? errores : null,
      distribucion: resultado
    }
  });

  // OPCIONAL: Notificar vía N8N (no bloquea si falla)
  notificarN8N({
    evento: 'distribucion_completada',
    carrera: carreraSeleccionada.carrera,
    estadisticas: resultado.estadisticas
  }).catch(err => console.warn('⚠️ Notificación N8N falló:', err.message));

} catch (error) {
  console.error('❌ Error en distribución:', error);
  res.status(500).json({
    success: false,
    mensaje: 'Planificación guardada pero distribución falló',
    error: error.message
  });
}
```

---

## ⏱️ TIEMPO DE IMPLEMENTACIÓN

| Opción | Tiempo | Complejidad | Riesgo |
|--------|--------|-------------|--------|
| **Opción 1 (Sin N8N)** | 30 minutos | ⭐ Baja | ✅ Bajo |
| **Opción 2 (Con N8N)** | 4-6 horas | ⭐⭐⭐ Alta | ⚠️ Medio |

---

## 💬 DECISIÓN

**¿Qué opción prefieres?**

- [ ] **Opción 1**: Sin N8N para distribución (Recomendada)
- [ ] **Opción 2**: Con N8N para distribución

**Si eliges Opción 1**, en 30 minutos tendrás:
- ✅ Distribución automática funcionando
- ✅ Carga de planificaciones completa
- ✅ Mapa de calor operativo
- ✅ Reportes generándose
- ✅ Sistema listo para producción

**Si eliges Opción 2**, necesitarás:
- ⚠️ 4-6 horas para implementar workflows
- ⚠️ Pruebas exhaustivas de integración
- ⚠️ Manejo de errores entre sistemas
- ⚠️ Monitoreo adicional de N8N

---

## 🚀 SIGUIENTE PASO

Una vez que decidas, seguimos con:
1. Bot de Telegram (integración)
2. Frontend para visualizar mapa de calor
3. Exportación de reportes a PDF/Excel
4. Pruebas con planificaciones reales
