const { Clase, Docente, Aula, User, Carrera, Distribucion, Reserva, Espacio } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Búsqueda Global (Spotlight Style)
 * Busca simultáneamente en clases, docentes, aulas y directores
 */
exports.globalSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json({ success: true, results: [] });
        }

        const query = q.toLowerCase();
        const results = [];

        // 1. Buscar en Clases (Materias)
        const clases = await Clase.findAll({
            where: {
                [Op.or]: [
                    { materia: { [Op.iLike]: `%${query}%` } },
                    { codigo: { [Op.iLike]: `%${query}%` } }
                ]
            },
            limit: 5,
            include: [{ model: Carrera, as: 'carrera_obj', attributes: ['carrera'] }]
        });

        clases.forEach(c => {
            results.push({
                id: `clase-${c.id}`,
                type: 'materia',
                title: c.materia,
                subtitle: `${c.carrera || (c.carrera_obj ? c.carrera_obj.carrera : '')} • Ciclo ${c.ciclo}`,
                icon: 'menu_book',
                link: `/distribucion?q=${encodeURIComponent(c.materia)}`
            });
        });

        // 2. Buscar en Docentes
        const docentes = await Docente.findAll({
            where: {
                nombre: { [Op.iLike]: `%${query}%` }
            },
            limit: 5
        });

        docentes.forEach(d => {
            results.push({
                id: `docente-${d.id}`,
                type: 'docente',
                title: d.nombre,
                subtitle: d.tipo || 'Docente',
                icon: 'person',
                link: `/docentes?search=${encodeURIComponent(d.nombre)}`
            });
        });

        // 3. Buscar en Aulas
        const aulas = await Aula.findAll({
            where: {
                [Op.or]: [
                    { nombre: { [Op.iLike]: `%${query}%` } },
                    { codigo: { [Op.iLike]: `%${query}%` } },
                    { edificio: { [Op.iLike]: `%${query}%` } }
                ]
            },
            limit: 5
        });

        aulas.forEach(a => {
            results.push({
                id: `aula-${a.id}`,
                type: 'aula',
                title: `Aula ${a.nombre}`,
                subtitle: `${a.edificio || 'Edificio'} • Capacidad: ${a.capacidad}`,
                icon: 'meeting_room',
                link: `/aulas?search=${encodeURIComponent(a.nombre)}`
            });
        });

        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Error in globalSearch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Búsqueda de disponibilidad (Aulas y Espacios Vacíos)
 * GET /api/search/disponibilidad?dia=Lunes&hora_inicio=07:00&hora_fin=09:00
 * También soporta: fecha=2024-01-15 (para verificar reservas específicas en fecha)
 * tipo_espacio: 'aula' | 'espacio' | undefined (ambos)
 */
exports.searchAvailability = async (req, res) => {
    try {
        const { dia, hora_inicio, hora_fin, capacidad_minima, fecha, tipo_espacio } = req.query;

        if ((!dia && !fecha) || !hora_inicio || !hora_fin) {
            return res.status(400).json({ success: false, message: 'Faltan parámetros de tiempo' });
        }

        // Normalizar el día de la semana
        let diaSemana = dia;
        if (fecha) {
            const diasLookup = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
            const [year, month, day] = fecha.split('-').map(Number);
            const d = new Date(year, month - 1, day);
            diaSemana = diasLookup[d.getDay()];
        }

        // Determinar qué tipo de espacio buscar
        const buscarAulas = !tipo_espacio || tipo_espacio === 'aula';
        const buscarEspacios = !tipo_espacio || tipo_espacio === 'espacio';

        let aulasLibres = [];
        let espaciosLibres = [];

        // 1. Aulas ocupadas en Distribución (Clases distribuidas)
        let idsOcupadasDist = [];
        if (buscarAulas) {
            const ocupadasPorDistribucion = await Distribucion.findAll({
                attributes: ['aula_id'],
                where: {
                    dia: diaSemana.toUpperCase(),
                    [Op.or]: [
                        {
                            hora_inicio: { [Op.lt]: hora_fin },
                            hora_fin: { [Op.gt]: hora_inicio }
                        }
                    ]
                },
                raw: true
            });
            idsOcupadasDist = ocupadasPorDistribucion.map(d => d.aula_id);
        }

        // 2. Aulas ocupadas vía Clase (asignación directa)
        let codigosOcupadosClase = [];
        if (buscarAulas) {
            const ocupadasPorClase = await Clase.findAll({
                attributes: ['aula_asignada'],
                where: {
                    dia: diaSemana.toUpperCase(),
                    aula_asignada: { [Op.ne]: null },
                    [Op.or]: [
                        {
                            hora_inicio: { [Op.lt]: hora_fin },
                            hora_fin: { [Op.gt]: hora_inicio }
                        }
                    ]
                },
                raw: true
            });
            codigosOcupadosClase = ocupadasPorClase.map(c => c.aula_asignada);
        }

        // 3. Reservas existentes (solo si se proporciona fecha)
        let codigosOcupadosResAula = [];
        let codigosOcupadosResEspacio = [];
        if (fecha) {
            const reservasExistentes = await Reserva.findAll({
                where: {
                    fecha,
                    estado: { [Op.in]: ['activa', 'pendiente_aprobacion'] },
                    [Op.or]: [
                        {
                            hora_inicio: { [Op.lt]: hora_fin },
                            hora_fin: { [Op.gt]: hora_inicio }
                        }
                    ]
                },
                raw: true
            });
            codigosOcupadosResAula = reservasExistentes
                .filter(r => r.aula_codigo)
                .map(r => r.aula_codigo);
            codigosOcupadosResEspacio = reservasExistentes
                .filter(r => r.espacio_codigo)
                .map(r => r.espacio_codigo);
        }

        // Buscar aulas disponibles
        if (buscarAulas) {
            const whereAula = {
                estado: 'disponible',
                codigo: {
                    [Op.notIn]: codigosOcupadosResAula.concat(codigosOcupadosClase)
                },
                id: {
                    [Op.notIn]: idsOcupadasDist
                }
            };

            if (capacidad_minima) {
                whereAula.capacidad = { [Op.gte]: parseInt(capacidad_minima) };
            }

            aulasLibres = await Aula.findAll({
                where: whereAula,
                order: [['capacidad', 'ASC']]
            });
        }

        // Buscar espacios disponibles (biblioteca, salas, etc.)
        if (buscarEspacios) {
            const whereEspacio = {
                estado: 'DISPONIBLE',
                codigo: {
                    [Op.notIn]: codigosOcupadosResEspacio
                }
            };

            if (capacidad_minima) {
                whereEspacio.capacidad = { [Op.gte]: parseInt(capacidad_minima) };
            }

            espaciosLibres = await Espacio.findAll({
                where: whereEspacio,
                order: [['nombre', 'ASC']]
            });
        }

        res.json({
            success: true,
            count: aulasLibres.length + espaciosLibres.length,
            aulas: aulasLibres,
            espacios: espaciosLibres
        });
    } catch (error) {
        console.error('Error in searchAvailability:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
