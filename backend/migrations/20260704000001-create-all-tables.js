'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // =============================================
    // 1. usuarios
    // =============================================
    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      apellido: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false },
      password: { type: Sequelize.STRING(255), allowNull: false },
      rol: {
        type: Sequelize.ENUM('admin', 'director', 'profesor', 'docente', 'estudiante'),
        allowNull: false,
        defaultValue: 'estudiante',
      },
      cedula: { type: Sequelize.STRING(10), allowNull: true, unique: true },
      telefono: { type: Sequelize.STRING(10), allowNull: true },
      carrera_director: { type: Sequelize.STRING(100), allowNull: true },
      estado: { type: Sequelize.ENUM('activo', 'inactivo'), allowNull: false, defaultValue: 'activo' },
      requiere_cambio_password: { type: Sequelize.BOOLEAN, defaultValue: false },
      password_temporal_expira: { type: Sequelize.DATE, allowNull: true },
      token_recuperacion: { type: Sequelize.STRING(255), allowNull: true },
      token_expira: { type: Sequelize.DATE, allowNull: true },
      ultimo_cambio_password: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // =============================================
    // 2. uploads_carreras (Carrera)
    // =============================================
    await queryInterface.createTable('uploads_carreras', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      carrera: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      carrera_normalizada: { type: Sequelize.STRING(120), allowNull: true },
      activa: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: true },
      updated_at: { type: Sequelize.DATE, allowNull: true },
    });

    // =============================================
    // 3. periodos
    // =============================================
    await queryInterface.createTable('periodos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      fecha_inicio: { type: Sequelize.DATEONLY, allowNull: true },
      fecha_fin: { type: Sequelize.DATEONLY, allowNull: true },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
    });

    // =============================================
    // 4. docentes
    // =============================================
    await queryInterface.createTable('docentes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      titulo_pregrado: { type: Sequelize.STRING(200), allowNull: true },
      titulo_posgrado: { type: Sequelize.TEXT, allowNull: true },
      tipo: { type: Sequelize.STRING(50), allowNull: true, defaultValue: 'Tiempo Completo' },
      carrera_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'uploads_carreras', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      email: { type: Sequelize.STRING(100), allowNull: true },
      telefono: { type: Sequelize.STRING(15), allowNull: true },
      usuario_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
    });
    await queryInterface.addIndex('docentes', ['carrera_id']);
    await queryInterface.addIndex('docentes', ['usuario_id']);

    // =============================================
    // 5. estudiantes
    // =============================================
    await queryInterface.createTable('estudiantes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      cedula: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: true },
      escuela: { type: Sequelize.STRING(100), allowNull: true },
      nivel: { type: Sequelize.STRING(50), allowNull: true },
      email: { type: Sequelize.STRING(100), allowNull: true },
      edad: { type: Sequelize.INTEGER, allowNull: true },
      telefono: { type: Sequelize.STRING(20), allowNull: true },
      fecha_registro: { type: Sequelize.DATE, allowNull: true },
    });

    // =============================================
    // 6. aulas
    // =============================================
    await queryInterface.createTable('aulas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      capacidad: { type: Sequelize.INTEGER, allowNull: false },
      tipo: { type: Sequelize.STRING(50), allowNull: false },
      restriccion_carrera: { type: Sequelize.TEXT, allowNull: true },
      es_prioritaria: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      edificio: { type: Sequelize.STRING(50), allowNull: true },
      piso: { type: Sequelize.INTEGER, allowNull: true },
      equipamiento: { type: Sequelize.JSONB, allowNull: true },
      estado: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'disponible' },
      notas: { type: Sequelize.TEXT, allowNull: true },
    });
    await queryInterface.addIndex('aulas', ['tipo']);
    await queryInterface.addIndex('aulas', ['estado']);

    // =============================================
    // 7. espacios
    // =============================================
    await queryInterface.createTable('espacios', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      codigo: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      tipo: { type: Sequelize.STRING(50), allowNull: false },
      capacidad: { type: Sequelize.INTEGER, allowNull: false },
      estado: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'DISPONIBLE' },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('espacios', ['tipo']);
    await queryInterface.addIndex('espacios', ['estado']);

    // =============================================
    // 8. materias_catalogo
    // =============================================
    await queryInterface.createTable('materias_catalogo', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      codigo: { type: Sequelize.STRING(50), allowNull: true },
      codigo_anthology: { type: Sequelize.STRING(50), allowNull: true },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      ciclo: { type: Sequelize.INTEGER, allowNull: true },
      creditos: { type: Sequelize.INTEGER, allowNull: true },
      horas_teoricas: { type: Sequelize.INTEGER, allowNull: true },
      horas_practicas: { type: Sequelize.INTEGER, allowNull: true },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      carrera_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'uploads_carreras', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      docente_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'docentes', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      docente_nombre: { type: Sequelize.STRING(200), allowNull: true },
    });
    await queryInterface.addIndex('materias_catalogo', ['carrera_id']);
    await queryInterface.addIndex('materias_catalogo', ['nombre']);

    // =============================================
    // 9. clases
    // =============================================
    await queryInterface.createTable('clases', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      carrera_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'uploads_carreras', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      carrera: { type: Sequelize.STRING, allowNull: true },
      materia: { type: Sequelize.STRING, allowNull: true },
      ciclo: { type: Sequelize.STRING, allowNull: true },
      paralelo: { type: Sequelize.STRING, defaultValue: 'A' },
      dia: { type: Sequelize.STRING, allowNull: true },
      hora_inicio: { type: Sequelize.STRING, allowNull: true },
      hora_fin: { type: Sequelize.STRING, allowNull: true },
      num_estudiantes: { type: Sequelize.INTEGER, defaultValue: 0 },
      docente: { type: Sequelize.STRING, allowNull: true },
      aula_asignada: { type: Sequelize.STRING, allowNull: true },
      aula_sugerida: { type: Sequelize.STRING, allowNull: true },
      nombre_archivo: { type: Sequelize.STRING, allowNull: true },
      periodo_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'periodos', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      docente_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'docentes', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      materia_catalogo_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'materias_catalogo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
    });
    await queryInterface.addIndex('clases', ['dia']);
    await queryInterface.addIndex('clases', ['hora_inicio']);
    await queryInterface.addIndex('clases', ['hora_fin']);
    await queryInterface.addIndex('clases', ['aula_asignada']);
    await queryInterface.addIndex('clases', ['docente_id']);
    await queryInterface.addIndex('clases', ['carrera_id']);
    await queryInterface.addIndex('clases', ['ciclo']);
    await queryInterface.addIndex('clases', ['paralelo']);
    await queryInterface.addIndex('clases', ['nombre_archivo']);
    await queryInterface.addIndex('clases', ['carrera_id', 'ciclo', 'paralelo']);

    // =============================================
    // 10. distribucion
    // =============================================
    await queryInterface.createTable('distribucion', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      clase_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'clases', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      aula_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'aulas', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      dia: { type: Sequelize.STRING(50), allowNull: false },
      hora_inicio: { type: Sequelize.TIME, allowNull: false },
      hora_fin: { type: Sequelize.TIME, allowNull: false },
      fecha_asignacion: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('distribucion', ['clase_id'], { name: 'idx_distribucion_clase' });
    await queryInterface.addIndex('distribucion', ['aula_id'], { name: 'idx_distribucion_aula' });
    await queryInterface.addIndex('distribucion', ['dia', 'hora_inicio', 'hora_fin'], { name: 'idx_distribucion_horario' });

    // =============================================
    // 11. reservas
    // =============================================
    await queryInterface.createTable('reservas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      aula_codigo: { type: Sequelize.STRING(50), allowNull: true },
      espacio_codigo: { type: Sequelize.STRING(50), allowNull: true },
      dia: { type: Sequelize.STRING(20), allowNull: false },
      fecha: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
      hora_inicio: { type: Sequelize.STRING(10), allowNull: false },
      hora_fin: { type: Sequelize.STRING(10), allowNull: false },
      motivo: { type: Sequelize.TEXT, allowNull: true },
      estado: {
        type: Sequelize.ENUM('activa', 'cancelada', 'pendiente_aprobacion', 'rechazada', 'finalizada'),
        defaultValue: 'activa',
      },
      usuario_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      estudiante_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'estudiantes', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      telefono: { type: Sequelize.STRING(20), allowNull: true },
      tipo_espacio: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'aula' },
      es_grupal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      num_personas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      rol_usuario: { type: Sequelize.STRING(50), allowNull: true },
      solicitante_nombre: { type: Sequelize.STRING(100), allowNull: true },
      solicitante_cedula: { type: Sequelize.STRING(20), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('reservas', ['aula_codigo']);
    await queryInterface.addIndex('reservas', ['dia']);
    await queryInterface.addIndex('reservas', ['fecha']);
    await queryInterface.addIndex('reservas', ['estado']);
    await queryInterface.addIndex('reservas', ['usuario_id']);
    await queryInterface.addIndex('reservas', ['estudiante_id']);

    // =============================================
    // 12. estudiantes_materias
    // =============================================
    await queryInterface.createTable('estudiantes_materias', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      estudiante_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'estudiantes', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      clase_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'clases', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addConstraint('estudiantes_materias', {
      fields: ['estudiante_id', 'clase_id'],
      type: 'unique',
      name: 'uq_estudiante_clase',
    });

    // =============================================
    // 13. planificaciones_subidas
    // =============================================
    await queryInterface.createTable('planificaciones_subidas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      carrera_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'uploads_carreras', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      usuario_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      nombre_archivo_original: { type: Sequelize.STRING, allowNull: false },
      nombre_archivo_guardado: { type: Sequelize.STRING, allowNull: false },
      ruta_archivo: { type: Sequelize.STRING, allowNull: false },
      total_clases: { type: Sequelize.INTEGER, defaultValue: 0 },
      estado: { type: Sequelize.STRING, defaultValue: 'procesado' },
      periodo_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'periodos', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // =============================================
    // 14. reportes_historial
    // =============================================
    await queryInterface.createTable('reportes_historial', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      tipo: { type: Sequelize.ENUM('GENERAL', 'CARRERA', 'AULA', 'ESPACIOS'), allowNull: false },
      filtros: { type: Sequelize.JSONB, allowNull: true, defaultValue: '{}' },
      metadatos: { type: Sequelize.JSONB, allowNull: true },
      ruta_archivo: { type: Sequelize.STRING(500), allowNull: true },
      formato: { type: Sequelize.STRING(10), defaultValue: 'PDF' },
      usuario_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // =============================================
    // 15. notificaciones
    // =============================================
    await queryInterface.createTable('notificaciones', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      titulo: { type: Sequelize.STRING, allowNull: false },
      mensaje: { type: Sequelize.TEXT, allowNull: false },
      tipo: { type: Sequelize.ENUM('CLASE', 'CARRERA', 'GLOBAL', 'SISTEMA', 'DIRECTA'), allowNull: false },
      prioridad: { type: Sequelize.ENUM('ALTA', 'MEDIA', 'BAJA'), defaultValue: 'MEDIA' },
      leida: { type: Sequelize.BOOLEAN, defaultValue: false },
      fecha_expiracion: { type: Sequelize.DATE, allowNull: true },
      remitente_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      destinatario_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      estudiante_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'estudiantes', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      carrera_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'uploads_carreras', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      clase_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'clases', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('notificaciones', ['leida']);
    await queryInterface.addIndex('notificaciones', ['tipo']);
    await queryInterface.addIndex('notificaciones', ['destinatario_id']);

    // =============================================
    // 16. incidencias
    // =============================================
    await queryInterface.createTable('incidencias', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      titulo: { type: Sequelize.STRING, allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      tipo: { type: Sequelize.STRING(50), defaultValue: 'OTRO' },
      prioridad: { type: Sequelize.ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA'), defaultValue: 'MEDIA' },
      estado: { type: Sequelize.ENUM('PENDIENTE', 'REVISANDO', 'RESUELTO', 'CERRADO'), defaultValue: 'PENDIENTE' },
      aula_codigo: { type: Sequelize.STRING, allowNull: false },
      foto_path: { type: Sequelize.STRING, allowNull: true },
      nota_director: { type: Sequelize.TEXT, allowNull: true },
      carrera_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'uploads_carreras', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      fecha_resolucion: { type: Sequelize.DATE, allowNull: true },
      respuesta_tecnica: { type: Sequelize.TEXT, allowNull: true },
      usuario_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('incidencias', ['estado']);
    await queryInterface.addIndex('incidencias', ['tipo']);
    await queryInterface.addIndex('incidencias', ['aula_codigo']);
    await queryInterface.addIndex('incidencias', ['carrera_id']);

    // =============================================
    // 17. historial_cargas
    // =============================================
    await queryInterface.createTable('historial_cargas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      tipo: { type: Sequelize.STRING, allowNull: false },
      archivo_nombre: { type: Sequelize.STRING, allowNull: true },
      registros_procesados: { type: Sequelize.INTEGER, defaultValue: 0 },
      estado: { type: Sequelize.STRING, defaultValue: 'pendiente' },
      fecha_carga: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      detalles: { type: Sequelize.TEXT, allowNull: true },
      usuario_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('historial_cargas');
    await queryInterface.dropTable('incidencias');
    await queryInterface.dropTable('notificaciones');
    await queryInterface.dropTable('reportes_historial');
    await queryInterface.dropTable('planificaciones_subidas');
    await queryInterface.dropTable('estudiantes_materias');
    await queryInterface.dropTable('reservas');
    await queryInterface.dropTable('distribucion');
    await queryInterface.dropTable('clases');
    await queryInterface.dropTable('materias_catalogo');
    await queryInterface.dropTable('espacios');
    await queryInterface.dropTable('aulas');
    await queryInterface.dropTable('estudiantes');
    await queryInterface.dropTable('docentes');
    await queryInterface.dropTable('periodos');
    await queryInterface.dropTable('uploads_carreras');
    await queryInterface.dropTable('usuarios');
  },
};
