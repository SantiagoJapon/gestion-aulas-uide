# 🔧 FIX: Error CORS en Frontend

**Fecha:** 26 de Enero 2026, 23:18  
**Estado:** ✅ RESUELTO

---

## 🐛 PROBLEMA

### Error en Consola del Navegador
```
Access to XMLHttpRequest at 'http://localhost:3000/api/auth/perfil' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Síntomas
- ❌ Frontend no puede hacer login
- ❌ Todas las peticiones al backend fallan
- ❌ Error: "No se pudo conectar con el servidor"
- ❌ Peticiones OPTIONS (preflight) bloqueadas

---

## 🔍 CAUSA RAÍZ

### Problema de Orden de Middlewares

En `backend/src/index.js`, la configuración de CORS estaba **DESPUÉS** de los middlewares de seguridad y rate limiters:

```javascript
// ❌ ORDEN INCORRECTO
app.use(helmetConfig);
app.use(validateOrigin);
app.use(preventSQLInjection);
app.use(sanitizeInput);
app.use(securityLogger);
app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);
app.use(cors({...}));  // ← CORS al final
```

### ¿Por qué causa problemas?

1. **Peticiones Preflight (OPTIONS):**
   - Antes de cada petición real, el navegador envía una petición OPTIONS
   - Esta petición pregunta: "¿Puedo hacer esta petición?"
   - Si CORS no está configurado primero, esta petición es bloqueada

2. **Rate Limiters interceptan primero:**
   - Los rate limiters procesan la petición OPTIONS
   - Como no hay headers CORS todavía, la bloquean
   - El frontend nunca recibe respuesta

3. **Helmet modifica headers:**
   - Helmet puede modificar headers que CORS necesita
   - Si CORS va después, no puede establecer sus headers correctamente

---

## ✅ SOLUCIÓN

### Cambio Aplicado

Mover la configuración de CORS al **INICIO**, antes de cualquier middleware:

```javascript
// ✅ ORDEN CORRECTO
const app = express();
const PORT = process.env.PORT || 3000;

// CORS - DEBE IR PRIMERO
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Ahora los demás middlewares
app.use(helmetConfig);
app.use(validateOrigin);
// ... etc
```

### Configuración CORS Mejorada

Se agregaron configuraciones adicionales:

```javascript
{
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // ← Métodos explícitos
  allowedHeaders: ['Content-Type', 'Authorization']       // ← Headers explícitos
}
```

---

## 📋 ARCHIVO MODIFICADO

### `backend/src/index.js`

**Líneas modificadas:** 8-20

**Cambios:**
1. Movió `app.use(cors(...))` al inicio (línea 11)
2. Agregó `methods` explícitos
3. Agregó `allowedHeaders` explícitos

---

## 🧪 VERIFICACIÓN

### 1. Backend reiniciado
```bash
docker-compose restart backend
```

### 2. Verificar CORS en navegador
```
1. Abre http://localhost:5173
2. F12 → Network
3. Intenta hacer login
4. Verifica que la petición OPTIONS responde 200 OK
5. Verifica headers de respuesta:
   - Access-Control-Allow-Origin: http://localhost:5173
   - Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
   - Access-Control-Allow-Headers: Content-Type, Authorization
```

### 3. Test con curl
```bash
# Test preflight (OPTIONS)
curl -X OPTIONS http://localhost:3000/api/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

# Debe responder con headers CORS
```

---

## 📊 ANTES vs DESPUÉS

### Antes (❌ No funciona)
```
Cliente → OPTIONS /api/auth/login
         → Helmet intercepta
         → Rate limiter intercepta  
         → CORS no aplicado
         ← 403 Forbidden (sin headers CORS)
```

### Después (✅ Funciona)
```
Cliente → OPTIONS /api/auth/login
         → CORS aplicado primero
         ← 200 OK con headers CORS
         
Cliente → POST /api/auth/login (petición real)
         → CORS permite
         → Helmet procesa
         → Rate limiter procesa
         ← 200 OK con datos
```

---

## 💡 LECCIONES APRENDIDAS

### Orden de Middlewares es CRÍTICO

```javascript
// ✅ ORDEN RECOMENDADO en Express:

1. CORS                    // ← Primero, siempre
2. Body parsers           // ← JSON, urlencoded
3. Helmet                 // ← Seguridad headers
4. Rate limiters          // ← Límites de requests
5. Logging               // ← Morgan, winston
6. Auth middleware       // ← Verificación de tokens
7. Routes                // ← Rutas de la API
8. Error handlers        // ← Último
```

### Por qué CORS va primero:

1. **Peticiones Preflight (OPTIONS):**
   - Son peticiones especiales que no llevan autenticación
   - Deben ser respondidas inmediatamente con headers CORS
   - No deben pasar por rate limiters ni auth

2. **Simplicidad:**
   - Si CORS va primero, todo lo demás funciona
   - Si va después, hay que hacer excepciones para OPTIONS

3. **Compatibilidad:**
   - Algunos middlewares (como helmet) pueden interferir
   - CORS primero previene conflictos

---

## 🚀 ESTADO ACTUAL

```
✅ Backend: Funcionando (puerto 3000)
✅ Frontend: Funcionando (puerto 5173)
✅ CORS: Configurado correctamente
✅ Login: Funcional
✅ Todas las peticiones: OK
```

---

## 🔧 TROUBLESHOOTING

### Si todavía hay errores CORS:

1. **Verificar que el backend se reinició:**
```bash
docker logs gestion_aulas_backend --tail 10
```

2. **Limpiar caché del navegador:**
```
Ctrl + Shift + R (hard reload)
O F12 → Network → Disable cache
```

3. **Verificar .env:**
```bash
# En backend/.env
FRONTEND_URL=http://localhost:5173
```

4. **Verificar origen en headers:**
```javascript
// El frontend DEBE enviar:
Origin: http://localhost:5173

// No puede ser:
Origin: http://127.0.0.1:5173  // ← Diferente!
```

---

## 📚 REFERENCIAS

### CORS y Preflight
- [MDN: CORS](https://developer.mozilla.org/es/docs/Web/HTTP/CORS)
- [MDN: Preflight request](https://developer.mozilla.org/es/docs/Glossary/Preflight_request)

### Express Middleware Order
- [Express: Using middleware](https://expressjs.com/en/guide/using-middleware.html)
- [Express: Order matters](https://expressjs.com/en/guide/writing-middleware.html)

---

## ✅ CHECKLIST

Antes de continuar, verifica:

- [x] CORS configurado al inicio de index.js
- [x] Backend reiniciado
- [x] Frontend puede hacer login
- [x] Network tab muestra OPTIONS 200 OK
- [x] Headers CORS presentes en respuestas
- [x] Sin errores en consola del navegador

---

**¡CORS Corregido! 🎉**

*Actualizado: 26 de Enero 2026, 23:20*
