import { useState, useEffect, useCallback } from 'react';
import { reservaService, Reserva } from '../../services/api';

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
    activa: { label: 'Activa', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    pendiente_aprobacion: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
    cancelada: { label: 'Cancelada', className: 'bg-slate-100 text-slate-500 border border-slate-200' },
    rechazada: { label: 'Rechazada', className: 'bg-red-100 text-red-600 border border-red-200' },
    finalizada: { label: 'Finalizada', className: 'bg-slate-100 text-slate-500 border border-slate-200' },
};

type FiltroEstado = 'pendiente_aprobacion' | 'activa' | 'rechazada' | 'todas';

export default function ReservasAdminView() {
    const [reservas, setReservas] = useState<Reserva[]>([]);
    const [loading, setLoading] = useState(false);
    const [filtro, setFiltro] = useState<FiltroEstado>('pendiente_aprobacion');
    const [procesando, setProcesando] = useState<number | null>(null);

    // Modal de rechazo
    const [rechazandoId, setRechazandoId] = useState<number | null>(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const params: { estado?: string } = {};
            if (filtro !== 'todas') params.estado = filtro;
            const res = await reservaService.listarTodas(params);
            setReservas(res.reservas || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filtro]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const aprobar = async (id: number) => {
        setProcesando(id);
        try {
            await reservaService.cambiarEstado(id, 'activa');
            await cargar();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al aprobar la reserva');
        } finally {
            setProcesando(null);
        }
    };

    const rechazar = async () => {
        if (!rechazandoId) return;
        setProcesando(rechazandoId);
        try {
            await reservaService.cambiarEstado(rechazandoId, 'rechazada', motivoRechazo);
            setRechazandoId(null);
            setMotivoRechazo('');
            await cargar();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al rechazar la reserva');
        } finally {
            setProcesando(null);
        }
    };

    const cancelar = async (id: number) => {
        if (!confirm('¿Cancelar esta reserva?')) return;
        setProcesando(id);
        try {
            await reservaService.cambiarEstado(id, 'cancelada');
            await cargar();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al cancelar');
        } finally {
            setProcesando(null);
        }
    };

    const pendientes = reservas.filter(r => r.estado === 'pendiente_aprobacion');

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-foreground">Gestión de Reservas</h2>
                    <p className="text-sm text-muted-foreground">Aprueba, rechaza o cancela reservas de espacios</p>
                </div>
                <button
                    onClick={cargar}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground border border-border rounded-xl px-4 py-2 hover:bg-muted transition-colors disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    Actualizar
                </button>
            </div>

            {/* Alerta de pendientes */}
            {pendientes.length > 0 && filtro !== 'pendiente_aprobacion' && (
                <button
                    onClick={() => setFiltro('pendiente_aprobacion')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-bold hover:bg-amber-100 transition-colors text-left"
                >
                    <span className="material-symbols-outlined text-amber-600">pending_actions</span>
                    {pendientes.length} reserva{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''} de aprobación
                    <span className="ml-auto text-amber-600 text-xs">Ver →</span>
                </button>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
                {([
                    { key: 'pendiente_aprobacion', label: 'Pendientes', icon: 'pending_actions' },
                    { key: 'activa', label: 'Activas', icon: 'event_available' },
                    { key: 'rechazada', label: 'Rechazadas', icon: 'event_busy' },
                    { key: 'todas', label: 'Todas', icon: 'list' },
                ] as { key: FiltroEstado; label: string; icon: string }[]).map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFiltro(f.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                            filtro === f.key
                                ? 'bg-uide-blue text-white border-uide-blue shadow-md'
                                : 'bg-white dark:bg-slate-800 text-muted-foreground border-border hover:border-uide-blue/40'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">{f.icon}</span>
                        {f.label}
                        {f.key === 'pendiente_aprobacion' && pendientes.length > 0 && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${filtro === f.key ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                {pendientes.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Lista */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full size-8 border-b-2 border-uide-blue" />
                    </div>
                ) : reservas.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">event_busy</span>
                        <p className="font-medium">No hay reservas en esta categoría</p>
                    </div>
                ) : (
                    reservas.map(r => {
                        const badge = ESTADO_BADGE[r.estado] || { label: r.estado, className: 'bg-slate-100 text-slate-500' };
                        const esPendiente = r.estado === 'pendiente_aprobacion';
                        const esActiva = r.estado === 'activa';
                        const solicitante = (r as any).solicitante_nombre || '—';

                        return (
                            <div
                                key={r.id}
                                className={`bg-white dark:bg-slate-800 border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm transition-all ${
                                    esPendiente ? 'border-amber-200 dark:border-amber-800' : 'border-border'
                                }`}
                            >
                                {/* Info */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-black text-foreground text-sm">{r.aula_codigo}</span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badge.className}`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                            {r.fecha} ({r.dia})
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                                            {r.hora_inicio} – {r.hora_fin}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">person</span>
                                            {solicitante}
                                        </span>
                                    </div>
                                    {r.motivo && (
                                        <p className="text-xs text-muted-foreground truncate">
                                            <span className="font-semibold">Motivo:</span> {r.motivo}
                                        </p>
                                    )}
                                </div>

                                {/* Acciones */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {esPendiente && (
                                        <>
                                            <button
                                                onClick={() => aprobar(r.id)}
                                                disabled={procesando === r.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {procesando === r.id ? 'sync' : 'check'}
                                                </span>
                                                Aprobar
                                            </button>
                                            <button
                                                onClick={() => { setRechazandoId(r.id); setMotivoRechazo(''); }}
                                                disabled={procesando === r.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                                Rechazar
                                            </button>
                                        </>
                                    )}
                                    {esActiva && (
                                        <button
                                            onClick={() => cancelar(r.id)}
                                            disabled={procesando === r.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-red-500 border border-border hover:border-red-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal de rechazo */}
            {rechazandoId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-border space-y-4 m-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                                <span className="material-symbols-outlined">event_busy</span>
                            </div>
                            <div>
                                <h3 className="font-black text-foreground">Rechazar reserva</h3>
                                <p className="text-xs text-muted-foreground">Escribe el motivo (opcional)</p>
                            </div>
                        </div>
                        <textarea
                            value={motivoRechazo}
                            onChange={e => setMotivoRechazo(e.target.value)}
                            placeholder="Ej: El auditorio ya fue reservado para evento institucional..."
                            rows={3}
                            className="w-full px-3 py-2 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-background"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setRechazandoId(null)}
                                className="flex-1 py-2 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={rechazar}
                                disabled={procesando === rechazandoId}
                                className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {procesando === rechazandoId ? 'Procesando...' : 'Confirmar rechazo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
