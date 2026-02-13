import React, { useState } from 'react';
import { searchService, Aula } from '../services/api';
import Highlight from './common/Highlight';

const DisponibilidadAulas = () => {
    const [params, setParams] = useState({
        dia: 'Lunes',
        hora_inicio: '07:00',
        hora_fin: '09:00',
        capacidad_minima: 10
    });

    const [loading, setLoading] = useState(false);
    const [resultados, setResultados] = useState<Aula[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const horas = Array.from({ length: 15 }, (_, i) => {
        const h = i + 7;
        return `${String(h).padStart(2, '0')}:00`;
    });

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setHasSearched(true);
        try {
            const res = await searchService.buscarDisponibilidad(params);
            if (res.success) {
                setResultados(res.aulas);
            }
        } catch (error) {
            console.error('Error buscando disponibilidad:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-card dark:bg-slate-900 rounded-3xl border border-border p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-3xl">event_available</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-foreground">Buscador de Disponibilidad</h2>
                        <p className="text-sm font-medium text-muted-foreground">Encuentra espacios libres en tiempo real para cualquier horario.</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Día</label>
                        <select
                            value={params.dia}
                            onChange={(e) => setParams({ ...params, dia: e.target.value })}
                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        >
                            {dias.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Desde</label>
                        <select
                            value={params.hora_inicio}
                            onChange={(e) => setParams({ ...params, hora_inicio: e.target.value })}
                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        >
                            {horas.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Hasta</label>
                        <select
                            value={params.hora_fin}
                            onChange={(e) => setParams({ ...params, hora_fin: e.target.value })}
                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        >
                            {horas.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Capacidad Mín.</label>
                        <input
                            type="number"
                            value={params.capacidad_minima}
                            onChange={(e) => setParams({ ...params, capacidad_minima: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        />
                    </div>

                    <div className="md:col-span-4 mt-4">
                        <button
                            disabled={loading}
                            className="w-full py-4 bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest rounded-2xl hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                                    Consultando base de datos...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">search</span>
                                    Buscar Aulas Libres
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {hasSearched && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resultados.length > 0 ? (
                        resultados.map((aula) => (
                            <div
                                key={aula.id}
                                className="bg-card dark:bg-slate-900 rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                        <span className="material-symbols-outlined text-[20px] font-variation-fill">verified</span>
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

                                <button className="w-full mt-6 py-3 bg-muted/50 text-muted-foreground hover:bg-primary hover:text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                                    Ver Horario Completo
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined text-6xl text-muted-foreground/30 mb-4">event_busy</span>
                            <p className="text-lg font-black text-muted-foreground">No hay aulas disponibles</p>
                            <p className="text-sm text-muted-foreground/60 font-medium">Intenta con otro horario o reduce la capacidad mínima.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DisponibilidadAulas;
