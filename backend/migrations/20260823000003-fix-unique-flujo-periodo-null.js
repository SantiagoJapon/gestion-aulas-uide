'use strict';

// ============================================================
// B3 — El índice único (carrera_id, periodo_id) no aplica cuando
// periodo_id es NULL.
//
// En Postgres dos NULL no se consideran iguales dentro de un índice
// único, así que `unique_flujo_carrera_periodo` deja entrar N flujos
// duplicados para la misma carrera mientras periodo_id sea NULL — que es
// justamente el caso por defecto de todo el módulo: el servicio
// (obtenerOCrearFlujo) y el controller pasan periodoId = null salvo que
// el cliente mande uno explícito.
//
// Consecuencia en runtime: findOrCreate bajo concurrencia crea dos filas
// y el findOne posterior devuelve cualquiera de las dos. El estado de la
// carrera se bifurca en silencio.
//
// Se reemplaza por DOS índices parciales que cubren ambos casos sin
// depender de NULLS NOT DISTINCT (PG15+), para que la garantía sea la
// misma en cualquier versión de Postgres soportada:
//   - uniq_flujo_carrera_periodo   WHERE periodo_id IS NOT NULL
//   - uniq_flujo_carrera_sin_periodo WHERE periodo_id IS NULL
//
// Antes de crear los índices hay que deduplicar lo que el índice roto ya
// dejó entrar. Se conserva el flujo más antiguo (menor id) por carrera y
// se repuntan sus hijos: no se pierde ningún bloque ni ninguna fila de
// auditoría, solo desaparece el contenedor duplicado.
// ============================================================

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // 1. Repuntar bloques de los flujos duplicados al flujo canónico.
      await sequelize.query(
        `
        WITH canonico AS (
          SELECT carrera_id, MIN(id) AS keep_id
          FROM flujos_planificacion
          WHERE periodo_id IS NULL
          GROUP BY carrera_id
          HAVING COUNT(*) > 1
        )
        UPDATE bloques_disponibilidad b
           SET flujo_planificacion_id = c.keep_id
          FROM flujos_planificacion f
          JOIN canonico c ON c.carrera_id = f.carrera_id
         WHERE b.flujo_planificacion_id = f.id
           AND f.periodo_id IS NULL
           AND f.id <> c.keep_id;
        `,
        { transaction }
      );

      // 2. Repuntar las versiones de auditoría al flujo canónico.
      await sequelize.query(
        `
        WITH canonico AS (
          SELECT carrera_id, MIN(id) AS keep_id
          FROM flujos_planificacion
          WHERE periodo_id IS NULL
          GROUP BY carrera_id
          HAVING COUNT(*) > 1
        )
        UPDATE flujo_planificacion_versiones v
           SET flujo_planificacion_id = c.keep_id
          FROM flujos_planificacion f
          JOIN canonico c ON c.carrera_id = f.carrera_id
         WHERE v.flujo_planificacion_id = f.id
           AND f.periodo_id IS NULL
           AND f.id <> c.keep_id;
        `,
        { transaction }
      );

      // 3. Renumerar numero_version por flujo (el merge del paso 2 puede
      //    haber juntado dos secuencias que empezaban en 1). Se ordena por
      //    created_at para preservar la cronología real de las transiciones.
      await sequelize.query(
        `
        WITH renumerado AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY flujo_planificacion_id
                   ORDER BY created_at, id
                 ) AS nuevo_numero
            FROM flujo_planificacion_versiones
        )
        UPDATE flujo_planificacion_versiones v
           SET numero_version = r.nuevo_numero
          FROM renumerado r
         WHERE v.id = r.id
           AND v.numero_version <> r.nuevo_numero;
        `,
        { transaction }
      );

      // 4. Borrar los flujos duplicados, ya sin hijos apuntando a ellos.
      await sequelize.query(
        `
        WITH canonico AS (
          SELECT carrera_id, MIN(id) AS keep_id
          FROM flujos_planificacion
          WHERE periodo_id IS NULL
          GROUP BY carrera_id
          HAVING COUNT(*) > 1
        )
        DELETE FROM flujos_planificacion f
         USING canonico c
         WHERE f.carrera_id = c.carrera_id
           AND f.periodo_id IS NULL
           AND f.id <> c.keep_id;
        `,
        { transaction }
      );

      // 5. Reemplazar el índice roto por los dos parciales.
      await sequelize.query(
        'DROP INDEX IF EXISTS unique_flujo_carrera_periodo;',
        { transaction }
      );
      await sequelize.query(
        `CREATE UNIQUE INDEX uniq_flujo_carrera_periodo
           ON flujos_planificacion (carrera_id, periodo_id)
         WHERE periodo_id IS NOT NULL;`,
        { transaction }
      );
      await sequelize.query(
        `CREATE UNIQUE INDEX uniq_flujo_carrera_sin_periodo
           ON flujos_planificacion (carrera_id)
         WHERE periodo_id IS NULL;`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP INDEX IF EXISTS uniq_flujo_carrera_sin_periodo;', { transaction });
      await sequelize.query('DROP INDEX IF EXISTS uniq_flujo_carrera_periodo;', { transaction });
      // Se restaura el índice original (con el agujero de NULL incluido).
      await sequelize.query(
        `CREATE UNIQUE INDEX unique_flujo_carrera_periodo
           ON flujos_planificacion (carrera_id, periodo_id);`,
        { transaction }
      );
    });
  },
};
