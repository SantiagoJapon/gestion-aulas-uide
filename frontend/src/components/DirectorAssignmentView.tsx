
import { useState, useEffect } from 'react';
import { distribucionService, usuarioService, User } from '../services/api';
import DirectorManagementModal from './DirectorManagementModal';

interface CarreraData {
    id: number;
    nombre_carrera: string;
    estado: string;
    director_nombre?: string | null;
    director_email?: string | null;
    porcentaje_completado?: number;
    total_clases?: number;
}

export default function DirectorAssignmentView() {
    const [carreras, setCarreras] = useState<CarreraData[]>([]);
    const [directores, setDirectores] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'All' | 'Assigned' | 'Vacant'>('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Drawer & Assignment State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedCarrera, setSelectedCarrera] = useState<CarreraData | null>(null);
    const [selectedDirectorId, setSelectedDirectorId] = useState<number | null>(null);
    const [assignSearchTerm, setAssignSearchTerm] = useState('');

    // Management Modal
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [isManagementModalOpen]); // Reload data when management modal closes/updates

    useEffect(() => {
        const handleRefresh = () => loadData();
        window.addEventListener('carrera-modified', handleRefresh);
        return () => window.removeEventListener('carrera-modified', handleRefresh);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [distribucionRes, directoresRes] = await Promise.all([
                distribucionService.getEstado(),
                usuarioService.getDirectores()
            ]);
            setCarreras(distribucionRes.carreras || []);
            setDirectores(directoresRes.usuarios || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const openAssignmentDrawer = (carrera: CarreraData) => {
        setSelectedCarrera(carrera);
        setSelectedDirectorId(null);
        setAssignSearchTerm('');
        setIsDrawerOpen(true);
    };

    const handleAssign = async () => {
        if (!selectedCarrera || !selectedDirectorId) return;
        try {
            await usuarioService.updateDirectorCarrera(selectedDirectorId, selectedCarrera.nombre_carrera);
            setIsDrawerOpen(false);
            loadData(); // Refresh data
        } catch (error) {
            console.error('Error assigning director:', error);
            alert('Error al asignar el director. Intente nuevamente.');
        }
    };

    // Helper to determine icon based on career name
    const getCareerIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('ingenier') || n.includes('sistemas') || n.includes('tic')) return 'memory';
        if (n.includes('medic') || n.includes('salud') || n.includes('psicolog')) return 'health_and_safety';
        if (n.includes('arquitect') || n.includes('diseño')) return 'architecture';
        if (n.includes('admin') || n.includes('negocio') || n.includes('marketing')) return 'payments';
        if (n.includes('derecho') || n.includes('leyes')) return 'gavel';
        if (n.includes('gastronom')) return 'restaurant';
        return 'school'; // default
    };

    // Helper to determining Faculty (Mocked logic)
    const getFacultyName = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('ingenier') || n.includes('tic')) return 'Facultad de Ingeniería';
        if (n.includes('medic') || n.includes('salud') || n.includes('nutricion')) return 'Facultad de Ciencias de la Salud';
        if (n.includes('arquitect')) return 'Facultad de Arquitectura';
        if (n.includes('admin') || n.includes('negocio') || n.includes('marketing')) return 'Business School';
        if (n.includes('derecho')) return 'Facultad de Jurisprudencia';
        if (n.includes('gastronom') || n.includes('turismo')) return 'Facultad de Hospitalidad';
        return 'UIDE General';
    };

    // Helper to get initials
    const getInitials = (name?: string | null) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    // Filter Logic
    const filteredCarreras = carreras.filter(c => {
        const matchesSearch = c.nombre_carrera.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.director_nombre && c.director_nombre.toLowerCase().includes(searchTerm.toLowerCase()));

        // Default mock faculties for filtering if we implemented "Departments" filter fully
        const matchesDept = true;

        const matchesStatus = filterStatus === 'All'
            ? true
            : filterStatus === 'Assigned'
                ? !!c.director_nombre
                : !c.director_nombre;

        return matchesSearch && matchesDept && matchesStatus;
    });

    // Available Directors for Drawer
    const filteredDirectors = directores.filter(d =>
        (d.nombre + ' ' + d.apellido).toLowerCase().includes(assignSearchTerm.toLowerCase()) ||
        d.email.toLowerCase().includes(assignSearchTerm.toLowerCase())
    );

    return (
        <div className="flex h-full flex-col relative overflow-hidden bg-transparent transition-colors duration-300">

            {isManagementModalOpen && (
                <DirectorManagementModal isOpen={isManagementModalOpen} onClose={() => setIsManagementModalOpen(false)} />
            )}

            {/* Toolbar simplificada - Sin encabezado redundante */}
            <div className="px-1 py-4 z-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
                        <button
                            onClick={() => setFilterStatus('All')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterStatus === 'All' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilterStatus('Assigned')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterStatus === 'Assigned' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                            Asignados
                        </button>
                        <button
                            onClick={() => setFilterStatus('Vacant')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterStatus === 'Vacant' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                            Vacantes
                        </button>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64 group">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                                placeholder="Buscar carrera..."
                                type="text"
                            />
                        </div>
                        <button
                            onClick={() => setIsManagementModalOpen(true)}
                            className="bg-primary text-white p-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                            title="Gestionar Base de Directores"
                        >
                            <span className="material-symbols-outlined text-[18px]">group</span>
                            <span className="hidden sm:inline">Gestionar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Grid Content - Ajustado para DashboardWidget */}
            <div className="flex-1 overflow-y-auto py-2 scroll-smooth">
                <div>
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-uide-blue"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            {filteredCarreras.map((carrera) => {
                                const icon = getCareerIcon(carrera.nombre_carrera);
                                const isVacant = !carrera.director_nombre;
                                // Determine colors based on icon/type conceptually
                                let iconColor = 'text-uide-blue bg-uide-blue/10';
                                if (icon === 'health_and_safety') iconColor = 'text-red-500 bg-red-500/10';
                                if (icon === 'architecture') iconColor = 'text-orange-500 bg-orange-500/10';
                                if (icon === 'payments') iconColor = 'text-purple-500 bg-purple-500/10';
                                if (icon === 'gavel') iconColor = 'text-slate-700 bg-slate-700/10';

                                return (
                                    <div
                                        key={carrera.id}
                                        className={`
                                    relative flex flex-col p-4 md:p-5 rounded-2xl transition-all duration-300 group
                                    ${isVacant
                                                ? 'bg-slate-50 dark:bg-slate-900/40 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-uide-blue/50 dark:hover:border-uide-blue/50'
                                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:translate-y-[-4px]'}
                                `}
                                    >
                                        <div className="flex justify-between items-start mb-4 md:mb-6">
                                            <div className={`size-10 md:size-12 rounded-xl flex items-center justify-center ${iconColor}`}>
                                                <span className="material-symbols-outlined text-[24px] md:text-[28px]">{icon}</span>
                                            </div>
                                            {isVacant ? (
                                                <span className="px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wide">
                                                    Vacante
                                                </span>
                                            ) : (
                                                <button className="size-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                                </button>
                                            )}
                                        </div>

                                        <h4 className="text-sm md:text-base font-bold mb-1 text-slate-900 dark:text-white line-clamp-2 md:h-12 group-hover:text-uide-blue transition-colors">
                                            {carrera.nombre_carrera}
                                        </h4>
                                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mb-4 md:mb-6 font-medium line-clamp-1">
                                            {getFacultyName(carrera.nombre_carrera)}
                                        </p>

                                        {isVacant ? (
                                            <button
                                                onClick={() => openAssignmentDrawer(carrera)}
                                                className="mt-auto w-full flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-bold hover:bg-uide-blue hover:text-white transition-all active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">person_add</span>
                                                Asignar Director
                                            </button>
                                        ) : (
                                            <div className="mt-auto flex items-center gap-3 p-2 md:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600/50 group-hover:bg-uide-blue/5 dark:group-hover:bg-uide-blue/10 transition-colors cursor-pointer min-w-0" onClick={() => openAssignmentDrawer(carrera)}>
                                                <div className="size-8 md:size-9 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300 border-2 border-white dark:border-slate-800 shrink-0">
                                                    {getInitials(carrera.director_nombre)}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <p className="text-[11px] md:text-xs font-bold text-slate-900 dark:text-white truncate">{carrera.director_nombre}</p>
                                                    <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{carrera.director_email}</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3 md:pt-4 mt-4 md:mt-6">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Clases</span>
                                                <span className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200">{carrera.total_clases || 0}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Progreso</span>
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-xs md:text-sm font-bold ${(carrera.porcentaje_completado || 0) === 100 ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {carrera.porcentaje_completado || 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Side Panel Drawer (Overlay) */}
            {isDrawerOpen && (
                <div className="absolute inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsDrawerOpen(false)}
                    ></div>

                    {/* Drawer Panel */}
                    <div className="relative w-full max-w-[400px] h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-in-right">

                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Asignar Director</h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{selectedCarrera?.nombre_carrera}</p>
                            </div>
                            <button
                                onClick={() => setIsDrawerOpen(false)}
                                className="size-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Selecciona un docente para liderar la carrera de <span className="text-uide-blue font-bold">{selectedCarrera?.nombre_carrera}</span>.
                            </p>

                            <div className="space-y-4">
                                <label className="block">
                                    <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Buscar Docente</span>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">person_search</span>
                                        <input
                                            value={assignSearchTerm}
                                            onChange={(e) => setAssignSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-uide-blue/50 dark:text-white transition-all outline-none"
                                            placeholder="Nombre o Correo..."
                                            type="text"
                                        />
                                    </div>
                                </label>

                                <div className="space-y-3 pt-2">
                                    {filteredDirectors.length === 0 && (
                                        <p className="text-center text-sm text-slate-400 py-4">No se encontraron directores.</p>
                                    )}

                                    {filteredDirectors.map(director => {
                                        const isSelected = selectedDirectorId === director.id;
                                        const isAssignedToOther = director.carrera_nombre && director.carrera_nombre !== selectedCarrera?.nombre_carrera;

                                        return (
                                            <div
                                                key={director.id}
                                                onClick={() => setSelectedDirectorId(director.id)}
                                                className={`
                                            p-3 border rounded-xl cursor-pointer transition-all flex items-center gap-3
                                            ${isSelected
                                                        ? 'bg-uide-blue/5 border-uide-blue ring-1 ring-uide-blue'
                                                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}
                                        `}
                                            >
                                                <div className={`size-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${isSelected ? 'bg-uide-blue' : 'bg-slate-400'}`}>
                                                    {getInitials(director.nombre + ' ' + director.apellido)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold truncate ${isSelected ? 'text-uide-blue' : 'text-slate-900 dark:text-white'}`}>
                                                        {director.nombre} {director.apellido}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                        {isAssignedToOther ? `Asignado a: ${director.carrera_nombre}` : 'Disponible'}
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <span className="material-symbols-outlined text-uide-blue text-[20px]">check_circle</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900 z-10">
                            <button
                                onClick={handleAssign}
                                disabled={!selectedDirectorId}
                                className="w-full bg-uide-blue disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold shadow-lg shadow-uide-blue/20 hover:brightness-110 transition-all active:scale-[0.98]"
                            >
                                Confirmar Asignación
                            </button>
                            <button
                                onClick={() => setIsDrawerOpen(false)}
                                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            {selectedCarrera?.director_nombre && (
                                <button
                                    onClick={async () => {
                                        // Logic to unassign could be implemented here (passing null to API)
                                        // For now, we reuse handleAssign but maybe we need a dedicated unassign button/flow
                                        if (!confirm('¿Estás seguro de quitar al director actual?')) return;
                                        try {
                                            // Assuming passing null unassigns? The API `updateDirectorCarrera` takes `carrera` string. 
                                            // If we want to unassign we might need to update the user to have null career.
                                            // But since API takes ID and Carrera Name, simply assigning to another works.
                                            // To Unassign, we might need to look at API capabilities. The service takes string | null.
                                            // Let's assume we can pass null.
                                            if (selectedCarrera.director_nombre) {
                                                // Find the current director ID? We might not have it easily here without searching 'directores' array.
                                                // Let's assume we maintain it.
                                                const currentDir = directores.find(d => d.nombre + ' ' + d.apellido === selectedCarrera.director_nombre);
                                                if (currentDir) {
                                                    await usuarioService.updateDirectorCarrera(currentDir.id, null);
                                                    setIsDrawerOpen(false);
                                                    loadData();
                                                }
                                            }
                                        } catch (e) { console.error(e); }
                                    }}
                                    className="w-full text-red-500 text-xs font-bold hover:underline mt-2"
                                >
                                    Desvincular Director Actual
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
