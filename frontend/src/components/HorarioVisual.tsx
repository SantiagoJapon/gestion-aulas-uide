import { useState, useEffect, useContext, useMemo } from 'react';
import { distribucionService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Users,
  ChevronRight,
  LayoutGrid,
  ListTodo,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ClaseHorario {
  id: number;
  carrera: string;
  materia: string;
  docente: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  num_estudiantes: number;
  aula_asignada: string;
  nivel?: string;
  paralelo?: string;
  aula?: {
    id: number;
    codigo: string;
    nombre: string;
    capacidad: number;
    tipo: string;
  };
}

interface HorarioVisualProps {
  mode?: 'personal' | 'general';
  carreraId?: number | string;
  title?: string;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const getColorForMateria = (materia: string) => {
  const colors = [
    { border: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', icon: 'text-rose-500', pill: 'bg-rose-100' },
    { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500', pill: 'bg-amber-100' },
    { border: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', icon: 'text-sky-500', pill: 'bg-sky-100' },
    { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500', pill: 'bg-emerald-100' },
    { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500', pill: 'bg-indigo-100' },
    { border: 'border-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-500', pill: 'bg-violet-100' },
  ];

  let hash = 0;
  for (let i = 0; i < materia.length; i++) {
    hash = materia.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function HorarioVisual({ mode = 'general', carreraId, title }: HorarioVisualProps) {
  const { user } = useContext(AuthContext);
  const [clases, setClases] = useState<ClaseHorario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'dia' | 'semana'>('dia');
  const [selectedDia, setSelectedDia] = useState('Lunes');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const handleDiaChange = (nuevoDia: string) => {
    const currentIndex = DIAS.indexOf(selectedDia);
    const nextIndex = DIAS.indexOf(nuevoDia);

    setSlideDirection(nextIndex > currentIndex ? 'right' : 'left');
    setSelectedDia(nuevoDia);
  };

  useEffect(() => {
    const today = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date());
    const capitalizedToday = today.charAt(0).toUpperCase() + today.slice(1);
    const normalizedToday = DIAS.includes(capitalizedToday) ? capitalizedToday : 'Lunes';
    setSelectedDia(normalizedToday);

    cargarHorario();
  }, [mode, carreraId]);

  // Nuevo: Estado para acordeones en móvil (Vista semanal)
  const [expandedDias, setExpandedDias] = useState<Record<string, boolean>>({});

  const toggleDia = (dia: string) => {
    setExpandedDias(prev => ({ ...prev, [dia]: !prev[dia] }));
  };

  const cargarHorario = async () => {
    try {
      if (!refreshing) setLoading(true);

      let response;
      if (mode === 'personal') {
        response = await distribucionService.getMiDistribucion();
        const rawClases = response.clases || (Array.isArray(response) ? response : []);
        const normalizedClases = rawClases.map((c: any) => ({
          ...c,
          aula_asignada: c.aula || 'S/A',
          carrera: c.carrera || (user?.rol === 'estudiante' ? user.carrera_nombre : ''),
          docente: c.docente || (user?.rol === 'profesor' || user?.rol === 'docente' ? `${user.nombre} ${user.apellido}` : '')
        }));
        setClases(normalizedClases);
      } else {
        const id = carreraId || (user?.rol === 'director' ? user.carrera_director : undefined);
        response = await distribucionService.obtenerHorario(id || undefined);
        if (response && response.horario && Array.isArray(response.horario)) {
          setClases(response.horario);
        } else if (Array.isArray(response)) {
          setClases(response);
        } else {
          setClases([]);
        }
      }
    } catch (err: any) {
      console.error('Error cargando horario:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    cargarHorario();
  };

  const normalizarDia = (dia: string): string => {
    if (!dia) return 'Lunes';
    const diaLower = dia.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (diaLower.includes('lun')) return 'Lunes';
    if (diaLower.includes('mar')) return 'Martes';
    if (diaLower.includes('mie')) return 'Miércoles';
    if (diaLower.includes('jue')) return 'Jueves';
    if (diaLower.includes('vie')) return 'Viernes';
    if (diaLower.includes('sab')) return 'Sábado';
    return 'Lunes';
  };

  const clasesPorDia = useMemo(() => {
    const map: Record<string, ClaseHorario[]> = {};
    DIAS.forEach(d => map[d] = []);

    clases.forEach(clase => {
      const dia = normalizarDia(clase.dia);
      if (map[dia]) {
        map[dia].push(clase);
      }
    });

    Object.keys(map).forEach(d => {
      map[d].sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));
    });

    return map;
  }, [clases]);

  if (loading) {
    return (
      <div className="bg-card rounded-[2.5rem] border border-border p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest animate-pulse">Sincronizando Horario Maestro...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      {/* Header Premium - Optimizado para móvil */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/50 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-border shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="size-10 sm:size-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
            <Calendar className="size-5 sm:size-7" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-foreground tracking-tight leading-tight">
              {title || (mode === 'personal' ? 'Mi Horario Maestro' : 'Horario de Carrera')}
            </h2>
            <p className="text-[10px] sm:text-sm font-bold text-muted-foreground flex items-center gap-1.5 sm:gap-2">
              <span className="inline-block size-1.5 sm:size-2 rounded-full bg-green-500 animate-pulse"></span>
              {clases.length} clases distribuidas
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-auto ml-auto sm:ml-0 inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-primary text-primary-foreground rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`size-3 sm:size-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden xs:inline">{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          <span className="xs:hidden">{refreshing ? '...' : ''}</span>
        </button>
      </div>

      {/* Selector de Días y Modos */}
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2 scroll-smooth">
          {DIAS.map(dia => (
            <button
              key={dia}
              onClick={() => handleDiaChange(dia)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all whitespace-nowrap ${selectedDia === dia && viewMode === 'dia'
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                }`}
            >
              <span className="text-[11px] font-black uppercase tracking-tight">{dia.substring(0, 3)}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${selectedDia === dia && viewMode === 'dia' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                {clasesPorDia[dia].length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex bg-muted/30 p-1 rounded-2xl border border-border w-fit mx-auto sm:mx-0">
          <button
            onClick={() => setViewMode('dia')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'dia'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <ListTodo className="size-3.5" />
            Día
          </button>
          <button
            onClick={() => setViewMode('semana')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'semana'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <LayoutGrid className="size-3.5" />
            Semana
          </button>
        </div>
      </div>

      {/* Grid de Contenido - Rediseñado para Responsividad */}
      <div className="bg-card min-h-[400px] rounded-[1.5rem] sm:rounded-[2.5rem] border border-border shadow-sm overflow-hidden p-4 sm:p-8">
        {viewMode === 'dia' ? (
          /* VISTA POR DÍA - Con Animación de Swipe */
          <div
            key={selectedDia}
            className={`max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 ${slideDirection === 'right' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'
              }`}
          >
            <div className="flex items-center gap-3">
              <div className="size-8 sm:size-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="size-4 sm:size-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">{selectedDia}</h3>
                <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase">{clasesPorDia[selectedDia].length} clases programadas</p>
              </div>
            </div>

            {clasesPorDia[selectedDia].length > 0 ? (
              <div className="space-y-8">
                {clasesPorDia[selectedDia].map((clase, idx) => {
                  const style = getColorForMateria(clase.materia);
                  return (
                    <div key={idx} className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                      {/* Indicador de Tiempo Grouping (Según Mockup 2) */}
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] sm:text-[11px] font-black text-muted-foreground/60 tracking-widest">{clase.hora_inicio} — {clase.hora_fin}</span>
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase bg-muted/30 px-2 py-0.5 rounded-full">1 clase</span>
                      </div>

                      {/* Card de Materia */}
                      <div className={`relative flex items-center justify-between p-4 sm:p-5 rounded-2xl sm:rounded-[1.75rem] border-l-[6px] sm:border-l-8 border transition-all hover:shadow-lg ${style.bg} ${style.border} group`}>
                        <div className="flex-1 space-y-1 sm:space-y-2">
                          <h4 className="text-sm sm:text-lg font-black tracking-tight leading-none text-foreground">{clase.materia}</h4>
                          <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">ID_{clase.id}_{clase.paralelo || 'A'}</p>

                          <div className="flex flex-wrap gap-4 items-center pt-1 sm:pt-2">
                            <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-muted-foreground">
                              <Clock className="size-3 sm:size-3.5 opacity-50" />
                              {clase.hora_inicio} - {clase.hora_fin}
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-muted-foreground">
                              <MapPin className="size-3 sm:size-3.5 opacity-50" />
                              {clase.aula_asignada}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-6 ml-4">
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${style.pill}`}>
                            <Users className={`size-3 ${style.icon}`} />
                            <span className={`text-[10px] font-black ${style.text}`}>{clase.num_estudiantes}</span>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground/40 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-40 grayscale">
                <BookOpen className="size-16 mb-4" />
                <p className="font-black text-lg uppercase tracking-widest text-muted-foreground">No hay clases hoy</p>
              </div>
            )}
          </div>
        ) : (
          /* VISTA SEMANAL - Accordion para Móvil y Grid para Desktop (Mockup 3) */
          <div className="space-y-4">
            {/* Desktop View (md+) */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              {DIAS.map(dia => (
                <div key={dia} className="flex flex-col gap-4">
                  <div className="bg-muted/30 p-4 rounded-3xl border border-border mb-2 flex justify-between items-center group hover:bg-muted/50 transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{dia}</span>
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/10">
                      {clasesPorDia[dia].length}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {clasesPorDia[dia].length > 0 ? (
                      clasesPorDia[dia].map((clase, idx) => {
                        const style = getColorForMateria(clase.materia);
                        return (
                          <div key={idx} className={`p-4 rounded-2xl border-l-4 border transition-all hover:shadow-md hover:-translate-y-1 ${style.bg} ${style.border}`}>
                            <p className={`text-[11px] font-black leading-tight mb-2 ${style.text} line-clamp-2`}>{clase.materia}</p>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Clock className="size-3 text-muted-foreground" />
                                <span className="text-[10px] font-bold text-muted-foreground">{clase.hora_inicio} - {clase.hora_fin}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <MapPin className="size-3 text-muted-foreground" />
                                  <span className={`text-[10px] font-black ${style.text}`}>{clase.aula_asignada}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="size-3 text-muted-foreground" />
                                  <span className="text-[10px] font-black text-foreground">{clase.num_estudiantes}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="h-24 rounded-2xl border border-dashed border-border flex items-center justify-center opacity-30">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Libre</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile View (xs to sm) - Acordeón según Mockup 3 */}
            <div className="md:hidden space-y-3">
              {DIAS.map(dia => (
                <div key={dia} className="bg-card rounded-2xl border border-border overflow-hidden transition-all">
                  <button
                    onClick={() => toggleDia(dia)}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-foreground">{dia}</span>
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                        {clasesPorDia[dia].length}
                      </span>
                    </div>
                    {expandedDias[dia] ? (
                      <ChevronUp className="size-4 text-muted-foreground/60" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground/60" />
                    )}
                  </button>

                  {expandedDias[dia] && (
                    <div className="p-4 pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      {clasesPorDia[dia].length > 0 ? (
                        clasesPorDia[dia].map((clase, idx) => {
                          const style = getColorForMateria(clase.materia);
                          return (
                            <div key={idx} className={`p-4 rounded-xl border-l-4 border transition-all ${style.bg} ${style.border}`}>
                              <h5 className="text-xs font-black text-foreground mb-1">{clase.materia}</h5>
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                                  <Clock className="size-3" />
                                  {clase.hora_inicio} - {clase.hora_fin}
                                </span>
                                <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                                  <MapPin className="size-3" />
                                  {clase.aula_asignada}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Sin actividades</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 flex items-start gap-4">
        <div className="size-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
          <Info className="size-5" />
        </div>
        <div>
          <h4 className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase tracking-tight">Sobre la asignación de aulas</h4>
          <p className="text-xs text-blue-800/70 dark:text-blue-300/60 mt-1 leading-relaxed">
            El horario mostrado corresponde a la distribución oficial del sistema. Si detectas algún conflicto o error en tu asignación, por favor contacta con el Director de tu Carrera o con Servicios Académicos.
          </p>
        </div>
      </div>
    </div>
  );
}
