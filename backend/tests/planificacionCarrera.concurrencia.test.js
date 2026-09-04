// ============================================================
// Test de concurrencia REAL (Postgres real, sin mocks).
//
// Los mocks de planificacionCarrera.service.test.js no pueden probar
// esto: la garantía anti-carrera depende de pg_advisory_xact_lock
// bloqueando una segunda transacción de verdad mientras la primera
// sigue abierta. Eso solo existe con una BD real.
//
// Usa una base de datos de test separada (gestion_aulas_planificacion_test)
// en el mismo Postgres de docker-compose (puerto host 5433). Si Postgres
// no está disponible, el suite se omite con un warning en vez de fallar
// duro — para no romper CI/máquinas sin Docker corriendo.
// ============================================================

// Los env vars se fijan ANTES de requerir cualquier módulo que toque
// config/database.js, para que la conexión real apunte a la BD de test
// (no a gestion_aulas de desarrollo) y al puerto real de docker-compose
// (5433 en host, no el 5432 que jest-setup.js pone como fallback global).
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '5433';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_NAME = 'gestion_aulas_planificacion_test';

const { setupTestDB } = require('./setup');

let models;
let service;
let dbLista = false;

let carreraIng;
let carreraPsico;
let aula;
let claseIng;
let clasePsico;
let userDirIng;
let userDirPsico;

