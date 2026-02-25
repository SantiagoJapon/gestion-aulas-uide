import React, { useEffect, useState, useCallback } from 'react';
import { Estudiante, estudianteService, gestionAcademicaService, distribucionService } from '../services/api';
import { FaTimes, FaCalendarAlt, FaTrash, FaPlus, FaSearch, FaExclamationTriangle, FaCheckCircle, FaBookOpen } from 'react-icons/fa';

interface EstudianteLoadModalProps {
    estudiante: Estudiante;
    onClose: () => void;
}

const EstudianteLoadModal: React.FC<EstudianteLoadModalProps> = ({ estudiante, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [materias, setMaterias] = useState<any[]>([]);
    const [allClases, setAllClases] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Cargar carga actual del estudiante
            const res = await estudianteService.getEstudianteLoad(estudiante.id);
            if (res.success) {
                setMaterias(res.materias);
            }

            // 2. Cargar todas las clases de la carrera para poder añadir
            // Buscamos las clases disponibles en el horario actual
            const resClases = await distribucionService.obtenerHorario();
            if (resClases.success) {
                // Filtrar por la carrera del estudiante si es posible
                const filtered = resClases.clases.filter((c: any) =>
                    c.carrera.toLowerCase().includes(estudiante.escuela?.toLowerCase() || '') ||
                    (estudiante.escuela || '').toLowerCase().includes(c.carrera.toLowerCase())
                );
                setAllClases(filtered);
            }
        } catch (err: any) {
            setError('Error al cargar la carga académica');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [estudiante.id, estudiante.escuela]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleInscribir = async (claseId: number) => {
        try {
            setSubmitting(true);
            const res = await gestionAcademicaService.inscribirEstudiantesManual(claseId, [estudiante.id]);
            if (res.success) {
                await loadData();
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Error al inscribir');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDesinscribir = async (claseId: number) => {
        if (!confirm('¿Desvincular al estudiante de esta materia?')) return;
        try {
            setSubmitting(true);
            const res = await gestionAcademicaService.desinscribirEstudiante(estudiante.id, claseId);
            if (res.success) {
                await loadData();
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Error al desvincular');
        } finally {
            setSubmitting(false);
        }
    };

    // Filtrar clases disponibles para añadir (que no estén ya en su carga)
    const availableClases = allClases.filter(c =>
        !materias.some(m => m.id === c.id) &&
        (c.materia.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.ciclo.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Agrupar clases disponibles por materia para evitar duplicados si hay varios paralelos
    // pero el usuario debe poder elegir el paralelo específico.

    const detectConflict = (clase: any) => {
        if (!clase.dia || !clase.hora_inicio) return false;

        return materias.some(m => {
            if (m.id === clase.id) return false;
            if (m.dia !== clase.dia) return false;

            const start1 = parseInt(clase.hora_inicio.replace(':', ''));
            const end1 = parseInt(clase.hora_fin.replace(':', ''));
            const start2 = parseInt(m.hora_inicio.replace(':', ''));
            const end2 = parseInt(m.hora_fin.replace(':', ''));

            return (start1 < end2 && end1 > start2);
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FaCalendarAlt className="text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Gestión Académica Individual</h3>
                            <p className="text-sm text-muted-foreground">
                                Estudiante: <span className="font-semibold text-foreground">{estudiante.nombre}</span> ({estudiante.cedula})
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <FaTimes />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-0">
                    {/* Left Panel: Current Load */}
                    <div className="flex-1 overflow-y-auto p-6 border-r border-border custom-scrollbar">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-foreground flex items-center gap-2">
                                <FaCheckCircle className="text-green-500" />
                                Carga Semestral Actual
                            </h4>
                            <span className="text-xs bg-muted px-2 py-1 rounded-full font-medium">
                                {materias.length} Materias
                            </span>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600">
                                <FaExclamationTriangle className="shrink-0" />
                                <p className="text-xs font-medium">{error}</p>
                            </div>
                        )}

                        {loading ? (
                            <div className="py-20 text-center text-muted-foreground italic text-sm">Cargando datos...</div>
                        ) : materias.length === 0 ? (
                            <div className="py-20 text-center border-2 border-dashed border-border rounded-xl">
                                <p className="text-sm text-muted-foreground italic">El estudiante no tiene materias asignadas.</p>
                                <p className="text-xs text-muted-foreground mt-1">Usa el buscador para añadir su carga académica.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {materias.map((m) => (
                                    <div key={m.id} className="p-4 bg-card border border-border rounded-xl hover:shadow-md transition-all group border-l-4 border-l-primary">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h5 className="font-bold text-sm text-foreground uppercase tracking-tight line-clamp-1">{m.materia}</h5>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/5 text-primary rounded border border-primary/10">
                                                        {m.ciclo}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded">
                                                        Paralelo {m.paralelo}
                                                    </span>
                                                    <span className="text-[10px] font-medium flex items-center gap-1 text-muted-foreground">
                                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                        {m.dia} ({m.hora_inicio} - {m.hora_fin})
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">meeting_room</span>
                                                    Aula: {m.aula_asignada || 'Sin asignar'}
                                                </div>
                                            </div>
                                            <button
                                                disabled={submitting}
                                                onClick={() => handleDesinscribir(m.id)}
                                                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Add Materias */}
                    <div className="w-full md:w-[400px] bg-muted/10 p-6 overflow-y-auto custom-scrollbar">
                        <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <FaBookOpen className="text-primary" />
                            Añadir al Plan de Estudios
                        </h4>

                        <div className="relative mb-6">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                            <input
                                type="text"
                                placeholder="Buscar materia o ciclo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>

                        {searchTerm.length < 2 ? (
                            <div className="text-center py-10">
                                <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-3">
                                    <FaSearch className="text-muted-foreground/30" />
                                </div>
                                <p className="text-xs text-muted-foreground">Escribe al menos 2 letras para buscar materias disponibles en la carrera.</p>
                            </div>
                        ) : availableClases.length === 0 ? (
                            <p className="text-center py-10 text-xs text-muted-foreground italic">No se encontraron materias que no estén ya asignadas.</p>
                        ) : (
                            <div className="space-y-2">
                                {availableClases.slice(0, 15).map((c) => {
                                    const conflict = detectConflict(c);
                                    return (
                                        <div key={c.id} className={`p-3 bg-background border ${conflict ? 'border-amber-200 bg-amber-50/20' : 'border-border'} rounded-xl transition-all`}>
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h6 className="text-xs font-bold text-foreground truncate uppercase">{c.materia}</h6>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{c.ciclo}</span>
                                                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                            {c.dia} {c.hora_inicio}
                                                        </span>
                                                    </div>
                                                    {conflict && (
                                                        <div className="flex items-center gap-1 mt-1 text-[9px] text-amber-600 font-bold">
                                                            <FaExclamationTriangle size={8} /> Conflicto de horario
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    disabled={submitting}
                                                    onClick={() => handleInscribir(c.id)}
                                                    className={`p-2 rounded-lg transition-all ${conflict ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'}`}
                                                >
                                                    <FaPlus size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {availableClases.length > 15 && (
                                    <p className="text-[10px] text-center text-muted-foreground mt-2 italic">Mostrando solo los primeros 15 resultados...</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-3 text-xs">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors font-semibold"
                    >
                        Cerrar Gestión
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EstudianteLoadModal;
