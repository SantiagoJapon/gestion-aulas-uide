'use strict';

// ============================================================
// Módulo de planificación colaborativa (Rommie).
// Migración 100% aditiva: solo CREATE TABLE nuevas. Ninguna
// tabla existente (clases, aulas, usuarios, uploads_carreras,
// periodos, distribucion, planificaciones_subidas) es alterada.
//
// Tablas creadas:
//   1. flujos_planificacion          - estado BORRADOR/ENVIADA/CONFIRMADA por carrera+periodo
//   2. flujo_planificacion_versiones - historial de auditoría de cada flujo
//   3. bloques_disponibilidad        - estado LIBRE/EN_REVISION/CONFIRMADO por clase
//   4. conflictos_deteccion          - conflictos detectados al enviar/confirmar
//   5. reasignaciones_excepcionales  - reasignación admin sobre CONFIRMADO, con motivo
//   6. fechas_limite_extendidas      - extensión de plazo por carrera individual
// ============================================================

module.exports = {
  async up(queryInterface, Sequelize) {
    // =============================================
    // 1. flujos_planificacion
    // =============================================
    await queryInterface.createTable('flujos_planificacion', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      carrera_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'uploads_carreras', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      periodo_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'periodos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      estado: {
        type: Sequelize.ENUM('BORRADOR', 'ENVIADA', 'CONFIRMADA'),
        allowNull: false,
        defaultValue: 'BORRADOR',
      },
      fecha_limite: { type: Sequelize.DATE, allowNull: true },
      fecha_confirmacion: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('flujos_planificacion', ['carrera_id', 'periodo_id'], {
      unique: true,
      name: 'unique_flujo_carrera_periodo',
    });
    await queryInterface.addIndex('flujos_planificacion', ['estado']);

    // =============================================
    // 2. flujo_planificacion_versiones
    // =============================================
    await queryInterface.createTable('flujo_planificacion_versiones', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      flujo_planificacion_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'flujos_planificacion', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      numero_version: { type: Sequelize.INTEGER, allowNull: false },
      estado_resultante: {
        type: Sequelize.ENUM('BORRADOR', 'ENVIADA', 'CONFIRMADA'),
        allowNull: false,
      },
      creado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('flujo_planificacion_versiones', ['flujo_planificacion_id']);

    // =============================================
    // 3. bloques_disponibilidad (tabla central)
    // =============================================
    await queryInterface.createTable('bloques_disponibilidad', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      clase_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'clases', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      aula_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'aulas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      dia: { type: Sequelize.STRING(20), allowNull: true },
      hora_inicio: { type: Sequelize.TIME, allowNull: true },
      hora_fin: { type: Sequelize.TIME, allowNull: true },
      estado: {
        type: Sequelize.ENUM('LIBRE', 'EN_REVISION', 'CONFIRMADO'),
        allowNull: false,
        defaultValue: 'LIBRE',
      },
      flujo_planificacion_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'flujos_planificacion', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('bloques_disponibilidad', ['aula_id', 'dia', 'hora_inicio', 'hora_fin'], {
      name: 'idx_bloques_horario_aula',
    });
    await queryInterface.addIndex('bloques_disponibilidad', ['estado']);
    await queryInterface.addIndex('bloques_disponibilidad', ['flujo_planificacion_id']);

    // =============================================
    // 4. conflictos_deteccion
    // =============================================
    await queryInterface.createTable('conflictos_deteccion', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      bloque_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bloques_disponibilidad', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      carrera_solicitante_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'uploads_carreras', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      resuelto: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      sugerencia_ia: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('conflictos_deteccion', ['bloque_id']);
    await queryInterface.addIndex('conflictos_deteccion', ['resuelto']);

    // =============================================
    // 5. reasignaciones_excepcionales
    // =============================================
    await queryInterface.createTable('reasignaciones_excepcionales', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      bloque_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'bloques_disponibilidad', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      motivo: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('reasignaciones_excepcionales', ['bloque_id']);

    // =============================================
    // 6. fechas_limite_extendidas
    // =============================================
    await queryInterface.createTable('fechas_limite_extendidas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      carrera_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'uploads_carreras', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nueva_fecha: { type: Sequelize.DATE, allowNull: false },
      autorizado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('fechas_limite_extendidas', ['carrera_id']);
  },

  async down(queryInterface) {
    // Orden inverso por dependencias FK
    await queryInterface.dropTable('fechas_limite_extendidas');
    await queryInterface.dropTable('reasignaciones_excepcionales');
    await queryInterface.dropTable('conflictos_deteccion');
    await queryInterface.dropTable('bloques_disponibilidad');
    await queryInterface.dropTable('flujo_planificacion_versiones');
    await queryInterface.dropTable('flujos_planificacion');
    // Limpiar tipos ENUM huérfanos (Postgres no los borra con DROP TABLE)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_flujos_planificacion_estado";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_flujo_planificacion_versiones_estado_resultante";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bloques_disponibilidad_estado";');
  },
};
