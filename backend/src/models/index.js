const { sequelize } = require('../config/database');
const User = require('./User');
const Aula = require('./Aula');
const Estudiante = require('./Estudiante');
const Carrera = require('./Carrera');
const Clase = require('./Clase');
const Distribucion = require('./Distribucion');
const PlanificacionSubida = require('./PlanificacionSubida');
const Periodo = require('./Periodo');
const Docente = require('./Docente');
const MateriaCatalogo = require('./MateriaCatalogo');
const Espacio = require('./Espacio');

// ============================================
// RELACIONES ENTRE MODELOS
// ============================================

// Carrera <-> Clase
Carrera.hasMany(Clase, { foreignKey: 'carrera_id', as: 'clases' });
Clase.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carreraInfo' });

// Aula <-> Clase (asignación)
// NOTA: aula_asignada es STRING (código del aula)
Aula.hasMany(Clase, { foreignKey: 'aula_asignada', sourceKey: 'codigo', as: 'clasesAsignadas' });
Clase.belongsTo(Aula, { foreignKey: 'aula_asignada', targetKey: 'codigo', as: 'aula' });

// Clase <-> Distribucion
Clase.hasMany(Distribucion, { foreignKey: 'clase_id', as: 'distribuciones' });
Distribucion.belongsTo(Clase, { foreignKey: 'clase_id', as: 'clase' });

// Aula <-> Distribucion
Aula.hasMany(Distribucion, { foreignKey: 'aula_id', as: 'distribuciones' });
Distribucion.belongsTo(Aula, { foreignKey: 'aula_id', as: 'aula' });

// PlanificacionSubida <-> Carrera
PlanificacionSubida.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
Carrera.hasMany(PlanificacionSubida, { foreignKey: 'carrera_id', as: 'planificaciones' });

// PlanificacionSubida <-> Usuario
PlanificacionSubida.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });
User.hasMany(PlanificacionSubida, { foreignKey: 'usuario_id', as: 'planificaciones' });

// ============================================
// RELACIÓN USUARIOS-CARRERAS (Directores)
// ============================================

// User <-> Carrera
// NOTA: Usamos carrera_director (string) para vincular con el nombre de la carrera
User.belongsTo(Carrera, { foreignKey: 'carrera_director', targetKey: 'carrera', as: 'Carrera' });
Carrera.hasMany(User, { foreignKey: 'carrera_director', sourceKey: 'carrera', as: 'directores' });

// ============================================
// NUEVAS RELACIONES (tablas catálogo)
// ============================================

// Periodo <-> Clase
Periodo.hasMany(Clase, { foreignKey: 'periodo_id', as: 'clases' });
Clase.belongsTo(Periodo, { foreignKey: 'periodo_id', as: 'periodo' });

// Periodo <-> PlanificacionSubida
Periodo.hasMany(PlanificacionSubida, { foreignKey: 'periodo_id', as: 'planificaciones' });
PlanificacionSubida.belongsTo(Periodo, { foreignKey: 'periodo_id', as: 'periodo' });

// Docente <-> Carrera
Carrera.hasMany(Docente, { foreignKey: 'carrera_id', as: 'docentes' });
Docente.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });

// Docente <-> Clase
Docente.hasMany(Clase, { foreignKey: 'docente_id', as: 'clases' });
Clase.belongsTo(Docente, { foreignKey: 'docente_id', as: 'docenteInfo' });

// MateriaCatalogo <-> Carrera
Carrera.hasMany(MateriaCatalogo, { foreignKey: 'carrera_id', as: 'materias' });
MateriaCatalogo.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });

// MateriaCatalogo <-> Clase
MateriaCatalogo.hasMany(Clase, { foreignKey: 'materia_catalogo_id', as: 'clases' });
Clase.belongsTo(MateriaCatalogo, { foreignKey: 'materia_catalogo_id', as: 'materiaCatalogo' });

module.exports = {
  sequelize,
  User,
  Aula,
  Estudiante,
  Carrera,
  Clase,
  Distribucion,
  PlanificacionSubida,
  Periodo,
  Docente,
  MateriaCatalogo,
  Espacio
};
