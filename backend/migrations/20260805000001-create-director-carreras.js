'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Crear tabla director_carreras
    await queryInterface.createTable('director_carreras', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      carrera_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'uploads_carreras',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('director_carreras', ['usuario_id', 'carrera_id'], {
      unique: true,
      name: 'unique_usuario_carrera'
    });

    // 2. Migrar asignaciones existentes de usuarios.carrera_director -> director_carreras
    try {
      const [directores] = await queryInterface.sequelize.query(
        `SELECT u.id as usuario_id, c.id as carrera_id 
         FROM usuarios u
         JOIN uploads_carreras c ON LOWER(TRIM(u.carrera_director)) = LOWER(TRIM(c.carrera))
         WHERE u.rol = 'director' AND u.carrera_director IS NOT NULL AND u.carrera_director != ''`
      );

      for (const d of directores) {
        await queryInterface.sequelize.query(
          `INSERT INTO director_carreras (usuario_id, carrera_id, created_at, updated_at)
           VALUES (:usuario_id, :carrera_id, NOW(), NOW())
           ON CONFLICT (usuario_id, carrera_id) DO NOTHING`,
          { replacements: { usuario_id: d.usuario_id, carrera_id: d.carrera_id } }
        );
      }
    } catch (err) {
      console.warn('Advertencia migrando asignaciones existentes a director_carreras:', err.message);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('director_carreras');
  }
};
