const { sequelize } = require('../config/database');
const User = require('./User');
const Aula = require('./Aula');
const Estudiante = require('./Estudiante');
const Carrera = require('./Carrera');
const Clase = require('./Clase');
const Distribucion = require('./Distribucion');
const PlanificacionSubida = require('./PlanificacionSubida');

// ============================================
// RELACIONES ENTRE MODELOS
// ============================================

// Carrera <-> Clase
Carrera.hasMany(Clase, { foreignKey: 'carrera_id', as: 'clases' });
Clase.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carreraInfo' });

// Aula <-> Clase (asignación)
// NOTA: aula_asignada es STRING (código), no se puede usar belongsTo directo
// Aula.hasMany(Clase, { foreignKey: 'aula_asignada', sourceKey: 'codigo', as: 'clasesAsignadas' });
// Clase.belongsTo(Aula, { foreignKey: 'aula_asignada', targetKey: 'codigo', as: 'aula' });

// Clase <-> Distribucion
Clase.hasMany(Distribucion, { foreignKey: 'clase_id', as: 'distribuciones' });
Distribucion.belongsTo(Clase, { foreignKey: 'clase_id', as: 'clase' });

// Aula <-> Distribucion
Aula.hasMany(Distribucion, { foreignKey: 'aula_id', as: 'distribuciones' });
Distribucion.belongsTo(Aula, { foreignKey: 'aula_id', as: 'aula' });

// Usuario <-> Carrera (directores)
User.belongsTo(Carrera, { foreignKey: 'carrera_director', as: 'Carrera' });
Carrera.hasMany(User, { foreignKey: 'carrera_director', as: 'directores' });

// PlanificacionSubida <-> Carrera
PlanificacionSubida.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
Carrera.hasMany(PlanificacionSubida, { foreignKey: 'carrera_id', as: 'planificaciones' });

// PlanificacionSubida <-> Usuario
PlanificacionSubida.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });
User.hasMany(PlanificacionSubida, { foreignKey: 'usuario_id', as: 'planificaciones' });

module.exports = {
  sequelize,
  User,
  Aula,
  Estudiante,
  Carrera,
  Clase,
  Distribucion,
  PlanificacionSubida
};