beforeAll(async () => {
  try {
    // setupTestDB() usa su propia conexión solo para el CREATE DATABASE
    // (si no existe) — se descarta apenas termina. Todo lo demás usa el
    // sequelize real que exporta config/database (el mismo que usan los
    // modelos y el servicio en producción), para que este test verifique
    // exactamente el mismo camino que corre en runtime.
    const setupSequelize = await setupTestDB();
    await setupSequelize.close();

    models = require('../src/models');
    await models.sequelize.sync({ force: true });
    service = require('../src/services/planificacionCarrera.service');

    const { Carrera, Aula, Clase, User, FlujoPlanificacion, BloqueDisponibilidad } = models;

    carreraIng = await Carrera.create({ carrera: 'Ingenieria en Sistemas (concurrencia)' });
    carreraPsico = await Carrera.create({ carrera: 'Psicologia (concurrencia)' });

    aula = await Aula.create({ codigo: 'AULA-CONC-1', nombre: 'Aula Concurrencia', capacidad: 40, tipo: 'AULA' });

    claseIng = await Clase.create({ carrera_id: carreraIng.id, carrera: carreraIng.carrera, materia: 'Calculo I', num_estudiantes: 30 });
    clasePsico = await Clase.create({ carrera_id: carreraPsico.id, carrera: carreraPsico.carrera, materia: 'Neuropsicologia', num_estudiantes: 25 });

    userDirIng = await User.create({ nombre: 'Director', apellido: 'Ingenieria', email: 'dir.ing.conc@uide.edu.ec', password: 'clave123', rol: 'director', estado: 'activo' });
    userDirPsico = await User.create({ nombre: 'Directora', apellido: 'Psicologia', email: 'dir.psico.conc@uide.edu.ec', password: 'clave123', rol: 'director', estado: 'activo' });

    const flujoIng = await FlujoPlanificacion.create({ carrera_id: carreraIng.id, estado: 'ENVIADA' });
    const flujoPsico = await FlujoPlanificacion.create({ carrera_id: carreraPsico.id, estado: 'ENVIADA' });

    // Bloque en conflicto: mismo aula, mismo día, horario solapado (08-10 vs 09-11)
    await BloqueDisponibilidad.create({
      clase_id: claseIng.id, aula_id: aula.id, dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'EN_REVISION', flujo_planificacion_id: flujoIng.id,
    });
    await BloqueDisponibilidad.create({
      clase_id: clasePsico.id, aula_id: aula.id, dia: 'Lunes', hora_inicio: '09:00', hora_fin: '11:00',
      estado: 'EN_REVISION', flujo_planificacion_id: flujoPsico.id,
    });

    // ------------------------------------------------------------
    // Fixtures INDEPENDIENTES para el caso "sin conflicto": carreras,
    // flujos y aula propios, sin cruce con el escenario de arriba.
    // Necesario porque confirmarPlanificacion() confirma TODOS los
    // bloques EN_REVISION del flujo en una sola transacción — si
    // compartiera flujo con el escenario en conflicto, el rollback
    // del perdedor se llevaría también su bloque "sin conflicto".
    // ------------------------------------------------------------
    const carreraIngB = await Carrera.create({ carrera: 'Arquitectura (concurrencia sin conflicto)' });
    const carreraPsicoB = await Carrera.create({ carrera: 'Derecho (concurrencia sin conflicto)' });
    const aulaSinConflicto = await Aula.create({ codigo: 'AULA-CONC-2', nombre: 'Aula Concurrencia 2', capacidad: 40, tipo: 'AULA' });
    const claseIngB = await Clase.create({ carrera_id: carreraIngB.id, carrera: carreraIngB.carrera, materia: 'Fisica I', num_estudiantes: 20 });
    const clasePsicoB = await Clase.create({ carrera_id: carreraPsicoB.id, carrera: carreraPsicoB.carrera, materia: 'Etica', num_estudiantes: 20 });
    const userDirIngB = await User.create({ nombre: 'Director', apellido: 'Arquitectura', email: 'dir.arq.conc@uide.edu.ec', password: 'clave123', rol: 'director', estado: 'activo' });
    const userDirPsicoB = await User.create({ nombre: 'Director', apellido: 'Derecho', email: 'dir.der.conc@uide.edu.ec', password: 'clave123', rol: 'director', estado: 'activo' });
    const flujoIngB = await FlujoPlanificacion.create({ carrera_id: carreraIngB.id, estado: 'ENVIADA' });
    const flujoPsicoB = await FlujoPlanificacion.create({ carrera_id: carreraPsicoB.id, estado: 'ENVIADA' });

    await BloqueDisponibilidad.create({
      clase_id: claseIngB.id, aula_id: aulaSinConflicto.id, dia: 'Martes', hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'EN_REVISION', flujo_planificacion_id: flujoIngB.id,
    });
    await BloqueDisponibilidad.create({
      clase_id: clasePsicoB.id, aula_id: aulaSinConflicto.id, dia: 'Miercoles', hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'EN_REVISION', flujo_planificacion_id: flujoPsicoB.id,
    });

    global.__fixturesSinConflicto = { carreraIngB, carreraPsicoB, userDirIngB, userDirPsicoB, aulaSinConflicto };

    // ------------------------------------------------------------
    // Fixtures INDEPENDIENTES para el escenario cruzado Fase 3: un
    // director confirmando (confirmarPlanificacion) contra el admin
    // aplicando fill-gaps (aplicarDistribucionFillGaps) sobre el MISMO
    // aula/horario, en paralelo. Prueba que ambos caminos comparten el
    // mismo advisory lock y no pueden pisarse entre sí.
    // ------------------------------------------------------------
    const carreraDirector = await Carrera.create({ carrera: 'Comunicacion (concurrencia cruzada)' });
    const carreraHuerfana = await Carrera.create({ carrera: 'Sin director asignado (huecos institucionales)' });
    const aulaCruzada = await Aula.create({ codigo: 'AULA-CONC-3', nombre: 'Aula Concurrencia Cruzada', capacidad: 40, tipo: 'AULA' });
    const claseDirector = await Clase.create({ carrera_id: carreraDirector.id, carrera: carreraDirector.carrera, materia: 'Semiotica', num_estudiantes: 20 });
    const claseHuerfana = await Clase.create({ carrera_id: carreraHuerfana.id, carrera: carreraHuerfana.carrera, materia: 'Hueco institucional', num_estudiantes: 20 });
    const userDirComunicacion = await User.create({ nombre: 'Director', apellido: 'Comunicacion', email: 'dir.comu.conc@uide.edu.ec', password: 'clave123', rol: 'director', estado: 'activo' });
    const userAdmin = await User.create({ nombre: 'Admin', apellido: 'Sistema', email: 'admin.conc@uide.edu.ec', password: 'clave123', rol: 'admin', estado: 'activo' });
    const flujoDirector = await FlujoPlanificacion.create({ carrera_id: carreraDirector.id, estado: 'ENVIADA' });

    // El director ya tiene su bloque EN_REVISION listo para confirmar.
    await BloqueDisponibilidad.create({
      clase_id: claseDirector.id, aula_id: aulaCruzada.id, dia: 'Jueves', hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'EN_REVISION', flujo_planificacion_id: flujoDirector.id,
    });
    // La clase "huérfana" NO tiene bloque todavía (LIBRE por ausencia) —
    // es exactamente el tipo de hueco que fill-gaps calcula y aplica.

    global.__fixturesCruzadas = { carreraDirector, userDirComunicacion, userAdmin, claseHuerfana, aulaCruzada };

    dbLista = true;
  } catch (error) {
    console.warn(
      `⚠️  Test de concurrencia real OMITIDO — no se pudo conectar/preparar Postgres de test (${error.message}). ` +
      'Requiere Docker corriendo con gestion_aulas_db (puerto 5433).'
    );
    dbLista = false;
  }
}, 30000);

afterAll(async () => {
  if (models?.sequelize) {
    await models.sequelize.close();
  }
});

