import { useState, useEffect, useMemo } from 'react';
import { distribucionService } from '../services/api';
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaMinusCircle,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaInfoCircle
} from 'react-icons/fa';
import FilterChips from './common/FilterChips';
import Highlight from './common/Highlight';

interface ClaseDistribucion {
  id: number;
  carrera: string;
  materia: string;
  ciclo: string;
  paralelo: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  num_estudiantes: number;
  docente: string;
  aula_asignada: string | null;
  aula_nombre: string | null;
  aula_capacidad: number | null;
  estado: 'asignada' | 'pendiente' | 'conflicto';
}

interface Estadisticas {
  total_clases: number;
  asignadas: number;
  pendientes: number;
  conflictos: number;
  porcentaje_completado: number;
}

export default function DistribucionEspacios() {
  const [clases, setClases] = useState<ClaseDistribucion[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    total_clases: 0,
    asignadas: 0,
    pendientes: 0,
    conflictos: 0,
    porcentaje_completado: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCiclo, setFiltroCiclo] = useState('');
  const [filtroCarrera, setFiltroCarrera] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [soloConflictos, setSoloConflictos] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await distribucionService.getClasesDistribucion();
      if (response.success) {
        setClases(response.clases);
        setEstadisticas(response.estadisticas);
      }
    } catch (err: any) {
      console.error('Error al cargar distribución:', err);
      setError('Error al cargar los datos de distribución');
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const ciclosUnicos = useMemo(() => {
    const ciclos = [...new Set(clases.map(c => c.ciclo).filter(Boolean))];
    return ciclos.sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [clases]);

  const carrerasUnicas = useMemo(() => {
    return [...new Set(clases.map(c => c.carrera).filter(Boolean))].sort();
  }, [clases]);

  // Filter Chips Logic
  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; value: string }[] = [];
    if (searchTerm) chips.push({ id: 'search', label: 'Búsqueda', value: searchTerm });
    if (filtroCiclo) chips.push({ id: 'ciclo', label: 'Ciclo', value: `Ciclo ${filtroCiclo}` });
    if (filtroCarrera) chips.push({ id: 'carrera', label: 'Carrera', value: filtroCarrera });
    if (filtroEstado) chips.push({ id: 'estado', label: 'Estado', value: filtroEstado.charAt(0).toUpperCase() + filtroEstado.slice(1) });
    if (soloConflictos) chips.push({ id: 'conflictos', label: 'Filtro', value: 'Solo Conflictos' });
    return chips;
  }, [searchTerm, filtroCiclo, filtroCarrera, filtroEstado, soloConflictos]);

  const removeFilter = (id: string) => {
    switch (id) {
      case 'search': setSearchTerm(''); break;
      case 'ciclo': setFiltroCiclo(''); break;
      case 'carrera': setFiltroCarrera(''); break;
      case 'estado': setFiltroEstado(''); break;
      case 'conflictos': setSoloConflictos(false); break;
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFiltroCiclo('');
    setFiltroCarrera('');
    setFiltroEstado('');
    setSoloConflictos(false);
  };

  // Filtered classes
  const clasesFiltradas = useMemo(() => {
    return clases.filter(clase => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchSearch =
          clase.materia?.toLowerCase().includes(term) ||
          clase.docente?.toLowerCase().includes(term) ||
          clase.aula_asignada?.toLowerCase().includes(term) ||
          clase.carrera?.toLowerCase().includes(term) ||
          String(clase.id).includes(term);
        if (!matchSearch) return false;
      }
      if (filtroCiclo && clase.ciclo !== filtroCiclo) return false;
      if (filtroCarrera && clase.carrera !== filtroCarrera) return false;
      if (filtroEstado && clase.estado !== filtroEstado) return false;
      if (soloConflictos && clase.estado !== 'conflicto') return false;
      return true;
    });
  }, [clases, searchTerm, filtroCiclo, filtroCarrera, filtroEstado, soloConflictos]);

  // Pagination
  const totalPages = Math.ceil(clasesFiltradas.length / itemsPerPage);
  const clasesPaginadas = clasesFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroCiclo, filtroCarrera, filtroEstado, soloConflictos]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'asignada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <FaCheckCircle size={10} />
            Asignada
          </span>
        );
      case 'conflicto':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <FaExclamationTriangle size={10} />
            Conflicto
          </span>
        );
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
            <FaMinusCircle size={10} />
            Pendiente
          </span>
        );
      default:
        return null;
    }
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground font-bold">Cargando distribución...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <span className="material-symbols-outlined text-4xl text-destructive mb-4">error</span>
        <p className="text-destructive font-bold mb-2">{error}</p>
        <button onClick={cargarDatos} className="px-6 py-2 bg-destructive text-destructive-foreground rounded-full text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all">
          Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-card dark:bg-slate-900 rounded-3xl border border-border p-8 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 select-none pointer-events-none">
          <span className="material-symbols-outlined text-[120px]">analytics</span>
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                Progreso General
              </h3>
              <p className="text-2xl font-black text-foreground">
                Estado de Distribución
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black text-primary">
                {estadisticas.porcentaje_completado}%
              </span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-4 overflow-hidden border border-border shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${getProgressColor(estadisticas.porcentaje_completado)}`}
              style={{ width: `${estadisticas.porcentaje_completado}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              {estadisticas.asignadas} de {estadisticas.total_clases} clases asignadas correctamente
            </p>
            <div className="flex gap-4">
              {/* Mini badges if needed */}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clases', value: estadisticas.total_clases, icon: 'grid_view', color: 'text-foreground' },
          { label: 'Asignadas', value: estadisticas.asignadas, icon: 'check_circle', color: 'text-green-500' },
          { label: 'Pendientes', value: estadisticas.pendientes, icon: 'pending', color: 'text-muted-foreground' },
          { label: 'Conflictos', value: estadisticas.conflictos, icon: 'warning', color: 'text-amber-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-card dark:bg-slate-900 rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`size-10 rounded-xl flex items-center justify-center bg-muted group-hover:bg-primary/10 transition-colors`}>
                <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
              </div>
              <span className="material-symbols-outlined text-muted-foreground/20">trending_up</span>
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-card dark:bg-slate-900 rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={12} />
            <input
              type="text"
              placeholder="Buscar por materia, docente, aula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroCiclo}
              onChange={(e) => setFiltroCiclo(e.target.value)}
              className="px-3 py-2.5 text-sm font-bold border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card text-foreground transition-all cursor-pointer shadow-sm"
            >
              <option value="">Todos los Ciclos</option>
              {ciclosUnicos.map(c => <option key={c} value={c}>Ciclo {c}</option>)}
            </select>

            <select
              value={filtroCarrera}
              onChange={(e) => setFiltroCarrera(e.target.value)}
              className="px-3 py-2.5 text-sm font-bold border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card text-foreground transition-all cursor-pointer shadow-sm max-w-[200px]"
            >
              <option value="">Todas las Carreras</option>
              {carrerasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                if (e.target.value === 'conflicto') setSoloConflictos(false);
              }}
              className="px-3 py-2.5 text-sm font-bold border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card text-foreground transition-all cursor-pointer shadow-sm"
            >
              <option value="">Todos los Estados</option>
              <option value="asignada">Asignada</option>
              <option value="pendiente">Pendiente</option>
              <option value="conflicto">Conflicto</option>
            </select>

            <button
              onClick={() => {
                setSoloConflictos(!soloConflictos);
                if (!soloConflictos) setFiltroEstado('');
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-all ${soloConflictos
                  ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <FaExclamationTriangle size={12} className={soloConflictos ? 'animate-pulse' : ''} />
              Conflictos
            </button>
          </div>
        </div>

        {/* Dynamic Chips Interface */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <FilterChips
            chips={activeChips}
            onRemove={removeFilter}
            onClearAll={clearAllFilters}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card dark:bg-slate-900 rounded-3xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cod.</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Materia</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ciclo</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Par.</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Docente</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Horario</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Est.</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aula</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {clasesPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-24">
                    <div className="flex flex-col items-center gap-4">
                      <div className="size-20 bg-muted/50 rounded-full flex items-center justify-center border border-border">
                        <span className="material-symbols-outlined text-5xl text-muted-foreground/30">search_off</span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-lg text-foreground">No encontramos nada</p>
                        <p className="text-xs text-muted-foreground font-medium">No hay clases que coincidan con los criterios aplicados.</p>
                      </div>
                      <button
                        onClick={clearAllFilters}
                        className="mt-4 px-8 py-3 bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest rounded-full hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95"
                      >
                        Limpiar todos los filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                clasesPaginadas.map((clase) => (
                  <tr
                    key={clase.id}
                    className={`group hover:bg-muted/20 transition-colors ${clase.estado === 'conflicto' ? 'bg-amber-500/[0.03]' : ''
                      }`}
                  >
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-black font-mono text-muted-foreground/60">#{String(clase.id).padStart(4, '0')}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="min-w-[200px]">
                        <p className="text-sm font-black text-foreground truncate group-hover:text-primary transition-colors" title={clase.materia}>
                          <Highlight text={clase.materia} query={searchTerm} />
                        </p>
                        <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-tighter mt-0.5">
                          <Highlight text={clase.carrera} query={searchTerm} />
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center justify-center size-8 rounded-xl bg-muted text-foreground text-xs font-black border border-border shadow-sm">
                        {clase.ciclo || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-xs font-black text-muted-foreground">{clase.paralelo}</span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-foreground truncate max-w-[180px]" title={clase.docente}>
                        <Highlight text={clase.docente || 'Sin docente'} query={searchTerm} />
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs">
                        <p className="font-black text-foreground mb-1 flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-primary/40"></span>
                          {clase.dia}
                        </p>
                        <div className="flex items-center gap-1.5 text-muted-foreground font-bold opacity-70">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {clase.hora_inicio} - {clase.hora_fin}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-xl border border-border/50">
                        <span className="material-symbols-outlined text-[16px] text-muted-foreground">groups</span>
                        <span className="text-xs font-black text-foreground">{clase.num_estudiantes || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {clase.aula_asignada ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black bg-primary/10 text-primary border border-primary/20 shadow-sm">
                            <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                            <Highlight text={clase.aula_asignada} query={searchTerm} />
                          </span>
                          {clase.aula_capacidad && (
                            <span className="text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-[0.1em] opacity-60">Cap. {clase.aula_capacidad}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground/40 italic">
                          <span className="material-symbols-outlined text-[18px]">event_busy</span>
                          <span className="text-[11px] font-bold">Sin asignar</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      {getEstadoBadge(clase.estado)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Improved Pagination */}
        {totalPages > 1 && (
          <div className="bg-muted/10 px-6 py-5 flex items-center justify-between border-t border-border">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Filas:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                >
                  {[10, 15, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                Mostrando <span className="text-foreground">{Math.min(clasesFiltradas.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(currentPage * itemsPerPage, clasesFiltradas.length)}</span> de <span className="text-foreground">{clasesFiltradas.length}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="size-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-md active:scale-95"
              >
                <FaChevronLeft size={12} />
              </button>

              <div className="flex items-center gap-1 mx-2">
                {generatePageNumbers().map((page, idx) => (
                  page === '...' ? (
                    <span key={`el-${idx}`} className="px-2 text-muted-foreground font-black">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(Number(page))}
                      className={`size-9 rounded-xl text-xs font-black transition-all ${currentPage === page
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                          : 'bg-card border border-border text-muted-foreground hover:bg-muted'
                        }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="size-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-md active:scale-95"
              >
                <FaChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Improved Legend */}
      <div className="bg-card dark:bg-slate-900 rounded-3xl border border-border p-6 shadow-sm overflow-hidden border-l-[6px] border-l-primary/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">info</span>
          </div>
          <h4 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Guía de Estados</h4>
        </div>
        <div className="flex flex-wrap gap-8">
          {[
            { label: 'Asignada', desc: 'Aula confirmada sin conflictos detectados', badge: 'asignada' },
            { label: 'Conflicto', desc: 'Error de solapamiento en el aula asignada', badge: 'conflicto' },
            { label: 'Pendiente', desc: 'Clase aún no tiene un espacio físico', badge: 'pendiente' }
          ].map((item, i) => (
            <div key={i} className="flex gap-4 max-w-xs">
              <div className="mt-1">{getEstadoBadge(item.badge)}</div>
              <div>
                <p className="text-[11px] font-black text-foreground uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
