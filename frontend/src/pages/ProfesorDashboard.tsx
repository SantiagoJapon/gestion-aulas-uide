import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import HorarioVisual from '../components/HorarioVisual';
import MapaCalor from '../components/MapaCalor';
import { distribucionService, MiDistribucionResponse } from '../services/api';
import AppearanceSettings from '../components/AppearanceSettings';

export default function ProfesorDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'general' | 'horario' | 'reportes' | 'settings'>('general');
  const [data, setData] = useState<MiDistribucionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await distribucionService.getMiDistribucion();
      setData(response);
    } catch (error) {
      console.error('Error al cargar datos del profesor:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextClass = () => {
    if (!data?.clases || data.clases.length === 0) return null;

    const now = new Date();
    const currentDay = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'][now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Filter classes for today that haven't finished yet
    const todayClasses = data.clases.filter(c => {
      const classStart = parseInt(c.hora_inicio.split(':')[0]) * 60 + parseInt(c.hora_inicio.split(':')[1]);
      return c.dia.toUpperCase() === currentDay && classStart > currentTime;
    });

    if (todayClasses.length > 0) {
      return todayClasses.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))[0];
    }

    return null;
  };

  const nextClass = getNextClass();

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Next Class Widget */}
              <div className="lg:col-span-2">
                <DashboardWidget
                  title="Siguiente Clase"
                  subtitle="Información en tiempo real"
                  icon="event_upcoming"
                  iconColor="text-uide-blue"
                >
                  {nextClass ? (
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-2">
                      <div className="size-20 bg-uide-blue/10 text-uide-blue rounded-3xl flex items-center justify-center font-black text-2xl">
                        {nextClass.hora_inicio}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <h4 className="text-xl font-black text-foreground uppercase tracking-tight">{nextClass.materia}</h4>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-2">
                          <span className="px-3 py-1 bg-muted rounded-full text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">room</span>
                            {nextClass.aula || 'Por asignar'}
                          </span>
                          <span className="px-3 py-1 bg-muted rounded-full text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">group</span>
                            {nextClass.estudiantes} Estudiantes
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-4xl text-muted-foreground/30">event_available</span>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-2">No tienes clases próximas hoy</p>
                    </div>
                  )}
                </DashboardWidget>
              </div>

              {/* Stats Column */}
              <div className="space-y-4">
                <DashboardWidget title="Resumen" icon="analytics">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Clases Totales</span>
                      <span className="text-xl font-black text-foreground">{data?.estadisticas.total_clases || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Estudiantes</span>
                      <span className="text-xl font-black text-foreground">
                        {data?.clases.reduce((acc, c) => acc + c.estudiantes, 0) || 0}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-primary" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </DashboardWidget>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DashboardWidget title="Horario Semanal" icon="calendar_view_week">
                  <HorarioVisual />
                </DashboardWidget>
              </div>
              <div>
                <DashboardWidget title="Ocupación de Espacios" icon="distance">
                  <MapaCalor />
                </DashboardWidget>
              </div>
            </div>
          </div>
        );

      case 'horario':
        return (
          <div className="space-y-6 animate-fade-in">
            <DashboardWidget title="Mi Calendario Académico" icon="calendar_month">
              <HorarioVisual />
            </DashboardWidget>
          </div>
        );

      case 'settings':
        return (
          <div className="max-w-2xl mx-auto py-8 space-y-8 animate-fade-in">
            <DashboardWidget title="Mi Cuenta" icon="person">
              <div className="p-6 bg-muted/50 rounded-3xl border border-border transition-all">
                <div className="flex items-center gap-6">
                  <div className="size-20 bg-background border border-border rounded-2xl flex items-center justify-center font-black text-2xl text-foreground shadow-sm">
                    {user?.nombre?.[0]}{user?.apellido?.[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
                      {user?.nombre} {user?.apellido}
                    </h3>
                    <p className="text-sm font-bold text-muted-foreground">{user?.email}</p>
                    <span className="inline-block mt-3 px-4 py-1.5 bg-primary text-primary-foreground text-[10px] font-black uppercase rounded-full tracking-widest shadow-lg shadow-primary/20">
                      Docente UIDE
                    </span>
                  </div>
                </div>
              </div>
            </DashboardWidget>

            <AppearanceSettings />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      title="Profesor"
      subtitle="Portal Docente"
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight leading-tight">
            Bienvenido al Portal Docente, {user ? `${user.nombre} ${user.apellido}` : 'Profesor'}
          </h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">
            {new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-3 bg-card rounded-2xl shadow-sm border border-border text-muted-foreground hover:text-primary transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
        </button>
      </div>

      {
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : renderContent()
      }
    </DashboardLayout >
  );
}
