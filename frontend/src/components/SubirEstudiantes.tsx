import { useState, useRef, useEffect } from 'react';
import {
  FaUpload, FaFileExcel, FaCheckCircle, FaTimesCircle,
  FaSyncAlt, FaInfoCircle
} from 'react-icons/fa';
import { estudianteService } from '../services/api';
import { Button } from './common/Button';

interface HistorialCarga {
  id: number;
  tipo: string;
  archivo_nombre: string;
  registros_procesados: number;
  estado: string;
  fecha_carga: string;
  detalles: any;
}

interface SubirEstudiantesProps {
  carreraNombre?: string;
  isCompact?: boolean;
}

export default function SubirEstudiantes({ carreraNombre, isCompact = false }: SubirEstudiantesProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [historial, setHistorial] = useState<HistorialCarga[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      const data = await estudianteService.getHistorialCargas('estudiantes');
      setHistorial(data.historial || []);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Solo se permiten archivos Excel (.xlsx, .xls)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo no debe superar los 10MB');
        return;
      }
      setArchivo(file);
      setError('');
      setResultado(null);
    }
  };

  const handleUpload = async () => {
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
      if (carreraNombre) {
        formData.append('escuela', carreraNombre);
      }

      const response = await estudianteService.subirEstudiantes(formData);

      setResultado(response.resultado);
      setArchivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  const limpiar = () => {
    setArchivo(null);
    setError('');
    setResultado(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`animate-fade-in ${isCompact ? '' : 'p-0 sm:p-2 lg:p-4 max-w-5xl mx-auto'}`}>
      {!isCompact && (
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <FaFileExcel />
            </div>
            Subida de Estudiantes
          </h1>
          <p className="text-muted-foreground text-sm mt-3 ml-1">
            Sincroniza el listado oficial de estudiantes y sus inscripciones mediante Excel.
          </p>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isCompact ? 'gap-4' : 'lg:grid-cols-3 gap-8'}`}>
        {/* Lado Izquierdo: Formulario de Carga */}
        <div className={isCompact ? 'col-span-1' : 'lg:col-span-2'}>
          <div className={isCompact ? '' : 'mac-card p-6 sm:p-8 rounded-3xl border border-border shadow-sm'}>
            <div
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${archivo
                ? 'border-emerald-300 bg-emerald-50/30'
                : 'border-border bg-muted/50'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload"
              />


              {carreraNombre && (
                <div className="absolute top-4 left-0 w-full flex justify-center z-10">
                  <span className="px-3 py-1 bg-uide-blue/10 text-uide-blue text-[10px] font-black uppercase rounded-full border border-uide-blue/20">
                    Cargando para: {carreraNombre}
                  </span>
                </div>
              )}

              {!archivo ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                    <FaUpload size={28} />
                  </div>
                  <p className="text-base font-black text-foreground uppercase tracking-tight">
                    Arrastra tu archivo Excel
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-2">
                    Formatos .xlsx / .xls (Máx 10MB)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                    <FaCheckCircle size={28} />
                  </div>
                  <p className="text-base font-black text-foreground truncate max-w-xs">{archivo.name}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">
                    {(archivo.size / 1024).toFixed(2)} KB • Listo para procesar
                  </p>
                  <button
                    onClick={limpiar}
                    className="mt-4 px-3 py-1 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    Cambiar archivo
                  </button>
                </div>
              )}
            </div>

            {/* Error / Resultado */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl animate-fade-in flex items-center gap-4">
                <FaTimesCircle className="text-red-500 text-xl shrink-0" />
                <p className="text-xs font-bold text-red-700">{error}</p>
              </div>
            )}

            {resultado && (
              <div className="mt-6 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl animate-fade-in">
                <div className="flex items-start gap-4">
                  <FaCheckCircle className="text-emerald-500 text-2xl shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-emerald-900 uppercase tracking-tight mb-3">¡Carga Completada!</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/50 p-3 rounded-xl border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-600 uppercase">Estudiantes</p>
                        <p className="text-xl font-black text-emerald-900">{resultado.estudiantes_guardados}</p>
                      </div>
                      <div className="bg-white/50 p-3 rounded-xl border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-600 uppercase">Inscripciones</p>
                        <p className="text-xl font-black text-emerald-900">{resultado.inscripciones_guardadas}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botón Principal */}
            <div className="mt-8">
              <Button
                onClick={handleUpload}
                disabled={!archivo || cargando}
                loading={cargando}
                fullWidth
                variant="primary"
                className="py-4"
              >
                {!cargando && <FaUpload className="mr-2 inline" />}
                {cargando ? 'Procesando Datos...' : 'Subir y Procesar'}
              </Button>
            </div>
          </div>

          <div className={`rounded-3xl p-5 flex items-start gap-4 animate-fade-in mt-6 ${isCompact ? 'bg-transparent border-0 p-0' : 'bg-primary/5 border border-primary/10'}`}>
            <FaInfoCircle className="text-primary mt-1 shrink-0" size={16} />
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Nota importante</p>
              <p className="text-[10px] text-primary/70 font-bold leading-relaxed">
                El sistema procesa automáticamente las hojas "Estudiantes" y "Materias Inscritas".
                Asegúrese de respetar los encabezados de columna.
              </p>
            </div>
          </div>
        </div>


        {/* Lado Derecho: Formato e Historial - Solo visible en modo completo */}
        {!isCompact && (
          <div className="space-y-6">
            <div className="mac-card p-6 rounded-3xl border border-border shadow-sm">
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Guía de Formato</h3>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                  <div className="text-[10px] font-black text-foreground uppercase mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full"></div> Sheet 1: Estudiantes
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['cedula', 'nombres', 'apellidos', 'email', 'telefono', 'carrera_id'].map(c => (
                      <span key={c} className="px-1.5 py-0.5 bg-card text-muted-foreground text-[8px] font-bold lowercase rounded border border-border">{c}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                  <div className="text-[10px] font-black text-foreground uppercase mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div> Sheet 2: Materias
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['cedula_estudiante', 'codigo_materia', 'nivel', 'paralelo'].map(c => (
                      <span key={c} className="px-1.5 py-0.5 bg-card text-muted-foreground text-[8px] font-bold lowercase rounded border border-border">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mac-card p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Actividad Reciente</h3>
                <button
                  onClick={cargarHistorial}
                  className="text-uide-blue hover:scale-110 transition-transform"
                >
                  <FaSyncAlt size={12} />
                </button>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {historial.length > 0 ? (
                  historial.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50/30 dark:bg-slate-900/30 rounded-xl border border-slate-50 dark:border-slate-800 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-800 dark:text-white truncate">{item.archivo_nombre}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          {new Date(item.fecha_carga).toLocaleDateString()} • {item.registros_procesados} reg.
                        </p>
                      </div>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.estado === 'completado' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}></span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-center text-slate-400 font-bold uppercase mt-8">Sin registros previos</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
