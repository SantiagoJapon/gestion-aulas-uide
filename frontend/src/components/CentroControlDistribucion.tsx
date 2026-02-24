import { useState, useEffect } from 'react';
import { planificacionService, PlanificacionSubida, distribucionService } from '../services/api';
import EjecutarDistribucion from './EjecutarDistribucion';
import PlanificacionesTable from './PlanificacionesTable';

interface CentroControlDistribucionProps {
    onDistribucionCompletada?: () => void;
}

export default function CentroControlDistribucion({ onDistribucionCompletada }: CentroControlDistribucionProps) {
    const [pendientes, setPendientes] = useState<PlanificacionSubida[]>([]);
    const [conflictos, setConflictos] = useState<any[]>([]);
    const [simulando, setSimulando] = useState(false);
    const [loading, setLoading] = useState(true);

    // Cargar estado inicial
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const res = await planificacionService.listar();
            // Filtrar las que están pendientes
            const pendientesList = res.planificaciones.filter(p => p.estado === 'pendiente');
            setPendientes(pendientesList);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Acción 1: Simular Conflictos (Check Preventivo)
    const ejecutarSimulacion = async () => {
        setSimulando(true);
        try {
            // Usamos el endpoint de conflictos o simulación
            // Asumimos que podemos pedir conflictos globales o por carrera
            // Por ahora, simulamos una llamada que revisa todas las pendientes
            const res = await distribucionService.getClasesDistribucion(); // O un endpoint específico de simulación

            // Filtramos conflictos simulados (esto requeriría lógica backend más compleja, 
            // por ahora mostramos si hay conflictos en lo actual + pendiente)
            const conflictosDetectados = res.clases.filter((c: any) => c.estado === 'conflicto');
            setConflictos(conflictosDetectados);

        } catch (e) {
            console.error(e);
        } finally {
            setSimulando(false);
        }
    };

    const handleDistribucionTerminada = () => {
        cargarDatos();
        if (onDistribucionCompletada) onDistribucionCompletada();
    };

    return (
        <div className="space-y-8 animate-fade-in">

            {/* Header del Centro de Control */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl min-h-[200px] flex items-center">
                {/* Imagen de Fondo (Campus Loja) */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/campus-loja.avif"
                        alt="Campus UIDE Loja"
                        className="w-full h-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 animate-pulse">
                            Sistema Activo
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
                        Centro de Control de Distribución
                    </h2>
                    <p className="text-slate-300 max-w-2xl text-sm md:text-lg font-medium">
                        Supervisa, simula y ejecuta la asignación de aulas para toda la universidad.
                        Tienes <span className="text-white font-black underline decoration-emerald-500 decoration-2 underline-offset-4">{pendientes.length} planificaciones</span> esperando aprobación institucional.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Columna Izquierda: Cola de Espera y Conflictos */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Cola de Pendientes */}
                    <div id="tour-cola-aprobacion" className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500">pending_actions</span>
                                Cola de Aprobación
                            </h3>
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                {pendientes.length} Requeridos
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
                            </div>
                        ) : pendientes.length > 0 ? (
                            <div className="space-y-3">
                                {pendientes.map((plan) => (
                                    <div key={plan.id} className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 hover:scale-[1.01] transition-transform cursor-default">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-xl bg-amber-200 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold">
                                                {plan.carrera?.carrera?.[0] || 'C'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{plan.carrera?.carrera}</p>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-amber-600/70 dark:text-amber-500/70">
                                                    {plan.total_clases} Clases Nuevas • {new Date(plan.fecha_subida).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Simulación rápida por ítem (futuro) */}
                                            <span className="material-symbols-outlined text-amber-400 text-xl" title="Requiere revisión">warning</span>
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                                    <button
                                        id="tour-boton-simular"
                                        onClick={ejecutarSimulacion}
                                        disabled={simulando}
                                        className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                    >
                                        {simulando ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                                                Analizando Impacto...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-sm">science</span>
                                                Simular Impacto de Cambios
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 opacity-50">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">rule</span>
                                <p className="text-sm font-bold text-slate-400">Todo al día</p>
                            </div>
                        )}
                    </div>

                    {/* Visor de Conflictos (Si existen tras simulación) */}
                    {conflictos.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/10 rounded-3xl p-6 border border-red-100 dark:border-red-900/20 animate-fade-in">
                            <h3 className="text-lg font-black text-red-700 dark:text-red-400 flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined">report_problem</span>
                                Conflictos Detectados ({conflictos.length})
                            </h3>
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {conflictos.map((conf, idx) => (
                                    <div key={idx} className="p-3 bg-white dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/30 text-sm">
                                        <p className="font-bold text-red-800 dark:text-red-300">{conf.materia}</p>
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                            Choca en {conf.dia} {conf.hora_inicio} con otra asignación.
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Historial Completo */}
                    <PlanificacionesTable />

                </div>

                {/* Columna Derecha: Panel de Ejecución */}
                <div id="tour-panel-ejecucion" className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20 sticky top-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Acciones Maestras</h3>

                        <EjecutarDistribucion onDistribucionCompletada={handleDistribucionTerminada} />

                        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/20">
                            <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">info</span>
                                Modo "Human-in-the-loop"
                            </h4>
                            <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                                El sistema no aplicará cambios automáticamente. Usted tiene el control total para iniciar la redistribución cuando considere que la cola de pendientes es prioritaria.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
