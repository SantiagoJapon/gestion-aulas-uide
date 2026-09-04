// ============================================================
// Servicio: Planificación colaborativa por carrera
// ============================================================
// Máquina de estados BORRADOR -> ENVIADA -> CONFIRMADA (FlujoPlanificacion)
// y LIBRE -> EN_REVISION -> CONFIRMADO (BloqueDisponibilidad, 1 por clase).
//
// Reglas de negocio implementadas aquí (ver Rommie — módulo de
// planificación colaborativa):
//  - Reabrir un flujo CONFIRMADA/ENVIADA es libre para el director
//    (sin permiso admin) siempre que sea antes de la fecha límite vigente.
//    NO libera bloques de inmediato: pasan a EN_REVISION.
//  - CONFIRMADO es inmutable salvo ReasignacionExcepcional (admin, motivo
//    obligatorio) — nunca una rama condicional silenciosa.
//  - confirmarPlanificacion() re-valida solapamiento DENTRO de un
//    advisory lock transaccional por (aula_id, dia) antes de escribir
//    CONFIRMADO, para que dos carreras no puedan confirmar el mismo
//    aula/horario en paralelo.
//  - El motor heurístico existente (distribucion.service.js) se
//    REUTILIZA sin modificar — solo se envuelve para sugerencias de
//    lectura (sugerirAula). La distribución "fill the gaps" del admin
//    (que sí toca distribucion.service.js) es la Fase 3, no este archivo.
// ============================================================

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  FlujoPlanificacion,
  FlujoPlanificacionVersion,
  BloqueDisponibilidad,
  ConflictoDeteccion,
  ReasignacionExcepcional,
  AuditoriaBloqueDisponibilidad,
  PreviewDistribucion,
  FechaLimiteExtendida,
  Carrera,
  Clase,
  Aula,
  User,
  Notificacion,
} = require('../models');
const distribucionService = require('./distribucion.service');
const { obtenerDirectoresDeCarrera } = require('../utils/directorScope');
const { construirOcupacionActual, normalizarYConvertir } = require('../utils/ocupacionAulas');

class PlanificacionCarreraService {
  // ============================================
  // Flujo de trabajo (estado por carrera)
  // ============================================

  async obtenerOCrearFlujo({ carreraId, periodoId = null, transaction = null }) {
    const [flujo] = await FlujoPlanificacion.findOrCreate({
      where: { carrera_id: carreraId, periodo_id: periodoId },
      defaults: { estado: 'BORRADOR' },
      transaction,
    });
    return flujo;
  }

