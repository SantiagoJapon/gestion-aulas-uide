import { useState, useEffect, useMemo, useCallback } from 'react';
import { distribucionService, reporteService, type MapaCalorDetalladoResponse, type AulaInfo, type CeldaOcupacion } from '../../services/api';
import { StatCard } from '../common/StatCard';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiTrendingDown, FiDownload } from 'react-icons/fi';

interface Props {
  carreraId?: number;
  esAdmin?: boolean;
  vistaCompacta?: boolean;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type Franja = '' | 'manana' | 'tarde' | 'noche';
type VistaActiva = 'resumen' | 'tabla' | 'franja';

const FRANJA_LABELS: Record<Franja, string> = { '': 'Todo el día', manana: 'Mañana (7-12)', tarde: 'Tarde (13-18)', noche: 'Noche (19-22)' };

const MODULOS_MAP: Record<string, { top: string; left: string; width: string; height: string }> = {
  'A': { top: '5%', left: '55%', width: '17%', height: '18%' },
  'B': { top: '30%', left: '30%', width: '15%', height: '15%' },
  'C': { top: '60%', left: '55%', width: '15%', height: '15%' },
  'D': { top: '80%', left: '38%', width: '18%', height: '14%' },
  'E': { top: '52%', left: '6%', width: '14%', height: '15%' },
};

const getColor = (pct: number): { bg: string; text: string; border: string; label: string } => {
  if (pct === 0) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'LIBRE' };
  if (pct < 40) return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Baja' };
  if (pct < 80) return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', label: 'Media' };
  return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: 'Alta' };
};

const getColorHex = (pct: number): string => {
  if (pct === 0) return 'rgba(16, 185, 129, 0.08)';
  if (pct < 40) return 'rgba(16, 185, 129, 0.25)';
  if (pct < 80) return 'rgba(245, 158, 11, 0.3)';
  return 'rgba(239, 68, 68, 0.35)';
};

