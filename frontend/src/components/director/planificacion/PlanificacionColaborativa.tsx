import { useState, useEffect, useCallback } from 'react';
import DashboardWidget from '../../dashboard/DashboardWidget';
import { Button } from '../../common/Button';
import AsignarAulaModal from './AsignarAulaModal';
import ConflictosModal from './ConflictosModal';
import {
  planificacionCarreraService,
  distribucionService,
  type FlujoPlanificacion,
  type BloqueDisponibilidad,
  type BloquePropuesto,
  type ConflictoEnvio,
  type ClaseConEstadoDistribucion,
  type EstadoBloqueDisponibilidad,
} from '../../../services/api';
import { Lock, Send, RefreshCw, CheckCircle2, Clock, Info, type LucideIcon } from 'lucide-react';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface PlanificacionColaborativaProps {
  carreraId: number;
}

type EstadoVisual = EstadoBloqueDisponibilidad | 'PENDIENTE_LOCAL';

const ESTILO_ESTADO: Record<EstadoVisual, { bg: string; border: string; text: string; label: string }> = {
  LIBRE: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-500', label: 'Sin asignar' },
  PENDIENTE_LOCAL: { bg: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-700', label: 'Pendiente de enviar' },
  EN_REVISION: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', label: 'En revisión' },
  CONFIRMADO: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', label: 'Confirmado' },
};

const ESTADO_BADGE_FLUJO: Record<string, { bg: string; text: string; icon: LucideIcon }> = {
  BORRADOR: { bg: 'bg-slate-500/10 text-slate-600 border-slate-500/20', text: 'Borrador', icon: Clock },
  ENVIADA: { bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20', text: 'Enviada', icon: Send },
  CONFIRMADA: { bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', text: 'Confirmada', icon: CheckCircle2 },
};

/**
 * Vista principal del director para el módulo de planificación
 * colaborativa. Orquesta: carga de estado (flujo + bloques + clases),
 * calendario editable, y las 3 transiciones que puede disparar un
 * director (reabrir/enviar/confirmar) — la máquina de estados real vive
 * en el backend (planificacionCarrera.service.js), acá solo se refleja.
 */
export default function PlanificacionColaborativa({ carreraId }: PlanificacionColaborativaProps) {
  const [flujo, setFlujo] = useState<FlujoPlanificacion | null>(null);
  const [bloques, setBloques] = useState<BloqueDisponibilidad[]>([]);
  const [clases, setClases] = useState<ClaseConEstadoDistribucion[]>([]);
  const [bloquesPendientes, setBloquesPendientes] = useState<Map<number, BloquePropuesto>>(new Map());
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [claseParaAsignar, setClaseParaAsignar] = useState<ClaseConEstadoDistribucion | null>(null);
  const [conflictos, setConflictos] = useState<ConflictoEnvio[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [resClases, resEstado] = await Promise.all([
        distribucionService.getMiDistribucion(carreraId),
        planificacionCarreraService.obtenerEstado(carreraId),
      ]);
      if (resClases.success) setClases(resClases.clases);
      setFlujo(resEstado.flujo);
      setBloques(resEstado.bloques);
      setBloquesPendientes(new Map());
    } catch (err) {
      console.error('Error cargando planificación colaborativa:', err);
    } finally {
      setLoading(false);
    }
  }, [carreraId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const estadoVisual = (claseId: number): EstadoVisual => {
    if (bloquesPendientes.has(claseId)) return 'PENDIENTE_LOCAL';
    const b = bloques.find((bl) => bl.clase_id === claseId);
    return b?.estado || 'LIBRE';
  };

  const puedeEditar = flujo?.estado !== 'CONFIRMADA';

  const handleClickClase = (clase: ClaseConEstadoDistribucion) => {
    if (!puedeEditar) return;
    if (estadoVisual(clase.id) === 'CONFIRMADO') return; // inmutable para el director
    setClaseParaAsignar(clase);
  };

  const handleAsignarLocal = (bloque: BloquePropuesto) => {
    setBloquesPendientes((prev) => {
      const next = new Map(prev);
      next.set(bloque.claseId, bloque);
      return next;
    });
  };

  const handleEnviar = async () => {
    if (bloquesPendientes.size === 0) return;
    setProcesando(true);
    setMensaje(null);
    try {
      const res = await planificacionCarreraService.enviarPlanificacion(
        carreraId,
        Array.from(bloquesPendientes.values())
      );
      setFlujo(res.flujo);
      if (res.conflictos.length > 0) {
        setConflictos(res.conflictos);
      } else {
        setMensaje({ tipo: 'ok', texto: 'Planificación enviada — sin conflictos. Ya podés confirmarla.' });
      }
      await cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al enviar la planificación' });
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmar = async () => {
    if (!confirm('¿Confirmar la planificación? Los horarios/aulas quedarán bloqueados para las demás carreras.')) return;
    setProcesando(true);
    setMensaje(null);
    try {
      const res = await planificacionCarreraService.confirmarPlanificacion(carreraId);
      setFlujo(res.flujo);
      setMensaje({ tipo: 'ok', texto: 'Planificación confirmada y bloqueada.' });
      await cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al confirmar' });
    } finally {
      setProcesando(false);
    }
  };

  const handleReabrir = async () => {
    if (!confirm('¿Reabrir el borrador? Podrás editar de nuevo antes de reenviar.')) return;
    setProcesando(true);
    setMensaje(null);
    try {
      const res = await planificacionCarreraService.reabrirBorrador(carreraId);
      setFlujo(res.flujo);
      setMensaje({ tipo: 'ok', texto: 'Borrador reabierto — tus bloques pasaron a revisión.' });
      await cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al reabrir' });
    } finally {
      setProcesando(false);
    }
  };

  const handleUsarAlternativaConflicto = (claseId: number, aulaId: number) => {
    const clase = clases.find((c) => c.id === claseId);
    if (!clase) return;
    handleAsignarLocal({
      claseId,
      aulaId,
      dia: clase.dia || '',
      horaInicio: clase.hora_inicio || '',
      horaFin: clase.hora_fin || '',
    });
    setConflictos((prev) => prev.filter((c) => c.claseId !== claseId));
  };

  const clasesPorDia = DIAS.reduce<Record<string, ClaseConEstadoDistribucion[]>>((acc, dia) => {
    acc[dia] = clases.filter((c) => c.dia === dia);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="bg-card rounded-[2.5rem] border border-border p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest animate-pulse">Cargando planificación...</p>
      </div>
    );
  }

  const badgeFlujo = flujo ? ESTADO_BADGE_FLUJO[flujo.estado] : ESTADO_BADGE_FLUJO.BORRADOR;
  const BadgeIcon = badgeFlujo.icon;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header de estado + acciones */}
      <DashboardWidget title="Planificación Colaborativa" subtitle="Estado de tu planificación por carrera" icon="edit_calendar">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border ${badgeFlujo.bg}`}>
                <BadgeIcon className="size-4" />
                {badgeFlujo.text}
              </span>
              {flujo?.fecha_limite && (
                <span className="text-[11px] text-muted-foreground font-bold">
                  Fecha límite: {new Date(flujo.fecha_limite).toLocaleDateString('es-EC')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {flujo && flujo.estado !== 'BORRADOR' && (
                <Button variant="outline" size="sm" onClick={handleReabrir} disabled={procesando}>
                  <RefreshCw className="size-4 mr-2" /> Reabrir borrador
                </Button>
              )}
              {bloquesPendientes.size > 0 && flujo?.estado !== 'CONFIRMADA' && (
                <Button size="sm" onClick={handleEnviar} disabled={procesando}>
                  <Send className="size-4 mr-2" /> Enviar ({bloquesPendientes.size})
                </Button>
              )}
              {flujo?.estado === 'ENVIADA' && (
                <Button size="sm" variant="secondary" onClick={handleConfirmar} disabled={procesando}>
                  <Lock className="size-4 mr-2" /> Confirmar
                </Button>
              )}
            </div>
          </div>

          {mensaje && (
            <div className={`p-3 rounded-xl text-xs font-bold ${mensaje.tipo === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {mensaje.texto}
            </div>
          )}

          {flujo?.estado === 'CONFIRMADA' && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2">
              <Lock className="size-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-800 font-bold">
                Planificación confirmada — bloqueada para edición. Usá "Reabrir borrador" si necesitás hacer cambios.
              </p>
            </div>
          )}

          {/* Leyenda de colores */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
            {(['LIBRE', 'PENDIENTE_LOCAL', 'EN_REVISION', 'CONFIRMADO'] as EstadoVisual[]).map((e) => (
              <div key={e} className="flex items-center gap-1.5">
                <span className={`size-3 rounded-full border-2 ${ESTILO_ESTADO[e].border} ${ESTILO_ESTADO[e].bg}`}></span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{ESTILO_ESTADO[e].label}</span>
              </div>
            ))}
          </div>
        </div>
      </DashboardWidget>

      {/* Calendario semanal editable */}
      <DashboardWidget title="Calendario" subtitle="Click en una clase sin confirmar para asignar/reasignar aula" icon="calendar_view_week" noPadding>
        <div className="p-4 sm:p-6 overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-w-[900px] xl:min-w-0">
            {DIAS.map((dia) => (
              <div key={dia} className="flex flex-col gap-3">
                <div className="bg-muted/30 p-3 rounded-2xl border border-border flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{dia}</span>
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">{clasesPorDia[dia].length}</span>
                </div>
                <div className="space-y-3">
                  {clasesPorDia[dia].length > 0 ? (
                    clasesPorDia[dia].map((clase) => {
                      const estado = estadoVisual(clase.id);
                      const style = ESTILO_ESTADO[estado];
                      const editable = puedeEditar && estado !== 'CONFIRMADO';
                      return (
                        <button
                          key={clase.id}
                          onClick={() => handleClickClase(clase)}
                          disabled={!editable}
                          className={`w-full text-left p-3 rounded-2xl border-l-4 border ${style.bg} ${style.border} transition-all ${editable ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default opacity-90'}`}
                        >
                          <p className={`text-[11px] font-black leading-tight mb-1 ${style.text} line-clamp-2`}>{clase.materia}</p>
                          <p className="text-[10px] font-bold text-muted-foreground">{clase.hora_inicio} - {clase.hora_fin}</p>
                          <p className={`text-[9px] font-black uppercase mt-1 ${style.text}`}>{style.label}</p>
                        </button>
                      );
                    })
                  ) : (
                    <div className="h-20 rounded-2xl border border-dashed border-border flex items-center justify-center opacity-30">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Sin clases</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardWidget>

      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 flex items-start gap-4">
        <div className="size-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
          <Info className="size-5" />
        </div>
        <div>
          <h4 className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase tracking-tight">Cómo funciona</h4>
          <p className="text-xs text-blue-800/70 dark:text-blue-300/60 mt-1 leading-relaxed">
            Asigná aula/horario clase por clase (podés usar la sugerencia del motor heurístico), enviá tu
            planificación para que el sistema la valide contra lo ya confirmado por otras carreras, y confirmá
            para bloquearla. Podés reabrir el borrador en cualquier momento antes de la fecha límite.
          </p>
        </div>
      </div>

      <AsignarAulaModal
        isOpen={!!claseParaAsignar}
        onClose={() => setClaseParaAsignar(null)}
        clase={claseParaAsignar}
        carreraId={carreraId}
        onAsignar={handleAsignarLocal}
      />

      <ConflictosModal
        isOpen={conflictos.length > 0}
        onClose={() => setConflictos([])}
        conflictos={conflictos}
        clases={clases}
        onUsarAlternativa={handleUsarAlternativaConflicto}
      />
    </div>
  );
}
