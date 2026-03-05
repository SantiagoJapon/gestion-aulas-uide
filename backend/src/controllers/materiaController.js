const { MateriaCatalogo, Carrera } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * Obtener materias del catálogo con filtros
 */
exports.getMaterias = async (req, res) => {
    try {
        const { carrera_id, search, ciclo } = req.query;
        const usuario = req.usuario;

        const where = { activo: true };

        if (search) {
            where.nombre = { [Op.iLike]: `%${search}%` };
        }

        if (ciclo) {
            where.ciclo = ciclo;
        }

        // Filtro por carrera
        if (usuario.rol === 'director') {
            const carreraObj = await Carrera.findOne({ where: { carrera: usuario.carrera_director } });
            if (carreraObj) {
                where.carrera_id = carreraObj.id;
            } else {
                return res.json({ success: true, materias: [] });
            }
        } else if (carrera_id) {
            where.carrera_id = carrera_id;
        }

        const materias = await MateriaCatalogo.findAll({
            where,
            include: [
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'carrera']
                },
                {
                    model: require('../models').Docente,
                    as: 'docenteAsignado',
                    attributes: ['id', 'nombre']
                }
            ],
            order: [['ciclo', 'ASC'], ['nombre', 'ASC']]
        });

        res.json({
            success: true,
            materias
        });
    } catch (error) {
        console.error('❌ Error en getMaterias:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener materias del catálogo',
            error: error.message
        });
    }
};

/**
 * Obtener una materia por ID
 */
exports.getMateriaById = async (req, res) => {
    try {
        const { id } = req.params;
        const materia = await MateriaCatalogo.findByPk(id, {
            include: [{ model: Carrera, as: 'carrera' }]
        });

        if (!materia) {
            return res.status(404).json({ success: false, message: 'Materia no encontrada' });
        }

        res.json({
            success: true,
            materia
        });
    } catch (error) {
        console.error('❌ Error en getMateriaById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener detalle de la materia',
            error: error.message
        });
    }
};

/**
 * Crear nueva materia en el catálogo
 */
exports.createMateria = async (req, res) => {
    try {
        const { codigo, nombre, creditos, ciclo, carrera_id, docente_id, docente_nombre } = req.body;

        // Si es director, validar que la carrera le pertenezca
        if (req.usuario.rol === 'director') {
            const carreraObj = await Carrera.findOne({ where: { carrera: req.usuario.carrera_director } });
            if (!carreraObj || carreraObj.id !== parseInt(carrera_id)) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para añadir materias a esta carrera' });
            }
        }

        const nuevaMateria = await MateriaCatalogo.create({
            codigo,
            nombre,
            creditos,
            ciclo,
            carrera_id,
            docente_id,
            docente_nombre,
            activo: true
        });

        res.status(201).json({
            success: true,
            mensaje: 'Materia creada exitosamente',
            materia: nuevaMateria
        });
    } catch (error) {
        console.error('❌ Error en createMateria:', error);
        res.status(500).json({ success: false, message: 'Error al crear materia', error: error.message });
    }
};

/**
 * Actualizar materia
 */
exports.updateMateria = async (req, res) => {
    try {
        const { id } = req.params;
        const { codigo, nombre, creditos, ciclo, docente_id, docente_nombre } = req.body;

        const materia = await MateriaCatalogo.findByPk(id);
        if (!materia) return res.status(404).json({ success: false, message: 'Materia no encontrada' });

        // Validar permisos si es director
        if (req.usuario.rol === 'director') {
            const carreraObj = await Carrera.findOne({ where: { carrera: req.usuario.carrera_director } });
            if (!carreraObj || materia.carrera_id !== carreraObj.id) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para editar esta materia' });
            }
        }

        await materia.update({ codigo, nombre, creditos, ciclo, docente_id, docente_nombre });

        res.json({
            success: true,
            mensaje: 'Materia actualizada exitosamente',
            materia
        });
    } catch (error) {
        console.error('❌ Error en updateMateria:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar materia', error: error.message });
    }
};

/**
 * Eliminar materia (Desactivar)
 */
exports.deleteMateria = async (req, res) => {
    try {
        const { id } = req.params;
        const materia = await MateriaCatalogo.findByPk(id);
        if (!materia) return res.status(404).json({ success: false, message: 'Materia no encontrada' });

        // Validar permisos si es director
        if (req.usuario.rol === 'director') {
            const carreraObj = await Carrera.findOne({ where: { carrera: req.usuario.carrera_director } });
            if (!carreraObj || materia.carrera_id !== carreraObj.id) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para eliminar esta materia' });
            }
        }

        // Usamos borrado lógico para no romper historial de clases
        await materia.update({ activo: false });

        res.json({
            success: true,
            mensaje: 'Materia eliminada del catálogo'
        });
    } catch (error) {
        console.error('❌ Error en deleteMateria:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar materia', error: error.message });
    }
};

/**
 * Sincronizar catálogo desde la tabla de clases existente
 */
exports.syncMaterias = async (req, res) => {
    try {
        const { carrera_id } = req.body;
        const usuario = req.usuario;

        let targetCarreraId = carrera_id;

        // Validar permisos
        if (usuario.rol === 'director') {
            const carreraObj = await Carrera.findOne({ where: { carrera: usuario.carrera_director } });
            if (!carreraObj) return res.status(404).json({ success: false, message: 'Carrera no vinculada a su usuario' });
            targetCarreraId = carreraObj.id;
        }

        if (!targetCarreraId) return res.status(400).json({ success: false, message: 'ID de carrera requerido' });

        const { Clase } = require('../models');

        // Obtener materias únicas de la tabla clases
        const clases = await Clase.findAll({
            where: { carrera_id: targetCarreraId },
            attributes: [
                [sequelize.fn('DISTINCT', sequelize.col('materia')), 'materia'],
                'ciclo'
            ],
            raw: true
        });

        let creadas = 0;
        for (const c of clases) {
            const [materia, created] = await MateriaCatalogo.findOrCreate({
                where: {
                    nombre: c.materia,
                    carrera_id: targetCarreraId
                },
                defaults: {
                    nombre: c.materia,
                    ciclo: parseInt(c.ciclo) || null,
                    carrera_id: targetCarreraId,
                    activo: true
                }
            });
            if (created) creadas++;
        }

        res.json({
            success: true,
            mensaje: `Sincronización completada. ${creadas} nuevas materias añadidas al catálogo.`,
            total: clases.length
        });

    } catch (error) {
        console.error('❌ Error en syncMaterias:', error);
        res.status(500).json({ success: false, message: 'Error en sincronización', error: error.message });
    }
};
