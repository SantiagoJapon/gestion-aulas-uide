import { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { AlertTriangle } from 'lucide-react';
import {
  planificacionCarreraService,
  aulaService,
  type BloqueDisponibilidad,
  type ClaseConEstadoDistribucion,
  type Aula,
} from '../../../services/api';

interface ReasignacionExcepcionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  bloque: BloqueDisponibilidad | null;
  clase: ClaseConEstadoDistribucion | null;
  onReasignado: () => void;
}

// Debe coincidir con MOTIVO_LONGITUD_MINIMA en
// planificacionCarrera.service.js — el backend es la fuente de verdad
// (§3.5: "validar longitud mínima en backend, no confiar solo en el
// frontend"), esto es solo para no hacerle escribir y recién enterarse
// del error de 400 después de enviar.
const MOTIVO_LONGITUD_MINIMA = 15;

/**
 * Reasignación excepcional de un bloque CONFIRMADO. El motivo es
 * obligatorio y necesita al menos MOTIVO_LONGITUD_MINIMA caracteres — el
 * backend rechaza cualquier otra cosa, este check solo evita el viaje
 * redondo.
 * Aula/día/hora son opcionales: dejarlos en blanco mantiene el valor
 * actual del bloque (mismo comportamiento que el backend).
 */
export default function ReasignacionExcepcionalModal({ isOpen, onClose, bloque, clase, onReasignado }: ReasignacionExcepcionalModalProps) {
  const [motivo, setMotivo] = useState('');
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [nuevaAulaId, setNuevaAulaId] = useState<number | ''>('');
  const [nuevoDia, setNuevoDia] = useState('');
  const [nuevaHoraInicio, setNuevaHoraInicio] = useState('');
  const [nuevaHoraFin, setNuevaHoraFin] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMotivo('');
      setNuevaAulaId('');
      setNuevoDia('');
      setNuevaHoraInicio('');
      setNuevaHoraFin('');
      setError(null);
      aulaService.getAulas({ estado: 'disponible' }).then((res) => {
        if (res.success) setAulas(res.aulas);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!bloque) return null;

  const motivoValido = motivo.trim().length >= MOTIVO_LONGITUD_MINIMA;

  const handleSubmit = async () => {
    if (!motivoValido) return;
    setEnviando(true);
    setError(null);
    try {
      await planificacionCarreraService.reasignacionExcepcional({
        bloqueId: bloque.id,
        motivo: motivo.trim(),
        nuevaAulaId: nuevaAulaId || undefined,
        nuevoDia: nuevoDia || undefined,
        nuevaHoraInicio: nuevaHoraInicio || undefined,
        nuevaHoraFin: nuevaHoraFin || undefined,
      });
      onReasignado();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al reasignar');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reasignación excepcional" size="md">
      <div className="space-y-5 p-1">
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Este bloque ya está <strong>CONFIRMADO</strong> por un director. Reasignarlo es una excepción — se
            registrará con tu motivo y se notificará automáticamente al director afectado.
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-2xl border border-border">
          <p className="text-sm font-black text-foreground">{clase?.materia || `Clase #${bloque.clase_id}`}</p>
          <p className="text-[11px] text-muted-foreground font-bold mt-1">
            Actual: {bloque.dia} {bloque.hora_inicio}-{bloque.hora_fin}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Motivo (obligatorio)</label>
            <span className={`text-[10px] font-bold ${motivoValido ? 'text-muted-foreground' : 'text-amber-600'}`}>
              {motivo.trim().length}/{MOTIVO_LONGITUD_MINIMA} mín.
            </span>
          </div>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary outline-none resize-none"
            placeholder="Explicá por qué es necesaria esta reasignación excepcional (mín. 15 caracteres)..."
          />
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Nuevo aula/horario (opcional — dejá en blanco para mantener el actual)
          </p>
          <select
            value={nuevaAulaId}
            onChange={(e) => setNuevaAulaId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-4 py-2.5 bg-slate-50 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">Mantener aula actual</option>
            {aulas.map((a) => (
              <option key={a.id} value={a.id}>{a.codigo} — {a.nombre} (cap. {a.capacidad})</option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-3">
            <input value={nuevoDia} onChange={(e) => setNuevoDia(e.target.value)} placeholder="Día" className="px-3 py-2 bg-slate-50 border border-border rounded-xl text-sm font-bold" />
            <input value={nuevaHoraInicio} onChange={(e) => setNuevaHoraInicio(e.target.value)} placeholder="08:00" className="px-3 py-2 bg-slate-50 border border-border rounded-xl text-sm font-bold" />
            <input value={nuevaHoraFin} onChange={(e) => setNuevaHoraFin(e.target.value)} placeholder="10:00" className="px-3 py-2 bg-slate-50 border border-border rounded-xl text-sm font-bold" />
          </div>
        </div>

        {error && <div className="p-3 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200">{error}</div>}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" fullWidth onClick={onClose}>Cancelar</Button>
          <Button fullWidth disabled={!motivoValido || enviando} onClick={handleSubmit}>
            {enviando ? 'Reasignando...' : 'Confirmar reasignación'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
