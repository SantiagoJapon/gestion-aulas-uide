import { useState, useEffect } from 'react';
import { distribucionService } from '../services/api';

const STEPS = [
  { id: 'validating', label: 'Validando disponibilidad de aulas...', icon: 'fact_check' },
  { id: 'conflicts', label: 'Resolviendo choques de horario...', icon: 'dynamic_form' },
  { id: 'optimizing', label: 'Optimizando capacidad y proximidad...', icon: 'magic_button' },
  { id: 'saving', label: 'Finalizando asignaciones globales...', icon: 'cloud_done' }
];

interface EjecutarDistribucionProps {
  onDistribucionCompletada?: () => void;
}

export default function EjecutarDistribucion({ onDistribucionCompletada }: EjecutarDistribucionProps) {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [limpiando, setLimpiando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');

  // Simular pasos de progreso
  useEffect(() => {
    let interval: any;
    if (loading && currentStep < STEPS.length - 1) {
      interval = setInterval(() => {
        setCurrentStep(prev => prev + 1);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [loading, currentStep]);

  const handleEjecutarDistribucion = async () => {
    try {
      setLoading(true);
      setCurrentStep(0);
      setError('');
      setResultado(null);

      const response = await distribucionService.ejecutarDistribucion();

      // Esperar un poco al final para que el usuario vea el último paso
      setTimeout(() => {
        setResultado(response);
        setLoading(false);
        if (response.success && onDistribucionCompletada) {
          onDistribucionCompletada();
        }
      }, 2000);

    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al ejecutar distribución');
      setLoading(false);
    }
  };

  const handleLimpiarDistribucion = async () => {
    if (!confirm('¿Limpiar todas las asignaciones de aulas?\n\nEsto dejará todas las clases como "Pendientes".')) return;

    try {
      setLimpiando(true);
      await distribucionService.limpiarDistribucion();
      setResultado(null);
      if (onDistribucionCompletada) onDistribucionCompletada();
    } catch (err: any) {
      setError('Error al limpiar');
    } finally {
      setLimpiando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleEjecutarDistribucion}
          disabled={loading || limpiando}
          className={`flex-1 group relative overflow-hidden px-8 py-6 rounded-[2rem] transition-all duration-500 apple-spring ${loading
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            : 'bg-uide-blue text-white shadow-xl shadow-uide-blue/20 hover:shadow-2xl hover:shadow-uide-blue/30 active:scale-95'
            }`}
        >
          <div className="relative z-10 flex items-center justify-center gap-4">
            <span className={`material-symbols-outlined text-3xl ${loading ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`}>
              {loading ? 'sync' : 'auto_fix_high'}
            </span>
            <div className="text-left">
              <p className="font-black uppercase tracking-widest text-xs opacity-80 leading-none mb-1">Algoritmo Maestro</p>
              <h4 className="text-xl font-black tracking-tight leading-none">
                {loading ? 'Optimizando...' : 'Iniciar Distribución Global'}
              </h4>
            </div>
          </div>
          {loading && (
            <div
              className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-1000"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          )}
        </button>

        <button
          onClick={handleLimpiarDistribucion}
          disabled={loading || limpiando}
          className="px-6 py-6 rounded-[2rem] bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all font-black uppercase tracking-tighter text-xs flex flex-col items-center justify-center gap-1 border border-red-100 dark:border-red-900/20 active:scale-90"
        >
          <span className="material-symbols-outlined">{limpiando ? 'progress_activity' : 'delete_sweep'}</span>
          <span>Limpiar</span>
        </button>
      </div>

      {/* Steps Visualizer */}
      {loading && (
        <div className="bg-white dark:bg-slate-800/50 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 animate-fade-in shadow-sm">
          <div className="space-y-6">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isDone = index < currentStep;
              return (
                <div key={step.id} className={`flex items-center gap-4 transition-all duration-500 ${isActive ? 'scale-105 opacity-100' : isDone ? 'opacity-50' : 'opacity-20'}`}>
                  <div className={`size-12 rounded-2xl flex items-center justify-center transition-all apple-spring ${isActive ? 'bg-uide-blue text-white shadow-lg shadow-uide-blue/30 rotate-3' :
                    isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                    <span className="material-symbols-outlined text-2xl">
                      {isDone ? 'check_circle' : step.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold transition-colors ${isActive ? 'text-slate-900 dark:text-white text-lg' : 'text-slate-500'}`}>
                      {step.label}
                    </p>
                    {isActive && (
                      <div className="flex gap-1 mt-1">
                        <div className="size-1 bg-uide-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="size-1 bg-uide-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="size-1 bg-uide-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results Card */}
      {resultado && !loading && (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-[2.5rem] p-8 animate-fade-in">
          <div className="flex items-start gap-4 mb-6">
            <div className="size-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="material-symbols-outlined text-3xl">task_alt</span>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Distribución Completada</h3>
              <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm uppercase tracking-widest">Éxito en la asignación global</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Clases Totales</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{resultado.estadisticas?.total_procesadas || 0}</p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
              <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Asignadas</p>
              <p className="text-3xl font-black text-emerald-600 leading-none">{resultado.estadisticas?.exitosas || 0}</p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
              <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1">Sin Cupo</p>
              <p className="text-3xl font-black text-orange-600 leading-none">{resultado.estadisticas?.fallidas || 0}</p>
            </div>
          </div>

          {resultado.estadisticas?.fallidas > 0 && (
            <div className="mt-6 flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
              <span className="material-symbols-outlined text-orange-600">warning</span>
              <p className="text-sm font-bold text-orange-800 dark:text-orange-400">Existen conflictos de capacidad que requieren su intervención manual para reubicación.</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-red-600">error</span>
          <p className="text-sm font-bold text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
