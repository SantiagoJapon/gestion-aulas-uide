import { useState } from 'react';
import DashboardWidget from '../../dashboard/DashboardWidget';
import { Button } from '../../common/Button';
import { Wand2, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import {
  planificacionCarreraService,
  type PropuestaFillGaps,
  type SinAsignarFillGaps,
  type SinCambiosFillGaps,
  type EstadisticasFillGaps,
} from '../../../services/api';

/**
 * Distribución general "llenar huecos" (Fase 3,
 * distribucion.service.js#calcularDistribucionFillGaps). Solo opera
 * sobre clases LIBRE/sin asignar — nunca toca lo CONFIRMADO.
 *
 * El panel muestra DOS listas, no una: lo que se va a asignar y lo que
 * queda fijo. §3.4 pide que el admin apruebe con las dos a la vista;
 * mostrar solo los cambios lo dejaba aprobando a ciegas sobre la mitad de
 * la ecuación.
 */
export default function CompletarHuecosPanel() {
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [propuestas, setPropuestas] = useState<PropuestaFillGaps[]>([]);
  const [sinCambios, setSinCambios] = useState<SinCambiosFillGaps[]>([]);
  const [sinAsignar, setSinAsignar] = useState<SinAsignarFillGaps[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasFillGaps | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const limpiar = () => {
    setPreviewId(null);
    setPropuestas([]);
    setSinCambios([]);
    setSinAsignar([]);
    setEstadisticas(null);
  };

  const handleCalcular = async () => {
    setCalculando(true);
    setMensaje(null);
    try {
      const res = await planificacionCarreraService.calcularFillGaps();
      setPreviewId(res.previewId);
      setPropuestas(res.propuestas);
      setSinCambios(res.sinCambios);
      setSinAsignar(res.sinAsignar);
      setEstadisticas(res.estadisticas);
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al calcular' });
    } finally {
      setCalculando(false);
    }
  };

  const handleAplicar = async () => {
    if (previewId === null || propuestas.length === 0) return;
    const confirmacion = sinCambios.length > 0
      ? `¿Aplicar ${propuestas.length} asignación(es)? ${sinCambios.length} clase(s) quedan intactas.`
      : `¿Aplicar ${propuestas.length} asignación(es)?`;
    if (!confirm(confirmacion)) return;

    setAplicando(true);
    setMensaje(null);
    try {
      const res = await planificacionCarreraService.aplicarFillGaps(previewId);
      setMensaje({
        tipo: 'ok',
        texto: `${res.aplicadas.length} clase(s) asignadas.${res.omitidas.length > 0 ? ` ${res.omitidas.length} omitida(s) por conflicto detectado al aplicar.` : ''}`,
      });
      limpiar();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al aplicar' });
    } finally {
      setAplicando(false);
    }
  };

  return (
    <DashboardWidget title="Completar huecos" subtitle="Distribución general — nunca reasigna lo ya confirmado" icon="auto_fix_high">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleCalcular} disabled={calculando}>
            <Wand2 className="size-4 mr-2" /> {calculando ? 'Calculando...' : 'Calcular propuesta'}
          </Button>
          {propuestas.length > 0 && (
            <Button size="sm" variant="secondary" onClick={handleAplicar} disabled={aplicando}>
              <CheckCircle2 className="size-4 mr-2" /> Aplicar {propuestas.length} asignación(es)
            </Button>
          )}
        </div>

        {mensaje && (
          <div className={`p-3 rounded-xl text-xs font-bold ${mensaje.tipo === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {mensaje.texto}
          </div>
        )}

        {estadisticas && (
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-lg font-black text-slate-700">{estadisticas.sinCambios}</p>
              <p className="text-[9px] font-black text-slate-600 uppercase">No cambian</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-lg font-black text-emerald-700">{estadisticas.propuestas}</p>
              <p className="text-[9px] font-black text-emerald-600 uppercase">Se asignan</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <p className="text-lg font-black text-amber-700">{estadisticas.sinAsignar}</p>
              <p className="text-[9px] font-black text-amber-600 uppercase">Sin aula</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border text-center">
              <p className="text-lg font-black text-foreground">{estadisticas.totalClasesEnAlcance}</p>
              <p className="text-[9px] font-black text-muted-foreground uppercase">Total</p>
            </div>
          </div>
        )}

        {propuestas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                Se van a asignar ({propuestas.length})
              </p>
            </div>
          <div className="max-h-[360px] overflow-y-auto custom-scrollbar rounded-2xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-black uppercase text-[9px] text-muted-foreground">Clase</th>
                  <th className="text-left p-3 font-black uppercase text-[9px] text-muted-foreground">Horario</th>
                  <th className="text-left p-3 font-black uppercase text-[9px] text-muted-foreground">Aula sugerida</th>
                </tr>
              </thead>
              <tbody>
                {propuestas.map((p) => (
                  <tr key={p.claseId} className="border-t border-border">
                    <td className="p-3 font-bold text-foreground">
                      {p.materia}
                      {p.carrera && <span className="block text-[10px] text-muted-foreground font-normal">{p.carrera}</span>}
                    </td>
                    <td className="p-3 text-muted-foreground font-bold">{p.dia} {p.horaInicio}-{p.horaFin}</td>
                    <td className="p-3 font-bold text-foreground">
                      {p.aulaCodigo}
                      {p.isOvercapacity && <span className="ml-1 text-[9px] text-amber-600 font-black">SOBRECUPO</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {sinCambios.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="size-4 text-slate-500" />
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                No cambian ({sinCambios.length})
              </p>
            </div>
            <div className="max-h-[280px] overflow-y-auto custom-scrollbar rounded-2xl border border-border bg-slate-50/40">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-black uppercase text-[9px] text-muted-foreground">Clase</th>
                    <th className="text-left p-3 font-black uppercase text-[9px] text-muted-foreground">Ubicación actual</th>
                    <th className="text-left p-3 font-black uppercase text-[9px] text-muted-foreground">Por qué</th>
                  </tr>
                </thead>
                <tbody>
                  {sinCambios.map((s) => (
                    <tr key={s.claseId} className="border-t border-border">
                      <td className="p-3 font-bold text-foreground">
                        {s.materia}
                        {s.carrera && <span className="block text-[10px] text-muted-foreground font-normal">{s.carrera}</span>}
                      </td>
                      <td className="p-3 text-muted-foreground font-bold">
                        {s.aulaCodigo || '—'}
                        {s.dia && <span className="block text-[10px] font-normal">{s.dia} {s.horaInicio}-{s.horaFin}</span>}
                      </td>
                      <td className="p-3 text-[11px] text-slate-600 font-bold">{s.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {sinAsignar.length > 0 && (
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="size-4 text-amber-600" />
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Sin aula disponible ({sinAsignar.length})</p>
            </div>
            <ul className="space-y-1">
              {sinAsignar.map((s) => (
                <li key={s.claseId} className="text-[11px] text-amber-800 font-bold">{s.materia} — {s.motivo}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}
