# 🚀 INICIAR SISTEMA - 3 PASOS SIMPLES

## ⚡ PASO 1: BACKEND
Abre una terminal PowerShell en la carpeta del proyecto:

```powershell
cd backend
npm start
```

Deberías ver:
```
✅ Conexión a la base de datos establecida correctamente
🚀 Servidor corriendo en puerto 3000
```

**DEJA ESTA TERMINAL ABIERTA** - no la cierres

---

## ⚡ PASO 2: FRONTEND
Abre OTRA terminal PowerShell en la carpeta del proyecto:

```powershell
cd frontend
npm run dev
```

Deberías ver:
```
VITE ready in XXX ms
➜ Local: http://localhost:5173/
```

**DEJA ESTA TERMINAL ABIERTA** - no la cierres

---

## ⚡ PASO 3: ABRIR NAVEGADOR

Abre tu navegador en: **http://localhost:5173** (o el puerto que indique el frontend)

---

## 🔐 CREDENCIALES PARA LOGIN

### ADMIN
```
Email: admin@uide.edu.ec
Password: admin123
```

### DIRECTORES (todos con password: uide2024)
```
raquel.veintimilla@uide.edu.ec  - Derecho
lorena.conde@uide.edu.ec        - Informática
freddy.salazar@uide.edu.ec      - Arquitectura
domenica.burneo@uide.edu.ec     - Psicología
franklin.chacon@uide.edu.ec     - Business
mercy.namicela@uide.edu.ec      - Business
```

---

## ✅ VERIFICAR QUE TODO FUNCIONA

1. **Login funciona**: Puedes entrar con cualquier credencial de arriba
2. **Dashboard se carga**: Ves tu panel correspondiente (Admin o Director)
3. **No hay errores rojos** en la consola del navegador (F12)

---

## 🎯 FUNCIONALIDADES LISTAS

1. ✅ **Login** - Autenticación con JWT
2. ✅ **Dashboards** - Diferentes vistas por rol
3. ✅ **Subir Estudiantes** - Desde Excel
4. ✅ **Subir Planificaciones** - Desde Excel
5. ✅ **Distribución Automática** - Algoritmo inteligente
6. ✅ **Mapa de Calor** - Visualización interactiva

---

## 🐛 SI ALGO FALLA

### Backend no inicia
```powershell
# Verificar que no haya otro proceso en puerto 3000
netstat -ano | findstr :3000

# Si hay algo, matar el proceso
taskkill /F /PID [número_del_PID]

# Reintentar
cd backend
npm start
```

### Frontend no inicia
```powershell
# Verificar que no haya otro proceso en puerto 5173
netstat -ano | findstr :5173

# Si hay algo, matar el proceso
taskkill /F /PID [número_del_PID]

# Reintentar
cd frontend
npm run dev
```

### "Credenciales inválidas" al hacer login
Verifica que:
1. El backend esté corriendo (terminal abierta mostrando "Servidor corriendo")
2. Estés escribiendo el email y password EXACTAMENTE como se muestra arriba
3. No haya espacios al inicio o final del email/password

---

## 📦 BASE DE DATOS

El sistema usa **SQLite** (archivo local):
- **Ubicación**: `backend/database.sqlite`
- **Usuarios**: Ya creados (1 admin + 6 directores)
- **Carreras**: 5 carreras (Derecho, Informática, Arquitectura, Psicología, Business)
- **Aulas**: 20 aulas de ejemplo (A-01 a A-20)

**No necesitas PostgreSQL ni Docker** - todo funciona con el archivo SQLite.

---

## 🔄 RECREAR BASE DE DATOS (si es necesario)

Si algo se corrompe:

```powershell
cd backend
del database.sqlite
node scripts/setup_sqlite_RAPIDO.js
npm start
```

---

## 📝 NOTAS IMPORTANTES

1. **Dos terminales abiertas**: Una para backend, otra para frontend
2. **No cerrar las terminales**: El sistema deja de funcionar si las cierras
3. **Puerto puede variar**: El frontend puede usar 5173, 5174 o 5175 según disponibilidad
4. **Primera vez**: El frontend puede tardar más en cargar mientras compila

---

## 🎤 PARA LA PRESENTACIÓN

1. Abre 3 ventanas ANTES de empezar:
   - Terminal 1: Backend corriendo
   - Terminal 2: Frontend corriendo
   - Navegador: http://localhost:5173 (o el puerto que use)

2. Ten a mano:
   - [CHEAT_SHEET_EMERGENCIA.md](CHEAT_SHEET_EMERGENCIA.md) - Credenciales rápidas
   - [SISTEMA_FUNCIONANDO_AHORA.md](SISTEMA_FUNCIONANDO_AHORA.md) - Guía completa

3. Archivos Excel de prueba:
   - Estudiantes: Formato con CÉDULA, NOMBRES, NIVEL, ESCUELA
   - Planificaciones: Formato institucional (fila 9 en adelante)

---

**✅ SISTEMA LISTO PARA USAR**

Fecha: 27 de Enero 2026
Base de datos: SQLite (local)
Usuarios creados: 7 (1 admin + 6 directores)
