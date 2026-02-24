require('dotenv').config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL?.replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;
const BOT_PORT = Number(process.env.BOT_PORT || 3020);
const BACKEND_URL = process.env.BACKEND_URL || 'http://gestion_aulas_backend:3000';

const MENU_OPTIONS = [
    { id: 'menu_aulas', label: 'Buscar Aulas Libres', emoji: '1' },
    { id: 'menu_reservas', label: 'Mis Reservas', emoji: '2' },
    { id: 'menu_profe', label: 'Buscar Profesor', emoji: '3' },
    { id: 'menu_materia', label: 'Horario Materia', emoji: '4' },
    { id: 'menu_estado', label: 'Estado General', emoji: '5', roles: ['director', 'admin'] },
    { id: 'menu_perfil', label: 'Mi Perfil', emoji: '6' },
];

const DAYS = [
    { raw: 'lunes', formatted: 'Lunes' },
    { raw: 'martes', formatted: 'Martes' },
    { raw: 'miercoles', formatted: 'Miercoles' },
    { raw: 'jueves', formatted: 'Jueves' },
    { raw: 'viernes', formatted: 'Viernes' },
    { raw: 'sabado', formatted: 'Sabado' },
    { raw: 'domingo', formatted: 'Domingo' }
];

const TIME_SLOTS = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
];

module.exports = {
    EVOLUTION_API_URL,
    EVOLUTION_API_KEY,
    EVOLUTION_INSTANCE,
    BOT_PORT,
    BACKEND_URL,
    MENU_OPTIONS,
    DAYS,
    TIME_SLOTS
};
