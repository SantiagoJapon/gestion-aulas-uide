import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CommandKSearch from './CommandKSearch';

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
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Simulación de notificaciones
    const [notifications, setNotifications] = useState([
        { id: 1, from: 'Sistema', text: 'Bienvenido al nuevo dashboard', time: 'Hace 5 min', read: false },
        { id: 2, from: 'Director', text: 'Recuerda subir tus notas', time: 'Hace 2 horas', read: true }
    ]);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems: NavItem[] = [
        { label: 'Inicio', icon: 'dashboard', tab: 'general' },
        { label: 'Distribución', icon: 'calendar_apps_script', tab: 'distribucion', roles: ['admin'] },
        { label: 'Disponibilidad', icon: 'event_available', tab: 'disponibilidad', roles: ['admin', 'director'] },
        { label: 'Gestión Aulas', icon: 'room_preferences', tab: 'espacios', roles: ['admin'] },
        { label: 'Docentes', icon: 'badge', tab: 'docentes', roles: ['admin', 'director'] },
        { label: 'Estudiantes', icon: 'group', tab: 'estudiantes', roles: ['admin', 'director'] },
        { label: 'Mis Clases', icon: 'calendar_month', tab: 'horario', roles: ['profesor', 'estudiante'] },
        { label: 'Reportes', icon: 'bar_chart', tab: 'reportes', roles: ['admin', 'director'] },
        { label: 'Incidencias', icon: 'warning', tab: 'incidencias', roles: ['admin'] },
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
            <aside className={`glass-sidebar w-64 flex flex-col fixed lg:sticky top-0 left-0 bottom-[88px] lg:bottom-0 lg:h-full z-30 lg:z-40 transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} shadow-2xl lg:shadow-none`}>
                <div className="p-6">
                    <div className="flex items-center justify-between lg:justify-start gap-3 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/logo-uide.webp" alt="UIDE Logo" className="w-full h-full object-contain p-1" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-foreground text-lg font-bold leading-none tracking-tight text-nowrap">UIDE Loja</h1>
                                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">{title}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Spotlight Trigger */}
                    <div className="mb-6 px-1">
                        <button
                            onClick={() => {
                                const event = new KeyboardEvent('keydown', {
                                    key: 'k',
                                    ctrlKey: true,
                                    bubbles: true
                                });
                                window.dispatchEvent(event);
                            }}
                            className="w-full h-11 flex items-center justify-between px-4 bg-muted/50 hover:bg-muted border border-border/50 rounded-xl text-muted-foreground hover:text-foreground transition-all group"
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">search</span>
                                <span className="text-xs font-bold">Buscar...</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[9px] font-black border border-border/50 shadow-[0_1px_1px_rgba(0,0,0,0.1)]">⌘</kbd>
                                <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[9px] font-black border border-border/50 shadow-[0_1px_1px_rgba(0,0,0,0.1)]">K</kbd>
                            </div>
                        </button>
                    </div>

                    <nav className="space-y-1">
                        {filteredItems.map((item) => (
                            <button
                                key={item.tab}
                                onClick={() => {
                                    setActiveTab(item.tab);
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${activeTab === item.tab
                                    ? 'bg-primary/10 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform ${activeTab === item.tab ? 'font-variation-fill' : ''}`}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Sidebar Footer */}
                <div className="mt-auto p-6 space-y-4">
                    <div className="flex items-center gap-3 px-1 border-t border-border pt-4">
                        <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold border border-border shadow-sm">
                            {user?.nombre?.[0]}{user?.apellido?.[0]}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground truncate">{user?.nombre} {user?.apellido}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">{user?.rol}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-auto">
                            {/* Notification Bell */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all relative"
                                >
                                    <span className="material-symbols-outlined text-[20px] font-variation-fill">notifications</span>
                                    {notifications.some(n => !n.read) && (
                                        <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border border-background"></span>
                                    )}
                                </button>

                                {isNotificationsOpen && (
                                    <div className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-scale-in origin-bottom-left z-50">
                                        <div className="p-3 border-b border-border bg-muted/30 flex justify-between items-center">
                                            <h4 className="text-xs font-black uppercase text-foreground">Notificaciones</h4>
                                            <button className="text-[10px] text-primary font-bold hover:underline">Marcar leídas</button>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                notifications.map(n => (
                                                    <div key={n.id} className={`p-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[10px] font-bold text-primary uppercase">{n.from}</span>
                                                            <span className="text-[9px] text-muted-foreground">{n.time}</span>
                                                        </div>
                                                        <p className="text-xs text-foreground font-medium leading-snug">{n.text}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-6 text-center text-muted-foreground text-xs">No tienes notificaciones nuevas</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleLogout}
                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                title="Cerrar sesión"
                            >
                                <span className="material-symbols-outlined text-[20px]">logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

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

                <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-28 lg:pb-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>

                {/* Floating Apple-Style Mobile Bottom Navigation Bar */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 px-4 pb-safe z-50">
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
