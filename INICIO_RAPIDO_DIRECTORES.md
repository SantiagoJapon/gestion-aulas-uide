# 🚀 INICIO RÁPIDO - 5 PASOS

## 1️⃣ POSTGRESQL CORRIENDO

```powershell
# Ver si está corriendo
Get-Service -Name postgresql*

# Si no está, iniciarlo
Start-Service postgresql-x64-15
```

## 2️⃣ CREAR BASE DE DATOS

```powershell
psql -U postgres
# Dentro de psql:
CREATE DATABASE gestion_aulas;
\q
```

## 3️⃣ CREAR USUARIOS

```powershell
cd backend
node scripts/crear_usuarios_directos.js
```

## 4️⃣ INICIAR BACKEND

```powershell
cd backend
npm start
```

## 5️⃣ INICIAR FRONTEND

```powershell
cd frontend
npm install lucide-react
npm run dev
```

## ✅ LOGIN

http://localhost:5173

**Admin**: admin@uide.edu.ec / admin123
**Director**: raquel.veintimilla@uide.edu.ec / uide2024

---

## 🔐 CREDENCIALES BD

```
Host: 127.0.0.1
Port: 5432
Database: gestion_aulas
User: postgres
Password: admin
```

Si el password no es "admin", cámbialo en `backend/.env`
