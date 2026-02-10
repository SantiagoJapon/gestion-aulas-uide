const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReporteHistorial = sequelize.define('ReporteHistorial', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('GENERAL', 'CARRERA', 'AULA', 'ESPACIOS'),
        allowNull: false
    },
    filtros: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    },
    metadatos: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Almacena métricas calculadas al momento de generar el reporte'
    },
    ruta_archivo: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    formato: {
        type: DataTypes.STRING(10),
        defaultValue: 'PDF'
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    }
}, {
    tableName: 'reportes_historial',
    timestamps: true,
    createdAt: 'fecha_generacion',
    updatedAt: false
});

module.exports = ReporteHistorial;
