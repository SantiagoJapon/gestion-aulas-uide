import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import MapaCalor from '../components/MapaCalor';
import HorarioVisual from '../components/HorarioVisual';
import api, { carreraService, Carrera } from '../services/api';
import { FaFileUpload, FaCheckCircle, FaClock, FaTimesCircle, FaFileExcel } from 'react-icons/fa';

interface Planificacion {
  id: number;
  nombre_archivo: string;
  fecha_procesamiento: string;
  estado: string;
  total_clases: number;
  clases_completas: number;
}

export default function DirectorDashboard() {
  const { user } = useContext(AuthContext);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [planificaciones] = useState<Planificacion[]>([]);
  const [loadingPlanificaciones, setLoadingPlanificaciones] = useState(true);
  const [carrerasActivas, setCarrerasActivas] = useState<Carrera[]>([]);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState('');

  useEffect(() => {
    loadPlanificaciones();
    loadCarrerasActivas();
  }, []);

  useEffect(() => {
    if (user?.carrera_director) {
      // Convertir el ID a string para el select
      setCarreraSeleccionada(String(user.carrera_director));
    }
  }, [user]);

  const loadPlanificaciones = async () => {
    try {
      setLoadingPlanificaciones(true);
      // TODO: Implementar endpoint para obtener planificaciones del director
      // const response = await api.get('/api/planificaciones/mis-planificaciones');
      // setPlanificaciones(response.data);
    } catch (error) {
      console.error('Error al cargar planificaciones:', error);
    } finally {
      setLoadingPlanificaciones(false);
    }
  };

  const loadCarrerasActivas = async () => {
    try {
      const response = await carreraService.getCarreras(false);
      setCarrerasActivas(response.carreras);
    } catch (error) {
      console.error('Error al cargar carreras activas:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Por favor selecciona un archivo' });
      return;
    }
    if (!carreraSeleccionada) {
      setMessage({ type: 'error', text: 'Selecciona una carrera habilitada' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      // Encontrar el ID de la carrera seleccionada (buscar por ID, no por nombre)
      const carreraObj = carrerasActivas.find(c => c.id === Number(carreraSeleccionada));
      if (!carreraObj) {
        setMessage({ type: 'error', text: 'Carrera no encontrada' });
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('archivo', selectedFile);
      formData.append('carrera_id', carreraObj.id.toString());

      await api.post('/api/planificaciones/subir', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage({ type: 'success', text: 'Planificación subida exitosamente. Se está procesando...' });
      setSelectedFile(null);
      // NO limpiar carreraSeleccionada si el usuario tiene una carrera asignada
      if (!user?.carrera_director) {
        setCarreraSeleccionada('');
      }
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      // Recargar planificaciones después de un delay
      setTimeout(() => {
        loadPlanificaciones();
      }, 2000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.mensaje || error.response?.data?.error || 'Error al subir la planificación',
      });
    } finally {
      setUploading(false);
    }
  };

  const getEstadoCounts = () => {
    const pendientes = planificaciones.filter(p => p.estado === 'PENDIENTE').length;
    const aprobadas = planificaciones.filter(p => p.estado === 'APROBADA').length;
    const rechazadas = planificaciones.filter(p => p.estado === 'RECHAZADA').length;
    return { pendientes, aprobadas, rechazadas };
  };

  const estadoCounts = getEstadoCounts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Dashboard Director
          </h1>
          <div className="space-y-1">
            <p className="text-lg text-muted-foreground">
              Bienvenido, <span className="font-semibold text-primary">{user?.nombre} {user?.apellido}</span>
            </p>
            {user?.carrera && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-medium text-muted-foreground">Carrera:</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20">
                  {user.carrera.nombre}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Planificaciones Pendientes"
            value={estadoCounts.pendientes}
            subtitle="Esperando revisión"
            icon={FaClock}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-100"
          />
          <StatCard
            title="Planificaciones Aprobadas"
            value={estadoCounts.aprobadas}
            subtitle="Procesadas correctamente"
            icon={FaCheckCircle}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
          />
          <StatCard
            title="Total Subidas"
            value={planificaciones.length}
            subtitle="Este ciclo académico"
            icon={FaFileExcel}
            iconColor="text-primary"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subida de Planificación Mejorada */}
          <div className="bg-card rounded-xl shadow-card p-6 border border-border animate-fade-in">
            <div className="flex items-center mb-6">
              <div className="bg-primary/10 p-3 rounded-lg mr-4">
                <FaFileUpload className="text-2xl text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Subir Planificación
              </h2>
            </div>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label 
                  htmlFor="file-input" 
                  className="block text-sm font-medium text-muted-foreground mb-2"
                >
                  Archivo Excel (.xlsx, .xls)
                </label>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Carrera habilitada
                  </label>
                  <select
                    value={carreraSeleccionada}
                    onChange={(e) => setCarreraSeleccionada(e.target.value)}
                    disabled={Boolean(user?.carrera_director)}
                    className="w-full border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value="">Selecciona una carrera</option>
                    {carrerasActivas.map((carrera) => (
                      <option key={carrera.id} value={carrera.id}>
                        {carrera.carrera}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user?.carrera_director
                      ? 'Carrera asignada por el administrador'
                      : 'Solo las carreras activas pueden subir planificación'}
                  </p>
                </div>
                <div className="relative">
                  <input
                    id="file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 border-2 border-dashed border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary transition-colors cursor-pointer bg-background"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <FaFileExcel className="text-3xl text-muted-foreground" />
                  </div>
                </div>
                {selectedFile && (
                  <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-primary">
                      ✓ {selectedFile.name}
                    </p>
                    <p className="text-xs text-primary/80 mt-1">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}
              </div>

              {message && (
                <div
                  className={`p-4 rounded-lg border ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 border-green-200'
                      : 'bg-destructive/10 text-destructive border-destructive/30'
                  }`}
                >
                  <div className="flex items-center">
                    {message.type === 'success' ? (
                      <FaCheckCircle className="mr-2" />
                    ) : (
                      <FaTimesCircle className="mr-2" />
                    )}
                    <span>{message.text}</span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={uploading}
                disabled={!selectedFile || !carreraSeleccionada}
                icon={FaFileUpload}
              >
                {uploading ? 'Subiendo...' : 'Subir Planificación'}
              </Button>
            </form>
          </div>

          {/* Estado de Planificaciones Mejorado */}
          <div className="bg-card rounded-xl shadow-card p-6 border border-border animate-fade-in">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Mis Planificaciones
            </h2>
            
            {loadingPlanificaciones ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border border-border bg-muted/40 p-4 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Pendientes</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {estadoCounts.pendientes} planificación{estadoCounts.pendientes !== 1 ? 'es' : ''}
                      </p>
                    </div>
                    <FaClock className="text-2xl text-yellow-600" />
                  </div>
                </div>
                
                <div className="border border-border bg-muted/40 p-4 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Aprobadas</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {estadoCounts.aprobadas} planificación{estadoCounts.aprobadas !== 1 ? 'es' : ''}
                      </p>
                    </div>
                    <FaCheckCircle className="text-2xl text-green-600" />
                  </div>
                </div>
                
                <div className="border border-border bg-muted/40 p-4 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Rechazadas</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {estadoCounts.rechazadas} planificación{estadoCounts.rechazadas !== 1 ? 'es' : ''}
                      </p>
                    </div>
                    <FaTimesCircle className="text-2xl text-destructive" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instrucciones mejoradas */}
        <div className="mt-8 bg-card border border-border rounded-xl p-6 shadow-card animate-fade-in">
          <h3 className="font-bold text-foreground mb-3 text-lg flex items-center">
            <FaFileExcel className="mr-2" />
            Instrucciones para Subir Planificación
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>El archivo Excel debe contener las columnas: <strong>Materia, Profesor, Horario, Carrera, Estudiantes</strong></span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Una vez subido, la planificación será procesada automáticamente por el sistema</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Recibirás una notificación cuando se complete el procesamiento</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>El administrador revisará y aprobará la planificación</span>
            </li>
          </ul>
        </div>

        {/* Horario de Clases - Vista Director (SOLO SU CARRERA) */}
        {user?.carrera_director && (
          <div className="mt-8 animate-fade-in">
            <HorarioVisual />
          </div>
        )}

        {/* Mapa de Calor - Vista Director (SOLO SU CARRERA) */}
        {user?.carrera_director && (
          <div className="mt-8 animate-fade-in">
            <MapaCalor
              carreraId={Number(user.carrera_director)}
              titulo={`Mapa de Calor - ${carrerasActivas.find(c => c.id === Number(user.carrera_director))?.carrera || 'Mi Carrera'}`}
              showExport={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}






