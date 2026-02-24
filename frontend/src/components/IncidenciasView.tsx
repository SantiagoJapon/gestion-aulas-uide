import { useState, useEffect } from 'react';
import { incidenciaService, incidenciaFotoUrl, TIPO_INCIDENCIA_LABELS, Incidencia } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const IncidenciasView = () => {
    const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterEstado, setFilterEstado] = useState('');
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const fetchIncidencias = async () => {
        setLoading(true);
        try {
            const res = await incidenciaService.listar(filterEstado ? { estado: filterEstado } : undefined);
            if (res.success) {
                setIncidencias(res.incidencias);
            }
        } catch (error) {
            console.error("Error cargando incidencias", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncidencias();
    }, [filterEstado]);

    const handleEstadoChange = async (id: number, nuevoEstado: string) => {
        if (!confirm(`¿Cambiar estado a ${nuevoEstado}?`)) return;
        try {
            await incidenciaService.actualizarEstado(id, { estado: nuevoEstado });
            fetchIncidencias(); // Recargar
        } catch (error) {
            alert("Error al actualizar estado");
        }
    };

    return (
        <div className="space-y-6">
        {/* Lightbox para fotos */}
        {lightboxUrl && (
            <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setLightboxUrl(null)}
            >
                <img src={lightboxUrl} alt="evidencia" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
            </div>
        )}
            {/* Filtros */}
            <div className="flex gap-4 overflow-x-auto pb-2">
                {['', 'PENDIENTE', 'REVISANDO', 'RESUELTO', 'CERRADO'].map(est => (
                    <button
                        key={est}
                        onClick={() => setFilterEstado(est)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterEstado === est
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white dark:bg-slate-900 text-muted-foreground border-border hover:border-primary/50'
                            }`}
                    >
                        {est || 'TODOS'}
                    </button>
                ))}
            </div>

            {/* Tabla */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Prioridad</th>
                                <th className="px-6 py-4">Asunto & Aula</th>
                                <th className="px-6 py-4">Reportado Por</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">Cargando reportes...</td></tr>
                            ) : incidencias.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">No hay incidencias registradas.</td></tr>
                            ) : (
                                incidencias.map(inc => (
                                    <tr key={inc.id} className="hover:bg-muted/10 transition-colors group">
                                        <td className="px-6 py-4 text-xs font-mono text-muted-foreground">#{inc.id}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border ${inc.prioridad === 'CRITICA' || inc.prioridad === 'ALTA' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    inc.prioridad === 'MEDIA' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                        'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                }`}>
                                                <span className={`size-1.5 rounded-full ${inc.prioridad === 'CRITICA' ? 'bg-red-500 animate-pulse' :
                                                        inc.prioridad === 'ALTA' ? 'bg-red-500' :
                                                            inc.prioridad === 'MEDIA' ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`}></span>
                                                {inc.prioridad}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="flex items-start gap-3">
                                                {(() => {
                                                    const fUrl = incidenciaFotoUrl(inc.foto_path);
                                                    return fUrl ? (
                                                        <img
                                                            src={fUrl}
                                                            alt="evidencia"
                                                            onClick={() => setLightboxUrl(fUrl)}
                                                            className="size-12 rounded-xl object-cover flex-shrink-0 border border-border cursor-zoom-in hover:opacity-80 transition-opacity"
                                                        />
                                                    ) : null;
                                                })()}
                                                <div className="min-w-0">
                                                    <div className="font-bold text-foreground text-xs mb-1">{inc.titulo}</div>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                                                        <span className="bg-muted px-1.5 rounded uppercase font-bold">{TIPO_INCIDENCIA_LABELS[inc.tipo] || inc.tipo}</span>
                                                        <span>•</span>
                                                        <span className="font-bold text-primary">{inc.aula_codigo}</span>
                                                        <span>•</span>
                                                        <span>{format(new Date(inc.created_at), "d MMM, HH:mm", { locale: es })}</span>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 italic">
                                                        "{inc.descripcion}"
                                                    </p>
                                                    {inc.nota_director && (
                                                        <p className="text-[9px] text-blue-600 mt-1 bg-blue-50 dark:bg-blue-950/20 rounded px-1.5 py-0.5">
                                                            <span className="font-black">Dir: </span>{inc.nota_director}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                                                    {inc.reportadoPor?.nombre?.[0]}{inc.reportadoPor?.apellido?.[0]}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-foreground leading-none">{inc.reportadoPor?.nombre} {inc.reportadoPor?.apellido}</span>
                                                    <span className="text-[9px] text-muted-foreground">{inc.reportadoPor?.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase ${inc.estado === 'PENDIENTE' ? 'text-red-500' :
                                                    inc.estado === 'REVISANDO' ? 'text-blue-500' :
                                                        'text-emerald-500'
                                                }`}>
                                                {inc.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {inc.estado !== 'RESUELTO' && inc.estado !== 'CERRADO' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEstadoChange(inc.id, 'REVISANDO')}
                                                            title="Marcar Revisando"
                                                            className="size-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">engineering</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleEstadoChange(inc.id, 'RESUELTO')}
                                                            title="Marcar Resuelto"
                                                            className="size-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">check</span>
                                                        </button>
                                                    </>
                                                )}
                                                {(inc.estado === 'RESUELTO' || inc.estado === 'CERRADO') && (
                                                    <button disabled className="size-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center cursor-not-allowed">
                                                        <span className="material-symbols-outlined text-sm">lock</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IncidenciasView;
