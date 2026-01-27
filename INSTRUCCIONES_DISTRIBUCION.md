# 🚀 INSTRUCCIONES PARA LA DISTRIBUCIÓN AUTOMÁTICA

## ✅ BACKEND ACTUALIZADO

Backend reiniciado con código inteligente de detección de columnas:
- **PID**: 47868
- **Puerto**: 3000
- **Estado**: ✅ FUNCIONANDO

---

## 📝 PASOS PARA QUE FUNCIONE

### 1. Refrescar Navegador
Presiona `Ctrl + R` en tu navegador para asegurar que esté usando el backend actualizado.

### 2. Subir Planificaciones DE NUEVO

**IMPORTANTE**: Las planificaciones anteriores NO guardaron las clases. Necesitas subirlas de nuevo.

#### Login como cada director:
- `raquel.veintimilla@uide.edu.ec` / `uide2024` → Subir Excel de Derecho
- `lorena.conde@uide.edu.ec` / `uide2024` → Subir Excel de Informática  
- `freddy.salazar@uide.edu.ec` / `uide2024` → Subir Excel de Arquitectura

#### Al subir, verás en el frontend:
```
✅ Planificación subida exitosamente. Se está procesando...
```

#### En la consola del backend deberías ver:
```
📁 Procesando planificación de carrera: Informática
📚 134 filas en el Excel
📋 Columnas encontradas: [ 'DOCENTE', 'MATERIA', 'DÍA', 'HORA', 'Nro. ESTUDIANTES', ... ]

🔍 Mapeo de columnas detectado:
  - Materia: MATERIA ✅
  - Estudiantes: Nro. ESTUDIANTES ✅
  - Día: DÍA ✅
  - Hora: HORA ✅

[DEBUG] Fila 1:
  Materia: Introducción a los Redes de Datos
  Estudiantes: 25
  Día: Lunes
  Hora: 08:00 - 10:00

✅ Planificación guardada: 47 clases
```

### 3. Ejecutar Distribución

1. **Login como admin**: `admin@uide.edu.ec` / `admin123`
2. **Refrescar** el navegador
3. **Scrollear** hasta encontrar "Distribución Automática de Aulas"
4. **Click** en "Ejecutar Distribución" (botón verde)
5. **Confirmar** cuando pregunte
6. **Ver resultado**:
   ```
   ✅ Distribución Completada!
   • Total procesadas: 94
   • Exitosas: 82
   • Fallidas: 12
   ```

### 4. Ver Horario Visual

Después de ejecutar la distribución:
- Scrollea hacia abajo
- Verás "Horario de Clases" con una tabla visual
- Cada clase mostrará:
  - 📚 Materia
  - 📍 Aula asignada
  - 👨‍🏫 Docente
  - 👥 Número de estudiantes
  - 🕒 Horario

---

## 🧠 DETECCIÓN INTELIGENTE DE COLUMNAS

El sistema ahora detecta automáticamente las columnas de tu Excel sin importar cómo se llamen:

- **Materia**: `materia`, `asignatura`, `curso`, `MATERIA`, etc.
- **Estudiantes**: `estudiantes`, `alumnos`, `Nro. ESTUDIANTES`, `NRO. ALUMNOS`, etc.
- **Día**: `dia`, `DÍA`, `day`, `jornada`
- **Hora**: Acepta formato "10:00 - 13:00" en una columna O separado en inicio/fin
- **Docente**: `docente`, `profesor`, `DOCENTE`, etc.

**No necesitas cambiar el formato de tus Excels** - el sistema los analiza automáticamente.

---

## ⚠️ SI DICE "0 CLASES PROCESADAS"

Si después de subir la planificación ves "0 clases guardadas" o la distribución dice "0 clases procesadas":

1. Abre la consola del navegador (F12)
2. Abre la terminal del backend
3. Toma una captura de ambas
4. Revisa el mensaje de error

El sistema debería mostrar exactamente qué columnas encontró y por qué no pudo procesar las filas.

---

## 📊 LO QUE HACE EL ALGORITMO

Cuando ejecutes "Ejecutar Distribución":

1. **Lee todas las clases** guardadas en la base de datos
2. **Las ordena** por número de estudiantes (las más grandes primero)
3. **Para cada clase**:
   - Busca aulas disponibles en ese horario
   - Filtra por capacidad (debe caber todos los estudiantes)
   - Respeta restricciones de carrera (ej: SALA DE AUDIENCIAS solo Derecho)
   - Asigna el aula MÁS PEQUEÑA que cumpla (optimiza uso de espacio)
4. **Guarda las asignaciones** en la tabla `distribucion`
5. **Genera el horario visual** que puedes ver en el dashboard

---

## 🏢 RESTRICCIONES QUE RESPETA

- **SALA DE AUDIENCIAS** → Solo Derecho
- **Lab. Psicología (Aula 20)** → Solo Psicología
- **Aulas C16, C17, C18** → Solo Arquitectura (Taller maquetería)
- **LAB 1, LAB 2, LAB 3** → Prioridad Informática

---

## ✅ CHECKLIST

- [ ] Backend reiniciado (PID: 47868)
- [ ] Navegador refrescado (Ctrl + R)
- [ ] Planificaciones subidas DE NUEVO
- [ ] Verificado que diga "X clases guardadas" (X > 0)
- [ ] Distribución ejecutada como admin
- [ ] Horario visual visible

---

**Backend**: Puerto 3000, PID 47868 ✅
**Frontend**: Puerto 5173 ✅

**¡Sube las planificaciones AHORA y prueba la distribución!** 🚀
