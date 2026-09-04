import { useState, useEffect, useCallback } from 'react';
import DashboardWidget from '../../dashboard/DashboardWidget';
import { Button } from '../../common/Button';
import { Lock, ShieldAlert } from 'lucide-react';
import {
  carreraService,
  planificacionCarreraService,
  distribucionService,
  type Carrera,
  type BloqueDisponibilidad,
  type ClaseConEstadoDistribucion,
} from '../../../services/api';
import ReasignacionExcepcionalModal from './ReasignacionExcepcionalModal';

interface BloqueConfirmadoRow {
  bloque: BloqueDisponibilidad;
  clase: ClaseConEstadoDistribucion | undefined;
}

/**
 * Punto de entrada de la reasignación excepcional: el admin elige una
 * carrera, ve sus bloques CONFIRMADO (planificacionCarrera.service.js
 * los expone vía obtenerEstado — accesible a admin para cualquier
 * carrera) y dispara el modal con motivo obligatorio para reasignar
 * uno puntual.
 */
export default function BloquesConfirmadosPanel() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [carreraId, setCarreraId] = useState<number | ''>('');
  const [rows, setRows] = useState<BloqueConfirmadoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<BloqueConfirmadoRow | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    carreraService.getCarreras().then((res) => {
      if (res.success) setCarreras(res.carreras);
    }).catch(() => {});
  }, []);

  const cargarBloques = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const [resClases, resEstado] = await Promise.all([
        distribucionService.getMiDistribucion(id),
        planificacionCarreraService.obtenerEstado(id),
      ]);
      const clases = resClases.success ? resClases.clases : [];
      const confirmados = resEstado.bloques.filter((b) => b.estado === 'CONFIRMADO');
      setRows(confirmados.map((bloque) => ({ bloque, clase: clases.find((c) => c.id === bloque.clase_id) })));
    } catch (err) {
      console.error('Error cargando bloques confirmados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSeleccionCarrera = (id: number | '') => {
    setCarreraId(id);
    setRows([]);
    setMensaje(null);
    if (id) cargarBloques(id);
  };

  const handleReasignado = () => {
    setBloqueSeleccionado(null);
    setMensaje('Bloque reasignado — se notificó al director afectado.');
    if (carreraId) cargarBloques(carreraId);
  };

  return (
    <DashboardWidget title="Reasignación excepcional" subtitle="Solo para casos excepcionales sobre bloques ya confirmados" icon="lock_reset">
      <div className="space-y-4">
        <select
          value={carreraId}
          onChange={(e) => handleSeleccionCarrera(e.target.value ? Number(e.target.value) : '')}
          className="px-4 py-2.5 bg-slate-50 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="">Seleccionar carrera...</option>
          {carreras.map((c) => (
            <option key={c.id} value={c.id}>{c.carrera}</option>
          ))}
        </select>

        {mensaje && (
          <div className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{mensaje}</div>
        )}

        {loading ? (
          <p className="text-xs text-muted-foreground font-bold">Cargando...</p>
        ) : carreraId && rows.length === 0 ? (
          <p className="text-xs text-muted-foreground font-bold">Esta carrera no tiene bloques confirmados.</p>
        ) : rows.length > 0 ? (
          <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
            {rows.map((row) => (
              <div key={row.bloque.id} className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="size-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-foreground truncate">{row.clase?.materia || `Clase #${row.bloque.clase_id}`}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">{row.bloque.dia} {row.bloque.hora_inicio}-{row.bloque.hora_fin}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setBloqueSeleccionado(row)}>
                  <ShieldAlert className="size-4 mr-2" /> Reasignar
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <ReasignacionExcepcionalModal
        isOpen={!!bloqueSeleccionado}
        onClose={() => setBloqueSeleccionado(null)}
        bloque={bloqueSeleccionado?.bloque || null}
        clase={bloqueSeleccionado?.clase || null}
        onReasignado={handleReasignado}
      />
    </DashboardWidget>
  );
}
