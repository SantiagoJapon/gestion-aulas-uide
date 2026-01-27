# 🎯 DESPLIEGUE GRATIS - RESUMEN VISUAL

```
┌─────────────────────────────────────────────────────────┐
│  TU SISTEMA LOCAL (AHORA)                               │
│                                                          │
│  Frontend → http://localhost:5173  ✅                   │
│  Backend  → http://localhost:3000  ✅                   │
│  BD       → SQLite (13 clases)     ✅                   │
│  Login    → admin@uide.edu.ec      ✅                   │
└─────────────────────────────────────────────────────────┘
                           ▼
                    DESPLEGAR EN
                           ▼
┌─────────────────────────────────────────────────────────┐
│  TU SISTEMA EN LA NUBE (10 MIN)                         │
│                                                          │
│  Frontend → https://tu-app.vercel.app       (VERCEL)    │
│  Backend  → https://tu-backend.onrender.com (RENDER)    │
│  BD       → SQLite (se crea con scripts)                │
│  Login    → admin@uide.edu.ec                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 PASOS (10 MINUTOS TOTAL)

### ✅ PASO 1: PUSH A GITHUB (2 MIN)
```bash
git add .
git commit -m "Sistema listo"
git push origin main
```
**Lee**: `PUSH_A_GITHUB_AHORA.md` si tienes problemas

---

### ✅ PASO 2: VERCEL - FRONTEND (3 MIN)

1. 🌐 Ve a: https://vercel.com
2. 🔗 Login con GitHub
3. ➕ Importa tu repo `gestion-aulas-uide`
4. ⚙️ Configura:
   - Root: `frontend`
   - Framework: `Vite`
5. 🚀 Deploy

**Resultado**: `https://tu-app.vercel.app` ✨

---

### ✅ PASO 3: RENDER - BACKEND (5 MIN)

1. 🌐 Ve a: https://render.com
2. 🔗 Login con GitHub
3. ➕ New Web Service → Conecta repo
4. ⚙️ Configura:
   - Root: `backend`
   - Build: `npm install`
   - Start: `npm start`
   - Plan: **Free**
5. 🔐 Variables de entorno:
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=tu-secreto-seguro-2024
   FRONTEND_URL=https://tu-app.vercel.app
   ```
6. 🚀 Create Service

**Resultado**: `https://tu-backend.onrender.com` ✨

**Espera 5 min** (Render es lento en plan gratis)

---

### ✅ PASO 4: CONECTAR (1 MIN)

En **Vercel** → Settings → Environment Variables:
```
VITE_API_URL=https://tu-backend.onrender.com
```

Luego **Redeploy** el frontend

---

### ✅ PASO 5: INICIALIZAR BD (1 MIN)

En **Render** → Shell (icono terminal):
```bash
node scripts/setup_sqlite_RAPIDO.js
node scripts/crear_clases_demo_RAPIDO.js
```

---

## 🎉 ¡LISTO!

Tu app está en: `https://tu-app.vercel.app`

Login:
```
Email: admin@uide.edu.ec
Password: admin123
```

---

## 📱 VENTAJAS

✅ **100% Gratis**
✅ **URL permanente** (no cambia)
✅ **HTTPS** automático (seguro)
✅ **No necesitas PC encendido**
✅ **Funciona desde cualquier dispositivo**

---

## ⚠️ IMPORTANTE

**Render gratis "duerme"** después de 15 min sin uso.
Primera petición tarda ~30 segundos.

**Solución**: Haz una petición 2 minutos antes de tu presentación.

---

## 🆘 AYUDA

**Guía detallada**: Lee `DESPLEGAR_AHORA_GRATIS.md`
**Problemas con Git**: Lee `PUSH_A_GITHUB_AHORA.md`

---

## 🚀 ALTERNATIVAS

Si Render es muy lento, prueba:
- **Railway** (5 min, $5 gratis/mes): https://railway.app
- **Fly.io** (5 min, gratis): https://fly.io

---

**¿Listo para desplegar?** 
→ Empieza con: `PUSH_A_GITHUB_AHORA.md` 🚀
