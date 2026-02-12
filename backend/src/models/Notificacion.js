const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Usuario = require('./User');
const Estudiante = require('./Estudiante');
const Carrera = require('./Carrera');
const Clase = require('./Clase');

const Notificacion = sequelize.define('Notificacion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mensaje: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('CLASE', 'CARRERA', 'GLOBAL', 'SISTEMA', 'DIRECTA'),
        allowNull: false
    },
    prioridad: {
        type: DataTypes.ENUM('ALTA', 'MEDIA', 'BAJA'),
        defaultValue: 'MEDIA'
    },
    leida: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    fecha_expiracion: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // Referencias opcionales
    remitente_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Usuario,
            key: 'id'
        }
    },
    destinatario_id: { // Para mensaje directo a un usuario del sistema (profesor/admin)
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Usuario,
            key: 'id'
        }
    },
    estudiante_id: { // Para mensaje directo a un estudiante
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Estudiante,
            key: 'id'
        }
    },
    carrera_id: { // Para mensaje masivo a una carrera
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Carrera,
            key: 'id'
        }
    },
    clase_id: { // Para mensaje a una clase
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Clase,
            key: 'id'
        }
    }
}, {
    tableName: 'notificaciones',
    timestamps: true,
    underscored: true
});

// Relaciones
Notificacion.belongsTo(Usuario, { foreignKey: 'remitente_id', as: 'remitente' });
Notificacion.belongsTo(Usuario, { foreignKey: 'destinatario_id', as: 'destinatarioUsuario' });
Notificacion.belongsTo(Estudiante, { foreignKey: 'estudiante_id', as: 'destinatarioEstudiante' });
Notificacion.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
Notificacion.belongsTo(Clase, { foreignKey: 'clase_id', as: 'clase' });

module.exports = Notificacion;
