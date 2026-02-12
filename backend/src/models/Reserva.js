const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Usuario = require('./User');
const Estudiante = require('./Estudiante');

const Reserva = sequelize.define('Reserva', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    aula_codigo: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    dia: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    hora_inicio: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    hora_fin: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    motivo: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM('activa', 'cancelada', 'pendiente_aprobacion', 'rechazada', 'finalizada'),
        defaultValue: 'activa'
    },
    // Referencias para identificar al usuario solicitante
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Usuario,
            key: 'id'
        }
    },
    estudiante_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Estudiante,
            key: 'id'
        }
    },
    telegram_id: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    // Datos redundantes para facilitar consultas rápidas sin joins complejos
    solicitante_nombre: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    solicitante_cedula: {
        type: DataTypes.STRING(20),
        allowNull: true
    }
}, {
    tableName: 'reservas',
    timestamps: true,
    underscored: true
});

// Relaciones
Reserva.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Reserva.belongsTo(Estudiante, { foreignKey: 'estudiante_id', as: 'estudiante' });

module.exports = Reserva;
