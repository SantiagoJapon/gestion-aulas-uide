import React, { useState, useEffect } from 'react';
import { searchService, Aula, reservaService } from '../services/api';
import { Button } from './common/Button';

const DisponibilidadAulas = () => {
    // Obtener fecha actual en formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    const [params, setParams] = useState({
        dia: 'Lunes',
        fecha: today,
        hora_inicio: '07:00',
        hora_fin: '09:00',
        capacidad_minima: 10
    });

    const [loading, setLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState<number | null>(null);
    const [resultados, setResultados] = useState<Aula[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const horas = Array.from({ length: 15 }, (_, i) => {
        const h = i + 7;
        return `${String(h).padStart(2, '0')}:00`;
    });

    // Actualizar el día de la semana si cambia la fecha
    useEffect(() => {
        const diasLookup = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const [year, month, day] = params.fecha.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        const diaNombre = diasLookup[d.getDay()];
        if (diaNombre !== 'Domingo') {
            setParams(prev => ({ ...prev, dia: diaNombre }));
        }
    }, [params.fecha]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setHasSearched(true);
        setErrorMsg('');
        try {
            // El backend buscarDisponibilidad renovado usa fecha, hora_inicio, hora_fin
            const res = await searchService.buscarDisponibilidad({
                ...params,
                // Si pasamos fecha, el backend la prefiere sobre el texto "dia"
            });
            if (res.success) {
                setResultados(res.aulas);
            }
        } catch (error: any) {
            console.error('Error buscando disponibilidad:', error);
            setErrorMsg(error.response?.data?.error || 'Error al buscar disponibilidad');
        } finally {
            setLoading(false);
        }
    };

    const handleReserva = async (aula: Aula) => {
        setBookingLoading(aula.id);
        setErrorMsg('');
        try {
            const res = await reservaService.crear({
                aula_codigo: aula.codigo,
                fecha: params.fecha,
                hora_inicio: params.hora_inicio,
                hora_fin: params.hora_fin,
                dia: params.dia,
                motivo: 'Reserva vía Buscador de Disponibilidad'
            });

            if (res.success) {
                setSuccessMsg(res.reserva?.estado === 'pendiente_aprobacion'
                    ? `Solicitud de ${aula.codigo} enviada satisfactoriamente.`
                    : `Reserva de ${aula.codigo} confirmada exitosamente.`);

                // Remover de la lista local para feedback visual
                setResultados(prev => prev.filter(a => a.id !== aula.id));

                setTimeout(() => setSuccessMsg(''), 5000);
            }
        } catch (error: any) {
            console.error('Error al reservar:', error);
            setErrorMsg(error.response?.data?.error || 'Error al procesar reserva');
        } finally {
            setBookingLoading(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Success Alert */}
            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
                    <span className="material-symbols-outlined font-variation-fill">check_circle</span>
                    <span className="font-bold">{successMsg}</span>
                </div>
            )}

            {/* Error Alert */}
            {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
                    <span className="material-symbols-outlined font-variation-fill">error</span>
                    <span className="font-bold">{errorMsg}</span>
                </div>
            )}

            <div className="bg-card dark:bg-slate-900 rounded-3xl border border-border p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-3xl">event_available</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-foreground">Buscador de Disponibilidad</h2>
                        <p className="text-sm font-medium text-muted-foreground">Encuentra espacios libres y resérvalos al instante.</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="space-y-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Fecha</label>
                        <input
                            type="date"
                            min={today}
                            value={params.fecha}
                            onChange={(e) => setParams({ ...params, fecha: e.target.value })}
                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        />
                    </div>

                    <div className="space-y-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Día (Auto)</label>
                        <div className="w-full px-4 py-3 bg-muted/10 border border-border rounded-xl font-bold text-muted-foreground truncate">
                            {params.dia}
                        </div>
                    </div>

                    <div className="space-y-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Desde</label>
                        <select
                            value={params.hora_inicio}
                            onChange={(e) => setParams({ ...params, hora_inicio: e.target.value })}
                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        >
                            {horas.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Hasta</label>
                        <select
                            value={params.hora_fin}
                            onChange={(e) => setParams({ ...params, hora_fin: e.target.value })}
                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        >
                            {horas.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Capacidad Mín.</label>
                        <input
                            type="number"
                            value={params.capacidad_minima}
                            onChange={(e) => setParams({ ...params, capacidad_minima: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        />
                    </div>

                    <div className="col-span-1 sm:col-span-2 lg:col-span-5 mt-4">
                        <Button
                            type="submit"
                            loading={loading}
                            fullWidth
                            size="lg"
                            icon={() => <span className="material-symbols-outlined text-[20px]">search</span> as any}
                        >
                            BUSCAR ESPACIOS DISPONIBLES
                        </Button>
                    </div>
                </form>
            </div>

            {hasSearched && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {resultados.length > 0 ? (
                        resultados.map((aula) => (
                            <div
                                key={aula.id}
                                className="bg-card dark:bg-slate-900 rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <div className={`size-10 rounded-full flex items-center justify-center ${aula.tipo === 'AUDITORIO' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'}`}>
                                        <span className="material-symbols-outlined text-[20px] font-variation-fill">
                                            {aula.tipo === 'AUDITORIO' ? 'report' : 'verified'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-2xl">meeting_room</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-foreground">{aula.nombre}</h3>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{aula.edificio} • Piso {aula.piso}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <div className="p-3 bg-muted/30 rounded-2xl text-center border border-border/50">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Capacidad</p>
                                        <p className="text-xl font-black text-foreground">{aula.capacidad}</p>
                                    </div>
                                    <div className="p-3 bg-muted/30 rounded-2xl text-center border border-border/50">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tipo</p>
                                        <p className="text-xs font-black text-foreground uppercase tracking-tight">{aula.tipo}</p>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col gap-2">
                                    <Button
                                        variant={aula.tipo === 'AUDITORIO' ? 'secondary' : 'primary'}
                                        fullWidth
                                        loading={bookingLoading === aula.id}
                                        onClick={() => handleReserva(aula)}
                                        size="md"
                                    >
                                        {aula.tipo === 'AUDITORIO' ? 'SOLICITAR AUDITORIO' : 'RESERVAR AHORA'}
                                    </Button>

                                    {aula.tipo === 'AUDITORIO' && (
                                        <p className="text-[9px] text-center text-amber-600 font-bold uppercase">Requiere aprobación del administrador</p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined text-6xl text-muted-foreground/30 mb-4">event_busy</span>
                            <p className="text-lg font-black text-muted-foreground">No hay aulas disponibles</p>
                            <p className="text-sm text-muted-foreground/60 font-medium">Intenta con otra fecha, horario o reduce la capacidad mínima.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DisponibilidadAulas;
