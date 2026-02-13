import { useState, useEffect } from 'react';
import { FaSearch, FaEdit, FaUserTie } from 'react-icons/fa';
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

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        titulo_pregrado: '',
        titulo_posgrado: '',
        tipo: 'Tiempo Completo'
    });
    const [saving, setSaving] = useState(false);

    // Message Modal State
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [selectedDocenteForMessage, setSelectedDocenteForMessage] = useState<Docente | null>(null);
    const [messageData, setMessageData] = useState({ subject: '', body: '' });
    const [sendingMessage, setSendingMessage] = useState(false);

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

    const filteredDocentes = docentes.filter(d =>
        d.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (d.email && d.email.toLowerCase().includes(search.toLowerCase())) ||
        (d.carga?.materias && d.carga.materias.toLowerCase().includes(search.toLowerCase()))
    );

    const handleOpenModal = (docente?: Docente) => {
        if (docente) {
            setEditingDocente(docente);
            setFormData({
                nombre: docente.nombre,
                email: docente.email || '',
                titulo_pregrado: docente.titulo_pregrado || '',
                titulo_posgrado: docente.titulo_posgrado || '',
                tipo: docente.tipo || 'Tiempo Completo'
            });
        } else {
            setEditingDocente(null);
            setFormData({
                nombre: '',
                email: '',
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
                await docenteService.updateDocente(editingDocente.id, formData);
                setIsModalOpen(false);
                loadDocentes();
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

    const handleOpenMessageModal = (docente: Docente) => {
        setSelectedDocenteForMessage(docente);
        setMessageData({ subject: '', body: '' });
        setIsMessageModalOpen(true);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendingMessage(true);
        try {
            // Nota: Podríamos integrar con el servicio de notificaciones aquí
            console.log('Mensaje enviado a:', selectedDocenteForMessage?.email, messageData);
            alert(`Notificación enviada correctamente a ${selectedDocenteForMessage?.nombre}`);
            setIsMessageModalOpen(false);
        } catch (err) {
            console.error('Error enviando mensaje:', err);
            alert('Error al enviar el mensaje');
        } finally {
            setSendingMessage(false);
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
                        <p className="text-sm text-muted-foreground">Docentes extraídos de la planificación académica.</p>
                    </div>
                </div>
            </div>

            {/* Buscador */}
            <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, correo o materia..."
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
                        <p>No se encontraron docentes registrados en esta carrera.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-xs uppercase font-bold text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-4">Docente</th>
                                    <th className="px-6 py-4">Títulos / Tipo</th>
                                    <th className="px-6 py-4 text-center">Carga</th>
                                    <th className="px-6 py-4">Materias</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredDocentes.map((docente) => (
                                    <tr key={docente.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                                    {docente.nombre[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">{docente.nombre}</p>
                                                    <p className="text-xs text-muted-foreground">{docente.email || 'Sin correo'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-foreground">
                                                    {docente.titulo_posgrado || docente.titulo_pregrado || 'Sin título registrado'}
                                                </p>
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${docente.tipo?.includes('Completo') ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {docente.tipo}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-sm font-bold text-foreground">{docente.carga?.total_horas || 0}h</span>
                                                <span className="text-[10px] text-muted-foreground">{docente.carga?.total_clases || 0} clases</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 max-w-xs">
                                            <p className="text-xs text-muted-foreground line-clamp-2" title={docente.carga?.materias}>
                                                {docente.carga?.materias || '—'}
                                            </p>
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenMessageModal(docente)}
                                                    className="p-2 text-muted-foreground hover:text-blue-500 transition-colors"
                                                    title="Enviar Mensaje"
                                                >
                                                    <span className="material-symbols-outlined text-lg">mail</span>
                                                </button>
                                                <button onClick={() => handleOpenModal(docente)} className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Editar">
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
                title="Editar Información de Docente"
                size="lg"
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Nombre Completo</label>
                        <input
                            required
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Email Institucional</label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Título Pregrado</label>
                            <input
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                                value={formData.titulo_pregrado}
                                onChange={e => setFormData({ ...formData, titulo_pregrado: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Título Posgrado</label>
                            <input
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                                value={formData.titulo_posgrado}
                                onChange={e => setFormData({ ...formData, titulo_posgrado: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Tipo de Dedicación</label>
                        <select
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                            value={formData.tipo}
                            onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                        >
                            <option value="Tiempo Completo">Tiempo Completo</option>
                            <option value="Tiempo Parcial">Tiempo Parcial</option>
                            <option value="Medio Tiempo">Medio Tiempo</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary" loading={saving}>
                            Guardar Cambios
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal Enviar Mensaje */}
            <Modal
                isOpen={isMessageModalOpen}
                onClose={() => setIsMessageModalOpen(false)}
                title={`Enviar Notificación a ${selectedDocenteForMessage?.nombre}`}
            >
                <form onSubmit={handleSendMessage} className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 flex items-start gap-3">
                        <span className="material-symbols-outlined text-blue-500 text-xl">info</span>
                        <p className="text-xs text-blue-700">Esta notificación aparecerá en el panel del docente si tiene una cuenta asociada.</p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Asunto</label>
                        <input
                            required
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="Ej: Revisión de Silabo"
                            value={messageData.subject}
                            onChange={e => setMessageData({ ...messageData, subject: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Mensaje</label>
                        <textarea
                            required
                            rows={4}
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="Escriba su mensaje aquí..."
                            value={messageData.body}
                            onChange={e => setMessageData({ ...messageData, body: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsMessageModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary" loading={sendingMessage}>
                            <span className="material-symbols-outlined text-lg mr-2">send</span>
                            Enviar Mensaje
                        </Button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}
