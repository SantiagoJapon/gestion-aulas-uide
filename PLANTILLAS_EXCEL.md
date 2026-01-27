# 📊 PLANTILLAS EXCEL PARA PRUEBAS

## 📝 PLANTILLA 1: ESTUDIANTES

### Formato Requerido:

| CÉDULA      | APELLIDOS Y NOMBRES      | NIVEL | ESCUELA     |
|-------------|-------------------------|-------|-------------|
| 1234567890  | Pérez García Juan Carlos| 1     | Derecho     |
| 0987654321  | López Martínez María    | 1     | Derecho     |
| 1122334455  | González Ramírez Pedro  | 1     | Derecho     |

### Datos de Ejemplo para Copiar:

```
CÉDULA,APELLIDOS Y NOMBRES,NIVEL,ESCUELA
1721234567,Pérez García Juan Carlos,1,Derecho
1720987654,López Martínez María Elena,1,Derecho
1721122334,González Ramírez Pedro Luis,1,Derecho
1725566778,Rodríguez Silva Ana María,1,Derecho
1722233445,Morales Castro Luis Fernando,1,Derecho
1726677889,Sánchez Ruiz Carmen Rosa,1,Derecho
1723344556,Torres Mendoza Diego Andrés,1,Derecho
1727788990,Ramírez López Laura Patricia,1,Derecho
1724455667,Castro Vargas Miguel Ángel,1,Derecho
1728899001,Fernández Ortiz Sofía Isabel,1,Derecho
1725566778,Herrera Gómez Roberto Carlos,1,Derecho
1729900112,Jiménez Flores Valentina,1,Derecho
1726677889,Mendoza Silva Gabriel,1,Derecho
1721234501,Ortiz Castro Diana,1,Derecho
1720987602,Vargas Pérez Sebastián,1,Derecho
```

### Cómo Crear:

1. Abre Excel
2. Copia y pega los datos de arriba
3. Guarda como `estudiantes_derecho.xlsx`

---

## 📅 PLANTILLA 2: PLANIFICACIÓN

### Formato Requerido:

**IMPORTANTE**: Los encabezados deben estar en la **fila 9**

```
Fila 1-8: Información de la carrera (opcional)

Fila 9 (ENCABEZADOS):
ESCUELA | CARRERA | NIVEL | Materia | Docente | L | M | X | J | V | S

Fila 10+:
Derecho | Derecho | 1 | Derecho Civil I | Dr. Juan Pérez | 7-9 | | 7-9 | | |
Derecho | Derecho | 1 | Derecho Constitucional | Dra. María López | | 9-11 | | 9-11 | |
```

### Datos de Ejemplo Completos:

```
Fila 1: UNIVERSIDAD INTERNACIONAL DEL ECUADOR
Fila 2: FACULTAD DE JURISPRUDENCIA
Fila 3: CARRERA DE DERECHO
Fila 4: PERIODO: 2024-2025
Fila 5: 
Fila 6: PLANIFICACIÓN ACADÉMICA
Fila 7: 
Fila 8: 
Fila 9: ESCUELA	CARRERA	NIVEL	Materia	Docente	L	M	X	J	V	S

Fila 10: Derecho	Derecho	1	Derecho Civil I	Dr. Juan Pérez	7-9		7-9			
Fila 11: Derecho	Derecho	1	Derecho Constitucional	Dra. María López		9-11		9-11		
Fila 12: Derecho	Derecho	1	Derecho Penal	Dr. Carlos Sánchez			11-13		11-13	
Fila 13: Derecho	Derecho	1	Introducción al Derecho	Dra. Ana Torres	14-16				14-16	
Fila 14: Derecho	Derecho	1	Metodología de Investigación	Dr. Luis Morales		16-18			16-18	
```

### Horarios Válidos:

- `7-9` = 7:00 a 9:00
- `9-11` = 9:00 a 11:00
- `11-13` = 11:00 a 13:00
- `14-16` = 14:00 a 16:00
- `16-18` = 16:00 a 18:00
- `18-20` = 18:00 a 20:00

### Cómo Crear:

1. Abre Excel
2. **Deja las filas 1-8 para información general** (o vacías)
3. **En la fila 9**, pon los encabezados EXACTAMENTE como se muestran
4. **Desde la fila 10**, pon las materias
5. Guarda como `planificacion_derecho.xlsx`

---

## ⚠️ ERRORES COMUNES

### ❌ Error: "Formato incorrecto"
**Causa**: Encabezados no están en fila 9
**Solución**: Mueve los encabezados a la fila 9

### ❌ Error: "Horario inválido"
**Causa**: Formato de hora incorrecto (ej: "7:00-9:00" en lugar de "7-9")
**Solución**: Usa formato `7-9`, `9-11`, etc.

### ❌ Error: "Cédula inválida"
**Causa**: Cédula no ecuatoriana o muy corta
**Solución**: Usa 10 dígitos válidos (1721234567)

---

## 🎯 DATOS MÍNIMOS PARA PROBAR

### Mínimo para una prueba exitosa:

- **Estudiantes**: Al menos 10 estudiantes
- **Planificación**: Al menos 3 materias con horarios diferentes
- **Importante**: Las materias deben tener horarios que no se solapen

---

## 📁 ARCHIVOS YA CREADOS

Ya tienes:
- ✅ `planificacion_derecho_ejemplo.xlsx` (en la carpeta raíz)

Necesitas crear:
- ⏳ `estudiantes_derecho.xlsx` (usa la plantilla de arriba)

---

## 🚀 PROBAR AHORA

1. **Crea `estudiantes_derecho.xlsx`** con la plantilla de arriba
2. **Usa `planificacion_derecho_ejemplo.xlsx`** que ya existe
3. **Sube ambos archivos** desde el frontend
4. **Ejecuta la distribución**
5. **Ve el mapa de calor**

---

**✅ CON ESTAS PLANTILLAS PUEDES PROBAR TODO EL SISTEMA**

**Tiempo estimado de configuración**: 5 minutos
**Resultado**: Sistema completo funcionando con distribución automática
