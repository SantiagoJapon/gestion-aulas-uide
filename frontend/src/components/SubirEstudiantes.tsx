import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  FaUpload, FaFileExcel, FaCheckCircle, FaTimesCircle, 
  FaExclamationTriangle, FaSyncAlt 
} from 'react-icons/fa';

interface HistorialCarga {
  id: number;
  tipo: string;
  archivo_nombre: string;
  registros_procesados: number;
  estado: string;
  fecha_carga: string;
  detalles: any;
}

export default function SubirEstudiantes() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [historial, setHistorial] = useState<HistorialCarga[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar historial al montar
  useEffect(() => {
    cargarHistorial();
  }, []);

  // Cargar historial de cargas
  const cargarHistorial = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:3000/api/estudiantes/historial-cargas?tipo=estudiantes',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistorial(response.data.historial);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  // Manejar selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar extensión
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Solo se permiten archivos Excel (.xlsx, .xls)');
        return;
      }
      
      // Validar tamaño (10MB máximo)
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo no debe superar los 10MB');
        return;
      }
      
      setArchivo(file);
      setError('');
      setResultado(null);
    }
  };

  // Subir archivo
  const subirArchivo = async () => {
    if (!archivo) {
      setError('Selecciona un archivo primero');
      return;
    }

    setCargando(true);
    setError('');
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append('archivo', archivo);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3000/api/estudiantes/subir',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          },
          timeout: 120000 // 2 minutos
        }
      );

      setResultado(response.data.resultado);
      setArchivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Recargar historial
      cargarHistorial();

    } catch (err: any) {
      setError(
        err.response?.data?.mensaje || 
        err.response?.data?.error ||
        'Error al procesar el archivo'
      );
    } finally {
      setCargando(false);
    }
  };

  // Limpiar selección
  const limpiar = () => {
    setArchivo(null);
    setError('');
    setResultado(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <FaFileExcel className="text-primary" />
          Subir Listado de Estudiantes
        </h1>
        <p className="text-muted-foreground">
          Carga un archivo Excel con los datos de estudiantes y sus materias inscritas
        </p>
      </div>

      {/* Información sobre procesamiento directo */}
      <div className="mb-6">
        <div className="p-4 rounded-lg flex items-center gap-3 border bg-blue-50 border-blue-200">
          <FaFileExcel className="text-blue-600 text-2xl" />
          <div className="flex-grow">
            <p className="font-semibold text-blue-900">
              Procesamiento directo de Excel
            </p>
            <p className="text-sm text-blue-700">
              El archivo se procesa inmediatamente en el servidor sin dependencias externas
            </p>
          </div>
        </div>
      </div>

      {/* Área de carga */}
      <div className="bg-card rounded-lg shadow-card border border-border p-6 mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">1. Seleccionar Archivo</h2>
        
        {/* Zona de drop */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            archivo 
              ? 'border-green-300 bg-green-50' 
              : 'border-border bg-muted/30 hover:bg-muted/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          
          {!archivo ? (
            <label 
              htmlFor="file-upload" 
              className="cursor-pointer flex flex-col items-center"
            >
              <FaUpload className="text-muted-foreground mb-3" size={48} />
              <p className="text-lg text-foreground mb-2">
                Haz clic o arrastra un archivo Excel aquí
              </p>
              <p className="text-sm text-muted-foreground">
                Formatos soportados: .xlsx, .xls (máximo 10MB)
              </p>
            </label>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <FaFileExcel className="text-green-600" size={32} />
              <div className="text-left">
                <p className="font-semibold text-foreground">{archivo.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(archivo.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={limpiar}
                className="ml-4 px-3 py-1 text-sm text-destructive hover:bg-destructive/10 rounded transition"
              >
                Cambiar
              </button>
            </div>
          )}
        </div>

        {/* Información sobre el formato */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-900">
            <FaExclamationTriangle size={20} className="text-blue-600" />
            Formato del Excel
          </h3>
          <div className="text-sm text-blue-900 space-y-2">
            <p><strong>Sheet1: Estudiantes</strong></p>
            <p className="ml-4">Columnas: cedula, nombres, apellidos, email, telefono, carrera_id, nivel</p>
            
            <p className="mt-3"><strong>Sheet2: Materias Inscritas</strong></p>
            <p className="ml-4">Columnas: cedula_estudiante, codigo_materia, nivel, paralelo</p>
            
            <p className="text-xs text-blue-700 mt-2">
              Las materias deben existir previamente en la tabla de clases
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={subirArchivo}
            disabled={!archivo || cargando}
            className="flex-grow px-6 py-3 bg-primary text-primary-foreground rounded-lg 
                     hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
                     flex items-center justify-center gap-2 font-semibold transition shadow-lg"
          >
            {cargando ? (
              <>
                <FaSyncAlt className="animate-spin" size={20} />
                Procesando...
              </>
            ) : (
              <>
                <FaUpload size={20} />
                Subir y Procesar
              </>
            )}
          </button>
          
          {archivo && (
            <button
              onClick={limpiar}
              disabled={cargando}
              className="px-6 py-3 border border-border rounded-lg hover:bg-muted
                       disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Cancelar
            </button>
          )}
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-green-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-green-900 mb-2">
                  ¡Archivo procesado exitosamente!
                </h3>
                <div className="text-sm text-green-800 space-y-1">
                  <p>✅ Estudiantes guardados: <strong>{resultado.estudiantes_guardados}</strong></p>
                  <p>✅ Inscripciones guardadas: <strong>{resultado.inscripciones_guardadas}</strong></p>
                  <p className="text-xs text-green-600 mt-2">
                    {new Date(resultado.timestamp).toLocaleString('es-EC')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive rounded-lg animate-fade-in">
            <div className="flex items-start gap-3">
              <FaTimesCircle className="text-destructive flex-shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-destructive mb-1">Error al procesar</h3>
                <p className="text-sm text-destructive/90">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historial de cargas */}
      <div className="bg-card rounded-lg shadow-card border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Historial de Cargas</h2>
          <button
            onClick={cargarHistorial}
            className="p-2 hover:bg-muted rounded-lg transition"
            title="Refrescar"
          >
            <FaSyncAlt size={20} />
          </button>
        </div>

        {historial.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Archivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Registros
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historial.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">
                      {new Date(item.fecha_carga).toLocaleString('es-EC')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {item.archivo_nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {item.registros_procesados} estudiantes
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        item.estado === 'completado' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FaFileExcel className="mx-auto mb-3 text-4xl text-muted-foreground/50" />
            <p>No hay cargas registradas</p>
          </div>
        )}
      </div>
    </div>
  );
}
