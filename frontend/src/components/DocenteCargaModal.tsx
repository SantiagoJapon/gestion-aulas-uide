import React, { useState, useEffect } from 'react';
import { Docente, materiaCatalogoService, gestionAcademicaService, MateriaCatalogo, distribucionService } from '../services/api';
import { Button } from './common/Button';
import { FaTrash, FaPlus, FaUsers, FaArrowLeft, FaSearch, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

interface DocenteCargaModalProps {
    docente: Docente;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

const DocenteCargaModal: React.FC<DocenteCargaModalProps> = ({ docente, isOpen, onClose, onUpdate }) => {
    const [view, setView] = useState<'LIST' | 'CREATE' | 'STUDENTS'>('LIST');
    const [clases, setClases] = useState<any[]>([]);
    const [materiasCatalogo, setMateriasCatalogo] = useState<MateriaCatalogo[]>([]);
    const [saving, setSaving] = useState(false);
    const [selectedClase, setSelectedClase] = useState<any>(null);

    // Formulario Nueva Clase
    const [newClase, setNewClase] = useState({
        materia_catalogo_id: 0,
        dia: 'Lunes',
        hora_inicio: '07:00',
        hora_fin: '09:00',
        paralelo: 'A',
        ciclo: ''
    });

    const [searchMateria, setSearchMateria] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && docente) {
            loadClases();
            loadMaterias();
            setView('LIST');
        }
    }, [isOpen, docente]);

    const loadClases = async () => {
        try {
            // Reutilizamos getMiDistribucion filtrando por docente si es posible, 
            // pero para carga docente manual lo mejor es un endpoint específico o filtrar el total.
            await distribucionService.getMiDistribucion(); // Esto trae lo del usuario logueado.
            // Para ver la carga de OTRO docente siendo director, necesitamos que getMiDistribucion acepte docente_id o similar.
            // Como implementamos getDocentesCarga, podríamos usar eso para el resumen, pero para el detalle 
            // buscaremos todas las clases donde el docente_id coincida.
            const allClasesRes = await distribucionService.getClasesDistribucion();
            if (allClasesRes.success) {
                const docenteClases = allClasesRes.clases.filter((c: any) => c.docente === docente.nombre);
                setClases(docenteClases);
            }
        } catch (err) {
            console.error('Error al cargar clases:', err);
        }
    };

    const loadMaterias = async () => {
        try {
            const res = await materiaCatalogoService.getMaterias({ search: searchMateria });
            if (res.success) {
                setMateriasCatalogo(res.materias);
            }
        } catch (err) {
            console.error('Error al cargar catálogo:', err);
        }
    };

    const handleCreateClase = async () => {
        try {
            setSaving(true);
            setError(null);
            const res = await gestionAcademicaService.createClase({
                ...newClase,
                docente_id: docente.id,
                num_estudiantes: 0
            });
            if (res.success) {
                await loadClases();
                setView('LIST');
                onUpdate();
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al crear la clase');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClase = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta clase? Se perderán las inscripciones de alumnos.')) return;
        try {
            const res = await gestionAcademicaService.deleteClase(id);
            if (res.success) {
                loadClases();
                onUpdate();
            }
        } catch (err) {
            alert('Error al eliminar clase');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-background w-full max-w-4xl max-h-[90vh] rounded-[40px] border border-border shadow-2xl overflow-hidden flex flex-col animate-scale-in">

                {/* Header */}
                <div className="p-8 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {view !== 'LIST' && (
                            <button onClick={() => setView('LIST')} className="size-10 rounded-2xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                                <FaArrowLeft />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                                {view === 'LIST' ? 'Gestión de Carga Académica' : view === 'CREATE' ? 'Asignar Nueva Materia' : 'Gestión de Estudiantes'}
                            </h2>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                {docente.nombre} • {docente.tipo}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-10 rounded-2xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {view === 'LIST' && (
                        <div className="space-y-6">
                            {/* Resumen Horas */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-6 bg-primary/5 rounded-[30px] border border-primary/10">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Horas Semanales</p>
                                    <h3 className="text-3xl font-black text-primary">{clases.length * 2}h <span className="text-sm font-bold opacity-60">est.</span></h3>
                                </div>
                                <div className="p-6 bg-emerald-50 rounded-[30px] border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Materias Asignadas</p>
                                    <h3 className="text-3xl font-black text-emerald-600">{clases.length}</h3>
                                </div>
                                <button
                                    onClick={() => setView('CREATE')}
                                    className="p-6 bg-background rounded-[30px] border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group flex flex-col items-center justify-center text-center"
                                >
                                    <FaPlus className="text-primary mb-2 group-hover:scale-125 transition-transform" />
                                    <p className="text-[10px] font-black text-foreground uppercase tracking-widest">Asignar Materia</p>
                                </button>
                            </div>

                            {/* Tabla de Clases */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-4">Horario Detallado</h4>
                                {clases.length === 0 ? (
                                    <div className="p-12 text-center bg-muted/20 rounded-[30px] border border-dashed border-border">
                                        <p className="text-sm font-bold text-muted-foreground">No hay materias asignadas manualmente.</p>
                                    </div>
                                ) : (
                                    clases.map((clase) => (
                                        <div key={clase.id} className="p-5 bg-background rounded-[30px] border border-border hover:shadow-xl transition-all group flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="size-14 rounded-2xl bg-muted/50 flex flex-col items-center justify-center text-center">
                                                    <span className="text-[10px] font-black text-primary uppercase leading-tight">{clase.dia.substring(0, 3)}</span>
                                                    <span className="text-xs font-black text-foreground">{clase.hora_inicio.split(':')[0]}h</span>
                                                </div>
                                                <div>
                                                    <h5 className="font-black text-foreground text-sm leading-tight">{clase.materia}</h5>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-black text-muted-foreground uppercase">{clase.ciclo} • Paralelo {clase.paralelo}</span>
                                                        <span className="size-1 rounded-full bg-border" />
                                                        <span className="text-[10px] font-black text-primary uppercase flex items-center gap-1">
                                                            <FaUsers size={10} /> {clase.num_estudiantes || 0} Estudiantes
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => { setSelectedClase(clase); setView('STUDENTS'); }}
                                                    className="size-10 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center"
                                                    title="Gestionar Estudiantes"
                                                >
                                                    <FaUsers />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClase(clase.id)}
                                                    className="size-10 rounded-2xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                                                    title="Eliminar Asignación"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {view === 'CREATE' && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">1. Seleccionar Materia del Catálogo</label>
                                <div className="relative">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Buscar materia (ej: Programación, Cálculo...)"
                                        value={searchMateria}
                                        onChange={(e) => setSearchMateria(e.target.value)}
                                        onKeyUp={(e) => e.key === 'Enter' && loadMaterias()}
                                        className="w-full h-14 pl-12 pr-4 bg-muted/30 border border-border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                    {materiasCatalogo.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setNewClase({ ...newClase, materia_catalogo_id: m.id, ciclo: m.ciclo?.toString() || '' })}
                                            className={`p-4 text-left rounded-2xl border transition-all flex items-center justify-between ${newClase.materia_catalogo_id === m.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-background border-border hover:border-primary/40'}`}
                                        >
                                            <div>
                                                <p className="text-xs font-black text-foreground">{m.nombre}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{m.codigo} • {m.ciclo}º Ciclo</p>
                                            </div>
                                            {newClase.materia_catalogo_id === m.id && <FaCheckCircle className="text-primary" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">2. Período y Grupo</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[9px] font-black text-muted-foreground uppercase ml-1 mb-1.5">Ciclo</p>
                                            <input
                                                type="text"
                                                value={newClase.ciclo}
                                                onChange={e => setNewClase({ ...newClase, ciclo: e.target.value })}
                                                className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 text-xs font-bold outline-none"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-muted-foreground uppercase ml-1 mb-1.5">Paralelo</p>
                                            <input
                                                type="text"
                                                value={newClase.paralelo}
                                                onChange={e => setNewClase({ ...newClase, paralelo: e.target.value })}
                                                className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 text-xs font-bold outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">3. Horario Semanal</label>
                                    <div className="space-y-3">
                                        <select
                                            value={newClase.dia}
                                            onChange={e => setNewClase({ ...newClase, dia: e.target.value })}
                                            className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 text-xs font-bold outline-none"
                                        >
                                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="time" value={newClase.hora_inicio} onChange={e => setNewClase({ ...newClase, hora_inicio: e.target.value })} className="h-12 bg-muted/30 border border-border rounded-xl px-4 text-xs font-bold outline-none" />
                                            <input type="time" value={newClase.hora_fin} onChange={e => setNewClase({ ...newClase, hora_fin: e.target.value })} className="h-12 bg-muted/30 border border-border rounded-xl px-4 text-xs font-bold outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                                    <FaExclamationTriangle />
                                    <p className="text-xs font-bold">{error}</p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-border flex gap-4">
                                <Button variant="outline" fullWidth onClick={() => setView('LIST')}>Cancelar</Button>
                                <Button
                                    variant="primary"
                                    fullWidth
                                    loading={saving}
                                    disabled={!newClase.materia_catalogo_id}
                                    onClick={handleCreateClase}
                                >
                                    Confirmar Asignación
                                </Button>
                            </div>
                        </div>
                    )}

                    {view === 'STUDENTS' && selectedClase && (
                        <div className="space-y-6">
                            <div className="p-6 bg-primary/5 rounded-[30px] border border-primary/10 flex items-center justify-between">
                                <div>
                                    <h4 className="font-black text-foreground">{selectedClase.materia}</h4>
                                    <p className="text-xs font-bold text-muted-foreground">{selectedClase.dia} {selectedClase.hora_inicio} - {selectedClase.hora_fin}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Inscritos</p>
                                    <p className="text-2xl font-black text-primary">{selectedClase.num_estudiantes || 0}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Lista de Estudiantes Actuales */}
                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Lista de Alumnos</h5>
                                    <div className="bg-background border border-border rounded-[30px] h-[400px] overflow-hidden flex flex-col">
                                        <div className="p-4 border-b border-border bg-muted/20">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Sin conexión al servidor para este módulo todavía</p>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center opacity-50">
                                            <FaUsers size={40} className="mb-4 text-muted-foreground" />
                                            <p className="text-sm font-bold text-muted-foreground">Implementando visor de alumnos...</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones Masivas */}
                                <div className="space-y-6">
                                    <div className="p-6 bg-emerald-50 rounded-[30px] border border-emerald-100 space-y-4">
                                        <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Inscripción por Bloque</h5>
                                        <p className="text-xs font-bold text-emerald-600/80">
                                            Inscribir a todos los estudiantes de <strong>{selectedClase.ciclo}</strong> que pertenecen a esta carrera.
                                        </p>
                                        <Button
                                            variant="primary"
                                            fullWidth
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                            onClick={async () => {
                                                if (!confirm(`¿Inscribir a todos los alumnos de ${selectedClase.ciclo} a esta clase?`)) return;
                                                try {
                                                    const res = await gestionAcademicaService.inscribirNivelCompleto(selectedClase.id, selectedClase.ciclo);
                                                    if (res.success) {
                                                        alert(res.mensaje);
                                                        loadClases();
                                                    }
                                                } catch (err) {
                                                    alert('Error en inscripción masiva');
                                                }
                                            }}
                                        >
                                            Inscribir Bloque {selectedClase.ciclo}
                                        </Button>
                                    </div>

                                    <div className="p-6 bg-muted/30 rounded-[30px] border border-border space-y-4">
                                        <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Búsqueda Individual</h5>
                                        <div className="relative">
                                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                                            <input
                                                type="text"
                                                placeholder="Cédula del estudiante..."
                                                className="w-full h-12 pl-12 pr-4 bg-background border border-border rounded-xl text-xs font-bold outline-none"
                                            />
                                        </div>
                                        <Button variant="outline" fullWidth disabled>Buscar Estudiante</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocenteCargaModal;