describe('confirmarPlanificacion — concurrencia real (Postgres, pg_advisory_xact_lock)', () => {
  test('dos carreras confirmando el MISMO aula/horario en paralelo: solo una gana, la otra es rechazada y no queda a medias', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { FlujoPlanificacion, BloqueDisponibilidad } = models;

    const resultados = await Promise.allSettled([
      service.confirmarPlanificacion({ carreraId: carreraIng.id, usuarioId: userDirIng.id }),
      service.confirmarPlanificacion({ carreraId: carreraPsico.id, usuarioId: userDirPsico.id }),
    ]);

    const cumplidos = resultados.filter((r) => r.status === 'fulfilled');
    const rechazados = resultados.filter((r) => r.status === 'rejected');

    // Exactamente una transacción gana el advisory lock y confirma primero;
    // la otra, al re-chequear DENTRO del lock, encuentra el bloque recién
    // confirmado y aborta — nunca ambas confirman, nunca ambas fallan.
    expect(cumplidos).toHaveLength(1);
    expect(rechazados).toHaveLength(1);
    expect(rechazados[0].reason.message).toMatch(/conflicto de último momento/i);

    const flujosFinal = await FlujoPlanificacion.findAll({
      where: { carrera_id: [carreraIng.id, carreraPsico.id] },
    });
    const confirmadas = flujosFinal.filter((f) => f.estado === 'CONFIRMADA');
    const enviadas = flujosFinal.filter((f) => f.estado === 'ENVIADA');
    expect(confirmadas).toHaveLength(1);
    expect(enviadas).toHaveLength(1); // el perdedor NO quedó a medias, sigue ENVIADA intacta

    const bloquesFinal = await BloqueDisponibilidad.findAll({ where: { aula_id: aula.id, dia: 'Lunes' } });
    const bloquesConfirmados = bloquesFinal.filter((b) => b.estado === 'CONFIRMADO');
    const bloquesEnRevision = bloquesFinal.filter((b) => b.estado === 'EN_REVISION');
    expect(bloquesConfirmados).toHaveLength(1);
    expect(bloquesEnRevision).toHaveLength(1); // el perdedor no se corrompió: sigue EN_REVISION, no LIBRE ni CONFIRMADO
  }, 20000);

  test('dos carreras confirmando aulas/días DISTINTOS en paralelo: no hay conflicto real, ambas ganan', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { carreraIngB, carreraPsicoB, userDirIngB, userDirPsicoB, aulaSinConflicto } = global.__fixturesSinConflicto;
    const { FlujoPlanificacion, BloqueDisponibilidad } = models;

    const resultados = await Promise.allSettled([
      service.confirmarPlanificacion({ carreraId: carreraIngB.id, usuarioId: userDirIngB.id }),
      service.confirmarPlanificacion({ carreraId: carreraPsicoB.id, usuarioId: userDirPsicoB.id }),
    ]);

    expect(resultados.every((r) => r.status === 'fulfilled')).toBe(true);

    const flujosFinal = await FlujoPlanificacion.findAll({
      where: { carrera_id: [carreraIngB.id, carreraPsicoB.id] },
    });
    expect(flujosFinal.every((f) => f.estado === 'CONFIRMADA')).toBe(true);

    const bloques = await BloqueDisponibilidad.findAll({ where: { aula_id: aulaSinConflicto.id } });
    expect(bloques).toHaveLength(2);
    expect(bloques.every((b) => b.estado === 'CONFIRMADO')).toBe(true);
  }, 20000);

  test('Fase 3 — director confirmando vs. admin aplicando fill-gaps sobre el MISMO aula/horario en paralelo: comparten el mismo advisory lock, solo uno gana', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { carreraDirector, userDirComunicacion, userAdmin, claseHuerfana, aulaCruzada } = global.__fixturesCruzadas;
    const { BloqueDisponibilidad } = models;

    const resultados = await Promise.allSettled([
      service.confirmarPlanificacion({ carreraId: carreraDirector.id, usuarioId: userDirComunicacion.id }),
      service.aplicarDistribucionFillGaps({
        propuestas: [{ claseId: claseHuerfana.id, aulaId: aulaCruzada.id, dia: 'Jueves', horaInicio: '09:00', horaFin: '11:00' }], // solapa 08-10
        adminId: userAdmin.id,
      }),
    ]);

    // aplicarDistribucionFillGaps NUNCA lanza (omite en vez de abortar),
    // pero confirmarPlanificacion SÍ puede rechazar si pierde la carrera
    // por el lock — no asumimos fulfilled/rejected de ninguna de las dos,
    // comparamos directamente el resultado real en la base de datos.
    const bloques = await BloqueDisponibilidad.findAll({ where: { aula_id: aulaCruzada.id, dia: 'Jueves' } });
    const confirmados = bloques.filter((b) => b.estado === 'CONFIRMADO');

    // Exactamente un bloque queda CONFIRMADO en ese aula/día — o ganó el
    // director (su bloque EN_REVISION propio pasó a CONFIRMADO y la
    // propuesta del admin quedó omitida por solapamiento), o ganó el
    // admin (confirmó primero el hueco y el director, al re-chequear
    // dentro del lock, recibió "conflicto de último momento" y su
    // transacción completa hizo rollback). Nunca ambos, nunca ninguno.
    expect(confirmados).toHaveLength(1);
  }, 20000);
});

// ============================================================
// B1 y B3 contra Postgres real.
//
// Ambos solo se pueden verificar de verdad acá: B1 porque depende del
// estado real de otros flujos en la tabla, y B3 porque es una garantía
// del motor de índices de Postgres, no de código JavaScript.
// ============================================================

