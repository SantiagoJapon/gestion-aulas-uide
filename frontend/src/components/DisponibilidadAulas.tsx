import React, { useState, useEffect } from 'react';
import { searchService, reservaService, Aula, Espacio } from '../services/api';
import { Button } from './common/Button';

const DisponibilidadAulas = () => {
    // Obtener fecha actual en formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    const [params, setParams] = useState({
        dia: 'Lunes',
        fecha: today,
        hora_inicio: '07:00',
        hora_fin: '09:00',
        capacidad_minima: 10,
        tipo_espacio: 'aula' as 'aula' | 'espacio'
    });

    const [loading, setLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState<number | string | null>(null);
    const [aulasLibres, setAulasLibres] = useState<Aula[]>([]);
    const [espaciosLibres, setEspaciosLibres] = useState<Espacio[]>([]);
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
            const res = await searchService.buscarDisponibilidad({
                ...params,
                tipo_espacio: params.tipo_espacio
            });
            if (res.success) {
                setAulasLibres(res.aulas || []);
                setEspaciosLibres(res.espacios || []);
            }
        } catch (error: any) {
            console.error('Error buscando disponibilidad:', error);
            setErrorMsg(error.response?.data?.error || 'Error al buscar disponibilidad');
        } finally {
            setLoading(false);
        }
    };

    const handleReservaAula = async (aula: Aula) => {
        setBookingLoading(aula.id);
        setErrorMsg('');
        try {
            const res = await reservaService.crear({
                aula_codigo: aula.codigo,
                tipo_espacio: 'aula',
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
                setAulasLibres(prev => prev.filter(a => a.id !== aula.id));

                setTimeout(() => setSuccessMsg(''), 5000);
            }
        } catch (error: any) {
            console.error('Error al reservar:', error);
            setErrorMsg(error.response?.data?.error || 'Error al procesar reserva');
        } finally {
            setBookingLoading(null);
        }
    };

    const handleReservaEspacio = async (espacio: Espacio) => {
        setBookingLoading(espacio.codigo);
        setErrorMsg('');
        try {
            const res = await reservaService.crear({
                espacio_codigo: espacio.codigo,
                tipo_espacio: 'espacio',
                fecha: params.fecha,
                hora_inicio: params.hora_inicio,
                hora_fin: params.hora_fin,
                dia: params.dia,
                motivo: 'Reserva de espacio especial'
            });

            if (res.success) {
                setSuccessMsg(res.reserva?.estado === 'pendiente_aprobacion'
                    ? `Solicitud de ${espacio.nombre} enviada satisfactoriamente.`
                    : `Reserva de ${espacio.nombre} confirmada exitosamente.`);

                // Remover de la lista local para feedback visual
                setEspaciosLibres(prev => prev.filter(e => e.id !== espacio.id));

                setTimeout(() => setSuccessMsg(''), 5000);
            }
        } catch (error: any) {
            console.error('Error al reservar:', error);
            setErrorMsg(error.response?.data?.error || 'Error al procesar reserva');
        } finally {
            setBookingLoading(null);
        }
    };

    const totalResultados = aulasLibres.length + espaciosLibres.length;

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

                <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
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
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tipo</label>
                        <select
                            value={params.tipo_espacio}
                            onChange={(e) => setParams({ ...params, tipo_espacio: e.target.value as 'aula' | 'espacio' })}
                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        >
                            <option value="aula">Aulas</option>
                            <option value="espacio">Espacios (Biblioteca, Salas)</option>
                        </select>
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
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cap. Mín.</label>
                        <input
                            type="number"
                            value={params.capacidad_minima}
                            onChange={(e) => setParams({ ...params, capacidad_minima: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        />
                    </div>

                    <div className="col-span-1 sm:col-span-2 lg:col-span-6 mt-4">
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
                <div className="space-y-8">
                    {/* Aulas Section */}
                    {params.tipo_espacio === 'aula' && (
                        <div>
                            <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined">school</span>
                                Aulas Disponibles ({aulasLibres.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {aulasLibres.length > 0 ? (
                                    aulasLibres.map((aula) => (
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
                                                    onClick={() => handleReservaAula(aula)}
                                                    size="md"
                                                >
                                                    {aula.tipo === 'AUDITORIO' ? 'SOLICITAR' : 'RESERVAR'}
                                                </Button>

                                                {aula.tipo === 'AUDITORIO' && (
                                                    <p className="text-[9px] text-center text-amber-600 font-bold uppercase">Requiere aprobación</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 bg-muted/10 rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center">
                                        <span className="material-symbols-outlined text-5xl text-muted-foreground/30 mb-3">event_busy</span>
                                        <p className="text-base font-black text-muted-foreground">No hay aulas disponibles</p>
                                        <p className="text-sm text-muted-foreground/60 font-medium">Intenta con otra fecha u horario</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Espacios Section */}
                    {params.tipo_espacio === 'espacio' && (
                        <div>
                            <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined">local_library</span>
                                Espacios Disponibles ({espaciosLibres.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {espaciosLibres.length > 0 ? (
                                    espaciosLibres.map((espacio) => (
                                        <div
                                            key={espacio.id}
                                            className="bg-card dark:bg-slate-900 rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
                                        >
                                            <div className="absolute top-0 right-0 p-4">
                                                <div className="size-10 rounded-full flex items-center justify-center bg-purple-500/10 text-purple-500">
                                                    <span className="material-symbols-outlined text-[20px] font-variation-fill">
                                                        {espacio.tipo === 'BIBLIOTECA' ? 'local_library' : 'room'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-purple-500/10 group-hover:text-purple-500 transition-colors">
                                                    <span className="material-symbols-outlined text-2xl">local_library</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-foreground">{espacio.nombre}</h3>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Código: {espacio.codigo}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mt-6">
                                                <div className="p-3 bg-muted/30 rounded-2xl text-center border border-border/50">
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Capacidad</p>
                                                    <p className="text-xl font-black text-foreground">{espacio.capacidad}</p>
                                                </div>
                                                <div className="p-3 bg-muted/30 rounded-2xl text-center border border-border/50">
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tipo</p>
                                                    <p className="text-xs font-black text-foreground uppercase tracking-tight">{espacio.tipo}</p>
                                                </div>
                                            </div>

                                            <div className="mt-6 flex flex-col gap-2">
                                                <Button
                                                    variant="secondary"
                                                    fullWidth
                                                    loading={bookingLoading === espacio.codigo}
                                                    onClick={() => handleReservaEspacio(espacio)}
                                                    size="md"
                                                >
                                                    RESERVAR
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 bg-muted/10 rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center">
                                        <span className="material-symbols-outlined text-5xl text-muted-foreground/30 mb-3">event_busy</span>
                                        <p className="text-base font-black text-muted-foreground">No hay espacios disponibles</p>
                                        <p className="text-sm text-muted-foreground/60 font-medium">Intenta con otra fecha u horario</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DisponibilidadAulas;
