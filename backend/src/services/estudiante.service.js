const { Estudiante, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const XLSX = require('xlsx');

class EstudianteService {
    async lookupByEmail(email) {
        return await Estudiante.findOne({ where: { email } });
    }

    async findByCedula(cedula) {
        return await Estudiante.findOne({ where: { cedula } });
    }

    async getMateriasByEstudianteId(estudianteId, escuela = null) {
        const escuelaParam = (escuela && escuela !== 'Sin especificar') ? `%${escuela}%` : null;
        return await sequelize.query(`
      SELECT c.id, c.materia, c.dia, c.hora_inicio, c.hora_fin,
             COALESCE(a.nombre, c.aula_asignada, 'S/A') as aula,
             c.docente
      FROM clases c
      INNER JOIN estudiantes_materias em ON em.clase_id = c.id
      LEFT JOIN aulas a ON a.codigo = c.aula_asignada
      WHERE em.estudiante_id = :id
        AND (:escuela IS NULL OR c.carrera ILIKE :escuela)
    `, {
            replacements: { id: estudianteId, escuela: escuelaParam },
            type: QueryTypes.SELECT
        });
    }

    validarCedulaEcuatoriana(cedula) {
        if (!cedula || cedula.length !== 10) return false;

        const digitos = cedula.split('').map(Number);
        const provincia = parseInt(cedula.substring(0, 2));

        if (provincia < 1 || provincia > 24) return false;

        const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        let suma = 0;

        for (let i = 0; i < 9; i++) {
            let valor = digitos[i] * coeficientes[i];
            if (valor >= 10) valor -= 9;
            suma += valor;
        }

        const verificador = suma % 10 === 0 ? 0 : 10 - (suma % 10);
        return verificador === digitos[9];
    }

    async upsertEstudiante(data, transaction) {
        const { cedula, nombre, email, nivel, escuela } = data;
        const result = await sequelize.query(
            `INSERT INTO estudiantes
       (cedula, nombre, email, nivel, escuela)
       VALUES (:cedula, :nombre, :email, :nivel, :escuela)
       ON CONFLICT (cedula)
       DO UPDATE SET
         nombre = EXCLUDED.nombre,
         email = EXCLUDED.email,
         nivel = EXCLUDED.nivel,
         escuela = EXCLUDED.escuela
       RETURNING (xmax = 0) as inserted`,
            {
                replacements: { cedula, nombre, email, nivel, escuela },
                type: QueryTypes.INSERT,
                transaction
            }
        );
        return result[0] && result[0][0] && result[0][0].inserted;
    }

    async inscribirMateria(estudianteId, materiaNombre, escuela, transaction) {
        const claseCheck = await sequelize.query(
            `SELECT id FROM clases 
       WHERE (materia ILIKE :materia OR :materia ILIKE CONCAT('%', materia, '%'))
       AND (carrera = :escuela OR carrera_id IN (SELECT id FROM uploads_carreras WHERE carrera = :escuela))
       LIMIT 1`,
            {
                replacements: {
                    materia: `%${materiaNombre}%`,
                    escuela: escuela
                },
                type: QueryTypes.SELECT,
                transaction
            }
        );

        if (claseCheck.length > 0) {
            await sequelize.query(
                `INSERT INTO estudiantes_materias (estudiante_id, clase_id, created_at, updated_at)
         VALUES (:est_id, :clase_id, NOW(), NOW())
         ON CONFLICT (estudiante_id, clase_id) DO NOTHING`,
                {
                    replacements: { est_id: estudianteId, clase_id: claseCheck[0].id },
                    type: QueryTypes.INSERT,
                    transaction
                }
            );
            return true;
        }
        return false;
    }
}

module.exports = new EstudianteService();
