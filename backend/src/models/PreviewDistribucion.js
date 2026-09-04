const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Preview de la distribución general del admin (§3.4 / §5.3).
 *
 * Existe por dos razones distintas:
 *
 *  1. Integridad: aplicar recibe un preview_id, no un array de propuestas
 *     que el cliente arma solo. Sin esto, cualquier cliente podía escribir
 *     aula/día/hora arbitrarios sobre bloques LIBRE sin pasar por el motor
 *     heurístico.
 *  2. Evidencia: el payload guarda las TRES listas que se le mostraron al
 *     admin (lo que no cambia, lo que se asigna, lo que quedó sin ubicar),
 *     no solo lo que se terminó escribiendo. §3.4 exige que apruebe con esa
 *     evidencia a la vista, así que hay que poder demostrar cuál fue.
 *
 * Un preview APLICADO no se puede volver a aplicar: es lo que hace que
 * reintentar por red no duplique la distribución.
 */
const ESTADOS = ['PENDIENTE', 'APLICADO', 'DESCARTADO'];

const PreviewDistribucion = sequelize.define('PreviewDistribucion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  carrera_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'uploads_carreras',
      key: 'id'
    }
  },
  periodo_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'periodos',
      key: 'id'
    }
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'PENDIENTE',
    validate: {
      isIn: {
        args: [ESTADOS],
        msg: `estado debe ser uno de: ${ESTADOS.join(', ')}`
      }
    }
  },
  creado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  aplicado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  aplicado_en: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'previews_distribucion',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['estado'] },
    { fields: ['carrera_id', 'periodo_id'] },
    { fields: ['created_at'] }
  ]
});

PreviewDistribucion.ESTADOS = ESTADOS;

module.exports = PreviewDistribucion;
