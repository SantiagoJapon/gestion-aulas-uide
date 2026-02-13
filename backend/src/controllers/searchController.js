const { Clase, Docente, Aula, User, Carrera } = require('../models');
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
 * Búsqueda de disponibilidad (Aulas Vacías)
 * GET /api/search/disponibilidad?dia=Lunes&hora_inicio=07:00&hora_fin=09:00
 */
exports.searchAvailability = async (req, res) => {
    try {
        const { dia, hora_inicio, hora_fin, capacidad_minima } = req.query;

        if (!dia || !hora_inicio || !hora_fin) {
            return res.status(400).json({ success: false, message: 'Faltan parámetros de tiempo' });
        }

        // Query para encontrar aulas que NO tienen clases en ese horario
        const aulasOcupadasRaw = await sequelize.query(`
      SELECT DISTINCT aula_asignada 
      FROM clases 
      WHERE dia = :dia 
      AND aula_asignada IS NOT NULL
      AND (
        (hora_inicio < :hora_fin AND hora_fin > :hora_inicio)
      )
    `, {
            replacements: { dia, hora_inicio, hora_fin },
            type: sequelize.QueryTypes.SELECT
        });

        const codigosOcupados = aulasOcupadasRaw.map(r => r.aula_asignada);

        const whereAula = {
            codigo: { [Op.notIn]: codigosOcupados.length > 0 ? codigosOcupados : ['__NONE__'] },
            estado: 'DISPONIBLE'
        };

        if (capacidad_minima) {
            whereAula.capacidad = { [Op.gte]: parseInt(capacidad_minima) };
        }

        const aulasDisponibles = await Aula.findAll({
            where: whereAula,
            order: [['capacidad', 'ASC']]
        });

        res.json({
            success: true,
            count: aulasDisponibles.length,
            aulas: aulasDisponibles
        });
    } catch (error) {
        console.error('Error in searchAvailability:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
