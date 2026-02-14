import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import { distribucionService, reservaService, notificacionService, Notificacion } from '../services/api';
import UserSettings from '../components/UserSettings';
import HorarioVisual from '../components/HorarioVisual';
import ReservaWidget from '../components/reservas/ReservaWidget';


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

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-uide-blue/90 to-uide-blue rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl shadow-uide-blue/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2 opacity-80">
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">{user?.rol || 'ESTUDIANTE'}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">• Bienestar Universitario</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2">¡Hola, {user?.nombre?.split(' ')[0]}!</h2>
                  <p className="text-sm font-medium text-white/80 max-w-lg leading-relaxed">
                    Recuerda revisar tus notificaciones para cambios de aula recientes.
                  </p>
                </div>

                {nextClass ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl min-w-[200px] flex flex-col gap-1 shadow-lg">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Tu Siguiente Clase</span>
                    <span className="text-xl font-black">{nextClass.hora_inicio}</span>
                    <span className="text-sm font-bold truncate max-w-[180px]">{nextClass.materia}</span>
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/80">
                      <span className="material-symbols-outlined text-sm">room</span>
                      {nextClass.aula || 'Por asignar'}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl min-w-[180px] flex flex-col justify-center items-center text-center gap-1 shadow-lg">
                    <span className="material-symbols-outlined text-3xl mb-1">check_circle</span>
                    <span className="text-xs font-bold">Sin más clases hoy</span>
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

              {/* Right Column (Widgets) */}
              <div className="space-y-6">
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
