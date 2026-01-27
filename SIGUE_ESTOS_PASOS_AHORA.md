# 🎯 SIGUE ESTOS PASOS AHORA (10 MIN)

## ✅ PASO 1 COMPLETADO: CÓDIGO EN GITHUB ✅

Tu código está en: https://github.com/SantiagoJapon/gestion-aulas-uide

---

## 📱 PASO 2: DESPLEGAR FRONTEND EN VERCEL (3 MIN)

### Ir a Vercel:
**👉 https://vercel.com 👈**

1. Click **"Continue with GitHub"**
2. Autoriza Vercel
3. Click **"Add New..."** → **"Project"**
4. Busca `gestion-aulas-uide`
5. Click **"Import"**

### Configuración:
```
Project Name: gestion-aulas-uide
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**NO agregues variables de entorno todavía**

6. Click **"Deploy"**

**ESPERA 2 MINUTOS**

Te dará una URL como:
```
https://gestion-aulas-uide.vercel.app
```

**COPIA ESTA URL** (la necesitarás en el siguiente paso)

---

## 🖥️ PASO 3: DESPLEGAR BACKEND EN RENDER (5 MIN)

### Ir a Render:
**👉 https://render.com 👈**

1. Click **"Get Started for Free"**
2. Continua con GitHub
3. Autoriza Render
4. Click **"New +"** → **"Web Service"**
5. Busca `gestion-aulas-uide`
6. Click **"Connect"**

### Configuración:
```
Name: gestion-aulas-backend
Region: Oregon (US West)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### Plan:
- Selecciona **"Free"** (0 dólares/mes)

### Variables de Entorno:

Click en **"Add Environment Variable"** y agrega **4 variables**:

1. **NODE_ENV**
   ```
   production
   ```

2. **PORT**
   ```
   10000
   ```

3. **JWT_SECRET**
   ```
   gestion-aulas-uide-super-secreto-2024
   ```

4. **FRONTEND_URL**
   ```
   https://TU-URL-DE-VERCEL.vercel.app
   ```
   **(Usa la URL que copiaste en el paso 2)**

### Desplegar:
Click **"Create Web Service"**

**ESPERA 5 MINUTOS** (Render es lento en plan gratis)

Te dará una URL como:
```
https://gestion-aulas-backend.onrender.com
```

**COPIA ESTA URL** (la necesitarás en el siguiente paso)

---

## 🔗 PASO 4: CONECTAR FRONTEND CON BACKEND (1 MIN)

### Volver a Vercel:
1. Ve a tu proyecto en Vercel
2. Click en **"Settings"**
3. Click en **"Environment Variables"**
4. Click **"Add New"**

### Variable de entorno:
```
Name: VITE_API_URL
Value: https://TU-BACKEND-RENDER.onrender.com
```
**(Usa la URL que copiaste en el paso 3)**

5. Click **"Save"**

### Redesplegar:
1. Ve a **"Deployments"**
2. Click en los **3 puntos** del último deployment
3. Click **"Redeploy"**

**ESPERA 1 MINUTO**

---

## 🗄️ PASO 5: INICIALIZAR BASE DE DATOS (1 MIN)

### En Render:
1. Ve a tu servicio `gestion-aulas-backend`
2. Click en **"Shell"** (icono de terminal arriba a la derecha)
3. Espera que la terminal se abra
4. Ejecuta estos 2 comandos:

```bash
node scripts/setup_sqlite_RAPIDO.js
```

**Espera que termine** (verás mensajes de éxito)

Luego:

```bash
node scripts/crear_clases_demo_RAPIDO.js
```

**Verás**:
```
✅ 13 clases de demostración creadas exitosamente
   - Informática: 8 clases
   - Administración: 5 clases
```

---

## 🎉 ¡LISTO! PRUEBA TU APP

### Abre tu app:
**https://TU-APP.vercel.app**

### Login:
```
Email: admin@uide.edu.ec
Password: admin123
```

### Ejecutar Distribución:
1. Click en **"Ejecutar Distribución"** (botón verde)
2. Espera 30 segundos (primera vez es lenta)
3. Verás:
   ```
   Total Procesadas: 13
   Exitosas: 13
   Fallidas: 0
   ```

### Ver Horario:
Baja en la página y verás el horario con todas las aulas asignadas ✅

---

## 📱 COMPARTIR

Ahora puedes compartir tu URL de Vercel con quien quieras:
- Funciona desde cualquier dispositivo
- No necesitas tu PC encendido
- URL permanente (no cambia)

---

## ⚠️ IMPORTANTE

**Render gratis "duerme"** después de 15 minutos sin uso.

**Solución**: Antes de tu presentación, abre la app 2 minutos antes para que el backend despierte.

---

## 🎯 RESUMEN

✅ **Código en GitHub** → https://github.com/SantiagoJapon/gestion-aulas-uide  
⏳ **Vercel** → 3 minutos  
⏳ **Render** → 5 minutos  
⏳ **Conectar** → 1 minuto  
⏳ **Inicializar BD** → 1 minuto  

**TOTAL: 10 MINUTOS** 🚀

---

**¡AHORA VE A VERCEL Y SIGUE LOS PASOS!** 

👉 https://vercel.com
