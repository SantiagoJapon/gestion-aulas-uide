const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Usuario = require('./User');
const Aula = require('./Aula'); // Referencia opcional si existe modelo Aula, o string codigo

const Incidencia = sequelize.define('Incidencia', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tipo: {
        type: DataTypes.ENUM('HARDWARE', 'SOFTWARE', 'LIMPIEZA', 'CLIMATIZACION', 'MOBILIARIO', 'OTRO'),
        defaultValue: 'OTRO'
    },
    prioridad: {
        type: DataTypes.ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA'),
        defaultValue: 'MEDIA'
    },
    estado: {
        type: DataTypes.ENUM('PENDIENTE', 'REVISANDO', 'RESUELTO', 'CERRADO'),
        defaultValue: 'PENDIENTE'
    },
    aula_codigo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fecha_resolucion: {
        type: DataTypes.DATE,
        allowNull: true
    },
    respuesta_tecnica: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Usuario,
            key: 'id'
        }
    }
}, {
    tableName: 'incidencias',
    timestamps: true,
    underscored: true
});

// Relaciones definidas en models/index.js para evitar duplicados

module.exports = Incidencia;
