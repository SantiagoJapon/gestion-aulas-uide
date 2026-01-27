# 🔐 CREDENCIALES DE DIRECTORES DE CARRERA

**Fecha de Creación:** 26 de Enero 2026, 23:42  
**Sistema:** Gestión de Aulas UIDE  
**Estado:** ✅ ACTIVAS Y VERIFICADAS

---

## 👥 DIRECTORES CONFIGURADOS

### 1. DERECHO

**Director:** Mgs. Raquel Veintimilla  
**Email:** `raquel.veintimilla.director@uide.edu.ec`  
**Password:** `DirectorUide2026!`  
**Carrera Asignada:** Derecho  
**Estado:** ✅ Activo

---

### 2. INFORMÁTICA

**Director:** Mgs. Lorena Conde  
**Email:** `lorena.conde.director@uide.edu.ec`  
**Password:** `DirectorUide2026!`  
**Carrera Asignada:** Ingeniería en Tecnologías de la Información y Comunicación  
**Estado:** ✅ Activo

---

### 3. ARQUITECTURA Y URBANISMO

**Director:** Mgs. Freddy Salazar  
**Email:** `freddy.salazar.director@uide.edu.ec`  
**Password:** `DirectorUide2026!`  
**Carrera Asignada:** Arquitectura y Urbanismo  
**Estado:** ✅ Activo

---

## 🔑 RESUMEN DE ACCESO

| Carrera | Director | Email | Password |
|---------|----------|-------|----------|
| Derecho | Mgs. Raquel Veintimilla | raquel.veintimilla.director@uide.edu.ec | DirectorUide2026! |
| Informática | Mgs. Lorena Conde | lorena.conde.director@uide.edu.ec | DirectorUide2026! |
| Arquitectura | Mgs. Freddy Salazar | freddy.salazar.director@uide.edu.ec | DirectorUide2026! |

---

## 🚀 CÓMO USAR LAS CREDENCIALES

### Paso 1: Acceder al Sistema

1. Abre el navegador
2. Ve a: **http://localhost:5173**
3. Haz click en "Iniciar Sesión"

### Paso 2: Login

**Ejemplo para Derecho:**
```
Email:    raquel.veintimilla.director@uide.edu.ec
Password: DirectorUide2026!
```

### Paso 3: Panel del Director

Una vez dentro, cada director verá:
- Dashboard con estadísticas de su carrera
- Clases asignadas
- Aulas utilizadas
- Horarios
- Opciones de gestión

---

## 🧪 PROBAR LAS CREDENCIALES

### Test Rápido con PowerShell:

```powershell
# Test login Raquel Veintimilla (Derecho)
$loginData = @{
    email = "raquel.veintimilla.director@uide.edu.ec"
    password = "DirectorUide2026!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method Post `
    -Body $loginData `
    -ContentType "application/json"
```

### Test login Lorena Conde (Informática):

```powershell
$loginData = @{
    email = "lorena.conde.director@uide.edu.ec"
    password = "DirectorUide2026!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method Post `
    -Body $loginData `
    -ContentType "application/json"
```

### Test login Freddy Salazar (Arquitectura):

```powershell
$loginData = @{
    email = "freddy.salazar.director@uide.edu.ec"
    password = "DirectorUide2026!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method Post `
    -Body $loginData `
    -ContentType "application/json"
```

---

## 📊 VERIFICACIÓN EN BASE DE DATOS

### Ver todos los directores y sus carreras:

```sql
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "
SELECT 
  u.id,
  u.nombre || ' ' || u.apellido as director,
  u.email,
  u.carrera_director,
  cc.estado as carrera_estado
FROM usuarios u
LEFT JOIN carreras_configuracion cc ON cc.nombre_carrera = u.carrera_director
WHERE u.rol = 'director'
  AND u.id IN (4, 5, 6)
ORDER BY u.id;
"
```

---

## 🔒 SEGURIDAD

### Importante:

1. **Password Seguro:**
   - `DirectorUide2026!` incluye mayúsculas, minúsculas, números y símbolos
   - Cumple con los estándares de seguridad

