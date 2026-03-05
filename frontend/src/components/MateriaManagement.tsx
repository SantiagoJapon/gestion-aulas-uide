import React, { useState, useEffect } from 'react';
import { materiaCatalogoService, MateriaCatalogo, docenteService, Docente } from '../services/api';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaBookOpen } from 'react-icons/fa';

interface MateriaManagementProps {
    carreraId: number;
}

export default function MateriaManagement({ carreraId }: MateriaManagementProps) {
    const [materias, setMaterias] = useState<MateriaCatalogo[]>([]);
    const [docentes, setDocentes] = useState<Docente[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMateria, setEditingMateria] = useState<MateriaCatalogo | null>(null);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const [formData, setFormData] = useState({
        codigo: '',
        nombre: '',
        creditos: 2,
        ciclo: 1,
        carrera_id: carreraId,
        docente_id: '' as string | number,
        docente_nombre: ''
    });

    useEffect(() => {
        loadMaterias();
    }, [carreraId, search]);

    const loadMaterias = async () => {
        try {
            setLoading(true);
            const [res, docRes] = await Promise.all([
                materiaCatalogoService.getMaterias({ carrera_id: carreraId, search }),
                docenteService.getDocentes({ carrera_id: carreraId })
            ]);
            if (res.success) {
                setMaterias(res.materias);
            }
            if (docRes.success) {
                setDocentes(docRes.docentes);
            }
        } catch (err) {
            console.error('Error al cargar materias:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (materia?: MateriaCatalogo) => {
        if (materia) {
            setEditingMateria(materia);
            setFormData({
                codigo: materia.codigo,
                nombre: materia.nombre,
                creditos: materia.creditos,
                ciclo: materia.ciclo,
                carrera_id: materia.carrera_id,
                docente_id: materia.docente_id || '',
                docente_nombre: materia.docente_nombre || ''
            });
        } else {
            setEditingMateria(null);
            setFormData({
                codigo: '',
                nombre: '',
                creditos: 2,
                ciclo: 1,
                carrera_id: carreraId,
                docente_id: '',
                docente_nombre: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            if (editingMateria) {
                const res = await materiaCatalogoService.updateMateria(editingMateria.id, formData);
                if (res.success) {
                    await loadMaterias();
                    setIsModalOpen(false);
                }
            } else {
                const res = await materiaCatalogoService.createMateria(formData);
                if (res.success) {
                    await loadMaterias();
                    setIsModalOpen(false);
                }
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Error al guardar materia');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta materia del catálogo? Las clases existentes no se borrarán pero no se podrán crear nuevas con este código.')) return;
        try {
            const res = await materiaCatalogoService.deleteMateria(id);
            if (res.success) {
                loadMaterias();
            }
        } catch (err) {
            alert('Error al eliminar materia');
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            const res = await materiaCatalogoService.syncCatalogo(carreraId);
            if (res.success) {
                alert(res.mensaje);
                loadMaterias();
            }
        } catch (err) {
            alert('Error al sincronizar materias');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        className="w-full h-12 pl-12 pr-4 bg-muted/30 border border-border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button
                        variant="secondary"
                        onClick={handleSync}
                        loading={syncing}
                        className="rounded-2xl h-12 px-6 bg-white border-primary/20 text-primary hover:bg-primary/5"
                    >
                        <span className="material-symbols-outlined text-base mr-2">sync</span>
                        Sincronizar
                    </Button>
                    <Button onClick={() => handleOpenModal()} className="rounded-2xl h-12 px-6 flex-1 md:flex-none">
                        <FaPlus className="mr-2" /> Nueva Materia
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-[30px] border border-border" />
                    ))
                ) : materias.length > 0 ? (
                    materias.map(m => (
                        <div key={m.id} className="p-6 bg-background rounded-[30px] border border-border hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <FaBookOpen size={60} />
                            </div>
                            <div className="relative z-10">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 block">
                                    {m.codigo}
                                </span>
                                <h3 className="font-black text-foreground text-lg leading-tight mb-3">
                                    {m.nombre}
                                </h3>
                                <div className="flex items-center gap-4">
                                    <div className="px-3 py-1 bg-muted/50 rounded-full">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                                            {m.ciclo}º Ciclo
                                        </p>
                                    </div>
                                    <div className="px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
                                        <p className="text-[9px] font-black uppercase text-primary tracking-widest">
                                            {m.creditos} Créditos
                                        </p>
                                    </div>
                                </div>
                                {m.docenteAsignado && (
                                    <div className="mt-4 flex items-center gap-2">
                                        <div className="size-6 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[10px] uppercase">
                                            {m.docenteAsignado.nombre.slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-foreground truncate max-w-[150px]">
                                                {m.docenteAsignado.nombre}
                                            </p>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                                                Docente Asignado
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(m)} className="size-9 rounded-xl bg-muted text-muted-foreground hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm border border-border">
                                        <FaEdit />
                                    </button>
                                    <button onClick={() => handleDelete(m.id)} className="size-9 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-red-100">
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-muted/10 rounded-[40px] border border-dashed border-border">
                        <FaBookOpen className="mx-auto text-4xl text-muted-foreground mb-4 opacity-20" />
                        <p className="text-sm font-bold text-muted-foreground">No hay materias registradas en el catálogo.</p>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingMateria ? 'Editar Materia' : 'Nueva Materia'}
            >
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Código</label>
                            <input
                                required
                                className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 text-xs font-bold"
                                value={formData.codigo}
                                onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                placeholder="Ejem: SO-402"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nombre</label>
                            <input
                                required
                                className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 text-xs font-bold"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Nombre de la materia"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Ciclo</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="10"
                                className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 text-xs font-bold"
                                value={formData.ciclo}
                                onChange={e => setFormData({ ...formData, ciclo: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Créditos</label>
                            <input
                                type="number"
                                required
                                min="1"
                                className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 text-xs font-bold"
                                value={formData.creditos}
                                onChange={e => setFormData({ ...formData, creditos: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Docente Asignado</label>
                            <select
                                className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.docente_id}
                                onChange={e => {
                                    const id = e.target.value;
                                    const d = docentes.find(doc => doc.id.toString() === id);
                                    setFormData({
                                        ...formData,
                                        docente_id: id ? parseInt(id) : '',
                                        docente_nombre: d ? `${d.nombre} ${d.apellido}` : ''
                                    });
                                }}
                            >
                                <option value="">Sin Asignar</option>
                                {docentes.map(d => (
                                    <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-border">
                        <Button type="button" variant="ghost" className="rounded-2xl" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary" className="rounded-2xl px-8" loading={saving}>
                            {editingMateria ? 'Guardar Cambios' : 'Crear Materia'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
