import { useState, useEffect, useMemo, useCallback } from 'react';
import { distribucionService, type MapaCalorDetalladoResponse, type AulaInfo, type CeldaOcupacion } from '../../services/api';

interface Props {
  carreraId?: number;
  esAdmin?: boolean;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type Franja = '' | 'manana' | 'tarde' | 'noche';

const FRANJA_LABELS: Record<Franja, string> = { '': 'Todo el día', manana: 'Mañana (7-12)', tarde: 'Tarde (13-18)', noche: 'Noche (19-22)' };

const getColor = (pct: number): { bg: string; text: string; border: string; label: string } => {
  if (pct === 0) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'LIBRE' };
  if (pct < 40) return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Baja' };
  if (pct < 80) return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', label: 'Media' };
  return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: 'Alta' };
};

export default function MapaCalorDetallado({ carreraId, esAdmin }: Props) {
  const [data, setData] = useState<MapaCalorDetalladoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [edificio, setEdificio] = useState('');
  const [capacidadMin, setCapacidadMin] = useState(0);
  const [diasSel, setDiasSel] = useState<string[]>([]);
  const [franja, setFranja] = useState<Franja>('');
  const [agrupar, setAgrupar] = useState(false);

  // Tooltip
  const [tooltip, setTooltip] = useState<{ x: number; y: number; aula: AulaInfo; hora: number; dia: string; celda: CeldaOcupacion | null } | null>(null);

  // Alternativas modal
  const [altModal, setAltModal] = useState<{ aula: AulaInfo; hora: number; dia: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (carreraId) params.carrera_id = carreraId;
      if (edificio) params.edificio = edificio;
      if (capacidadMin > 0) params.capacidad_minima = capacidadMin;
      if (diasSel.length > 0) params.dias = diasSel.join(',');
      if (franja) params.franja = franja;
      const res = await distribucionService.getMapaCalorDetallado(params);
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [carreraId, edificio, capacidadMin, diasSel, franja]);

  useEffect(() => { loadData(); }, [loadData]);

  const horasDisplay = useMemo(() => {
    if (!data) return [];
    if (!agrupar) return data.horas;
    const grupos: number[][] = [];
    for (let i = 0; i < data.horas.length; i += 2) {
      grupos.push(data.horas.slice(i, i + 2));
    }
    return grupos;
  }, [data, agrupar]);

  const getKey = (aulaId: number, hora: number, dia: string) => `${aulaId}_${hora}_${dia}`;

  const getOcupacion = (aulaId: number, hora: number | number[], dia: string): CeldaOcupacion | null => {
    if (!data) return null;
    if (Array.isArray(hora)) {
      const values = hora.map(h => data.datos[getKey(aulaId, h, dia)]).filter(Boolean);
      if (values.length === 0) return null;
      const ocup = values.reduce((s, v) => s + (v?.ocupacion || 0), 0) / values.length;
      const first = values[0]!;
      return { ...first, ocupacion: parseFloat(ocup.toFixed(1)) };
    }
    return data.datos[getKey(aulaId, hora, dia)] || null;
  };

  const sugerirAlternativas = (aula: AulaInfo, hora: number, dia: string) => {
    if (!data) return [];
    const key = getKey(aula.id, hora, dia);
    const actual = data.datos[key];
    if (!actual) return [];

    return data.aulas
      .filter(a => a.id !== aula.id && a.capacidad >= actual.estudiantes)
      .map(a => {
        const k = getKey(a.id, hora, dia);
        const c = data.datos[k];
        return { aula: a, ocupacion: c?.ocupacion || 0, clase: c?.clase || null };
      })
      .filter(a => a.ocupacion >= 70)
      .sort((a, b) => b.ocupacion - a.ocupacion)
      .slice(0, 3);
  };

  const edificiosDisponibles = useMemo(() => data?.filtros_disponibles?.edificios || [], [data]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-card rounded-2xl border border-border">
        {esAdmin && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Edificio</label>
            <select value={edificio} onChange={e => setEdificio(e.target.value)} className="px-3 py-2 rounded-xl border border-border bg-background text-sm font-medium">
              <option value="">Todos</option>
              {edificiosDisponibles.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Capacidad min.</label>
          <select value={capacidadMin} onChange={e => setCapacidadMin(Number(e.target.value))} className="px-3 py-2 rounded-xl border border-border bg-background text-sm font-medium">
            <option value={0}>Cualquiera</option>
            <option value={20}>20+</option>
            <option value={30}>30+</option>
            <option value={40}>40+</option>
            <option value={60}>60+</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Franja</label>
          <select value={franja} onChange={e => setFranja(e.target.value as Franja)} className="px-3 py-2 rounded-xl border border-border bg-background text-sm font-medium">
            {Object.entries(FRANJA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Días</label>
          <div className="flex gap-1 flex-wrap">
            {DIAS.map(d => (
              <button key={d} onClick={() => setDiasSel(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all ${diasSel.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/50'}`}>
                {d.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={agrupar} onChange={e => setAgrupar(e.target.checked)} className="rounded border-border" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Agrupar 2h</span>
          </label>
        </div>
        <button onClick={loadData} disabled={loading} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50">
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Stats */}
      {data && (
        <div className="flex gap-4 text-sm">
          <div className="px-4 py-2 bg-card rounded-xl border border-border"><span className="font-bold">{data.estadisticas.total_aulas}</span> aulas</div>
          <div className="px-4 py-2 bg-card rounded-xl border border-border">Ocupación promedio: <span className="font-bold">{data.estadisticas.promedio_ocupacion}%</span></div>
        </div>
      )}

      {/* Table */}
      {loading && <div className="flex items-center justify-center p-24"><span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span></div>}
      {error && <div className="p-6 bg-red-50 rounded-2xl text-red-700 font-medium">{error}</div>}
      {!loading && !error && data && (
        <div className="relative overflow-auto rounded-2xl border border-border bg-card shadow-sm max-h-[70vh]" onMouseLeave={() => setTooltip(null)}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="sticky top-0 z-20 bg-muted border-b border-border">
                <th className="sticky left-0 z-30 bg-muted p-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border min-w-[80px]">
                  Hora \ Aula
                </th>
                {data.aulas.map(aula => (
                  <th key={aula.id} className="p-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border/50 min-w-[90px] max-w-[120px]">
                    <div className="truncate">{aula.codigo}</div>
                    <div className="text-[8px] font-normal text-muted-foreground/60">{aula.capacidad} cupos</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(agrupar ? horasDisplay as number[][] : data.horas.map(h => [h])).map((hGroup, hi) => (
                <tr key={hi} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="sticky left-0 z-10 bg-card p-2 text-[10px] font-bold text-muted-foreground border-r border-border/40 whitespace-nowrap">
                    {agrupar
                      ? `${String(hGroup[0]).padStart(2, '0')}:00 - ${String(hGroup[1]).padStart(2, '0')}:00`
                      : `${String(hGroup[0]).padStart(2, '0')}:00`}
                  </td>
                  {data.dias.map(dia => (
                    data.aulas.map(aula => {
                      const celda = getOcupacion(aula.id, hGroup.length === 1 ? hGroup[0] : hGroup, dia);
                      const pct = celda?.ocupacion ?? 0;
                      const colors = getColor(pct);
                      return (
                        <td
                          key={`${dia}-${aula.id}-${hi}`}
                          className={`p-1 border-r border-border/30 relative ${colors.bg} ${colors.border} border-b`}
                          onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setTooltip({ x: rect.left, y: rect.top - 10, aula, hora: hGroup[0], dia, celda });
                          }}
                          onMouseMove={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setTooltip(prev => prev ? { ...prev, x: rect.left, y: rect.top - 10 } : null);
                          }}
                        >
                          <div className="flex flex-col items-center justify-center h-10">
                            <span className={`font-black text-[11px] ${colors.text}`}>
                              {pct === 0 ? '—' : `${pct}%`}
                            </span>
                            {pct === 0 && celda === null && (
                              <span className="text-[7px] font-bold text-emerald-600 uppercase tracking-wider">Libre</span>
                            )}
                            {pct < 40 && pct > 0 && (
                              <div className="absolute -top-0.5 -right-0.5">
                                <span className="material-symbols-outlined text-[10px] text-amber-500">warning</span>
                              </div>
                            )}
                          </div>
                          {/* Buscar alternativas button */}
                          {celda && pct < 40 && (
                            <button
                              onClick={() => setAltModal({ aula, hora: hGroup[0], dia })}
                              className="absolute bottom-0.5 right-0.5 opacity-0 hover:opacity-100 transition-opacity"
                              title="Buscar alternativas"
                            >
                              <span className="material-symbols-outlined text-[10px] text-primary">swap_horiz</span>
                            </button>
                          )}
                        </td>
                      );
                    })
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="fixed z-50 pointer-events-none p-3 rounded-xl bg-white border border-border shadow-xl text-xs max-w-[220px]"
              style={{ left: tooltip.x + 10, top: tooltip.y - 120 }}
            >
              <p className="font-black text-sm text-foreground">{tooltip.aula.nombre} ({tooltip.aula.codigo})</p>
              <p className="text-muted-foreground">{tooltip.dia}, {String(tooltip.hora).padStart(2, '0')}:00</p>
              {tooltip.celda ? (
                <div className="mt-1.5 space-y-0.5">
                  <p><span className="font-bold">{tooltip.celda.ocupacion}%</span> ocupación</p>
                  <p className="font-medium text-foreground truncate">{tooltip.celda.clase}</p>
                  <p className="text-muted-foreground">{tooltip.celda.docente}</p>
                  <p className="text-muted-foreground">{tooltip.celda.estudiantes} / {tooltip.celda.capacidad_aula} estudiantes</p>
                </div>
              ) : (
                <p className="text-emerald-600 font-bold mt-1">Aula disponible</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Alternativas Modal */}
      {altModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setAltModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg">Buscar alternativas</h3>
              <button onClick={() => setAltModal(null)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <p className="text-sm text-muted-foreground">
              {altModal.dia}, {String(altModal.hora).padStart(2, '0')}:00 — {altModal.aula.codigo} ({altModal.aula.nombre})
            </p>
            <p className="text-sm font-bold">Aulas cercanas con alta ocupación en esta franja:</p>
            <div className="space-y-2">
              {sugerirAlternativas(altModal.aula, altModal.hora, altModal.dia).map((alt, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                  <div>
                    <p className="font-bold text-sm">{alt.aula.codigo} — {alt.aula.nombre}</p>
                    <p className="text-xs text-muted-foreground">{alt.ocupacion}% ocupación · {alt.aula.capacidad} cupos</p>
                    {alt.clase && <p className="text-xs text-muted-foreground">Actualmente: {alt.clase}</p>}
                  </div>
                  <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-primary/10 text-primary">Sugerido</span>
                </div>
              ))}
              {sugerirAlternativas(altModal.aula, altModal.hora, altModal.dia).length === 0 && (
                <p className="text-sm text-muted-foreground italic">No se encontraron aulas cercanas con alta ocupación en esta franja.</p>
              )}
            </div>
            <button onClick={() => setAltModal(null)} className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm">Cerrar</button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] font-medium text-muted-foreground px-1">
        <span className="font-bold uppercase tracking-wider">Leyenda:</span>
        <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-emerald-100 border border-emerald-200" /> &lt; 40% (Baja)</div>
        <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-amber-100 border border-amber-300" /> 40-80% (Media)</div>
        <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-red-100 border border-red-300" /> &gt; 80% (Alta)</div>
        <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-emerald-50 border border-emerald-200" /> Libre</div>
      </div>
    </div>
  );
}