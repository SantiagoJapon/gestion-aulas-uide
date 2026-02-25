import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import { distribucionService, notificacionService, Notificacion } from '../services/api';
import UserSettings from '../components/UserSettings';
import HorarioVisual from '../components/HorarioVisual';
import ReservaWidget from '../components/reservas/ReservaWidget';
import GuidedTour from '../components/common/GuidedTour';
import { Step } from 'react-joyride';


// --- Utility Functions ---

const getNomalizedDay = () => {
  const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const today = new Date().getDay();
  return days[today];
};

const getStatusClass = (start: string, end: string) => {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  if (currentMins >= startMins && currentMins < endMins) return 'actual';
  if (currentMins < startMins) return 'futura';
  return 'pasada';
};

// --- Widgets ---

const TimelineClases = ({ clases, filter }: { clases: any[], filter?: string }) => {
  const filtered = filter
    ? clases.filter(c => c.materia.toLowerCase().includes(filter.toLowerCase()))
    : clases;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
        <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">
          {filter ? 'search_off' : 'event_available'}
        </span>
        <p className="text-sm font-bold text-slate-500">
          {filter ? `No hay clases que coincidan con "${filter}"` : 'No tienes clases programadas para hoy.'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {filter ? 'Intenta borrar el filtro o buscar otra materia.' : '¡Aprovecha para estudiar o descansar!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
      {filtered.map((c, i) => {
        const estado = getStatusClass(c.hora_inicio, c.hora_fin);
        return (
          <div key={i} className="relative pl-10 group">
            <div className={`absolute left-0 size-8 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-950 z-10 transition-colors ${estado === 'actual' ? 'bg-uide-blue text-white shadow-lg shadow-uide-blue/30 scale-110' :
              estado === 'futura' ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' :
                'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
              }`}>
              <span className="material-symbols-outlined text-sm font-bold">
                {estado === 'actual' ? 'play_arrow' : estado === 'pasada' ? 'check' : 'schedule'}
              </span>
            </div>

            <div className={`p-4 rounded-2xl border transition-all duration-300 ${estado === 'actual'
              ? 'bg-uide-blue text-white shadow-xl shadow-uide-blue/20 border-uide-blue transform scale-[1.02]'
              : 'bg-card hover:bg-slate-50 dark:hover:bg-slate-800/50 border-border opacity-90 hover:opacity-100'
              }`}>
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[10px] font-black uppercase tracking-widest ${estado === 'actual' ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {c.hora_inicio} - {c.hora_fin}
                </span>
                {estado === 'actual' && (
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase animate-pulse">En Curso</span>
                )}
              </div>
              <h4 className={`text-base font-black uppercase tracking-tight mb-2 ${estado === 'actual' ? 'text-white' : 'text-foreground'}`}>
                {c.materia}
              </h4>
              <div className="flex items-center gap-4 text-xs">
                <div className={`flex items-center gap-1.5 ${estado === 'actual' ? 'text-white/90' : 'text-muted-foreground'}`}>
                  <span className="material-symbols-outlined text-base">room</span>
                  <span className="font-bold">{c.aula || 'Sin Aula'}</span>
                </div>
                <div className={`flex items-center gap-1.5 ${estado === 'actual' ? 'text-white/90' : 'text-muted-foreground'}`}>
                  <span className="material-symbols-outlined text-base">person</span>
                  <span className="font-medium truncate max-w-[120px]">{c.docente || 'Docente'}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AvisosWidget = () => {
  const [avisos, setAvisos] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotificaciones = async () => {
      try {
        const res = await notificacionService.misNotificaciones();
        if (res.success && res.notificaciones) {
          setAvisos(res.notificaciones);
        }
      } catch (error) {
        console.error("Error cargando notificaciones", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotificaciones();
  }, []);

  if (loading) return <div className="text-center py-6 text-xs text-muted-foreground">Cargando avisos...</div>;

  if (avisos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center opacity-60">
        <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">notifications_off</span>
        <p className="text-xs text-slate-500">No tienes notificaciones nuevas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
      {avisos.map(aviso => {
        const esUrgente = aviso.prioridad === 'ALTA';
        // Icono y color según tipo
        let icon = 'info';
        let colorClass = 'bg-slate-100 text-slate-600';

        switch (aviso.tipo) {
          case 'CLASE':
            icon = 'school';
            colorClass = 'bg-indigo-100 text-indigo-600';
            break;
          case 'CARRERA':
          case 'DIRECTOR' as any: // Mapeo si hubiese tipo DIRECTOR legacy
            icon = 'campaign';
            colorClass = 'bg-amber-100 text-amber-600';
            break;
          case 'GLOBAL':
            icon = 'public';
            colorClass = 'bg-blue-100 text-blue-600';
            break;
          case 'SISTEMA':
            icon = 'settings';
            colorClass = 'bg-gray-100 text-gray-600';
            break;
          case 'DIRECTA':
            icon = 'mail';
            colorClass = 'bg-emerald-100 text-emerald-600';
            break;
        }

        // Formatear hora relativa (simple)
        const fecha = new Date(aviso.created_at);
        const ahora = new Date();
        const diffHrs = Math.floor((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60));
        let tiempo = '';
        if (diffHrs < 1) tiempo = 'Hace un momento';
        else if (diffHrs < 24) tiempo = `Hace ${diffHrs} horas`;
        else tiempo = fecha.toLocaleDateString();

        const remitente = aviso.remitenteInfo
          ? `${aviso.remitenteInfo.nombre} ${aviso.remitenteInfo.apellido} (${aviso.remitenteInfo.rol})`
          : 'Sistema';

        return (
          <div key={aviso.id} className={`p-4 rounded-xl border flex gap-3 items-start ${esUrgente ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50' : 'bg-card border-border'}`}>
            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
              <span className="material-symbols-outlined text-sm">{icon}</span>
            </div>
            <div className="w-full">
              <div className="flex justify-between items-start w-full">
                <h5 className="text-xs font-black text-foreground uppercase truncate max-w-[150px]">{remitente}</h5>
                <span className="text-[9px] text-muted-foreground font-medium shrink-0 ml-2">{tiempo}</span>
              </div>
              <h6 className="text-xs font-bold mt-1 text-foreground/90">{aviso.titulo}</h6>
              <p className={`text-xs mt-0.5 leading-relaxed ${esUrgente ? 'text-red-800 dark:text-red-300 font-medium' : 'text-muted-foreground'}`}>
                {aviso.mensaje}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}



export default function EstudianteDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('general');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Persistir filtro en localStorage
  const [subjectFilter, setSubjectFilter] = useState(() => {
    return localStorage.getItem('uide_student_subject_filter') || '';
  });

  useEffect(() => {
    localStorage.setItem('uide_student_subject_filter', subjectFilter);
  }, [subjectFilter]);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await distribucionService.getMiDistribucion();
        if (res.success && res.clases) {
          setSchedule(res.clases);
        }
      } catch (error) {
        console.error("Error al cargar horario:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const todayName = getNomalizedDay();
  const clasesHoy = schedule
    .filter(c => c.dia.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === todayName)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const nextClass = clasesHoy.find(c => getStatusClass(c.hora_inicio, c.hora_fin) !== 'pasada');

  // --- Tour Logic ---
  const [runTour, setRunTour] = useState(false);
  const tourSteps: Step[] = [
    {
      target: '#tour-logo',
      content: '¡Bienvenido a tu nuevo Portal UIDE Alumno! Aquí podrás gestionar todo tu día académico.',
      placement: 'right' as const,
      disableBeacon: true,
    },
    {
      target: '#tour-search',
      content: 'Usa el Buscador Global para encontrar rápidamente a un docente o consultar el estado de un aula en tiempo real.',
    },
    {
      target: '#tour-header-card',
      content: 'Este es tu resumen diario. Aquí verás tu próxima clase y recordatorios importantes.',
    },
    {
      target: '#tour-timeline',
      content: 'En tu jornada verás las materias de hoy. Las clases activas se resaltan automáticamente.',
    },
    {
      target: '#tour-reservas',
      content: '¿Necesitas un lugar para estudiar? Usa el widget de reserva rápida para asegurar un espacio.',
    },
    {
      target: '#tour-nav-horario',
      content: 'En la pestaña "Mis Clases" encontrarás tu horario visual completo por semana.',
    },
    {
      target: '#tour-help-button',
      content: 'Si alguna vez necesitas repetir este tour, solo haz clic aquí.',
      placement: 'top-end',
      disableScrolling: true,
      spotlightPadding: 10,
    }
  ];

  useEffect(() => {
    // Auto-ejecución solo la primera vez para estudiantes
    const hasSeenTour = localStorage.getItem('uide_tour_estudiante_v1');
    if (!hasSeenTour) {
      setRunTour(true);
    }

    // Escuchar reinicio manual
    const handleRestart = () => {
      setRunTour(false);
      setTimeout(() => setRunTour(true), 100);
    };

    window.addEventListener('restart-uide-tour', handleRestart);
    return () => window.removeEventListener('restart-uide-tour', handleRestart);
  }, []);

  const handleTourFinish = () => {
    localStorage.setItem('uide_tour_estudiante_v1', 'true');
    setRunTour(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6 animate-fade-in">
            <GuidedTour steps={tourSteps} run={runTour} onFinish={handleTourFinish} />
            {/* Friendly Header Card */}
            <div id="tour-header-card" className="bg-gradient-to-br from-[#003da5] via-[#002D72] to-[#001a4d] rounded-[2.5rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl shadow-uide-blue/30 border border-white/10 group">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-white/15 transition-all duration-700"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-uide-gold/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex flex-col lg:flex-row items-center gap-6 text-center lg:text-left">
                  {/* Mascot / Avatar */}
                  <div className="relative shrink-0">
                    <div className="size-24 sm:size-32 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-inner overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <img src="/image_guia.png" alt="Mascota UIDE" className="w-full h-full object-contain" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 size-10 bg-emerald-500 border-4 border-[#002D72] rounded-full flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-white text-lg">check</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-3">
                      <span className="bg-uide-gold/20 text-uide-gold px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-uide-gold/20">Portal Estudiantil</span>
                      <span className="bg-white/10 text-white/80 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-sm">Comunidad UIDE</span>
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">
                      ¡Hola, <span className="text-uide-gold">{user?.nombre}</span>!
                    </h2>
                    <p className="text-base sm:text-lg font-medium text-white/70 max-w-lg leading-relaxed italic">
                      "Tu esfuerzo de hoy es el éxito de tu mañana. ¡Que tengas una excelente jornada!"
                    </p>
                    <div className="mt-4 flex items-center justify-center lg:justify-start gap-4">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('restart-uide-tour'))}
                        className="text-xs font-bold bg-white text-[#002D72] px-4 py-2 rounded-xl hover:bg-uide-gold hover:text-white transition-all shadow-lg active:scale-95"
                      >
                        Recorrido rápido
                      </button>
                      <p className="text-[11px] text-white/50 font-medium">Actualizado: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {nextClass ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2rem] min-w-[240px] flex flex-col gap-2 shadow-2xl hover:bg-white/15 transition-colors border-l-4 border-l-uide-gold">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-uide-gold">Próxima Clase</span>
                      <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black">{nextClass.hora_inicio}</span>
                      <span className="text-xs font-medium text-white/60">en {nextClass.aula || 'S/A'}</span>
                    </div>
                    <span className="text-sm font-black truncate max-w-[200px] uppercase tracking-tight">{nextClass.materia}</span>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10 text-[11px] text-white/80">
                      <img src="/blob.png" className="size-4 opacity-70" alt="" />
                      <span className="font-medium">{nextClass.docente || 'Por confirmar'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] min-w-[240px] flex flex-col justify-center items-center text-center gap-3 shadow-xl">
                    <div className="size-16 bg-white/10 rounded-full flex items-center justify-center mb-1">
                      <span className="material-symbols-outlined text-4xl text-uide-gold">verified</span>
                    </div>
                    <div>
                      <span className="block text-sm font-black uppercase tracking-widest text-white">¡Día completado!</span>
                      <span className="text-[10px] text-white/50 font-medium">No tienes más clases hoy</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (Timeline) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Avisos Importantes */}
                <DashboardWidget
                  title="Notificaciones y Avisos"
                  subtitle="Mensajes de Docentes y Cambios"
                  icon="notifications_active"
                  iconColor="text-red-500"
                >
                  <AvisosWidget />
                </DashboardWidget>

                {/* Widget Timeline */}
                <div id="tour-timeline">
                  <DashboardWidget
                    title="Tu Jornada"
                    subtitle="Clases de Hoy"
                    icon="timeline"
                    iconColor="text-uide-blue"
                    action={
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 group-focus-within:text-uide-blue transition-colors">search</span>
                        <input
                          type="text"
                          placeholder="Filtrar materia..."
                          value={subjectFilter}
                          onChange={(e) => setSubjectFilter(e.target.value)}
                          className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold focus:ring-2 focus:ring-uide-blue/20 outline-none w-32 sm:w-48 transition-all"
                        />
                      </div>
                    }
                  >
                    {loading ? (
                      <div className="py-12 text-center text-muted-foreground text-sm">Cargando horario...</div>
                    ) : (
                      <TimelineClases clases={clasesHoy} filter={subjectFilter} />
                    )}
                  </DashboardWidget>
                </div>
              </div>

              {/* Right Column (Widgets) */}
              <div id="tour-reservas" className="space-y-6">
                <ReservaWidget />
              </div>
            </div>
          </div>
        );

      case 'horario':
        return (
          <div className="space-y-6 animate-fade-in">
            <HorarioVisual mode="personal" title="Mi Horario Estudiantil" />
          </div>
        );

      case 'settings':
        return <UserSettings />;

      default:
        setActiveTab('general');
        return null;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      title="Portal Alumno"
    >
      {renderContent()}
    </DashboardLayout>
  );
}
