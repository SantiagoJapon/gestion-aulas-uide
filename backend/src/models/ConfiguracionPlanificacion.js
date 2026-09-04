const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Ventana global de planificación por período (regla 3.3): el admin fija
 * una fecha de inicio y una fecha límite generales, y cada FlujoPlanificacion
 * puede apuntar a la configuración vigente vía configuracion_planificacion_id.
 *
 * La tabla la creó la migración 20260823000001, pero no existía el modelo
 * Sequelize correspondiente. Eso tenía dos consecuencias:
 *  1. configuracionPlanificacionController.js hacía require de un modelo
 *     `undefined` y explotaba en runtime al usarlo.
 *  2. sequelize.sync() no podía crear la tabla, y como FlujoPlanificacion
 *     tiene una FK hacia ella, sync() fallaba entero. El test de
 *     concurrencia real (el único que verifica los advisory locks contra
 *     Postgres real) quedaba silenciosamente omitido y reportaba verde.
 */
const ConfiguracionPlanificacion = sequelize.define('ConfiguracionPlanificacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  periodo_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'periodos',
      key: 'id'
    }
  },
  fecha_inicio_global: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  fecha_fin_global: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fecha_asignacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  asignado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  }
}, {
  tableName: 'configuracion_planificacion',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['periodo_id'] },
    { fields: ['activo'] }
  ]
});

module.exports = ConfiguracionPlanificacion;
