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
const ReporteHistorial = require('./ReporteHistorial');
const Reserva = require('./Reserva');
const Notificacion = require('./Notificacion');
const Incidencia = require('./Incidencia');
const HistorialCarga = require('./HistorialCarga');
const EstudianteMateria = require('./EstudianteMateria');

const DirectorCarrera = require('./DirectorCarrera');

// Módulo de planificación colaborativa
const AuditoriaBloqueDisponibilidad = require('./AuditoriaBloqueDisponibilidad');
const PreviewDistribucion = require('./PreviewDistribucion');
const ConfiguracionPlanificacion = require('./ConfiguracionPlanificacion');
const FlujoPlanificacion = require('./FlujoPlanificacion');
const FlujoPlanificacionVersion = require('./FlujoPlanificacionVersion');
const BloqueDisponibilidad = require('./BloqueDisponibilidad');
const ConflictoDeteccion = require('./ConflictoDeteccion');
const ReasignacionExcepcional = require('./ReasignacionExcepcional');
const FechaLimiteExtendida = require('./FechaLimiteExtendida');

// ============================================
// RELACIONES ENTRE MODELOS
// ============================================

// Estudiante <-> Clase (Inscripciones)
Estudiante.belongsToMany(Clase, {
  through: EstudianteMateria,
  foreignKey: 'estudiante_id',
  otherKey: 'clase_id',
  as: 'materiasInscritas'
});
Clase.belongsToMany(Estudiante, {
  through: EstudianteMateria,
  foreignKey: 'clase_id',
  otherKey: 'estudiante_id',
  as: 'alumnosInscritos'
});

// EstudianteMateria -> Estudiante/Clase (Individual)
EstudianteMateria.belongsTo(Estudiante, { foreignKey: 'estudiante_id', as: 'estudiante' });
EstudianteMateria.belongsTo(Clase, { foreignKey: 'clase_id', as: 'clase' });

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

// ReporteHistorial <-> User
ReporteHistorial.belongsTo(User, { foreignKey: 'usuario_id', as: 'generadoPor' });
User.hasMany(ReporteHistorial, { foreignKey: 'usuario_id', as: 'reportes' });

// ============================================
// RELACIÓN USUARIOS-CARRERAS (Directores)
// ============================================

// User <-> Carrera (Legado 1-a-1 por string)
User.belongsTo(Carrera, { foreignKey: 'carrera_director', targetKey: 'carrera', as: 'carrera' });
Carrera.hasMany(User, { foreignKey: 'carrera_director', sourceKey: 'carrera', as: 'directores' });

// User <-> Carrera (Relación N-a-M para múltiples carreras por director)
User.belongsToMany(Carrera, {
  through: DirectorCarrera,
  foreignKey: 'usuario_id',
  otherKey: 'carrera_id',
  as: 'carrerasAsignadas'
});
Carrera.belongsToMany(User, {
  through: DirectorCarrera,
  foreignKey: 'carrera_id',
  otherKey: 'usuario_id',
  as: 'directoresAsignados'
});

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

// MateriaCatalogo <-> Docente
Docente.hasMany(MateriaCatalogo, { foreignKey: 'docente_id', as: 'materiasAsignadas' });
MateriaCatalogo.belongsTo(Docente, { foreignKey: 'docente_id', as: 'docenteAsignado' });

// MateriaCatalogo <-> Clase
MateriaCatalogo.hasMany(Clase, { foreignKey: 'materia_catalogo_id', as: 'clases' });
Clase.belongsTo(MateriaCatalogo, { foreignKey: 'materia_catalogo_id', as: 'materiaCatalogo' });

// Notificacion <-> Usuario (Remitente)
User.hasMany(Notificacion, { foreignKey: 'remitente_id', as: 'notificacionesEnviadas' });
Notificacion.belongsTo(User, { foreignKey: 'remitente_id', as: 'remitenteInfo' });

// ============================================
// INCIDENCIAS
// ============================================

User.hasMany(Incidencia, { foreignKey: 'usuario_id', as: 'incidencias' });
Incidencia.belongsTo(User, { foreignKey: 'usuario_id', as: 'reportadoPor' });
// aula_codigo es texto libre (puede ser un código de planificación no registrado en aulas)
// Se eliminó la FK para permitir cualquier código de aula

// Docente <-> User (Vincular perfil académico con cuenta de acceso)
Docente.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });
User.hasOne(Docente, { foreignKey: 'usuario_id', as: 'docente' });

// ============================================
// MÓDULO DE PLANIFICACIÓN COLABORATIVA
// ============================================

// ConfiguracionPlanificacion <-> Periodo / User (admin que la fijó)
Periodo.hasMany(ConfiguracionPlanificacion, { foreignKey: 'periodo_id', as: 'configuracionesPlanificacion' });
ConfiguracionPlanificacion.belongsTo(Periodo, { foreignKey: 'periodo_id', as: 'periodo' });
ConfiguracionPlanificacion.belongsTo(User, { foreignKey: 'asignado_por', as: 'asignadoPor' });

// FlujoPlanificacion <-> ConfiguracionPlanificacion (ventana global vigente)
ConfiguracionPlanificacion.hasMany(FlujoPlanificacion, { foreignKey: 'configuracion_planificacion_id', as: 'flujos' });
FlujoPlanificacion.belongsTo(ConfiguracionPlanificacion, { foreignKey: 'configuracion_planificacion_id', as: 'configuracion' });

