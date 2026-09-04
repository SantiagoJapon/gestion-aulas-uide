const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Tabla central del módulo de planificación colaborativa.
 * 1 fila por clase_id (relación 1-1). Estado LIBRE -> EN_REVISION -> CONFIRMADO.
 *
 * CONFIRMADO es inmutable salvo:
 *  - Reasignación excepcional del admin (ver ReasignacionExcepcional, motivo obligatorio)
 *  - La distribución "fill the gaps" NUNCA debe escribir sobre un bloque CONFIRMADO
 *    (restricción de arquitectura, no solo de lógica de negocio — validar en el
 *    servicio que ejecuta la distribución, no solo aquí).
 *
 * NOTA: esta tabla es independiente del modelo `Distribucion` existente
 * (historial secundario ya usado por el algoritmo heurístico legado). No se
 * fusionan para no mezclar la semántica de estado 'confirmada'/'sobrecupo'
 * (libre, ya en uso) con el estado de workflow LIBRE/EN_REVISION/CONFIRMADO.
 */
const BloqueDisponibilidad = sequelize.define('BloqueDisponibilidad', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clase_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'clases',
      key: 'id'
    }
  },
  aula_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'aulas',
      key: 'id'
    }
  },
  dia: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  hora_inicio: {
    type: DataTypes.TIME,
    allowNull: true
  },
  hora_fin: {
    type: DataTypes.TIME,
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('LIBRE', 'EN_REVISION', 'CONFIRMADO'),
    allowNull: false,
    defaultValue: 'LIBRE',
    validate: {
      isIn: {
        args: [['LIBRE', 'EN_REVISION', 'CONFIRMADO']],
        msg: 'El estado debe ser: LIBRE, EN_REVISION o CONFIRMADO'
      }
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

  // --- Snapshot de la última versión CONFIRMADO (regla 3.2) ---
  // NO es una segunda fuente de verdad: aula_id/dia/hora_* siguen siendo
  // la única respuesta a "dónde está esta clase ahora". Estas cuatro solo
  // responden "dónde estaba la última vez que quedó CONFIRMADO", y las lee
  // exclusivamente el job de reversión por vencimiento de plazo
  // (cron/revertirPlanificacionesVencidas.js). Se escriben en cada
  // transición a CONFIRMADO y nunca se limpian al reabrir — reabrir es
  // justamente cuando hay que conservarlas.
  aula_id_confirmada: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'aulas',
      key: 'id'
    }
  },
  dia_confirmado: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  hora_inicio_confirmada: {
    type: DataTypes.TIME,
    allowNull: true
  },
  hora_fin_confirmada: {
    type: DataTypes.TIME,
    allowNull: true
  }
}, {
  tableName: 'bloques_disponibilidad',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at',
  indexes: [
    { name: 'idx_bloques_horario_aula', fields: ['aula_id', 'dia', 'hora_inicio', 'hora_fin'] },
    { fields: ['estado'] },
    { fields: ['flujo_planificacion_id'] }
  ]
});

module.exports = BloqueDisponibilidad;
