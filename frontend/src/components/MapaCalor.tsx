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
    .cell-empty { background-color: #ffffff; border: 1px solid #e5e7eb; }
    .cell-low { background-color: #dcfce7; border: 1px solid #bbf7d0; color: #166534; }
    .cell-medium { background-color: #fef9c3; border: 1px solid #fef08a; color: #854d0e; }
    .cell-high { background-color: #fee2e2; border: 1px solid #fecaca; color: #991b1b; }
    
    .glass-popover {
        backdrop-filter: blur(12px);
        background-color: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(0,0,0,0.05);
    }
  `;

  if (cargando) {
    return (
      <div className="flex items-center justify-center p-24 bg-white rounded-2xl shadow-sm">
        <span className="material-symbols-outlined animate-spin text-uide-blue text-4xl">refresh</span>
        <span className="ml-3 text-slate-500 font-medium">Cargando ocupación...</span>
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-200">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
          <span className="material-symbols-outlined text-3xl text-slate-400">grid_off</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Sin datos disponibles</h3>
        <p className="text-slate-500 mb-6">{error || 'No hay información de distribución para mostrar.'}</p>
        <button onClick={cargarDatos} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0 bg-[#f5f7f8]">
      <style>{styles}</style>

      {/* Header Section */}
      <header className="px-1 pt-2 pb-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{titulo}</h2>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">monitoring</span>
              Monitoreo de ocupación en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-4">
            {showExport && (
              <div className="flex items-center p-1 glass-export-group rounded-xl border border-slate-200 shadow-sm bg-white/50">
                <span className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Exportar</span>
                <div className="h-6 w-px bg-slate-200 mx-1"></div>
                <button title="PDF" className="h-8 w-10 flex items-center justify-center rounded-lg hover:bg-white transition-all text-slate-600">
                  <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                </button>
                <button title="Excel" className="h-8 w-10 flex items-center justify-center rounded-lg hover:bg-white transition-all text-slate-600">
                  <span className="material-symbols-outlined text-xl">table_view</span>
                </button>
              </div>
            )}
            <button onClick={cargarDatos} className="h-10 px-4 flex items-center gap-2 rounded-xl bg-uide-blue text-white font-semibold text-sm shadow-lg shadow-uide-blue/20 hover:brightness-110 transition-all">
              <span className="material-symbols-outlined text-lg">refresh</span>
              Actualizar
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 px-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button className="p-1.5 hover:bg-white rounded-md transition-all text-slate-600">
                <span className="material-symbols-outlined text-xl leading-none">chevron_left</span>
              </button>
              <div className="px-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-uide-blue text-lg">calendar_month</span>
                <span className="text-sm font-semibold whitespace-nowrap text-slate-700">Semana Actual</span>
              </div>
              <button className="p-1.5 hover:bg-white rounded-md transition-all text-slate-600">
                <span className="material-symbols-outlined text-xl leading-none">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Stats Summary Chips */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ocupación Prom.</span>
              <span className="font-black text-slate-700 text-lg leading-none">{datos.estadisticas.promedio_ocupacion}%</span>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clases Totales</span>
              <span className="font-black text-slate-700 text-lg leading-none">{datos.estadisticas.total_clases}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Heat Map Table */}
      <div className="flex-1 flex flex-col relative px-1">
        <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm relative">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <th className="w-24 p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-r border-slate-200">
                  Hora
                </th>
                {DIAS_SEMANA.map((dia, index) => (
                  <th key={dia} className="p-4 text-center">
                    <div className="text-xs font-bold text-slate-500 uppercase">{dia.substring(0, 3)}</div>
                    {/* Placeholder dates just for visual structure */}
                    <div className={`text-lg font-black ${index === 2 ? 'text-uide-blue' : 'text-slate-800'}`}>
                      {20 + index}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {HORAS.map((hora) => (
                <tr key={hora}>
                  <td className="p-4 text-center text-xs font-bold text-slate-500 border-r border-slate-100 bg-slate-50/50">
                    {String(hora).padStart(2, '0')}:00
                  </td>
                  {DIAS_SEMANA.map((dia) => {
                    const punto = obtenerPunto(dia, hora);
                    const nivel = punto?.nivel || 'EMPTY';
                    const config = NIVEL_STYLES[nivel];
                    const detalle = obtenerDetalle(dia, hora);
                    const tieneClases = detalle && detalle.clases.length > 0;
                    const isSelected = puntoSeleccionado?.dia === dia && puntoSeleccionado?.hora === hora;

                    return (
                      <td key={`${dia}-${hora}`} className="p-1 h-20 align-middle">
                        {nivel !== 'EMPTY' ? (
                          <div
                            onClick={() => handleCeldaClick(dia, hora)}
                            className={`h-full w-full rounded-lg ${config.divClass} flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md relative ${isSelected ? 'ring-2 ring-uide-blue ring-offset-2 z-10' : ''}`}
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
        <footer className="mt-6 flex items-center justify-between px-2 mb-8">
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Leyenda de Ocupación</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm cell-empty border border-slate-300"></div>
                <span className="text-xs font-medium text-slate-600">Vacío</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm cell-low"></div>
                <span className="text-xs font-medium text-slate-600">Bajo (&lt; 40%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm cell-medium"></div>
                <span className="text-xs font-medium text-slate-600">Medio (40-69%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm cell-high"></div>
                <span className="text-xs font-medium text-slate-600">Alto (&ge; 70%)</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-medium text-slate-400">
            Datos actualizados en tiempo real
          </div>
        </footer>
      </div>

      {/* Detalle Popover (Modal-like) used when clicking a cell */}
      {puntoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm" onClick={() => setPuntoSeleccionado(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const detalle = obtenerDetalle(puntoSeleccionado.dia, puntoSeleccionado.hora);
              if (!detalle) return null;

              return (
                <>
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-uide-blue animate-pulse"></div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {puntoSeleccionado.dia}, {puntoSeleccionado.hora}:00
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activo</span>
                  </div>
                  <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-slate-500">Ocupación Total:</span>
                      <span className="text-lg font-black text-slate-800">{datos.puntos.find(p => p.dia === puntoSeleccionado.dia && p.hora === puntoSeleccionado.hora)?.porcentaje_ocupacion.toFixed(0)}%</span>
                    </div>

                    {detalle.clases.length > 0 ? (
                      detalle.clases.map((clase, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-uide-blue/30 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-base text-slate-400">book</span>
                              <span className="text-xs font-bold text-slate-700">{clase.materia}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[10px] font-bold shadow-sm">
                              {clase.aula}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 ml-6">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px] text-slate-400">account_circle</span>
                              <span className="text-xs text-slate-600">{clase.docente}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px] text-slate-400">group</span>
                              <span className="text-xs text-slate-500">{clase.estudiantes} estudiantes ({clase.carrera})</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 text-sm py-4">No hay clases registradas</p>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                    <button onClick={() => setPuntoSeleccionado(null)} className="text-xs font-bold text-uide-blue hover:underline">
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
