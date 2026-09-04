import { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { Sparkles } from 'lucide-react';
import {
  planificacionCarreraService,
  aulaService,
  type BloquePropuesto,
  type SugerenciaAula,
  type ClaseConEstadoDistribucion,
  type Aula,
} from '../../../services/api';

interface AsignarAulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  clase: ClaseConEstadoDistribucion | null;
  carreraId: number;
  onAsignar: (bloque: BloquePropuesto) => void;
}

/**
 * Modal de asignación de aula para el director. Ofrece la sugerencia del
 * motor heurístico (planificacionCarreraService.sugerirAula — wrapper de
 * lectura sobre el motor existente, nunca decide por sí solo) más
 * selección manual. El resultado se acumula localmente en el componente
 * padre (bloquesPendientes) — no se persiste hasta "Enviar Planificación".
 */
export default function AsignarAulaModal({ isOpen, onClose, clase, carreraId, onAsignar }: AsignarAulaModalProps) {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [aulaId, setAulaId] = useState<number | ''>('');
  const [dia, setDia] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [sugerencia, setSugerencia] = useState<SugerenciaAula | null>(null);
  const [loadingSugerencia, setLoadingSugerencia] = useState(false);

  useEffect(() => {
    if (isOpen && clase) {
      setDia(clase.dia || '');
      setHoraInicio(clase.hora_inicio || '');
      setHoraFin(clase.hora_fin || '');
      setAulaId('');
      setSugerencia(null);
      cargarAulas();
      cargarSugerencia();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, clase?.id]);

  const cargarAulas = async () => {
    try {
      const res = await aulaService.getAulas({ estado: 'disponible' });
      if (res.success) setAulas(res.aulas);
    } catch {
      // No crítico: el selector manual queda vacío, la sugerencia IA sigue funcionando
    }
  };

  const cargarSugerencia = async () => {
    if (!clase) return;
    setLoadingSugerencia(true);
    try {
      const res = await planificacionCarreraService.sugerirAula(carreraId, clase.id);
      setSugerencia(res.success ? res.sugerencia : null);
    } catch {
      setSugerencia(null);
    } finally {
      setLoadingSugerencia(false);
    }
  };

  const usarSugerencia = () => {
    if (sugerencia) setAulaId(sugerencia.aulaId);
  };

  const handleGuardar = () => {
    if (!clase || !aulaId || !dia || !horaInicio || !horaFin) return;
    onAsignar({ claseId: clase.id, aulaId: Number(aulaId), dia, horaInicio, horaFin });
    onClose();
  };

  if (!clase) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asignar aula" size="md">
      <div className="space-y-5 p-1">
        <div className="p-4 bg-muted/30 rounded-2xl border border-border">
          <p className="text-sm font-black text-foreground">{clase.materia}</p>
          <p className="text-[11px] text-muted-foreground font-bold mt-1">
            {clase.docente || 'Sin docente'} · {clase.num_estudiantes || 0} estudiantes
          </p>
        </div>

        {/* Sugerencia del motor heurístico */}
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Sugerencia del motor heurístico</span>
          </div>
          {loadingSugerencia ? (
            <p className="text-xs text-muted-foreground">Calculando...</p>
          ) : sugerencia ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{sugerencia.aulaCodigo}</p>
                {sugerencia.isOvercapacity && (
                  <p className="text-[10px] text-amber-600 font-bold mt-0.5">⚠ Sobrecupo — capacidad ajustada</p>
                )}
              </div>
              <Button size="sm" variant="secondary" onClick={usarSugerencia}>Usar esta</Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin alternativas disponibles en ese horario.</p>
          )}
        </div>

        {/* Selección manual */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aula</label>
            <select
              value={aulaId}
              onChange={(e) => setAulaId(e.target.value ? Number(e.target.value) : '')}
              className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Seleccionar aula...</option>
              {aulas.map((a) => (
                <option key={a.id} value={a.id}>{a.codigo} — {a.nombre} (cap. {a.capacidad})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase">Día</label>
              <input value={dia} onChange={(e) => setDia(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-sm font-bold mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase">Inicio</label>
              <input value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} placeholder="08:00" className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-sm font-bold mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase">Fin</label>
              <input value={horaFin} onChange={(e) => setHoraFin(e.target.value)} placeholder="10:00" className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-sm font-bold mt-1" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" fullWidth onClick={onClose}>Cancelar</Button>
          <Button fullWidth disabled={!aulaId || !dia || !horaInicio || !horaFin} onClick={handleGuardar}>
            Asignar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
