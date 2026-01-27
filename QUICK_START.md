# ⚡ QUICK START - 10 MINUTOS

## 🚨 EMERGENCIA: Password de PostgreSQL

### 1. Abre backend/.env y busca esta línea:
```
DB_PASSWORD=admin
```

### 2. Cámbiala por el password REAL de tu PostgreSQL local

Si no sabes cuál es, prueba:
- `admin`
- `postgres`  
- `password`
- `123456`
- O el que usaste al instalar PostgreSQL

### 3. Ejecuta:
```powershell
cd backend
node scripts/crear_usuarios_EMERGENCIA.js
```

## ✅ SI FUNCIONA

Verás:
```
✅ USUARIOS CREADOS EXITOSAMENTE
```

## 🚀 LUEGO:

```powershell
# Iniciar backend
cd backend
npm start

# Otra terminal - Iniciar frontend
cd frontend
npm install lucide-react
npm run dev
```

## 🔐 LOGIN

http://localhost:5173
- admin@uide.edu.ec / admin123
- raquel.veintimilla@uide.edu.ec / uide2024

**¡LISTO!**
