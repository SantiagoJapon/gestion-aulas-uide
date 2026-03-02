import React, { useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CommandKSearch from './CommandKSearch';
import { notificacionService, Notificacion } from '../../services/api';

interface NavItem {
    label: string;
    icon: string;
    tab: string;
    roles?: string[];
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: any) => void;
    title: string;
    subtitle?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    activeTab,
    setActiveTab,
    title
}) => {
    const { user, logout } = useContext(AuthContext);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarRetracted, setIsSidebarRetracted] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Notificaciones reales desde la API
    const [notifications, setNotifications] = useState<Notificacion[]>([]);
    const [loadingNotif, setLoadingNotif] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoadingNotif(true);
        try {
            const res = await notificacionService.misNotificaciones();
            if (res.success) setNotifications(res.notificaciones);
        } catch {
            // Silenciar: no es crítico si el panel de notificaciones falla
        } finally {
            setLoadingNotif(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleMarcarTodasLeidas = async () => {
        const noLeidas = notifications.filter(n => !n.leida);
        await Promise.allSettled(noLeidas.map(n => notificacionService.marcarLeida(n.id)));
        setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
    };

    const navigate = useNavigate();


    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems: NavItem[] = [
        { label: 'Inicio', icon: 'dashboard', tab: 'general' },
        { label: 'Distribución', icon: 'calendar_apps_script', tab: 'distribucion', roles: ['admin'] },
        { label: 'Disponibilidad', icon: 'event_available', tab: 'disponibilidad', roles: ['admin', 'director'] },
        { label: 'Reservas', icon: 'book_online', tab: 'reservas', roles: ['admin', 'director'] },
        { label: 'Gestión Aulas', icon: 'room_preferences', tab: 'espacios', roles: ['admin'] },
        { label: 'Docentes', icon: 'badge', tab: 'docentes', roles: ['admin', 'director'] },
        { label: 'Materias', icon: 'menu_book', tab: 'materias', roles: ['director'] },
        { label: 'Estudiantes', icon: 'group', tab: 'estudiantes', roles: ['admin', 'director'] },
        { label: 'Mis Clases', icon: 'calendar_month', tab: 'horario', roles: ['profesor', 'docente', 'estudiante'] },
        { label: 'Reportes', icon: 'bar_chart', tab: 'reportes', roles: ['admin', 'director'] },
        { label: 'Incidencias', icon: 'warning', tab: 'incidencias', roles: ['admin', 'director', 'profesor', 'docente'] },
        { label: 'Ajustes', icon: 'settings', tab: 'settings' },
    ];

    const filteredItems = navItems.filter(item =>
        !item.roles || (user && item.roles.includes(user.rol))
    );

    // Seleccionamos items para el menú móvil (máximo 5)
    const mobileMenuItems = [
        ...filteredItems.filter(item => item.tab !== 'settings').slice(0, 4),
        filteredItems.find(item => item.tab === 'settings')
    ].filter(Boolean) as NavItem[];

    return (
        <div className="flex h-screen overflow-hidden bg-background font-sans text-foreground antialiased transition-colors duration-300">
            {/* Global Search Interface */}
            <CommandKSearch />

            {/* Mobile Menu Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`glass-sidebar flex flex-col fixed lg:sticky top-0 left-0 bottom-0 lg:h-screen z-30 lg:z-40 transition-all duration-500 ease-in-out transform shadow-2xl lg:shadow-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-border/50 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isSidebarRetracted ? 'w-24' : 'w-72 lg:w-64'}`}>

                {/* Header (Mantiene logo fijo) */}
                <div className="px-4 lg:px-5 pt-5 pb-2 shrink-0">
                    <div id="tour-logo" className={`flex items-center gap-3 mb-6 transition-all ${isSidebarRetracted ? 'justify-center' : 'justify-between'}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="size-9 lg:size-10 shrink-0 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden border border-border/10">
                                <img src="/logo-uide.webp" alt="UIDE Logo" className="w-full h-full object-contain p-1" />
                            </div>
                            {!isSidebarRetracted && (
                                <div className="flex flex-col animate-fade-in whitespace-nowrap">
                                    <h1 className="text-foreground text-base lg:text-lg font-bold leading-none tracking-tight">UIDE Loja</h1>
                                    <p className="text-muted-foreground text-[9px] lg:text-[10px] font-black uppercase tracking-widest mt-1">{title}</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                if (window.innerWidth < 1024) {
                                    setIsSidebarOpen(false);
                                } else {
                                    setIsSidebarRetracted(!isSidebarRetracted);
                                }
                            }}
                            className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-xl shrink-0"
                            title={isSidebarRetracted ? "Expandir" : "Contraer"}
                        >
                            <span className="material-symbols-outlined">
                                {window.innerWidth < 1024 ? 'close' : (isSidebarRetracted ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Zona de Navegación con Scroll */}
                <div className={`flex-1 overflow-y-auto custom-scrollbar py-3 transition-all ${isSidebarRetracted ? 'px-2' : 'px-3 lg:px-4'}`}>
                    <nav className="space-y-1">
                        {filteredItems.map((item) => (
                            <button
                                key={item.tab}
                                id={`tour-nav-${item.tab}`}
                                onClick={() => {
                                    setActiveTab(item.tab);
                                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 rounded-2xl text-sm font-bold transition-all group relative ${activeTab === item.tab
                                    ? 'bg-primary/10 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    } ${isSidebarRetracted ? 'justify-center p-3' : 'px-3 py-2.5 lg:px-4'}`}
                                title={isSidebarRetracted ? item.label : ""}
                            >
                                <span className={`material-symbols-outlined text-[22px] lg:text-[24px] transition-transform duration-300 group-hover:scale-110 shrink-0 ${activeTab === item.tab ? 'font-variation-fill' : ''}`}>
                                    {item.icon}
                                </span>
                                {!isSidebarRetracted && <span className="animate-fade-in whitespace-nowrap text-sm">{item.label}</span>}
                                {isSidebarRetracted && activeTab === item.tab && (
                                    <div className="absolute left-0 w-1 h-5 bg-primary rounded-r-full" />
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Pie de Sidebar (Adaptable) */}
                <div className={`shrink-0 border-t border-border bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm transition-all mb-20 lg:mb-0 ${isSidebarRetracted ? 'p-2 pb-4' : 'px-3 py-4 lg:px-4'}`}>
                    <div className={`flex items-center gap-3 ${isSidebarRetracted ? 'flex-col' : ''}`}>
                        <div className="size-10 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold border border-border group-hover:border-primary/50 transition-colors">
                            {user?.nombre?.[0]}{user?.apellido?.[0]}
                        </div>

                        {!isSidebarRetracted ? (
                            <>
                                <div className="flex flex-col min-w-0 flex-1 animate-fade-in">
                                    <p className="text-xs font-bold text-foreground truncate">{user?.nombre} {user?.apellido}</p>
                                    <div className="flex items-center gap-1">
                                        <span className="size-1.5 bg-emerald-500 rounded-full"></span>
                                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest truncate">{user?.rol}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all relative"
                                    >
                                        <span className="material-symbols-outlined text-[20px] font-variation-fill">notifications</span>
                                        {notifications.some(n => !n.leida) && (
                                            <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border border-background"></span>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">logout</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2 w-full animate-fade-in">
                                <button
                                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                    className="p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-2xl transition-all relative"
                                >
                                    <span className="material-symbols-outlined text-[24px]">notifications</span>
                                    {notifications.some(n => !n.leida) && (
                                        <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border border-background"></span>
                                    )}
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-2xl transition-all"
                                >
                                    <span className="material-symbols-outlined text-[24px]">logout</span>
                                </button>
                            </div>
                        )}

                        {isNotificationsOpen && (
                            <div className={`absolute bottom-full mb-5 w-80 bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl border border-border/50 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.3)] overflow-hidden animate-scale-in origin-bottom transition-all duration-300 z-[100] ${isSidebarRetracted ? 'left-full ml-4' : 'left-0'}`}>
                                <div className="p-4 border-b border-border/50 bg-muted/40 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
                                    <h4 className="text-[10px] font-black uppercase text-foreground tracking-[0.2em]">Notificaciones</h4>
                                    <button
                                        onClick={handleMarcarTodasLeidas}
                                        className="text-[10px] text-primary font-bold hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1 rounded-full"
                                    >
                                        Marcar leídas
                                    </button>
                                </div>
                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                    {loadingNotif ? (
                                        <div className="flex items-center justify-center p-8">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                                        </div>
                                    ) : notifications.length > 0 ? (
                                        notifications.map(n => (
                                            <div key={n.id} className={`p-4 border-b border-border/30 last:border-0 hover:bg-primary/5 transition-all duration-300 relative group cursor-pointer ${!n.leida ? 'bg-primary/[0.03]' : ''}`}>
                                                {!n.leida && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                                                )}
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`size-2 rounded-full ${!n.leida ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                                                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                                            {n.remitenteInfo ? `${n.remitenteInfo.nombre} ${n.remitenteInfo.apellido}` : 'Sistema'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] text-muted-foreground font-medium">
                                                        {new Date(n.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-bold text-foreground mb-1">{n.titulo}</p>
                                                <p className="text-xs text-foreground/70 font-semibold leading-relaxed group-hover:translate-x-1 transition-transform">{n.mensaje}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-10 text-center">
                                            <div className="size-12 bg-muted rounded-2xl flex items-center justify-center mb-3">
                                                <span className="material-symbols-outlined text-muted-foreground/50">notifications_off</span>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] font-medium tracking-tight">No tienes notificaciones por el momento</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-muted/20 border-t border-border/30 text-center">
                                    <button
                                        onClick={fetchNotifications}
                                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Actualizar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Tour Global Trigger */}
            <button
                id="tour-help-button"
                onClick={() => window.dispatchEvent(new CustomEvent('restart-uide-tour'))}
                className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 lg:bottom-10 lg:right-10 size-11 sm:size-12 bg-uide-gold text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-[60] group"
                title="Ayuda / Tour Guiado"
            >
                <span className="material-symbols-outlined text-xl sm:text-2xl font-variation-fill group-hover:rotate-12 transition-transform">help</span>
            </button>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Mobile Header */}
                <header className="lg:hidden bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300">
                    <div className="flex items-center gap-2">
                        <div className="size-8 bg-transparent rounded-lg flex items-center justify-center overflow-hidden">
                            <img src="/blob.png" alt="UIDE App" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-foreground font-black tracking-tight text-sm uppercase">UIDE {title}</h1>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </header>

                <div className="p-4 sm:p-5 md:p-6 lg:p-8 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-28 lg:pb-8">
                    <div className="max-w-[1400px] mx-auto">
                        {children}
                    </div>
                </div>

                {/* Floating Apple-Style Mobile Bottom Navigation Bar */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 px-3 sm:px-4 pb-safe z-50">
                    <nav className="mx-auto max-w-md bg-card/80 dark:bg-card/90 backdrop-blur-2xl rounded-[2.5rem] p-2.5 flex items-center justify-between shadow-2xl shadow-black/20 dark:shadow-black/60 border border-border/60">
                        {mobileMenuItems.map((item) => (
                            <button
                                key={item.tab}
                                onClick={() => setActiveTab(item.tab)}
                                className={`relative flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-[2rem] transition-all duration-300 ease-out flex-1 min-w-0 ${activeTab === item.tab
                                    ? 'text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground active:scale-[0.92]'
                                    }`}
                            >
                                {activeTab === item.tab && (
                                    <div
                                        className="absolute inset-0 bg-primary rounded-[2rem] shadow-lg shadow-primary/30 -z-10"
                                        style={{
                                            animation: 'fadeIn 0.2s ease-out',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    />
                                )}
                                <span
                                    className={`material-symbols-outlined text-[22px] transition-all duration-300 ease-out ${activeTab === item.tab ? 'font-variation-fill scale-110' : 'scale-100'}`}
                                    style={{
                                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s ease'
                                    }}
                                >
                                    {item.icon}
                                </span>
                                <span
                                    className={`text-[10px] font-bold uppercase tracking-tight transition-all duration-300 ease-out truncate w-full ${activeTab === item.tab ? 'opacity-100' : 'opacity-70'}`}
                                >
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </nav>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