describe('B1 — EN_REVISION ajeno bloquea el reclamo (Postgres real)', () => {
  test('otra carrera no puede enviar sobre un aula/horario que un director tiene EN_REVISION', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { Carrera, Aula, Clase, FlujoPlanificacion, BloqueDisponibilidad } = models;

    const carreraA = await Carrera.create({ carrera: 'Medicina (B1)' });
    const carreraB = await Carrera.create({ carrera: 'Odontologia (B1)' });
    const aulaB1 = await Aula.create({ codigo: 'AULA-B1', nombre: 'Aula B1', capacidad: 40, tipo: 'AULA' });
    const claseA = await Clase.create({ carrera_id: carreraA.id, carrera: carreraA.carrera, materia: 'Anatomia', num_estudiantes: 30 });
    const claseB = await Clase.create({ carrera_id: carreraB.id, carrera: carreraB.carrera, materia: 'Ortodoncia', num_estudiantes: 30 });

    // Carrera A ya reservó el espacio (EN_REVISION, todavía sin confirmar).
    const flujoA = await FlujoPlanificacion.create({ carrera_id: carreraA.id, estado: 'ENVIADA' });
    await BloqueDisponibilidad.create({
      clase_id: claseA.id, aula_id: aulaB1.id, dia: 'Viernes',
      hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'EN_REVISION', flujo_planificacion_id: flujoA.id,
    });

    // Carrera B intenta el mismo espacio.
    const { flujo, conflictos } = await service.enviarPlanificacion({
      carreraId: carreraB.id,
      usuarioId: userDirPsico.id,
      bloques: [{ claseId: claseB.id, aulaId: aulaB1.id, dia: 'Viernes', horaInicio: '09:00', horaFin: '11:00' }],
    });

    expect(conflictos).toHaveLength(1);
    expect(flujo.estado).not.toBe('ENVIADA');

    const bloqueB = await BloqueDisponibilidad.findOne({ where: { clase_id: claseB.id } });
    expect(bloqueB.estado).toBe('LIBRE'); // no pisó la reserva de A
  }, 20000);
});

describe('B3 — unicidad de flujo con periodo_id NULL (Postgres real)', () => {
  test('no se pueden crear dos flujos para la misma carrera sin período', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { Carrera, FlujoPlanificacion } = models;
    const carrera = await Carrera.create({ carrera: 'Nutricion (B3)' });

    await FlujoPlanificacion.create({ carrera_id: carrera.id, periodo_id: null, estado: 'BORRADOR' });

    // Antes de la migración 20260823000003 esto pasaba sin error: en
    // Postgres dos NULL no son iguales dentro de un índice único, así que
    // el índice combinado (carrera_id, periodo_id) no cubría este caso.
    await expect(
      FlujoPlanificacion.create({ carrera_id: carrera.id, periodo_id: null, estado: 'BORRADOR' })
    ).rejects.toThrow();

    const flujos = await FlujoPlanificacion.findAll({ where: { carrera_id: carrera.id } });
    expect(flujos).toHaveLength(1);
  }, 20000);
});

// ============================================================
// I1 — Aislamiento por período contra Postgres real.
//
// El bug solo se ve con datos reales de dos períodos: un aula confirmada
// en el período anterior hacía que el mismo horario quedara bloqueado
// para siempre en el período siguiente.
// ============================================================

