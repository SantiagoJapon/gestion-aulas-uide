import { useState } from 'react';
import {
    Bookmark,
    Clock,
    Hourglass,
    Armchair,
    CheckCircle2,
    AlertCircle,
    X
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function ReservaWidget() {
    const [tipo, setTipo] = useState('AULA');
    const [hora, setHora] = useState('10:00');
    const [duracion, setDuracion] = useState('1');
    const [loading, setLoading] = useState(false);
    const [showStatus, setShowStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [aulasLibres, setAulasLibres] = useState<any[]>([]);
    const [step, setStep] = useState<'form' | 'selection'>('form');

    const buscarAulas = async () => {
        setLoading(true);
        try {
            const fecha = new Date().toISOString().split('T')[0];
            const hFin = calcularHoraFin(hora, duracion);

            const res = await axios.get(`${API_URL}/reservas/disponibles`, {
                params: { fecha, hora_inicio: hora, hora_fin: hFin, tipo },
                headers: { Authorization: `Bearer ${localStorage.getItem('uide_token')}` }
            });

            if (res.data.success) {
                setAulasLibres(res.data.aulas);
                setStep('selection');
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'No se pudo consultar disponibilidad');
            setShowStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const calcularHoraFin = (inicio: string, h: string) => {
        const [hrs, mins] = inicio.split(':').map(Number);
        const endHrs = hrs + parseInt(h);
        return `${String(endHrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const realizarReserva = async (aulaCodigo: string) => {
        setLoading(true);
        try {
            const fecha = new Date().toISOString().split('T')[0];
            const hFin = calcularHoraFin(hora, duracion);

            await axios.post(`${API_URL}/reservas`, {
                aula_codigo: aulaCodigo,
                fecha,
                hora_inicio: hora,
                hora_fin: hFin,
                motivo: 'Reserva Rápida desde Web'
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('uide_token')}` }
            });

            setShowStatus('success');
            setTimeout(() => {
                setShowStatus('idle');
                setStep('form');
            }, 3000);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Error al procesar reserva');
            setShowStatus('error');
        } finally {
            setLoading(false);
        }
    };

    if (showStatus === 'success') {
        return (
            <div className="bg-card rounded-[2rem] border border-border p-8 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
                    <CheckCircle2 className="size-8" />
                </div>
                <h3 className="text-xl font-black text-foreground">¡Reserva Exitosa!</h3>
                <p className="text-sm text-muted-foreground mt-2">El espacio ha sido bloqueado para tu uso.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-border shadow-2xl shadow-indigo-500/5 p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="size-12 sm:size-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                    <Bookmark className="size-6 sm:size-7" />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight leading-none">Reserva de Espacios</h2>
                    <p className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-60">Biblioteca y Aulas</p>
                </div>
            </div>

            {step === 'form' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Promo Card */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Bookmark className="size-5" />
                        </div>
                        <div>
                            <h4 className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-tight">Reserva Rápida</h4>
                            <p className="text-[10px] sm:text-xs text-amber-800/60 dark:text-amber-400/60 font-medium">Asegura un espacio para hoy mismo.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Tipo de Espacio */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tipo de Espacio</label>
                            <select
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                className="w-full h-12 px-4 bg-muted/30 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                            >
                                <option value="AULA">Aula de Clase</option>
                                <option value="LABORATORIO">Laboratorio Tecnológico</option>
                                <option value="SALA_ESPECIAL">Sala de Biblioteca / Reunión</option>
                                <option value="AUDITORIO">Auditorio</option>
                            </select>
                        </div>

                        {/* Grid Horario */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Horario Inicio</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-indigo-500" />
                                    <select
                                        value={hora}
                                        onChange={(e) => setHora(e.target.value)}
                                        className="w-full h-12 pl-9 pr-4 bg-muted/30 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    >
                                        {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                                            <option key={h} value={`${String(h).padStart(2, '0')}:00`}>{h}:00</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Duración</label>
                                <div className="relative">
                                    <Hourglass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-indigo-500" />
                                    <select
                                        value={duracion}
                                        onChange={(e) => setDuracion(e.target.value)}
                                        className="w-full h-12 pl-9 pr-4 bg-muted/30 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    >
                                        <option value="1">1 Hora</option>
                                        <option value="2">2 Horas</option>
                                        <option value="3">3 Horas</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {showStatus === 'error' && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900/30 text-[10px] font-bold">
                            <AlertCircle className="size-4 shrink-0" />
                            {errorMsg}
                        </div>
                    )}

                    <button
                        onClick={buscarAulas}
                        disabled={loading}
                        className="w-full h-14 bg-indigo-950 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-900 transition-all active:scale-[0.98] shadow-xl shadow-indigo-950/20 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <Armchair className="size-5" />
                                <span className="text-xs sm:text-sm font-black uppercase tracking-wider">Reservar Ahora</span>
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Armchair className="size-4" />
                            Aulas Disponibles ({aulasLibres.length})
                        </h3>
                        <button onClick={() => setStep('form')} className="size-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {aulasLibres.length > 0 ? (
                            aulasLibres.map(aula => (
                                <button
                                    key={aula.id}
                                    onClick={() => realizarReserva(aula.codigo)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-border hover:border-indigo-500 hover:bg-indigo-50/10 transition-all text-left"
                                >
                                    <div>
                                        <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-400">{aula.nombre}</h4>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{aula.edificio || 'UIDE'} • Piso {aula.piso || '1'}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-lg mb-1">Libre</span>
                                        <span className="text-[10px] font-bold text-muted-foreground">{aula.capacidad} est.</span>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="py-12 text-center bg-muted/20 rounded-3xl border border-dashed border-border opacity-50">
                                <AlertCircle className="size-10 mx-auto text-muted-foreground mb-3" />
                                <p className="text-xs font-black uppercase text-muted-foreground">No hay espacios disponibles</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
