import React, { useState, useEffect } from 'react';
import { distribucionService } from '../services/api';
import { Button } from './common/Button';

interface ClaseEditModalProps {
    clase: any;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

const ClaseEditModal: React.FC<ClaseEditModalProps> = ({ clase, isOpen, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        materia: '',
        dia: '',
        hora_inicio: '',
        hora_fin: '',
        docente: '',
        aula_asignada: '',
        num_estudiantes: 0
    });
    const [aulasSugeridas, setAulasSugeridas] = useState<any[]>([]);
    const [loadingAulas, setLoadingAulas] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (clase) {
            setFormData({
                materia: clase.materia || '',
                dia: clase.dia || '',
                hora_inicio: clase.hora_inicio || '',
                hora_fin: clase.hora_fin || '',
                docente: clase.docente || '',
                aula_asignada: clase.aula_asignada || '',
                num_estudiantes: clase.num_estudiantes || 0
            });
        }
    }, [clase]);

    useEffect(() => {
        if (formData.dia && formData.hora_inicio && formData.hora_fin) {
            buscarAulasLibres();
        }
    }, [formData.dia, formData.hora_inicio, formData.hora_fin]);

    const buscarAulasLibres = async () => {
        try {
            setLoadingAulas(true);
            const data = await distribucionService.getDisponibilidadAulas({
                dia: formData.dia,
                hora_inicio: formData.hora_inicio,
                hora_fin: formData.hora_fin,
                capacidad_minima: formData.num_estudiantes
            });
            setAulasSugeridas(data.aulas || []);
        } catch (err) {
            console.error('Error al buscar aulas:', err);
        } finally {
            setLoadingAulas(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            await distribucionService.updateClase(clase.id, formData);
            onUpdate();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al actualizar clase');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !clase) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-background w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">edit_square</span>
                            Editar Clase
                        </h2>
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">ID: {clase.id} • {clase.materia}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {clase.sobrecupo && (
                        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2">
                            <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">event_seat</span>
                            <div>
                                <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">Aula con sobrecupo</p>
                                <p className="text-[10px] text-amber-600/80 dark:text-amber-400/60 font-medium mt-0.5">
                                    {clase.num_estudiantes} estudiantes en aula de {clase.aula_capacidad} capacidad ({clase.porcentaje_uso}% de uso).
                                    Selecciona un aula alternativa de la lista de abajo.
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1.5 block">Materia</label>
                            <input
                                type="text"
                                value={formData.materia}
                                onChange={e => setFormData({ ...formData, materia: e.target.value })}
                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-muted-foreground uppercase mb-1.5 block">Día</label>
                                <select
                                    value={formData.dia}
                                    onChange={e => setFormData({ ...formData, dia: e.target.value })}
                                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                                >
                                    <option value="Lunes">Lunes</option>
                                    <option value="Martes">Martes</option>
                                    <option value="Miércoles">Miércoles</option>
                                    <option value="Jueves">Jueves</option>
                                    <option value="Viernes">Viernes</option>
                                    <option value="Sábado">Sábado</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-muted-foreground uppercase mb-1.5 block">Estudiantes</label>
                                <input
                                    type="number"
                                    value={formData.num_estudiantes}
                                    onChange={e => setFormData({ ...formData, num_estudiantes: parseInt(e.target.value) })}
                                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-muted-foreground uppercase mb-1.5 block">Inicio</label>
                                <input
                                    type="time"
                                    value={formData.hora_inicio}
                                    onChange={e => setFormData({ ...formData, hora_inicio: e.target.value })}
                                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-muted-foreground uppercase mb-1.5 block">Fin</label>
                                <input
                                    type="time"
                                    value={formData.hora_fin}
                                    onChange={e => setFormData({ ...formData, hora_fin: e.target.value })}
                                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                            <label className="text-[10px] font-black text-primary uppercase mb-2 block flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">room_preferences</span>
                                Asignación de Aula
                            </label>
                            <select
                                value={formData.aula_asignada}
                                onChange={e => setFormData({ ...formData, aula_asignada: e.target.value })}
                                className="w-full bg-background border border-primary/20 rounded-xl px-4 py-2.5 text-xs font-bold outline-none mb-3"
                            >
                                <option value="">Sin asignar</option>
                                {aulasSugeridas.map(aula => (
                                    <option key={aula.codigo} value={aula.codigo}>
                                        {aula.nombre} (Cap: {aula.capacidad})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[9px] text-primary/60 font-medium">
                                {loadingAulas ? 'Buscando aulas disponibles...' : `Se encontraron ${aulasSugeridas.length} aulas libres para este horario.`}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-border mt-4">
                        <Button variant="outline" fullWidth onClick={onClose}>Cancelar</Button>
                        <Button variant="primary" fullWidth loading={saving}>Guardar Cambios</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClaseEditModal;