describe('I1 — un aula confirmada en otro período no bloquea el actual (Postgres real)', () => {
  test('misma aula, mismo día y hora, períodos distintos: el envío pasa sin conflicto', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { Carrera, Aula, Clase, Periodo, FlujoPlanificacion, BloqueDisponibilidad } = models;

    const periodoViejo = await Periodo.create({ nombre: '2025-1 (I1)', activo: false });
    const periodoNuevo = await Periodo.create({ nombre: '2026-1 (I1)', activo: true });

    const carrera = await Carrera.create({ carrera: 'Veterinaria (I1)' });
    const aulaI1 = await Aula.create({ codigo: 'AULA-I1', nombre: 'Aula I1', capacidad: 40, tipo: 'AULA' });

    // Clase del período viejo, ya CONFIRMADA en ese aula/horario.
    const claseVieja = await Clase.create({
      carrera_id: carrera.id, carrera: carrera.carrera, materia: 'Zoologia 2025',
      num_estudiantes: 30, periodo_id: periodoViejo.id,
    });
    const flujoViejo = await FlujoPlanificacion.create({
      carrera_id: carrera.id, periodo_id: periodoViejo.id, estado: 'CONFIRMADA',
    });
    await BloqueDisponibilidad.create({
      clase_id: claseVieja.id, aula_id: aulaI1.id, dia: 'Martes',
      hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'CONFIRMADO', flujo_planificacion_id: flujoViejo.id,
      aula_id_confirmada: aulaI1.id, dia_confirmado: 'Martes',
      hora_inicio_confirmada: '08:00', hora_fin_confirmada: '10:00',
    });

    // Misma aula y horario, pero en el período nuevo.
    const claseNueva = await Clase.create({
      carrera_id: carrera.id, carrera: carrera.carrera, materia: 'Zoologia 2026',
      num_estudiantes: 30, periodo_id: periodoNuevo.id,
    });

    const { flujo, conflictos } = await service.enviarPlanificacion({
      carreraId: carrera.id,
      periodoId: periodoNuevo.id,
      usuarioId: userDirIng.id,
      bloques: [{ claseId: claseNueva.id, aulaId: aulaI1.id, dia: 'Martes', horaInicio: '08:00', horaFin: '10:00' }],
    });

    expect(conflictos).toHaveLength(0);
    expect(flujo.estado).toBe('ENVIADA');

    const bloqueNuevo = await BloqueDisponibilidad.findOne({ where: { clase_id: claseNueva.id } });
    expect(bloqueNuevo.estado).toBe('EN_REVISION');
  }, 20000);

  test('dentro del MISMO período sí bloquea', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { Carrera, Aula, Clase, Periodo, FlujoPlanificacion, BloqueDisponibilidad } = models;

    const periodo = await Periodo.create({ nombre: '2026-2 (I1)', activo: false });
    const carreraA = await Carrera.create({ carrera: 'Biologia (I1)' });
    const carreraB = await Carrera.create({ carrera: 'Quimica (I1)' });
    const aulaI1b = await Aula.create({ codigo: 'AULA-I1B', nombre: 'Aula I1B', capacidad: 40, tipo: 'AULA' });

    const claseA = await Clase.create({
      carrera_id: carreraA.id, carrera: carreraA.carrera, materia: 'Botanica',
      num_estudiantes: 30, periodo_id: periodo.id,
    });
    const flujoA = await FlujoPlanificacion.create({
      carrera_id: carreraA.id, periodo_id: periodo.id, estado: 'CONFIRMADA',
    });
    await BloqueDisponibilidad.create({
      clase_id: claseA.id, aula_id: aulaI1b.id, dia: 'Martes',
      hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'CONFIRMADO', flujo_planificacion_id: flujoA.id,
    });

    const claseB = await Clase.create({
      carrera_id: carreraB.id, carrera: carreraB.carrera, materia: 'Organica',
      num_estudiantes: 30, periodo_id: periodo.id,
    });

    const { conflictos } = await service.enviarPlanificacion({
      carreraId: carreraB.id,
      periodoId: periodo.id,
      usuarioId: userDirPsico.id,
      bloques: [{ claseId: claseB.id, aulaId: aulaI1b.id, dia: 'Martes', horaInicio: '09:00', horaFin: '11:00' }],
    });

    expect(conflictos).toHaveLength(1);
  }, 20000);
});

// ============================================================
// I5 — Auditoría de bloques contra Postgres real.
//
// Lo que importa verificar acá y no con mocks: que el rastro se escriba
// en la MISMA transacción que el cambio (si el cambio se revierte, el
// rastro también) y que el ciclo completo envío -> confirmación quede
// reconstruible desde la tabla.
// ============================================================

