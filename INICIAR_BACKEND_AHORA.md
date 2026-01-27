# 🚀 INICIAR BACKEND Y FRONTEND AHORA

## ⚡ PASO 1: ABRIR 2 TERMINALES

Necesitas **2 terminales separadas** en VS Code:

1. Click en el **"+"** en la terminal de VS Code
2. Abre una segunda terminal

---

## 🖥️ TERMINAL 1: BACKEND (Puerto 3000)

```bash
cd backend
npm start
```

**Deberías ver:**
```
✅ Base de datos conectada
🚀 Servidor escuchando en puerto 3000
```

**DEJA ESTA TERMINAL ABIERTA** (no la cierres)

---

## 📱 TERMINAL 2: FRONTEND (Puerto 5173)

En la **segunda terminal**:

```bash
cd frontend
npm run dev
```

**Deberías ver:**
```
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**DEJA ESTA TERMINAL ABIERTA** también

---

## ✅ PROBAR QUE FUNCIONA

1. Abre tu navegador en: **http://localhost:5173**
2. Login:
   ```
   Email: admin@uide.edu.ec
   Password: admin123
   ```
3. Si ves el dashboard, ¡TODO FUNCIONA! ✅

---

## 🆘 SI EL BACKEND NO INICIA

Si ves error de "puerto en uso":

```bash
# En Windows PowerShell como ADMIN:
netstat -ano | findstr :3000
taskkill /F /PID [EL_NUMERO_QUE_APARECE]
```

Luego intenta `npm start` de nuevo.

---

## 🎯 RESUMEN VISUAL

```
┌─────────────────────────────────────┐
│  TERMINAL 1                         │
│  cd backend                         │
│  npm start                          │
│  → http://localhost:3000           │
│  ✅ CORRIENDO (no cerrar)          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  TERMINAL 2                         │
│  cd frontend                        │
│  npm run dev                        │
│  → http://localhost:5173           │
│  ✅ CORRIENDO (no cerrar)          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  NAVEGADOR                          │
│  http://localhost:5173             │
│  → Login → Dashboard ✅            │
└─────────────────────────────────────┘
```

---

## 📝 NOTA

**DESPUÉS** de probar localmente, puedes desplegarlo en la nube con `SIGUE_ESTOS_PASOS_AHORA.md`

Para la presentación es **mejor en la nube** (Vercel + Render), porque:
- ✅ No necesitas tu PC encendido
- ✅ URL permanente para compartir
- ✅ Funciona desde cualquier dispositivo
