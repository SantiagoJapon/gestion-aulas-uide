import { useState, useEffect, useContext } from 'react';
import { distribucionService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaBook, FaUsers } from 'react-icons/fa';

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
  aula?: {
    id: number;
    codigo: string;
    nombre: string;
    capacidad: number;
    tipo: string;
  };
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORAS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function HorarioVisual() {
  const { user } = useContext(AuthContext);
  const [clases, setClases] = useState<ClaseHorario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarHorario();
  }, []);

  const cargarHorario = async () => {
    try {
      setLoading(true);
      setError('');
      
      const carreraId = user?.rol === 'director' ? user.carrera_director : undefined;
      const response = await distribucionService.obtenerHorario(carreraId);
      
      setClases(response.horario || []);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cargar horario');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getClasesEnHorario = (dia: string, hora: string) => {
    return clases.filter(clase => {
      if (!clase.dia || !clase.hora_inicio) return false;
      
      // Normalizar día
      const diaNormalizado = normalizarDia(clase.dia);
      if (diaNormalizado !== dia) return false;

      // Verificar si la clase está en esta hora
      const horaClase = clase.hora_inicio.substring(0, 5); // "07:00"
      return horaClase === hora;
    });
  };

  const normalizarDia = (dia: string): string => {
    const diaLower = dia.toLowerCase().trim();
    
    if (diaLower.includes('lun') || diaLower === 'l') return 'Lunes';
    if (diaLower.includes('mar') || diaLower === 'm') return 'Martes';
    if (diaLower.includes('mie') || diaLower === 'x' || diaLower === 'mi') return 'Miércoles';
    if (diaLower.includes('jue') || diaLower === 'j') return 'Jueves';
    if (diaLower.includes('vie') || diaLower === 'v') return 'Viernes';
    if (diaLower.includes('sab') || diaLower === 's') return 'Sábado';
    
    return dia;
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-card p-6 border border-border">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Cargando horario...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border-2 border-destructive/50 rounded-xl p-6">
        <p className="text-destructive font-medium">{error}</p>
      </div>
    );
  }

  if (clases.length === 0) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <FaCalendarAlt className="text-yellow-600" size={24} />
          <div>
            <h3 className="font-semibold text-yellow-900">Sin horario disponible</h3>
            <p className="text-sm text-yellow-700">
              {user?.rol === 'admin' 
                ? 'No hay distribución de aulas. Ejecuta la distribución automática primero.'
                : 'Tu carrera aún no tiene aulas asignadas.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <FaCalendarAlt className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                Horario de Clases
              </h3>
              <p className="text-sm text-muted-foreground">
                {user?.rol === 'admin' 
                  ? `${clases.length} clases distribuidas - Todas las carreras`
                  : `${clases.length} clases distribuidas - ${user?.carrera?.nombre || 'Tu carrera'}`}
              </p>
            </div>
          </div>
          <button
            onClick={cargarHorario}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Horario Grid */}
      <div className="p-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-2 border-border bg-muted/50 px-4 py-3 text-sm font-semibold text-foreground min-w-[80px]">
                <FaClock className="inline mr-2" />
                Hora
              </th>
              {DIAS.map(dia => (
                <th key={dia} className="border-2 border-border bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground min-w-[180px]">
                  {dia}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map(hora => (
              <tr key={hora}>
                <td className="border-2 border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground text-center">
                  {hora}
                </td>
                {DIAS.map(dia => {
                  const clasesEnHorario = getClasesEnHorario(dia, hora);
                  
                  return (
                    <td key={`${dia}-${hora}`} className="border-2 border-border bg-card p-2 align-top min-h-[80px]">
                      {clasesEnHorario.length > 0 ? (
                        <div className="space-y-2">
                          {clasesEnHorario.map((clase, idx) => (
                            <div
                              key={idx}
                              className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg p-3 border-l-4 border-primary hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FaBook className="text-primary flex-shrink-0" size={12} />
                                    <p className="text-sm font-bold text-foreground truncate" title={clase.materia}>
                                      {clase.materia}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                    <FaMapMarkerAlt size={10} />
                                    <span className="font-semibold text-primary">
                                      {clase.aula_asignada}
                                    </span>
                                  </div>

                                  {clase.docente && (
                                    <p className="text-xs text-muted-foreground truncate" title={clase.docente}>
                                      {clase.docente}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                                      <FaUsers size={10} />
                                      {clase.num_estudiantes}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {clase.hora_inicio} - {clase.hora_fin}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground text-xs py-4 opacity-50">
                          -
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary/20 border-l-4 border-primary"></div>
            <span>Clase asignada</span>
          </div>
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt size={12} className="text-primary" />
            <span>Aula asignada</span>
          </div>
          <div className="flex items-center gap-2">
            <FaUsers size={12} />
            <span>Número de estudiantes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
