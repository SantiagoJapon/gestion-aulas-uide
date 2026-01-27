# 🔧 ARREGLAR LOGIN DE DIRECTORES

## 🎯 PROBLEMA

Al recrear la base de datos, las contraseñas cambiaron:

**Antes:**
- Password: `DirectorUide2026!`
- Emails: `*.director@uide.edu.ec`

**Ahora:**
- Password: `uide2024`
- Emails: `*@uide.edu.ec` (sin `.director`)

---

## ✅ SOLUCIÓN RÁPIDA (30 SEGUNDOS)

### OPCIÓN A: Usar las nuevas credenciales

**Simplemente usa:**

```
Email: lorena.conde@uide.edu.ec
Password: uide2024
```

Aplica para todos los directores (ver `CREDENCIALES_ACTUALES.md`)

---

### OPCIÓN B: Restaurar contraseñas antiguas (2 minutos)

Si NECESITAS las contraseñas viejas (`DirectorUide2026!`):

```bash
cd backend
node scripts/restaurar_credenciales_viejas.js
```

Esto cambiará TODAS las contraseñas de directores a `DirectorUide2026!`

**IMPORTANTE**: Los emails seguirán siendo `*@uide.edu.ec` (sin `.director`), porque ese es el formato actual en la BD.

---

## 🎯 RECOMENDACIÓN

**USA OPCIÓN A** (las nuevas credenciales)

Es más simple y ya están funcionando. Solo actualiza tus notas:

### Login Director de Informática:
```
Email: lorena.conde@uide.edu.ec
Password: uide2024
```

### Login Director de Derecho:
```
Email: raquel.veintimilla@uide.edu.ec
Password: uide2024
```

---

## 🚨 SI NECESITAS LOS EMAILS VIEJOS

Si REALMENTE necesitas los emails con `.director` (como `lorena.conde.director@uide.edu.ec`), necesitaríamos actualizar la BD manualmente. Pero **NO es recomendado** porque romperías otras cosas.

---

## ✅ VERIFICAR QUE FUNCIONA

1. **Refresca navegador** (Ctrl+F5)
2. **Login como director**:
   - Email: `lorena.conde@uide.edu.ec`
   - Password: `uide2024`
3. **Verás tu dashboard** con el horario de tu carrera

---

## 📝 ARCHIVO DE REFERENCIA

Las credenciales actuales están en: `CREDENCIALES_ACTUALES.md`

---

**¿Qué prefieres?**
- **Opción A**: Usar `uide2024` (recomendado) ✅
- **Opción B**: Restaurar `DirectorUide2026!` (ejecuta el script)
