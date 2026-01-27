import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { StatCard } from '../components/common/StatCard';
import { DataTable } from '../components/common/DataTable';
import MapaCalor from '../components/MapaCalor';
import { FaChalkboardTeacher, FaClock, FaBuilding, FaCalendarAlt } from 'react-icons/fa';
import api from '../services/api';

interface Horario {
  id: number;
  materia: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  aula: string;
  num_estudiantes: number;
}

export default function ProfesorDashboard() {
  const { user } = useContext(AuthContext);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHorarios();
  }, []);

  const loadHorarios = async () => {
    try {
      setLoading(true);
      // TODO: Implementar endpoint para obtener horarios del profesor
      // const response = await api.get('/api/profesores/mis-horarios');
      // setHorarios(response.data);
      
      // Datos de ejemplo por ahora
      setHorarios([]);
    } catch (error) {
      console.error('Error al cargar horarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

  const getHorarioPorDia = (dia: string) => {
    return horarios.filter(h => h.dia.toLowerCase() === dia.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Dashboard Profesor
          </h1>
          <p className="text-lg text-muted-foreground">
            Bienvenido, <span className="font-semibold text-primary">{user?.nombre} {user?.apellido}</span>
          </p>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Clases Asignadas"
            value={horarios.length}
            subtitle="Este ciclo académico"
            icon={FaChalkboardTeacher}
            iconColor="text-primary"
          />
          <StatCard
            title="Total Estudiantes"
            value={horarios.reduce((sum, h) => sum + (h.num_estudiantes || 0), 0)}
            subtitle="En todas tus clases"
            icon={FaClock}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
          />
          <StatCard
            title="Aulas Asignadas"
            value={new Set(horarios.map(h => h.aula)).size}
            subtitle="Aulas diferentes"
            icon={FaBuilding}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
          />
        </div>

        {/* Horario Semanal */}
        <div className="bg-card rounded-xl shadow-card p-6 border border-border mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center">
              <FaCalendarAlt className="mr-3 text-primary" />
              Mi Horario Semanal
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : horarios.length === 0 ? (
            <div className="text-center py-12">
              <FaChalkboardTeacher className="text-6xl text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No tienes clases asignadas aún</p>
              <p className="text-muted-foreground text-sm mt-2">Las clases aparecerán aquí una vez que se complete la distribución</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Hora</th>
                    {diasSemana.map(dia => (
                      <th key={dia} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {horas.map(hora => (
                    <tr key={hora}>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{hora}</td>
                      {diasSemana.map(dia => {
                        const clase = getHorarioPorDia(dia).find(h => 
                          h.hora_inicio <= hora && h.hora_fin > hora
                        );
                        return (
                          <td key={dia} className="px-2 py-2">
                            {clase ? (
                              <div className="bg-primary text-primary-foreground rounded-lg p-2 text-xs">
                                <p className="font-semibold">{clase.materia}</p>
                                <p className="text-primary-foreground/80">{clase.aula}</p>
                                <p className="text-primary-foreground/70">{clase.num_estudiantes} estudiantes</p>
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lista de Clases */}
        {horarios.length > 0 && (
          <div className="bg-card rounded-xl shadow-card p-6 border border-border animate-fade-in">
            <h2 className="text-2xl font-bold text-foreground mb-6">Mis Clases</h2>
            <DataTable
              data={horarios}
              columns={[
                { key: 'materia', header: 'Materia', sortable: true },
                { key: 'dia', header: 'Día', sortable: true },
                {
                  key: 'hora_inicio',
                  header: 'Horario',
                  render: (item) => `${item.hora_inicio} - ${item.hora_fin}`
                },
                { key: 'aula', header: 'Aula', sortable: true },
                { key: 'num_estudiantes', header: 'Estudiantes', sortable: true },
              ]}
              searchable
              searchPlaceholder="Buscar por materia, aula o día..."
              emptyMessage="No hay clases asignadas"
            />
          </div>
        )}

        {/* Mapa de Calor - Vista Docente (SU CARRERA) */}
        <div className="mt-8 animate-fade-in">
          <MapaCalor
            titulo="Mapa de Calor - Mi Carrera"
            showExport={false}
          />
        </div>
      </div>
    </div>
  );
}






