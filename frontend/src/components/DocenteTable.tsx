import { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaUserTie, FaTrash } from 'react-icons/fa';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { usuarioService, User } from '../services/api';

interface DocenteTableProps {
    carreraId: number;
    carreraNombre?: string;
}

export default function DocenteTable({ carreraId, carreraNombre }: DocenteTableProps) {
    const [docentes, setDocentes] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDocente, setEditingDocente] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        cedula: '',
        telefono: '',
        password: '' // Solo para creación
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (carreraId) {
            loadDocentes();
        }
    }, [carreraId]);

    const loadDocentes = async () => {
        try {
            setLoading(true);
            const response = await usuarioService.getUsuarios({
                rol: 'profesor',
                carrera_id: carreraId
            });
            setDocentes(response.usuarios || []);
        } catch (err: any) {
            console.error('Error cargando docentes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    const filteredDocentes = docentes.filter(d =>
        d.nombre.toLowerCase().includes(search.toLowerCase()) ||
        d.apellido.toLowerCase().includes(search.toLowerCase()) ||
        d.email.toLowerCase().includes(search.toLowerCase()) ||
        (d.cedula && d.cedula.includes(search))
    );

    const handleOpenModal = (docente?: User) => {
        if (docente) {
            setEditingDocente(docente);
            setFormData({
                nombre: docente.nombre,
                apellido: docente.apellido,
                email: docente.email,
                cedula: docente.cedula || '',
                telefono: docente.telefono || '',
                password: ''
            });
        } else {
            setEditingDocente(null);
            setFormData({
                nombre: '',
                apellido: '',
                email: '',
                cedula: '',
                telefono: '',
                password: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: any = {
                ...formData,
                rol: 'profesor',
                carrera_director: carreraNombre // Vincular a esta carrera
            };

            if (editingDocente) {
                // Actualizar
                await usuarioService.updateUsuario(editingDocente.id, payload);
                setIsModalOpen(false);
                loadDocentes();
            } else {
                // Crear
                if (!payload.password) {
                    payload.password = payload.cedula || 'uide123';
                }
                await usuarioService.createUsuario(payload);
                setIsModalOpen(false);
                loadDocentes();
            }
        } catch (err: any) {
            console.error('Error guardando docente:', err);
            alert(err.response?.data?.error || 'Error al guardar docente');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este docente?')) return;
        try {
            await usuarioService.deleteUsuario(id);
            loadDocentes();
        } catch (err: any) {
            console.error('Error borrando docente:', err);
            alert('Error al eliminar docente');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header y Acciones */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-2xl">school</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Plantilla Docente</h2>
                        <p className="text-sm text-muted-foreground">Gestión de profesores asignados a la carrera.</p>
                    </div>
                </div>
                <Button onClick={() => handleOpenModal()} variant="primary" icon={FaPlus}>
                    Nuevo Docente
                </Button>
            </div>

            {/* Buscador */}
            <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, cédula o correo..."
                    value={search}
                    onChange={handleSearch}
                    className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
            </div>

            {/* Tabla */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Cargando docentes...</div>
                ) : filteredDocentes.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        <FaUserTie className="text-4xl mx-auto mb-3 opacity-20" />
                        <p>No se encontraron docentes registrados.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-xs uppercase font-bold text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-4">Docente</th>
                                    <th className="px-6 py-4">Contacto</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredDocentes.map((docente) => (
                                    <tr key={docente.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                                    {docente.nombre[0]}{docente.apellido[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">{docente.nombre} {docente.apellido}</p>
                                                    <p className="text-xs text-muted-foreground">{docente.cedula || 'S/N'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-foreground">{docente.email}</p>
                                            <p className="text-xs text-muted-foreground">{docente.telefono || '—'}</p>
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${docente.estado === 'activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {docente.estado === 'activo' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleOpenModal(docente)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                                                    <FaEdit />
                                                </button>
                                                <button onClick={() => handleDelete(docente.id)} className="p-2 text-muted-foreground hover:text-red-500 transition-colors">
                                                    <FaTrash />
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

            {/* Modal Crear/Editar */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingDocente ? 'Editar Docente' : 'Nuevo Docente'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Nombres</label>
                            <input
                                required
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Apellidos</label>
                            <input
                                required
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                                value={formData.apellido}
                                onChange={e => setFormData({ ...formData, apellido: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Email Institucional</label>
                        <input
                            required
                            type="email"
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Cédula</label>
                            <input
                                required
                                maxLength={10}
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                                value={formData.cedula}
                                onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Teléfono</label>
                            <input
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                                value={formData.telefono}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            />
                        </div>
                    </div>

                    {!editingDocente && (
                        <div className="p-3 bg-yellow-50 text-yellow-700 text-xs rounded-lg border border-yellow-200">
                            <p>La contraseña predeterminada será el número de cédula o <span className="font-mono bg-yellow-100 px-1 rounded">uide123</span> si no se especifica.</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary" loading={saving}>
                            {editingDocente ? 'Guardar Cambios' : 'Crear Docente'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
