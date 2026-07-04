/**
 * Cron job para expirar reservas pendientes de aprobación > 24h.
 *
 * Ejecutar directamente:  node src/cron/expirePendientes.js
 * O integrado en el servidor (ver index.js — se ejecuta cada hora).
 *
 * Comportamiento:
 *  - Busca todas las reservas con estado = 'pendiente_aprobacion'
 *    cuya createdAt sea anterior a 24 horas.
 *  - Las cambia a estado = 'rechazada' con motivo automático.
 *  - Envía notificación in-app al usuario afectado.
 */

const { Reserva, User, Notificacion } = require('../models');
const { Op } = require('sequelize');
const N8nService = require('../services/n8n.service');

const HORAS_LIMITE = 24;

const expirarPendientes = async () => {
    try {
        const fechaLimite = new Date(Date.now() - HORAS_LIMITE * 60 * 60 * 1000);

        const pendientes = await Reserva.findAll({
            where: {
                estado: 'pendiente_aprobacion',
                createdAt: { [Op.lt]: fechaLimite },
            },
            include: [{ model: User, as: 'usuario', attributes: ['id', 'nombre', 'apellido'] }],
        });

        if (pendientes.length === 0) return;

        console.log(`[CRON] Expirando ${pendientes.length} reserva(s) pendiente(s) de aprobación (> ${HORAS_LIMITE}h)`);

        let rechazadas = 0;
        for (const reserva of pendientes) {
            const espacioLabel = reserva.aula_codigo || reserva.espacio_codigo;
            const horarioLabel = `${reserva.fecha} ${reserva.hora_inicio}–${reserva.hora_fin}`;

            // Actualizar estado
            reserva.estado = 'rechazada';
            reserva.motivo = `${reserva.motivo || ''} | Expirada automáticamente tras ${HORAS_LIMITE}h sin aprobación`.trim();
            await reserva.save();

            // Notificar al usuario
            try {
                await Notificacion.create({
                    titulo: '⏰ Reserva expirada (sin respuesta)',
                    mensaje: `Tu solicitud para "${espacioLabel}" el ${horarioLabel} fue rechazada automáticamente porque no fue aprobada en ${HORAS_LIMITE} horas.`,
                    tipo: 'SISTEMA',
                    prioridad: 'MEDIA',
                    destinatario_id: reserva.usuario_id || null,
                    estudiante_id: reserva.estudiante_id || null,
                    leida: false,
                });
            } catch (notifErr) {
                console.error('[CRON] Error al notificar expiración:', notifErr.message);
            }

            // Evento n8n (fire-and-forget)
            N8nService.emit('notificacion', {
                tipo: 'reserva_rechazada',
                reserva: {
                    id: reserva.id,
                    espacio: espacioLabel,
                    fecha: reserva.fecha,
                    hora_inicio: reserva.hora_inicio,
                    hora_fin: reserva.hora_fin,
                    motivo_rechazo: 'Expirada automáticamente (sin aprobación)',
                },
            });

            rechazadas++;
        }

        console.log(`[CRON] ${rechazadas} reserva(s) expirada(s) correctamente`);
    } catch (error) {
        console.error('[CRON] Error al expirar pendientes:', error.message);
    }
};

// Ejecutar si se invoca directamente
if (require.main === module) {
    const { testConnection } = require('../config/database');
    testConnection()
        .then(() => expirarPendientes())
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = expirarPendientes;
