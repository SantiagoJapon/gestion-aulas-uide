import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, User, Clock, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function QuickSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [searchType, setSearchType] = useState<'docente' | 'aula'>('docente');
    const [aulaStatus, setAulaStatus] = useState<any>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query) return;

        setLoading(true);
        setShowResults(true);
        setAulaStatus(null);
        setResults([]);

        try {
            const endpoint = searchType === 'docente' ? '/busqueda/docente' : '/busqueda/aula';
            const params = searchType === 'docente' ? { q: query } : { codigo: query };

            const res = await axios.get(`${API_URL}${endpoint}`, {
                params,
                headers: { Authorization: `Bearer ${localStorage.getItem('uide_token')}` }
            });

            if (searchType === 'docente') {
                setResults(res.data.resultados || []);
            } else {
                setAulaStatus(res.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full max-w-md mx-auto" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {loading ? <Loader2 className="size-5 text-indigo-500 animate-spin" /> : <Search className="size-5 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />}
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchType === 'docente' ? "¿Qué profesor buscas?" : "Código de aula (ej: A101)"}
                    className="w-full h-12 pl-12 pr-24 bg-card border border-border rounded-full text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:font-medium"
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex bg-muted rounded-full p-1 border border-border">
                    <button
                        type="button"
                        onClick={() => setSearchType('docente')}
                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${searchType === 'docente' ? 'bg-white shadow-sm text-indigo-600' : 'text-muted-foreground'}`}
                    >
                        PROFE
                    </button>
                    <button
                        type="button"
                        onClick={() => setSearchType('aula')}
                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${searchType === 'aula' ? 'bg-white shadow-sm text-indigo-600' : 'text-muted-foreground'}`}
                    >
                        AULA
                    </button>
                </div>
            </form>

            {/* Resultados Dropdown */}
            {showResults && (query || loading) && (
                <div className="absolute top-14 left-0 right-0 bg-card border border-border rounded-3xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="py-8 text-center">
                                <p className="text-xs font-black text-muted-foreground animate-pulse">BUSCANDO EN TIEMPO REAL...</p>
                            </div>
                        ) : searchType === 'docente' ? (
                            results.length > 0 ? (
                                <div className="space-y-3">
                                    {results.map((res, i) => (
                                        <div key={i} className="p-4 rounded-2xl bg-muted/30 border border-border">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="size-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                    <User className="size-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-foreground">{res.docente}</h4>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${res.estado === 'EN_CLASE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {res.estado.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>

                                            {res.aula && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-xs text-foreground">
                                                        <MapPin className="size-3.5 text-indigo-500" />
                                                        <span className="font-bold">{res.aula}</span>
                                                        <span className="text-muted-foreground">• {res.edificio}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                        <Clock className="size-3.5" />
                                                        <span>{res.materia}</span>
                                                        <span>({res.estado === 'EN_CLASE' ? `hasta ${res.hora_fin}` : `desde ${res.hora_inicio}`})</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center opacity-50">
                                    <AlertCircle className="size-10 mx-auto mb-2" />
                                    <p className="text-xs font-black uppercase">No se hallaron coincidencias</p>
                                </div>
                            )
                        ) : aulaStatus ? (
                            <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center">
                                <div className={`size-12 rounded-full mx-auto mb-4 flex items-center justify-center ${aulaStatus.estado === 'LIBRE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    <MapPin className="size-6" />
                                </div>
                                <h4 className="text-sm font-black text-foreground mb-1 uppercase tracking-tight">{query}</h4>
                                <p className={`text-xs font-black uppercase mb-4 ${aulaStatus.estado === 'LIBRE' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {aulaStatus.estado.replace('_', ' ')}
                                </p>

                                {aulaStatus.detalles && (
                                    <div className="text-left space-y-2 pt-4 border-t border-border">
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                                            <Clock className="size-3" />
                                            Ocupada hasta {aulaStatus.detalles.until || aulaStatus.detalles.hasta}
                                        </p>
                                        <p className="text-[11px] font-black text-foreground uppercase">{aulaStatus.detalles.actividad}</p>
                                        <p className="text-[10px] font-medium text-muted-foreground truncate">{aulaStatus.detalles.responsable}</p>
                                    </div>
                                )}

                                {aulaStatus.estado === 'LIBRE' && (
                                    <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">{aulaStatus.mensaje}</p>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
