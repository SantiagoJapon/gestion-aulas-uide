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
  Clock3,
  Info
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

  useEffect(() => {
    const today = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date());
    const capitalizedToday = today.charAt(0).toUpperCase() + today.slice(1);
    const normalizedToday = DIAS.includes(capitalizedToday) ? capitalizedToday : 'Lunes';
    setSelectedDia(normalizedToday);

    cargarHorario();
  }, [mode, carreraId]);

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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/50 p-6 rounded-[2rem] border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
            <Calendar className="size-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              {title || (mode === 'personal' ? 'Mi Horario Semanal' : 'Horario de Carrera')}
            </h2>
            <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-green-500 animate-pulse"></span>
              {clases.length} clases programadas
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Controles de Vista */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
        {/* Selector de Días (Solo visible en modo día) */}
        <div className={`flex gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar transition-all ${viewMode === 'semana' ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
          {DIAS.map(dia => (
            <button
              key={dia}
              onClick={() => setSelectedDia(dia)}
              className={`flex flex-col items-center gap-1 min-w-[80px] p-3 rounded-2xl border transition-all ${selectedDia === dia && viewMode === 'dia'
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
            >
              <span className="text-[10px] font-black uppercase tracking-tighter">{dia}</span>
              <span className={`size-5 rounded-full text-[10px] font-black flex items-center justify-center ${selectedDia === dia && viewMode === 'dia' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                {clasesPorDia[dia].length}
              </span>
            </button>
          ))}
        </div>

        {/* Toggle Mode */}
        <div className="flex bg-muted/50 p-1.5 rounded-[1.5rem] border border-border shadow-inner">
          <button
            onClick={() => setViewMode('dia')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'dia'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <ListTodo className="size-4" />
            Día
          </button>
          <button
            onClick={() => setViewMode('semana')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'semana'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <LayoutGrid className="size-4" />
            Semana
          </button>
        </div>
      </div>

      {/* Grid de Contenido */}
      <div className="bg-card min-h-[500px] rounded-[2.5rem] border border-border shadow-sm overflow-hidden p-8">
        {viewMode === 'dia' ? (
          /* VISTA POR DÍA */
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-10">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Clock3 className="size-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground tracking-tight">{selectedDia}</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase">{clasesPorDia[selectedDia].length} clases programadas</p>
              </div>
            </div>

            {clasesPorDia[selectedDia].length > 0 ? (
              <div className="relative pl-10 space-y-6">
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/5 via-primary/20 to-primary/5"></div>

                {clasesPorDia[selectedDia].map((clase, idx) => {
                  const style = getColorForMateria(clase.materia);
                  return (
                    <div key={idx} className="relative group animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className={`absolute -left-[32px] top-1/2 -translate-y-1/2 size-4 rounded-full border-4 border-card z-10 shadow-sm transition-transform group-hover:scale-125 ${style.border.replace('border-', 'bg-')}`}></div>

                      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-[1.75rem] border-l-8 border transition-all hover:shadow-xl hover:translate-x-2 ${style.bg} ${style.border} group-hover:bg-white dark:group-hover:bg-slate-800`}>
                        <div className="space-y-2">
                          <h4 className={`text-lg font-black tracking-tight leading-none ${style.text}`}>{clase.materia}</h4>
                          <div className="flex flex-wrap gap-4 items-center">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                              <span className={`material-symbols-outlined text-[16px] ${style.icon}`}>fingerprint</span>
                              {clase.aula_asignada}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                              <Clock className={`size-3.5 ${style.icon}`} />
                              {clase.hora_inicio} - {clase.hora_fin}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
                            <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                              <MapPin className={`size-3.5 ${style.icon}`} />
                              {clase.aula_asignada}
                            </span>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter truncate max-w-[150px]">
                              {clase.docente || 'Docente sin asignar'}
                            </p>
                          </div>
                          <div className={`size-10 rounded-xl flex items-center justify-center shadow-inner ${style.pill}`}>
                            <span className={`text-[11px] font-black ${style.text}`}>{clase.num_estudiantes}</span>
                          </div>
                          <button className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-white hover:text-primary transition-colors">
                            <ChevronRight className="size-5" />
                          </button>
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
          /* VISTA SEMANAL */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {DIAS.map(dia => (
              <div key={dia} className="flex flex-col gap-4">
                <div title={dia} className="bg-muted/30 p-4 rounded-3xl border border-border mb-2 flex justify-between items-center group hover:bg-muted/50 transition-colors">
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
