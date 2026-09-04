const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Estado de workflow de la planificación de una carrera (por período).
 * BORRADOR -> ENVIADA -> CONFIRMADA. El director puede reabrir
 * (CONFIRMADA/ENVIADA -> BORRADOR) libremente antes de fecha_limite,
 * sin permiso del admin. Reabrir NO libera bloques_disponibilidad
 * de inmediato: pasan a EN_REVISION (ver BloqueDisponibilidad).
 */
const FlujoPlanificacion = sequelize.define('FlujoPlanificacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  carrera_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  estado: {
    type: DataTypes.ENUM('BORRADOR', 'ENVIADA', 'CONFIRMADA'),
    allowNull: false,
    defaultValue: 'BORRADOR',
    validate: {
      isIn: {
        args: [['BORRADOR', 'ENVIADA', 'CONFIRMADA']],
        msg: 'El estado debe ser: BORRADOR, ENVIADA o CONFIRMADA'
      }
    }
  },
  fecha_limite: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fecha_confirmacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  configuracion_planificacion_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'configuracion_planificacion',
      key: 'id'
    }
  }
}, {
  tableName: 'flujos_planificacion',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    // Dos índices parciales en vez de uno solo sobre (carrera_id, periodo_id):
    // en Postgres dos NULL no son iguales dentro de un índice único, así que
    // el índice combinado no impedía flujos duplicados cuando periodo_id es
    // NULL — que es el caso por defecto del módulo. Ver migración
    // 20260823000003-fix-unique-flujo-periodo-null.js.
    {
      unique: true,
      fields: ['carrera_id', 'periodo_id'],
      name: 'uniq_flujo_carrera_periodo',
      where: { periodo_id: { [Op.ne]: null } }
    },
    {
      unique: true,
      fields: ['carrera_id'],
      name: 'uniq_flujo_carrera_sin_periodo',
      where: { periodo_id: null }
    },
    { fields: ['estado'] }
  ]
});

module.exports = FlujoPlanificacion;