// FlujoPlanificacion <-> Carrera / Periodo
Carrera.hasMany(FlujoPlanificacion, { foreignKey: 'carrera_id', as: 'flujosPlanificacion' });
FlujoPlanificacion.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
Periodo.hasMany(FlujoPlanificacion, { foreignKey: 'periodo_id', as: 'flujosPlanificacion' });
FlujoPlanificacion.belongsTo(Periodo, { foreignKey: 'periodo_id', as: 'periodo' });

// FlujoPlanificacionVersion <-> FlujoPlanificacion / User
FlujoPlanificacion.hasMany(FlujoPlanificacionVersion, { foreignKey: 'flujo_planificacion_id', as: 'versiones' });
FlujoPlanificacionVersion.belongsTo(FlujoPlanificacion, { foreignKey: 'flujo_planificacion_id', as: 'flujoPlanificacion' });
FlujoPlanificacionVersion.belongsTo(User, { foreignKey: 'creado_por', as: 'creador' });

// BloqueDisponibilidad <-> Clase / Aula / FlujoPlanificacion
Clase.hasOne(BloqueDisponibilidad, { foreignKey: 'clase_id', as: 'bloqueDisponibilidad' });
BloqueDisponibilidad.belongsTo(Clase, { foreignKey: 'clase_id', as: 'clase' });
Aula.hasMany(BloqueDisponibilidad, { foreignKey: 'aula_id', as: 'bloquesDisponibilidad' });
BloqueDisponibilidad.belongsTo(Aula, { foreignKey: 'aula_id', as: 'aula' });
FlujoPlanificacion.hasMany(BloqueDisponibilidad, { foreignKey: 'flujo_planificacion_id', as: 'bloques' });
BloqueDisponibilidad.belongsTo(FlujoPlanificacion, { foreignKey: 'flujo_planificacion_id', as: 'flujoPlanificacion' });

// PreviewDistribucion <-> Carrera / Periodo / User
Carrera.hasMany(PreviewDistribucion, { foreignKey: 'carrera_id', as: 'previewsDistribucion' });
PreviewDistribucion.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
PreviewDistribucion.belongsTo(Periodo, { foreignKey: 'periodo_id', as: 'periodo' });
PreviewDistribucion.belongsTo(User, { foreignKey: 'creado_por', as: 'creador' });
PreviewDistribucion.belongsTo(User, { foreignKey: 'aplicado_por', as: 'aplicador' });

// AuditoriaBloqueDisponibilidad <-> BloqueDisponibilidad / User / Flujo / Versión
BloqueDisponibilidad.hasMany(AuditoriaBloqueDisponibilidad, { foreignKey: 'bloque_id', as: 'auditoria' });
AuditoriaBloqueDisponibilidad.belongsTo(BloqueDisponibilidad, { foreignKey: 'bloque_id', as: 'bloque' });
AuditoriaBloqueDisponibilidad.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });
AuditoriaBloqueDisponibilidad.belongsTo(FlujoPlanificacion, { foreignKey: 'flujo_planificacion_id', as: 'flujoPlanificacion' });
AuditoriaBloqueDisponibilidad.belongsTo(FlujoPlanificacionVersion, { foreignKey: 'version_planificacion_id', as: 'version' });

// ConflictoDeteccion <-> BloqueDisponibilidad / Carrera
BloqueDisponibilidad.hasMany(ConflictoDeteccion, { foreignKey: 'bloque_id', as: 'conflictos' });
ConflictoDeteccion.belongsTo(BloqueDisponibilidad, { foreignKey: 'bloque_id', as: 'bloque' });
ConflictoDeteccion.belongsTo(Carrera, { foreignKey: 'carrera_solicitante_id', as: 'carreraSolicitante' });

// ReasignacionExcepcional <-> BloqueDisponibilidad / User (admin)
BloqueDisponibilidad.hasMany(ReasignacionExcepcional, { foreignKey: 'bloque_id', as: 'reasignacionesExcepcionales' });
ReasignacionExcepcional.belongsTo(BloqueDisponibilidad, { foreignKey: 'bloque_id', as: 'bloque' });
ReasignacionExcepcional.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

// FechaLimiteExtendida <-> Carrera / User (admin)
Carrera.hasMany(FechaLimiteExtendida, { foreignKey: 'carrera_id', as: 'fechasLimiteExtendidas' });
FechaLimiteExtendida.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
FechaLimiteExtendida.belongsTo(User, { foreignKey: 'autorizado_por', as: 'autorizadoPorUsuario' });
Periodo.hasMany(FechaLimiteExtendida, { foreignKey: 'periodo_id', as: 'fechasLimiteExtendidas' });
FechaLimiteExtendida.belongsTo(Periodo, { foreignKey: 'periodo_id', as: 'periodo' });

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
  Espacio,
  ReporteHistorial,
  Reserva,
  Notificacion,
  Incidencia,
  HistorialCarga,
  EstudianteMateria,
  DirectorCarrera,
  AuditoriaBloqueDisponibilidad,
  PreviewDistribucion,
  ConfiguracionPlanificacion,
  FlujoPlanificacion,
  FlujoPlanificacionVersion,
  BloqueDisponibilidad,
  ConflictoDeteccion,
  ReasignacionExcepcional,
  FechaLimiteExtendida
};
