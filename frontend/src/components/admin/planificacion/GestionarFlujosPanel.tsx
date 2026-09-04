import { useState, useEffect, useCallback } from 'react';
import DashboardWidget from '../../dashboard/DashboardWidget';
import { Button } from '../../common/Button';
import { Calendar, Clock, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import {
  carreraService,
  planificacionCarreraService,
  type Carrera,
  type FlujoPlanificacion,
} from '../../../services/api';

interface FlujoConCarrera extends FlujoPlanificacion {
  carrera?: { id: number; carrera: string };
}

/**
 * Panel admin para gestionar flujos de planificación: crear flujos
 * con fecha límite, ver estado de todas las carreras, y extender plazos.
 * Alimenta el módulo de planificación colaborativa (Fase 4).
 */
export default function GestionarFlujosPanel() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [flujos, setFlujos] = useState<FlujoConCarrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [seleccionCarrera, setSeleccionCarrera] = useState<number | ''>('');
  const [nuevaFechaLimite, setNuevaFechaLimite] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [resCarreras, resVencidas] = await Promise.all([
        carreraService.getCarreras(),
        planificacionCarreraService.detectarCarrerasSinEnviar(),
      ]);
      if (resCarreras.success) setCarreras(resCarreras.carreras);
      if (resVencidas.success) setFlujos(resVencidas.vencidas);
    } catch (err) {
      console.error('Error cargando datos de flujos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCrearFlujo = async () => {
    if (!seleccionCarrera) return;
    setCreando(true);
    setMensaje(null);
    try {
      await planificacionCarreraService.crearFlujo(
        Number(seleccionCarrera),
        undefined,
        nuevaFechaLimite || undefined
      );
      setMensaje({ tipo: 'ok', texto: 'Flujo de planificación creado/actualizado.' });
      setSeleccionCarrera('');
      setNuevaFechaLimite('');
      await cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al crear flujo' });
    } finally {
      setCreando(false);
    }
  };

  const carrerasSinFlujo = carreras.filter(
    (c) => !flujos.some((f) => f.carrera_id === c.id)
  );

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'BORRADOR':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200"><Clock className="size-3" /> Borrador</span>;
      case 'ENVIADA':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-200"><AlertTriangle className="size-3" /> Enviada</span>;
      case 'CONFIRMADA':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="size-3" /> Confirmada</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">{estado}</span>;
    }
  };

  return (
    <DashboardWidget title="Gestionar flujos de planificación" subtitle="Crear flujos y establecer fechas límite por carrera" icon="calendar_month">
      <div className="space-y-5">
        {mensaje && (
          <div className={`p-3 rounded-xl text-xs font-bold ${mensaje.tipo === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {mensaje.texto}
          </div>
        )}

        {/* Crear nuevo flujo */}
        <div className="p-4 rounded-2xl border border-border bg-muted/20">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Crear/actualizar flujo</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[9px] font-black text-muted-foreground uppercase">Carrera</label>
              <select
                value={seleccionCarrera}
                onChange={(e) => setSeleccionCarrera(e.target.value ? Number(e.target.value) : '')}
                className="w-full mt-1 px-3 py-2 bg-white border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Seleccionar carrera...</option>
                {carreras.map((c) => (
                  <option key={c.id} value={c.id}>{c.carrera}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[160px]">
              <label className="text-[9px] font-black text-muted-foreground uppercase">Fecha límite</label>
              <input
                type="datetime-local"
                value={nuevaFechaLimite}
                onChange={(e) => setNuevaFechaLimite(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <Button size="sm" onClick={handleCrearFlujo} disabled={!seleccionCarrera || creando}>
              <Plus className="size-4 mr-1" /> {creando ? 'Creando...' : 'Crear'}
            </Button>
          </div>
        </div>

        {/* Flujos existentes */}
        {loading ? (
          <p className="text-xs text-muted-foreground font-bold p-4">Cargando...</p>
        ) : flujos.length === 0 && carrerasSinFlujo.length === 0 ? (
          <p className="text-xs text-muted-foreground font-bold p-4">No hay carreras registradas en el sistema.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
            {flujos.map((flujo) => (
              <div key={flujo.id} className="p-3 rounded-2xl border border-border bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-foreground truncate">{flujo.carrera?.carrera || `Carrera #${flujo.carrera_id}`}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">
                      {flujo.fecha_limite
                        ? `Límite: ${new Date(flujo.fecha_limite).toLocaleDateString('es-EC')} ${new Date(flujo.fecha_limite).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`
                        : 'Sin fecha límite'}
                    </p>
                  </div>
                </div>
                {estadoBadge(flujo.estado)}
              </div>
            ))}
            {carrerasSinFlujo.length > 0 && (
              <>
                <div className="pt-2 border-t border-border">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sin flujo creado</p>
                </div>
                {carrerasSinFlujo.map((c) => (
                  <div key={c.id} className="p-3 rounded-2xl border border-dashed border-border bg-muted/10 flex items-center gap-3">
                    <Calendar className="size-4 text-muted-foreground shrink-0" />
                    <p className="text-xs font-bold text-muted-foreground">{c.carrera}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}
