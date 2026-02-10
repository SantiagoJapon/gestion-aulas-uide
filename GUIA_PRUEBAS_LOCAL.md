# Guía de Pruebas Integrales del Sistema (Entorno Local)

Esta guía te permitirá probar detalladamente todo el flujo del sistema Gestión Aulas UIDE, desde la carga de planificaciones hasta la distribución automatizada y el uso del bot, ejecutándose en tu máquina local.

## 1. Preparación del Entorno

### Iniciar el Backend
1.  Abre una terminal en `backend/`.
2.  Ejecuta: `npm run dev`
3.  Verás que el servidor inicia en el puerto **3000** y se crean los usuarios semilla (si es la primera vez).

### Iniciar el Frontend
1.  Abre otra terminal en `frontend/`.
2.  Ejecuta: `npm run dev`
3.  Accede a la URL indicada (generalmente `http://localhost:5173`).

---

## 2. Credenciales de Prueba (Usuarios Semilla)

El sistema genera automáticamente estos usuarios para pruebas:

| Rol | Email | Password |
| :--- | :--- | :--- |
| **Administrador** | `admin@uide.edu.ec` | `admin123` |
| **Director (Derecho)** | `raquel.veintimilla@uide.edu.ec` | `uide2024` |
| **Director (Informática)** | `lorena.conde@uide.edu.ec` | `uide2024` |
| **Director (Arquitectura)** | `freddy.salazar@uide.edu.ec` | `uide2024` |

---

## 3. Flujo Paso a Paso

### A. Perfil Director: Carga de Planificación
1.  **Login**: Ingresa con el usuario de **Director de Informática** (`lorena.conde@uide.edu.ec`).
2.  **Dashboard**: Verás el panel del director.
3.  **Acción**: Ve a la sección **"Subir Planificación"**.
4.  **Archivo de Prueba**: Crea un Excel (`.xlsx`) con los siguientes encabezados en la primera fila (Hoja 1):
    *   `Materia`
    *   `Ciclo` (ej: 1, 2, 3...)
    *   `Paralelo` (ej: A, B)
    *   `Dia` (ej: Lunes, Martes...)
    *   `Hora Inicio` (formato HH:MM, ej: 07:00)
    *   `Hora Fin` (formato HH:MM, ej: 09:00)
    *   `Estudiantes` (número, ej: 30)
    *   `Docente` (Nombre Apellido)
    *   `Aula` (Opcional, dejar vacío para que el sistema asigne)

    *Ejemplo de fila:*
    `Programación I | 1 | A | Lunes | 07:00 | 09:00 | 25 | Juan Perez | `

5.  **Subida**: Sube el archivo.
6.  **Validación**: El sistema procesará el archivo y mostrará **"Exitoso - Pendiente de Revisión"**. Observa que **NO** se inicia la distribución automática, respetando el nuevo flujo de control.

### B. Perfil Administrador: Centro de Control y Automatización
1.  **Login**: Cierra sesión e ingresa como **Administrador** (`admin@uide.edu.ec`).
2.  **Navegación**: Ve a la pestaña **"Distribución"** (Icono de robot/engranaje).
3.  **Centro de Control**:
    *   Verás la "Cola de Aprobación" con la planificación que acabas de subir como director.
    *   Estado: "Pendiente".
4.  **Simulación (Human-in-the-loop)**:
    *   Haz clic en **"Simular Impacto de Cambios"**.
    *   El sistema verificará conflictos potenciales sin aplicar cambios reales.
5.  **Ejecución de la Automatización**:
    *   Haz clic en **"Iniciar Distribución Global"**.
    *   Verás el progreso paso a paso: *Validando disponibilidad... Resolviendo choques... Optimizando capacidad...*
    *   Al finalizar, el estado cambiará y el "Horario Maestro" se actualizará.
6.  **Verificación**:
    *   Ve a la pestaña "General" -> "Horario Maestro".
    *   Busca las clases que subiste. Deberían tener aulas asignadas automáticamente (ej: "Laboratorio 1" si es Informática, basado en las reglas de prioridad).

### C. Reportes
1.  En el Dashboard de Admin, ve a la pestaña **"Reportes"**.
2.  Genera un reporte de "Ocupación" para verificar cómo quedaron distribuidas las aulas.

---

## 4. Pruebas del Bot y Consultas (Sin Telégram Real)

Como el sistema está en local, no puedes usar Telegram directamente a menos que configures un túnel (ngrok). Sin embargo, puedes probar **toda la lógica del bot** usando simulaciones HTTP.

Puedes usar **Postman**, **Insomnia** o `curl` para probar estos endpoints que simulan lo que haría el bot:

### Consultar Disponibilidad
Simula que un estudiante pregunta "¿Hay aulas libres el Lunes a las 10:00?"

```bash
GET http://localhost:3000/api/bot/disponibilidad?dia=Lunes&hora=10:00
```

### Ubicar Docente
Simula buscar a un profesor.

```bash
GET http://localhost:3000/api/bot/docente?nombre=Juan Perez
```

### Crear Reserva (Simulación)
```bash
POST http://localhost:3000/api/bot/reserva
Content-Type: application/json

{
  "solicitante": "Estudiante Prueba",
  "motivo": "Grupo de estudio",
  "fecha": "2024-02-15",
  "hora_inicio": "10:00",
  "hora_fin": "12:00"
}
```

---

## 5. Pruebas de Reservas y Consultas (UI)

1.  **Perfil Admin/Director**:
    *   Revisa el **Mapa de Calor** en el Dashboard. Debe reflejar las nuevas clases asignadas.
    *   Usa el buscador de "Control de Aulas" para ver el estado específico de un aula (ej: Laboratorio 1).

## Resumen del Flujo "Human-in-the-loop" Comprobado

1.  Director sube -> Estado "Pendiente" (Stop).
2.  Admin revisa cola -> Simula -> Ejecuta Automatización.
3.  Sistema asigna aulas -> Notifica finalización.
4.  Bot/UI reflejan los cambios en tiempo real.
