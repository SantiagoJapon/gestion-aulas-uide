# Guion de Demo — Sistema de Gestión de Aulas UIDE

**Duración total estimada:** 10-12 minutos (ajustable: sección "Recorte de emergencia" al final)
**Objetivo:** que quien vea la demo entienda el problema, vea la solución funcionando en vivo, y salga con una idea clara del valor — sin necesitar explicación técnica.

---

## 0. Antes de empezar (checklist de preparación)

- [ ] `docker-compose up -d` corriendo, todos los servicios "healthy" (`docker-compose ps`)
- [ ] Frontend abierto en `http://localhost:5173` (o la URL de producción), **zoom del navegador al 100%**
- [ ] 3 usuarios de prueba con **nombres reales del contexto UIDE** (no "Usuario Test"): un Admin, un Director de una carrera real, un Profesor real
- [ ] Datos de ejemplo cargados: al menos 8-10 aulas con nombres reales (A-01, LAB-03, etc.), 2-3 carreras, un conjunto de clases planificadas para la semana actual
- [ ] Preparar **un conflicto de horario real** en los datos (dos clases que compiten por la misma aula) — lo vas a necesitar en la sección 5
- [ ] Un aula marcada como "mantenimiento" para mostrar el estado visual
- [ ] WhatsApp del bot conectado y con un número de prueba a mano para mostrar notificación real
- [ ] Cerrar cualquier pestaña con errores de consola visibles

---

## 1. Apertura — El dolor, sin tecnología (30-45 segundos)

**No abras el navegador todavía.** Habla primero.

> "Antes de mostrarles el sistema, quiero que se pongan en el lugar de un director de carrera un lunes en la mañana. Necesita saber qué aula está libre el martes de 2 a 4pm. Hoy eso significa: llamar a alguien, revisar un Excel que probablemente está desactualizado, o simplemente adivinar y esperar que no haya conflicto. Y cuando sí hay un conflicto — dos clases asignadas a la misma aula — normalmente se descubre el mismo día, con el profesor ya parado en la puerta."

> "Construí un sistema que resuelve exactamente esto: una sola fuente de verdad para aulas, horarios y reservas, con notificaciones automáticas por WhatsApp. Se los muestro funcionando."

**Ahora sí, abre el navegador.**

---

## 2. Login y primera impresión (30 segundos)

1. Entra a `http://localhost:5173`
2. Muestra la pantalla de login (mascota UIDE, diseño institucional)
3. Inicia sesión como **Admin**

**Narración mientras carga:**
> "El sistema tiene 4 roles distintos — Administrador, Director de carrera, Profesor y Estudiante — cada uno con exactamente lo que necesita ver, nada más. Empezamos por el rol de mayor visibilidad: Administrador."

**Qué señalar en el dashboard:**
- El diseño limpio, paleta institucional UIDE (vino `#910048`, dorado `#EAAA00`)
- La barra lateral con las secciones disponibles

---

## 3. El mapa de calor — el corazón visual del sistema (90 segundos)

Este es el momento "wow" de la demo. Tómate tu tiempo aquí.

1. Ve a **Disponibilidad de Aulas** (mapa de calor)
2. Señala con el cursor (sin hacer clic todavía) cómo cada celda representa un aula en un horario específico

**Narración:**
> "Esto es el mapa de calor. De un vistazo, cualquiera ve qué aula está libre, cuál está ocupada, y cuál está en mantenimiento — sin tener que preguntarle a nadie."

3. Pasa el cursor sobre una celda ocupada → muestra el tooltip con materia, docente, cantidad de estudiantes
4. Pasa el cursor sobre el aula marcada en mantenimiento → señala el color/ícono distinto

**Narración:**
> "El estado de cada aula se ve en el mapa, en el tooltip, y en la tabla — siempre la misma información, en todos lados. No hay dos versiones de la verdad."

5. **Clic en una celda vacía** (aula libre el martes 2-4pm) → se abre el modal de reserva con día, hora y aula ya prellenados

**Narración:**
> "Y si el director ve que un aula está libre y la necesita, no tiene que ir a otra pantalla — reserva directamente desde aquí."

6. Completa la reserva con datos reales (materia, motivo) y guárdala
7. **Señala que la pantalla no recarga ni pierde el contexto** — aparece un toast de confirmación y el mapa se actualiza solo

---

## 4. Reserva confirmada por WhatsApp (60 segundos — diferenciador clave)

Este es el punto que nadie más tiene. No lo apures.

1. Muestra el teléfono con WhatsApp abierto (o la pantalla del bot si es una demo remota)
2. Espera a que llegue el mensaje de confirmación de la reserva que acabas de crear

**Narración:**
> "Aquí está la parte que hace la diferencia. La reserva no se queda encerrada en el sistema — el profesor o el director recibe la confirmación directo por WhatsApp, el canal que ya usan todos los días. No hay que enseñarle a nadie una app nueva para enterarse de un cambio de aula."

3. (Opcional, si el flujo lo soporta) Muestra el auto-login por teléfono: un usuario nuevo escribe al bot y el sistema lo reconoce automáticamente.

---

## 5. El conflicto — construye credibilidad, no la rompas (90 segundos)

Aquí es donde la mayoría de demos fallan: solo muestran el camino feliz. Tú vas a mostrar que el sistema también previene errores.

1. Vuelve al mapa de calor
2. Intenta reservar (o reasignar por drag & drop, si ya está activo) una clase a una aula que **ya tiene otra clase asignada en ese horario** — el conflicto que preparaste antes

**Narración, antes de hacer clic:**
> "Ahora les voy a mostrar algo que pasa todo el tiempo en la operación real: un conflicto de horario. Miren qué hace el sistema."

