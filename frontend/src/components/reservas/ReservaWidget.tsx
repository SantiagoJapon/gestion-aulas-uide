import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
    BookMarked,
    Clock,
    Calendar,
    ListChecks,
    Trash2,
    RefreshCw,
    Plus,
    CheckCircle2,
    AlertCircle,
    FlaskConical,
    School,
    BookOpen,
    ArrowLeft,
    Mic2
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// ── Tipos ──────────────────────────────────────────────────────────────────────
type EspacioTipo = 'AULA' | 'LABORATORIO' | 'SALA_ESPECIAL' | 'AUDITORIO';
type WidgetStep = 'tipo' | 'horario' | 'espacios';

interface TipoOpt {
    id: EspacioTipo;
    label: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    soloRol?: string[];
}

const TIPO_OPCIONES: TipoOpt[] = [
    {
        id: 'AULA',
        label: 'Aula',
        desc: 'Sala de clases regular',
        icon: <School className="size-6" />,
        color: 'indigo',
    },
    {
        id: 'LABORATORIO',
        label: 'Laboratorio',
        desc: 'Lab. de computación o ciencias',
        icon: <FlaskConical className="size-6" />,
        color: 'emerald',
    },
    {
        id: 'SALA_ESPECIAL',
        label: 'Sala de Estudio',
        desc: 'Sala de reuniones o biblioteca',
        icon: <BookOpen className="size-6" />,
        color: 'amber',
    },
    {
        id: 'AUDITORIO',
        label: 'Auditorio',
        desc: 'Solo Directores — requiere aprobación',
        icon: <Mic2 className="size-6" />,
        color: 'rose',
        soloRol: ['director', 'admin'],
    },
];

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
    activa: { label: 'Confirmada ✓', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    pendiente_aprobacion: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    cancelada: { label: 'Cancelada', className: 'bg-slate-100 text-slate-500 line-through' },
    rechazada: { label: 'Rechazada', className: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
    finalizada: { label: 'Finalizada', className: 'bg-slate-100 text-slate-500' },
};

const COLOR_MAP: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300',
};

