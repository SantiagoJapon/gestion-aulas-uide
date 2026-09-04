import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { AlertTriangle, Sparkles } from 'lucide-react';
import type { ConflictoEnvio, ClaseConEstadoDistribucion } from '../../../services/api';

interface ConflictosModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictos: ConflictoEnvio[];
  clases: ClaseConEstadoDistribucion[];
  onUsarAlternativa: (claseId: number, aulaId: number) => void;
}

/**
 * Se muestra tras "Enviar Planificación" cuando el backend detecta que
 * uno o más bloques propuestos chocan contra un bloque ya CONFIRMADO de
 * otra carrera. Por cada conflicto ofrece la alternativa calculada por
 * el motor heurístico (si existe) — el director elige, la IA nunca
 * confirma nada sola.
 */
export default function ConflictosModal({ isOpen, onClose, conflictos, clases, onUsarAlternativa }: ConflictosModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conflictos detectados" size="lg">
      <div className="space-y-4 p-1">
        <div className="p-4 bg-red-50 rounded-2xl border border-red-200 flex items-start gap-3">
          <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800 leading-relaxed">
            {conflictos.length} clase(s) chocan con horarios ya <strong>CONFIRMADOS</strong> por otras carreras.
            Elegí una alternativa o cerrá este panel y ajustá manualmente antes de reenviar.
          </p>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
          {conflictos.map((c) => {
            const clase = clases.find((cl) => cl.id === c.claseId);
            return (
              <div key={c.conflictoId} className="p-4 rounded-2xl border border-border bg-card">
                <p className="text-sm font-black text-foreground">{clase?.materia || `Clase #${c.claseId}`}</p>
                {c.sugerencia?.aula ? (
                  <div className="mt-3 flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary shrink-0" />
                      <span className="text-xs font-bold text-foreground">
                        Alternativa: {c.sugerencia.aula}
                        {c.sugerencia.sobrecupo && <span className="text-amber-600"> (sobrecupo)</span>}
                      </span>
                    </div>
                    {c.sugerencia.aulaId && (
                      <Button size="sm" variant="secondary" onClick={() => onUsarAlternativa(c.claseId, c.sugerencia!.aulaId!)}>
                        Usar
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">Sin alternativas disponibles — ajustá manualmente.</p>
                )}
              </div>
            );
          })}
        </div>

        <Button fullWidth onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}
