const axios = require('axios');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

/**
 * Servicio para emitir alertas en tiempo real vía Telegram
 */
const telegramService = {

    /**
     * Enviar mensaje simple a un chat_id específico
     */
    async sendMessage(chatId, text, parseMode = 'Markdown') {
        if (!TELEGRAM_TOKEN) return false;
        try {
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: text,
                parse_mode: parseMode
            });
            return true;
        } catch (error) {
            console.error(`Error enviando Telegram a ${chatId}:`, error.response?.data || error.message);
            return false;
        }
    },

    /**
     * Busca los Chat IDs vinculados a un Usuario de la plataforma
     */
    async getChatIdsByUserId(userId) {
        try {
            const results = await sequelize.query(
                'SELECT telegram_id FROM bot_sessions WHERE user_id = :userId',
                {
                    replacements: { userId },
                    type: QueryTypes.SELECT
                }
            );
            return results.map(r => r.telegram_id);
        } catch (error) {
            console.error("Error consultando chat_ids:", error);
            return [];
        }
    },

    /**
     * Alerta a un usuario específico
     */
    async notifyUser(userId, message) {
        const chatIds = await this.getChatIdsByUserId(userId);
        for (const chatId of chatIds) {
            await this.sendMessage(chatId, message);
        }
    },

    /**
     * Alerta a todos los estudiantes de una carrera
     */
    async notifyCareer(careerId, message) {
        try {
            // Unimos bot_sessions con usuarios filtrando por carrera
            const users = await sequelize.query(`
                SELECT bs.telegram_id 
                FROM bot_sessions bs
                JOIN usuarios u ON bs.user_id = u.id
                WHERE u.carrera_id = :careerId AND u.rol = 'estudiante'
            `, {
                replacements: { careerId },
                type: QueryTypes.SELECT
            });

            for (const user of users) {
                await this.sendMessage(user.telegram_id, message);
            }
        } catch (error) {
            console.error("Error notifyCareer:", error);
        }
    },

    /**
     * Alerta a todos los estudiantes de una clase específica
     */
    async notifyClass(claseId, message) {
        try {
            // Buscamos info de la clase
            const [clase] = await sequelize.query('SELECT carrera, ciclo FROM clases WHERE id = :claseId', {
                replacements: { claseId },
                type: QueryTypes.SELECT
            });

            if (!clase) return;

            // Buscamos estudiantes que coincidan con la carrera y nivel (ciclo)
            const users = await sequelize.query(`
                SELECT bs.telegram_id 
                FROM bot_sessions bs
                JOIN usuarios u ON bs.user_id = u.id
                JOIN estudiantes e ON u.cedula = e.cedula
                WHERE (e.escuela ILIKE :carrera OR e.escuela ILIKE :carrera_alt)
                AND e.nivel ILIKE :ciclo
            `, {
                replacements: {
                    carrera: clase.carrera,
                    carrera_alt: `%${clase.carrera}%`,
                    ciclo: `%${clase.ciclo}%`
                },
                type: QueryTypes.SELECT
            });

            for (const user of users) {
                await this.sendMessage(user.telegram_id, message);
            }
        } catch (error) {
            console.error("Error notifyClass:", error.message);
        }
    }
};

module.exports = telegramService;
