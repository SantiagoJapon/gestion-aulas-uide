# Contrato de Eventos — Backend ↔ n8n

> Documento maestro de integración. Define cómo el backend y n8n se comunican.
> Versión del contrato: **v1**. Cualquier cambio de payload incrementa la versión.

---

## 1. Convenciones de transporte

- **Protocolo**: HTTP POST, `Content-Type: application/json`.
- **Endpoint único**: el backend llama siempre a `${N8N_WEBHOOK_URL}/maestro`.
  - Local: `http://localhost:5678/webhook/maestro`
  - Docker/prod: `http://n8n:5678/webhook/maestro`
- **Discriminador**: cada evento se identifica por el campo `accion` dentro del body.
  El workflow maestro de n8n hace `Switch` sobre `accion` y enruta al sub-flujo correcto.
- **Idempotencia**: cuando aplique, el backend incluye un `evento_id` (UUID) para que
  n8n pueda descartar duplicados si el evento se reintenta.

### Envelope común (todos los eventos lo comparten)

```json
{
  "version": "v1",
  "accion": "<nombre_del_evento>",
  "evento_id": "uuid-v4",
  "timestamp": "2026-06-22T14:30:00.000Z",
  "...campos específicos del evento..."
}
```

---

## 2. Semántica de llamada

| Modo | Cuándo se usa | Comportamiento si n8n falla |
|------|---------------|------------------------------|
| **fire-and-forget** | Efectos secundarios (notificaciones, reportes) | El backend NO espera. Captura el rechazo con `.catch()` y solo loguea. El flujo principal continúa. |
| **request-response** | Cuando el backend necesita el resultado (distribución vía n8n con fallback) | El backend espera con `timeout`. Si vence, cae al algoritmo local. |

**Regla de oro**: ningún evento de efecto secundario debe poder tumbar el flujo principal.
Si n8n está caído, el usuario igual puede subir Excel, reservar y ver horarios.

---

## 3. Eventos BACKEND → n8n (salientes)

### 3.1 `reporte_distribucion`  *(fire-and-forget)*
Disparado tras completar una distribución. **Por defecto el reporte se arma con un
template determinista en el backend (costo $0)** y viene listo en el campo `mensaje`.
n8n solo lo reenvía por WhatsApp. La IA (GPT) queda apagada salvo `usar_ia: true`.

```json
{
  "version": "v1",
  "accion": "reporte_distribucion",
  "evento_id": "uuid",
  "carrera_id": 12,
  "usuario_id": 5,
  "estadisticas": {
    "total": 50,
    "exitosas": 47,
    "fallidas": 3,
    "sobrecupos": 1,
    "eficiencia": 0.94
  },
  "mensaje": "📊 *Distribución de aulas completada*\n\nSe asignaron *47 de 50*...",
  "usar_ia": false,
  "timestamp": "ISO-8601"
}
```
**Comportamiento en n8n**:
- `usar_ia: false` (default) → enviar `mensaje` tal cual por WhatsApp. **No llamar a GPT.**
- `usar_ia: true` → opcional, usar GPT para enriquecer (controlado por `AI_REPORTE_DISTRIBUCION=true`).

**Respuesta esperada**: `200 { success: true }`. El backend la ignora (solo loguea).
**Implementado en**: `N8nService.notificarDistribucionCompletada()` + `construirReporteDistribucion()`

---

### 3.2 `notificar_director`  *(fire-and-forget)*
Disparado al crear un director o asignarle carrera. Envía credenciales por WhatsApp.

```json
{
  "version": "v1",
  "accion": "notificar_director",
  "evento_id": "uuid",
  "datos": {
    "nombre": "Juan Pérez",
    "telefono": "0991234567",
    "password_temporal": "uide2026",
    "carrera": "Ingeniería en Software"
  },
  "timestamp": "ISO-8601"
}
```
**Implementado en**: `N8nService.notificarDirector()`

---

### 3.3 `notificar_reserva`  *(fire-and-forget)* — NUEVO (Proceso 1)
Disparado al crear/aprobar/rechazar una reserva. n8n hace fan-out a WhatsApp + Email + in-app.

