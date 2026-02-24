const { DAYS, normalizeText } = require('../config/constants');

function normalizeTextHelper(value) {
    return value?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() || '';
}

function formatPhone(jid) {
    if (!jid) return null;
    if (jid.includes('@lid')) return jid;
    return jid.split(':')[0].split('.')[0].replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '');
}

function extractDay(text) {
    const normalized = normalizeTextHelper(text);

    if (normalized.includes('hoy')) {
        const today = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil', weekday: 'long' });
        return extractDay(normalizeTextHelper(today));
    }
    if (normalized.includes('manana')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil', weekday: 'long' });
        return extractDay(normalizeTextHelper(tomorrowStr));
    }

    // Importar DAYS aquí o pasarlo como argumento para evitar circularidad
    const days = [
        { raw: 'lunes', formatted: 'Lunes' },
        { raw: 'martes', formatted: 'Martes' },
        { raw: 'miercoles', formatted: 'Miercoles' },
        { raw: 'jueves', formatted: 'Jueves' },
        { raw: 'viernes', formatted: 'Viernes' },
        { raw: 'sabado', formatted: 'Sabado' },
        { raw: 'domingo', formatted: 'Domingo' }
    ];

    return days.find(d => normalized.includes(d.raw)) || null;
}

function extractTime(text) {
    const match = text.match(/(\d{1,2})[:\-hH](\d{2})/);
    if (match) {
        const h = parseInt(match[1]);
        if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:${match[2]}`;
    }
    const matchSimple = text.match(/\b(\d{1,2})\s*(am|pm|de la|horas?)?\b/i);
    if (matchSimple) {
        let h = parseInt(matchSimple[1]);
        if (h >= 1 && h <= 23) {
            if (matchSimple[2] && matchSimple[2].toLowerCase() === 'pm' && h < 12) h += 12;
            return `${String(h).padStart(2, '0')}:00`;
        }
    }
    return null;
}

function getTodayName() {
    const today = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil', weekday: 'long' });
    const d = extractDay(normalizeTextHelper(today));
    return d ? d.formatted : 'Lunes';
}

module.exports = {
    normalizeText: normalizeTextHelper,
    formatPhone,
    extractDay,
    extractTime,
    getTodayName
};
