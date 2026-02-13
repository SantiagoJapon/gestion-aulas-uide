const { Docente, Clase, Carrera } = require('../models');
const { QueryTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Función centralizada para loggeo de errores 500
 */
const handle500 = (res, error, context) => {
    console.error(`❌ [500] Error en ${context}:`, error);
    res.status(500).json({
        success: false,
        error: `Error en ${context}`,
        message: error.message
    });
};

/**
 * Obtener lista de docentes con carga y filtros
 * GET /api/docentes
 */
exports.getDocentes = async (req, res) => {
    try {
        const { carrera_id, tipo, search } = req.query;
        const usuario = req.usuario;

        // Filtros base
        const where = {};
        if (tipo) where.tipo = tipo;
        if (search) {
            where.nombre = { [Op.iLike]: `%${search}%` };
        }

        // Filtrado por carrera (Seguridad y lógica de Director)
        if (usuario.rol === 'director') {
            // Si es director, solo ve su carrera asignada en carrera_director
            const carreraObj = await Carrera.findOne({ where: { carrera: usuario.carrera_director } });
            if (carreraObj) {
                where.carrera_id = carreraObj.id;
            } else {
                // Si no tiene carrera asignada, no devuelve nada
                return res.json({ success: true, docentes: [] });
            }
        } else if (carrera_id) {
            // Si es admin y pasa carrera_id, filtrar por ella
            where.carrera_id = carrera_id;
        }

        // Obtener docentes con su carrera y carga agrupada
        const docentes = await Docente.findAll({
            where,
            include: [
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'carrera']
                }
            ],
            order: [['nombre', 'ASC']]
        });

        // Enriquecer con carga (total clases y horas)
        // Usamos una query separada o sumamos en JS para evitar problemas de group by complejos con asociaciones
        const docentesIds = docentes.map(d => d.id);
        let cargaMap = {};

        if (docentesIds.length > 0) {
            const carga = await sequelize.query(`
        SELECT
          docente_id,
          COUNT(*) as total_clases,
          COALESCE(SUM(
            CASE
              WHEN hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND hora_inicio <> '' AND hora_fin <> '' THEN
                (EXTRACT(HOUR FROM hora_fin::TIME) * 60 + EXTRACT(MINUTE FROM hora_fin::TIME)) -
                (EXTRACT(HOUR FROM hora_inicio::TIME) * 60 + EXTRACT(MINUTE FROM hora_inicio::TIME))
              ELSE 0
            END
          ) / 60.0, 0) as total_horas,
          STRING_AGG(DISTINCT materia, ', ') as materias
        FROM clases
        WHERE docente_id IN (:docentesIds)
        GROUP BY docente_id
      `, {
                replacements: { docentesIds },
                type: QueryTypes.SELECT
            });

            carga.forEach(item => {
                cargaMap[item.docente_id] = {
                    total_clases: parseInt(item.total_clases),
                    total_horas: parseFloat(item.total_horas).toFixed(1),
                    materias: item.materias
                };
            });
        }

        const result = docentes.map(d => ({
            ...d.toJSON(),
            carga: cargaMap[d.id] || { total_clases: 0, total_horas: 0, materias: '' }
        }));

        res.json({
            success: true,
            docentes: result
        });
    } catch (error) {
        handle500(res, error, 'getDocentes');
    }
};

/**
 * Obtener detalle de un docente
 * GET /api/docentes/:id
 */
exports.getDocenteById = async (req, res) => {
    try {
        const { id } = req.params;
        const docente = await Docente.findByPk(id, {
            include: [
                { model: Carrera, as: 'carrera' },
                { model: Clase, as: 'clases' }
            ]
        });

        if (!docente) {
            return res.status(404).json({ success: false, message: 'Docente no encontrado' });
        }

        res.json({
            success: true,
            docente
        });
    } catch (error) {
        handle500(res, error, 'getDocenteById');
    }
};

/**
 * Actualizar datos de un docente
 * PUT /api/docentes/:id
 */
exports.updateDocente = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, titulo_pregrado, titulo_posgrado, tipo } = req.body;

        const docente = await Docente.findByPk(id);
        if (!docente) {
            return res.status(404).json({ success: false, message: 'Docente no encontrado' });
        }

        await docente.update({
            nombre,
            email,
            titulo_pregrado,
            titulo_posgrado,
            tipo
        });

        res.json({
            success: true,
            docente,
            mensaje: 'Docente actualizado correctamente'
        });
    } catch (error) {
        handle500(res, error, 'updateDocente');
    }
};
