import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { aulaService } from '../services/api';
import { Navbar } from '../components/Navbar';
import AulaTable from '../components/AulaTable';
import CarreraTable from '../components/CarreraTable';
import DistribucionWidget from '../components/DistribucionWidget';
import { CreateDirectorModal } from '../components/DirectorModal';
import DirectorAssignmentTable from '../components/DirectorAssignmentTable';
import SubirEstudiantes from '../components/SubirEstudiantes';
import { StatCard } from '../components/common/StatCard';
import MapaCalor from '../components/MapaCalor';
import PlanificacionesTable from '../components/PlanificacionesTable';
import EjecutarDistribucion from '../components/EjecutarDistribucion';
import HorarioVisual from '../components/HorarioVisual';
import { 
  FaBuilding, 
  FaUsers, 
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartLine,
  FaFileUpload,
  FaCog,
  FaUserShield
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
  const [isDirectorModalOpen, setIsDirectorModalOpen] = useState(false);
  const [horarioKey, setHorarioKey] = useState(0);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header con bienvenida */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Dashboard Administrador
              </h1>
              <p className="text-lg text-muted-foreground">
                Bienvenido, <span className="font-semibold text-primary">{user?.nombre} {user?.apellido}</span>
              </p>
            </div>
            <div className="hidden md:block">
              <div className="bg-card rounded-xl shadow-card px-6 py-4 border border-border">
                <p className="text-sm text-muted-foreground">Última actualización</p>
                <p className="text-lg font-semibold text-foreground">
                  {new Date().toLocaleDateString('es-EC', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de estadísticas mejoradas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total de Aulas"
            value={loadingStats ? '-' : stats.total}
            subtitle={`${stats.disponibles} disponibles`}
            icon={FaBuilding}
            iconColor="text-primary"
          />
          <StatCard
            title="Capacidad Total"
            value={loadingStats ? '-' : stats.capacidadTotal}
            subtitle="Estudiantes simultáneos"
            icon={FaUsers}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
          />
          <StatCard
            title="Disponibles"
            value={loadingStats ? '-' : stats.disponibles}
            subtitle={`${stats.total > 0 ? Math.round((stats.disponibles / stats.total) * 100) : 0}% del total`}
            icon={FaCheckCircle}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
          />
          <StatCard
            title="En Mantenimiento"
            value={loadingStats ? '-' : stats.enMantenimiento}
            subtitle={`${stats.noDisponibles} no disponibles`}
            icon={FaExclamationTriangle}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-100"
          />
        </div>

        {/* Gestión de Aulas */}
        <div className="mb-8 animate-fade-in">
          <div className="bg-card rounded-xl shadow-card p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center">
                <FaBuilding className="mr-3 text-primary" />
                Gestión de Aulas
              </h2>
            </div>
            <AulaTable />
          </div>
        </div>

        {/* Gestión de Carreras */}
        <div className="mb-8 animate-fade-in">
          <div className="bg-card rounded-xl shadow-card p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center">
                <FaCog className="mr-3 text-primary" />
                Carreras habilitadas para planificación
              </h2>
            </div>
            <CarreraTable />
          </div>
        </div>

        {/* Asignación de Directores */}
        <div className="mb-8 animate-fade-in">
          <div className="bg-card rounded-xl shadow-card p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center">
                <FaUserShield className="mr-3 text-primary" />
                Asignación de Directores
              </h2>
              <button
                onClick={() => setIsDirectorModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center"
              >
                <FaUsers className="mr-2" />
                Asignar Director
              </button>
            </div>
            <DirectorAssignmentTable />
          </div>
        </div>

        <CreateDirectorModal 
          isOpen={isDirectorModalOpen} 
          onClose={() => setIsDirectorModalOpen(false)} 
        />

        {/* Subir Estudiantes */}
        <div className="mb-8 animate-fade-in">
          <SubirEstudiantes />
        </div>

        {/* Planificaciones Subidas */}
        <div className="mb-8 animate-fade-in">
          <PlanificacionesTable />
        </div>

        {/* Ejecutar Distribución Automática */}
        <div className="mb-8 animate-fade-in">
          <EjecutarDistribucion onDistribucionCompletada={handleDistribucionCompletada} />
        </div>

        {/* Horario Visual - Todas las Carreras */}
        <div className="mb-8 animate-fade-in">
          <HorarioVisual key={horarioKey} />
        </div>

        {/* Estado de Distribución */}
        <div className="mb-8 animate-fade-in">
          <DistribucionWidget />
        </div>

        {/* Mapa de Calor - Vista Administrador (TODAS LAS CARRERAS) */}
        <div className="mb-8 animate-fade-in">
          <MapaCalor
            titulo="Mapa de Calor - Todas las Carreras"
            showExport={true}
          />
        </div>

        {/* Funcionalidades rápidas mejoradas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          <div className="bg-card rounded-xl shadow-card p-6 hover:shadow-lg transition-all duration-300 border border-border cursor-pointer group">
            <div className="flex items-center mb-4">
              <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                <FaFileUpload className="text-2xl text-primary" />
              </div>
              <h3 className="ml-4 text-lg font-semibold text-foreground">Aprobar Planificaciones</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Revisar y aprobar planificaciones de directores
            </p>
            <div className="mt-4 text-sm text-primary font-medium group-hover:text-primary/80">
              Ver más →
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-card p-6 hover:shadow-lg transition-all duration-300 border border-border cursor-pointer group">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                <FaChartLine className="text-2xl text-green-600" />
              </div>
              <h3 className="ml-4 text-lg font-semibold text-foreground">Distribución Automática</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Ejecutar algoritmo de distribución de aulas
            </p>
            <div className="mt-4 text-sm text-green-600 font-medium group-hover:text-green-700">
              Ejecutar →
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-card p-6 hover:shadow-lg transition-all duration-300 border border-border cursor-pointer group">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                <FaChartLine className="text-2xl text-purple-600" />
              </div>
              <h3 className="ml-4 text-lg font-semibold text-foreground">Reportes</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Generar reportes de uso de aulas
            </p>
            <div className="mt-4 text-sm text-purple-600 font-medium group-hover:text-purple-700">
              Generar →
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-card p-6 hover:shadow-lg transition-all duration-300 border border-border cursor-pointer group">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 p-3 rounded-lg group-hover:bg-orange-200 transition-colors">
                <FaUserShield className="text-2xl text-orange-600" />
              </div>
              <h3 className="ml-4 text-lg font-semibold text-foreground">Gestión de Usuarios</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Administrar usuarios del sistema
            </p>
            <div className="mt-4 text-sm text-orange-600 font-medium group-hover:text-orange-700">
              Administrar →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




