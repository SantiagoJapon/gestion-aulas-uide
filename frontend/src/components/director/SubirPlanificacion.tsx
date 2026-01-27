import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, FileSpreadsheet, CheckCircle, XCircle, 
  AlertCircle, Download, RefreshCw, Activity, TrendingUp, Clock
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api';

export default function SubirPlanificacion() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [distribucionEnProgreso, setDistribucionEnProgreso] = useState(false);
  const [estadoDistribucion, setEstadoDistribucion] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // TODO: Obtener del contexto del usuario logueado
  const carrera_id = 1;

  useEffect(() => {
    cargarEstadoDistribucion();
  }, []);

  const cargarEstadoDistribucion = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/planificaciones/distribucion/${carrera_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEstadoDistribucion(response.data);
    } catch (error: any) {
      console.error('Error al cargar estado:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Solo archivos Excel (.xlsx, .xls)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo no debe superar 10MB');
        return;
      }
      setArchivo(file);
      setError('');
      setResultado(null);
    }
  };

  const subirPlanificacion = async () => {
    if (!archivo) {
      setError('Selecciona un archivo');
      return;
    }

    setCargando(true);
    setError('');
    setResultado(null);
    setDistribucionEnProgreso(true);

    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('carrera_id', carrera_id.toString());

      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_BASE_URL}/planificaciones/subir`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          },
          timeout: 120000
        }
      );

      setResultado(response.data.resultado);
      setArchivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (response.data.resultado.distribucion.estado === 'en_progreso') {
        verificarDistribucion();
      } else {
        setDistribucionEnProgreso(false);
        // Recargar estado inmediatamente
        setTimeout(() => cargarEstadoDistribucion(), 1000);
      }

    } catch (err: any) {
      setError(err.response?.data?.mensaje || err.message || 'Error al procesar planificación');
      setDistribucionEnProgreso(false);
    } finally {
      setCargando(false);
    }
  };

  const verificarDistribucion = () => {
    let intentos = 0;
    const maxIntentos = 40; // 2 minutos

    const interval = setInterval(async () => {
      intentos++;
      
      try {
        await cargarEstadoDistribucion();
        
        if (estadoDistribucion && estadoDistribucion.estadisticas.pendientes === 0) {
          setDistribucionEnProgreso(false);
          clearInterval(interval);
        }
        
        if (intentos >= maxIntentos) {
          setDistribucionEnProgreso(false);
          clearInterval(interval);
        }
        
      } catch (error) {
        console.error('Error verificando:', error);
      }
    }, 3000);
  };

  const descargarPlantilla = () => {
    // Crear plantilla de ejemplo
    alert('Descarga de plantilla: Próximamente\n\nColumnas requeridas:\ncodigo_materia, nombre_materia, nivel, paralelo, numero_estudiantes, horario_dia, horario_inicio, horario_fin, docente');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Subir Planificación Académica</h1>
        <p className="text-gray-600">
          Sube el archivo Excel con las materias y horarios de tu carrera
        </p>
      </div>

      {/* Estado Actual */}
      {estadoDistribucion && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-md">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} className="text-blue-600" />
            Estado Actual de Distribución
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Clases</p>
              <p className="text-3xl font-bold text-gray-900">
                {estadoDistribucion.estadisticas.total}
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Asignadas</p>
              <p className="text-3xl font-bold text-green-600">
                {estadoDistribucion.estadisticas.asignadas}
              </p>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4 shadow-sm border border-orange-200">
              <p className="text-sm text-gray-600 mb-1">Pendientes</p>
              <p className="text-3xl font-bold text-orange-600">
                {estadoDistribucion.estadisticas.pendientes}
              </p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 shadow-sm border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-gray-600">Progreso</p>
                <TrendingUp size={16} className="text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {estadoDistribucion.estadisticas.porcentaje}%
              </p>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${estadoDistribucion.estadisticas.porcentaje}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Área de Subida */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">1. Seleccionar Archivo</h2>
        
        <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          archivo 
            ? 'border-green-400 bg-green-50' 
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
        }`}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload-planificacion"
            disabled={cargando}
          />
          
          {!archivo ? (
            <label 
              htmlFor="file-upload-planificacion" 
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="text-gray-400 mb-3" size={48} />
              <p className="text-lg font-medium mb-2 text-gray-700">
                Haz clic o arrastra un archivo Excel
              </p>
              <p className="text-sm text-gray-500">
                .xlsx, .xls (máximo 10MB)
              </p>
            </label>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="text-green-600" size={32} />
              <div className="text-left">
                <p className="font-semibold text-gray-900">{archivo.name}</p>
                <p className="text-sm text-gray-500">
                  {(archivo.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={() => {
                  setArchivo(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={cargando}
                className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
              >
                Cambiar
              </button>
            </div>
          )}
        </div>

        {/* Información */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-900">
            <AlertCircle size={20} className="text-blue-600" />
            Formato del Excel
          </h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>Columnas requeridas:</strong></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-4 text-xs">
              <div>• codigo_materia</div>
              <div>• nombre_materia</div>
              <div>• nivel</div>
              <div>• paralelo</div>
              <div>• numero_estudiantes</div>
              <div>• horario_dia</div>
              <div>• horario_inicio</div>
              <div>• horario_fin</div>
              <div>• docente</div>
            </div>
            
            <button
              onClick={descargarPlantilla}
              className="mt-3 flex items-center gap-2 text-blue-600 hover:underline text-sm font-medium"
            >
              <Download size={16} />
              Descargar plantilla de ejemplo
            </button>
          </div>
        </div>

        {/* Botón */}
        <div className="mt-6">
          <button
            onClick={subirPlanificacion}
            disabled={!archivo || cargando}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2 font-semibold transition-all
                     shadow-lg hover:shadow-xl text-lg"
          >
            {cargando ? (
              <>
                <RefreshCw className="animate-spin" size={24} />
                Procesando planificación...
              </>
            ) : (
              <>
                <Upload size={24} />
                Subir y Distribuir Automáticamente
              </>
            )}
          </button>
        </div>
      </div>

      {/* Distribución en Progreso */}
      {distribucionEnProgreso && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <RefreshCw className="animate-spin text-yellow-600" size={28} />
              <div className="absolute inset-0 animate-ping">
                <RefreshCw className="text-yellow-400 opacity-75" size={28} />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-yellow-900 text-lg">Distribución en Progreso</h3>
              <p className="text-sm text-yellow-700 flex items-center gap-2">
                <Clock size={14} />
                El sistema está asignando aulas automáticamente. Esto puede tardar hasta 2 minutos...
              </p>
            </div>
          </div>
          
          {estadoDistribucion && (
            <div className="w-full bg-yellow-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${estadoDistribucion.estadisticas.porcentaje}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Resultado Exitoso */}
      {resultado && !error && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={32} />
            <div className="flex-1">
              <h3 className="font-bold text-green-900 text-xl mb-3">
                ¡Planificación subida exitosamente!
              </h3>
              <div className="text-sm text-green-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Clases guardadas:</span>
                  <span className="px-3 py-1 bg-green-200 rounded-full font-bold text-base">
                    {resultado.clases_guardadas}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Estado distribución:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    resultado.distribucion.estado === 'en_progreso'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {resultado.distribucion.mensaje}
                  </span>
                </div>
                {resultado.errores && resultado.errores.length > 0 && (
                  <div className="mt-3 p-3 bg-orange-100 rounded-lg">
                    <p className="text-orange-800 font-medium text-xs mb-1">
                      ⚠️ {resultado.errores.length} advertencias detectadas:
                    </p>
                    <ul className="text-xs text-orange-700 ml-4 list-disc">
                      {resultado.errores.slice(0, 5).map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {resultado.errores.length > 5 && (
                        <li className="italic">... y {resultado.errores.length - 5} más</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <XCircle className="text-red-600 flex-shrink-0 mt-1" size={32} />
            <div>
              <h3 className="font-bold text-red-900 text-xl mb-1">Error al procesar</h3>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
