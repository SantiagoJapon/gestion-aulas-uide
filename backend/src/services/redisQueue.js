const { createClient } = require('redis');

const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const REDIS_URL = process.env.REDIS_URL || `redis://:${REDIS_PASSWORD}@redis:6379`;

let client = null;

async function getClient() {
  if (!client) {
    client = createClient({ url: REDIS_URL });
    client.on('error', (err) => {
      console.error('❌ Redis client error:', err.message);
    });
    try {
      await client.connect();
      console.log('✅ Redis queue connected');
    } catch (err) {
      console.warn('⚠️ Redis no disponible, mensajes no serán encolados:', err.message);
      return null;
    }
  }
  return client;
}

const redisQueue = {
  async push(queue, payload) {
    try {
      const c = await getClient();
      if (!c) return false;
      await c.lPush(queue, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error(`❌ Error encolando en ${queue}:`, err.message);
      return false;
    }
  },

  async pop(queue, timeout = 5) {
    try {
      const c = await getClient();
      if (!c) return null;
      const result = await c.brPop(queue, timeout);
      if (!result) return null;
      return JSON.parse(result.element);
    } catch (err) {
      console.error(`❌ Error desencolando de ${queue}:`, err.message);
      return null;
    }
  },

  async length(queue) {
    try {
      const c = await getClient();
      if (!c) return 0;
      return await c.lLen(queue);
    } catch (err) {
      return 0;
    }
  },

  async disconnect() {
    if (client) {
      try { await client.disconnect(); } catch (e) { }
      client = null;
    }
  }
};

module.exports = redisQueue;
