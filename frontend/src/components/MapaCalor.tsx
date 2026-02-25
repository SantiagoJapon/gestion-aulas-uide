import { useState, useEffect } from 'react';
import { distribucionService, type MapaCalorResponse, type PuntoMapaCalor } from '../services/api';

interface MapaCalorProps {
  carreraId?: number;
  titulo?: string;
  showExport?: boolean;
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORAS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

const NIVEL_STYLES = {
  EMPTY: {
    divClass: 'cell-empty',
    textClass: 'text-slate-600',
    label: 'EMPTY',
    ring: 'ring-gray-200'
  },
  LOW: {
    divClass: 'cell-low',
    textClass: 'text-emerald-800',
    label: 'LOW',
    ring: 'ring-emerald-200'
  },
  MEDIUM: {
    divClass: 'cell-medium',
    textClass: 'text-yellow-800',
    label: 'MEDIUM',
    ring: 'ring-yellow-200'
  },
  HIGH: {
    divClass: 'cell-high',
    textClass: 'text-rose-800',
    label: 'HIGH',
    ring: 'ring-rose-200'
  }
};

export default function MapaCalor({ carreraId, titulo = 'Mapa de Calor', showExport = true }: MapaCalorProps) {
  const [datos, setDatos] = useState<MapaCalorResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string>('');
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<{ dia: string; hora: number } | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [carreraId]);

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const response = await distribucionService.getMapaCalor(carreraId);
      setDatos(response);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('');
        setDatos(null);
      } else {
        setError(err.response?.data?.mensaje || 'Error al cargar mapa de calor');
      }
    } finally {
      setCargando(false);
    }
  };

  const obtenerPunto = (dia: string, hora: number): PuntoMapaCalor | null => {
    if (!datos) return null;
    return datos.puntos.find(p => p.dia === dia && p.hora === hora) || null;
  };

  const obtenerDetalle = (dia: string, hora: number) => {
    if (!datos) return null;
    return datos.detalles.find(d => d.dia === dia && d.hora === hora);
  };

  const handleCeldaClick = (dia: string, hora: number) => {
    const detalle = obtenerDetalle(dia, hora);
    if (detalle && detalle.clases.length > 0) {
      setPuntoSeleccionado({ dia, hora });
    }
  };

  // Custom CSS for the heat map styles
  const styles = `
    .glass-export-group {
      backdrop-filter: blur(8px);
      background-color: rgba(255, 255, 255, 0.6);
    }
    .dark .glass-export-group {
      background-color: rgba(1, 1, 4, 0.6);
    }

    .cell-empty { background-color: #ffffff; border: 1px solid #e5e7eb; }
    .cell-low { background-color: #dcfce7; border: 1px solid #bbf7d0; color: #166534; }
    .cell-medium { background-color: #fef9c3; border: 1px solid #fef08a; color: #854d0e; }
    .cell-high { background-color: #fee2e2; border: 1px solid #fecaca; color: #991b1b; }

    .dark .cell-empty { background-color: #010104; border-color: #1f2937; }
    .dark .cell-low { background-color: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.5); color: #bbf7d0; }
    .dark .cell-medium { background-color: rgba(255, 192, 20, 0.18); border-color: rgba(255, 192, 20, 0.55); color: #fde68a; }
    .dark .cell-high { background-color: rgba(255, 112, 146, 0.23); border-color: rgba(255, 112, 146, 0.6); color: #fecaca; }
    
    .glass-popover {
        backdrop-filter: blur(12px);
        background-color: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(0,0,0,0.05);
    }
    .dark .glass-popover {
        background-color: rgba(1, 1, 4, 0.96);
        border-color: rgba(148, 163, 184, 0.35);
    }
  `;

  if (cargando) {
    return (
      <div className="flex items-center justify-center p-24 bg-card rounded-2xl shadow-sm border border-border">
        <span className="material-symbols-outlined animate-spin text-uide-blue text-4xl">refresh</span>
        <span className="ml-3 text-muted-foreground font-medium">Cargando ocupación...</span>
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="bg-card rounded-2xl shadow-sm p-12 text-center border border-border">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <span className="material-symbols-outlined text-3xl text-muted-foreground">grid_off</span>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">Sin datos disponibles</h3>
        <p className="text-muted-foreground mb-6">{error || 'No hay información de distribución para mostrar.'}</p>
        <button
          onClick={cargarDatos}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0 bg-transparent">
      <style>{styles}</style>

      {/* Header Section */}
      <header className="px-1 pt-2 pb-4 lg:pb-6 flex flex-col gap-4 lg:gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">{titulo}</h2>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm lg:text-base">
              <span className="material-symbols-outlined text-lg">monitoring</span>
              Monitoreo en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {showExport && (
              <div className="flex items-center p-1 glass-export-group rounded-xl border border-border shadow-sm bg-white/50 dark:bg-black/30 shrink-0">
                <span className="px-2 lg:px-3 text-[10px] lg:text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Exp.</span>
                <div className="h-6 w-px bg-border mx-1"></div>
                <button title="PDF" className="h-8 w-10 flex items-center justify-center rounded-lg hover:bg-card transition-all text-muted-foreground">
                  <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                </button>
                <button title="Excel" className="h-8 w-10 flex items-center justify-center rounded-lg hover:bg-card transition-all text-muted-foreground">
                  <span className="material-symbols-outlined text-xl">table_view</span>
                </button>
              </div>
            )}
            <button
              onClick={cargarDatos}
              className="h-10 px-3 lg:px-4 flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Actualizar
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 lg:py-4 px-4 lg:px-5 bg-card rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
              <button className="p-1 hover:bg-card rounded-md transition-all text-muted-foreground">
                <span className="material-symbols-outlined text-xl leading-none">chevron_left</span>
              </button>
              <div className="px-2 lg:px-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">calendar_month</span>
                <span className="text-xs lg:text-sm font-semibold whitespace-nowrap text-foreground">Semana Actual</span>
              </div>
              <button className="p-1 hover:bg-card rounded-md transition-all text-muted-foreground">
                <span className="material-symbols-outlined text-xl leading-none">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Stats Summary Chips */}
          <div className="flex items-center gap-4 lg:gap-6 text-sm ml-auto md:ml-0">
            <div className="flex flex-col items-end">
              <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ocupación</span>
              <span className="font-black text-foreground text-base lg:text-lg leading-none">{datos.estadisticas.promedio_ocupacion}%</span>
            </div>
            <div className="h-8 w-px bg-border"></div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Clases</span>
              <span className="font-black text-foreground text-base lg:text-lg leading-none">{datos.estadisticas.total_clases}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Heat Map Table */}
      <div className="flex-1 flex flex-col relative px-1 overflow-hidden">
        <div className="flex-1 overflow-auto rounded-2xl border border-border bg-card shadow-sm relative">
          <table className="w-full border-collapse min-w-[650px]">
            <thead>
              <tr className="sticky top-0 z-10 bg-muted border-b border-border">
                <th className="w-20 lg:w-24 p-2 lg:p-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted border-r border-border">
                  Hora
                </th>
                {DIAS_SEMANA.map((dia, index) => (
                  <th key={dia} className="p-4 text-center">
                    <div className="text-xs font-bold text-muted-foreground uppercase">{dia.substring(0, 3)}</div>
                    {/* Placeholder dates just for visual structure */}
                    <div className={`text-lg font-black ${index === 2 ? 'text-primary' : 'text-foreground'}`}>
                      {20 + index}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {HORAS.map((hora) => (
                <tr key={hora}>
                  <td className="p-4 text-center text-xs font-bold text-muted-foreground border-r border-border/40 bg-muted/40">
                    {String(hora).padStart(2, '0')}:00
                  </td>
                  {DIAS_SEMANA.map((dia) => {
                    const punto = obtenerPunto(dia, hora);
                    const nivel = punto?.nivel || 'EMPTY';
                    const config = NIVEL_STYLES[nivel];
                    const isSelected = puntoSeleccionado?.dia === dia && puntoSeleccionado?.hora === hora;

                    return (
                      <td key={`${dia}-${hora}`} className="p-1 h-20 align-middle">
                        {nivel !== 'EMPTY' ? (
                          <div
                            onClick={() => handleCeldaClick(dia, hora)}
                            className={`h-full w-full rounded-lg ${config.divClass} flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md relative ${isSelected ? 'ring-2 ring-primary ring-offset-2 z-10' : ''}`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-tight">{config.label}</span>
                            <span className="text-[10px] opacity-70 font-medium mt-0.5">{punto?.porcentaje_ocupacion.toFixed(0)}%</span>
                          </div>
                        ) : (
                          <div className={`h-full w-full rounded-lg ${config.divClass}`}></div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend Footer */}
        <footer className="mt-4 lg:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-6">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Leyenda de Ocupación</span>
            <div className="flex flex-wrap items-center gap-3 lg:gap-4">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm cell-empty border border-border/60"></div>
                <span className="text-[10px] lg:text-xs font-medium text-muted-foreground">Vacío</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm cell-low"></div>
                <span className="text-[10px] lg:text-xs font-medium text-muted-foreground">Bajo (&lt; 40%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm cell-medium"></div>
                <span className="text-[10px] lg:text-xs font-medium text-muted-foreground">Medio (40-69%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm cell-high"></div>
                <span className="text-[10px] lg:text-xs font-medium text-muted-foreground">Alto (&ge; 70%)</span>
              </div>
            </div>
          </div>
          <div className="text-[9px] lg:text-[10px] font-medium text-muted-foreground italic">
            Actualización en tiempo real
          </div>
        </footer>
      </div>

      {/* Detalle Popover (Modal-like) used when clicking a cell */}
      {puntoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setPuntoSeleccionado(null)}>
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-border animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const detalle = obtenerDetalle(puntoSeleccionado.dia, puntoSeleccionado.hora);
              if (!detalle) return null;

              return (
                <>
                  <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                      <h4 className="text-sm font-bold text-foreground">
                        {puntoSeleccionado.dia}, {puntoSeleccionado.hora}:00
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Activo</span>
                  </div>
                  <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                      <div className="flex items-center justify_between mb-4">
                      <span className="text-xs text-muted-foreground">Ocupación Total:</span>
                      <span className="text-lg font-black text-foreground">{datos.puntos.find(p => p.dia === puntoSeleccionado.dia && p.hora === puntoSeleccionado.hora)?.porcentaje_ocupacion.toFixed(0)}%</span>
                    </div>

                    {detalle.clases.length > 0 ? (
                      detalle.clases.map((clase, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border transition-colors ${clase.sobrecupo ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' : 'bg-muted/40 border-border hover:border-primary/50'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="material-symbols-outlined text-base text-muted-foreground shrink-0">book</span>
                              <span className="text-xs font-bold text-foreground truncate">{clase.materia}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {clase.sobrecupo && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[9px] font-black uppercase flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">warning</span>
                                  Sobrecupo
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-card border border-border text-muted-foreground rounded text-[10px] font-bold shadow-sm">
                                {clase.aula}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 ml-6">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px] text-muted-foreground">account_circle</span>
                              <span className="text-xs text-muted-foreground">{clase.docente}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px] text-muted-foreground">group</span>
                              <span className={`text-xs font-semibold ${clase.sobrecupo ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                {clase.estudiantes} estudiantes
                                {clase.capacidad_aula > 0 && (
                                  <span className="font-normal text-muted-foreground"> / {clase.capacidad_aula} cap. ({clase.porcentaje_uso}%)</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px] text-muted-foreground">school</span>
                              <span className="text-xs text-muted-foreground">{clase.carrera}</span>
                            </div>
                          </div>
                          {clase.capacidad_aula > 0 && clase.porcentaje_uso !== null && (
                            <div className="mt-2 ml-6">
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${clase.porcentaje_uso > 100 ? 'bg-red-500' : clase.porcentaje_uso >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(clase.porcentaje_uso ?? 0, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground text-sm py-4">No hay clases registradas</p>
                    )}
                  </div>
                  <div className="p-3 bg-muted/40 border-t border-border text-center">
                    <button onClick={() => setPuntoSeleccionado(null)} className="text-xs font-bold text-primary hover:underline">
                      Cerrar Detalle
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
