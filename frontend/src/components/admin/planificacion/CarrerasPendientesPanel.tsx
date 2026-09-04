import { useState, useEffect, useCallback } from 'react';
import DashboardWidget from '../../dashboard/DashboardWidget';
import { Button } from '../../common/Button';
import { AlertTriangle, CalendarPlus } from 'lucide-react';
import { planificacionCarreraService, type FlujoPlanificacion } from '../../../services/api';

/**
 * Carreras cuyo plazo (general o extendido) ya venció sin llegar a
 * CONFIRMADA (planificacionCarrera.service.js#detectarCarrerasSinEnviar).
 * El sistema nunca reabre ni extiende por sí solo — solo detecta y
 * notifica; acá el admin decide si extiende el plazo por carrera
 * individual (nunca sobrescribe el plazo general) o la deja pendiente.
 */
export default function CarrerasPendientesPanel() {
  const [vencidas, setVencidas] = useState<FlujoPlanificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [extendiendoId, setExtendiendoId] = useState<number | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await planificacionCarreraService.detectarCarrerasSinEnviar();
      if (res.success) setVencidas(res.vencidas);
    } catch (err) {
      console.error('Error cargando carreras vencidas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleExtender = async (carreraId: number) => {
    if (!nuevaFecha) return;
    setProcesando(true);
    setMensaje(null);
    try {
      await planificacionCarreraService.extenderFechaLimite(carreraId, nuevaFecha);
      setMensaje('Plazo extendido para esta carrera.');
      setExtendiendoId(null);
      setNuevaFecha('');
      await cargar();
    } catch (err: any) {
      setMensaje(err.response?.data?.error || 'Error al extender el plazo');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <DashboardWidget title="Carreras con plazo vencido" subtitle="No enviaron/confirmaron su planificación a tiempo" icon="warning">
      {loading ? (
        <p className="text-xs text-muted-foreground font-bold p-4">Cargando...</p>
      ) : vencidas.length === 0 ? (
        <p className="text-xs text-muted-foreground font-bold p-4">Todas las carreras están al día.</p>
      ) : (
        <div className="space-y-3">
          {mensaje && (
            <div className="p-3 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">{mensaje}</div>
          )}
          {vencidas.map((flujo) => (
            <div key={flujo.id} className="p-4 rounded-2xl border border-red-200 bg-red-50/50 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-5 text-red-600 shrink-0" />
                <div>
                  <p className="text-sm font-black text-foreground">{flujo.carrera?.carrera || `Carrera #${flujo.carrera_id}`}</p>
                  <p className="text-[11px] text-muted-foreground font-bold">
                    Estado: {flujo.estado} · Fecha límite: {flujo.fecha_limite ? new Date(flujo.fecha_limite).toLocaleDateString('es-EC') : '—'}
                  </p>
                </div>
              </div>
              {extendiendoId === flujo.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="px-3 py-2 bg-white border border-border rounded-xl text-xs font-bold"
                  />
                  <Button size="sm" disabled={!nuevaFecha || procesando} onClick={() => handleExtender(flujo.carrera_id)}>
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setExtendiendoId(null); setNuevaFecha(''); }}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setExtendiendoId(flujo.id)}>
                  <CalendarPlus className="size-4 mr-2" /> Extender plazo
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardWidget>
  );
}
