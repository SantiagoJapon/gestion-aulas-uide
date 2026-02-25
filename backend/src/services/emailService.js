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

/**
 * Crea el transporter de nodemailer basado en la configuración
 */
function createTransporter() {
    // Si no hay configuración SMTP, usar ethereal para desarrollo
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP no configurado. Usando modo mock para desarrollo.');
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: 'mock@ethereal.email',
                pass: 'mock'
            }
        });
    }

    const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false, // Permite TLS con certificados corporativos
            ciphers: 'SSLv3'
        },
        connectionTimeout: 10000, // 10 segundos
        greetingTimeout: 10000,
        socketTimeout: 15000,
        maxConnections: 5,
        maxMessages: 100
    };

    return nodemailer.createTransport(config);
}

// Transporter singleton
let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = createTransporter();
    }
    return transporter;
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

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Credenciales de Acceso - UIDE</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
          <!-- Header con logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Universidad Internacional de España</h1>
              <p style="color: #a8c5e2; margin: 8px 0 0 0; font-size: 14px;">Sistema de Gestión de Aulas</p>
            </td>
          </tr>
          
          <!-- Contenido principal -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                Bienvenido${nombre ? `, ${nombre.split(' ')[0]}` : ''}
              </h2>
              
              <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                Se ha creado una cuenta de acceso para usted en el <strong>Sistema de Gestión de Aulas</strong> de la UIDE. 
                A continuación encontrará sus credenciales de acceso:
              </p>
              
              <!-- Box de credenciales -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">
                      Correo Electrónico
                    </p>
                    <p style="color: #1e3a5f; font-size: 16px; font-weight: 600; margin: 0 0 20px 0;">
                      ${email}
                    </p>
                    
                    <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">
                      Contraseña Temporal
                    </p>
                    <p style="color: #dc2626; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; margin: 0 0 20px 0; letter-spacing: 2px;">
                      ${passwordTemporal}
                    </p>
                    
                    <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">
                      Rol Asignado
                    </p>
                    <p style="color: #059669; font-size: 14px; font-weight: 600; margin: 0;">
                      ${rolMostrar}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Alerta de seguridad -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 25px 0;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="color: #92400e; font-size: 13px; font-weight: 600; margin: 0 0 5px 0;">
                      ⚠️ Importante: Debe cambiar su contraseña
                    </p>
                    <p style="color: #92400e; font-size: 12px; margin: 0;">
                      Esta contraseña temporal expirará en <strong>${expiraEn}</strong>. 
                      Por seguridad, le recomendamos cambiar su contraseña al primer ingreso.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Botón de acción -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${linkAcceso}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      Acceder al Sistema
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #94a3b8; font-size: 12px; margin: 30px 0 0 0; text-align: center;">
                Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:<br>
                <span style="color: #2d5a87;">${linkAcceso}</span>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 25px 30px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Este es un correo automático generado por el Sistema de Gestión de Aulas - UIDE<br>
                Por favor no responda a este mensaje
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 10px 0 0 0;">
                © ${new Date().getFullYear()} Universidad Internacional de España. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
        
        <p style="color: #94a3b8; font-size: 11px; margin: 20px 0 0 0;">
          Este mensaje fue enviado a: ${email}
        </p>
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
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Universidad Internacional de España</h1>
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
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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

            const info = await getTransporter().sendMail({
                from: process.env.SMTP_FROM || '"Sistema de Gestion Aulas UIDE" <no-reply@uide.edu.ec>',
                to: email,
                replyTo: process.env.SMTP_USER,
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

            const info = await getTransporter().sendMail({
                from: process.env.SMTP_FROM || '"Sistema de Gestion Aulas UIDE" <no-reply@uide.edu.ec>',
                to: email,
                replyTo: process.env.SMTP_USER,
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
     * Verifica la conexión con el servidor SMTP
     * @returns {Promise<boolean>}
     */
    async verificarConexion() {
        try {
            const transporter = getTransporter();
            await transporter.verify();
            console.log('✅ Conexión SMTP verificada correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error verificando conexión SMTP:', error.message);
            return false;
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
