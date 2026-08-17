import { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../../context/AuthContext';
import { reservaService, aulaService, espacioService } from '../../services/api';
import {
    CalendarPlus,
    Search,
    X,
    ListChecks,
    ArrowLeft,
    Clock,
    Calendar,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Trash2,
    Plus,
    ChevronRight,
    DoorOpen,
    School,
    FlaskConical,
    BookOpen,
    Mic2,
} from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────────
type PanelView = 'reservar' | 'mis-reservas';
type Step = 'inicio' | 'horario' | 'espacios' | 'confirmar';
type EspacioTipo = 'AULA' | 'LABORATORIO' | 'SALA_ESPECIAL' | 'AUDITORIO';

interface CatalogItem {
    id: number;
    codigo: string;
    nombre: string;
    tipo: string;
    capacidad: number;
    edificio?: string;
    _fuente: 'aula' | 'espacio';
}

interface TipoOpt {
    id: EspacioTipo;
    label: string;
    icon: React.ReactNode;
    color: string;
    soloRol?: string[];
}

const TIPO_OPCIONES: TipoOpt[] = [
    { id: 'AULA', label: 'Aula', icon: <School className="size-5" />, color: 'indigo' },
    { id: 'LABORATORIO', label: 'Laboratorio', icon: <FlaskConical className="size-5" />, color: 'emerald' },
    { id: 'SALA_ESPECIAL', label: 'Sala de Estudio', icon: <BookOpen className="size-5" />, color: 'amber' },
    { id: 'AUDITORIO', label: 'Auditorio', icon: <Mic2 className="size-5" />, color: 'rose', soloRol: ['director', 'admin'] },
];

const COLOR_MAP: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
};

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
    activa: { label: 'Confirmada', className: 'bg-emerald-100 text-emerald-700' },
    pendiente_aprobacion: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
    cancelada: { label: 'Cancelada', className: 'bg-slate-100 text-slate-500 line-through' },
    rechazada: { label: 'Rechazada', className: 'bg-red-100 text-red-600' },
    finalizada: { label: 'Finalizada', className: 'bg-slate-100 text-slate-500' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const diaDeFecha = (fechaStr: string) => {
    const [y, m, d] = fechaStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    return DIAS[new Date(y, m - 1, d).getDay()];
};

const calcularHoraFin = (inicio: string, horas: number) => {
    const [h, m] = inicio.split(':').map(Number);
    return `${String(h + horas).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatFecha = (fechaStr: string) => {
    if (!fechaStr) return '';
    const [y, m, d] = fechaStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
};

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

// ── Componente principal ───────────────────────────────────────────────────────
export default function ReservaFloatingWidget() {
    const { user } = useContext(AuthContext);
    const today = new Date().toISOString().split('T')[0];

    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<PanelView>('reservar');
    const [step, setStep] = useState<Step>('inicio');

    // Catálogo completo de aulas/espacios (para el buscador)
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogLoaded, setCatalogLoaded] = useState(false);
    const [query, setQuery] = useState('');

    // Selección
    const [tipo, setTipo] = useState<EspacioTipo>('AULA');
    const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);

    // Horario
    const [fecha, setFecha] = useState(today);
    const [hora, setHora] = useState('10:00');
    const [duracion, setDuracion] = useState(1);
    const [motivo, setMotivo] = useState('');

    // Búsqueda por tipo (paso "espacios")
    const [buscando, setBuscando] = useState(false);
    const [espacios, setEspacios] = useState<CatalogItem[]>([]);

    const [confirmando, setConfirmando] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string; detalle?: string } | null>(null);

    // Mis reservas
    const [misReservas, setMisReservas] = useState<any[]>([]);
    const [loadingMis, setLoadingMis] = useState(false);
    const [cancelingId, setCancelingId] = useState<number | null>(null);

    const tiposDisponibles = TIPO_OPCIONES.filter(t => !t.soloRol || t.soloRol.includes(user?.rol || ''));

    // ── Cargar catálogo completo al abrir (una sola vez por sesión de apertura) ──
    const loadCatalog = useCallback(async () => {
        setCatalogLoading(true);
        try {
            const [aulasRes, espaciosRes] = await Promise.allSettled([
                aulaService.getAulas(),
                espacioService.getEspacios(),
            ]);

            const items: CatalogItem[] = [];
            if (aulasRes.status === 'fulfilled' && aulasRes.value.success) {
                for (const a of aulasRes.value.aulas) {
                    items.push({ id: a.id, codigo: a.codigo, nombre: a.nombre, tipo: a.tipo, capacidad: a.capacidad, edificio: a.edificio, _fuente: 'aula' });
                }
            }
            if (espaciosRes.status === 'fulfilled' && espaciosRes.value.success) {
                for (const e of espaciosRes.value.espacios) {
                    items.push({ id: e.id, codigo: e.codigo, nombre: e.nombre, tipo: e.tipo, capacidad: e.capacidad, _fuente: 'espacio' });
                }
            }
            setCatalog(items);
            setCatalogLoaded(true);
        } catch {
            // Silencioso: el buscador simplemente no tendrá resultados
        } finally {
            setCatalogLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && !catalogLoaded) loadCatalog();
    }, [isOpen, catalogLoaded, loadCatalog]);

    const filteredCatalog = useMemo(() => {
        const q = normalizar(query.trim());
        if (!q) return [];
        return catalog
            .filter(item => normalizar(item.nombre).includes(q) || normalizar(item.codigo).includes(q))
            .slice(0, 6);
    }, [catalog, query]);

    // ── Buscar espacios disponibles por tipo (flujo "explorar por categoría") ──
    const buscarEspacios = useCallback(async () => {
        if (step !== 'espacios' || selectedItem) return;
        setBuscando(true);
        setEspacios([]);
        try {
            const hFin = calcularHoraFin(hora, duracion);
            const res = await reservaService.getDisponibles({ fecha, hora_inicio: hora, hora_fin: hFin, tipo });
            const todos: CatalogItem[] = [
                ...(res.aulas || []).map(a => ({ id: a.id, codigo: a.codigo, nombre: a.nombre, tipo: a.tipo, capacidad: a.capacidad, edificio: a.edificio, _fuente: 'aula' as const })),
                ...(res.espacios || []).map(e => ({ id: e.id, codigo: e.codigo, nombre: e.nombre, tipo: e.tipo, capacidad: e.capacidad, _fuente: 'espacio' as const })),
            ];
            setEspacios(todos);
        } catch {
            setEspacios([]);
        } finally {
            setBuscando(false);
        }
    }, [step, selectedItem, fecha, hora, duracion, tipo]);

    useEffect(() => { buscarEspacios(); }, [buscarEspacios]);

    // ── Mis reservas ──────────────────────────────────────────────────────────
    const cargarMisReservas = useCallback(async () => {
        setLoadingMis(true);
        try {
            const res = await reservaService.misReservas();
            if (res.success) setMisReservas(res.reservas);
        } catch {
            setMisReservas([]);
        } finally {
            setLoadingMis(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && view === 'mis-reservas') cargarMisReservas();
    }, [isOpen, view, cargarMisReservas]);

    useEffect(() => {
        if (!lastResult) return;
        const t = setTimeout(() => setLastResult(null), 5000);
        return () => clearTimeout(t);
    }, [lastResult]);

    // ── Navegación del flujo ─────────────────────────────────────────────────
    const resetFlujo = () => {
        setStep('inicio');
        setSelectedItem(null);
        setQuery('');
        setMotivo('');
    };

    const cerrarPanel = () => {
        setIsOpen(false);
        setView('reservar');
        resetFlujo();
    };

    const elegirDelBuscador = (item: CatalogItem) => {
        setSelectedItem(item);
        setQuery('');
        setStep('horario');
    };

    const elegirTipo = (t: EspacioTipo) => {
        setTipo(t);
        setSelectedItem(null);
        setStep('horario');
    };

    // ── Confirmar / cancelar reservas ────────────────────────────────────────
    const confirmarReserva = async (item: CatalogItem) => {
        setConfirmando(item.codigo);
        setLastResult(null);
        try {
            const hFin = calcularHoraFin(hora, duracion);
            const data = {
                dia: diaDeFecha(fecha),
                fecha,
                hora_inicio: hora,
                hora_fin: hFin,
                motivo: motivo || `Reserva ${item.tipo}`,
                tipo_espacio: item._fuente,
                ...(item._fuente === 'aula' ? { aula_codigo: item.codigo } : { espacio_codigo: item.codigo }),
            };
            const res = await reservaService.crear(data);
            if (res.success) {
                const pendiente = res.reserva?.estado === 'pendiente_aprobacion';
                setLastResult({
                    ok: true,
                    msg: pendiente ? 'Solicitud enviada — pendiente de aprobación' : '¡Reserva confirmada!',
                    detalle: `${item.nombre} · ${formatFecha(fecha)} · ${hora}–${hFin}`,
                });
                resetFlujo();
                cargarMisReservas();
            }
        } catch (err: any) {
            setLastResult({ ok: false, msg: err.response?.data?.error || 'Error al reservar' });
        } finally {
            setConfirmando(null);
        }
    };

    const cancelarReserva = async (id: number) => {
        if (!confirm('¿Seguro que deseas cancelar esta reserva?')) return;
        setCancelingId(id);
        try {
            await reservaService.cancelar(id);
            setMisReservas(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
            alert(err.response?.data?.error || 'No se pudo cancelar');
        } finally {
            setCancelingId(null);
        }
    };

    const activasCount = misReservas.filter(r => r.estado === 'activa' || r.estado === 'pendiente_aprobacion').length;

    // ── Lógica para arrastrar el botón flotante ─────────────────────────
    const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
        try {
            const saved = localStorage.getItem('reserva_widget_pos');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return null;
    });

    const isDraggingRef = useRef(false);
    const hasDraggedRef = useRef(false);
    const dragStartRef = useRef<{ x: number; y: number; buttonX: number; buttonY: number }>({ x: 0, y: 0, buttonX: 0, buttonY: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.button !== undefined && e.button !== 0) return;
        isDraggingRef.current = true;
        hasDraggedRef.current = false;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const rect = buttonRef.current?.getBoundingClientRect();
        const currentX = rect ? rect.left : (window.innerWidth - 80);
        const currentY = rect ? rect.top : (window.innerHeight - 80);

        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            buttonX: currentX,
            buttonY: currentY,
        };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            hasDraggedRef.current = true;
        }

        if (hasDraggedRef.current) {
            let newX = dragStartRef.current.buttonX + dx;
            let newY = dragStartRef.current.buttonY + dy;

            const size = 56;
            const padding = 12;
            newX = Math.max(padding, Math.min(window.innerWidth - size - padding, newX));
            newY = Math.max(padding, Math.min(window.innerHeight - size - padding, newY));

            setPosition({ x: newX, y: newY });
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            try {
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            } catch (err) {}
            if (hasDraggedRef.current && position) {
                try {
                    localStorage.setItem('reserva_widget_pos', JSON.stringify(position));
                } catch (e) {}
            }
        }
    };

    const handleButtonClick = () => {
        if (hasDraggedRef.current) {
            hasDraggedRef.current = false;
            return;
        }
        setIsOpen(true);
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <>
            <button
                ref={buttonRef}
                id="tour-reserva-flotante"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={handleButtonClick}
                className={`fixed z-50 size-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-transform touch-none select-none ${
                    position ? '' : 'bottom-6 right-6'
                }`}
                style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
                title="Mantén presionado para mover · Clic para abrir"
            >
                <CalendarPlus className="size-6 pointer-events-none" />
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-end justify-end p-6 animate-fade-in">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={cerrarPanel} />

                    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-in-right flex flex-col max-h-[620px]">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary to-primary/80 p-5 text-white shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                        <CalendarPlus className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-sm truncate">
                                            {view === 'mis-reservas' ? 'Mis reservas' : 'Reservar espacio'}
                                        </h3>
                                        <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">UIDE · Loja</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => setView(v => v === 'reservar' ? 'mis-reservas' : 'reservar')}
                                        className="relative size-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                                        title="Mis reservas"
                                    >
                                        <ListChecks className="size-4" />
                                        {activasCount > 0 && view !== 'mis-reservas' && (
                                            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-400 text-[9px] font-black text-slate-900 flex items-center justify-center">
                                                {activasCount}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={cerrarPanel}
                                        className="size-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            {lastResult && (
                                <div className={`mb-3 px-4 py-3 rounded-xl flex items-start gap-2 text-xs font-bold animate-in zoom-in-95 ${lastResult.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
                                    {lastResult.ok ? <CheckCircle2 className="size-4 shrink-0 mt-0.5" /> : <AlertCircle className="size-4 shrink-0 mt-0.5" />}
                                    <div>
                                        <p>{lastResult.msg}</p>
                                        {lastResult.detalle && <p className="font-medium opacity-70 mt-0.5">{lastResult.detalle}</p>}
                                    </div>
                                </div>
                            )}

                            {view === 'reservar' ? (
                                <>
                                    {/* PASO — Buscar o elegir tipo */}
                                    {step === 'inicio' && (
                                        <div className="space-y-4 animate-in fade-in duration-200">
                                            <div className="relative">
                                                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={query}
                                                    onChange={e => setQuery(e.target.value)}
                                                    placeholder="Buscar aula por nombre o código..."
                                                    className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                                />
                                            </div>

                                            {query.trim() && (
                                                <div className="space-y-1.5 -mt-1">
                                                    {catalogLoading ? (
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Cargando catálogo...</p>
                                                    ) : filteredCatalog.length === 0 ? (
                                                        <p className="text-[11px] text-slate-400 px-1">Sin coincidencias para "{query}"</p>
                                                    ) : (
                                                        filteredCatalog.map(item => (
                                                            <button
                                                                key={`${item._fuente}-${item.id}`}
                                                                onClick={() => elegirDelBuscador(item)}
                                                                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-slate-900 truncate">{item.nombre}</p>
                                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                                        {item.codigo} · {item.capacidad} pers.{item.edificio ? ` · Mod. ${item.edificio}` : ''}
                                                                    </p>
                                                                </div>
                                                                <ChevronRight className="size-4 text-slate-300 shrink-0" />
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <div className="h-px flex-1 bg-slate-100" />
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">o elige un tipo</span>
                                                <div className="h-px flex-1 bg-slate-100" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5">
                                                {tiposDisponibles.map(t => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => elegirTipo(t.id)}
                                                        className={`p-3 rounded-2xl border-2 text-left transition-all active:scale-95 hover:scale-[1.02] ${COLOR_MAP[t.color]}`}
                                                    >
                                                        <div className="mb-1.5">{t.icon}</div>
                                                        <p className="text-[11px] font-black leading-tight">{t.label}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* PASO — Fecha, hora y duración */}
                                    {step === 'horario' && (
                                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                                            <button onClick={resetFlujo} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors">
                                                <ArrowLeft className="size-3" /> Volver
                                            </button>

                                            {selectedItem && (
                                                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                        <DoorOpen className="size-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-900 truncate">{selectedItem.nombre}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{selectedItem.codigo} · {selectedItem.capacidad} pers.</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Calendar className="size-3" /> Fecha
                                                </label>
                                                <input
                                                    type="date"
                                                    min={today}
                                                    value={fecha}
                                                    onChange={e => setFecha(e.target.value)}
                                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Clock className="size-3" /> Desde
                                                    </label>
                                                    <select
                                                        value={hora}
                                                        onChange={e => setHora(e.target.value)}
                                                        className="w-full h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                                    >
                                                        {Array.from({ length: 13 }, (_, i) => i + 7).map(h => (
                                                            <option key={h} value={`${String(h).padStart(2, '0')}:00`}>{h}:00</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duración</label>
                                                    <div className="flex gap-1.5 h-10">
                                                        {[1, 2, 3].map(h => (
                                                            <button
                                                                key={h}
                                                                onClick={() => setDuracion(h)}
                                                                className={`flex-1 rounded-xl border-2 text-xs font-black transition-all ${duracion === h ? 'bg-primary border-primary text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                                            >
                                                                {h}h
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo (opcional)</label>
                                                <input
                                                    type="text"
                                                    value={motivo}
                                                    onChange={e => setMotivo(e.target.value)}
                                                    placeholder="Ej: Tutoría, reunión..."
                                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                                />
                                            </div>

                                            <button
                                                onClick={() => setStep(selectedItem ? 'confirmar' : 'espacios')}
                                                className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-[0.98]"
                                            >
                                                {selectedItem ? 'Ver resumen →' : 'Ver espacios disponibles →'}
                                            </button>
                                        </div>
                                    )}

                                    {/* PASO — Confirmar (flujo de búsqueda directa) */}
                                    {step === 'confirmar' && selectedItem && (
                                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                                            <button onClick={() => setStep('horario')} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors">
                                                <ArrowLeft className="size-3" /> Volver
                                            </button>

                                            <div className="p-4 rounded-2xl border-2 border-primary/20 bg-primary/5 space-y-2">
                                                <p className="text-sm font-black text-slate-900">{selectedItem.nombre}</p>
                                                <p className="text-[11px] text-slate-500 font-bold">
                                                    {selectedItem.codigo} · {selectedItem.capacidad} personas{selectedItem.edificio ? ` · Mod. ${selectedItem.edificio}` : ''}
                                                </p>
                                                <div className="h-px bg-primary/10" />
                                                <p className="text-[11px] text-slate-600 font-bold">
                                                    {formatFecha(fecha)} · {hora}–{calcularHoraFin(hora, duracion)}
                                                </p>
                                                {motivo && <p className="text-[11px] text-slate-400">{motivo}</p>}
                                            </div>

                                            <button
                                                onClick={() => confirmarReserva(selectedItem)}
                                                disabled={confirmando === selectedItem.codigo}
                                                className="w-full py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {confirmando === selectedItem.codigo ? (
                                                    <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    'Confirmar reserva'
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {/* PASO — Lista de espacios disponibles (flujo por tipo) */}
                                    {step === 'espacios' && (
                                        <div className="space-y-3 animate-in slide-in-from-right-4 duration-200">
                                            <div className="flex items-center justify-between">
                                                <button onClick={() => setStep('horario')} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors">
                                                    <ArrowLeft className="size-3" /> Volver
                                                </button>
                                                <span className="text-[10px] font-black text-slate-400 uppercase">
                                                    {formatFecha(fecha)} · {hora}–{calcularHoraFin(hora, duracion)}
                                                </span>
                                            </div>

                                            {buscando ? (
                                                <div className="py-8 flex flex-col items-center gap-3">
                                                    <span className="size-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verificando disponibilidad...</p>
                                                </div>
                                            ) : espacios.length === 0 ? (
                                                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                    <AlertCircle className="size-7 mx-auto text-slate-300 mb-2" />
                                                    <p className="text-xs font-black text-slate-400 uppercase">Sin disponibilidad</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">Prueba otro horario o fecha</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                                                    {espacios.map(esp => (
                                                        <button
                                                            key={`${esp._fuente}-${esp.id}`}
                                                            onClick={() => confirmarReserva(esp)}
                                                            disabled={!!confirmando}
                                                            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-slate-900 truncate">{esp.nombre}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">
                                                                    {esp.codigo} · {esp.capacidad} pers.{esp.edificio ? ` · Mod. ${esp.edificio}` : ''}
                                                                </p>
                                                            </div>
                                                            {confirmando === esp.codigo ? (
                                                                <span className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                                                            ) : (
                                                                <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                                    <Plus className="size-4" />
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* ═══ VISTA MIS RESERVAS ═══════════════════════════════════ */
                                <div className="space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <button onClick={() => setView('reservar')} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors">
                                            <ArrowLeft className="size-3" /> Volver a reservar
                                        </button>
                                        <button onClick={cargarMisReservas} disabled={loadingMis} className="size-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
                                            <RefreshCw className={`size-3 ${loadingMis ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>

                                    {loadingMis ? (
                                        <div className="py-8 flex justify-center">
                                            <span className="size-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        </div>
                                    ) : misReservas.length === 0 ? (
                                        <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <ListChecks className="size-7 mx-auto text-slate-300 mb-2" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Sin reservas activas</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                                            {misReservas.map(reserva => {
                                                const badge = ESTADO_BADGE[reserva.estado] || { label: reserva.estado, className: 'bg-slate-100 text-slate-500' };
                                                const cancelable = reserva.estado === 'activa' || reserva.estado === 'pendiente_aprobacion';
                                                return (
                                                    <div key={reserva.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <p className="text-xs font-black text-slate-900 truncate">{reserva.aula_codigo || reserva.espacio_codigo}</p>
                                                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${badge.className}`}>{badge.label}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                                                {formatFecha(reserva.fecha)} · {reserva.hora_inicio}–{reserva.hora_fin}
                                                            </p>
                                                            {reserva.motivo && (
                                                                <p className="text-[9px] text-slate-300 truncate mt-0.5">{reserva.motivo}</p>
                                                            )}
                                                        </div>
                                                        {cancelable && (
                                                            <button
                                                                onClick={() => cancelarReserva(reserva.id)}
                                                                disabled={cancelingId === reserva.id}
                                                                className="size-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                                                            >
                                                                {cancelingId === reserva.id ? (
                                                                    <span className="size-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="size-3" />
                                                                )}
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
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
