const axios = require('axios');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const redisQueue = require('./redisQueue');

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;

function normalizarTelefono(phone) {
    if (!phone) return null;
    let digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '593' + digits.slice(1);
    if (!digits.startsWith('593') && digits.length === 9) digits = '593' + digits;
    return digits;
}

async function sendWithRetry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            if (i === maxRetries - 1) throw err;
            const delay = Math.pow(2, i) * 1000;
            console.warn(`   Reintento ${i + 1}/${maxRetries} en ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

const whatsappService = {

    async sendMessage(phone, text) {
        if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) return false;
        if (!phone) return false;
        const number = normalizarTelefono(phone);
        if (!number) return false;

        try {
            await sendWithRetry(() =>
                axios.post(
                    `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
                    { number, text },
                    {
                        headers: {
                            apikey: EVOLUTION_API_KEY,
                            'Content-Type': 'application/json'
                        },
                        timeout: 15000
                    }
                )
            );
            return true;
        } catch (error) {
            console.error(`Error enviando WhatsApp a ${number}:`, error.response?.data || error.message);

            await redisQueue.push('whatsapp:pending', {
                phone: number,
                text,
                timestamp: Date.now(),
                retries: 0
            });
            console.log(`📥 Mensaje encolado en Redis para reintento posterior: ${number}`);

            return false;
        }
    },

    async getPhonesByUserId(userId) {
        try {
            const sessions = await sequelize.query(
                `SELECT telefono FROM bot_sessions WHERE user_id = :userId AND telefono IS NOT NULL`,
                { replacements: { userId }, type: QueryTypes.SELECT }
            );
            if (sessions.length > 0) {
                return sessions.map(r => r.telefono).filter(Boolean);
            }

            const users = await sequelize.query(
                `SELECT telefono FROM usuarios WHERE id = :userId AND telefono IS NOT NULL`,
                { replacements: { userId }, type: QueryTypes.SELECT }
            );
            return users.map(r => r.telefono).filter(Boolean);
        } catch (error) {
            console.error("Error consultando telefonos:", error);
            return [];
        }
    },

    async getChatIdsByUserId(userId) {
        return this.getPhonesByUserId(userId);
    },

    async notifyUser(userId, message) {
        const phones = await this.getPhonesByUserId(userId);
        for (const phone of phones) {
            await this.sendMessage(phone, message);
        }
    },

    async notifyCareer(careerId, message) {
        try {
            const users = await sequelize.query(`
                SELECT bs.telefono
                FROM bot_sessions bs
                JOIN usuarios u ON bs.user_id = u.id
                WHERE u.carrera_id = :careerId AND u.rol = 'estudiante'
                AND bs.telefono IS NOT NULL
            `, {
                replacements: { careerId },
                type: QueryTypes.SELECT
            });

            for (const user of users) {
                await this.sendMessage(user.telefono, message);
            }
        } catch (error) {
            console.error("Error notifyCareer:", error);
        }
    },

    async notifyClass(claseId, message) {
        try {
            const [clase] = await sequelize.query('SELECT carrera, ciclo FROM clases WHERE id = :claseId', {
                replacements: { claseId },
                type: QueryTypes.SELECT
            });

            if (!clase) return;

            const users = await sequelize.query(`
                SELECT DISTINCT e.telefono
                FROM estudiantes e
                WHERE (e.escuela ILIKE :carrera OR e.escuela ILIKE :carrera_alt)
                AND e.nivel ILIKE :ciclo
                AND e.telefono IS NOT NULL
            `, {
                replacements: {
                    carrera: clase.carrera,
                    carrera_alt: `%${clase.carrera}%`,
                    ciclo: `%${clase.ciclo}%`
                },
                type: QueryTypes.SELECT
            });

            for (const user of users) {
                await this.sendMessage(user.telefono, message);
            }
        } catch (error) {
            console.error("Error notifyClass:", error.message);
        }
    },

    async processPendingQueue() {
        try {
            const pending = await redisQueue.pop('whatsapp:pending', 1);
            if (!pending) return;

            if (Date.now() - pending.timestamp > 86400000) {
                console.warn(`🧹 Mensaje expirado (24h): ${pending.phone}`);
                return;
            }

            await this.sendMessage(pending.phone, pending.text);
        } catch (err) {
            console.error('Error processing pending queue:', err.message);
        }
    }
};

module.exports = whatsappService;
