# ⚡ DESPLIEGUE SÚPER RÁPIDO (SIN GITHUB)

## 🎯 OPCIÓN 1: RAILWAY CLI (5 MINUTOS)

### Instalar Railway CLI
```bash
# En PowerShell como admin
npm install -g @railway/cli

# Login
railway login
```

### Desplegar Backend
```bash
cd "c:\Users\sjapo\OneDrive\Documents\Proyectos\gestion-aulas-uide\backend"

# Inicializar Railway
railway init

# Agregar variables de entorno
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=tu-super-secreto-2024
railway variables set PORT=3000

# Desplegar
railway up

# Obtener URL
railway domain
```

### Inicializar BD
```bash
# Conectar a Railway
railway run node scripts/setup_sqlite_RAPIDO.js
railway run node scripts/crear_clases_demo_RAPIDO.js
```

---

## 🎯 OPCIÓN 2: RENDER (MÁS SIMPLE - 10 MIN)

### 1. Backend en Render

1. Ve a: https://render.com
2. Crea cuenta gratuita (solo email)
3. Click **"New +"** → **"Web Service"**
4. **Deploy from Git** → Pega esta URL si ya subiste a GitHub
5. O **Manual Deploy**:
   - Sube la carpeta `backend` como ZIP
6. Configuración:
   ```
   Name: gestion-aulas-backend
   Build Command: npm install
   Start Command: npm start
   ```
7. Variables de entorno:
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=tu-secreto-super-seguro-2024
   ```
8. Click **"Create Web Service"**
9. Espera 5 minutos (Render es gratis pero lento)

### 2. Frontend en Netlify

1. Ve a: https://netlify.com
2. Arrastra la carpeta `frontend/dist` (después de build)
3. O usa **Netlify CLI**:
   ```bash
   cd frontend
   npm run build
   npm install -g netlify-cli
   netlify deploy --prod
   ```

---

## 🎯 OPCIÓN 3: TODO EN UNA MÁQUINA VIRTUAL (15 MIN)

### DigitalOcean Droplet ($6/mes, 1 mes gratis)

1. Ve a: https://www.digitalocean.com
2. Crea cuenta (pide tarjeta pero da $200 gratis por 60 días)
3. Crea Droplet:
   - **Image**: Ubuntu 22.04
   - **Size**: Basic $6/mes
   - Click **"Create Droplet"**
4. SSH a tu droplet:
   ```bash
   ssh root@tu-ip
   ```
5. Instalar dependencias:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt-get install -y nodejs nginx
   ```
6. Subir tu proyecto:
   ```bash
   # En tu PC
   scp -r backend root@tu-ip:/root/
   ```
7. En el servidor:
   ```bash
   cd /root/backend
   npm install
   npm install -g pm2
   
   # Inicializar BD
   node scripts/setup_sqlite_RAPIDO.js
   node scripts/crear_clases_demo_RAPIDO.js
   
   # Ejecutar
   pm2 start src/index.js --name gestion-aulas
   pm2 save
   pm2 startup
   ```
8. Configurar Nginx:
   ```nginx
   server {
       listen 80;
       server_name tu-dominio.com;
       
       location / {
           proxy_pass http://localhost:3000;
       }
   }
   ```

---

## 📱 OPCIÓN 4: NGROK (DEMO INMEDIATA - 1 MIN)

**SOLO PARA DEMOSTRACIÓN**, no para producción:

```bash
# Instalar ngrok
choco install ngrok

# O descarga de: https://ngrok.com/download

# Ejecutar
ngrok http 3000
```

Te dará una URL pública temporal como:
```
https://abc123.ngrok.io → http://localhost:3000
```

**Ventajas**:
- ✅ Inmediato (1 minuto)
- ✅ No requiere cuenta
- ✅ Ideal para demo/presentación

**Desventajas**:
- ❌ URL cambia cada vez
- ❌ Solo para demos
- ❌ Requiere tu PC encendido

---

## 🏆 RECOMENDACIÓN POR URGENCIA

| Tiempo | Plataforma | Costo | Dificultad |
|--------|------------|-------|------------|
| **1 min** | ngrok | Gratis | ⭐ |
| **5 min** | Railway CLI | Gratis/$5 | ⭐⭐ |
| **10 min** | Render | Gratis | ⭐⭐ |
| **15 min** | DigitalOcean | $6/mes | ⭐⭐⭐ |

**Para tu presentación AHORA**: Usa **ngrok** ✅
**Para producción**: Usa **Railway** o **Render** ✅
