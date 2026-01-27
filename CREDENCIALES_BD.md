# 🔐 CREDENCIALES DE BASE DE DATOS

## 📊 HAY DOS CONFIGURACIONES POSIBLES

---

## ✅ OPCIÓN 1: PostgreSQL CON DOCKER (RECOMENDADO)

### Credenciales:
```
Host: localhost
Puerto: 5433
Base de datos: gestion_aulas
Usuario: postgres
Password: postgres
```

### Iniciar Docker:
```powershell
docker-compose up -d postgres
```

### Conectarse desde herramientas (DBeaver, pgAdmin, etc.):
```
Host: localhost
Port: 5433  ⚠️ IMPORTANTE: 5433, NO 5432
Database: gestion_aulas
User: postgres
Password: postgres
```

---

## ✅ OPCIÓN 2: PostgreSQL LOCAL (Sin Docker)

### Credenciales según backend/.env:
```
Host: 127.0.0.1
Puerto: 5432
Base de datos: gestion_aulas
Usuario: postgres
Password: admin
```

### Conectarse:
```
Host: 127.0.0.1
Port: 5432
Database: gestion_aulas
User: postgres
Password: admin
```

---

## ❌ TU ERROR: "docker_aulas_db"

Estás tratando de conectarte a "docker_aulas_db", pero:
- ✅ **Nombre correcto**: `gestion_aulas`
- ❌ **Nombre incorrecto**: `docker_aulas_db`

---

## 🎯 ¿CUÁL USAR?

### SI ESTÁS USANDO DOCKER:
```
Puerto: 5433
Password: postgres
Database: gestion_aulas
```

### SI NO USAS DOCKER (Local):
```
Puerto: 5432
Password: admin
Database: gestion_aulas
```

---

## 🔍 VERIFICAR QUÉ TIENES

### ¿Docker está corriendo?
```powershell
docker ps
```

Si ves `gestion_aulas_db` → Usa **OPCIÓN 1** (puerto 5433, password postgres)

Si no hay contenedores → Usa **OPCIÓN 2** (puerto 5432, password admin)

---

## 🚀 RECOMENDACIÓN PARA PRESENTACIÓN

**USA POSTGRESQL LOCAL (Sin Docker)**:

1. **Verifica que PostgreSQL esté instalado localmente**
   ```powershell
   psql --version
   ```

2. **Crea la base de datos**:
   ```powershell
   psql -U postgres
   # Dentro de psql:
   CREATE DATABASE gestion_aulas;
   \q
   ```

3. **Conecta con**:
   ```
   Host: 127.0.0.1
   Port: 5432
   Database: gestion_aulas
   User: postgres
   Password: admin
   ```

4. **Ejecuta el script de usuarios**:
   ```powershell
   cd backend
   node scripts/crear_usuarios_directos.js
   ```

---

## 💡 RESUMEN

| Configuración | Host | Puerto | Database | User | Password |
|---------------|------|--------|----------|------|----------|
| **Docker** | localhost | **5433** | gestion_aulas | postgres | **postgres** |
| **Local** | 127.0.0.1 | **5432** | gestion_aulas | postgres | **admin** |

---

## ⚠️ TU CASO ESPECÍFICO

En la captura veo:
- Intentas: `docker_aulas_db`
- Debes usar: `gestion_aulas`

**Error "connection timeout"** = La base de datos NO está corriendo

**SOLUCIÓN**:

### Opción A: Iniciar Docker
```powershell
docker-compose up -d postgres
```

Luego conecta con:
- Port: **5433**
- Password: **postgres**
- Database: **gestion_aulas**

### Opción B: Usar PostgreSQL local
Verifica que el servicio PostgreSQL esté corriendo:
```powershell
# Ver servicios de Windows
Get-Service -Name postgresql*
```

Luego conecta con:
- Port: **5432**
- Password: **admin**
- Database: **gestion_aulas**

---

## 🎯 PARA TU PRESENTACIÓN

Te recomiendo **NO usar Docker**, usa PostgreSQL local:

1. Asegúrate que PostgreSQL local esté corriendo
2. Usa puerto **5432**
3. Password **admin**
4. Database **gestion_aulas**

**Es más simple y confiable para una demo** ✅