export default function MapaCalorDetallado({ carreraId, esAdmin, vistaCompacta }: Props) {
  const [data, setData] = useState<MapaCalorDetalladoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [edificio, setEdificio] = useState('');
  const [capacidadMin, setCapacidadMin] = useState(0);
  const [diasSel, setDiasSel] = useState<string[]>([]);
  const [franja, setFranja] = useState<Franja>('');
  const [agrupar, setAgrupar] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [semanaOffset, setSemanaOffset] = useState(0);

  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('resumen');
  const [modalAula, setModalAula] = useState<AulaInfo | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; aula: AulaInfo; hora: number; dia: string; celda: CeldaOcupacion | null } | null>(null);
  const [altModal, setAltModal] = useState<{ aula: AulaInfo; hora: number; dia: string } | null>(null);
  const [franjaSel, setFranjaSel] = useState<number>(8);

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

  const horasDisplay = useMemo(() => {
    if (!data) return [];
    if (!agrupar) return data.horas;
    const grupos: number[][] = [];
    for (let i = 0; i < data.horas.length; i += 2) {
      grupos.push(data.horas.slice(i, i + 2));
    }
    return grupos;
  }, [data, agrupar]);

  const edificiosDisponibles = useMemo(() => data?.filtros_disponibles?.edificios || [], [data]);

  const aulasFiltradas = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data.aulas;
    const term = searchTerm.toLowerCase();
    return data.aulas.filter(a =>
      a.codigo.toLowerCase().includes(term) ||
      a.nombre.toLowerCase().includes(term) ||
      a.edificio.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  const kpis = useMemo(() => {
    if (!data) return { ocupacionGlobal: 0, aulasSubutilizadas: 0, franjasCriticas: 0, topMejores: [], topPeores: [] };

    let totalOcupacion = 0;
    let countCeldas = 0;
    const subutilizadas = new Set<number>();
    const ocupacionPorFranja: Record<number, { total: number; count: number }> = {};

    data.aulas.forEach(aula => {
      let totalAula = 0;
      let countAula = 0;
      data.horas.forEach(hora => {
        DIAS.forEach(dia => {
          const celda = data.datos[getKey(aula.id, hora, dia)];
          if (celda) {
            totalOcupacion += celda.ocupacion;
            countCeldas++;
            totalAula += celda.ocupacion;
            countAula++;
            if (!ocupacionPorFranja[hora]) ocupacionPorFranja[hora] = { total: 0, count: 0 };
            ocupacionPorFranja[hora].total += celda.ocupacion;
            ocupacionPorFranja[hora].count++;
          }
        });
      });
      if (countAula > 0 && (totalAula / countAula) < 40) {
        subutilizadas.add(aula.id);
      }
    });

    const franjasOrdenadas = Object.entries(ocupacionPorFranja)
      .map(([hora, v]) => ({ hora: Number(hora), promedio: v.count > 0 ? v.total / v.count : 0 }))
      .sort((a, b) => a.promedio - b.promedio);

    const aulasConPromedio = data.aulas.map(aula => {
      let total = 0;
      let count = 0;
      data.horas.forEach(hora => {
        DIAS.forEach(dia => {
          const celda = data.datos[getKey(aula.id, hora, dia)];
          if (celda) { total += celda.ocupacion; count++; }
        });
      });
      return { aula, promedio: count > 0 ? total / count : 0 };
    }).sort((a, b) => b.promedio - a.promedio);

    return {
      ocupacionGlobal: countCeldas > 0 ? parseFloat((totalOcupacion / countCeldas).toFixed(1)) : 0,
      aulasSubutilizadas: subutilizadas.size,
      franjasCriticas: franjasOrdenadas.filter(f => f.promedio < 40).length,
      topMejores: aulasConPromedio.slice(0, 5),
      topPeores: aulasConPromedio.slice(-5).reverse(),
    };
  }, [data]);

  const promedioPorAula = useMemo(() => {
    if (!data) return new Map<number, number>();
    const map = new Map<number, number>();
    data.aulas.forEach(aula => {
      let total = 0;
      let count = 0;
      data.horas.forEach(hora => {
        DIAS.forEach(dia => {
          const celda = data.datos[getKey(aula.id, hora, dia)];
          if (celda) { total += celda.ocupacion; count++; }
        });
      });
      map.set(aula.id, count > 0 ? parseFloat((total / count).toFixed(1)) : 0);
    });
    return map;
  }, [data]);

  // Extraer módulo del código del aula (ej: "A-B4" → "A", "B-10" → "B")
  const getModulo = (aula: AulaInfo): string => {
    if (aula.edificio) return aula.edificio.charAt(0).toUpperCase();
    const code = aula.codigo || '';
    const dash = code.indexOf('-');
    if (dash > 0) return code.substring(0, dash).toUpperCase();
    return code.charAt(0).toUpperCase();
  };

  // Promedio de ocupación por módulo (para el overlay del mapa)
  const promedioPorModulo = useMemo(() => {
    if (!data) return new Map<string, number>();
    const map = new Map<string, number>();
    const modulos: Record<string, { total: number; count: number }> = {};
    data.aulas.forEach(aula => {
      const mod = getModulo(aula);
      if (!modulos[mod]) modulos[mod] = { total: 0, count: 0 };
      let totalAula = 0;
      let countAula = 0;
      data.horas.forEach(hora => {
        DIAS.forEach(dia => {
          const celda = data.datos[getKey(aula.id, hora, dia)];
          if (celda) { totalAula += celda.ocupacion; countAula++; }
        });
      });
      if (countAula > 0) {
        modulos[mod].total += totalAula / countAula;
        modulos[mod].count++;
      }
    });
    Object.entries(modulos).forEach(([mod, v]) => {
      map.set(mod, v.count > 0 ? parseFloat((v.total / v.count).toFixed(1)) : 0);
    });
    return map;
  }, [data]);

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

  const handleExportar = async () => {
    try {
      await reporteService.descargarExcelActual(carreraId ? String(carreraId) : undefined);
    } catch {
      console.error('Error al exportar');
    }
  };

  const handleOpenModal = (aula: AulaInfo) => {
    setModalAula(aula);
  };

  if (vistaCompacta) {
    return (
      <div className="space-y-4">
        {loading && <div className="flex items-center justify-center p-12"><span className="material-symbols-outlined animate-spin text-3xl text-primary">refresh</span></div>}
        {!loading && data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard title="Ocupación Global" value={`${kpis.ocupacionGlobal}%`} icon={FiTrendingDown} iconBgColor="bg-primary/10" />
              <StatCard title="Aulas Subutilizadas" value={kpis.aulasSubutilizadas} subtitle="< 40% promedio" icon={FiAlertTriangle} iconBgColor="bg-amber-100" iconColor="text-amber-600" />
              <StatCard title="Franjas Críticas" value={kpis.franjasCriticas} subtitle="con < 40% promedio" icon={FiClock} iconBgColor="bg-red-100" iconColor="text-red-600" />
              <StatCard title="Total Aulas" value={data.estadisticas.total_aulas} icon={FiCheckCircle} iconBgColor="bg-emerald-100" iconColor="text-emerald-600" />
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30" style={{ maxHeight: '450px' }}>
              <img src="/campus_map.png" alt="Mapa del campus" className="w-full h-full object-contain" style={{ maxHeight: '450px' }} />
              {Object.entries(MODULOS_MAP).map(([mod, pos]) => {
                const avg = promedioPorModulo.get(mod) ?? 0;
                const aulasMod = data.aulas.filter(a => getModulo(a) === mod);
                return (
                  <div key={mod}
                    className="absolute rounded-xl flex flex-col items-center justify-center cursor-pointer hover:scale-105 hover:z-10 transition-all border-2 border-white/40 shadow-lg"
                    style={{ top: pos.top, left: pos.left, width: pos.width, height: pos.height, backgroundColor: getColorHex(avg) }}
                    title={`Módulo ${mod}: ${avg}% ocupación — ${aulasMod.length} aulas`}
                  >
                    <span className="text-sm font-black text-white drop-shadow-md">{mod}</span>
                    <span className="text-[10px] font-bold text-white/90">{avg === 0 ? '—' : `${avg}%`}</span>
                    <span className="text-[8px] text-white/70">{aulasMod.length} aulas</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-card rounded-2xl border border-border">
        <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Buscar</label>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Código, nombre o edificio..."
            className="px-3 py-2 rounded-xl border border-border bg-background text-sm font-medium" />
        </div>
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

      {/* Tabs de vista */}
      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-2xl w-fit">
        {([
          { key: 'resumen' as VistaActiva, label: 'Resumen', icon: 'dashboard' },
          { key: 'tabla' as VistaActiva, label: 'Tabla Detallada', icon: 'table_chart' },
          { key: 'franja' as VistaActiva, label: 'Por Franja', icon: 'schedule' },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setVistaActiva(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${vistaActiva === tab.key ? 'bg-white text-primary shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <div className="ml-4 flex items-center gap-2">
          <button onClick={() => setSemanaOffset(prev => prev - 1)} className="p-2 rounded-lg hover:bg-white/50 transition-all" title="Semana anterior">
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <span className="text-xs font-bold text-muted-foreground min-w-[120px] text-center">
            {semanaOffset === 0 ? 'Esta semana' : semanaOffset < 0 ? `Hace ${Math.abs(semanaOffset)} sem` : `En ${semanaOffset} sem`}
          </span>
          <button onClick={() => setSemanaOffset(prev => prev + 1)} className="p-2 rounded-lg hover:bg-white/50 transition-all" title="Semana siguiente">
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && <div className="flex items-center justify-center p-24"><span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span></div>}
      {error && <div className="p-6 bg-red-50 rounded-2xl text-red-700 font-medium">{error}</div>}

      {/* Vista: Resumen */}
      {!loading && !error && data && vistaActiva === 'resumen' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Ocupación Global" value={`${kpis.ocupacionGlobal}%`} subtitle="promedio semanal" icon={FiTrendingDown} iconBgColor="bg-primary/10"
              trend={semanaOffset !== 0 ? { value: 3.2, isPositive: semanaOffset < 0 } : undefined} />
            <StatCard title="Aulas Subutilizadas" value={kpis.aulasSubutilizadas} subtitle="menos del 40% de uso" icon={FiAlertTriangle} iconBgColor="bg-amber-100" iconColor="text-amber-600" />
            <StatCard title="Franjas Críticas" value={kpis.franjasCriticas} subtitle="horarios con baja demanda" icon={FiClock} iconBgColor="bg-red-100" iconColor="text-red-600" />
            <StatCard title="Total Aulas" value={data.estadisticas.total_aulas} icon={FiCheckCircle} iconBgColor="bg-emerald-100" iconColor="text-emerald-600" />
          </div>

          {/* Mapa del campus con overlay */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-foreground">Mapa de Ocupación por Módulo</h3>
              <button onClick={handleExportar} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all">
                <FiDownload /> Exportar Excel
              </button>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30" style={{ maxHeight: '500px' }}>
              <img src="/campus_map.png" alt="Mapa del campus" className="w-full h-full object-contain" style={{ maxHeight: '500px' }} />
              {Object.entries(MODULOS_MAP).map(([mod, pos]) => {
                const avg = promedioPorModulo.get(mod) ?? 0;
                const aulasMod = data.aulas.filter(a => getModulo(a) === mod);
                return (
                  <div key={mod}
                    className="absolute rounded-xl flex flex-col items-center justify-center cursor-pointer hover:scale-105 hover:z-10 transition-all border-2 border-white/40 shadow-lg"
                    style={{ top: pos.top, left: pos.left, width: pos.width, height: pos.height, backgroundColor: getColorHex(avg) }}
                    title={`Módulo ${mod}: ${avg}% ocupación — ${aulasMod.length} aulas`}
                  >
                    <span className="text-lg font-black text-white drop-shadow-md">{mod}</span>
                    <span className="text-xs font-bold text-white/90">{avg === 0 ? '—' : `${avg}%`}</span>
                    <span className="text-[10px] text-white/70">{aulasMod.length} aulas</span>
                  </div>
                );
              })}
            </div>
            {/* Leyenda del mapa */}
            <div className="flex items-center gap-4 mt-3 text-[10px] font-medium text-muted-foreground">
              <span className="font-bold uppercase tracking-wider">Ocupación:</span>
              <div className="flex items-center gap-1.5"><div className="size-3 rounded" style={{ backgroundColor: getColorHex(0) }} /> 0%</div>
              <div className="flex items-center gap-1.5"><div className="size-3 rounded" style={{ backgroundColor: getColorHex(25) }} /> 25%</div>
              <div className="flex items-center gap-1.5"><div className="size-3 rounded" style={{ backgroundColor: getColorHex(50) }} /> 50%</div>
              <div className="flex items-center gap-1.5"><div className="size-3 rounded" style={{ backgroundColor: getColorHex(75) }} /> 75%</div>
              <div className="flex items-center gap-1.5"><div className="size-3 rounded" style={{ backgroundColor: getColorHex(100) }} /> 100%</div>
            </div>
          </div>

          {/* Top mejores y peores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-emerald-500">trending_up</span>
                Top 5 Mejor Utilizadas
              </h4>
              <div className="space-y-2">
                {kpis.topMejores.map(({ aula, promedio }, i) => (
                  <div key={aula.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/50 hover:bg-muted cursor-pointer transition-all" onClick={() => handleOpenModal(aula)}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-muted-foreground w-5">{i + 1}</span>
                      <div>
                        <p className="text-xs font-bold">{aula.codigo} — {aula.nombre}</p>
                        <p className="text-[10px] text-muted-foreground">{aula.edificio} · {aula.capacidad} cupos</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-700">{promedio}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-red-500">trending_down</span>
                Top 5 Peor Utilizadas
              </h4>
              <div className="space-y-2">
                {kpis.topPeores.map(({ aula, promedio }, i) => (
                  <div key={aula.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/50 hover:bg-muted cursor-pointer transition-all" onClick={() => handleOpenModal(aula)}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-muted-foreground w-5">{i + 1}</span>
                      <div>
                        <p className="text-xs font-bold">{aula.codigo} — {aula.nombre}</p>
                        <p className="text-[10px] text-muted-foreground">{aula.edificio} · {aula.capacidad} cupos</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-red-100 text-red-700">{promedio}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista: Tabla Detallada */}
      {!loading && !error && data && vistaActiva === 'tabla' && (
        <div className="relative overflow-auto rounded-2xl border border-border bg-card shadow-sm max-h-[70vh]" onMouseLeave={() => setTooltip(null)}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="sticky top-0 z-20 bg-muted border-b border-border">
                <th className="sticky left-0 z-30 bg-muted p-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border min-w-[80px]">
                  Hora \ Aula
                </th>
                {aulasFiltradas.map(aula => (
                  <th key={aula.id} className="p-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border/50 min-w-[90px] max-w-[120px] cursor-pointer hover:bg-muted/80"
                    onClick={() => handleOpenModal(aula)}>
                    <div className="truncate">{aula.codigo}</div>
                    <div className="text-[8px] font-normal text-muted-foreground/60">{aula.capacidad} cupos · {promedioPorAula.get(aula.id) || 0}%</div>
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
                    aulasFiltradas.map(aula => {
                      const celda = getOcupacion(aula.id, hGroup.length === 1 ? hGroup[0] : hGroup, dia);
                      const pct = celda?.ocupacion ?? 0;
                      const colors = getColor(pct);
                      return (
                        <td
                          key={`${dia}-${aula.id}-${hi}`}
                          className={`p-1 border-r border-border/30 relative ${colors.bg} ${colors.border} border-b cursor-pointer`}
                          onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setTooltip({ x: rect.left, y: rect.top - 10, aula, hora: hGroup[0], dia, celda });
                          }}
                          onMouseMove={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setTooltip(prev => prev ? { ...prev, x: rect.left, y: rect.top - 10 } : null);
                          }}
                          onClick={() => handleOpenModal(aula)}
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
                          {celda && pct < 40 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAltModal({ aula, hora: hGroup[0], dia }); }}
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

      {/* Vista: Por Franja Horaria */}
      {!loading && !error && data && vistaActiva === 'franja' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Seleccionar hora:</label>
            <div className="flex gap-1 flex-wrap">
              {data.horas.map(h => (
                <button key={h} onClick={() => setFranjaSel(h)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${franjaSel === h ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/50'}`}>
                  {String(h).padStart(2, '0')}:00
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {aulasFiltradas.map(aula => {
              const ocupaciones = DIAS.map(dia => {
                const celda = data.datos[getKey(aula.id,franjaSel, dia)];
                return celda?.ocupacion ?? 0;
              });
              const promedio = ocupaciones.reduce((s, v) => s + v, 0) / ocupaciones.length;
              const colors = getColor(promedio);
              return (
                <div key={aula.id} className={`p-4 rounded-2xl border ${colors.border} ${colors.bg} cursor-pointer hover:scale-[1.02] transition-all`}
                  onClick={() => handleOpenModal(aula)}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black">{aula.codigo}</p>
                    <span className={`text-lg font-black ${colors.text}`}>{promedio === 0 ? '—' : `${Math.round(promedio)}%`}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">{aula.nombre} · {aula.capacidad} cupos</p>
                  <div className="flex gap-1">
                    {DIAS.map((dia, i) => (
                      <div key={dia} className="flex-1 text-center">
                        <div className="text-[7px] text-muted-foreground font-bold">{dia.substring(0, 2)}</div>
                        <div className={`h-2 rounded-full mt-0.5 ${ocupaciones[i] === 0 ? 'bg-emerald-200' : getColor(ocupaciones[i]).bg}`} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Alternativas */}
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

      {/* Modal: Detalle de Aula */}
      {modalAula && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModalAula(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">{modalAula.nombre}</h3>
                <p className="text-sm text-muted-foreground">{modalAula.codigo} · {modalAula.edificio} · {modalAula.capacidad} cupos · {modalAula.tipo}</p>
              </div>
              <button onClick={() => setModalAula(null)}><span className="material-symbols-outlined">close</span></button>
            </div>

            {/* Horario semanal del aula */}
            <div className="overflow-auto rounded-xl border border-border">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 text-left text-[10px] font-bold text-muted-foreground border-r border-border">Hora</th>
                    {DIAS.map(d => (
                      <th key={d} className="p-2 text-center text-[10px] font-bold text-muted-foreground border-r border-border/50">{d.substring(0, 3)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.horas.map(hora => (
                    <tr key={hora} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="p-2 text-[10px] font-bold text-muted-foreground border-r border-border whitespace-nowrap">
                        {String(hora).padStart(2, '0')}:00
                      </td>
                      {DIAS.map(dia => {
                        const celda = data.datos[getKey(modalAula.id, hora, dia)];
                        const pct = celda?.ocupacion ?? 0;
                        const colors = getColor(pct);
                        return (
                          <td key={dia} className={`p-1 border-r border-border/30 ${colors.bg} ${colors.border}`}>
                            <div className="flex flex-col items-center justify-center h-8">
                              <span className={`font-bold text-[10px] ${colors.text}`}>
                                {pct === 0 ? '—' : `${pct}%`}
                              </span>
                              {celda && (
                                <span className="text-[7px] text-muted-foreground truncate max-w-[70px]">{celda.clase}</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen del aula */}
            <div className="grid grid-cols-3 gap-3">
              {(() => {
                let total = 0, count = 0, libre = 0;
                data.horas.forEach(hora => {
                  DIAS.forEach(dia => {
                    const celda = data.datos[getKey(modalAula.id, hora, dia)];
                    if (celda) { total += celda.ocupacion; count++; }
                    else { libre++; }
                  });
                });
                const promedio = count > 0 ? (total / count) : 0;
                return (
                  <>
                    <div className="p-3 rounded-xl bg-muted/50 text-center">
                      <p className="text-lg font-black text-foreground">{promedio === 0 ? '—' : `${promedio.toFixed(1)}%`}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Promedio</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 text-center">
                      <p className="text-lg font-black text-emerald-700">{libre}</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Franjas Libres</p>
                    </div>
                    <div className="p-3 rounded-xl bg-primary/5 text-center">
                      <p className="text-lg font-black text-primary">{count}</p>
                      <p className="text-[10px] text-primary font-bold uppercase">Con Clase</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <button onClick={() => setModalAula(null)} className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm">Cerrar</button>
          </div>
        </div>
      )}

      {/* Leyenda */}
      {!loading && !error && data && (
        <div className="flex items-center gap-4 text-[10px] font-medium text-muted-foreground px-1">
          <span className="font-bold uppercase tracking-wider">Leyenda:</span>
          <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-emerald-100 border border-emerald-200" /> &lt; 40% (Baja)</div>
          <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-amber-100 border border-amber-300" /> 40-80% (Media)</div>
          <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-red-100 border border-red-300" /> &gt; 80% (Alta)</div>
          <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-emerald-50 border border-emerald-200" /> Libre</div>
        </div>
      )}
    </div>
  );
}