describe('I5 — rastro de auditoría de punta a punta (Postgres real)', () => {
  test('envío y confirmación dejan la cadena completa con autor y versión', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { Carrera, Aula, Clase, Periodo, BloqueDisponibilidad, AuditoriaBloqueDisponibilidad } = models;

    const periodo = await Periodo.create({ nombre: '2026-3 (I5)', activo: false });
    const carrera = await Carrera.create({ carrera: 'Enfermeria (I5)' });
    const aulaI5 = await Aula.create({ codigo: 'AULA-I5', nombre: 'Aula I5', capacidad: 40, tipo: 'AULA' });
    const clase = await Clase.create({
      carrera_id: carrera.id, carrera: carrera.carrera, materia: 'Farmacologia',
      num_estudiantes: 30, periodo_id: periodo.id,
    });

    await service.enviarPlanificacion({
      carreraId: carrera.id,
      periodoId: periodo.id,
      usuarioId: userDirIng.id,
      bloques: [{ claseId: clase.id, aulaId: aulaI5.id, dia: 'Miercoles', horaInicio: '08:00', horaFin: '10:00' }],
    });

    await service.confirmarPlanificacion({
      carreraId: carrera.id,
      periodoId: periodo.id,
      usuarioId: userDirIng.id,
    });

    const bloque = await BloqueDisponibilidad.findOne({ where: { clase_id: clase.id } });
    expect(bloque.estado).toBe('CONFIRMADO');

    const rastro = await AuditoriaBloqueDisponibilidad.findAll({
      where: { bloque_id: bloque.id },
      order: [['created_at', 'ASC'], ['id', 'ASC']],
    });

    expect(rastro).toHaveLength(2);

    const [envio, confirmacion] = rastro;
    expect(envio.origen).toBe('ENVIO');
    expect(envio.estado_nuevo).toBe('EN_REVISION');
    expect(envio.usuario_id).toBe(userDirIng.id);

    expect(confirmacion.origen).toBe('CONFIRMACION');
    expect(confirmacion.estado_anterior).toBe('EN_REVISION');
    expect(confirmacion.estado_nuevo).toBe('CONFIRMADO');
    expect(confirmacion.usuario_id).toBe(userDirIng.id);
    // La referencia a la versión que pide la regla 7.
    expect(confirmacion.version_planificacion_id).not.toBeNull();
    // El snapshot de la asignación viaja en el rastro.
    expect(confirmacion.asignacion_nueva).toMatchObject({ aula_id: aulaI5.id, dia: 'Miercoles' });
  }, 25000);

  test('si la confirmación falla, el rastro NO queda huérfano (misma transacción)', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { Carrera, Aula, Clase, Periodo, FlujoPlanificacion, BloqueDisponibilidad, AuditoriaBloqueDisponibilidad } = models;

    const periodo = await Periodo.create({ nombre: '2026-4 (I5)', activo: false });
    const carreraA = await Carrera.create({ carrera: 'Fisioterapia (I5)' });
    const carreraB = await Carrera.create({ carrera: 'Nutricion clinica (I5)' });
    const aula = await Aula.create({ codigo: 'AULA-I5B', nombre: 'Aula I5B', capacidad: 40, tipo: 'AULA' });

    // Carrera A ya tiene el espacio CONFIRMADO.
    const claseA = await Clase.create({
      carrera_id: carreraA.id, carrera: carreraA.carrera, materia: 'Kinesiologia',
      num_estudiantes: 30, periodo_id: periodo.id,
    });
    const flujoA = await FlujoPlanificacion.create({
      carrera_id: carreraA.id, periodo_id: periodo.id, estado: 'CONFIRMADA',
    });
    await BloqueDisponibilidad.create({
      clase_id: claseA.id, aula_id: aula.id, dia: 'Jueves',
      hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'CONFIRMADO', flujo_planificacion_id: flujoA.id,
    });

    // Carrera B llega a ENVIADA sobre ese mismo espacio por la vía de
    // atrás (simula el estado previo a un choque de último momento).
    const claseB = await Clase.create({
      carrera_id: carreraB.id, carrera: carreraB.carrera, materia: 'Dietetica',
      num_estudiantes: 30, periodo_id: periodo.id,
    });
    const flujoB = await FlujoPlanificacion.create({
      carrera_id: carreraB.id, periodo_id: periodo.id, estado: 'ENVIADA',
    });
    const bloqueB = await BloqueDisponibilidad.create({
      clase_id: claseB.id, aula_id: aula.id, dia: 'Jueves',
      hora_inicio: '09:00', hora_fin: '11:00',
      estado: 'EN_REVISION', flujo_planificacion_id: flujoB.id,
    });

    await expect(
      service.confirmarPlanificacion({
        carreraId: carreraB.id, periodoId: periodo.id, usuarioId: userDirPsico.id,
      })
    ).rejects.toThrow(/conflicto de último momento/i);

    // El bloque no cambió...
    await bloqueB.reload();
    expect(bloqueB.estado).toBe('EN_REVISION');

    // ...y tampoco quedó un rastro afirmando un cambio que no ocurrió.
    const rastro = await AuditoriaBloqueDisponibilidad.findAll({ where: { bloque_id: bloqueB.id } });
    expect(rastro).toHaveLength(0);
  }, 25000);
});

// ============================================================
// I3 / I4 — Preview de distribución contra Postgres real.
// ============================================================

describe('I3 — el preview separa lo que cambia de lo que no (Postgres real)', () => {
  test('una clase CONFIRMADA aparece en sinCambios, una LIBRE en propuestas', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { Carrera, Aula, Clase, Periodo, FlujoPlanificacion, BloqueDisponibilidad } = models;

    const periodo = await Periodo.create({ nombre: '2026-5 (I3)', activo: false });
    const carrera = await Carrera.create({ carrera: 'Odontologia (I3)' });
    await Aula.create({ codigo: 'AULA-I3', nombre: 'Aula I3', capacidad: 50, tipo: 'AULA', estado: 'disponible' });
    const aulaOcupada = await Aula.create({ codigo: 'AULA-I3B', nombre: 'Aula I3B', capacidad: 50, tipo: 'AULA', estado: 'disponible' });

    // Clase ya confirmada: es restricción fija, no debe proponerse nada para ella.
    const claseFija = await Clase.create({
      carrera_id: carrera.id, carrera: carrera.carrera, materia: 'Endodoncia',
      num_estudiantes: 30, periodo_id: periodo.id, dia: 'Lunes',
      hora_inicio: '08:00', hora_fin: '10:00',
    });
    const flujo = await FlujoPlanificacion.create({
      carrera_id: carrera.id, periodo_id: periodo.id, estado: 'CONFIRMADA',
    });
    await BloqueDisponibilidad.create({
      clase_id: claseFija.id, aula_id: aulaOcupada.id, dia: 'Lunes',
      hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'CONFIRMADO', flujo_planificacion_id: flujo.id,
    });

    // Clase sin asignar: esta sí es candidata.
    const claseLibre = await Clase.create({
      carrera_id: carrera.id, carrera: carrera.carrera, materia: 'Periodoncia',
      num_estudiantes: 30, periodo_id: periodo.id, dia: 'Martes',
      hora_inicio: '10:00', hora_fin: '12:00',
    });

    const preview = await service.crearPreviewDistribucion({
      carreraId: carrera.id,
      periodoId: periodo.id,
      adminId: global.__fixturesCruzadas.userAdmin.id,
    });

    expect(preview.previewId).toBeGreaterThan(0);

    // La confirmada está en sinCambios, con su ubicación actual y el motivo.
    const fija = preview.sinCambios.find((s) => s.claseId === claseFija.id);
    expect(fija).toBeDefined();
    expect(fija.estado).toBe('CONFIRMADO');
    expect(fija.aulaCodigo).toBe('AULA-I3B');
    expect(fija.motivo).toMatch(/CONFIRMADO/i);

    // ...y no aparece como propuesta.
    expect(preview.propuestas.find((p) => p.claseId === claseFija.id)).toBeUndefined();

    // La libre sí se propone.
    expect(preview.propuestas.find((p) => p.claseId === claseLibre.id)).toBeDefined();

    expect(preview.estadisticas.sinCambios).toBe(1);
  }, 25000);
});

