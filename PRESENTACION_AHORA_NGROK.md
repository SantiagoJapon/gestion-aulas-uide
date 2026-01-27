# 🚀 PRESENTACIÓN AHORA MISMO CON NGROK (1 MINUTO)

## ⚡ PASOS ULTRA RÁPIDOS

### 1️⃣ INSTALAR NGROK (30 SEGUNDOS)

**Opción A - Con Chocolatey** (si lo tienes instalado):
```bash
choco install ngrok
```

**Opción B - Descarga directa**:
1. Ve a: https://ngrok.com/download
2. Descarga el `.zip` de Windows
3. Extrae `ngrok.exe` en cualquier carpeta
4. Opcional: Agrega la carpeta al PATH

### 2️⃣ EJECUTAR NGROK (10 SEGUNDOS)

Abre una **nueva terminal** (PowerShell):

```bash
# Si instalaste con Chocolatey
ngrok http 3000

# Si descargaste manual
cd ruta\donde\esta\ngrok
.\ngrok.exe http 3000
```

Verás algo como:
```
Forwarding  https://abc123def.ngrok.io -> http://localhost:3000
```

### 3️⃣ COPIAR LA URL (5 SEGUNDOS)

Copia la URL que empieza con `https://` (ej: `https://abc123def.ngrok.io`)

### 4️⃣ ACTUALIZAR FRONTEND (15 SEGUNDOS)

**Opción A - Variable de entorno** (en tu terminal del frontend):
```bash
# Detener frontend (Ctrl+C)
$env:VITE_API_URL="https://abc123def.ngrok.io"
npm run dev
```

**Opción B - Archivo .env del frontend**:
```bash
cd frontend
echo VITE_API_URL=https://abc123def.ngrok.io > .env
npm run dev
```

### 5️⃣ ¡LISTO! (0 SEGUNDOS)

Tu sistema ya está accesible desde:
- **Frontend**: `http://localhost:5173` (o también puedes hacer ngrok del frontend)
- **Backend**: `https://abc123def.ngrok.io` (público)

---

## 🌐 HACER FRONTEND TAMBIÉN PÚBLICO (OPCIONAL)

Si quieres compartir el frontend también:

```bash
# En otra terminal
ngrok http 5173
```

Te dará otra URL como: `https://xyz789.ngrok.io`

Ahora TODA tu aplicación es accesible desde cualquier lugar con:
- Frontend: `https://xyz789.ngrok.io`
- Backend: Ya configurado

---

## ⚠️ IMPORTANTE PARA LA PRESENTACIÓN

1. **NO CIERRES** las terminales de ngrok
2. **NO CIERRES** tu PC (obviamente)
3. **GUARDA** las URLs porque cambiarán si reinicias ngrok
4. Si tu PC se duerme, las URLs dejarán de funcionar

---

## 📱 COMPARTIR CON TU AUDIENCIA

Durante la presentación, puedes:
1. Proyectar tu navegador local (más rápido)
2. O compartir la URL de ngrok y todos pueden verlo en sus celulares

---

## 💡 VENTAJAS NGROK

- ✅ **1 minuto** de setup
- ✅ **Gratis** (no necesitas cuenta)
- ✅ **HTTPS** automático (seguro)
- ✅ **Funciona** detrás de cualquier firewall
- ✅ **Perfecto** para demos/presentaciones

---

## 🔒 ALTERNATIVA: NGROK CON CUENTA (URL FIJA)

Si creas cuenta gratis en ngrok.com:

```bash
ngrok config add-authtoken TU_TOKEN
ngrok http 3000 --domain=tu-nombre.ngrok.app
```

Tendrás una URL que no cambia entre reinicios.

---

## 🎯 TL;DR - COMANDO ÚNICO

```bash
# Terminal 1 - Backend (ya corriendo en 3000)
# (no hagas nada)

# Terminal 2 - ngrok
ngrok http 3000

# Terminal 3 - Actualizar y reiniciar frontend
cd frontend
echo VITE_API_URL=https://TU-URL-NGROK.ngrok.io > .env
npm run dev
```

**¡LISTO EN 1 MINUTO!** 🚀