const COLOR_SELECTED: Record<string, string> = {
    indigo: 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-300/30',
    emerald: 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-300/30',
    amber: 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-300/30',
    rose: 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-300/30',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const calcularHoraFin = (inicio: string, horas: number) => {
    const [h, m] = inicio.split(':').map(Number);
    return `${String(h + horas).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatFecha = (fechaStr: string) => {
    if (!fechaStr) return '';
    const [y, mo, d] = fechaStr.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString('es-EC', {
        weekday: 'short', day: 'numeric', month: 'short'
    });
};

// ── Componente principal ───────────────────────────────────────────────────────
export default function ReservaWidget() {
    const { user } = useContext(AuthContext);
    const today = new Date().toISOString().split('T')[0];

    // Tabs: 'nueva' | 'mis'
    const [activeTab, setActiveTab] = useState<'nueva' | 'mis'>('nueva');

    // ─ Nueva reserva ─────────────────────────────────────────────────────────
    const [step, setStep] = useState<WidgetStep>('tipo');
    const [tipo, setTipo] = useState<EspacioTipo>('AULA');
    const [fecha, setFecha] = useState(today);
    const [hora, setHora] = useState('10:00');
    const [duracion, setDuracion] = useState(1);
    const [motivo, setMotivo] = useState('');

    const [buscando, setBuscando] = useState(false);
    const [espacios, setEspacios] = useState<any[]>([]);
    const [confirmando, setConfirmando] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string; aula?: string } | null>(null);

    // ─ Mis reservas ──────────────────────────────────────────────────────────
    const [misReservas, setMisReservas] = useState<any[]>([]);
    const [loadingMis, setLoadingMis] = useState(false);
    const [cancelingId, setCancelingId] = useState<number | null>(null);

    // Tipos disponibles para este rol
    const tiposDisponibles = TIPO_OPCIONES.filter(t =>
        !t.soloRol || t.soloRol.includes(user?.rol || '')
    );

    // ─ Buscar espacios automáticamente al cambiar parámetros ─────────────────
    const buscarEspacios = useCallback(async () => {
        if (step !== 'espacios') return;
        setBuscando(true);
        setEspacios([]);
        try {
            const hFin = calcularHoraFin(hora, duracion);
            const res = await axios.get(`${API_URL}/reservas/disponibles`, {
                params: { fecha, hora_inicio: hora, hora_fin: hFin, tipo },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.success) {
                // Combinar aulas y espacios en una sola lista
                const todos = [
                    ...(res.data.aulas || []).map((a: any) => ({ ...a, _fuente: 'aula' })),
                    ...(res.data.espacios || []).map((e: any) => ({ ...e, _fuente: 'espacio' })),
                ];
                setEspacios(todos);
            }
        } catch {
            setEspacios([]);
        } finally {
            setBuscando(false);
        }
    }, [step, fecha, hora, duracion, tipo]);

    useEffect(() => { buscarEspacios(); }, [buscarEspacios]);

    // ─ Cargar mis reservas ───────────────────────────────────────────────────
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

    useEffect(() => {
        if (activeTab === 'mis') cargarMisReservas();
    }, [activeTab, cargarMisReservas]);

    // ─ Confirmar reserva ─────────────────────────────────────────────────────
    const confirmarReserva = async (espacio: any) => {
        const codigo = espacio.codigo;
        setConfirmando(codigo);
        setLastResult(null);
        try {
            const hFin = calcularHoraFin(hora, duracion);
            const esFuente = espacio._fuente;
            const res = await axios.post(`${API_URL}/reservas`, {
                aula_codigo: esFuente === 'aula' ? codigo : undefined,
                espacio_codigo: esFuente === 'espacio' ? codigo : undefined,
                fecha,
                hora_inicio: hora,
                hora_fin: hFin,
                motivo: motivo || `Reserva ${tipo}`,
                tipo_espacio: esFuente
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (res.data.success) {
                const isPendiente = res.data.reserva?.estado === 'pendiente_aprobacion';
                setLastResult({
                    ok: true,
                    msg: isPendiente
                        ? `⏳ Solicitud enviada — pendiente de aprobación.`
                        : `✅ ¡Reserva confirmada! El espacio quedó bloqueado.`,
                    aula: `${espacio.nombre || codigo} · ${formatFecha(fecha)} · ${hora}–${hFin}`
                });
                setStep('tipo');
                setMotivo('');
                cargarMisReservas();
            }
        } catch (err: any) {
            setLastResult({
                ok: false,
                msg: err.response?.data?.error || 'Error al procesar la reserva'
            });
        } finally {
            setConfirmando(null);
        }
    };

    // ─ Cancelar reserva ──────────────────────────────────────────────────────
    const cancelarReserva = async (id: number) => {
        if (!confirm('¿Seguro que deseas cancelar esta reserva?')) return;
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

    // ─ Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-border shadow-xl shadow-indigo-500/5 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center gap-3 border-b border-border">
                <div className="size-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <BookMarked className="size-5" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-foreground uppercase tracking-tight">Reservar Espacio</h2>
                    <p className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest">UIDE · Loja</p>
                </div>
                {/* Tabs */}
                <div className="ml-auto flex gap-1 p-1 bg-muted/30 rounded-xl border border-border">
                    <button
                        onClick={() => { setActiveTab('nueva'); setLastResult(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'nueva' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-400' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Plus className="size-3" /> Nueva
                    </button>
                    <button
                        onClick={() => setActiveTab('mis')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'mis' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-400' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <ListChecks className="size-3" />
                        Mis reservas
                        {misReservas.filter(r => r.estado === 'activa' || r.estado === 'pendiente_aprobacion').length > 0 && (
                            <span className="size-4 rounded-full bg-indigo-600 text-white text-[8px] font-black flex items-center justify-center">
                                {misReservas.filter(r => r.estado === 'activa' || r.estado === 'pendiente_aprobacion').length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* ═══ TAB NUEVA RESERVA ═══════════════════════════════════════════ */}
            {activeTab === 'nueva' && (
                <div className="p-6 space-y-5">
                    {/* Feedback banner */}
                    {lastResult && (
                        <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm animate-in zoom-in duration-300 ${lastResult.ok
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                            }`}>
                            {lastResult.ok
                                ? <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                                : <AlertCircle className="size-5 shrink-0 mt-0.5" />}
                            <div>
                                <p className="font-bold text-[13px]">{lastResult.msg}</p>
                                {lastResult.aula && <p className="text-[11px] opacity-80 mt-0.5">{lastResult.aula}</p>}
                                {lastResult.ok && (
                                    <button onClick={() => setActiveTab('mis')} className="text-[11px] font-black underline mt-1">
                                        Ver mis reservas →
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setLastResult(null)} className="ml-auto text-current opacity-50 hover:opacity-100">
                                ✕
                            </button>
                        </div>
                    )}

                    {/* PASO 1 — Tipo de espacio */}
                    {step === 'tipo' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">¿Qué tipo de espacio necesitas?</p>
                            <div className="grid grid-cols-2 gap-3">
                                {tiposDisponibles.map(t => {
                                    const isSelected = tipo === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setTipo(t.id)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 group ${isSelected ? COLOR_SELECTED[t.color] : COLOR_MAP[t.color] + ' hover:scale-[1.02]'}`}
                                        >
                                            <div className={`mb-2 ${isSelected ? 'text-white' : ''}`}>{t.icon}</div>
                                            <p className="text-xs font-black leading-none">{t.label}</p>
                                            <p className={`text-[9px] font-bold mt-1 leading-tight ${isSelected ? 'opacity-80' : 'opacity-60'}`}>{t.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setStep('horario')}
                                className="w-full py-3 bg-indigo-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-800 transition-all active:scale-[0.98] shadow-xl shadow-indigo-900/20"
                            >
                                Continuar →
                            </button>
                        </div>
                    )}

                    {/* PASO 2 — Fecha y horario */}
                    {step === 'horario' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                            <button onClick={() => setStep('tipo')} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                                <ArrowLeft className="size-3" /> Volver
                            </button>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">¿Cuándo y por cuánto tiempo?</p>

                            {/* Fecha */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <Calendar className="size-3" /> Fecha
                                </label>
                                <input
                                    type="date"
                                    min={today}
                                    value={fecha}
                                    onChange={e => setFecha(e.target.value)}
                                    className="w-full h-11 px-4 bg-muted/30 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>

                            {/* Hora + Duración */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock className="size-3" /> Desde
                                    </label>
                                    <select
                                        value={hora}
                                        onChange={e => setHora(e.target.value)}
                                        className="w-full h-11 px-3 bg-muted/30 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    >
                                        {Array.from({ length: 13 }, (_, i) => i + 7).map(h => (
                                            <option key={h} value={`${String(h).padStart(2, '0')}:00`}>{h}:00</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Duración</label>
                                    <div className="flex gap-2 h-11">
                                        {[1, 2, 3].map(h => (
                                            <button
                                                key={h}
                                                onClick={() => setDuracion(h)}
                                                className={`flex-1 rounded-xl border-2 text-xs font-black transition-all ${duracion === h
                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                    : 'bg-muted/30 border-border text-muted-foreground hover:border-indigo-300'}`}
                                            >
                                                {h}h
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Motivo (opcional) */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Motivo (opcional)</label>
                                <input
                                    type="text"
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    placeholder="Ej: Reunión de tesis, tutoría..."
                                    className="w-full h-11 px-4 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>

                            <button
                                onClick={() => setStep('espacios')}
                                className="w-full py-3 bg-indigo-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-800 transition-all active:scale-[0.98] shadow-xl shadow-indigo-900/20"
                            >
                                Ver espacios disponibles →
                            </button>
                        </div>
                    )}

                    {/* PASO 3 — Lista de espacios disponibles (auto-carga) */}
                    {step === 'espacios' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                            <div className="flex items-center justify-between">
                                <button onClick={() => setStep('horario')} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                                    <ArrowLeft className="size-3" /> Volver
                                </button>
                                <span className="text-[10px] font-black text-muted-foreground uppercase">
                                    {formatFecha(fecha)} · {hora}–{calcularHoraFin(hora, duracion)}
                                </span>
                            </div>

                            {buscando ? (
                                <div className="py-8 flex flex-col items-center gap-3 text-muted-foreground">
                                    <span className="size-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Verificando disponibilidad...</p>
                                </div>
                            ) : espacios.length === 0 ? (
                                <div className="py-10 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
                                    <AlertCircle className="size-8 mx-auto text-muted-foreground mb-2 opacity-40" />
                                    <p className="text-xs font-black text-muted-foreground opacity-60 uppercase">Sin disponibilidad</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 opacity-50">Prueba otro horario o fecha</p>
                                    <button
                                        onClick={() => setStep('horario')}
                                        className="mt-3 text-[11px] font-black text-indigo-600 hover:underline"
                                    >
                                        Cambiar horario
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                                    {espacios.map(esp => {
                                        const isLoading = confirmando === esp.codigo;
                                        const esAuditorio = esp.tipo === 'AUDITORIO' || esp.codigo?.toLowerCase().includes('auditorio');
                                        return (
                                            <button
                                                key={esp.id || esp.codigo}
                                                onClick={() => confirmarReserva(esp)}
                                                disabled={!!confirmando}
                                                className="w-full flex items-center justify-between p-4 rounded-2xl border border-border hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all text-left group disabled:opacity-50 active:scale-[0.98]"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-foreground group-hover:text-indigo-700 dark:group-hover:text-indigo-400 truncate">{esp.nombre || esp.codigo}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                                                        {esp.edificio ? `${esp.edificio} · ` : ''}{esp.tipo} · {esp.capacidad} pers.
                                                    </p>
                                                </div>
                                                <div className="shrink-0 ml-3 text-center">
                                                    {isLoading ? (
                                                        <span className="size-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin block" />
                                                    ) : (
                                                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg block ${esAuditorio
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                            }`}>
                                                            {esAuditorio ? 'Solicitar' : 'Reservar'}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ TAB MIS RESERVAS ════════════════════════════════════════════ */}
            {activeTab === 'mis' && (
                <div className="p-6 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Próximas reservas</p>
                        <button
                            onClick={cargarMisReservas}
                            disabled={loadingMis}
                            className="size-7 rounded-lg bg-muted/30 hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
                        >
                            <RefreshCw className={`size-3 ${loadingMis ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {loadingMis ? (
                        <div className="py-10 flex justify-center">
                            <span className="size-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                    ) : misReservas.length === 0 ? (
                        <div className="py-10 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
                            <ListChecks className="size-8 mx-auto text-muted-foreground mb-2 opacity-40" />
                            <p className="text-[10px] font-black text-muted-foreground opacity-60 uppercase">Sin reservas activas</p>
                            <button
                                onClick={() => setActiveTab('nueva')}
                                className="mt-3 text-[11px] font-black text-indigo-600 hover:underline"
                            >
                                Hacer una reserva →
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                            {misReservas.map(reserva => {
                                const badge = ESTADO_BADGE[reserva.estado] || { label: reserva.estado, className: 'bg-slate-100 text-slate-500' };
                                const cancelable = reserva.estado === 'activa' || reserva.estado === 'pendiente_aprobacion';
                                return (
                                    <div key={reserva.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                                        <div className="size-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 text-xs font-black">
                                            {(reserva.aula_codigo || reserva.espacio_codigo || '?').substring(0, 3).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-xs font-black text-foreground truncate">{reserva.aula_codigo || reserva.espacio_codigo}</p>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${badge.className}`}>{badge.label}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
                                                {formatFecha(reserva.fecha)} · {reserva.hora_inicio}–{reserva.hora_fin}
                                            </p>
                                            {reserva.motivo && (
                                                <p className="text-[9px] text-muted-foreground/60 truncate mt-0.5">{reserva.motivo}</p>
                                            )}
                                        </div>
                                        {cancelable && (
                                            <button
                                                onClick={() => cancelarReserva(reserva.id)}
                                                disabled={cancelingId === reserva.id}
                                                className="size-7 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                                            >
                                                {cancelingId === reserva.id
                                                    ? <span className="size-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                                    : <Trash2 className="size-3" />}
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