describe('I4 — el preview se aplica por id y no se puede reaplicar (Postgres real)', () => {
  test('aplicar dos veces el mismo preview: la segunda se rechaza', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { Carrera, Aula, Clase, Periodo, BloqueDisponibilidad, PreviewDistribucion } = models;

    const periodo = await Periodo.create({ nombre: '2026-6 (I4)', activo: false });
    const carrera = await Carrera.create({ carrera: 'Optometria (I4)' });
    await Aula.create({ codigo: 'AULA-I4', nombre: 'Aula I4', capacidad: 50, tipo: 'AULA', estado: 'disponible' });
    const clase = await Clase.create({
      carrera_id: carrera.id, carrera: carrera.carrera, materia: 'Refraccion',
      num_estudiantes: 30, periodo_id: periodo.id, dia: 'Viernes',
      hora_inicio: '14:00', hora_fin: '16:00',
    });

    const preview = await service.crearPreviewDistribucion({
      carreraId: carrera.id, periodoId: periodo.id, adminId: global.__fixturesCruzadas.userAdmin.id,
    });
    expect(preview.propuestas.length).toBeGreaterThan(0);

    const primera = await service.aplicarPreviewDistribucion({
      previewId: preview.previewId, adminId: global.__fixturesCruzadas.userAdmin.id,
    });
    expect(primera.aplicadas).toContain(clase.id);

    const bloque = await BloqueDisponibilidad.findOne({ where: { clase_id: clase.id } });
    expect(bloque.estado).toBe('CONFIRMADO');

    // Reintento: el preview ya está APLICADO.
    await expect(
      service.aplicarPreviewDistribucion({ previewId: preview.previewId, adminId: global.__fixturesCruzadas.userAdmin.id })
    ).rejects.toThrow(/ya fue aplicado/i);

    const guardado = await PreviewDistribucion.findByPk(preview.previewId);
    expect(guardado.estado).toBe('APLICADO');
    expect(guardado.aplicado_por).toBe(global.__fixturesCruzadas.userAdmin.id);
    // El payload conserva la evidencia de lo que se aprobó.
    expect(guardado.payload).toHaveProperty('sinCambios');
  }, 30000);
});

// ============================================================
// I2 — advisory lock en enviarPlanificacion + resolución real de
// conflictos, contra Postgres real.
// ============================================================

