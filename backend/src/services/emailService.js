/**
 * ==========================================
 * SERVICIO DE EMAIL PROFESIONAL
 * ==========================================
 * Sistema de Gestión de Aulas - UIDE
 * 
 * Características:
 * - Envío de credenciales de acceso
 * - Plantillas HTML profesionales
 * - Manejo de errores robusto
 * - Cola de emails asíncrona
 * - Logging detallado
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// ==========================================
// CONFIGURACIÓN DEL TRANSPORTER
// ==========================================

// Dominios institucionales UIDE que requieren SMTP propio
const DOMINIOS_UIDE = ['@uide.edu.ec', '@docente.uide.edu.ec'];

function esCorreoUide(email) {
  return DOMINIOS_UIDE.some(d => email.endsWith(d));
}

/**
 * Crea el transporter para correos externos (Gmail / desarrollo).
 */
function crearTransporterGeneral() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP_USER/SMTP_PASS no configurados. Usando Ethereal (modo desarrollo).');
    // Crear cuenta Ethereal real para capturar correos en desarrollo
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: 'ethereal@example.com', pass: 'ethereal' },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      // NO usar ciphers:'SSLv3' — fuerza cifrados obsoletos y rompe
      // la negociación TLS con servidores institucionales modernos
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

/**
 * Crea el transporter para correos institucionales UIDE (@uide.edu.ec).
 * Requiere SMTP_UIDE_HOST en el .env.
 * Si no está configurado, cae al transporter general con advertencia.
 */
