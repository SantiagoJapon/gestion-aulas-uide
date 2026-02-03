import { useState, useEffect } from 'react';
import { usuarioService, User } from '../services/api';
import { DirectorModal } from './DirectorModal';

interface DirectorManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DirectorManagementModal({ isOpen, onClose }: DirectorManagementModalProps) {
    const [directores, setDirectores] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // CRUD Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [directorToEdit, setDirectorToEdit] = useState<User | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadDirectores();
        }
    }, [isOpen]);

    const loadDirectores = async () => {
        try {
            setLoading(true);
            const res = await usuarioService.getDirectores();
            setDirectores(res.usuarios || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este director? Esta acción no se puede deshacer.')) return;
        try {
            await usuarioService.deleteDirector(id);
            loadDirectores();
        } catch (error) {
            console.error(error);
            alert('Error al eliminar director');
        }
    };

    const handleEdit = (user: User) => {
        setDirectorToEdit(user);
        setIsEditModalOpen(true);
    };

    const handleCreate = () => {
        setDirectorToEdit(null);
        setIsEditModalOpen(true);
    };

    const handleSuccess = () => {
        loadDirectores();
    };

    const filteredDirectors = directores.filter(d =>
        (d.nombre + ' ' + d.apellido).toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Gestionar Directores</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Administra el personal directivo de la institución</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 bg-uide-blue text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:brightness-110 transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Nuevo Director
                        </button>
                        <button
                            onClick={onClose}
                            className="size-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 bg-white dark:bg-slate-900 sticky top-0">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-uide-blue/20 outline-none transition-all"
                            placeholder="Buscar por nombre o email..."
                        />
                    </div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Total: {filteredDirectors.length}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full size-8 border-b-2 border-uide-blue"></div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredDirectors.map(director => (
                                <div key={director.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-uide-blue/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-sm">
                                            {director.nombre[0]}{director.apellido[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">{director.nombre} {director.apellido}</h4>
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">mail</span>
                                                    {director.email}
                                                </span>
                                                {director.telefono && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">call</span>
                                                        {director.telefono}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(director)}
                                            className="p-2 text-slate-400 hover:text-uide-blue hover:bg-uide-blue/5 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(director.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredDirectors.length === 0 && (
                                <div className="text-center py-20 text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">person_off</span>
                                    <p>No se encontraron directores</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <DirectorModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={handleSuccess}
                directorToEdit={directorToEdit}
            />
        </div>
    );
}
