import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchService, SearchResult } from '../../services/api';

const CommandKSearch = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Escuchar Command+K o Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Autofocus cuando se abre
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setQuery('');
            setResults([]);
        }
    }, [isOpen]);

    // Búsqueda con debounce
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await searchService.globalSearch(query);
                if (res.success) {
                    setResults(res.results);
                    setSelectedIndex(0);
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        setIsOpen(false);
        navigate(result.link);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 sm:px-0">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setIsOpen(false)}
            />

            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in duration-200">
                <div className="flex items-center px-6 py-5 border-b border-border">
                    <span className="material-symbols-outlined text-muted-foreground mr-4">search</span>
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-lg font-medium placeholder:text-muted-foreground"
                        placeholder="Buscar materias, docentes, aulas..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 rounded bg-muted text-[10px] font-black border border-border/50 text-muted-foreground shadow-sm">ESC</kbd>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                    {loading && (
                        <div className="p-8 text-center">
                            <div className="animate-spin inline-block size-6 border-b-2 border-primary rounded-full mb-2"></div>
                            <p className="text-xs text-muted-foreground font-medium">Buscando en la base de datos...</p>
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="p-2">
                            <p className="px-4 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Resultados Sugeridos</p>
                            {results.map((result, index) => (
                                <button
                                    key={result.id}
                                    onClick={() => handleSelect(result)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-left transition-all ${index === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                        }`}
                                >
                                    <div className={`size-10 rounded-xl flex items-center justify-center ${index === selectedIndex ? 'bg-primary/20' : 'bg-muted'
                                        }`}>
                                        <span className="material-symbols-outlined">{result.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{result.title}</p>
                                        <p className="text-[11px] text-muted-foreground opacity-80 truncate">{result.subtitle}</p>
                                    </div>
                                    <span className={`material-symbols-outlined text-lg transition-transform ${index === selectedIndex ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
                                        }`}>
                                        chevron_right
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && query.length >= 2 && results.length === 0 && (
                        <div className="p-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-muted-foreground/30 mb-4">search_off</span>
                            <p className="text-sm font-bold text-muted-foreground">No encontramos nada para "{query}"</p>
                            <p className="text-xs text-muted-foreground/60 mt-2">Prueba con palabras más generales o revisa la ortografía.</p>
                        </div>
                    )}

                    {query.length < 2 && (
                        <div className="p-8 text-center text-muted-foreground opacity-50">
                            <p className="text-xs font-medium">Comienza a escribir para buscar en toda la plataforma...</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-white border border-border shadow-sm">↵</kbd>
                            Seleccionar
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-white border border-border shadow-sm">↑↓</kbd>
                            Navegar
                        </span>
                    </div>
                    <div>Spotlight Search v2.0</div>
                </div>
            </div>
        </div>
    );
};

export default CommandKSearch;
