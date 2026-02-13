import { useState, useEffect, useMemo } from 'react';
import { FaSearch, FaEdit, FaWhatsapp, FaKey, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { docenteService, Docente } from '../services/api';

interface DocenteTableProps {
    carreraId: number;
}

export default function DocenteTable({ carreraId }: DocenteTableProps) {
    const [docentes, setDocentes] = useState<Docente[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [accFilter, setAccFilter] = useState('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        telefono: '',
        titulo_pregrado: '',
        titulo_posgrado: '',
        tipo: 'Tiempo Completo'
    });
    const [saving, setSaving] = useState(false);

    // Credential Generation State
    const [generando, setGenerando] = useState(false);

    useEffect(() => {
        loadDocentes();
    }, [carreraId]);

    const loadDocentes = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (carreraId && carreraId > 0) {
                params.carrera_id = carreraId;
            }
            const response = await docenteService.getDocentes(params);
            setDocentes(response.docentes || []);
        } catch (err: any) {
            console.error('Error cargando docentes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    const filteredDocentes = useMemo(() => {
        return docentes.filter(d => {
            const matchesSearch = d.nombre.toLowerCase().includes(search.toLowerCase()) ||
                (d.email && d.email.toLowerCase().includes(search.toLowerCase())) ||
                (d.carga?.materias && d.carga.materias.toLowerCase().includes(search.toLowerCase()));

            if (!matchesSearch) return false;

            if (accFilter === 'with_account') return !!d.usuario_id;
            if (accFilter === 'no_account') return !d.usuario_id;
            if (accFilter === 'active') return d.usuario?.last_login;

            return true;
        });
    }, [docentes, search, accFilter]);

    const handleOpenModal = (docente?: Docente) => {
        if (docente) {
            setEditingDocente(docente);
            setFormData({
                nombre: docente.nombre,
                email: docente.email || '',
                telefono: docente.telefono || '',
                titulo_pregrado: docente.titulo_pregrado || '',
                titulo_posgrado: docente.titulo_posgrado || '',
                tipo: docente.tipo || 'Tiempo Completo'
            });
        } else {
            setEditingDocente(null);
            setFormData({
                nombre: '',
                email: '',
                telefono: '',
                titulo_pregrado: '',
                titulo_posgrado: '',
                tipo: 'Tiempo Completo'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingDocente) {
                const res = await docenteService.updateDocente(editingDocente.id, formData);
                if (res.success) {
                    setIsModalOpen(false);
                    loadDocentes();
                }
            } else {
                alert('La creación manual de docentes no está habilitada. Se cargan automáticamente desde el Excel de planificación.');
            }
        } catch (err: any) {
            console.error('Error guardando docente:', err);
            alert(err.response?.data?.error || 'Error al guardar docente');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerarCredenciales = async () => {
        if (!confirm('¿Estás seguro de generar credenciales para todos los docentes de esta carrera que aún no tienen cuenta? Se les enviará un mensaje por WhatsApp si tienen teléfono registrado.')) return;

        try {
            setGenerando(true);
            const res = await docenteService.generarCredenciales(carreraId > 0 ? carreraId : undefined);
            if (res.success) {
                alert(res.mensaje);
                loadDocentes();
            }
        } catch (error) {
            console.error('Error generando credenciales:', error);
            alert('Error al procesar la solicitud');
        } finally {
            setGenerando(false);
        }
    };

    const getAccesoStatus = (d: Docente) => {
        if (!d.usuario_id) return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">
                <FaExclamationCircle size={8} /> Sin Cuenta
            </span>
        );
        if (d.usuario?.requiere_cambio_password) return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-200">
                <FaKey size={8} /> Por Activar
            </span>
        );
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700 border border-green-200">
                <FaCheckCircle size={8} /> Activo
            </span>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header y Acciones */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                        <span className="material-symbols-outlined text-2xl">school</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Plantilla Docente</h2>
                        <p className="text-sm font-medium text-muted-foreground">Gestión de identidades académicas y accesos.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <button
                        onClick={handleGenerarCredenciales}
                        disabled={generando}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {generando ? (
                            <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <FaKey />
                        )}
                        Generar Credenciales Masivo
                    </button>
                    <button
                        onClick={loadDocentes}
                        className="p-3 bg-muted rounded-2xl text-muted-foreground hover:text-primary transition-all active:rotate-180 duration-500"
                        title="Refrescar lista"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                    </button>
                </div>
            </div>

            {/* Filtros y Búsqueda */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative group">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, materia o email..."
                        value={search}
                        onChange={handleSearch}
                        className="w-full pl-12 pr-4 py-3.5 bg-card dark:bg-slate-900 border border-border rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-sm"
                    />
                </div>
                <select
                    value={accFilter}
                    onChange={(e) => setAccFilter(e.target.value)}
                    className="px-4 py-3.5 bg-card dark:bg-slate-900 border border-border rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-xs uppercase tracking-widest cursor-pointer"
                >
                    <option value="all">Todos los Accesos</option>
                    <option value="no_account">Sin Cuenta Creada</option>
                    <option value="with_account">Con Cuenta</option>
                    <option value="active">Sesión Iniciada recientemente</option>
                </select>
            </div>

            {/* Tabla */}
            <div className="bg-card dark:bg-slate-900 border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4">
                        <div className="size-10 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Sincronizando plantilla...</p>
                    </div>
                ) : filteredDocentes.length === 0 ? (
                    <div className="py-24 text-center">
                        <div className="size-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-border/50">
                            <span className="material-symbols-outlined text-4xl text-muted-foreground/30">search_off</span>
                        </div>
                        <p className="text-lg font-black text-foreground">No encontramos docentes</p>
                        <p className="text-sm text-muted-foreground font-medium">No hay registros que coincidan con los filtros actuales.</p>
                        <Button variant="ghost" className="mt-6" onClick={() => { setSearch(''); setAccFilter('all'); }}>Limpiar búsqueda</Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border">
                                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Información Docente</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Título / Dedicación</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Acceso</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Carga Académica</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredDocentes.map((docente) => (
                                    <tr key={docente.id} className="hover:bg-muted/10 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary flex items-center justify-center font-black text-lg border border-primary/10 shadow-sm">
                                                    {docente.nombre[0]}
                                                </div>
                                                <div className="max-w-[180px]">
                                                    <p className="font-black text-foreground leading-none mb-1.5 truncate group-hover:text-primary transition-colors">{docente.nombre}</p>
                                                    <div className="flex flex-col gap-1">
                                                        <p className="text-[11px] text-muted-foreground font-bold truncate flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[14px]">mail</span>
                                                            {docente.email || 'Sin correo institucional'}
                                                        </p>
                                                        {docente.telefono && (
                                                            <p className="text-[11px] text-green-600 font-black flex items-center gap-1.5">
                                                                <FaWhatsapp size={10} />
                                                                {docente.telefono}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-foreground line-clamp-1 max-w-[150px]">
                                                    {docente.titulo_posgrado || docente.titulo_pregrado || 'Sin título'}
                                                </p>
                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${docente.tipo?.includes('Completo')
                                                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                    : 'bg-orange-50 text-orange-600 border border-orange-100'
                                                    }`}>
                                                    {docente.tipo}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                {getAccesoStatus(docente)}
                                                {docente.usuario?.last_login && (
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">
                                                        Uso: {new Date(docente.usuario.last_login).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 border-x border-border/5">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                                                    <span className="text-lg font-black text-foreground">{docente.carga?.total_horas || 0}</span>
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase">Horas</span>
                                                </div>
                                                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest text-center opacity-70">
                                                    {docente.carga?.total_clases || 0} CLASES CARGADAS
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {docente.telefono && (
                                                    <button
                                                        onClick={() => window.open(`https://wa.me/${docente.telefono}`, '_blank')}
                                                        className="size-9 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-green-100"
                                                        title="Contactar WhatsApp"
                                                    >
                                                        <FaWhatsapp />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleOpenModal(docente)}
                                                    className="size-9 rounded-xl bg-muted text-muted-foreground hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm border border-border"
                                                    title="Editar información"
                                                >
                                                    <FaEdit />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Editar */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Perfil del Docente"
                size="lg"
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-3xl border border-border mb-6">
                        <div className="size-16 rounded-3xl bg-primary text-white flex items-center justify-center font-black text-3xl shadow-xl">
                            {formData.nombre[0] || '?'}
                        </div>
                        <div>
                            <h4 className="font-black text-lg text-foreground">Edición de Datos</h4>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sincronización manual de identidad</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nombre Completo</label>
                            <input
                                required
                                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email Institucional</label>
                            <input
                                type="email"
                                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Teléfono (WhatsApp)</label>
                            <input
                                placeholder="Ej: 593987654321"
                                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.telefono}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tipo de Dedicación</label>
                            <select
                                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                                value={formData.tipo}
                                onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                            >
                                <option value="Tiempo Completo">Tiempo Completo</option>
                                <option value="Tiempo Parcial">Tiempo Parcial</option>
                                <option value="Medio Tiempo">Medio Tiempo</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Título Pregrado</label>
                            <input
                                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.titulo_pregrado}
                                onChange={e => setFormData({ ...formData, titulo_pregrado: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Títulos Posgrado</label>
                            <textarea
                                rows={2}
                                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                value={formData.titulo_posgrado}
                                onChange={e => setFormData({ ...formData, titulo_posgrado: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border">
                        <Button type="button" variant="ghost" className="rounded-2xl" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary" className="rounded-2xl px-8" loading={saving}>
                            Guardar Cambios
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
