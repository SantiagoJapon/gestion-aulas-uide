import { Button } from '../common/Button';

interface HealthReport {
    total_clases: number;
    clases_sin_horario: number;
    clases_sin_estudiantes: number;
    clases_sin_docente: number;
    estado_general: 'bueno' | 'critico' | 'regular';
    recomendacion: string;
}

interface HealthReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: HealthReport | null;
}

export const HealthReportModal = ({ isOpen, onClose, report }: HealthReportModalProps) => {
    if (!isOpen || !report) return null;

    const { total_clases, clases_sin_horario, clases_sin_estudiantes, clases_sin_docente, estado_general, recomendacion } = report;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-border p-8 space-y-6">
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
                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-border/50">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Procesado</p>
                        <p className="text-2xl font-black text-foreground">{total_clases}</p>
                    </div>
                    <div className={`p-4 rounded-3xl border border-border/50 ${clases_sin_horario > 0 ? 'bg-red-500/5' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Sin Horario</p>
                        <p className={`text-2xl font-black ${clases_sin_horario > 0 ? 'text-red-500' : 'text-foreground'}`}>{clases_sin_horario}</p>
                    </div>
                    <div className={`p-4 rounded-3xl border border-border/50 ${clases_sin_estudiantes > 0 ? 'bg-amber-500/5' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Sin Estudiantes</p>
                        <p className={`text-2xl font-black ${clases_sin_estudiantes > 0 ? 'text-amber-500' : 'text-foreground'}`}>{clases_sin_estudiantes}</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-border/50">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Sin Docente</p>
                        <p className="text-2xl font-black text-foreground">{clases_sin_docente}</p>
                    </div>
                </div>

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