describe('I2 — enviarPlanificacion serializa contra el mismo aula/horario (Postgres real)', () => {
  test('dos carreras envían al MISMO aula/horario en paralelo: solo una queda EN_REVISION, la otra recibe conflicto', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { Carrera, Aula, Clase, Periodo } = models;

    const periodo = await Periodo.create({ nombre: '2026-7 (I2)', activo: false });
    const carreraA = await Carrera.create({ carrera: 'Genetica (I2)' });
    const carreraB = await Carrera.create({ carrera: 'Bioquimica (I2)' });
    const aula = await Aula.create({ codigo: 'AULA-I2', nombre: 'Aula I2', capacidad: 40, tipo: 'AULA' });

    const claseA = await Clase.create({
      carrera_id: carreraA.id, carrera: carreraA.carrera, materia: 'Herencia',
      num_estudiantes: 30, periodo_id: periodo.id,
    });
    const claseB = await Clase.create({
      carrera_id: carreraB.id, carrera: carreraB.carrera, materia: 'Metabolismo',
      num_estudiantes: 30, periodo_id: periodo.id,
    });

    const resultados = await Promise.allSettled([
      service.enviarPlanificacion({
        carreraId: carreraA.id, periodoId: periodo.id, usuarioId: userDirIng.id,
        bloques: [{ claseId: claseA.id, aulaId: aula.id, dia: 'Sabado', horaInicio: '08:00', horaFin: '10:00' }],
      }),
      service.enviarPlanificacion({
        carreraId: carreraB.id, periodoId: periodo.id, usuarioId: userDirPsico.id,
        bloques: [{ claseId: claseB.id, aulaId: aula.id, dia: 'Sabado', horaInicio: '08:00', horaFin: '10:00' }],
      }),
    ]);

    // Ambas promesas se cumplen (enviar nunca lanza por conflicto, lo
    // reporta en el array `conflictos`) — lo que importa es el resultado.
    expect(resultados.every((r) => r.status === 'fulfilled')).toBe(true);

    const [rA, rB] = resultados.map((r) => r.value);
    const conflictosTotal = rA.conflictos.length + rB.conflictos.length;
    const enviadasTotal = (rA.flujo.estado === 'ENVIADA' ? 1 : 0) + (rB.flujo.estado === 'ENVIADA' ? 1 : 0);

    // Exactamente una gana el espacio (ENVIADA sin conflicto), la otra
    // recibe el conflicto. Sin el advisory lock, ambas podían pasar la
    // verificación en paralelo y las dos terminaban EN_REVISION sobre el
    // mismo aula/horario.
    expect(enviadasTotal).toBe(1);
    expect(conflictosTotal).toBe(1);
  }, 25000);
});

describe('I2 — el ciclo choca -> se corrige -> se resuelve, contra Postgres real', () => {
  test('reenviar corrigiendo el horario resuelve el conflicto y desbloquea confirmar', async () => {
    if (!dbLista) {
      console.warn('  (omitido: sin BD de test disponible)');
      return;
    }

    const { Carrera, Aula, Clase, Periodo, FlujoPlanificacion, BloqueDisponibilidad, ConflictoDeteccion } = models;

    const periodo = await Periodo.create({ nombre: '2026-8 (I2)', activo: false });
    const carreraA = await Carrera.create({ carrera: 'Anestesiologia (I2)' });
    const carreraB = await Carrera.create({ carrera: 'Cirugia (I2)' });
    const aula = await Aula.create({ codigo: 'AULA-I2B', nombre: 'Aula I2B', capacidad: 40, tipo: 'AULA' });

    const claseA = await Clase.create({
      carrera_id: carreraA.id, carrera: carreraA.carrera, materia: 'Sedacion',
      num_estudiantes: 30, periodo_id: periodo.id,
    });
    const flujoA = await FlujoPlanificacion.create({
      carrera_id: carreraA.id, periodo_id: periodo.id, estado: 'CONFIRMADA',
    });
    await BloqueDisponibilidad.create({
      clase_id: claseA.id, aula_id: aula.id, dia: 'Domingo',
      hora_inicio: '08:00', hora_fin: '10:00',
      estado: 'CONFIRMADO', flujo_planificacion_id: flujoA.id,
    });

    const claseB = await Clase.create({
      carrera_id: carreraB.id, carrera: carreraB.carrera, materia: 'Cirugia General',
      num_estudiantes: 30, periodo_id: periodo.id,
    });

    // 1) Carrera B choca contra el aula de A.
    const primerEnvio = await service.enviarPlanificacion({
      carreraId: carreraB.id, periodoId: periodo.id, usuarioId: userDirPsico.id,
      bloques: [{ claseId: claseB.id, aulaId: aula.id, dia: 'Domingo', horaInicio: '08:00', horaFin: '10:00' }],
    });
    expect(primerEnvio.conflictos).toHaveLength(1);

    let conflictosAbiertos = await ConflictoDeteccion.count({
      where: { carrera_solicitante_id: carreraB.id, resuelto: false },
    });
    expect(conflictosAbiertos).toBe(1);

    // 2) Reintenta con un horario que ya no choca.
    const segundoEnvio = await service.enviarPlanificacion({
      carreraId: carreraB.id, periodoId: periodo.id, usuarioId: userDirPsico.id,
      bloques: [{ claseId: claseB.id, aulaId: aula.id, dia: 'Domingo', horaInicio: '11:00', horaFin: '13:00' }],
    });
    expect(segundoEnvio.conflictos).toHaveLength(0);
    expect(segundoEnvio.flujo.estado).toBe('ENVIADA');

    // El conflicto anterior quedó resuelto — no una fila nueva sin resolver.
    conflictosAbiertos = await ConflictoDeteccion.count({
      where: { carrera_solicitante_id: carreraB.id, resuelto: false },
    });
    expect(conflictosAbiertos).toBe(0);

    // 3) Confirmar ya no está bloqueada por el conflicto histórico.
    const confirmado = await service.confirmarPlanificacion({
      carreraId: carreraB.id, periodoId: periodo.id, usuarioId: userDirPsico.id,
    });
    expect(confirmado.estado).toBe('CONFIRMADA');
  }, 30000);
});
