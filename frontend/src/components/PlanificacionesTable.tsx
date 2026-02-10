import { useState, useEffect } from 'react';
import { planificacionService, PlanificacionSubida } from '../services/api';
import { FaDownload, FaFileExcel, FaCalendarAlt, FaUser, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

export default function PlanificacionesTable() {
  const [planificaciones, setPlanificaciones] = useState<PlanificacionSubida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState<number | null>(null);

  useEffect(() => {
    cargarPlanificaciones();
  }, []);

  const cargarPlanificaciones = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await planificacionService.listar();
      setPlanificaciones(response.planificaciones);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cargar planificaciones');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargar = async (id: number) => {
    try {
      setDescargando(id);
      await planificacionService.descargar(id);
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al descargar archivo');
      console.error('Error:', err);
    } finally {
      setDescargando(null);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-EC', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center animate-fade-in">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-[3px] border-slate-100 border-t-uide-blue"></div>
        <p className="text-slate-500 mt-4 text-xs font-bold uppercase tracking-widest">Sincronizando archivos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center animate-fade-in">
        <FaExclamationCircle className="text-red-400 text-3xl mx-auto mb-3" />
        <p className="text-red-700 font-bold text-sm">{error}</p>
        <button onClick={cargarPlanificaciones} className="mt-4 text-xs font-black text-red-700 uppercase tracking-widest hover:underline">Reintentar</button>
      </div>
    );
  }

  if (planificaciones.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center animate-fade-in">
        <FaFileExcel className="text-slate-300 dark:text-slate-700 text-4xl mx-auto mb-4" />
        <h3 className="font-black text-slate-500 uppercase tracking-tighter">Sin planificaciones</h3>
        <p className="text-xs text-slate-400 mt-1">No se han registrado subidas recientemente</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
      <div className="p-4 sm:p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-uide-blue/10 flex items-center justify-center text-uide-blue">
            <FaFileExcel size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Archivos de Planificación</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Últimas {planificaciones.length} subidas procesadas
            </p>
          </div>
        </div>
        <button
          onClick={cargarPlanificaciones}
          className="p-2 text-uide-blue hover:bg-uide-blue/5 rounded-lg transition-all"
          title="Actualizar lista"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
        </button>
      </div>

      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {planificaciones.map((plan) => (
          <div key={plan.id} className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-all group">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${plan.estado === 'procesado' ? 'bg-emerald-500' : plan.estado === 'error' ? 'bg-red-500' : 'bg-amber-500'
                    }`}></span>
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {plan.carrera?.carrera || 'Carrera No Especificada'}
                  </p>
                  {plan.estado === 'procesado' && <FaCheckCircle className="text-emerald-500 shrink-0" size={12} />}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <FaFileExcel className="text-emerald-600" size={11} />
                    <span className="truncate max-w-[150px] sm:max-w-[250px]">{plan.nombre_archivo_original}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <FaUser size={10} />
                    <span>{plan.usuario ? `${plan.usuario.nombre}` : 'Sist.'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <FaCalendarAlt size={10} />
                    <span>{formatFecha(plan.fecha_subida)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50 dark:border-slate-800/50">
                <div className="flex items-center gap-1 bg-uide-blue/5 dark:bg-uide-blue/10 px-2 py-1 rounded-lg">
                  <span className="text-[10px] font-black text-uide-blue">{plan.total_clases}</span>
                  <span className="text-[8px] font-bold text-uide-blue/60 uppercase tracking-tighter">Sesiones</span>
                </div>

                <button
                  onClick={() => handleDescargar(plan.id)}
                  disabled={descargando === plan.id}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-uide-blue rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:scale-[1.05] active:scale-[0.95] disabled:opacity-50 transition-all hover:bg-uide-blue hover:text-white hover:border-uide-blue"
                >
                  {descargando === plan.id ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                  ) : (
                    <>
                      <FaDownload size={12} />
                      <span>Excel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