2. **Almacenamiento:**
   - Las contraseñas están hasheadas con bcrypt en la base de datos
   - No se almacenan en texto plano

3. **Recomendaciones:**
   - Cambiar la contraseña después del primer login
   - No compartir las credenciales
   - Usar autenticación de dos factores (si está disponible)

---

## ✅ ESTADO DE ASIGNACIONES

```
✅ Raquel Veintimilla → Derecho
✅ Lorena Conde → Ingeniería en TIC
✅ Freddy Salazar → Arquitectura y Urbanismo
```

### Verificación en Sistema:

1. **Backend verificado:** ✅
   - Contraseñas actualizadas
   - Carreras asignadas correctamente
   - Relaciones verificadas

2. **Frontend listo:** ✅
   - Dropdown muestra carreras correctas
   - Asignaciones visibles en Panel Admin
   - Login funcional

3. **Base de Datos:** ✅
   - 3 directores configurados
   - Carreras activas
   - Sin conflictos

---

## 📝 CAMBIAR CONTRASEÑA (Opcional)

Si deseas cambiar la contraseña de algún director:

```sql
-- Ejemplo: Nueva password para Raquel (Derecho)
-- Primero genera el hash en Node.js:
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('NuevaPassword123!', 10);

docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "
UPDATE usuarios 
SET password = 'hash_bcrypt_aqui'
WHERE id = 4;
"
```

---

## 🆘 TROUBLESHOOTING

### Login no funciona:

1. **Verificar que el backend está corriendo:**
```bash
docker ps | grep backend
```

2. **Verificar las credenciales en BD:**
```sql
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "
SELECT id, nombre, email, rol, carrera_director 
FROM usuarios 
WHERE id IN (4,5,6);
"
```

3. **Ver logs del backend:**
```bash
docker logs gestion_aulas_backend --tail 20
```

### Carrera no aparece asignada:

1. **Verificar en BD:**
```sql
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "
SELECT * FROM usuarios WHERE id = 5;
"
```

2. **Refrescar el frontend:**
- Ctrl + Shift + R (hard reload)

---

## 📞 CONTACTO TÉCNICO

**Sistema:** Gestión de Aulas UIDE  
**Documentación:** Ver archivos .md en la raíz del proyecto  
**Soporte:** Revisar logs de Docker

---

## ✅ VERIFICACIÓN REALIZADA

### Tests Ejecutados:

```
✅ Hash bcrypt generado correctamente
✅ Contraseñas actualizadas en BD
✅ Carreras asignadas:
   - Raquel Veintimilla → Derecho ✓
   - Lorena Conde → Ingeniería en TIC ✓
   - Freddy Salazar → Arquitectura y Urbanismo ✓
✅ Login verificado: 200 OK
✅ Tokens generados correctamente
```

### Último Test (Exitoso):
```
POST /api/auth/login [32m200[0m 93.620 ms
Email: raquel.veintimilla.director@uide.edu.ec
Resultado: ✅ Login exitoso, token generado
```

---

## ✅ CHECKLIST FINAL

Antes de entregar credenciales, verificar:

- [x] 3 directores configurados
- [x] Contraseñas reseteadas con hash válido
- [x] Carreras asignadas correctamente
- [x] Login testeado exitosamente
- [x] Frontend muestra datos correctos
- [x] Base de datos verificada
- [x] Tokens generados correctamente
- [x] Documentación generada

---

## 📝 SCRIPTS GENERADOS

1. **`setup_directores_carreras.sql`** - Script de configuración completo
2. **`update_passwords.sql`** - Actualización de contraseñas
3. **`test_directores_login.ps1`** - Test automatizado de login
4. **`backend/generate_hash.js`** - Generador de hashes bcrypt

---

**¡Credenciales Listas y Verificadas! 🎉**

*Creado: 26 de Enero 2026, 23:42*  
*Sistema: Gestión de Aulas UIDE*  
*Estado: PRODUCCIÓN - VERIFICADO*
