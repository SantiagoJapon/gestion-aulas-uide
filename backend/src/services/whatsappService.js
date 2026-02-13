const axios = require('axios');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;

/**
 * Servicio para emitir alertas en tiempo real via WhatsApp (Evolution API)
 * Mantiene la misma interfaz publica para no romper controllers existentes.
 */
const whatsappService = {

    /**
     * Enviar mensaje a un numero de telefono via WhatsApp
     * @param {string} phone - Numero de telefono (o telefono del usuario)
     * @param {string} text - Texto del mensaje (soporta *bold* de WhatsApp)
     */
    async sendMessage(phone, text) {
        if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) return false;
        if (!phone) return false;
        try {
            await axios.post(
                `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
                { number: String(phone), text },
                {
                    headers: {
                        apikey: EVOLUTION_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );
            return true;
        } catch (error) {
            console.error(`Error enviando WhatsApp a ${phone}:`, error.response?.data || error.message);
            return false;
        }
    },

    /**
     * Busca los telefonos vinculados a un Usuario de la plataforma
     * Busca primero en bot_sessions (campo telefono), luego en usuarios (campo telefono)
     */
    async getPhonesByUserId(userId) {
        try {
            // Buscar en bot_sessions por telefono
            const sessions = await sequelize.query(
                `SELECT telefono FROM bot_sessions WHERE user_id = :userId AND telefono IS NOT NULL`,
                { replacements: { userId }, type: QueryTypes.SELECT }
            );
            if (sessions.length > 0) {
                return sessions.map(r => r.telefono).filter(Boolean);
            }

            // Fallback: buscar en tabla usuarios directamente
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

    // Backward compat alias
    async getChatIdsByUserId(userId) {
        return this.getPhonesByUserId(userId);
    },

    /**
     * Alerta a un usuario especifico via WhatsApp
     */
    async notifyUser(userId, message) {
        const phones = await this.getPhonesByUserId(userId);
        for (const phone of phones) {
            await this.sendMessage(phone, message);
        }
    },

    /**
     * Alerta a todos los estudiantes de una carrera via WhatsApp
     */
    async notifyCareer(careerId, message) {
        try {
            // Buscar telefonos de estudiantes vinculados a la carrera
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

    /**
     * Alerta a todos los estudiantes de una clase especifica via WhatsApp
     */
    async notifyClass(claseId, message) {
        try {
            const [clase] = await sequelize.query('SELECT carrera, ciclo FROM clases WHERE id = :claseId', {
                replacements: { claseId },
                type: QueryTypes.SELECT
            });

            if (!clase) return;

            // Buscar estudiantes con telefono que coincidan con la carrera y nivel
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
    }
};

module.exports = whatsappService;
