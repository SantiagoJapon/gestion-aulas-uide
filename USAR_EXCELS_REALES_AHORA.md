# 📊 USAR EXCELS REALES PARA DISTRIBUCIÓN

## ✅ CAMBIO IMPLEMENTADO

Ahora el sistema **reemplaza** las clases cuando subes un nuevo Excel (no agrega duplicados).

---

## 🔧 PASO 1: LIMPIAR CLASES DEMO (1 MIN)

### Eliminar las 13 clases de demostración:

```bash
cd backend
node scripts/limpiar_clases_demo.js
```

**Verás:**
```
✅ 13 clases eliminadas exitosamente
```

Esto deja la base de datos **limpia** para empezar con los excels reales.

---

## 📤 PASO 2: SUBIR EXCELS REALES

### Como Director:

1. Login con tu usuario de director:
   ```
   Email: lorena.conde@uide.edu.ec  (Director Informática)
   Password: uide2024
   ```

2. Ve a **"Subir Planificación"**

3. Sube tu Excel con la planificación de tu carrera

4. El sistema:
   - ✅ Elimina las clases antiguas de **tu carrera**
   - ✅ Lee automáticamente el Excel
   - ✅ Detecta columnas (materia, ciclo, estudiantes, horario, etc.)
   - ✅ Guarda todas las nuevas clases

---

## 🎯 PASO 3: EJECUTAR DISTRIBUCIÓN

### Como Administrador:

1. Login como admin:
   ```
   Email: admin@uide.edu.ec
   Password: admin123
   ```

2. Click en **"Ejecutar Distribución"** (botón verde)

3. El sistema:
   - ✅ Lee TODAS las clases de TODOS los excels subidos
   - ✅ Asigna aulas según capacidad, disponibilidad, horarios
   - ✅ Evita conflictos de horarios

4. Ve el resultado en el **Horario Visual**

---

## 📋 FORMATO DEL EXCEL

El sistema detecta automáticamente estas columnas (no importa el orden):

### Columnas Detectadas:
- **Materia**: `MATERIA`, `Asignatura`, `Curso`, `Subject`
- **Ciclo**: `CICLO`, `Nivel`, `Semestre`, `Year`
- **Paralelo**: `PARALELO`, `Grupo`, `Sección`
- **Día**: `DIA`, `Day`, `Jornada`
- **Hora**: `HORA`, `Horario`, `Time` (formato: "07:00 - 09:00")
- **Hora Inicio**: `HORA_INICIO`, `Inicio`, `Start`
- **Hora Fin**: `HORA_FIN`, `Fin`, `End`
- **Estudiantes**: `ESTUDIANTES`, `Alumnos`, `NRO`, `Cantidad`
- **Docente**: `DOCENTE`, `Profesor`, `Teacher`
- **Aula**: `AULA`, `Salón`, `Lab`, `Classroom` (opcional, se asigna después)

### Ejemplo Mínimo:

| MATERIA | CICLO | PARALELO | DIA | HORA | ESTUDIANTES | DOCENTE |
|---------|-------|----------|-----|------|-------------|---------|
| Programación I | 1 | A | Lunes | 07:00 - 09:00 | 30 | Dr. García |
| Cálculo I | 1 | B | Martes | 09:00 - 11:00 | 35 | Ing. López |

---

## 🔄 FLUJO COMPLETO

```
1. DIRECTOR sube Excel de Informática
   → Sistema elimina clases viejas de Informática
   → Sistema guarda nuevas clases de Informática

2. DIRECTOR sube Excel de Administración
   → Sistema elimina clases viejas de Administración
   → Sistema guarda nuevas clases de Administración

3. ADMIN ejecuta "Distribución"
   → Sistema asigna aulas a TODAS las clases (Informática + Administración)
   → Se genera el horario completo
```

---

## ✅ VENTAJAS DEL NUEVO SISTEMA

✅ **No duplica clases** - Cada nuevo Excel reemplaza el anterior de esa carrera  
✅ **Procesa automáticamente** - No necesitas formato específico  
✅ **Detecta columnas** - Reconoce diferentes nombres de columnas  
✅ **Mantiene otras carreras** - Solo reemplaza la carrera que subiste  
✅ **Distribución global** - El admin distribuye todo de una vez

---

## 🎯 PARA TU PRESENTACIÓN

### Opción A: Local (probando ahora mismo)

1. **Limpia las clases demo**:
   ```bash
   cd backend
   node scripts/limpiar_clases_demo.js
   ```

2. **Sube tus excels reales** como director

3. **Ejecuta distribución** como admin

4. **Muestra el horario** con datos reales

---

### Opción B: En la Nube (Vercel + Render)

Después de desplegar:

1. Usa la **Shell de Render** para limpiar:
   ```bash
   node scripts/limpiar_clases_demo.js
   ```

2. Sube excels desde la interfaz web

3. Ejecuta distribución

4. Comparte la URL de Vercel

---

## 🆘 SI HAY PROBLEMAS

### "No encuentra columna MATERIA"
→ El Excel no tiene ninguna columna con ese nombre
→ Solución: Agrega una columna `MATERIA` o `Asignatura`

### "0 clases procesadas"
→ Verifica que haya datos en el Excel
→ Asegúrate de que la primera fila tenga los nombres de columnas

### "Clases duplicadas"
→ Ejecuta `limpiar_clases_demo.js` de nuevo
→ Vuelve a subir los excels

---

## 📝 RESUMEN

```bash
# 1. Limpiar demo
cd backend
node scripts/limpiar_clases_demo.js

# 2. Directores suben excels (desde la web)

# 3. Admin ejecuta distribución (desde la web)

# ¡LISTO! 🎉
```

---

**¿Listo para probar con datos reales?** 🚀
