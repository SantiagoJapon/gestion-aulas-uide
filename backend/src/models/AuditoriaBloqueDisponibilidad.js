const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Rastro de auditoría de cada cambio de estado de un BloqueDisponibilidad
 * (regla 7 del informe: usuario, timestamp y versión de planificación en
 * cada transición, como parte del flujo de escritura, no opcional).
 *
 * Se escribe SIEMPRE dentro de la misma transacción que el cambio que
 * audita: si el registro falla, el cambio se revierte. Un rastro que se
 * puede perder mientras el cambio persiste no sirve como evidencia.
 *
 * `origen` es la dimensión de agrupación para las métricas de
 * trazabilidad (automático vs. manual), que la regla 7 pide como
 * resultado reportable del proyecto.
 */
const ORIGENES = [
  'ENVIO',                    // director envía su propuesta
  'CONFIRMACION',             // director confirma
  'REAPERTURA',               // director reabre el borrador
  'FILL_GAPS',                // admin distribuye sobre huecos
  'REASIGNACION_EXCEPCIONAL', // admin interviene sobre un CONFIRMADO
  'REVERSION_AUTOMATICA',     // el sistema revierte por vencimiento de plazo
];

const AuditoriaBloqueDisponibilidad = sequelize.define('AuditoriaBloqueDisponibilidad', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bloque_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'bloques_disponibilidad',
      key: 'id'
    }
  },
  clase_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  estado_anterior: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  estado_nuevo: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  asignacion_anterior: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  asignacion_nueva: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  origen: {
    type: DataTypes.STRING(40),
    allowNull: false,
    validate: {
      isIn: {
        args: [ORIGENES],
        msg: `origen debe ser uno de: ${ORIGENES.join(', ')}`
      }
    }
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  flujo_planificacion_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'flujos_planificacion',
      key: 'id'
    }
  },
  version_planificacion_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'flujo_planificacion_versiones',
      key: 'id'
    }
  }
}, {
  tableName: 'auditoria_bloques_disponibilidad',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['bloque_id'] },
    { fields: ['clase_id'] },
    { fields: ['origen'] },
    { fields: ['flujo_planificacion_id'] },
    { fields: ['created_at'] }
  ]
});

AuditoriaBloqueDisponibilidad.ORIGENES = ORIGENES;
// Orígenes en los que actuó una persona. El complemento
// (REVERSION_AUTOMATICA) es el sistema — la distinción que la regla 7
// pide poder reportar.
AuditoriaBloqueDisponibilidad.ORIGENES_MANUALES = [
  'ENVIO', 'CONFIRMACION', 'REAPERTURA', 'FILL_GAPS', 'REASIGNACION_EXCEPCIONAL',
];

module.exports = AuditoriaBloqueDisponibilidad;
