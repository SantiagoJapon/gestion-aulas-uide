# 🚀 COMANDOS EXACTOS PARA PUSH

## ✅ TU REPOSITORIO ESTÁ CORRECTO

**GitHub**: `https://github.com/SantiagoJapon/gestion-aulas-uide.git`  
**Rama**: `main`

---

## 📤 EJECUTA ESTOS COMANDOS (COPIA Y PEGA)

### Opción A: En Git Bash o PowerShell

```bash
cd "c:\Users\sjapo\OneDrive\Documents\Proyectos\gestion-aulas-uide"

# 1. Agregar todos los cambios
git add .

# 2. Commit
git commit -m "Sistema listo para desplegar - distribucion funcionando"

# 3. Push a GitHub
git push origin main
```

---

## 🔑 SI PIDE CREDENCIALES

**Usuario**: `SantiagoJapon` (tu usuario de GitHub)  
**Password**: Tu **Personal Access Token** (NO tu contraseña normal)

### ¿No tienes token?

1. Ve a: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Nombre: `deploy-gestion-aulas`
4. Marca: `repo` (todos los checkboxes)
5. Click **"Generate token"**
6. **COPIA EL TOKEN** (no lo verás después)
7. Pégalo cuando pida password

---

## ✅ VERIFICAR QUE SUBIÓ

Después del push:

1. Ve a: https://github.com/SantiagoJapon/gestion-aulas-uide
2. Verifica que veas:
   - `frontend/vercel.json`
   - `backend/render.yaml`
   - `DESPLEGAR_AHORA_GRATIS.md`
3. La fecha del último commit debe ser HOY

---

## 🎯 SIGUIENTE PASO

Una vez hecho el push:

**Sigue**: `DESPLEGAR_AHORA_GRATIS.md`

Para desplegar en Vercel y Render (10 minutos)

---

## 🆘 SI HAY ERROR

### Error: "Permission denied"
→ Necesitas generar un Personal Access Token (ver arriba)

### Error: "Failed to connect"
→ Verifica tu conexión a internet

### Error: "Updates were rejected"
→ Ejecuta primero: `git pull origin main`
→ Luego intenta el push de nuevo

---

**TU REPO ESTÁ LISTO** ✅  
**SOLO NECESITAS HACER PUSH** 🚀
