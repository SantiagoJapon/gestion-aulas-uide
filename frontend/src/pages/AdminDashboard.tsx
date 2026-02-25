import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { aulaService } from '../services/api';
import AulaTable from '../components/AulaTable';
import CarreraTable from '../components/CarreraTable';
import DirectorAssignmentView from '../components/DirectorAssignmentView';
import SubirEstudiantes from '../components/SubirEstudiantes';
import MapaCalor from '../components/MapaCalor';
import PlanificacionesTable from '../components/PlanificacionesTable';
import CentroControlDistribucion from '../components/CentroControlDistribucion';
import HorarioVisual from '../components/HorarioVisual';
import EspacioTable from '../components/EspacioTable';
import UserSettings from '../components/UserSettings';
import ReporteEjecutivo from '../components/ReporteEjecutivo';
import EstudianteTable from '../components/EstudianteTable';
import ImportarCupos from '../components/ImportarCupos';
import DocenteTable from '../components/DocenteTable';
import IncidenciasView from '../components/IncidenciasView';
import DisponibilidadAulas from '../components/DisponibilidadAulas';
import DashboardLayout from '../components/layout/DashboardLayout';
import GuidedTour from '../components/common/GuidedTour';
import { Step } from 'react-joyride';
import ReservasAdminView from '../components/reservas/ReservasAdminView';

