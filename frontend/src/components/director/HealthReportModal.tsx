import { useState } from 'react';
import { Button } from '../common/Button';
import type { ReporteSalud } from '../../services/api';

interface HealthReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: ReporteSalud | null;
    onEditClase?: (claseId: number) => void;
}

export const HealthReportModal = ({ isOpen, onClose, report, onEditClase }: HealthReportModalProps) => {
    const [expanded, setExpanded] = useState<'horario' | 'estudiantes' | 'docente' | null>(null);

    if (!isOpen || !report) return null;

    const { total_clases, clases_sin_horario, clases_sin_estudiantes, clases_sin_docente, detalle_sin_horario, detalle_sin_estudiantes, detalle_sin_docente, estado_general, recomendacion } = report;

    const toggle = (section: 'horario' | 'estudiantes' | 'docente') => {
        setExpanded(expanded === section ? null : section);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-border p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-2xl flex items-center justify-center ${estado_general === 'bueno' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                            <span className="material-symbols-outlined">{estado_general === 'bueno' ? 'verified' : 'warning'}</span>
                        </div>
                        <h3 className="text-xl font-black text-foreground tracking-tight">Reporte de Salud de Datos</h3>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-3xl bg-slate-50 border border-border/50">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Procesado</p>
                        <p className="text-2xl font-black text-foreground">{total_clases}</p>
                    </div>

                    <button onClick={() => clases_sin_horario > 0 && toggle('horario')} disabled={clases_sin_horario === 0} className={`p-4 rounded-3xl border text-left transition-all ${clases_sin_horario > 0 ? 'bg-red-500/5 border-red-200 hover:border-red-400 cursor-pointer active:scale-[0.97]' : 'bg-slate-50 border-border/50 cursor-default'}`}>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Sin Horario</p>
                        <p className={`text-2xl font-black ${clases_sin_horario > 0 ? 'text-red-500' : 'text-foreground'}`}>{clases_sin_horario}</p>
                        {clases_sin_horario > 0 && <p className="text-[10px] font-bold text-red-400 mt-1">{expanded === 'horario' ? '▲ Ocultar' : '▼ Ver detalle'}</p>}
                    </button>

                    <button onClick={() => clases_sin_estudiantes > 0 && toggle('estudiantes')} disabled={clases_sin_estudiantes === 0} className={`p-4 rounded-3xl border text-left transition-all ${clases_sin_estudiantes > 0 ? 'bg-amber-500/5 border-amber-200 hover:border-amber-400 cursor-pointer active:scale-[0.97]' : 'bg-slate-50 border-border/50 cursor-default'}`}>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Sin Estudiantes</p>
                        <p className={`text-2xl font-black ${clases_sin_estudiantes > 0 ? 'text-amber-500' : 'text-foreground'}`}>{clases_sin_estudiantes}</p>
                        {clases_sin_estudiantes > 0 && <p className="text-[10px] font-bold text-amber-400 mt-1">{expanded === 'estudiantes' ? '▲ Ocultar' : '▼ Ver detalle'}</p>}
                    </button>

                    <button onClick={() => clases_sin_docente > 0 && toggle('docente')} disabled={clases_sin_docente === 0} className={`p-4 rounded-3xl border text-left transition-all ${clases_sin_docente > 0 ? 'bg-slate-100 border-slate-300 hover:border-slate-400 cursor-pointer active:scale-[0.97]' : 'bg-slate-50 border-border/50 cursor-default'}`}>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Sin Docente</p>
                        <p className={`text-2xl font-black ${clases_sin_docente > 0 ? 'text-slate-600' : 'text-foreground'}`}>{clases_sin_docente}</p>
                        {clases_sin_docente > 0 && <p className="text-[10px] font-bold text-slate-400 mt-1">{expanded === 'docente' ? '▲ Ocultar' : '▼ Ver detalle'}</p>}
                    </button>
                </div>

                {expanded === 'horario' && detalle_sin_horario && detalle_sin_horario.length > 0 && (
                    <div className="space-y-2 animate-fade-in">
                        <p className="text-xs font-black text-red-600 uppercase tracking-wider">Materias sin horario</p>
                        <div className="max-h-48 overflow-y-auto space-y-1.5">
                            {detalle_sin_horario.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-red-50 border border-red-100">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-800 truncate">{item.materia}</p>
                                        <p className="text-[10px] text-slate-500">Ciclo {item.ciclo} • Paralelo {item.paralelo}</p>
                                    </div>
                                    {item.id && onEditClase && (
                                        <button onClick={() => onEditClase(item.id!)} className="ml-2 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors whitespace-nowrap">
                                            Editar
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {expanded === 'estudiantes' && detalle_sin_estudiantes && detalle_sin_estudiantes.length > 0 && (
                    <div className="space-y-2 animate-fade-in">
                        <p className="text-xs font-black text-amber-600 uppercase tracking-wider">Materias sin estudiantes</p>
                        <div className="max-h-48 overflow-y-auto space-y-1.5">
                            {detalle_sin_estudiantes.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-100">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-800 truncate">{item.materia}</p>
                                        <p className="text-[10px] text-slate-500">Ciclo {item.ciclo} • Paralelo {item.paralelo}</p>
                                    </div>
                                    {item.id && onEditClase && (
                                        <button onClick={() => onEditClase(item.id!)} className="ml-2 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors whitespace-nowrap">
                                            Editar
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {expanded === 'docente' && detalle_sin_docente && detalle_sin_docente.length > 0 && (
                    <div className="space-y-2 animate-fade-in">
                        <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Materias sin docente</p>
                        <div className="max-h-48 overflow-y-auto space-y-1.5">
                            {detalle_sin_docente.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 border border-slate-200">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-800 truncate">{item.materia}</p>
                                        <p className="text-[10px] text-slate-500">Ciclo {item.ciclo} • Paralelo {item.paralelo}</p>
                                    </div>
                                    {item.id && onEditClase && (
                                        <button onClick={() => onEditClase(item.id!)} className="ml-2 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors whitespace-nowrap">
                                            Editar
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10">
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Recomendación</h4>
                    <p className="text-sm font-medium text-foreground/80 leading-relaxed italic">
                        "{recomendacion}"
                    </p>
                </div>

                <div className="pt-4 flex gap-3">
                    <Button variant="primary" fullWidth onClick={onClose}>
                        Entendido
                    </Button>
                    {estado_general !== 'bueno' && (
                        <Button variant="secondary" fullWidth onClick={onClose}>
                            Corregir Excel
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};