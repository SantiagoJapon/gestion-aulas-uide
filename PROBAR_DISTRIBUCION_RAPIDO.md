# 🚀 PROBAR DISTRIBUCIÓN - GUÍA RÁPIDA

## ✅ RESPUESTA: Perfil de Directores

**SÍ**, cuando un director entra, ve su carrera en su perfil:
```json
{
  "carrera": {
    "id": 1,
    "nombre": "Derecho"
  }
}
```

---

## 🎯 PROBAR DISTRIBUCIÓN EN 4 PASOS

### PASO 1: Login
- Abre http://localhost:5173
- Email: `admin@uide.edu.ec`
- Password: `admin123`

### PASO 2: Subir Estudiantes
1. Ve a **"Gestión de Estudiantes"**
2. Click **"Subir Estudiantes"**
3. Sube un Excel con formato:
   ```
   CÉDULA | APELLIDOS Y NOMBRES | NIVEL | ESCUELA
   1234567890 | Pérez Juan | 1 | Derecho
   0987654321 | López María | 1 | Derecho
   ```

### PASO 3: Subir Planificación
1. Ve a **"Planificaciones"**
2. Click **"Subir Planificación"**
3. Sube un Excel con formato (fila 9 en adelante):
   ```
   ESCUELA | CARRERA | NIVEL | Materia | Docente | L | M | X | J | V | S
   Derecho | Derecho | 1 | Civil I | Dr. Pérez | 7-9 | | 7-9 | | |
   Derecho | Derecho | 1 | Penal | Dra. López | | 9-11 | | 9-11 | |
   ```

### PASO 4: Ejecutar Distribución
1. Ve a **"Distribución de Aulas"**
2. Click **"Ejecutar Distribución"**
3. Espera la confirmación
4. Ve al **"Mapa de Calor"** para ver resultados

---

## 🗺️ VER RESULTADOS

### Mapa de Calor:
- 🟢 Verde = Baja ocupación
- 🟡 Amarillo = Media ocupación
- 🔴 Rojo = Alta ocupación
- Click en celdas para ver detalles

### Mi Distribución:
- Lista completa de clases con aulas asignadas

---

## 🧪 PROBAR CON SCRIPT (Alternativa)

```powershell
# Después de subir datos desde el frontend:
cd backend
node scripts/test_distribucion_completa.js
```

---

## ⚠️ SI NO FUNCIONA

**"No hay clases sin aula"**
→ Primero sube planificaciones desde el frontend

**"Error al ejecutar"**
→ Verifica que el backend esté corriendo: `netstat -ano | findstr :3000`

**"No se ven datos"**
→ Recarga el navegador con `Ctrl + Shift + R`

---

## 📚 MÁS DETALLES

Lee **GUIA_PROBAR_DISTRIBUCION.md** para instrucciones completas con:
- Formatos exactos de Excel
- Ejemplos de datos
- Solución de problemas
- Tips para la presentación

---

**✅ LISTO PARA PROBAR**

**Orden**: Estudiantes → Planificaciones → Distribución → Ver Mapa de Calor

**¡El algoritmo de IA asignará las aulas automáticamente!** 🤖
