import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, AlertCircle, Download, RefreshCw, Clock, MapPin } from 'lucide-react';
import { distribucionService, type MapaCalorResponse, type PuntoMapaCalor } from '../services/api';

interface MapaCalorProps {
  carreraId?: number;
  titulo?: string;
  showExport?: boolean;
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORAS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

const NIVEL_CONFIG = {
  EMPTY: {
    bg: 'bg-gray-100',
    text: 'text-gray-400',
    label: 'Vacío',
    border: 'border-gray-200'
  },
  LOW: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'LOW',
    border: 'border-green-300'
  },
  MEDIUM: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    label: 'MEDIUM',
    border: 'border-yellow-300'
  },
  HIGH: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'HIGH',
    border: 'border-red-300'
  }
};

export default function MapaCalor({ carreraId, titulo = 'Mapa de Calor', showExport = true }: MapaCalorProps) {
  const [datos, setDatos] = useState<MapaCalorResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string>('');
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<{ dia: string; hora: number } | null>(null);
  const [vistaActual, setVistaActual] = useState<'semanal' | 'mensual'>('semanal');

  useEffect(() => {
    cargarDatos();
  }, [carreraId]);

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const response = await distribucionService.getMapaCalor(carreraId);
      setDatos(response);
    } catch (err: any) {
      // Si es 404, no mostrar error (endpoint no implementado aún)
      if (err.response?.status === 404) {
        setError('');
        setDatos(null);
      } else {
        setError(err.response?.data?.mensaje || 'Error al cargar mapa de calor');
      }
      console.error('Error:', err);
    } finally {
      setCargando(false);
    }
  };

  const obtenerPunto = (dia: string, hora: number): PuntoMapaCalor | null => {
    if (!datos) return null;
    return datos.puntos.find(p => p.dia === dia && p.hora === hora) || null;
  };

  const obtenerDetalle = (dia: string, hora: number) => {
    if (!datos) return null;
    return datos.detalles.find(d => d.dia === dia && d.hora === hora);
  };

  const handleCeldaClick = (dia: string, hora: number) => {
    const detalle = obtenerDetalle(dia, hora);
    if (detalle && detalle.clases.length > 0) {
      setPuntoSeleccionado({ dia, hora });
    }
  };

  const exportarDatos = (formato: 'pdf' | 'excel') => {
    alert(`Exportando a ${formato.toUpperCase()}... (Próximamente)`);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-xl shadow-lg">
        <RefreshCw className="animate-spin text-blue-600 mr-3" size={24} />
        <span className="text-gray-600">Cargando mapa de calor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h3 className="font-semibold text-red-900">Error al cargar</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-yellow-600" size={24} />
          <div>
            <h3 className="font-semibold text-yellow-900">Sin datos</h3>
            <p className="text-sm text-yellow-700">No hay distribución de aulas disponible</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{titulo}</h2>
            <p className="text-sm text-gray-600">
              Ocupación de aulas por día y hora
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={cargarDatos}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          {showExport && (
            <>
              <button
                onClick={() => exportarDatos('pdf')}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Download size={16} />
                PDF
              </button>
              <button
                onClick={() => exportarDatos('excel')}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download size={16} />
                Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Total Aulas</span>
            <MapPin size={18} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{datos.estadisticas.total_aulas}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Total Clases</span>
            <Calendar size={18} className="text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">{datos.estadisticas.total_clases}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Ocupación Promedio</span>
            <TrendingUp size={18} className="text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{datos.estadisticas.promedio_ocupacion}%</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Horas Pico</span>
            <Clock size={18} className="text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {datos.estadisticas.horas_pico.join(', ') || 'N/A'}
          </p>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-3">
          <span>Leyenda de ocupación:</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-16 h-8 rounded ${NIVEL_CONFIG.EMPTY.bg} border ${NIVEL_CONFIG.EMPTY.border}`}></div>
            <span className="text-sm text-gray-700">Vacío (0%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-16 h-8 rounded ${NIVEL_CONFIG.LOW.bg} border ${NIVEL_CONFIG.LOW.border} flex items-center justify-center`}>
              <span className={`text-xs font-semibold ${NIVEL_CONFIG.LOW.text}`}>LOW</span>
            </div>
            <span className="text-sm text-gray-700">&lt; 40%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-16 h-8 rounded ${NIVEL_CONFIG.MEDIUM.bg} border ${NIVEL_CONFIG.MEDIUM.border} flex items-center justify-center`}>
              <span className={`text-xs font-semibold ${NIVEL_CONFIG.MEDIUM.text}`}>MEDIUM</span>
            </div>
            <span className="text-sm text-gray-700">40-69%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-16 h-8 rounded ${NIVEL_CONFIG.HIGH.bg} border ${NIVEL_CONFIG.HIGH.border} flex items-center justify-center`}>
              <span className={`text-xs font-semibold ${NIVEL_CONFIG.HIGH.text}`}>HIGH</span>
            </div>
            <span className="text-sm text-gray-700">&ge; 70%</span>
          </div>
        </div>
      </div>

      {/* Mapa de Calor */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-100 border border-gray-300 p-3 text-sm font-semibold text-gray-700 min-w-[100px]">
                HORA / DÍA
              </th>
              {DIAS_SEMANA.map(dia => (
                <th
                  key={dia}
                  className="bg-gradient-to-b from-blue-100 to-blue-50 border border-gray-300 p-3 text-sm font-semibold text-gray-800 min-w-[120px]"
                >
                  {dia.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map(hora => (
              <tr key={hora}>
                <td className="sticky left-0 z-10 bg-gray-50 border border-gray-300 p-3 text-center font-semibold text-gray-700">
                  {String(hora).padStart(2, '0')}:00
                </td>
                {DIAS_SEMANA.map(dia => {
                  const punto = obtenerPunto(dia, hora);
                  const nivel = punto?.nivel || 'EMPTY';
                  const config = NIVEL_CONFIG[nivel];
                  const detalle = obtenerDetalle(dia, hora);
                  const tieneClases = detalle && detalle.clases.length > 0;

                  return (
                    <td
                      key={`${dia}-${hora}`}
                      className={`border border-gray-300 p-3 text-center ${config.bg} ${config.border} cursor-pointer hover:opacity-80 transition-all relative group`}
                      onClick={() => handleCeldaClick(dia, hora)}
                    >
                      <div className="flex flex-col items-center justify-center">
                        {nivel !== 'EMPTY' && (
                          <>
                            <span className={`text-sm font-bold ${config.text}`}>
                              {config.label}
                            </span>
                            <span className="text-xs text-gray-600 mt-1">
                              {punto?.porcentaje_ocupacion.toFixed(0)}%
                            </span>
                            {tieneClases && (
                              <span className="text-xs text-gray-500 mt-1">
                                {detalle.clases.length} clase{detalle.clases.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </>
                        )}
                        {nivel === 'EMPTY' && (
                          <span className={`text-xs ${config.text}`}>-</span>
                        )}
                      </div>

                      {/* Tooltip */}
                      {tieneClases && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl max-w-xs">
                            <div className="font-semibold mb-2">{dia} {hora}:00</div>
                            <div className="space-y-1">
                              {detalle.clases.slice(0, 3).map((clase, idx) => (
                                <div key={idx} className="text-gray-300">
                                  • {clase.aula}: {clase.materia}
                                </div>
                              ))}
                              {detalle.clases.length > 3 && (
                                <div className="text-gray-400 italic">
                                  +{detalle.clases.length - 3} más...
                                </div>
                              )}
                            </div>
                          </div>
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

      {/* Modal de Detalle */}
      {puntoSeleccionado && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setPuntoSeleccionado(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const detalle = obtenerDetalle(puntoSeleccionado.dia, puntoSeleccionado.hora);
              if (!detalle) return null;

              return (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {puntoSeleccionado.dia} - {puntoSeleccionado.hora}:00
                    </h3>
                    <button
                      onClick={() => setPuntoSeleccionado(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    {detalle.clases.map((clase, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{clase.materia}</h4>
                            <p className="text-sm text-gray-600">{clase.carrera}</p>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {clase.aula}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                          <div>
                            <span className="font-medium">Docente:</span> {clase.docente}
                          </div>
                          <div>
                            <span className="font-medium">Estudiantes:</span> {clase.estudiantes}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