```json
{
  "version": "v1",
  "accion": "notificar_reserva",
  "evento_id": "uuid",
  "tipo": "creada | aprobada | rechazada",
  "reserva": {
    "id": 88,
    "espacio": "Auditorio",
    "fecha": "2026-06-25",
    "hora_inicio": "10:00",
    "hora_fin": "12:00",
    "solicitante_nombre": "Ana López",
    "solicitante_rol": "director",
    "telefono": "0997654321",
    "motivo": "Defensa de tesis"
  },
  "timestamp": "ISO-8601"
}
```
**Estado**: a implementar como `N8nService.notificarReserva()`.

---

### 3.4 `distribuir_aulas`  *(request-response)*
Solicita a n8n ejecutar la distribución. Si n8n no responde en 60s, el backend cae
a `distribucion.service.js` (algoritmo local).

```json
{
  "version": "v1",
  "accion": "distribuir_aulas",
  "carrera_id": 12
}
```
**Respuesta esperada**:
```json
{ "success": true, "estadisticas": { "total": 50, "exitosas": 47, "fallidas": 3 } }
```
**Implementado en**: `N8nService.ejecutarDistribucion()`

---

### 3.5 `subir_planificacion` / `subir_estudiantes`  *(request-response)*
> NOTA ARQUITECTÓNICA: estos eventos existen pero se recomienda **migrar el parseo de Excel
> al backend** (ya tiene parser robusto de 1730 líneas). n8n debe orquestar, no parsear el
> núcleo transaccional. Mantener solo si se justifica enriquecimiento con IA que el backend
> no pueda hacer. Ver CONTRATO sección 6.

---

## 4. Llamadas n8n → BACKEND (entrantes)

Para el chatbot y los cron, n8n llama al backend. El backend NO necesita endpoints nuevos:
n8n reutiliza la API REST existente con un token de servicio.

### 4.1 Chatbot WhatsApp (Proceso 3)
```
Evolution → webhook n8n → [clasificar intención] → GET /api/distribucion/mi-distribucion
                                                  → GET /api/reservas/disponibilidad
                                                  → POST /api/reservas
          → respuesta a Evolution
```
**Auth**: n8n usa un JWT de servicio (rol con permisos mínimos). NO usar el token de un usuario real.

### 4.2 Cron / tareas programadas (Proceso 4)
```
[Schedule diario 7am] → GET /api/distribucion/clases?dia=manana → Evolution (recordatorios)
[Schedule domingo 2am] → DELETE distribuciones antiguas (endpoint admin o query directa)
```

---

## 5. Manejo de errores y reintentos

| Situación | Quién la maneja | Acción |
|-----------|-----------------|--------|
| n8n caído (fire-and-forget) | Backend | `.catch()` + log. No afecta al usuario. |
| n8n timeout (request-response) | Backend | Fallback a algoritmo local. |
| API externa falla dentro de n8n (Evolution/OpenAI/SMTP) | n8n | Retry x3 con espera exponencial (nodo Error Trigger). |
| Evento duplicado | n8n | Descartar por `evento_id` ya procesado. |

---

## 6. Frontera arquitectónica (lo que defiende la tesis)

```
NÚCLEO (backend, transaccional)        ORQUESTACIÓN (n8n, efectos)
─────────────────────────────         ──────────────────────────
✓ Parser de Excel                      ✓ Notificaciones multicanal
✓ Algoritmo de distribución            ✓ Reportes con IA
✓ Auth / Roles                         ✓ Chatbot WhatsApp
✓ CRUD reservas                        ✓ Cron / recordatorios
✓ Validaciones de negocio              ✓ Integraciones externas
```
n8n nunca escribe lógica de negocio crítica. Lee de la BD para ETL/reportes y orquesta
servicios externos. Si se cae, el sistema sigue operativo (degradación elegante).

---

## 7. Changelog del contrato

| Versión | Fecha | Cambio |
|---------|-------|--------|
| v1 | 2026-06-22 | Contrato inicial. Formaliza eventos existentes + define `notificar_reserva`, chatbot y cron. |