function crearTransporterUide() {
  if (!process.env.SMTP_UIDE_HOST) {
    console.warn(
      '⚠️  SMTP_UIDE_HOST no configurado. Los correos a @uide.edu.ec se enviarán ' +
      'por el SMTP general (pueden ir a spam o ser rechazados). ' +
      'Configura SMTP_UIDE_* en el .env para usar el relay institucional.'
    );
    return null; // señal para usar el general como fallback
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_UIDE_HOST,
    port: parseInt(process.env.SMTP_UIDE_PORT || '587'),
    secure: process.env.SMTP_UIDE_SECURE === 'true',
    auth: {
      user: process.env.SMTP_UIDE_USER,
      pass: process.env.SMTP_UIDE_PASS,
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

// Singletons:
//   null  → aún no inicializado
//   false → no disponible (SMTP_UIDE_HOST no configurado)
//   objeto nodemailer → listo para usar
let transporterGeneral = null;
let transporterUide = null;

/**
 * Devuelve el transporter apropiado según el dominio del destinatario.
 * @param {string} emailDestinatario
 */
function getTransporter(emailDestinatario = '') {
  if (esCorreoUide(emailDestinatario)) {
    if (transporterUide === null) {
      const t = crearTransporterUide();
      // false = no disponible (evita re-evaluar en cada llamada)
      transporterUide = t !== null ? t : false;
    }
    if (transporterUide !== false) {
      return transporterUide;
    }
    // Sin SMTP UIDE configurado → cae al general sin más warnings
  }

  if (!transporterGeneral) {
    transporterGeneral = crearTransporterGeneral();
  }
  return transporterGeneral;
}

// ==========================================
// GENERADOR DE CONTRASEÑAS TEMPORALES
// ==========================================

/**
 * Genera una contraseña temporal segura y aleatoria
 * @param {number} length - Longitud de la contraseña (default: 12)
 * @returns {string} Contraseña temporal segura
 */
function generarPasswordTemporal(length = 12) {
  const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const numeros = '0123456789';
  const especiales = '!@#$%^&*';

  // Asegurar al menos un carácter de cada tipo
  const password = [
    mayusculas[crypto.randomInt(mayusculas.length)],
    minusculas[crypto.randomInt(minusculas.length)],
    numeros[crypto.randomInt(numeros.length)],
    especiales[crypto.randomInt(especiales.length)]
  ];

  // Llenar el resto aleatoriamente
  const todos = mayusculas + minusculas + numeros + especiales;
  for (let i = 4; i < length; i++) {
    password.push(todos[crypto.randomInt(todos.length)]);
  }

  // Mezclar los caracteres
  return password.sort(() => crypto.randomInt(2) - 0.5).join('');
}

/**
 * Genera un token de expiración para contraseña temporal
 * @param {number} horas - Horas hasta la expiración (default: 24)
 * @returns {Date} Fecha de expiración
 */
function generarTokenExpiracion(horas = 24) {
  return new Date(Date.now() + horas * 60 * 60 * 1000);
}

// ==========================================
// PLANTILLAS DE EMAIL
// ==========================================

/**
 * Plantilla HTML para credenciales de usuario
 */
function getPlantillaCredenciales({ nombre, email, passwordTemporal, rol, linkAcceso, expiraEn }) {
  const rolMostrar = {
    'director': 'Director de Carrera',
    'docente': 'Docente',
    'estudiante': 'Estudiante'
  }[rol] || rol;

  const rolEmoji = {
    'director': '🏛️',
    'docente': '👨‍🏫',
    'estudiante': '🎓'
  }[rol] || '👤';

  const primerNombre = nombre ? nombre.split(' ')[0] : 'Usuario';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Credenciales de Acceso - UIDE</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1e1e1e;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e1e1e; padding: 24px 16px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #2b2b2b; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.5);">

          <!-- HEADER naranja -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #c2410c 100%); padding: 22px 28px; text-align: center;">
              <p style="color: rgba(255,255,255,0.85); font-size: 10px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; margin: 0 0 6px 0;">UIDE</p>
              <h1 style="color: #ffffff; margin: 0; font-size: 17px; font-weight: 700;">Universidad Internacional del Ecuador</h1>
              <p style="color: rgba(255,255,255,0.75); margin: 4px 0 0 0; font-size: 12px;">Sistema de Gestión de Aulas</p>
            </td>
          </tr>

          <!-- BIENVENIDA -->
          <tr>
            <td style="padding: 26px 28px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.07);">
              <div style="font-size: 36px; margin-bottom: 10px;">🎉</div>
              <h2 style="color: #f1f1f1; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">¡Bienvenido/a, ${primerNombre}!</h2>
              <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 0;">
                Tu cuenta en el <strong style="color: #f97316;">Sistema de Gestión de Aulas</strong> ha sido creada.<br>
                Estas son tus credenciales de acceso:
              </p>
            </td>
          </tr>

          <!-- CREDENCIALES -->
          <tr>
            <td style="padding: 20px 28px;">

              <!-- Usuario -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
                <tr>
                  <td width="36" valign="middle">
                    <div style="width: 34px; height: 34px; background-color: #3d3d3d; border-radius: 8px; text-align: center; font-size: 16px; line-height: 34px;">📧</div>
                  </td>
                  <td valign="middle" style="padding-left: 12px;">
                    <p style="color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0 0 2px 0;">Usuario / Correo</p>
                    <p style="color: #e5e7eb; font-size: 14px; font-weight: 600; margin: 0; word-break: break-all;">${email}</p>
                  </td>
                </tr>
              </table>

              <div style="border-top: 1px solid rgba(255,255,255,0.07); margin: 0 0 14px 0;"></div>

              <!-- Contraseña -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
                <tr>
                  <td width="36" valign="middle">
                    <div style="width: 34px; height: 34px; background-color: #3d3d3d; border-radius: 8px; text-align: center; font-size: 16px; line-height: 34px;">🔑</div>
                  </td>
                  <td valign="middle" style="padding-left: 12px;">
                    <p style="color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0 0 2px 0;">Contraseña Temporal</p>
                    <p style="color: #f97316; font-size: 20px; font-weight: 800; font-family: 'Courier New', Courier, monospace; margin: 0; letter-spacing: 3px;">${passwordTemporal}</p>
                  </td>
                </tr>
              </table>

              <div style="border-top: 1px solid rgba(255,255,255,0.07); margin: 0 0 14px 0;"></div>

              <!-- Rol -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="36" valign="middle">
                    <div style="width: 34px; height: 34px; background-color: #3d3d3d; border-radius: 8px; text-align: center; font-size: 16px; line-height: 34px;">${rolEmoji}</div>
                  </td>
                  <td valign="middle" style="padding-left: 12px;">
                    <p style="color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0 0 2px 0;">Rol Asignado</p>
                    <p style="color: #34d399; font-size: 14px; font-weight: 700; margin: 0;">${rolMostrar}</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- BOTÓN -->
          <tr>
            <td style="padding: 4px 28px 20px; text-align: center;">
              <a href="${linkAcceso}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #c2410c); color: #ffffff; padding: 13px 40px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px;">
                🌐 &nbsp;Ingresar al Sistema
              </a>
            </td>
          </tr>

          <!-- AVISO -->
          <tr>
            <td style="padding: 0 28px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(251,191,36,0.07); border-left: 3px solid #f59e0b; border-radius: 4px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="color: #fbbf24; font-size: 12px; margin: 0; line-height: 1.6;">
                      ⚠️ <strong>Al ingresar por primera vez</strong> el sistema te pedirá cambiar tu contraseña.
                      Expira en <strong>${expiraEn}</strong>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #222222; padding: 16px 28px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
              <p style="color: #f97316; font-size: 12px; font-weight: 700; margin: 0 0 4px 0;">Universidad Internacional del Ecuador — UIDE</p>
              <p style="color: #4b5563; font-size: 11px; margin: 0;">
                Correo automático · No responda este mensaje · © ${new Date().getFullYear()} UIDE
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Plantilla HTML para notificación de cambio de contraseña
 */
function getPlantillaCambioPassword({ nombre, linkCambio, expiraEn }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cambio de Contraseña - UIDE</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Universidad Internacional del Ecuador</h1>
              <p style="color: #a8c5e2; margin: 8px 0 0 0; font-size: 14px;">Sistema de Gestión de Aulas</p>
            </td>
          </tr>
          
          <!-- Contenido -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                Solicitud de Cambio de Contraseña
              </h2>
              
              <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                Hola${nombre ? `, ${nombre.split(' ')[0]}` : ''}, hemos recibido una solicitud para restablecer su contraseña.
              </p>
              
              <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                Haga clic en el siguiente botón para establecer una nueva contraseña:
              </p>
              
              <!-- Botón -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${linkCambio}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      Cambiar mi Contraseña
                    </a>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; margin: 25px 0;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="color: #dc2626; font-size: 13px; font-weight: 600; margin: 0 0 5px 0;">
                      ⚠️ Vencimiento
                    </p>
                    <p style="color: #991b1b; font-size: 12px; margin: 0;">
                      Este enlace expirará en <strong>${expiraEn}</strong>. Si no solicitó este cambio, puede ignorar este correo.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 25px 30px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Este es un correo automático del Sistema de Gestión de Aulas - UIDE
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ==========================================
// SERVICIO PRINCIPAL
// ==========================================

const emailService = {
  /**
   * Envía credenciales de acceso a un nuevo usuario
   * @param {Object} params - Parámetros del email
   * @param {string} params.email - Email del destinatario
   * @param {string} params.nombre - Nombre completo del usuario
   * @param {string} params.passwordTemporal - Contraseña temporal
   * @param {string} params.rol - Rol del usuario (director, docente, estudiante)
   * @param {string} params.linkAcceso - Enlace al sistema
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async enviarCredenciales({ email, nombre, passwordTemporal, rol, linkAcceso }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://www.miespacioideal.es/login';
    const link = linkAcceso || frontendUrl;
    const expiraEn = '24 horas';

    try {
      // Validar email institucional
      if (!email.endsWith('@uide.edu.ec') && !email.endsWith('@docente.uide.edu.ec')) {
        console.warn(`⚠️ Email no institucional: ${email}`);
        // Permitir en desarrollo, marcar en producción
        if (process.env.NODE_ENV === 'production') {
          return { success: false, error: 'El email debe ser institucional (@uide.edu.ec)' };
        }
      }

      const html = getPlantillaCredenciales({
        nombre,
        email,
        passwordTemporal,
        rol,
        linkAcceso: link,
        expiraEn
      });

      const t = getTransporter(email);
      const fromAddress = esCorreoUide(email)
        ? (process.env.SMTP_UIDE_FROM || process.env.SMTP_FROM || '"Sistema de Gestion Aulas UIDE" <no-reply@uide.edu.ec>')
        : (process.env.SMTP_FROM || '"Sistema de Gestion Aulas UIDE" <no-reply@uide.edu.ec>');

      console.log(`📤 Enviando a ${email} usando SMTP: ${esCorreoUide(email) && process.env.SMTP_UIDE_HOST ? process.env.SMTP_UIDE_HOST : process.env.SMTP_HOST || 'smtp.gmail.com'}`);

      const info = await t.sendMail({
        from: fromAddress,
        to: email,
        replyTo: esCorreoUide(email) ? (process.env.SMTP_UIDE_USER || process.env.SMTP_USER) : process.env.SMTP_USER,
        subject: 'Credenciales de Acceso - Sistema de Gestion de Aulas UIDE',
        html,
        text: `
Bienvenido${nombre ? `, ${nombre}` : ''}

Se ha creado una cuenta de acceso para usted en el Sistema de Gestion de Aulas de la UIDE.

CORREO: ${email}
CONTRASENA TEMPORAL: ${passwordTemporal}
ROL: ${rol}

Esta contrasena temporal expirara en 24 horas. Por seguridad, le recomendamos cambiar su contrasena al primer ingreso.

Acceda al sistema: ${link}

---
Universidad Internacional del Ecuador
Sistema de Gestion de Aulas
        `.trim(),
        headers: {
          'X-Priority': '1',
          'X-Mailer': 'Sistema-Gestion-Aulas-UIDE'
        }
      });

      console.log(`✅ Email de credenciales enviado a ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      // Capturar detalles completos del error SMTP para diagnóstico
      const detalleError = {
        message: error.message,
        code: error.code,
        responseCode: error.responseCode,
        response: error.response,
        command: error.command
      };
      console.error(`❌ Error enviando email a ${email}:`, detalleError);
      return {
        success: false,
        error: error.message,
        detalles: detalleError
      };
    }
  },

  /**
   * Envía email de recuperación de contraseña
   * @param {Object} params - Parámetros del email
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async enviarRecuperacionPassword({ email, nombre, tokenRecuperacion }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const linkCambio = `${frontendUrl}/recuperar-password?token=${tokenRecuperacion}`;

    try {
      const html = getPlantillaCambioPassword({
        nombre,
        linkCambio,
        expiraEn: '1 hora'
      });

      const t = getTransporter(email);
      const fromAddress = esCorreoUide(email)
        ? (process.env.SMTP_UIDE_FROM || process.env.SMTP_FROM || '"Sistema de Gestion Aulas UIDE" <no-reply@uide.edu.ec>')
        : (process.env.SMTP_FROM || '"Sistema de Gestion Aulas UIDE" <no-reply@uide.edu.ec>');

      const info = await t.sendMail({
        from: fromAddress,
        to: email,
        replyTo: esCorreoUide(email) ? (process.env.SMTP_UIDE_USER || process.env.SMTP_USER) : process.env.SMTP_USER,
        subject: 'Recuperacion de Contrasena - Sistema de Gestion de Aulas UIDE',
        html,
        text: `
Solicitud de Cambio de Contrasena

Hola${nombre ? `, ${nombre}` : ''},

Hemos recibido una solicitud para restablecer su contrasena.

Haga clic en el siguiente enlace para establecer una nueva contrasena:
${linkCambio}

Este enlace expirara en 1 hora.

Si no solicito este cambio, puede ignorar este correo.

---
Universidad Internacional del Ecuador
Sistema de Gestion de Aulas
        `.trim(),
        headers: {
          'X-Mailer': 'Sistema-Gestion-Aulas-UIDE'
        }
      });

      console.log(`✅ Email de recuperación enviado a ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      const detalleError = {
        message: error.message,
        code: error.code,
        responseCode: error.responseCode,
        response: error.response,
        command: error.command
      };
      console.error(`❌ Error enviando email de recuperación a ${email}:`, detalleError);
      return { success: false, error: error.message, detalles: detalleError };
    }
  },

  /**
   * Verifica la conexión con ambos servidores SMTP configurados.
   * @returns {Promise<{general: boolean, uide: boolean|null}>}
   */
  async verificarConexion() {
    const resultado = { general: false, uide: null };

    // Verificar SMTP general
    try {
      if (!transporterGeneral) transporterGeneral = crearTransporterGeneral();
      await transporterGeneral.verify();
      console.log(`✅ SMTP general (${process.env.SMTP_HOST || 'smtp.gmail.com'}) conectado correctamente`);
      resultado.general = true;
    } catch (err) {
      console.error(`❌ SMTP general: ${err.message}`);
    }

    // Verificar SMTP UIDE (solo si está configurado)
    if (process.env.SMTP_UIDE_HOST) {
      try {
        if (!transporterUide) transporterUide = crearTransporterUide();
        await transporterUide.verify();
        console.log(`✅ SMTP UIDE (${process.env.SMTP_UIDE_HOST}) conectado correctamente`);
        resultado.uide = true;
      } catch (err) {
        console.error(`❌ SMTP UIDE (${process.env.SMTP_UIDE_HOST}): ${err.message}`);
        resultado.uide = false;
      }
    } else {
      console.warn('⚠️  SMTP_UIDE_HOST no configurado — correos a @uide.edu.ec usarán el SMTP general');
    }

    return resultado;
  },

  /**
   * Envía un correo de prueba para diagnosticar la entrega.
   * @param {string} emailDestino - Dirección a probar (ej: sajaponpa@uide.edu.ec)
   */
  async enviarCorreoPrueba(emailDestino) {
    try {
      const t = getTransporter(emailDestino);
      const fromAddress = esCorreoUide(emailDestino)
        ? (process.env.SMTP_UIDE_FROM || process.env.SMTP_FROM || '"SIGEA Test" <no-reply@uide.edu.ec>')
        : (process.env.SMTP_FROM || '"SIGEA Test" <no-reply@uide.edu.ec>');

      const info = await t.sendMail({
        from: fromAddress,
        to: emailDestino,
        subject: '[PRUEBA] Verificación SMTP - SIGEA-UIDE',
        text: `Este es un correo de prueba del Sistema de Gestión de Aulas UIDE.\n\nSMTP usado: ${esCorreoUide(emailDestino) && process.env.SMTP_UIDE_HOST ? process.env.SMTP_UIDE_HOST : process.env.SMTP_HOST}\nDestinatario: ${emailDestino}\nFecha: ${new Date().toISOString()}`,
        html: `<p>Este es un correo de prueba del Sistema de Gestión de Aulas UIDE.</p><p><b>SMTP usado:</b> ${esCorreoUide(emailDestino) && process.env.SMTP_UIDE_HOST ? process.env.SMTP_UIDE_HOST : process.env.SMTP_HOST}<br><b>Destinatario:</b> ${emailDestino}<br><b>Fecha:</b> ${new Date().toISOString()}</p>`,
      });

      console.log(`✅ Correo de prueba enviado a ${emailDestino}: ${info.messageId}`);
      return { success: true, messageId: info.messageId, smtp: esCorreoUide(emailDestino) && process.env.SMTP_UIDE_HOST ? process.env.SMTP_UIDE_HOST : process.env.SMTP_HOST };
    } catch (error) {
      console.error(`❌ Prueba fallida para ${emailDestino}:`, error.message);
      return { success: false, error: error.message, code: error.code, response: error.response };
    }
  },

  /**
   * Genera una contraseña temporal segura
   * @param {number} length - Longitud de la contraseña
   * @returns {string}
   */
  generarPasswordTemporal,

  /**
   * Genera fecha de expiración para contraseña temporal
   * @param {number} horas - Horas hasta la expiración
   * @returns {Date}
   */
  generarTokenExpiracion
};

module.exports = emailService;
