# 📊 FORMATO CORRECTO DEL EXCEL PARA ESTUDIANTES

## ⚠️ PROBLEMA COMÚN

Si ves este error:
```
El Excel no tiene las columnas requeridas. Faltan: cedula, nombres, apellidos
```

Es porque el archivo no tiene el formato correcto.

---

## ✅ FORMATO CORRECTO

### Regla #1: Primera fila = Encabezados
La **primera fila** del Excel debe tener exactamente estos nombres:

```
cedula | nombres | apellidos | email | telefono | escuela | nivel
```

### Regla #2: Sin filas vacías arriba
❌ **MAL:**
```
[Fila vacía]
[Fila vacía]
Lista de Estudiantes UIDE 2026
cedula | nombres | apellidos
1234567890 | Juan | Pérez
```

✅ **BIEN:**
```
cedula | nombres | apellidos
1234567890 | Juan | Pérez
0987654321 | María | González
```

### Regla #3: Nombres exactos (minúsculas)
Los nombres de las columnas deben ser **exactamente**:
- `cedula` (no "Cedula", "CEDULA", "Cédula")
- `nombres` (no "Nombre", "NOMBRES")
- `apellidos` (no "Apellido", "APELLIDOS")

---

## 📝 PLANTILLA SIMPLE

Copia y pega esto en un Excel nuevo:

```
cedula       | nombres       | apellidos
1234567890   | Juan Carlos   | Pérez García
0987654321   | María         | González López
```

---

## 📝 PLANTILLA COMPLETA

Si quieres incluir más datos:

```
cedula       | nombres       | apellidos        | email                | telefono    | escuela  | nivel
1234567890   | Juan Carlos   | Pérez García     | juan@uide.edu.ec    | 0991234567  | Derecho  | 1
0987654321   | María         | González López   | maria@uide.edu.ec   | 0999876543  | Derecho  | 1
```

---

## 🔧 CÓMO CREAR UN EXCEL CORRECTO

### Opción 1: Desde Cero
1. Abre Excel nuevo
2. En la celda A1 escribe: `cedula`
3. En la celda B1 escribe: `nombres`
4. En la celda C1 escribe: `apellidos`
5. Desde la fila 2, llena los datos

### Opción 2: Corrigir Excel Existente
Si ya tienes un archivo con datos:

1. **Eliminar filas arriba de los datos**
   - Borra todas las filas que no sean datos (títulos, logos, etc.)
   - Los encabezados deben quedar en la fila 1

2. **Renombrar columnas**
   - Primera columna → `cedula`
   - Segunda columna → `nombres`
   - Tercera columna → `apellidos`

3. **Guardar como nuevo archivo**
   - Guarda con nombre diferente para no perder el original
   - Formato: `.xlsx` o `.xls`

---

## ❌ ERRORES COMUNES Y SOLUCIONES

### Error: "Columnas detectadas: __EMPTY_5"
**Problema:** El Excel tiene encabezados vacíos o mal formateados

**Solución:**
1. Abre el Excel
2. Ve a la primera fila
3. Borra todo
4. Escribe manualmente: `cedula`, `nombres`, `apellidos` en A1, B1, C1
5. Guarda y vuelve a subir

### Error: "Los encabezados parecen estar en la fila X"
**Problema:** Hay filas vacías o de título antes de los encabezados

**Solución:**
1. Elimina todas las filas antes de la fila que tiene los encabezados
2. Los encabezados deben estar en la fila 1
3. Guarda y vuelve a subir

### Error: "Faltan columnas requeridas: cedula"
**Problema:** La columna no se llama exactamente `cedula`

**Solución:**
1. Verifica que la primera celda diga exactamente: `cedula` (todo minúsculas)
2. No debe tener espacios al inicio o final
3. No debe tener tildes ni caracteres especiales

---

## 🎯 CHECKLIST ANTES DE SUBIR

Antes de subir tu Excel, verifica:

- [ ] ¿Los encabezados están en la fila 1?
- [ ] ¿No hay filas vacías arriba de los encabezados?
- [ ] ¿La columna se llama `cedula` (minúsculas)?
- [ ] ¿La columna se llama `nombres` (minúsculas)?
- [ ] ¿La columna se llama `apellidos` (minúsculas)?
- [ ] ¿El archivo es .xlsx o .xls (no CSV)?
- [ ] ¿Todas las cédulas tienen 10 dígitos?
- [ ] ¿No hay filas completamente vacías entre los datos?

---

## 📊 EJEMPLO VISUAL

### ❌ MAL (No funcionará)

```
     A              B              C
1    
2    UNIVERSIDAD INTERNACIONAL DEL ECUADOR
3    Lista de Estudiantes 2026
4    
5    Cedula         Nombre         Apellido
6    1234567890     Juan           Pérez
```
**Problema:** Filas vacías arriba, nombre con mayúsculas

### ✅ BIEN (Funcionará)

```
     A              B              C
1    cedula         nombres        apellidos
2    1234567890     Juan           Pérez
3    0987654321     María          González
```
**Correcto:** Encabezados en fila 1, nombres correctos, datos desde fila 2

---

## 🔍 VERIFICAR FORMATO EN EXCEL

Antes de subir:

1. **Abre el archivo**
2. **Mira la primera fila**:
   - ¿Dice exactamente `cedula`, `nombres`, `apellidos`?
   - ¿Todo en minúsculas?
3. **Mira la segunda fila**:
   - ¿Tiene datos de un estudiante?
   - ¿No hay celdas vacías?
4. **Busca filas vacías**:
   - ¿Hay filas completamente vacías en el medio?
   - Elimínalas

---

## 💡 TIPS ADICIONALES

### Copiar desde otro archivo
Si tienes datos en otro formato:
1. Crea Excel nuevo
2. En A1, B1, C1 escribe: `cedula`, `nombres`, `apellidos`
3. Copia y pega los datos desde fila 2
4. Verifica que las cédulas no tengan puntos ni guiones

### Validar cédulas
Las cédulas ecuatorianas deben:
- Tener exactamente 10 dígitos
- No tener puntos, guiones ni espacios
- Ser válidas según el algoritmo ecuatoriano

### Caracteres especiales
- ✅ Tildes y ñ en nombres: PERMITIDO
- ✅ Espacios en nombres: PERMITIDO
- ❌ Caracteres raros en encabezados: NO PERMITIDO

---

## 🆘 SOPORTE

Si sigues teniendo problemas:

1. **Ver logs del backend:**
   ```bash
   docker logs gestion_aulas_backend --tail 50
   ```

2. **Buscar líneas que digan:**
   - `📋 Columnas detectadas:`
   - `❌ Error al procesar:`

3. **Compartir la línea de error** para diagnóstico

---

## 📦 PLANTILLA DESCARGABLE

Puedes crear un archivo `plantilla_estudiantes.xlsx` con este contenido:

**Hoja 1:**
```
cedula       | nombres | apellidos | email              | telefono    | escuela | nivel
1234567890   | Juan    | Pérez     | juan@uide.edu.ec  | 0991234567  | Derecho | 1
```

Reemplaza la fila 2 con tus datos reales y agrega más filas según necesites.

---

**¡Con este formato funcionará al 100%!** 🎉

Si el Excel tiene exactamente `cedula`, `nombres`, `apellidos` en la primera fila, debería subir sin problemas.
