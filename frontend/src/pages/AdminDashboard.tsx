import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { aulaService } from '../services/api';
import { Navbar } from '../components/Navbar';
import AulaTable from '../components/AulaTable';
import CarreraTable from '../components/CarreraTable';
import DistribucionWidget from '../components/DistribucionWidget';


import DirectorAssignmentView from '../components/DirectorAssignmentView';
import SubirEstudiantes from '../components/SubirEstudiantes';
import { StatCard } from '../components/common/StatCard';
import MapaCalor from '../components/MapaCalor';
import PlanificacionesTable from '../components/PlanificacionesTable';
import EjecutarDistribucion from '../components/EjecutarDistribucion';
import HorarioVisual from '../components/HorarioVisual';
import DistribucionEspacios from '../components/DistribucionEspacios';
import EspacioTable from '../components/EspacioTable';
import AppearanceSettings from '../components/AppearanceSettings';
import {
  FaBuilding,
  FaUsers,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartLine,
  FaFileUpload,
  FaCog,
  FaUserShield,
  FaThLarge,
  FaMapMarkerAlt,
  FaDoorOpen
} from 'react-icons/fa';

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    total: 0,
    disponibles: 0,
    enMantenimiento: 0,
    noDisponibles: 0,
    capacidadTotal: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const [horarioKey, setHorarioKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'general' | 'distribucion' | 'espacios' | 'settings'>('general');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const response = await aulaService.getAulasStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleDistribucionCompletada = () => {
    // Recargar el horario
    setHorarioKey(prev => prev + 1);
  };

  /* Custom CSS for the new dashboard */
  const styles = `
    .glass-sidebar {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-right: 1px solid rgba(0, 0, 0, 0.05);
    }
    .dark .glass-sidebar {
      background: rgba(16, 23, 34, 0.8);
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }
    .mac-card {
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }
    .dark .mac-card {
      background: #1a222f;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .sidebar-item-active {
      background: rgba(0, 51, 102, 0.1); /* uide-blue with opacity */
      color: #003366; /* uide-blue */
    }
  `;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7f8] dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 antialiased transition-colors duration-300">
      <style>{styles}</style>

      {/* Sidebar Navigation */}
      <aside className="glass-sidebar w-64 flex flex-col h-full sticky top-0 z-20 transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="size-10 bg-uide-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-uide-blue/20">
              <span className="material-symbols-outlined font-bold">school</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-none tracking-tight">UIDE</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Panel Administrativo</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group ${activeTab === 'general' ? 'sidebar-item-active' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">dashboard</span>
              <span className="text-sm font-semibold">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('distribucion')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group ${activeTab === 'distribucion' ? 'sidebar-item-active' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">meeting_room</span>
              <span className="text-sm font-medium">Distribución</span>
            </button>

            {user?.rol === 'admin' && (
              <button
                onClick={() => setActiveTab('espacios')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group ${activeTab === 'espacios' ? 'sidebar-item-active' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">door_open</span>
                <span className="text-sm font-medium">Espacios</span>
              </button>
            )}

            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
              <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">group</span>
              <span className="text-sm font-medium">Estudiantes</span>
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
              <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">bar_chart</span>
              <span className="text-sm font-medium">Reportes</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="bg-uide-blue/5 rounded-xl p-4 border border-uide-blue/10">
            <p className="text-xs font-bold text-uide-blue uppercase tracking-wider mb-1">Plan Pro</p>
            <p className="text-[11px] text-slate-500 mb-3">Gestión completa habilitada.</p>
          </div>
          <div className="mt-6 flex items-center gap-3 px-1">
            <div className="size-9 rounded-full bg-uide-blue text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-white">{user?.nombre} {user?.apellido}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user?.rol}</span>
            </div>
            <span
              onClick={() => setActiveTab('settings')}
              className={`material-symbols-outlined ml-auto text-lg cursor-pointer transition-colors ${activeTab === 'settings' ? 'text-uide-blue' : 'text-slate-400 hover:text-uide-blue'}`}
            >
              settings
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        {activeTab === 'settings' ? (
          <AppearanceSettings />
        ) : (
          <div className="max-w-6xl mx-auto p-8 space-y-8">

            {/* Page Heading */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h2 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight leading-tight">👋 Bienvenido, {user?.nombre}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-base font-medium">Aquí tienes el resumen de la universidad para hoy.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={loadStats} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-200">
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  Actualizar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-uide-blue text-white rounded-lg text-sm font-semibold shadow-md shadow-uide-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  <span className="material-symbols-outlined text-lg">add</span>
                  Nuevo Reporte
                </button>
              </div>
            </div>

            {activeTab === 'general' && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="mac-card p-6 rounded-xl flex flex-col gap-2 group hover:translate-y-[-2px] transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Aulas</p>
                      <span className="material-symbols-outlined text-uide-blue group-hover:scale-110 transition-transform">meeting_room</span>
                    </div>
                    <p className="text-slate-900 dark:text-white text-3xl font-black">{loadingStats ? '-' : stats.total}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                      <p className="text-emerald-500 text-xs font-bold">{stats.disponibles} disponibles</p>
                    </div>
                  </div>

                  <div className="mac-card p-6 rounded-xl flex flex-col gap-2 group hover:translate-y-[-2px] transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Capacidad Total</p>
                      <span className="material-symbols-outlined text-uide-orange group-hover:scale-110 transition-transform">groups</span>
                    </div>
                    <p className="text-slate-900 dark:text-white text-3xl font-black">{loadingStats ? '-' : stats.capacidadTotal}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-uide-orange text-sm">school</span>
                      <p className="text-uide-orange text-xs font-bold">Estudiantes simultáneos</p>
                    </div>
                  </div>

                  <div className="mac-card p-6 rounded-xl flex flex-col gap-2 group hover:translate-y-[-2px] transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Mantenimiento</p>
                      <span className="material-symbols-outlined text-yellow-600 group-hover:scale-110 transition-transform">build</span>
                    </div>
                    <p className="text-slate-900 dark:text-white text-3xl font-black">{loadingStats ? '-' : stats.enMantenimiento}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-yellow-600 text-sm">warning</span>
                      <p className="text-yellow-600 text-xs font-bold">{stats.noDisponibles} no operativas</p>
                    </div>
                  </div>

                  <div className="mac-card p-6 rounded-xl flex flex-col gap-2 group hover:translate-y-[-2px] transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Ocupación</p>
                      <span className="material-symbols-outlined text-uide-blue group-hover:scale-110 transition-transform">percent</span>
                    </div>
                    <p className="text-slate-900 dark:text-white text-3xl font-black">
                      {stats.total > 0 ? Math.round(((stats.total - stats.disponibles) / stats.total) * 100) : 0}%
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
                      <p className="text-slate-400 text-xs font-bold">Porcentaje de uso</p>
                    </div>
                  </div>
                </div>

                {/* Main funcionality components wrapped in new design */}
                <div className="grid grid-cols-1 gap-6">

                  {/* Gestión de Aulas */}
                  <div className="mac-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-uide-blue">meeting_room</span>
                        Gestión de Aulas
                      </h2>
                    </div>
                    <AulaTable />
                  </div>

                  {/* Asignación de Directores */}
                  {/* Asignación de Directores (New Visual Interface) */}
                  <div className="mac-card rounded-xl p-0 overflow-hidden h-[600px] border border-slate-200 dark:border-slate-700 shadow-sm">
                    <DirectorAssignmentView />
                  </div>



                  {/* Subir Estudiantes */}
                  <div className="mac-card rounded-xl p-6">
                    <SubirEstudiantes />
                  </div>

                  {/* Otras Tablas importantes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="mac-card rounded-xl p-6">
                      <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Carreras Habilitadas</h3>
                      <CarreraTable />
                    </div>
                    <div className="mac-card rounded-xl p-6">
                      <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Planificaciones</h3>
                      <PlanificacionesTable />
                    </div>
                  </div>

                  {/* Ejecutar Distribución */}
                  <div className="mac-card rounded-xl p-6 bg-slate-50 dark:bg-slate-800/50 border-dashed border-2 border-slate-200 dark:border-slate-700">
                    <EjecutarDistribucion onDistribucionCompletada={handleDistribucionCompletada} />
                  </div>

                  {/* Horario Visual */}
                  <div className="mac-card rounded-xl p-6">
                    <HorarioVisual key={horarioKey} />
                  </div>

                  {/* Mapa Calor */}
                  <div className="mac-card rounded-xl p-6">
                    <MapaCalor titulo="Mapa de Calor - Todas las Carreras" showExport={true} />
                  </div>

                </div>
              </>
            )}

            {activeTab === 'distribucion' && (
              <div className="mac-card rounded-xl p-6 animate-fade-in">
                <DistribucionEspacios />
              </div>
            )}

            {activeTab === 'espacios' && (
              <div className="mac-card rounded-xl p-6 animate-fade-in">
                <EspacioTable />
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}




