'use strict';

// ============================================================
// Reafirma explícitamente el ON DELETE/ON UPDATE de cada FK que
// apunta a usuarios.id (o a director_carreras.usuario_id).
//
// Por qué esta migración existe: la migración original
// (20260704000001-create-all-tables.js) ya definía CASCADE/SET
// NULL correctamente, pero ninguna asociación de Sequelize los
// declaraba. En desarrollo el servidor arranca con
// sequelize.sync({ alter: true }) (backend/src/index.js), que es
// modelo-driven — cualquier FK que Sequelize gestione durante un
// alter podía terminar sin ON DELETE (default de Postgres:
// NO ACTION), bloqueando la eliminación de un director con datos
// asociados. Los modelos ya se corrigieron para declarar el mismo
// onDelete/onUpdate que esta migración; este archivo reafirma la
// restricción real en la base de datos, sin importar cómo haya
// quedado el constraint actual (creado por la migración original,
// o regenerado sin CASCADE por un alter previo).
//
// La búsqueda del constraint es dinámica (via information_schema)
// en vez de asumir un nombre fijo, para no fallar si el nombre
// real difiere del que generaría Sequelize por defecto.
// ============================================================

const OBJETIVOS = [
  { tabla: 'director_carreras', columna: 'usuario_id', onDelete: 'CASCADE' },
  { tabla: 'director_carreras', columna: 'carrera_id', onDelete: 'CASCADE' },
  { tabla: 'planificaciones_subidas', columna: 'usuario_id', onDelete: 'CASCADE' },
  { tabla: 'reportes_historial', columna: 'usuario_id', onDelete: 'CASCADE' },
  { tabla: 'incidencias', columna: 'usuario_id', onDelete: 'CASCADE' },
  { tabla: 'docentes', columna: 'usuario_id', onDelete: 'SET NULL' },
  { tabla: 'reservas', columna: 'usuario_id', onDelete: 'SET NULL' },
  { tabla: 'notificaciones', columna: 'remitente_id', onDelete: 'SET NULL' },
  { tabla: 'notificaciones', columna: 'destinatario_id', onDelete: 'SET NULL' },
  { tabla: 'historial_cargas', columna: 'usuario_id', onDelete: 'SET NULL' }
];

async function redefinirForeignKey(queryInterface, tabla, columna, onDelete) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT tc.constraint_name, ccu.table_name AS tabla_referenciada, ccu.column_name AS columna_referenciada
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = :tabla
      AND kcu.column_name = :columna
      AND tc.constraint_type = 'FOREIGN KEY'
    `,
    { replacements: { tabla, columna } }
  );

  if (!constraints || constraints.length === 0) {
    console.warn(`⚠️  No se encontró FK existente en ${tabla}.${columna} — se omite (revisar manualmente).`);
    return;
  }

  const { constraint_name, tabla_referenciada, columna_referenciada } = constraints[0];

  await queryInterface.sequelize.query(
    `ALTER TABLE "${tabla}" DROP CONSTRAINT "${constraint_name}"`
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE "${tabla}"
     ADD CONSTRAINT "${constraint_name}"
     FOREIGN KEY ("${columna}") REFERENCES "${tabla_referenciada}"("${columna_referenciada}")
     ON UPDATE CASCADE ON DELETE ${onDelete}`
  );

  console.log(`✅ ${tabla}.${columna} -> ON DELETE ${onDelete} (constraint: ${constraint_name})`);
}

module.exports = {
  async up(queryInterface) {
    for (const { tabla, columna, onDelete } of OBJETIVOS) {
      await redefinirForeignKey(queryInterface, tabla, columna, onDelete);
    }
  },

  async down() {
    // No-op deliberado: revertir significaría volver a NO ACTION,
    // que es exactamente el estado roto que esta migración corrige.
    // Si hace falta revertir, hacerlo manualmente y con intención.
  }
};
