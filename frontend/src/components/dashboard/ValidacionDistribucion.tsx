import { useEffect, useState } from 'react';
import { distribucionService, ClaseConEstadoDistribucion } from '../../services/api';
import DashboardWidget from './DashboardWidget';

/**
 * Panel de validación institucional: hace visible lo que el algoritmo de
 * distribución ya calcula pero que hasta ahora solo vivía en el PDF de
 * Reportes — conflictos de horario y sobrecupo, con el detalle de qué
 * clases exactas están involucradas, no solo el conteo.
 */
export default function ValidacionDistribucion() {
    const [loading, setLoading] = useState(true);
    const [clases, setClases] = useState<ClaseConEstadoDistribucion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [seccionAbierta, setSeccionAbierta] = useState<'conflictos' | 'sobrecupo' | null>(null);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await distribucionService.getClasesDistribucion();
            if (res.success) setClases(res.clases || []);
        } catch (err) {
            console.error('Error al cargar validación de distribución:', err);
            setError('No se pudo cargar la validación de la distribución');
        } finally {
            setLoading(false);
        }
    };

    const conflictos = clases.filter(c => c.estado === 'conflicto');
    const sobrecupos = clases.filter(c => c.sobrecupo);
    const pendientes = clases.filter(c => c.estado === 'pendiente');
    const sinProblemas = !loading && !error && conflictos.length === 0 && sobrecupos.length === 0;

    const toggle = (seccion: 'conflictos' | 'sobrecupo') => {
        setSeccionAbierta(prev => (prev === seccion ? null : seccion));
    };

    return (
        <DashboardWidget
            title="Validación de Distribución"
            subtitle="Salud de la asignación de aulas a nivel institucional"
            icon="fact_check"
            action={
                <button
                    onClick={load}
                    disabled={loading}
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary/80 transition-colors flex items-center gap-1 disabled:opacity-40"
                >
                    <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    Actualizar
                </button>
            }
        >
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted/20 rounded-2xl animate-pulse" />)}
                </div>
            ) : error ? (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                    <span className="material-symbols-outlined text-red-600">error</span>
                    <p className="text-sm font-bold text-red-800 dark:text-red-400">{error}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Resumen — cada tarjeta clickeable expande su detalle */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button
                            onClick={() => conflictos.length > 0 && toggle('conflictos')}
                            disabled={conflictos.length === 0}
                            className={`text-left p-4 rounded-2xl border transition-all ${conflictos.length > 0
                                ? `cursor-pointer hover:-translate-y-0.5 ${seccionAbierta === 'conflictos' ? 'bg-red-100 dark:bg-red-900/30 border-red-300' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'}`
                                : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 cursor-default'
                                }`}
                        >
                            <p className={`text-2xl font-black leading-none ${conflictos.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{conflictos.length}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-muted-foreground">Conflictos de horario</p>
                            {conflictos.length > 0 && (
                                <p className="text-[9px] font-bold text-red-600/70 mt-1 flex items-center gap-0.5">
                                    Ver detalle
                                    <span className="material-symbols-outlined text-xs">{seccionAbierta === 'conflictos' ? 'expand_less' : 'expand_more'}</span>
                                </p>
                            )}
                        </button>

                        <button
                            onClick={() => sobrecupos.length > 0 && toggle('sobrecupo')}
                            disabled={sobrecupos.length === 0}
                            className={`text-left p-4 rounded-2xl border transition-all ${sobrecupos.length > 0
                                ? `cursor-pointer hover:-translate-y-0.5 ${seccionAbierta === 'sobrecupo' ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20'}`
                                : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 cursor-default'
                                }`}
                        >
                            <p className={`text-2xl font-black leading-none ${sobrecupos.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{sobrecupos.length}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-muted-foreground">Aulas con sobrecupo</p>
                            {sobrecupos.length > 0 && (
                                <p className="text-[9px] font-bold text-amber-600/70 mt-1 flex items-center gap-0.5">
                                    Ver detalle
                                    <span className="material-symbols-outlined text-xs">{seccionAbierta === 'sobrecupo' ? 'expand_less' : 'expand_more'}</span>
                                </p>
                            )}
                        </button>

                        <div className="p-4 rounded-2xl border bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20">
                            <p className="text-2xl font-black leading-none text-orange-600">{pendientes.length}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-muted-foreground">Clases sin aula</p>
                        </div>

                        <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800">
                            <p className="text-2xl font-black leading-none text-slate-700 dark:text-slate-200">{clases.length}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-muted-foreground">Clases evaluadas</p>
                        </div>
                    </div>

                    {sinProblemas && (
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                            <span className="material-symbols-outlined text-emerald-600">verified</span>
                            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Sin conflictos de horario ni sobrecupo detectados en la distribución actual.</p>
                        </div>
                    )}

                    {/* Detalle expandido: conflictos */}
                    {seccionAbierta === 'conflictos' && conflictos.length > 0 && (
                        <div className="rounded-2xl border border-red-100 dark:border-red-900/30 overflow-hidden animate-fade-in">
                            <div className="divide-y divide-red-100 dark:divide-red-900/20 max-h-80 overflow-y-auto">
                                {[...conflictos]
                                    .sort((a, b) => `${a.aula_asignada}${a.dia}${a.hora_inicio}`.localeCompare(`${b.aula_asignada}${b.dia}${b.hora_inicio}`))
                                    .map((c) => (
                                        <div key={c.id} className="px-4 py-3 flex items-center gap-3 bg-white dark:bg-slate-900/40">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-foreground truncate">{c.materia}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium truncate">
                                                    {c.carrera} · {c.docente || 'Sin docente'}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[10px] font-black text-red-600 uppercase">{c.aula_asignada}</p>
                                                <p className="text-[10px] text-muted-foreground">{c.dia} · {c.hora_inicio}–{c.hora_fin}</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            <p className="px-4 py-2 text-[9px] font-bold text-red-600/70 bg-red-50 dark:bg-red-900/10 uppercase tracking-widest">
                                Dos o más clases con la misma aula, día y hora aparecen aquí — corrige reasignando una de ellas.
                            </p>
                        </div>
                    )}

                    {/* Detalle expandido: sobrecupo */}
                    {seccionAbierta === 'sobrecupo' && sobrecupos.length > 0 && (
                        <div className="rounded-2xl border border-amber-100 dark:border-amber-900/30 overflow-hidden animate-fade-in">
                            <div className="divide-y divide-amber-100 dark:divide-amber-900/20 max-h-80 overflow-y-auto">
                                {[...sobrecupos]
                                    .sort((a, b) => (b.porcentaje_uso || 0) - (a.porcentaje_uso || 0))
                                    .map((c) => (
                                        <div key={c.id} className="px-4 py-3 flex items-center gap-3 bg-white dark:bg-slate-900/40">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-foreground truncate">{c.materia}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium truncate">{c.carrera}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[10px] font-black text-amber-600 uppercase">{c.aula_asignada}</p>
                                                <p className="text-[10px]">
                                                    <span className="text-red-600 font-black">{c.num_estudiantes} est</span>
                                                    <span className="text-muted-foreground"> / {c.aula_capacidad} cap ({c.porcentaje_uso}%)</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </DashboardWidget>
    );
}