import DashboardWidget from '../components/dashboard/DashboardWidget';

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    total: 0,
    disponibles: 0,
    enMantenimiento: 0,
    noDisponibles: 0,
    capacidadTotal: 0,
  });
  const [horarioKey, setHorarioKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'general' | 'distribucion' | 'disponibilidad' | 'reservas' | 'espacios' | 'docentes' | 'estudiantes' | 'reportes' | 'incidencias' | 'settings'>('general');

  // --- Tour de Guia ---
  const [runTour, setRunTour] = useState(false);

  const tourSteps: Step[] = [
    {
      target: '#tour-logo',
      content: 'Bienvenido al Sistema de Gestión de Aulas UIDE. Este tour te enseñará las principales funciones del panel de administrador.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#tour-nav-general',
      content: 'En la sección INICIO encontrarás el panel de control con métricas en tiempo real: total de aulas, disponibilidad, capacidad y estado de mantenimiento.',
      placement: 'right',
    },
    {
      target: '#tour-nav-distribucion',
      content: 'En DISTRIBUCIÓN puedes aprobar las planificaciones enviadas por los directores de carrera y distribuir automáticamente las clases en las aulas disponibles.',
      placement: 'right',
    },
    {
      target: '#tour-nav-docentes',
      content: 'En DOCENTES puedes gestionar el registro de docentes, ver sus especialidades y asignaciones actuales.',
      placement: 'right',
    },
    {
      target: '#tour-nav-estudiantes',
      content: 'En ESTUDIANTES puedes visualizar el listado completo de estudiantes y realizar cargas masivas desde Excel.',
      placement: 'right',
    },
    {
      target: '#tour-nav-incidencias',
      content: 'En INCIDENCIAS gestionas los reportes de problemas enviados por docentes y estudiantes, como fallas de equipos o solicitud de mantenimiento.',
      placement: 'right',
    },
    {
      target: '#tour-help-button',
      content: 'Si necesitas ayuda en cualquier momento, haz clic en este botón dorado de ayuda para reiniciar el tour.',
      placement: 'top-end',
      disableScrolling: true,
      spotlightPadding: 10,
    },
  ];

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('uide_tour_admin_v1');
    if (!hasSeenTour) {
      setTimeout(() => setRunTour(true), 1000);
    }

    const handleRestart = () => {
      localStorage.removeItem('uide_tour_admin_v1');
      setRunTour(false);
      setTimeout(() => setRunTour(true), 100);
    };

    window.addEventListener('restart-uide-tour', handleRestart);
    return () => window.removeEventListener('restart-uide-tour', handleRestart);
  }, []);

  const handleTourFinish = () => {
    localStorage.setItem('uide_tour_admin_v1', 'true');
    setRunTour(false);
  };


  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await aulaService.getAulasStats();
      setStats(response.stats || { total: 0, disponibles: 0, enMantenimiento: 0, noDisponibles: 0, capacidadTotal: 0 });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const handleDistribucionCompletada = () => {
    setHorarioKey(prev => prev + 1);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-10 pb-20 animate-fade-in">
            {/* Friendly Header Card */}
            <div id="tour-header-card" className="bg-gradient-to-br from-[#003da5] via-[#002D72] to-[#001a4d] rounded-[2.5rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl shadow-uide-blue/30 border border-white/10 group mb-2">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-white/15 transition-all duration-700"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex flex-col lg:flex-row items-center gap-6 text-center lg:text-left">
                  {/* Mascot / Avatar */}
                  <div className="relative shrink-0">
                    <div className="size-24 sm:size-32 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-inner overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <img src="/image_guia.png" alt="Mascota UIDE" className="w-full h-full object-contain" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 size-10 bg-uide-gold border-4 border-[#002D72] rounded-full flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-white text-lg">admin_panel_settings</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-3">
                      <span className="bg-uide-gold/20 text-uide-gold px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-uide-gold/20">Administración Central</span>
                      <span className="bg-white/10 text-white/80 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-sm">Sede Loja</span>
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">
                      ¡Hola, <span className="text-uide-gold">{user?.nombre}</span>!
                    </h2>
                    <p className="text-base sm:text-lg font-medium text-white/70 max-w-lg leading-relaxed italic">
                      "Gestión inteligente para una educación de excelencia."
                    </p>
                    <div className="mt-4 flex items-center justify-center lg:justify-start gap-4">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('restart-uide-tour'))}
                        className="text-xs font-bold bg-white text-[#002D72] px-4 py-2 rounded-xl hover:bg-uide-gold hover:text-white transition-all shadow-lg active:scale-95"
                      >
                        Guía del Administrador
                      </button>
                      <p className="text-[11px] text-white/50 font-medium uppercase tracking-widest">
                        {new Date().toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-[2rem] min-w-[200px] flex-col items-center justify-center text-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-uide-gold">Infraestructura</span>
                  <div className="text-3xl font-black">{stats.total}</div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold text-white/60">{stats.disponibles} Libres</span>
                  </div>
                </div>
              </div>
            </div>
            {/* 1. KPIs PANORÁMICOS */}
            <div id="tour-kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Aulas Totales', value: stats.total, icon: 'door_open', color: 'blue', desc: 'Espacios físicos' },
                { label: 'Disponibles', value: stats.disponibles, icon: 'check_circle', color: 'emerald', desc: 'Listas para uso' },
                { label: 'En Uso / Manten.', value: stats.noDisponibles + stats.enMantenimiento, icon: 'block', color: 'orange', desc: 'Ocupadas u obras' },
                { label: 'Capacidad', value: stats.capacidadTotal, icon: 'groups', color: 'indigo', desc: 'Aforo total UIDE' }
              ].map((kpi, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-border/50 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                  <div className={`size-12 rounded-2xl bg-${kpi.color}-500/10 flex items-center justify-center text-${kpi.color}-600 mb-4 group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-2xl">{kpi.icon}</span>
                  </div>
                  <h4 className="text-4xl font-black text-foreground tracking-tighter leading-none">{kpi.value}</h4>
                  <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest mt-2">{kpi.label}</p>
                  <p className="text-[9px] text-muted-foreground/60 font-medium uppercase mt-1">{kpi.desc}</p>
                </div>
              ))}
            </div>

            {/* 2. GRID PRINCIPAL (Tabla + Historial) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Listado de Aulas (8/12) */}
              <div id="tour-inventario-aulas" className="lg:col-span-8">
                <DashboardWidget
                  title="Control de Inventario"
                  subtitle="Gestión detallada de aulas y laboratorios"
                  icon="inventory_2"
                >
                  <div className="p-1">
                    <AulaTable />
                  </div>
                </DashboardWidget>
              </div>

              {/* Barra Lateral (4/12) */}
              <div className="lg:col-span-4 space-y-8">
                <div id="tour-planificaciones">
                  <DashboardWidget
                    title="Planificaciones"
                    subtitle="Cargas de archivos recientes"
                    icon="history"
                  >
                    <div className="max-h-[500px] overflow-y-auto pr-1">
                      <PlanificacionesTable />
                    </div>
                  </DashboardWidget>
                </div>

                {/* Info Card Quick Action */}
                <div className="bg-primary p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <h4 className="text-2xl font-black tracking-tighter leading-none mb-2">Asignación <br />Estratégica</h4>
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-6">Módulo de IA actvado</p>
                    <button
                      onClick={() => setActiveTab('distribucion')}
                      className="bg-white text-primary p-3 px-6 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg active:scale-95 hover:bg-slate-50"
                    >
                      Ir al Centro de Mando
                    </button>
                  </div>
                  <span className="material-symbols-outlined text-[10rem] absolute -bottom-10 -right-10 text-white/10 group-hover:scale-110 transition-transform">auto_fix</span>
                </div>
              </div>
            </div>

            {/* 3. HORARIO MAESTRO (Full Width) */}
            <div className="pt-4">
              <DashboardWidget
                title="Horario Maestro"
                subtitle="Visualización cronológica global de todas las facultades"
                icon="calendar_view_week"
                noPadding
              >
                <div className="p-2 min-h-[500px] overflow-hidden rounded-[2rem]">
                  <HorarioVisual key={horarioKey} />
                </div>
              </DashboardWidget>
            </div>

            {/* 4. MAPA DE CALOR (Full Width) */}
            <div className="pt-6 border-t border-border/50">
              <DashboardWidget
                title="Saturación Institucional"
                subtitle="Mapa de calor detallado por franjas horarias y días"
                icon="grid_view"
                noPadding
              >
                <div className="p-4 overflow-hidden rounded-[2rem] bg-background">
                  <MapaCalor />
                </div>
              </DashboardWidget>
            </div>
          </div>
        );

      case 'distribucion':
        return (
          <div className="space-y-12 animate-fade-in pb-20">
            {/* El Centro de Mando debe ser el protagonista absoluto */}
            <div id="tour-centro-mando" className="bg-slate-900 rounded-[3rem] p-4 shadow-2xl border border-white/5">
              <CentroControlDistribucion onDistribucionCompletada={handleDistribucionCompletada} />
            </div>

            {/* Asignación de Roles - Ahora en ancho completo para evitar amontonamiento */}
            <div className="space-y-12">
              <DashboardWidget
                title="Gestión de Liderazgo Académico"
                subtitle="Vincule directores a sus respectivas carreras para otorgar permisos"
                icon="person_pin"
              >
                <div className="px-1">
                  <DirectorAssignmentView />
                </div>
              </DashboardWidget>

              <DashboardWidget
                title="Estructura Curricular"
                subtitle="Configure las carreras habilitadas y sus estados institucionales"
                icon="account_tree"
              >
                <div className="px-1">
                  <CarreraTable />
                </div>
              </DashboardWidget>
            </div>
          </div>
        );

      case 'disponibilidad':
        return <DisponibilidadAulas />;

      case 'reservas':
        return <ReservasAdminView />;

      case 'espacios':
        return (
          <div className="space-y-6 animate-fade-in pb-20">
            <DashboardWidget title="Gestión de Espacios Adicionales" icon="space_dashboard">
              <EspacioTable />
            </DashboardWidget>
          </div>
        );

      case 'estudiantes':
        return (
          <div id="tour-seccion-estudiantes" className="space-y-10 animate-fade-in pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8">
                <DashboardWidget title="Listado General de Estudiantes" subtitle="Base de datos oficial" icon="group">
                  <EstudianteTable />
                </DashboardWidget>
              </div>
              <div className="lg:col-span-4 space-y-6">
                <DashboardWidget title="Carga Masiva (Perfiles)" subtitle="Nombres y Cédulas" icon="upload_file">
                  <SubirEstudiantes />
                </DashboardWidget>
                <DashboardWidget title="Importar Cupos (Excel)" subtitle="Vinculación de materias" icon="sync_alt">
                  <ImportarCupos isCompact />
                </DashboardWidget>
              </div>
            </div>
          </div>
        );

      case 'docentes':
        return (
          <div id="tour-seccion-docentes" className="space-y-6 animate-fade-in pb-20">
            <DashboardWidget title="Plantilla Docente Institucional" icon="badge">
              <DocenteTable carreraId={0} />
            </DashboardWidget>
          </div>
        );

      case 'reportes':
        return (
          <div className="space-y-6 animate-fade-in pb-20">
            <DashboardWidget title="Reportes Institucionales" icon="description">
              <ReporteEjecutivo />
            </DashboardWidget>
          </div>
        );

      case 'incidencias':
        return (
          <div id="tour-seccion-incidencias" className="space-y-6 animate-fade-in pb-20">
            <div className="flex gap-4 mb-4">
              <div className="bg-white dark:bg-slate-900 border border-border/50 p-6 rounded-[2.5rem] flex-1">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <span className="material-symbols-outlined">warning</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-foreground">Centro de Incidencias</h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Reportes de Hardware y Mantenimiento</p>
                  </div>
                </div>
              </div>
            </div>
            <IncidenciasView />
          </div>
        );

      case 'settings':
        return <UserSettings />;

      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      title="Administrador"
      subtitle="UIDE Gestión"
    >
      <div className="mb-12 px-2 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-foreground tracking-tighter leading-none mb-3">
            {user ? `${user.nombre}` : 'Panel de Control'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
              <span className="size-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              Estado: Operativo
            </span>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
              {new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        <button
          onClick={loadStats}
          className="size-14 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-all active:scale-95 group"
          title="Refrescar métricas"
        >
          <span className="material-symbols-outlined text-[24px] group-hover:rotate-180 transition-transform duration-500">refresh</span>
        </button>
      </div>

      {renderContent()}

      <GuidedTour
        steps={tourSteps}
        run={runTour}
        onFinish={handleTourFinish}
      />
    </DashboardLayout>
  );
}
