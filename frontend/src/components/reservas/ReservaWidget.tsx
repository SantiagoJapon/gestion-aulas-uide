import { useState, useEffect, useCallback } from 'react';
import {
    Bookmark,
    Clock,
    Hourglass,
    Armchair,
    CheckCircle2,
    AlertCircle,
    X,
    Calendar,
    ListChecks,
    Trash2,
    RefreshCw,
    Plus
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
    activa: { label: 'Activa', className: 'bg-emerald-100 text-emerald-700' },
    pendiente_aprobacion: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
    cancelada: { label: 'Cancelada', className: 'bg-slate-100 text-slate-500 line-through' },
    rechazada: { label: 'Rechazada', className: 'bg-red-100 text-red-600' },
    finalizada: { label: 'Finalizada', className: 'bg-slate-100 text-slate-500' },
};


export default function ReservaWidget() {
    const today = new Date().toISOString().split('T')[0];

    // ---- Tabs ----
    const [activeTab, setActiveTab] = useState<'nueva' | 'mis'>('nueva');

    // ---- Nueva reserva ----
    const [fecha, setFecha] = useState(today);
    const [tipo, setTipo] = useState('AULA');
    const [hora, setHora] = useState('10:00');
    const [duracion, setDuracion] = useState('1');
    const [loading, setLoading] = useState(false);
    const [showStatus, setShowStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [aulasLibres, setAulasLibres] = useState<any[]>([]);
    const [step, setStep] = useState<'form' | 'selection'>('form');
    const [lastReserva, setLastReserva] = useState<any>(null);

    // ---- Mis reservas ----
    const [misReservas, setMisReservas] = useState<any[]>([]);
    const [loadingMis, setLoadingMis] = useState(false);
    const [cancelingId, setCancelingId] = useState<number | null>(null);

    const calcularHoraFin = (inicio: string, h: string) => {
        const [hrs, mins] = inicio.split(':').map(Number);
        const endHrs = hrs + parseInt(h);
        return `${String(endHrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const cargarMisReservas = useCallback(async () => {
        setLoadingMis(true);
        try {
            const res = await axios.get(`${API_URL}/reservas/mis-reservas`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.success) setMisReservas(res.data.reservas);
        } catch {
            setMisReservas([]);
        } finally {
            setLoadingMis(false);
        }
    }, []);

    // Cargar mis reservas al cambiar de tab
    useEffect(() => {
        if (activeTab === 'mis') cargarMisReservas();
    }, [activeTab, cargarMisReservas]);

    // Recargar mis reservas cuando se hace una nueva
    useEffect(() => {
        if (lastReserva) cargarMisReservas();
    }, [lastReserva, cargarMisReservas]);

    const buscarAulas = async () => {
        setLoading(true);
        setShowStatus('idle');
        try {
            const hFin = calcularHoraFin(hora, duracion);
            // Determinar el tipo de espacio a buscar
            const tipoParam = tipo === 'AUDITORIO' ? 'aula' : tipo === 'BIBLIOTECA' ? 'espacio' : undefined;
            const res = await axios.get(`${API_URL}/reservas/disponibles`, {
                params: { fecha, hora_inicio: hora, hora_fin: hFin, tipo, tipo_espacio: tipoParam },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.success) {
                setAulasLibres(res.data.aulas || []);
                setStep('selection');
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'No se pudo consultar disponibilidad');
            setShowStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const realizarReserva = async (aulaCodigo: string) => {
        setLoading(true);
        try {
            const hFin = calcularHoraFin(hora, duracion);
            const res = await axios.post(`${API_URL}/reservas`, {
                aula_codigo: aulaCodigo,
                fecha,
                hora_inicio: hora,
                hora_fin: hFin,
                motivo: 'Reserva desde Web'
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.success) {
                setLastReserva(res.data.reserva);
                setShowStatus('success');
                setStep('form');
                setAulasLibres([]);
                setTimeout(() => setShowStatus('idle'), 4000);
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Error al procesar reserva');
            setShowStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const cancelarReserva = async (id: number) => {
        if (!confirm('¿Cancelar esta reserva?')) return;
        setCancelingId(id);
        try {
            await axios.delete(`${API_URL}/reservas/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setMisReservas(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
            alert(err.response?.data?.error || 'No se pudo cancelar');
        } finally {
            setCancelingId(null);
        }
    };

    const formatFecha = (fechaStr: string) => {
        if (!fechaStr) return '';
        const [y, m, d] = fechaStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
    };

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

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-muted/30 rounded-2xl border border-border">
                <button
                    onClick={() => setActiveTab('nueva')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'nueva' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-400' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Plus className="size-3.5" />
                    Nueva Reserva
                </button>
                <button
                    onClick={() => setActiveTab('mis')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'mis' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-400' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <ListChecks className="size-3.5" />
                    Mis Reservas
                    {misReservas.filter(r => r.estado === 'activa' || r.estado === 'pendiente_aprobacion').length > 0 && (
                        <span className="size-5 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center">
                            {misReservas.filter(r => r.estado === 'activa' || r.estado === 'pendiente_aprobacion').length}
                        </span>
                    )}
                </button>
            </div>

            {/* =============== TAB: NUEVA RESERVA =============== */}
            {activeTab === 'nueva' && (
                <>
                    {/* Banner de éxito */}
                    {showStatus === 'success' && lastReserva && (
                        <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl animate-in zoom-in duration-300">
                            <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                                    {lastReserva.estado === 'pendiente_aprobacion' ? '¡Solicitud enviada!' : '¡Reserva confirmada!'}
                                </p>
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                                    {lastReserva.aula_codigo} • {formatFecha(lastReserva.fecha)} • {lastReserva.hora_inicio}–{lastReserva.hora_fin}
                                    {lastReserva.estado === 'pendiente_aprobacion' && ' — Pendiente de aprobación'}
                                </p>
                                <button
                                    onClick={() => setActiveTab('mis')}
                                    className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 underline mt-1"
                                >
                                    Ver mis reservas →
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'form' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Fecha */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Fecha de Reserva</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-indigo-500" />
                                    <input
                                        type="date"
                                        min={today}
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        className="w-full h-12 pl-9 pr-4 bg-muted/30 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Tipo */}
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

                                {/* Horario */}
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
                                        <span className="text-xs sm:text-sm font-black uppercase tracking-wider">Buscar Disponibilidad</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Armchair className="size-4" />
                                    Disponibles ({aulasLibres.length})
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
                                            disabled={loading}
                                            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border hover:border-indigo-500 hover:bg-indigo-50/10 transition-all text-left group disabled:opacity-50"
                                        >
                                            <div>
                                                <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-400 group-hover:text-indigo-600">{aula.nombre}</h4>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{aula.edificio || 'UIDE'} • Piso {aula.piso || '1'}</p>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg mb-1 ${aula.tipo === 'AUDITORIO' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                    {aula.tipo === 'AUDITORIO' ? 'Solicitar' : 'Libre'}
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground">{aula.capacidad} pers.</span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-12 text-center bg-muted/20 rounded-3xl border border-dashed border-border opacity-50">
                                        <AlertCircle className="size-10 mx-auto text-muted-foreground mb-3" />
                                        <p className="text-xs font-black uppercase text-muted-foreground">No hay espacios disponibles</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Prueba con otro horario o fecha</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* =============== TAB: MIS RESERVAS =============== */}
            {activeTab === 'mis' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Próximas reservas</p>
                        <button
                            onClick={cargarMisReservas}
                            disabled={loadingMis}
                            className="size-8 rounded-xl bg-muted/30 hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
                            title="Actualizar"
                        >
                            <RefreshCw className={`size-3.5 ${loadingMis ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {loadingMis ? (
                        <div className="py-12 flex items-center justify-center">
                            <span className="size-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></span>
                        </div>
                    ) : misReservas.length === 0 ? (
                        <div className="py-12 text-center bg-muted/20 rounded-3xl border border-dashed border-border">
                            <ListChecks className="size-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                            <p className="text-xs font-black uppercase text-muted-foreground opacity-60">Sin reservas activas</p>
                            <button
                                onClick={() => setActiveTab('nueva')}
                                className="mt-3 text-[11px] font-black text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                                Hacer una reserva →
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                            {misReservas.map(reserva => {
                                const badge = ESTADO_BADGE[reserva.estado] || { label: reserva.estado, className: 'bg-slate-100 text-slate-500' };
                                const cancelable = reserva.estado === 'activa' || reserva.estado === 'pendiente_aprobacion';
                                return (
                                    <div key={reserva.id} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                                        <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shrink-0">
                                            <Armchair className="size-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-black text-foreground truncate">{reserva.aula_codigo}</p>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${badge.className}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground font-bold mt-0.5">
                                                {formatFecha(reserva.fecha)} • {reserva.hora_inicio}–{reserva.hora_fin}
                                            </p>
                                            {reserva.motivo && (
                                                <p className="text-[10px] text-muted-foreground/70 truncate">{reserva.motivo}</p>
                                            )}
                                        </div>
                                        {cancelable && (
                                            <button
                                                onClick={() => cancelarReserva(reserva.id)}
                                                disabled={cancelingId === reserva.id}
                                                className="size-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                                                title="Cancelar reserva"
                                            >
                                                {cancelingId === reserva.id
                                                    ? <span className="size-3 border border-red-400 border-t-transparent rounded-full animate-spin"></span>
                                                    : <Trash2 className="size-3.5" />}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
