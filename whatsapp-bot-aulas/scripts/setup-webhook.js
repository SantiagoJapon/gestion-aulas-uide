const axios = require('axios');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL?.replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;
const BOT_PORT = Number(process.env.BOT_PORT || 3020);

const webhookUrl = process.env.WEBHOOK_URL || `http://whatsapp-bot:${BOT_PORT}/webhook`;

async function registerWebhook() {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.error('[WEBHOOK] Faltan variables: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE');
    return false;
  }

  console.log(`[WEBHOOK] Registrando webhook en ${EVOLUTION_API_URL}...`);
  console.log(`[WEBHOOK] Instancia: ${EVOLUTION_INSTANCE}`);
  console.log(`[WEBHOOK] URL webhook: ${webhookUrl}`);

  try {
    const webhookRes = await axios.post(
      `${EVOLUTION_API_URL}/webhook/set/${EVOLUTION_INSTANCE}`,
      {
        webhook: {
          enabled: true,
          url: webhookUrl,
          by_events: false,
          base64: false,
          events: [
            'MESSAGES_UPSERT',
            'CONNECTION_UPDATE'
          ]
        }
      },
      { headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' }, timeout: 10000 }
    );

    console.log('[WEBHOOK] Webhook registrado exitosamente:', webhookRes.data?.id || webhookRes.data);
    return true;
  } catch (error) {
    const errMsg = error.response?.data?.response?.message?.[0] || error.response?.data?.error || error.message;
    console.error('[WEBHOOK] Error registrando webhook:', errMsg);
    return false;
  }
}

module.exports = { registerWebhook };

if (require.main === module) {
  registerWebhook().then(ok => process.exit(ok ? 0 : 1));
}