  /**
   * Reabre un flujo CONFIRMADA/ENVIADA -> BORRADOR. Idempotente si ya
   * está en BORRADOR. Bloquea solo si la fecha límite vigente ya venció
   * (el admin debe extenderla individualmente — ver extenderFechaLimite).
   */
  async reabrirBorrador({ carreraId, periodoId = null, usuarioId }) {
    return sequelize.transaction(async (t) => {
      const flujo = await FlujoPlanificacion.findOne({
        where: { carrera_id: carreraId, periodo_id: periodoId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!flujo) {
        throw new Error('No existe planificación para esta carrera/período. Debe subirse primero.');
      }

      if (flujo.estado === 'BORRADOR') {
        return flujo; // idempotente
      }

      const fechaLimiteVigente = await this._resolverFechaLimiteVigente(carreraId, flujo, t);
      if (fechaLimiteVigente && new Date() > new Date(fechaLimiteVigente)) {
        throw new Error('No se puede reabrir: la fecha límite ya venció. Solicite extensión al administrador.');
      }

      flujo.estado = 'BORRADOR';
      await flujo.save({ transaction: t });

      // Bloques bajo este flujo que estaban CONFIRMADO o EN_REVISION -> EN_REVISION.
      // No se liberan a LIBRE: evita que otro director tome el espacio mientras
      // este director edita.
      //
      // Se recorre uno por uno en vez de un UPDATE masivo porque la regla 7
      // exige registrar el estado ANTERIOR de cada bloque, y un UPDATE en
      // bloque lo pisa sin dejar forma de saber cuál era.
      const bloquesAReabrir = await BloqueDisponibilidad.findAll({
        where: { flujo_planificacion_id: flujo.id, estado: { [Op.in]: ['CONFIRMADO', 'EN_REVISION'] } },
        transaction: t,
      });

      const transiciones = [];
      for (const bloque of bloquesAReabrir) {
        const estadoAnterior = bloque.estado;
        const asignacionAnterior = this._snapshotAsignacion(bloque);
        bloque.estado = 'EN_REVISION';
        await bloque.save({ transaction: t });
        transiciones.push({ bloque, estadoAnterior, asignacionAnterior });
      }

      const version = await this._registrarVersion(flujo, 'BORRADOR', usuarioId, t);

      for (const tr of transiciones) {
        await this._registrarAuditoriaBloque({
          ...tr,
          origen: 'REAPERTURA',
          usuarioId,
          flujoId: flujo.id,
          versionId: version?.id ?? null,
          transaction: t,
        });
      }

      return flujo;
    });
  }

  /**
   * Valida los bloques propuestos por el director contra los bloques
   * CONFIRMADO de otras carreras. Ítems sin conflicto avanzan a
   * EN_REVISION de inmediato (reserva tentativa); ítems en conflicto
   * quedan pendientes con una sugerencia de alternativa (ConflictoDeteccion)
   * y NO tocan el bloque. El flujo solo pasa a ENVIADA si no quedó
   * ningún conflicto pendiente en este envío.
   *
   * @param {Array<{claseId:number, aulaId:number, dia:string, horaInicio:string, horaFin:string}>} bloques
   */
  async enviarPlanificacion({ carreraId, periodoId = null, usuarioId, bloques }) {
    return sequelize.transaction(async (t) => {
      const flujo = await this.obtenerOCrearFlujo({ carreraId, periodoId, transaction: t });

      if (flujo.estado === 'CONFIRMADA') {
        throw new Error('La planificación ya está confirmada. Reabra el borrador antes de enviar cambios.');
      }

      // Advisory lock por (aula, día), mismo patrón que confirmarPlanificacion
      // y aplicarDistribucionFillGaps. Sin esto había ventana TOCTOU: dos
      // directores de carreras distintas podían pasar la verificación de
      // _buscarBloqueOcupadoSolapado en paralelo (ninguno ve todavía la
      // escritura del otro) y ambos terminar con EN_REVISION sobre el mismo
      // aula/horario. Orden determinístico para no deadlockear contra un
      // confirmar o un fill-gaps corriendo al mismo tiempo sobre las mismas
      // claves.
      const clavesBloqueo = [...new Set(
        bloques.filter((b) => b.aulaId && b.dia).map((b) => `${b.aulaId}|${b.dia}`)
      )].sort();
      for (const clave of clavesBloqueo) {
        await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:clave))', {
          replacements: { clave },
          transaction: t,
        });
      }

      const conflictosDetectados = [];

      // Los bloques EN_REVISION del propio flujo se excluyen de la
      // verificación contra BD (ver _buscarBloqueOcupadoSolapado): sin eso,
      // un director que intercambia dos aulas entre sus propias clases
      // chocaría contra su envío anterior. Pero eso abre la puerta a que
      // dos ítems DEL MISMO payload pidan el mismo espacio, así que se
      // rastrea aparte lo ya reclamado dentro de este envío.
      const reclamadosEnEstePayload = [];
      // Se acumulan y se escriben DESPUÉS de crear la versión, para que
      // cada registro pueda referenciarla (regla 7). Los ítems en
      // conflicto no entran: no hubo transición, el bloque no se tocó.
      const transicionesAuditadas = [];

      for (const item of bloques) {
        const inicioItem = normalizarYConvertir(item.horaInicio);
        const finItem = normalizarYConvertir(item.horaFin);
        const choqueInterno = (item.aulaId && item.dia)
          ? reclamadosEnEstePayload.find((r) =>
              Number(r.aulaId) === Number(item.aulaId) &&
              r.dia === item.dia &&
              inicioItem < r.fin && finItem > r.inicio)
          : null;

        const solapado = choqueInterno
          ? null
          : await this._buscarBloqueOcupadoSolapado({
              aulaId: item.aulaId,
              dia: item.dia,
              horaInicio: item.horaInicio,
              horaFin: item.horaFin,
              excluirClaseId: item.claseId,
              excluirFlujoId: flujo.id,
              periodoId: flujo.periodo_id ?? null,
              transaction: t,
            });

        const [bloque] = await BloqueDisponibilidad.findOrCreate({
          where: { clase_id: item.claseId },
          defaults: { estado: 'LIBRE' },
          transaction: t,
        });

        // Reintento del mismo bloque: nada en el código marca `resuelto`
        // fuera de acá, así que sin esto reenviar acumulaba una fila de
        // ConflictoDeteccion por cada intento, y confirmarPlanificacion
        // (que cuenta `resuelto:false`) quedaba bloqueada para siempre en
        // cuanto la carrera tocaba un solo conflicto, incluso después de
        // corregir el horario y reenviar limpio.
        const conflictoPrevio = await ConflictoDeteccion.findOne({
          where: { bloque_id: bloque.id, resuelto: false },
          order: [['created_at', 'DESC']],
          transaction: t,
        });

        if (choqueInterno) {
          const sugerencia = { mensaje: 'Choque dentro del mismo envío', aula: null };
          const sugerenciaIA = {
            mensaje: `Este envío asigna dos clases al mismo aula/horario (choca con la clase ${choqueInterno.claseId}).`,
            aula: null,
          };
          // El intento SIGUE chocando: se actualiza la fila existente en
          // vez de duplicarla. No se marca resuelto — el problema persiste.
          const conflicto = conflictoPrevio
            ? await conflictoPrevio.update(
                { carrera_solicitante_id: carreraId, sugerencia_ia: sugerenciaIA },
                { transaction: t }
              )
            : await ConflictoDeteccion.create(
                { bloque_id: bloque.id, carrera_solicitante_id: carreraId, resuelto: false, sugerencia_ia: sugerenciaIA },
                { transaction: t }
              );
          conflictosDetectados.push({ claseId: item.claseId, conflictoId: conflicto.id, sugerencia });
          continue;
        }

        if (solapado) {
          const sugerencia = await this._sugerirAlternativa({ claseId: item.claseId, transaction: t });
          const conflicto = conflictoPrevio
            ? await conflictoPrevio.update(
                { carrera_solicitante_id: carreraId, sugerencia_ia: sugerencia },
                { transaction: t }
              )
            : await ConflictoDeteccion.create(
                { bloque_id: bloque.id, carrera_solicitante_id: carreraId, resuelto: false, sugerencia_ia: sugerencia },
                { transaction: t }
              );
          conflictosDetectados.push({ claseId: item.claseId, conflictoId: conflicto.id, sugerencia });
          continue;
        }

        // El intento YA NO choca: si venía de un conflicto sin resolver,
        // acá es donde se resuelve de verdad (el director corrigió el
        // horario), no antes.
        if (conflictoPrevio) {
          await ConflictoDeteccion.update(
            { resuelto: true },
            { where: { bloque_id: bloque.id, resuelto: false }, transaction: t }
          );
        }

        const estadoAnterior = bloque.estado;
        const asignacionAnterior = this._snapshotAsignacion(bloque);

        bloque.aula_id = item.aulaId;
        bloque.dia = item.dia;
        bloque.hora_inicio = item.horaInicio;
        bloque.hora_fin = item.horaFin;
        bloque.estado = 'EN_REVISION';
        bloque.flujo_planificacion_id = flujo.id;
        await bloque.save({ transaction: t });

        transicionesAuditadas.push({ bloque, estadoAnterior, asignacionAnterior });

        if (item.aulaId && item.dia) {
          reclamadosEnEstePayload.push({
            claseId: item.claseId,
            aulaId: item.aulaId,
            dia: item.dia,
            inicio: inicioItem,
            fin: finItem,
          });
        }
      }

      let version = null;
      if (conflictosDetectados.length === 0) {
        flujo.estado = 'ENVIADA';
        await flujo.save({ transaction: t });
        version = await this._registrarVersion(flujo, 'ENVIADA', usuarioId, t);
      }

      // Los bloques que sí se movieron se auditan aunque el envío haya
      // quedado con conflictos pendientes: el movimiento ocurrió y tiene
      // que quedar registrado. versionId queda null en ese caso porque no
      // hubo transición de versión del flujo.
      for (const tr of transicionesAuditadas) {
        await this._registrarAuditoriaBloque({
          ...tr,
          origen: 'ENVIO',
          usuarioId,
          flujoId: flujo.id,
          versionId: version?.id ?? null,
          transaction: t,
        });
      }

      return { flujo, conflictos: conflictosDetectados };
    });
  }

  /**
   * Confirma un flujo ENVIADA (sin conflictos pendientes): sus bloques
   * EN_REVISION pasan a CONFIRMADO. Re-valida solapamiento DENTRO de un
   * advisory lock transaccional (pg_advisory_xact_lock, por aula+día,
   * orden determinístico para evitar deadlocks) justo antes de escribir,
   * para blindar contra dos carreras confirmando el mismo espacio en
   * paralelo. Si algo se coló, aborta toda la transacción — no deja
   * estados a medias.
   */
  async confirmarPlanificacion({ carreraId, periodoId = null, usuarioId }) {
    return sequelize.transaction(async (t) => {
      const flujo = await FlujoPlanificacion.findOne({
        where: { carrera_id: carreraId, periodo_id: periodoId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!flujo) {
        throw new Error('No existe planificación para esta carrera/período.');
      }
      // Idempotente si ya está CONFIRMADA (doble clic o reintento de red),
      // mismo patrón que reabrirBorrador con BORRADOR. Antes esto tiraba
      // 400 en un reintento inofensivo — el director veía un error por
      // algo que ya había funcionado.
      if (flujo.estado === 'CONFIRMADA') {
        return flujo;
      }
      if (flujo.estado !== 'ENVIADA') {
        throw new Error(`No se puede confirmar desde estado ${flujo.estado}. Debe estar ENVIADA y sin conflictos pendientes.`);
      }

      // Acotado al período del flujo: sin esto, un conflicto sin resolver
      // de un período anterior bloqueaba la confirmación del actual para
      // siempre. Se filtra por la clase del bloque porque ConflictoDeteccion
      // no tiene período propio (lo hereda vía bloque -> clase).
      const conflictosPendientes = await ConflictoDeteccion.count({
        where: { resuelto: false, carrera_solicitante_id: carreraId },
        include: [{
          model: BloqueDisponibilidad,
          as: 'bloque',
          required: true,
          attributes: [],
          include: [{
            model: Clase,
            as: 'clase',
            required: true,
            attributes: [],
            where: { periodo_id: flujo.periodo_id ?? null },
          }],
        }],
        transaction: t,
      });
      if (conflictosPendientes > 0) {
        throw new Error(`Hay ${conflictosPendientes} conflicto(s) sin resolver. No se puede confirmar.`);
      }

      const bloquesEnRevision = await BloqueDisponibilidad.findAll({
        where: { flujo_planificacion_id: flujo.id, estado: 'EN_REVISION' },
        transaction: t,
      });

      const transicionesAuditadas = [];

      const claves = [...new Set(
        bloquesEnRevision.filter((b) => b.aula_id && b.dia).map((b) => `${b.aula_id}|${b.dia}`)
      )].sort();

      for (const clave of claves) {
        await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:clave))', {
          replacements: { clave },
          transaction: t,
        });
      }

      for (const bloque of bloquesEnRevision) {
        if (bloque.aula_id && bloque.dia) {
          // FINALIZAR: solo CONFIRMADO invalida. Ver incluirEnRevision en
          // _buscarBloqueOcupadoSolapado — mirar EN_REVISION acá haría que
          // dos carreras se rechacen mutuamente sin salida.
          const solapado = await this._buscarBloqueOcupadoSolapado({
            aulaId: bloque.aula_id,
            dia: bloque.dia,
            horaInicio: bloque.hora_inicio,
            horaFin: bloque.hora_fin,
            excluirClaseId: bloque.clase_id,
            excluirFlujoId: flujo.id,
            incluirEnRevision: false,
            periodoId: flujo.periodo_id ?? null,
            transaction: t,
          });
          if (solapado) {
            throw new Error(`Conflicto de último momento en aula/horario del bloque ${bloque.id}. Reintente el envío.`);
          }
        }
        const estadoAnterior = bloque.estado;
        const asignacionAnterior = this._snapshotAsignacion(bloque);
        this._marcarConfirmado(bloque);
        await bloque.save({ transaction: t });
        transicionesAuditadas.push({ bloque, estadoAnterior, asignacionAnterior });
      }

      flujo.estado = 'CONFIRMADA';
      flujo.fecha_confirmacion = new Date();
      await flujo.save({ transaction: t });

      const version = await this._registrarVersion(flujo, 'CONFIRMADA', usuarioId, t);

      for (const tr of transicionesAuditadas) {
        await this._registrarAuditoriaBloque({
          ...tr,
          origen: 'CONFIRMACION',
          usuarioId,
          flujoId: flujo.id,
          versionId: version?.id ?? null,
          transaction: t,
        });
      }
      await this._notificarConfirmacion({ carreraId, transaction: t });

      return flujo;
    });
  }

  // ============================================
  // Distribución "fill the gaps" (admin) — Fase 3
  // ============================================

  /**
   * Persiste la propuesta calculada por
   * distribucionService.calcularDistribucionFillGaps() (100% lectura).
   * Esta es la ÚNICA función con permiso de escritura para ese flujo:
   * por cada propuesta re-verifica el estado real del bloque justo antes
   * de tocarlo (nunca confía en que la propuesta siga vigente — pudo
   * pasar tiempo entre calcular y aprobar) y usa el mismo advisory lock
   * transaccional por (aula,dia) que confirmarPlanificacion(), para no
   * pisar a un director confirmando en paralelo.
   *
   * Restricción de arquitectura: un bloque CONFIRMADO o EN_REVISION
   * jamás se escribe aquí, sin excepción — se omite y se reporta en
   * `omitidas`. Los huecos resueltos por el admin (nadie los reclamaba)
   * quedan CONFIRMADO directamente: no hay a quién pedirle que confirme.
   *
   * @param {Array<{claseId:number, aulaId:number, dia:string, horaInicio:string, horaFin:string}>} propuestas
   * @param {number} adminId - autor de la distribución. Queda registrado en
   *   auditoria_bloques_disponibilidad con origen FILL_GAPS.
   * @param {number|null} periodoId - período sobre el que se distribuye.
   *   Acota la verificación de solapamiento para que un aula ocupada en
   *   otro período no bloquee un hueco de este.
   */
  /**
   * Calcula la distribución y GUARDA el preview, devolviendo su id.
   *
   * El cálculo en sí (distribucionService.calcularDistribucionFillGaps)
   * sigue siendo 100% lectura — esa invariante está testeada. La escritura
   * del preview vive acá a propósito, para no romperla.
   *
   * Se guardan las tres listas, no solo las propuestas: §3.4 pide que el
   * admin apruebe viendo también lo que NO cambia, así que hay que poder
   * demostrar después cuál fue esa evidencia.
   */
  async crearPreviewDistribucion({ carreraId = null, periodoId = undefined, adminId }) {
    const resultado = await distribucionService.calcularDistribucionFillGaps(carreraId, periodoId);

    const preview = await PreviewDistribucion.create({
      carrera_id: carreraId,
      periodo_id: periodoId === undefined ? null : periodoId,
      payload: {
        propuestas: resultado.propuestas,
        sinCambios: resultado.sinCambios,
        sinAsignar: resultado.sinAsignar,
        estadisticas: resultado.estadisticas,
        periodoId: periodoId === undefined ? null : periodoId,
      },
      estado: 'PENDIENTE',
      creado_por: adminId,
    });

    return { previewId: preview.id, ...resultado };
  }

  /**
   * Aplica un preview previamente calculado, identificado por su id.
   *
   * Antes esta función recibía el array de propuestas directamente del
   * cliente: nada garantizaba que salieran del motor heurístico. Ahora las
   * propuestas se leen del preview guardado.
   *
   * El preview se marca APLICADO dentro de la misma transacción y se exige
   * que estuviera PENDIENTE, así que reintentar por red no vuelve a
   * distribuir.
   */
  async aplicarPreviewDistribucion({ previewId, adminId }) {
    const preview = await PreviewDistribucion.findByPk(previewId);
    if (!preview) {
      throw new Error('Preview no encontrado. Vuelva a calcular la distribución.');
    }
    if (preview.estado !== 'PENDIENTE') {
      throw new Error(`Este preview ya fue ${preview.estado.toLowerCase()}. Calcule uno nuevo para volver a distribuir.`);
    }

    const propuestas = preview.payload?.propuestas || [];
    const periodoId = preview.payload?.periodoId ?? preview.periodo_id ?? null;

    const resultado = await this.aplicarDistribucionFillGaps({
      propuestas,
      adminId,
      periodoId,
      preview,
    });

    return {
      previewId: preview.id,
      calculadoEn: preview.created_at,
      ...resultado,
    };
  }

  /**
   * @param {object|null} preview - cuando viene, se marca APLICADO dentro
   *   de la misma transacción que las escrituras. Así no queda un preview
   *   PENDIENTE cuya distribución ya se aplicó, ni al revés.
   */
  async aplicarDistribucionFillGaps({ propuestas, adminId, periodoId = null, preview = null }) {
    return sequelize.transaction(async (t) => {
      const claves = [...new Set(
        propuestas.filter((p) => p.aulaId && p.dia).map((p) => `${p.aulaId}|${p.dia}`)
      )].sort();

      for (const clave of claves) {
        await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:clave))', {
          replacements: { clave },
          transaction: t,
        });
      }

      const aplicadas = [];
      const omitidas = [];

      for (const propuesta of propuestas) {
        const [bloque] = await BloqueDisponibilidad.findOrCreate({
          where: { clase_id: propuesta.claseId },
          defaults: { estado: 'LIBRE' },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (bloque.estado === 'CONFIRMADO') {
          omitidas.push({ claseId: propuesta.claseId, motivo: 'El bloque ya fue CONFIRMADO por su carrera desde que se calculó la propuesta' });
          continue;
        }
        if (bloque.estado === 'EN_REVISION') {
          omitidas.push({ claseId: propuesta.claseId, motivo: 'El bloque está EN_REVISION — un director lo está editando' });
          continue;
        }

        // Sin excluirFlujoId: el admin no tiene flujo propio, así que
        // cualquier EN_REVISION ajeno cuenta como ocupación (regla 3.2).
        const solapado = await this._buscarBloqueOcupadoSolapado({
          aulaId: propuesta.aulaId,
          dia: propuesta.dia,
          horaInicio: propuesta.horaInicio,
          horaFin: propuesta.horaFin,
          excluirClaseId: propuesta.claseId,
          periodoId,
          transaction: t,
        });
        if (solapado) {
          omitidas.push({
            claseId: propuesta.claseId,
            motivo: `Conflicto de último momento contra un bloque ${solapado.estado}`,
          });
          continue;
        }

        const estadoAnterior = bloque.estado;
        const asignacionAnterior = this._snapshotAsignacion(bloque);

        bloque.aula_id = propuesta.aulaId;
        bloque.dia = propuesta.dia;
        bloque.hora_inicio = propuesta.horaInicio;
        bloque.hora_fin = propuesta.horaFin;
        this._marcarConfirmado(bloque);
        await bloque.save({ transaction: t });

        // adminId por fin se usa: antes llegaba hasta acá y se descartaba,
        // así que el admin escribía CONFIRMADO en masa sin dejar rastro.
        await this._registrarAuditoriaBloque({
          bloque,
          estadoAnterior,
          asignacionAnterior,
          origen: 'FILL_GAPS',
          usuarioId: adminId,
          transaction: t,
        });

        aplicadas.push(propuesta.claseId);
      }

      if (preview) {
        preview.estado = 'APLICADO';
        preview.aplicado_por = adminId;
        preview.aplicado_en = new Date();
        await preview.save({ transaction: t });
      }

      return { aplicadas, omitidas };
    });
  }

  // ============================================
  // Reasignación excepcional (admin)
  // ============================================

  /**
   * Única vía autorizada para modificar un bloque CONFIRMADO fuera del
   * flujo normal. motivo es obligatorio. Notifica al/los director(es)
   * de la carrera afectada.
   */
  async reasignacionExcepcional({ bloqueId, adminId, motivo, nuevaAulaId = null, nuevoDia = null, nuevaHoraInicio = null, nuevaHoraFin = null }) {
    // §3.5: "validar longitud mínima en backend, no confiar solo en el
    // frontend". Antes solo se rechazaba vacío — un "." pasaba. 15
    // caracteres alcanza para "aula en mantenimiento" pero no para un
    // relleno trivial.
    const MOTIVO_LONGITUD_MINIMA = 15;
    const motivoLimpio = (motivo || '').trim();
    if (motivoLimpio.length < MOTIVO_LONGITUD_MINIMA) {
      throw new Error(`El motivo debe tener al menos ${MOTIVO_LONGITUD_MINIMA} caracteres. Explique brevemente por qué se reasigna.`);
    }

    return sequelize.transaction(async (t) => {
      const bloque = await BloqueDisponibilidad.findByPk(bloqueId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!bloque) {
        throw new Error('Bloque no encontrado.');
      }
      if (bloque.estado !== 'CONFIRMADO') {
        throw new Error('Solo se puede reasignar excepcionalmente un bloque CONFIRMADO. Para otros estados, use el flujo normal.');
      }

      const estadoAnterior = bloque.estado;
      const asignacionAnterior = this._snapshotAsignacion(bloque);

      if (nuevaAulaId) bloque.aula_id = nuevaAulaId;
      if (nuevoDia) bloque.dia = nuevoDia;
      if (nuevaHoraInicio) bloque.hora_inicio = nuevaHoraInicio;
      if (nuevaHoraFin) bloque.hora_fin = nuevaHoraFin;
      // El bloque sigue CONFIRMADO y su nueva ubicación pasa a ser la
      // versión confirmada vigente: si el director reabre y deja vencer el
      // plazo, la reversión debe traerlo acá, no a donde estaba antes de
      // que el admin interviniera.
      this._marcarConfirmado(bloque);
      await bloque.save({ transaction: t });

      const registro = await ReasignacionExcepcional.create(
        { bloque_id: bloque.id, admin_id: adminId, motivo: motivoLimpio },
        { transaction: t }
      );

      await this._registrarAuditoriaBloque({
        bloque,
        estadoAnterior,
        asignacionAnterior,
        origen: 'REASIGNACION_EXCEPCIONAL',
        usuarioId: adminId,
        transaction: t,
      });

      await this._notificarDirectorAfectado({ claseId: bloque.clase_id, motivo: motivoLimpio, transaction: t });

      return { bloque, registro };
    });
  }

  // ============================================
  // Fecha límite (admin)
  // ============================================

  /**
   * Extensión de fecha límite por carrera individual. NUNCA sobrescribe
   * la fecha límite general del flujo — queda registrada aparte;
   * _resolverFechaLimiteVigente() decide cuál aplica.
   */
  async extenderFechaLimite({ carreraId, periodoId = null, nuevaFecha, adminId }) {
    return FechaLimiteExtendida.create({
      carrera_id: carreraId,
      periodo_id: periodoId,
      nueva_fecha: nuevaFecha,
      autorizado_por: adminId,
    });
  }

  /**
   * Crea o actualiza un FlujoPlanificacion con fecha_limite. Solo admin.
   * Si ya existe un flujo para carrera+periodo, actualiza la fecha_limite.
   * Si no existe, lo crea en estado BORRADOR con la fecha límite indicada.
   */
  async crearOActualizarFlujo({ carreraId, periodoId = null, fechaLimite, adminId }) {
    return sequelize.transaction(async (t) => {
      const [flujo, created] = await FlujoPlanificacion.findOrCreate({
        where: { carrera_id: carreraId, periodo_id: periodoId },
        defaults: {
          estado: 'BORRADOR',
          fecha_limite: fechaLimite || null,
        },
        transaction: t,
      });

      if (!created && fechaLimite) {
        flujo.fecha_limite = fechaLimite;
        await flujo.save({ transaction: t });
      }

      if (created) {
        await this._registrarVersion(flujo, 'BORRADOR', adminId, t);
      }

      return flujo;
    });
  }

  /**
   * Detecta flujos no CONFIRMADA cuya fecha límite vigente (extendida o
   * general) ya venció, y notifica a los admins. No actúa por sí solo.
   */
  async detectarCarrerasSinEnviar({ periodoId = null } = {}) {
    const flujosPendientes = await FlujoPlanificacion.findAll({
      where: { estado: { [Op.ne]: 'CONFIRMADA' }, periodo_id: periodoId },
      include: [{ model: Carrera, as: 'carrera' }],
    });

    const ahora = new Date();
    const vencidas = [];
    for (const flujo of flujosPendientes) {
      const fechaLimite = await this._resolverFechaLimiteVigente(flujo.carrera_id, flujo);
      if (fechaLimite && ahora > new Date(fechaLimite)) {
        vencidas.push(flujo);
      }
    }

    if (vencidas.length > 0) {
      await this._notificarAdminsCarrerasVencidas(vencidas);
    }

    return vencidas;
  }

  // ============================================
  // Sugerencia de horario (wrapper de lectura del motor heurístico)
  // ============================================

  /**
   * Envuelve distribucionService.buscarAulaOptima sin modificarlo.
   * Combina ocupación legado (Clase.aula_asignada) + ocupación nueva
   * (BloqueDisponibilidad CONFIRMADO) para no sugerir un choque contra
   * ninguna de las dos fuentes de verdad.
   */
  async sugerirAula({ clase, excluirClaseId = null }) {
    const todasAulas = await Aula.findAll({
      where: sequelize.where(sequelize.fn('UPPER', sequelize.col('estado')), 'DISPONIBLE'),
    });
    // La sugerencia se calcula contra la ocupación del MISMO período de la
    // clase: un aula tomada en otro período no la descalifica.
    const ocupacion = await construirOcupacionActual({
      excluirClaseId,
      periodoId: clase?.periodo_id ?? null,
    });

    const resultadoEstricto = distribucionService.buscarAulaOptima(clase, todasAulas, ocupacion, true);
    if (resultadoEstricto) return resultadoEstricto;

    // Reintento no estricto: mismo comportamiento del motor original
    // (hasta 25% de sobrecupo permitido).
    return distribucionService.buscarAulaOptima(clase, todasAulas, ocupacion, false);
  }

  async _sugerirAlternativa({ claseId, transaction }) {
    const clase = await Clase.findByPk(claseId, { transaction });
    if (!clase) return { mensaje: 'Clase no encontrada', aula: null };

    const resultado = await this.sugerirAula({ clase, excluirClaseId: claseId });
    if (!resultado) return { mensaje: 'Sin alternativas disponibles en este horario', aula: null };

    return {
      mensaje: 'Alternativa sugerida por el motor heurístico',
      aula: resultado.aula.codigo,
      aulaId: resultado.aula.id,
      sobrecupo: !!resultado.isOvercapacity,
    };
  }

  // ============================================
  // Reversión automática por vencimiento (regla 3.2)
  // ============================================

  /**
   * Regla 3.2: "si el director reabre y no vuelve a confirmar antes del
   * vencimiento del plazo, el sistema debe revertir automáticamente esos
   * bloques a su última versión CONFIRMADO conocida (no dejarlos huérfanos
   * en EN_REVISION indefinidamente)".
   *
   * Por cada flujo NO confirmado cuya fecha límite vigente ya venció:
   *  - Bloques EN_REVISION CON snapshot -> vuelven a esa ubicación y a
   *    CONFIRMADO. El director pierde los cambios que no alcanzó a
   *    confirmar, que es exactamente lo que pide la regla.
   *  - Bloques EN_REVISION SIN snapshot (nunca estuvieron CONFIRMADO: eran
   *    un primer envío que no llegó a confirmarse) -> se liberan a LIBRE.
   *    No hay versión anterior a la que volver, y dejarlos EN_REVISION es
   *    justamente el estado huérfano que la regla prohíbe.
   *  - El flujo vuelve a CONFIRMADA solo si quedó al menos un bloque
   *    restaurado; si todo se liberó, queda en BORRADOR (nunca tuvo una
   *    versión confirmada que restaurar).
   *
   * Toma el mismo advisory lock por (aula, día) que confirmarPlanificacion
   * para no pisar a un director confirmando en paralelo, y revalida
   * ocupación antes de restaurar: si en el mientras tanto otra carrera
   * ocupó ese espacio de forma legítima, el bloque se libera en vez de
   * duplicar la reserva.
   */
  async revertirBorradoresVencidos({ periodoId = null } = {}) {
    const flujosAbiertos = await FlujoPlanificacion.findAll({
      where: { estado: { [Op.ne]: 'CONFIRMADA' }, periodo_id: periodoId },
    });

    const ahora = new Date();
    const resultados = [];

    for (const flujoRef of flujosAbiertos) {
      const fechaLimite = await this._resolverFechaLimiteVigente(flujoRef.carrera_id, flujoRef);
      if (!fechaLimite || ahora <= new Date(fechaLimite)) continue;

      const resultado = await sequelize.transaction(async (t) => {
        const flujo = await FlujoPlanificacion.findByPk(flujoRef.id, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        // Revalidación dentro del lock: el director pudo confirmar entre
        // que se listaron los flujos y que llegamos acá.
        if (!flujo || flujo.estado === 'CONFIRMADA') return null;

        const bloques = await BloqueDisponibilidad.findAll({
          where: { flujo_planificacion_id: flujo.id, estado: 'EN_REVISION' },
          transaction: t,
        });
        if (bloques.length === 0) return null;

        const claves = [...new Set(
          bloques
            .filter((b) => b.aula_id_confirmada && b.dia_confirmado)
            .map((b) => `${b.aula_id_confirmada}|${b.dia_confirmado}`)
        )].sort();
        for (const clave of claves) {
          await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:clave))', {
            replacements: { clave },
            transaction: t,
          });
        }

        const restaurados = [];
        const liberados = [];
        const transicionesAuditadas = [];

        for (const bloque of bloques) {
          const estadoAnterior = bloque.estado;
          const asignacionAnterior = this._snapshotAsignacion(bloque);

          const tieneSnapshot = bloque.aula_id_confirmada && bloque.dia_confirmado
            && bloque.hora_inicio_confirmada && bloque.hora_fin_confirmada;

          if (!tieneSnapshot) {
            bloque.estado = 'LIBRE';
            await bloque.save({ transaction: t });
            transicionesAuditadas.push({ bloque, estadoAnterior, asignacionAnterior });
            liberados.push({ claseId: bloque.clase_id, motivo: 'Sin versión confirmada previa' });
            continue;
          }

          const ocupado = await this._buscarBloqueOcupadoSolapado({
            aulaId: bloque.aula_id_confirmada,
            dia: bloque.dia_confirmado,
            horaInicio: bloque.hora_inicio_confirmada,
            horaFin: bloque.hora_fin_confirmada,
            excluirClaseId: bloque.clase_id,
            excluirFlujoId: flujo.id,
            periodoId: flujo.periodo_id ?? null,
            transaction: t,
          });
          if (ocupado) {
            bloque.estado = 'LIBRE';
            await bloque.save({ transaction: t });
            transicionesAuditadas.push({ bloque, estadoAnterior, asignacionAnterior });
            liberados.push({
              claseId: bloque.clase_id,
              motivo: `Su ubicación confirmada previa la ocupa ahora otro bloque ${ocupado.estado}`,
            });
            continue;
          }

          bloque.aula_id = bloque.aula_id_confirmada;
          bloque.dia = bloque.dia_confirmado;
          bloque.hora_inicio = bloque.hora_inicio_confirmada;
          bloque.hora_fin = bloque.hora_fin_confirmada;
          bloque.estado = 'CONFIRMADO';
          await bloque.save({ transaction: t });
          transicionesAuditadas.push({ bloque, estadoAnterior, asignacionAnterior });
          restaurados.push(bloque.clase_id);
        }

        let version = null;
        if (restaurados.length > 0) {
          flujo.estado = 'CONFIRMADA';
          flujo.fecha_confirmacion = new Date();
          await flujo.save({ transaction: t });
          version = await this._registrarVersion(flujo, 'CONFIRMADA', null, t);
        }

        // usuarioId null a propósito: acá no actuó una persona. Es la
        // distinción automático/manual que la regla 7 pide poder reportar.
        for (const tr of transicionesAuditadas) {
          await this._registrarAuditoriaBloque({
            ...tr,
            origen: 'REVERSION_AUTOMATICA',
            usuarioId: null,
            flujoId: flujo.id,
            versionId: version?.id ?? null,
            transaction: t,
          });
        }

        await this._notificarReversionAutomatica({
          carreraId: flujo.carrera_id,
          restaurados: restaurados.length,
          liberados: liberados.length,
          transaction: t,
        });

        return { flujoId: flujo.id, carreraId: flujo.carrera_id, restaurados, liberados };
      });

      if (resultado) resultados.push(resultado);
    }

    return resultados;
  }

  // ============================================
  // Trazabilidad agregada (regla 7)
  // ============================================

  /**
   * Métricas agregadas de conflictos, reasignaciones excepcionales y
   * cambios de bloque. La regla 7 pide que estos datos sean consultables
   * "de forma agregada (conteos, tasas de resolución automática vs.
   * manual)" porque alimentan resultados reportables del proyecto.
   *
   * Devuelve números crudos y las tasas ya calculadas, para que el
   * consumidor no tenga que rederivarlas y arriesgar dos definiciones
   * distintas de la misma métrica.
   */
  async obtenerMetricasTrazabilidad({ periodoId = undefined, carreraId = null } = {}) {
    const filtroClase = periodoId !== undefined ? { periodo_id: periodoId } : {};
    const includeClase = Object.keys(filtroClase).length > 0
      ? [{
          model: BloqueDisponibilidad,
          as: 'bloque',
          required: true,
          attributes: [],
          include: [{ model: Clase, as: 'clase', required: true, attributes: [], where: filtroClase }],
        }]
      : [];

    // --- Conflictos ---
    const whereConflictos = { ...(carreraId ? { carrera_solicitante_id: carreraId } : {}) };
    const conflictosTotal = await ConflictoDeteccion.count({ where: whereConflictos, include: includeClase });
    const conflictosResueltos = await ConflictoDeteccion.count({
      where: { ...whereConflictos, resuelto: true },
      include: includeClase,
    });

    // --- Reasignaciones excepcionales ---
    // Hoy todas son manuales del admin. Cuando §3.7 agregue tipo_origen,
    // acá se abre el desglose manual vs. reclamo de prioridad.
    const reasignacionesTotal = await ReasignacionExcepcional.count({ include: includeClase });

    // --- Cambios de bloque por origen ---
    const porOrigen = await AuditoriaBloqueDisponibilidad.findAll({
      attributes: ['origen', [sequelize.fn('COUNT', sequelize.col('AuditoriaBloqueDisponibilidad.id')), 'total']],
      ...(periodoId !== undefined
        ? {
            include: [{
              model: BloqueDisponibilidad,
              as: 'bloque',
              required: true,
              attributes: [],
              include: [{ model: Clase, as: 'clase', required: true, attributes: [], where: filtroClase }],
            }],
          }
        : {}),
      group: ['origen'],
      raw: true,
    });

    const cambiosPorOrigen = {};
    for (const fila of porOrigen) {
      cambiosPorOrigen[fila.origen] = Number(fila.total);
    }

    const manuales = AuditoriaBloqueDisponibilidad.ORIGENES_MANUALES
      .reduce((acc, o) => acc + (cambiosPorOrigen[o] || 0), 0);
    const automaticos = (cambiosPorOrigen.REVERSION_AUTOMATICA || 0);
    const cambiosTotal = manuales + automaticos;

    const tasa = (parte, total) => (total > 0 ? Number((parte / total).toFixed(4)) : null);

    return {
      conflictos: {
        total: conflictosTotal,
        resueltos: conflictosResueltos,
        pendientes: conflictosTotal - conflictosResueltos,
        tasaResolucion: tasa(conflictosResueltos, conflictosTotal),
      },
      reasignacionesExcepcionales: {
        total: reasignacionesTotal,
      },
      cambiosDeBloque: {
        total: cambiosTotal,
        porOrigen: cambiosPorOrigen,
        manuales,
        automaticos,
        tasaAutomatica: tasa(automaticos, cambiosTotal),
      },
    };
  }

  /**
   * Historial completo de un bloque, del cambio más reciente al más
   * antiguo. Es la vista de "quién movió esta clase y cuándo".
   */
  async obtenerHistorialBloque({ bloqueId }) {
    return AuditoriaBloqueDisponibilidad.findAll({
      where: { bloque_id: bloqueId },
      include: [{ model: User, as: 'usuario', attributes: ['id', 'nombre', 'apellido'] }],
      order: [['created_at', 'DESC']],
    });
  }

  // ============================================
  // Helpers internos
  // ============================================

  /**
   * Pone el bloque en CONFIRMADO y sincroniza el snapshot de "última
   * versión confirmada". Toda transición a CONFIRMADO debe pasar por acá:
   * si alguna ruta escribe estado = 'CONFIRMADO' a mano, el snapshot queda
   * desfasado y la reversión de la regla 3.2 restaura una ubicación vieja.
   */
  /**
   * Foto de la asignación de un bloque, para el antes/después del rastro
   * de auditoría. Se toma ANTES de mutar el bloque.
   */
  _snapshotAsignacion(bloque) {
    if (!bloque) return null;
    return {
      aula_id: bloque.aula_id ?? null,
      dia: bloque.dia ?? null,
      hora_inicio: bloque.hora_inicio ?? null,
      hora_fin: bloque.hora_fin ?? null,
    };
  }

  /**
   * Registra una transición de estado de bloque (regla 7: usuario,
   * timestamp y versión de planificación en cada cambio).
   *
   * Recibe la transaction y NO la hace opcional: el registro va en la
   * misma transacción que el cambio que audita. Si esto falla, el cambio
   * se revierte con él. Un rastro que se puede perder mientras el cambio
   * persiste no sirve como evidencia — que es justo el uso que la regla 7
   * le da a estos datos.
   *
   * @param {string|null} usuarioId - null solo para REVERSION_AUTOMATICA
   *   (actuó el sistema, no una persona).
   */
  async _registrarAuditoriaBloque({
    bloque,
    estadoAnterior,
    asignacionAnterior,
    origen,
    usuarioId = null,
    flujoId = null,
    versionId = null,
    transaction,
  }) {
    return AuditoriaBloqueDisponibilidad.create(
      {
        bloque_id: bloque.id,
        clase_id: bloque.clase_id,
        estado_anterior: estadoAnterior ?? null,
        estado_nuevo: bloque.estado,
        asignacion_anterior: asignacionAnterior ?? null,
        asignacion_nueva: this._snapshotAsignacion(bloque),
        origen,
        usuario_id: usuarioId ?? null,
        flujo_planificacion_id: flujoId ?? bloque.flujo_planificacion_id ?? null,
        version_planificacion_id: versionId ?? null,
      },
      { transaction }
    );
  }

  _marcarConfirmado(bloque) {
    bloque.estado = 'CONFIRMADO';
    bloque.aula_id_confirmada = bloque.aula_id;
    bloque.dia_confirmado = bloque.dia;
    bloque.hora_inicio_confirmada = bloque.hora_inicio;
    bloque.hora_fin_confirmada = bloque.hora_fin;
    return bloque;
  }

  /**
   * Busca un bloque OCUPADO que solape con el horario pedido.
   *
   * "Ocupado" = CONFIRMADO (de cualquier carrera) o EN_REVISION (de OTRO
   * flujo). La regla 3.2 dice que EN_REVISION está "reservado
   * temporalmente por una carrera; nadie más puede tomarlo" — antes esta
   * consulta filtraba solo por CONFIRMADO, así que dos carreras podían
   * sostener EN_REVISION sobre el mismo aula/día/hora y el choque recién
   * aparecía al confirmar. Ese es exactamente el escenario que el módulo
   * existe para evitar: el segundo director trabaja todo el ciclo creyendo
   * que el espacio es suyo y lo pierde al final.
   *
   * @param {boolean} incluirEnRevision - distingue RECLAMAR de FINALIZAR.
   *   - true (reclamar: enviar, fill-gaps, revertir): EN_REVISION ajeno
   *     cuenta como ocupación. Es lo que hace que la reserva temporal
   *     signifique algo.
   *   - false (finalizar: confirmar): solo cuenta CONFIRMADO. Al confirmar,
   *     el espacio YA es tuyo desde el envío; lo único que puede
   *     invalidarlo es que otra carrera lo haya dejado firme primero. Si
   *     acá también se mirara EN_REVISION, dos carreras que de algún modo
   *     quedaron ambas EN_REVISION sobre el mismo espacio se rechazarían
   *     mutuamente para siempre y ninguna podría confirmar nunca.
   * @param {number|null} excluirFlujoId - bloques EN_REVISION de este flujo
   *   NO cuentan como ocupación: un director que intercambia dos aulas
   *   entre sus propias clases no debe chocar contra su envío anterior.
   *   Los CONFIRMADO del propio flujo sí siguen contando.
   * @param {number|null|undefined} periodoId - acota la búsqueda al período
   *   de la clase (bloques_disponibilidad no tiene período propio; lo hereda
   *   de Clase). `undefined` = sin filtro, que es el comportamiento viejo y
   *   solo debería usarse en consultas deliberadamente transversales; `null`
   *   = clases sin período asignado, que es el caso por defecto del módulo
   *   hoy. Sin este filtro, un aula confirmada en 2025-1 bloqueaba el mismo
   *   horario en 2026-1 para siempre.
   */
  async _buscarBloqueOcupadoSolapado({
    aulaId, dia, horaInicio, horaFin, excluirClaseId,
    excluirFlujoId = null, incluirEnRevision = true, periodoId = undefined, transaction,
  }) {
    if (!aulaId || !dia || !horaInicio || !horaFin) return null;

    const inicio = normalizarYConvertir(horaInicio);
    const fin = normalizarYConvertir(horaFin);

    const estadosOcupantes = incluirEnRevision
      ? ['CONFIRMADO', 'EN_REVISION']
      : ['CONFIRMADO'];

    const candidatos = await BloqueDisponibilidad.findAll({
      where: {
        aula_id: aulaId,
        dia,
        estado: { [Op.in]: estadosOcupantes },
        ...(excluirClaseId ? { clase_id: { [Op.ne]: excluirClaseId } } : {}),
      },
      ...(periodoId !== undefined
        ? {
            include: [{
              model: Clase,
              as: 'clase',
              required: true,
              attributes: [],
              where: { periodo_id: periodoId },
            }],
          }
        : {}),
      transaction,
    });

    for (const c of candidatos) {
      if (!c.hora_inicio || !c.hora_fin) continue;
      // EN_REVISION del propio flujo: no es competencia, es trabajo propio
      // en curso que esta misma operación va a reescribir.
      if (
        c.estado === 'EN_REVISION' &&
        excluirFlujoId &&
        Number(c.flujo_planificacion_id) === Number(excluirFlujoId)
      ) {
        continue;
      }
      const cInicio = normalizarYConvertir(c.hora_inicio);
      const cFin = normalizarYConvertir(c.hora_fin);
      if (inicio < cFin && fin > cInicio) return c;
    }
    return null;
  }

  /**
   * Fecha límite que rige HOY para una carrera en el período del flujo.
   *
   * La extensión se busca acotada al mismo período: sin ese filtro, una
   * extensión concedida en 2025-1 seguía siendo la fecha vigente en todos
   * los períodos siguientes y la carrera quedaba con el plazo abierto de
   * forma permanente.
   */
  async _resolverFechaLimiteVigente(carreraId, flujo, transaction = null) {
    const extension = await FechaLimiteExtendida.findOne({
      where: { carrera_id: carreraId, periodo_id: flujo?.periodo_id ?? null },
      order: [['created_at', 'DESC']],
      transaction,
    });
    if (extension) return extension.nueva_fecha;
    return flujo?.fecha_limite || null;
  }

  async _registrarVersion(flujo, estadoResultante, usuarioId, transaction) {
    const ultima = await FlujoPlanificacionVersion.findOne({
      where: { flujo_planificacion_id: flujo.id },
      order: [['numero_version', 'DESC']],
      transaction,
    });
    const numero = (ultima?.numero_version || 0) + 1;
    return FlujoPlanificacionVersion.create(
      {
        flujo_planificacion_id: flujo.id,
        numero_version: numero,
        estado_resultante: estadoResultante,
        creado_por: usuarioId,
      },
      { transaction }
    );
  }

  async _notificarConfirmacion({ carreraId, transaction }) {
    const carrera = await Carrera.findByPk(carreraId, { transaction });
    const nombreCarrera = carrera?.carrera || `Carrera #${carreraId}`;

    await Notificacion.create(
      {
        titulo: 'Planificación confirmada',
        mensaje: `La planificación de ${nombreCarrera} fue confirmada. Sus horarios/aulas quedaron bloqueados para las demás carreras.`,
        tipo: 'CARRERA',
        carrera_id: carreraId,
        prioridad: 'MEDIA',
      },
      { transaction }
    );

    const admins = await User.findAll({
      where: { rol: 'admin', estado: 'activo' },
      transaction,
    });
    for (const admin of admins) {
      await Notificacion.create(
        {
          titulo: 'Planificación confirmada',
          mensaje: `La planificación de ${nombreCarrera} fue confirmada por su director.`,
          tipo: 'DIRECTA',
          destinatario_id: admin.id,
          prioridad: 'MEDIA',
        },
        { transaction }
      );
    }
  }

  async _notificarDirectorAfectado({ claseId, motivo, transaction }) {
    const clase = await Clase.findByPk(claseId, { transaction });
    if (!clase || !clase.carrera_id) return;

    const directores = await obtenerDirectoresDeCarrera({ carreraId: clase.carrera_id });
    for (const dir of directores) {
      await Notificacion.create(
        {
          titulo: 'Reasignación excepcional en tu carrera',
          mensaje: `El administrador reasignó un bloque confirmado de tu planificación. Motivo: ${motivo}`,
          tipo: 'DIRECTA',
          destinatario_id: dir.id,
          clase_id: claseId,
          prioridad: 'ALTA',
        },
        { transaction }
      );
    }
  }

  /**
   * La reversión automática le cambia el horario al director sin que él
   * haya hecho nada, así que tiene que enterarse. También se avisa al
   * admin: es una intervención del sistema sobre una planificación, del
   * mismo peso que una reasignación excepcional.
   */
  async _notificarReversionAutomatica({ carreraId, restaurados, liberados, transaction }) {
    const carrera = await Carrera.findByPk(carreraId, { transaction });
    const nombreCarrera = carrera?.carrera || `Carrera #${carreraId}`;
    const detalle = `${restaurados} bloque(s) restaurado(s) a su última versión confirmada` +
      (liberados > 0 ? ` y ${liberados} liberado(s) por no tener versión previa` : '');

    const directores = await obtenerDirectoresDeCarrera({ carreraId });
    for (const dir of directores) {
      await Notificacion.create(
        {
          titulo: 'Planificación revertida por vencimiento de plazo',
          mensaje: `Venció la fecha límite con tu borrador sin confirmar. ${detalle}. Los cambios que no confirmaste se descartaron.`,
          tipo: 'DIRECTA',
          destinatario_id: dir.id,
          prioridad: 'ALTA',
        },
        { transaction }
      );
    }

    const admins = await User.findAll({ where: { rol: 'admin', estado: 'activo' }, transaction });
    for (const admin of admins) {
      await Notificacion.create(
        {
          titulo: 'Reversión automática de planificación',
          mensaje: `${nombreCarrera}: venció el plazo con el borrador reabierto. ${detalle}.`,
          tipo: 'DIRECTA',
          destinatario_id: admin.id,
          prioridad: 'MEDIA',
        },
        { transaction }
      );
    }
  }

  async _notificarAdminsCarrerasVencidas(flujosVencidos) {
    const admins = await User.findAll({ where: { rol: 'admin', estado: 'activo' } });
    const nombres = flujosVencidos.map((f) => f.carrera?.carrera || `carrera ${f.carrera_id}`).join(', ');
    for (const admin of admins) {
      await Notificacion.create({
        titulo: 'Carreras sin planificación enviada',
        mensaje: `Fecha límite vencida sin envío de planificación: ${nombres}`,
        tipo: 'DIRECTA',
        destinatario_id: admin.id,
        prioridad: 'ALTA',
      });
    }
  }
}

module.exports = new PlanificacionCarreraService();
