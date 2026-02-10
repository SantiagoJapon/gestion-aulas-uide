import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems: NavItem[] = [
        { label: 'Inicio', icon: 'dashboard', tab: 'general' },
        { label: 'Distribución', icon: 'calendar_apps_script', tab: 'distribucion', roles: ['admin'] },
        { label: 'Gestión Aulas', icon: 'room_preferences', tab: 'espacios', roles: ['admin'] },
        { label: 'Estudiantes', icon: 'group', tab: 'estudiantes', roles: ['admin', 'director'] },
        { label: 'Mis Clases', icon: 'calendar_month', tab: 'horario', roles: ['profesor', 'estudiante'] },
        { label: 'Reportes', icon: 'bar_chart', tab: 'reportes' },
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
                    <div className="flex items-center justify-between lg:justify-start gap-3 mb-10">
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
