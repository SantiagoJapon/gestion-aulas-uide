import CarrerasPendientesPanel from './CarrerasPendientesPanel';
import CompletarHuecosPanel from './CompletarHuecosPanel';
import BloquesConfirmadosPanel from './BloquesConfirmadosPanel';
import GestionarFlujosPanel from './GestionarFlujosPanel';

/**
 * Vista admin del módulo de planificación colaborativa (Fase 5c).
 * 4 paneles independientes, cada uno con su propia carga de datos, sin
 * estado compartido — mismo patrón de composición que
 * PlanificacionColaborativa.tsx (director).
 */
export default function PlanificacionAdmin() {
  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <GestionarFlujosPanel />
      <CarrerasPendientesPanel />
      <CompletarHuecosPanel />
      <BloquesConfirmadosPanel />
    </div>
  );
}
