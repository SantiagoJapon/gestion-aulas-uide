# TODOS

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
