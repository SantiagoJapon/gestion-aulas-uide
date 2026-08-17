# TODOS

## Base de datos

**Priority:** P3

Limpiar las ~100 restricciones `UNIQUE` duplicadas en `estudiantes.cedula`
(`estudiantes_cedula_key`, `estudiantes_cedula_key1`...`key99`), acumuladas por
un bug de sync ya corregido en `backend/src/models/Estudiante.js` (2026-08-16).
Ya no crecen más, pero las viejas siguen ahí — son puro peso muerto (cada INSERT/UPDATE
en `cedula` mantiene ~100 índices redundantes). Dejarlas caer es DDL sobre una tabla
con 1127 registros reales, por eso se difirió. Verificar antes de borrar que ninguna
tenga un nombre referenciado en código (`grep -r "estudiantes_cedula_key"` — al 2026-08-16
no hay ninguno) y conservar solo `estudiantes_cedula` (el índice con nombre estable).

## Seguridad — Login por cédula

**Priority:** P1

`GET /api/estudiantes/login/:cedula` entrega sesión completa de estudiante con
solo la cédula (10 dígitos, no son secretas) — sin contraseña ni segundo factor.
El 2026-08-16 se agregó `authLimiter` (10 intentos/15min por IP) como mitigación,
pero sigue siendo el único factor de autenticación para 1127 estudiantes reales.
Decidir: ¿agregar un segundo factor (código por WhatsApp/email), o restringir esta
ruta a un contexto ya autenticado (ej. solo invocable desde el bot de WhatsApp con
su propia clave de servicio) antes de depender de ella en producción?

## n8n / Notificaciones

**Priority:** P2

Email + notificación in-app (fan-out) para eventos de reserva (`reserva_creada`,
`reserva_aprobada`, `reserva_rechazada`) está diferido. Hoy `sistema-notificaciones.json`
solo envía WhatsApp vía Evolution API.

Dos mecanismos considerados para agregar el canal de email:
- **(a)** Nodo SMTP nativo dentro del workflow de n8n — requiere duplicar credenciales
  SMTP que ya existen y están configuradas en el backend (`emailService.js`).
- **(b)** Nuevo endpoint callback en el backend (ej. `POST /api/notificaciones/email-reserva`)
  que reutiliza `emailService.js` directamente — evita duplicar credenciales, pero suma
  un endpoint nuevo + mecanismo de autenticación de servicio para que n8n llame al backend.

Revisar y decidir cuando se priorice el canal de email.

## Completed
