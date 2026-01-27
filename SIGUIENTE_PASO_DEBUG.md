# 🔍 DEBUG: Detectar Formato del Excel

## 🎯 SITUACIÓN ACTUAL

✅ Las planificaciones dicen "subida exitosamente"  
❌ Pero se guardan **0 clases** en la base de datos

**Causa**: El sistema no está encontrando las columnas correctas en tu Excel

---

## 🔧 SOLUCIÓN APLICADA

Agregué **logging mejorado** para ver exactamente qué columnas tiene tu Excel.

---

## 📊 QUÉ HACER AHORA

### 1. Sube UNA planificación de nuevo

Cualquier carrera (Derecho, Informática, o la que quieras):

1. Login como director
2. Ve a "Subir Planificación"
3. Selecciona el archivo Excel
4. Click "Subir Planificación"
5. ✅ Dirá "subida exitosamente"

### 2. Revisa el Log del Backend

Después de subir, el backend mostrará algo como:

```
📁 Procesando planificación de carrera: Derecho
📚 51 clases en el Excel
[DEBUG] Fila 0: columnas disponibles: ['ESCUELA', 'CARRERA', 'NIVEL', 'Materia', 'Docente', 'L', 'M', 'X', 'J', 'V']
[DEBUG] Fila 1: columnas disponibles: ['ESCUELA', 'CARRERA', 'NIVEL', 'Materia', 'Docente', 'L', 'M', 'X', 'J', 'V']
```

### 3. Copia el Mensaje de [DEBUG]

**IMPORTANTE**: Copia exactamente lo que dice `[DEBUG] Fila 0: columnas disponibles:` y pégalo aquí para que pueda ajustar el código.

---

## 🎯 EJEMPLO

Si tu Excel tiene estas columnas:
```
ESCUELA | CARRERA | NIVEL | Materia | Docente | L | M | X | J | V | S
```

El sistema debe poder leerlas, pero necesito saber **exactamente** cómo se llaman para mapearlas correctamente.

---

## ⚠️ PROBLEMA CONOCIDO: Backend se Detiene

Si el backend no está corriendo (puerto 3000 sin respuesta):

### Reiniciar Manualmente:

**Opción 1** - Desde Terminal de Cursor:
```bash
cd backend
node src/index.js
```
Y **mantén la terminal abierta** (no la cierres).

**Opción 2** - PowerShell Nueva:
```powershell
cd C:\Users\sjapo\OneDrive\Documents\Proyectos\gestion-aulas-uide\backend
node src/index.js
```

### Verificar que Está Corriendo:
```powershell
netstat -ano | findstr :3000
```

Deberías ver:
```
TCP    0.0.0.0:3000    LISTENING    [PID]
```

---

## 🚀 FLUJO COMPLETO

1. ✅ Backend corriendo en puerto 3000
2. ✅ Sube una planificación
3. ✅ Ve el mensaje "[DEBUG] Fila 0: columnas disponibles:"
4. ✅ Copia las columnas y péga melas
5. ✅ Ajustaré el código para que lea esas columnas específicas
6. ✅ Las clases se guardarán correctamente

---

## 📝 MIENTRAS TANTO

Los errores 404 del MapaCalor son normales - ese endpoint se implementará después de que tengamos clases guardadas correctamente.

---

**✅ SIGUIENTE ACCIÓN**: 

1. Verifica que el backend esté corriendo (netstat)
2. Si no, reinícialo desde una terminal
3. Sube UNA planificación
4. Copia el mensaje [DEBUG] y pégalo aquí

**¡Así podré ver exactamente qué columnas tiene tu Excel y ajustar el código!** 🎯
