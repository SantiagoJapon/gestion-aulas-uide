# 🚀 DESPLEGAR GRATIS AHORA (10 MINUTOS)

## ⚡ STACK: VERCEL (Frontend) + RENDER (Backend)

**100% GRATIS** | **URL PERMANENTE** | **HTTPS AUTOMÁTICO**

---

## 📋 PASO 1: COMMIT Y PUSH A GITHUB (2 MIN)

```bash
cd "c:\Users\sjapo\OneDrive\Documents\Proyectos\gestion-aulas-uide"

# Agregar todos los cambios
git add .

# Commit
git commit -m "Sistema listo para desplegar - distribución funcionando"

# Push a GitHub
git push origin main
```

---

## 🎨 PASO 2: DESPLEGAR FRONTEND EN VERCEL (3 MIN)

### 2.1 Ir a Vercel
1. Ve a: https://vercel.com
2. Click **"Sign Up"** (usa tu cuenta de GitHub)
3. Autoriza Vercel para acceder a tus repos

### 2.2 Importar Proyecto
1. Click **"Add New..."** → **"Project"**
2. Busca tu repositorio `gestion-aulas-uide`
3. Click **"Import"**

### 2.3 Configurar
```
Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

### 2.4 Variables de Entorno
**IMPORTANTE**: Por ahora deja esto vacío, lo configuraremos después

Click **"Deploy"**

**Espera 2 minutos** → Te dará una URL como: `https://gestion-aulas-uide.vercel.app`

---

## 🖥️ PASO 3: DESPLEGAR BACKEND EN RENDER (5 MIN)

### 3.1 Ir a Render
1. Ve a: https://render.com
2. Click **"Get Started"** (usa tu cuenta de GitHub)
3. Autoriza Render

### 3.2 Crear Web Service
1. Click **"New +"** → **"Web Service"**
2. Conecta tu repositorio `gestion-aulas-uide`
3. Click **"Connect"**

### 3.3 Configurar
```
Name: gestion-aulas-backend
Region: Oregon (US West)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### 3.4 Plan
- Selecciona **"Free"** (0 dólares)

### 3.5 Variables de Entorno
Click **"Advanced"** y agrega:

```
NODE_ENV=production
PORT=10000
JWT_SECRET=tu-super-secreto-seguro-2024
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://gestion-aulas-uide.vercel.app
```

**IMPORTANTE**: Cambia `gestion-aulas-uide.vercel.app` por tu URL real de Vercel

Click **"Create Web Service"**

**Espera 5 minutos** (Render es lento en plan gratis)

Te dará una URL como: `https://gestion-aulas-backend.onrender.com`

---

## 🔗 PASO 4: CONECTAR FRONTEND CON BACKEND (1 MIN)

### 4.1 Actualizar Frontend
1. Ve a tu proyecto en **Vercel**
2. Click en **"Settings"** → **"Environment Variables"**
3. Agrega:
   ```
   VITE_API_URL=https://gestion-aulas-backend.onrender.com
   ```
4. Click **"Save"**
5. Ve a **"Deployments"**
6. Click en los 3 puntos del último deploy
7. Click **"Redeploy"**

---

## 🗄️ PASO 5: INICIALIZAR BASE DE DATOS (1 MIN)

### 5.1 Conectar al Backend
1. En **Render**, ve a tu servicio
2. Click en **"Shell"** (icono de terminal en la parte superior)
3. Ejecuta:
   ```bash
   node scripts/setup_sqlite_RAPIDO.js
   node scripts/crear_clases_demo_RAPIDO.js
   ```

---

## ✅ PASO 6: PROBAR TU APP

Tu app ahora está en:
- **Frontend**: `https://gestion-aulas-uide.vercel.app`
- **Backend**: `https://gestion-aulas-backend.onrender.com`

**Login**:
```
Email: admin@uide.edu.ec
Password: admin123
```

**Ejecutar Distribución** y verás las 13 clases asignadas a aulas ✅

---

## ⚠️ IMPORTANTE - RENDER GRATIS

**Primera vez tarda**: El backend en Render gratis "duerme" después de 15 minutos sin uso. La primera petición tarda ~30 segundos en despertar.

**Solución**: Durante tu presentación, haz una petición 2 minutos antes para que esté despierto.

---

## 🔥 ALTERNATIVA SI RENDER ESTÁ LENTO

Si Render tarda mucho, usa **Railway** (tiene $5 gratis mensuales):

1. Ve a: https://railway.app
2. Login con GitHub
3. **"New Project"** → **"Deploy from GitHub repo"**
4. Selecciona tu repo
5. Configura igual que Render
6. ✅ Es más rápido

---

## 📱 COMPARTIR TU APP

Ahora puedes compartir tu URL de Vercel con quien quieras:
- Funciona desde cualquier dispositivo
- HTTPS seguro
- Sin necesidad de tu PC encendido

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error CORS en Frontend
Verifica que `FRONTEND_URL` en Render apunte a tu URL de Vercel

### Backend no responde
Espera 30 segundos (está "despertando")

### Base de datos vacía
Ejecuta los scripts de setup en el Shell de Render

---

## 🎯 RESUMEN RÁPIDO

1. **Push a GitHub** → Ya hecho ✅
2. **Vercel** → Frontend (2 min)
3. **Render** → Backend (5 min)
4. **Conectar** → Variables de entorno (1 min)
5. **Inicializar BD** → Shell de Render (1 min)
6. **¡Listo!** → URL pública funcionando

---

**TOTAL: 10 MINUTOS** 🚀
