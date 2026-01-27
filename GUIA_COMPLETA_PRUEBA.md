# GUIA COMPLETA - Sistema UIDE Gestion de Aulas

## RESUMEN DEL FLUJO COMPLETO

### 1. ADMINISTRADOR sube listado de estudiantes (Excel)
### 2. Sistema guarda estudiantes en BD
### 3. ESTUDIANTE inicia sesion con cedula
### 4. Sistema carga automaticamente sus datos desde BD:
   - Nombre completo
   - Email
   - Telefono
   - Carrera
   - Nivel
   - Materias inscritas
### 5. Estudiante completa su solicitud de reserva de aula

---

## PASO 1: Preparar Base de Datos

```sql
-- Verifica que tengas las carreras activas
SELECT * FROM uploads_carreras WHERE activa = true;

-- Debe mostrar al menos:
-- Derecho
-- Ingenieria en Tecnologias de la Informacion
-- Arquitectura
```

---

## PASO 2: Crear Excel de Estudiantes

El Excel debe tener **2 hojas (sheets)**:

### Sheet1: Estudiantes
| cedula | nombres | apellidos | email | telefono | carrera_id | nivel |
|--------|---------|-----------|-------|----------|------------|-------|
| 1234567890 | Juan Carlos | Perez Garcia | juan.perez@uide.edu.ec | 0991234567 | 1 | 1 |
| 0987654321 | Maria Fernanda | Gonzalez Lopez | maria.gonzalez@uide.edu.ec | 0999876543 | 1 | 1 |
| 1122334455 | Carlos Alberto | Rodriguez Martinez | carlos.rodriguez@uide.edu.ec | 0981122334 | 2 | 1 |

### Sheet2: Materias Inscritas
| cedula_estudiante | codigo_materia | nivel | paralelo |
|-------------------|----------------|-------|----------|
| 1234567890 | DER101 | 1 | A |
| 1234567890 | DER102 | 1 | A |
| 0987654321 | DER101 | 1 | A |
| 1122334455 | ING201 | 1 | A |

**IMPORTANTE:** Las materias deben existir previamente en la tabla `clases`.

---

## PASO 3: Probar Login de Estudiante

### Endpoint Backend
`GET /api/estudiantes/login/:cedula`

### Probar con curl
```bash
curl http://localhost:3000/api/estudiantes/login/1234567890
```

Respuesta esperada:
```json
{
  "success": true,
  "estudiante": {
    "id": 1,
    "cedula": "1234567890",
    "nombres": "Juan Carlos",
    "apellidos": "Perez Garcia",
    "nombre_completo": "Juan Carlos Perez Garcia",
    "email": "juan.perez@uide.edu.ec",
    "telefono": "0991234567",
    "carrera_nombre": "Derecho",
    "nivel": 1,
    "materias": []
  }
}
```

---

## VERIFICACION

### 1. Verificar estudiantes en BD
```sql
SELECT 
  cedula,
  nombre,
  escuela,
  nivel,
  email
FROM estudiantes
ORDER BY nombre;
```

### 2. Verificar que tabla estudiantes_materias existe
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%estudiante%' OR table_name LIKE '%materia%';
```

---

## TROUBLESHOOTING

### Problema: "Estudiante no encontrado"
- Verifica en BD: `SELECT * FROM estudiantes WHERE cedula = '1234567890';`
- Verifica que el campo `estado` no exista o sea NULL/ACTIVO

### Problema: "Materias vacias"
- La tabla `estudiantes_materias` puede no existir aun
- Se implementara cuando sea necesario

### Problema: "Error de conexion"
- Verifica backend: `docker-compose ps backend`
- Verifica logs: `docker-compose logs backend`

---

## CREDENCIALES DEL SISTEMA

### Admin
- Email: `admin.uide.nuevo@uide.edu.ec`
- Password: `AdminUide#2026`

### Directores
1. Raquel Veintimilla (Derecho)
   - Email: `raquel.veintimilla.director@uide.edu.ec`
   - Password: `DirUide#2026R`

2. Lorena Conde (TICs)
   - Email: `lorena.conde.director@uide.edu.ec`
   - Password: `DirUide#2026L`

3. Freddy Salazar (Arquitectura)
   - Email: `freddy.salazar.director@uide.edu.ec`
   - Password: `DirUide#2026F`

---

Listo. Con esto tienes el sistema completo funcionando.
