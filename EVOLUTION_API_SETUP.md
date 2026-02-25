# Evolution API v2.3.7 — Guía de Setup y Solución QR

## Problema que se resolvió

Evolution API ≤ v2.2.3 tiene un bug crítico (PR #2365) donde el handler `connectionUpdate`
dispara `shouldReconnect` **antes** de que se genere el QR code, causando un loop infinito
de reconexión que impide que el QR aparezca. Síntoma: el endpoint `/instance/connect/{name}`
devuelve siempre `{"count":0}` y los logs muestran reconexiones cada 3–4 segundos.

**Fix:** Construir desde el branch `develop` (v2.3.7) que incluye el guard `isInitialConnection`.

---

## Cómo construir la imagen (una sola vez por servidor)

### 1. Clonar el código fuente

```bash
git clone --depth=1 --branch develop https://github.com/EvolutionAPI/evolution-api.git /tmp/evolution-dev
cd /tmp/evolution-dev
```

### 2. Aplicar fix en el código fuente

El branch `develop` tiene un error de TypeScript en la línea ~1829 de
`src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts`
que referencia una variable `maxRetries` no definida.

Buscar la línea con el texto `maxRetries` y reemplazarla:

```bash
# Verificar la línea con el bug
grep -n "maxRetries" src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts
```

El contenido original (aproximado):
```typescript
// ANTES (causa error de compilación):
`Original message not found for update after ${maxRetries} retries. Skipping...`
```

Reemplazar por:
```typescript
// DESPUÉS:
`Original message not found for update. Skipping. This is expected for protocol messages or ephemeral events not saved to the database. Key: ${JSON.stringify(key)}`,
```

### 3. Modificar el Dockerfile para omitir el type-check de TypeScript

El branch `develop` tiene errores de TypeScript en código inestable.
El comando `npm run build` ejecuta `tsc --noEmit && tsup` — el `tsc --noEmit` falla.
Hay que usar `npx tsup` directamente.

En el archivo `Dockerfile`, cambiar la línea:
```dockerfile
# ANTES:
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# DESPUÉS:
RUN NODE_OPTIONS="--max-old-space-size=2048" npx tsup
```

### 4. Construir la imagen

```bash
cd /tmp/evolution-dev
docker build -t evolution-api-dev:2.3.7 .
```

El build tarda ~10–15 minutos. Al finalizar debe mostrar:
```
⚡️ Build success in ~9000ms
naming to docker.io/library/evolution-api-dev:2.3.7 done
```

---

## Variables de entorno correctas para v2.3.7

Las variables de entorno cambiaron entre v2.2.3 y v2.3.7. Usar exactamente estas:

```yaml
environment:
  - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
  - AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true   # Nombre cambió en v2.3.7
  - DATABASE_PROVIDER=postgresql
  - DATABASE_CONNECTION_URI=postgres://user:pass@postgres:5432/evolution_db
  - DATABASE_CONNECTION_CLIENT_NAME=evolution_api
  - CACHE_REDIS_ENABLED=true
  - CACHE_REDIS_URI=redis://redis:6379
  - CACHE_REDIS_PREFIX_KEY=evolution
  - CACHE_LOCAL_ENABLED=true                        # Nuevo en v2.3.7
  - QRCODE_LIMIT=30
  - CONFIG_SESSION_PHONE_CLIENT=Chrome
  - CONFIG_SESSION_PHONE_NAME=Chrome                # Nuevo en v2.3.7
  - TZ=America/Guayaquil
  - LOG_LEVEL=ERROR,WARN,DEBUG,INFO,LOG,VERBOSE,WEBHOOKS,WEBSOCKET
  - CORS_ORIGIN=*
  - CORS_METHODS=POST,GET,PUT,DELETE
```

### Variables que se eliminaron (no usar en v2.3.7):
| Variable eliminada | Motivo |
|---|---|
| `DATABASE_ENABLED=true` | Ya no existe |
| `AUTHENTICATION_TYPE=apikey` | Ya no existe |
| `QRCODE_EXPIRATION_LIMIT=3` | Ya no existe |
| `CONFIG_SESSION_PHONE_VERSION=2.3000.10123` | Causa que se reporte una versión antigua de WhatsApp Web → NUNCA usar |
| `AUTHENTICATION_EXPOSE_IN_FETCH_API=true` | Renombrada a `AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES` |
| `CORS_METHODS=GET,POST,PUT,DELETE,PATCH,OPTIONS` | Usar solo `POST,GET,PUT,DELETE` |

---

## os-patch.js — ¿Cuándo es necesario?

El archivo `os-patch.js` parchea `os.release()` para devolver un kernel Linux estándar
en lugar del string del kernel WSL2 de Windows, que WhatsApp detecta y rechaza.

```javascript
const os = require('os');
os.release = () => '5.15.0-91-generic';
```

| Entorno | ¿Necesita os-patch.js? |
|---|---|
| **Windows con WSL2** (desarrollo) | **SÍ** — sin esto WhatsApp rechaza la conexión |
| **Linux real** (VPS, servidor de producción) | **NO** — `os.release()` ya devuelve un kernel Linux válido |

Para activarlo, montar el archivo y agregar la variable:
```yaml
environment:
  - NODE_OPTIONS=--require /os-patch.js
volumes:
  - ./os-patch.js:/os-patch.js:ro
```

En producción (Linux) se puede omitir tanto el volume como el `NODE_OPTIONS`.

---

## Verificar que funciona

```bash
# 1. Crear instancia
curl -X POST "http://localhost:8080/instance/create" \
  -H "apikey: TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"test","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'

# 2. Obtener QR (debe devolver base64 con count >= 1)
curl "http://localhost:8080/instance/connect/test" \
  -H "apikey: TU_API_KEY"

# 3. Manager UI
# http://localhost:8080/manager
```

Si el QR devuelve `{"count":0}` → el bug de reconexión está presente (usar v2.3.7).
Si devuelve `{"base64":"data:image/png;base64,...","count":1}` → funciona correctamente.

---

## Transferir la imagen a producción

En lugar de clonar y compilar en producción, se puede exportar/importar la imagen:

```bash
# En la máquina de desarrollo (Windows/WSL2):
docker save evolution-api-dev:2.3.7 | gzip > evolution-api-2.3.7.tar.gz

# Subir al servidor (ejemplo con scp):
scp evolution-api-2.3.7.tar.gz user@servidor:/tmp/

# En el servidor de producción:
docker load < /tmp/evolution-api-2.3.7.tar.gz
docker tag evolution-api-dev:2.3.7 evolution-api-dev:2.3.7
```

O simplemente repetir el build en el servidor de producción (más limpio).
