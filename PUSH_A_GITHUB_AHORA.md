# 📤 PUSH A GITHUB AHORA

## ⚡ COMANDOS RÁPIDOS

Abre **Git Bash** o **PowerShell** y ejecuta:

```bash
cd "c:\Users\sjapo\OneDrive\Documents\Proyectos\gestion-aulas-uide"

# Agregar todos los archivos
git add .

# Commit
git commit -m "Sistema listo para desplegar - vercel y render config"

# Push
git push origin main
```

Si pide usuario/contraseña de GitHub:
- **Usuario**: Tu usuario de GitHub
- **Password**: Tu **Personal Access Token** (no tu contraseña normal)

---

## 🔑 SI NO TIENES TOKEN DE GITHUB

1. Ve a: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Nombre: `deploy-gestion-aulas`
4. Selecciona: `repo` (todos los checks)
5. Click **"Generate token"**
6. **COPIA EL TOKEN** (no lo verás de nuevo)
7. Úsalo como password al hacer push

---

## ✅ VERIFICAR QUE SUBIÓ

Después del push, ve a tu repo en GitHub:
https://github.com/TU-USUARIO/gestion-aulas-uide

Verifica que veas los nuevos archivos:
- `frontend/vercel.json`
- `backend/render.yaml`
- `DESPLEGAR_AHORA_GRATIS.md`

---

## 🎯 SIGUIENTE PASO

Una vez que hayas hecho push exitoso:

**Lee y sigue**: `DESPLEGAR_AHORA_GRATIS.md`

Ahí están los pasos para desplegar en Vercel y Render.