3. Muestra el modal de confirmación de conflicto: "Esta aula ya tiene [Materia] de [Docente] a esta hora. ¿Reemplazar / Buscar otra aula / Cancelar?"

**Narración:**
> "El sistema no deja pasar el conflicto en silencio, ni bloquea sin explicar — le dice exactamente qué está chocando y le da la decisión al usuario. Esto es lo que hoy se descubre el mismo día de la clase; acá se detecta al momento de intentar la reserva."

4. Cancela o resuelve el conflicto eligiendo otra aula, para mostrar la resolución completa.

---

## 6. Distribución automática — la parte "inteligente" (90 segundos)

Cambia de rol si es necesario (Admin o Director).

1. Ve a **Subir Planificación** — muestra brevemente (sin narrar cada campo) cómo se sube un Excel con la planificación de clases de una carrera
2. Ve a **Ejecutar Distribución**

**Narración:**
> "Cuando un director sube la planificación del semestre en Excel, el sistema la procesa automáticamente y extrae cada clase, docente y horario. Luego, con un clic, el algoritmo de distribución asigna aulas automáticamente considerando capacidad, disponibilidad y tipo de espacio."

3. Ejecuta la distribución (o muestra el resultado si ya está corrido) y señala el resultado: clases asignadas a aulas, sin conflictos.

**Narración:**
> "Lo que antes tomaba horas de coordinación manual — repartir 100+ clases entre las aulas disponibles — el sistema lo resuelve en segundos, y cualquier conflicto que no se pudo resolver automáticamente queda marcado para revisión manual."

---

## 7. Vista del Director — aprobaciones y control de su carrera (60 segundos)

1. Cierra sesión, entra como **Director**
2. Muestra su dashboard — más simple, filtrado a su carrera

**Narración:**
> "El director no ve todo el sistema — ve exactamente su carrera. Puede aprobar o rechazar reservas de sus profesores, ver el mapa de calor de sus aulas, y comunicarse con su equipo."

3. Muestra un ejemplo de aprobar/rechazar una reserva pendiente
4. (Si aplica) muestra el envío de un comunicado

---

## 8. Vista del Profesor/Estudiante — simplicidad total (45 segundos)

1. Cierra sesión, entra como **Profesor**

**Narración:**
> "Y para el profesor, todo se reduce a lo esencial: su próxima clase, su horario, y la posibilidad de reservar un espacio o reportar un problema — sin ruido de administración."

2. Muestra el widget de "próxima clase"
3. Muestra el botón de **Reportar Incidencia** (ej: "proyector no funciona") — envíalo y muéstralo aparecer del lado del Admin/Director si el tiempo lo permite

---

## 9. Reportes ejecutivos (30 segundos — opcional si hay tiempo)

1. Vuelve a Admin, ve a **Reporte Ejecutivo**

**Narración:**
> "Y para quien necesita ver el panorama completo — ocupación de aulas, uso por carrera, incidencias — hay un reporte ejecutivo que resume todo sin tener que perseguir datos manualmente."

---

## 10. Cierre — proyecta visión, no solo entrega (30 segundos)

> "Lo que acaban de ver ya resuelve el problema real: coordinar aulas sin depender de llamadas, Excel desactualizado o WhatsApp informal. Pero esto es solo la base. Lo siguiente en el roadmap es:
> - Distribución 100% automática con IA para semestres completos
> - Reportes predictivos de demanda de aulas por carrera
> - Expansión del bot de WhatsApp para autoservicio completo del estudiante
>
> Esto ya está corriendo en Docker, listo para producción, y cada pieza que vieron — el mapa de calor, las notificaciones, la distribución automática — es funcionalidad real, no un mockup."

---

## Guía rápida de manejo de preguntas técnicas (solo si preguntan)

| Si preguntan por... | Responde con |
|---|---|
| Stack tecnológico | "Backend en Node.js/Express, frontend en React, base de datos PostgreSQL, todo orquestado con Docker" |
| Seguridad | "Autenticación JWT, middleware de seguridad, validación de datos en cada endpoint" |
| Escalabilidad | "Arquitectura de contenedores independientes — backend, frontend, base de datos, automatización y bot escalan por separado" |
| Automatización | "n8n orquesta flujos de automatización (ej. notificaciones, recordatorios) sin necesidad de código adicional" |
| Tiempo de desarrollo | Responde con honestidad, pero enmarca en valor entregado, no en horas |

**Regla de oro:** si preguntan algo técnico, responde en 1-2 frases y **vuelve al valor de negocio**. No te quedes atrapado explicando arquitectura — eso fue justo el error que querías evitar.

---

## Recorte de emergencia (si solo tienes 5 minutos)

Quédate con lo esencial en este orden:
1. Apertura del dolor (sección 1)
2. Mapa de calor + reserva en vivo (sección 3)
3. Confirmación por WhatsApp (sección 4)
4. Cierre con visión (sección 10)

Corta todo lo demás. Estas 4 secciones por sí solas ya cuentan la historia completa: problema → solución en vivo → diferenciador único → visión de futuro.

---

## Errores a evitar durante la demo

- ❌ No navegues en silencio — narra la decisión *antes* de hacer clic
- ❌ No uses datos genéricos ("Aula 1", "Test User") — usa nombres reales del contexto UIDE
- ❌ No muestres solo el camino feliz — el conflicto de la sección 5 es lo que da credibilidad
- ❌ No te quedes atrapado en preguntas técnicas — responde corto y vuelve al valor
- ❌ No termines en un dashboard vacío — cierra con la frase de visión, no con un clic random
