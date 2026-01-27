# 🚂 DESPLEGAR EN RAILWAY (10 MINUTOS)

## 🎯 PASOS RÁPIDOS

### 1️⃣ CREAR CUENTA EN RAILWAY
1. Ve a: https://railway.app
2. Click en **"Start a New Project"**
3. Login con GitHub (crea cuenta si no tienes)

### 2️⃣ SUBIR PROYECTO A GITHUB
```bash
cd "c:\Users\sjapo\OneDrive\Documents\Proyectos\gestion-aulas-uide"

# Inicializar git (si no está)
git init

# Agregar archivos
git add .

# Commit
git commit -m "Proyecto listo para desplegar"

# Crear repo en GitHub y conectar
# (Railway te guiará en esto)
```

### 3️⃣ DESPLEGAR BACKEND EN RAILWAY

1. En Railway, click **"Deploy from GitHub repo"**
2. Selecciona tu repositorio `gestion-aulas-uide`
3. Railway detectará automáticamente Node.js
4. **IMPORTANTE**: Agrega estas variables de entorno:
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=tu-super-secreto-jwt-2024
   JWT_EXPIRES_IN=24h
   ```
5. **Root Directory**: Cambia a `backend`
6. **Start Command**: `npm start`
7. Click **"Deploy"**

### 4️⃣ INICIALIZAR BASE DE DATOS

Una vez desplegado el backend:

1. En Railway, ve a tu servicio
2. Click en **"Variables"** tab
3. Copia la URL pública (algo como `https://tu-app.railway.app`)
4. Abre una **nueva terminal** en Railway (botón "Connect")
5. Ejecuta:
   ```bash
   cd backend
   node scripts/setup_sqlite_RAPIDO.js
   node scripts/crear_clases_demo_RAPIDO.js
   ```

### 5️⃣ DESPLEGAR FRONTEND (VERCEL)

1. Ve a: https://vercel.com
2. Login con GitHub
3. Click **"Add New Project"**
4. Importa tu repositorio
5. **Root Directory**: `frontend`
6. **Framework Preset**: Vite
7. **Environment Variables**:
   ```
   VITE_API_URL=https://tu-backend.railway.app
   ```
8. Click **"Deploy"**

### 6️⃣ ACTUALIZAR CORS EN BACKEND

En Railway, agrega variable de entorno:
```
FRONTEND_URL=https://tu-frontend.vercel.app
```

---

## ✅ LISTO

Tu app estará en:
- **Frontend**: `https://tu-app.vercel.app`
- **Backend**: `https://tu-backend.railway.app`

---

## 🔥 ALTERNATIVA MÁS RÁPIDA: RENDER (GRATIS)

Si Railway pide tarjeta de crédito, usa **Render**:

1. Ve a: https://render.com
2. Crea cuenta gratuita
3. Click **"New +"** → **"Web Service"**
4. Conecta tu repo de GitHub
5. Configuración:
   - **Name**: gestion-aulas-backend
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Click **"Create Web Service"**

**NOTA**: Render gratis tarda ~1 minuto en despertar la primera vez.
