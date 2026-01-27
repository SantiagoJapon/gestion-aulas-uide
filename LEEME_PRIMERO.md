# 🚨 SOLUCIÓN: CREDENCIALES INVÁLIDAS

## ❌ EL PROBLEMA

Las credenciales no funcionan porque **los usuarios NO fueron creados en la base de datos**.

---

## ✅ SOLUCIÓN (1 MINUTO)

### EJECUTA ESTE COMANDO:

```powershell
cd backend
.\crear_usuarios.ps1
```

**ESO ES TODO** ✅

---

## 📋 SI NO FUNCIONA EL SCRIPT

Ejecuta manualmente:

```powershell
cd backend
node scripts/crear_usuarios_directos.js
```

---

## 🔐 DESPUÉS DE EJECUTAR

Verás este mensaje de éxito:
```
========================================
✅ USUARIOS CREADOS EXITOSAMENTE
========================================

CREDENCIALES:

👤 ADMIN:
   Email: admin@uide.edu.ec
   Password: admin123

👥 DIRECTORES (Password para todos: uide2024):
   - raquel.veintimilla@uide.edu.ec
   - lorena.conde@uide.edu.ec
   ...
```

---

## 🚀 AHORA SÍ - HACER LOGIN

1. Ve a: http://localhost:5173/login

2. **Login como Admin**:
   - Email: `admin@uide.edu.ec`
   - Password: `admin123`

   **O**

3. **Login como Director**:
   - Email: `raquel.veintimilla@uide.edu.ec`
   - Password: `uide2024`

---

## ✅ DEBE FUNCIONAR AHORA

Después de ejecutar el script:

- ✅ Los usuarios están creados en la BD
- ✅ Las contraseñas están hasheadas correctamente
- ✅ Las carreras están asignadas
- ✅ Puedes hacer login sin problemas

---

## 📞 RESUMEN

```powershell
# 1. Crear usuarios
cd backend
.\crear_usuarios.ps1

# 2. Hacer login en el navegador
# http://localhost:5173/login
# admin@uide.edu.ec / admin123
```

**¡LISTO!** 🎉
