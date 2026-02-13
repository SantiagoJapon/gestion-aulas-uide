const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EstudianteMateria = sequelize.define('EstudianteMateria', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    estudiante_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'estudiantes',
            key: 'id'
        }
    },
    clase_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'clases',
            key: 'id'
        }
    }
}, {
    tableName: 'estudiantes_materias',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = EstudianteMateria;
