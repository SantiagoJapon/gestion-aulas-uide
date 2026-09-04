'use strict';

// ============================================================
// I5 — Auditoría a nivel de bloque.
//
// La regla 7 del informe dice que cada cambio de estado en un bloque debe
// registrar usuario_id, timestamp y referencia a la versión de
// planificación, "no como campo opcional, sino como parte del flujo de
// escritura". Hasta ahora `bloques_disponibilidad` solo tenía updated_at:
// no quedaba quién movió qué, ni desde dónde. El caso más grave era
// aplicarDistribucionFillGaps(), que recibía adminId y no lo usaba — el
// admin escribía CONFIRMADO en masa sin dejar rastro.
//
// La misma regla pide que estos datos sean consultables en agregado
// (tasas de resolución automática vs. manual) porque alimentan resultados
// reportables del proyecto. Por eso `origen` es una columna de primera
// clase y no texto libre: es la dimensión por la que se agrupa.
//
// clase_id va desnormalizado a propósito: si el bloque se borra (la
// cascada de re-subir un Excel lo permite), el rastro de auditoría tiene
// que sobrevivir. Un historial que se borra junto con lo que audita no es
// un historial.
// ============================================================

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auditoria_bloques_disponibilidad', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      // SET NULL, no CASCADE: el registro sobrevive al borrado del bloque.
      bloque_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'bloques_disponibilidad', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      clase_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Desnormalizado: identifica la clase aunque el bloque ya no exista.',
      },

      estado_anterior: { type: Sequelize.STRING(20), allowNull: true },
      estado_nuevo: { type: Sequelize.STRING(20), allowNull: false },

      // Snapshot completo de la asignación a cada lado del cambio.
      // JSONB en vez de 8 columnas: el shape puede crecer (§3.7 agrega
      // es_prestamo) sin una migración por campo.
      asignacion_anterior: { type: Sequelize.JSONB, allowNull: true },
      asignacion_nueva: { type: Sequelize.JSONB, allowNull: true },

      // VARCHAR y no ENUM a propósito: §3.7 va a agregar RECLAMO_PRIORIDAD,
      // y ampliar un ENUM de Postgres dentro de una transacción es
      // innecesariamente incómodo. La validación vive en el modelo.
      origen: {
        type: Sequelize.STRING(40),
        allowNull: false,
        comment: 'ENVIO | CONFIRMACION | REAPERTURA | FILL_GAPS | REASIGNACION_EXCEPCIONAL | REVERSION_AUTOMATICA',
      },

      // NULL = el sistema (reversión automática por vencimiento de plazo).
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      flujo_planificacion_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'flujos_planificacion', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      // La "referencia a la versión de planificación" que pide la regla 7.
      version_planificacion_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'flujo_planificacion_versiones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('auditoria_bloques_disponibilidad', ['bloque_id']);
    await queryInterface.addIndex('auditoria_bloques_disponibilidad', ['clase_id']);
    await queryInterface.addIndex('auditoria_bloques_disponibilidad', ['origen']);
    await queryInterface.addIndex('auditoria_bloques_disponibilidad', ['flujo_planificacion_id']);
    await queryInterface.addIndex('auditoria_bloques_disponibilidad', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('auditoria_bloques_disponibilidad');
  },
};
