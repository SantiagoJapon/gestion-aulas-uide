import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { searchService, reservaService } from '../services/api';

interface QuickSpace {
    id: number;
    codigo: string;
    nombre: string;
    tipo: string;
    capacidad: number;
    edificio?: string;
    piso?: string;
    espacio_tipo?: 'aula' | 'espacio';
}

const getCurrentTimeSlot = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const currentMinutes = h * 60 + m;

    const slots = [
        { start: '07:00', end: '09:00', min: 420, max: 540 },
        { start: '09:00', end: '11:00', min: 540, max: 660 },
        { start: '11:00', end: '13:00', min: 660, max: 780 },
        { start: '13:00', end: '15:00', min: 780, max: 900 },
        { start: '15:00', end: '17:00', min: 900, max: 1020 },
        { start: '17:00', end: '19:00', min: 1020, max: 1140 },
    ];

    for (const slot of slots) {
        if (currentMinutes >= slot.min && currentMinutes < slot.max) {
            return { hora_inicio: slot.start, hora_fin: slot.end };
        }
    }

    if (currentMinutes < 420) return { hora_inicio: '07:00', hora_fin: '09:00' };
    return { hora_inicio: '17:00', hora_fin: '19:00' };
};

const getDayName = () => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[new Date().getDay()];
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const MAX_SPACES = 5;

export default function QuickReserveFAB() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [spaces, setSpaces] = useState<QuickSpace[]>([]);
    const [bookingId, setBookingId] = useState<number | string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const loadAvailable = useCallback(async () => {
        setLoading(true);
        setErrorMsg('');
        setSpaces([]);
        try {
            const timeSlot = getCurrentTimeSlot();
            const dia = getDayName();
            const fecha = getTodayDate();

            const [aulasRes, espaciosRes] = await Promise.allSettled([
                searchService.buscarDisponibilidad({
                    dia,
                    fecha,
                    hora_inicio: timeSlot.hora_inicio,
                    hora_fin: timeSlot.hora_fin,
                    tipo_espacio: 'aula',
                }),
                searchService.buscarDisponibilidad({
                    dia,
                    fecha,
                    hora_inicio: timeSlot.hora_inicio,
                    hora_fin: timeSlot.hora_fin,
                    tipo_espacio: 'espacio',
                }),
            ]);

            const all: QuickSpace[] = [];

            if (aulasRes.status === 'fulfilled' && aulasRes.value.success) {
                for (const a of aulasRes.value.aulas.slice(0, MAX_SPACES)) {
                    all.push({
                        id: a.id,
                        codigo: a.codigo,
                        nombre: a.nombre,
                        tipo: a.tipo,
                        capacidad: a.capacidad,
                        edificio: a.edificio,
                        piso: a.piso,
                        espacio_tipo: 'aula',
                    });
                }
            }

            if (espaciosRes.status === 'fulfilled' && espaciosRes.value.success) {
                const remaining = MAX_SPACES - all.length;
                for (const e of espaciosRes.value.espacios.slice(0, remaining)) {
                    all.push({
                        id: e.id,
                        codigo: e.codigo,
                        nombre: e.nombre,
                        tipo: e.tipo,
                        capacidad: e.capacidad,
                        espacio_tipo: 'espacio',
                    });
                }
            }

            setSpaces(all);
        } catch {
            setErrorMsg('No se pudieron cargar los espacios');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) loadAvailable();
    }, [isOpen, loadAvailable]);

    useEffect(() => {
        if (!successMsg && !errorMsg) return;
        const t = setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 4000);
        return () => clearTimeout(t);
    }, [successMsg, errorMsg]);

    const handleReserve = async (space: QuickSpace) => {
        setBookingId(space.id);
        setErrorMsg('');
        try {
            const timeSlot = getCurrentTimeSlot();
            const dia = getDayName();
            const fecha = getTodayDate();

            const data: any = {
                dia,
                fecha,
                hora_inicio: timeSlot.hora_inicio,
                hora_fin: timeSlot.hora_fin,
                motivo: 'Reserva rápida',
            };

            if (space.espacio_tipo === 'aula') {
                data.aula_codigo = space.codigo;
                data.tipo_espacio = 'aula';
            } else {
                data.espacio_codigo = space.codigo;
                data.tipo_espacio = 'espacio';
            }

            const res = await reservaService.crear(data);
            if (res.success) {
                setSuccessMsg(
                    res.reserva?.estado === 'pendiente_aprobacion'
                        ? `Solicitud de ${space.nombre} enviada`
                        : `${space.nombre} reservada`
                );
                setSpaces(prev => prev.filter(s => s.id !== space.id));
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Error al reservar');
        } finally {
            setBookingId(null);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 size-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
                title="Reserva rápida"
            >
                <span className="material-symbols-outlined text-[28px] group-hover:rotate-12 transition-transform">bolt</span>
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-end justify-end p-6 animate-fade-in">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

                    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-in-right">
                        <div className="bg-gradient-to-r from-primary to-primary/80 p-5 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[22px]">bolt</span>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm">Reserva Rápida</h3>
                                        <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">
                                            {getDayName()} • {getCurrentTimeSlot().hora_inicio}-{getCurrentTimeSlot().hora_fin}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="size-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 max-h-[400px] overflow-y-auto">
                            {successMsg && (
                                <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-in zoom-in-95">
                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                    {successMsg}
                                </div>
                            )}

                            {errorMsg && (
                                <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-in zoom-in-95">
                                    <span className="material-symbols-outlined text-[18px]">error</span>
                                    {errorMsg}
                                </div>
                            )}

                            {loading ? (
                                <div className="py-10 flex flex-col items-center gap-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-3 border-slate-200 border-t-primary"></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Buscando espacios...</p>
                                </div>
                            ) : spaces.length === 0 ? (
                                <div className="py-10 flex flex-col items-center gap-3 text-center">
                                    <div className="size-16 bg-slate-100 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-slate-300">event_busy</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-500">Sin espacios disponibles</p>
                                    <p className="text-[11px] text-slate-400">No hay aulas o espacios libres en este horario</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {spaces.map((space) => (
                                        <div
                                            key={space.id}
                                            className="p-3 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${space.espacio_tipo === 'aula' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            {space.espacio_tipo === 'aula' ? 'meeting_room' : 'local_library'}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-900 truncate">{space.nombre}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                            {space.codigo} • {space.capacidad} personas
                                                            {space.edificio ? ` • Mod. ${space.edificio}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleReserve(space)}
                                                    disabled={bookingId === space.id}
                                                    className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-50 shrink-0 ml-2"
                                                >
                                                    {bookingId === space.id ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[18px]">add</span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button
                                onClick={loadAvailable}
                                disabled={loading}
                                className="w-full py-2.5 rounded-xl bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[16px]">refresh</span>
                                Actualizar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
