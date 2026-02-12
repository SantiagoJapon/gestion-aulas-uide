import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/api';
import { FaUser, FaLock, FaPalette, FaSave } from 'react-icons/fa';

export default function UserSettings() {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState<'perfil' | 'seguridad' | 'apariencia'>('perfil');

    // Perfil State
    const [profileData, setProfileData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        cedula: ''
    });
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Seguridad State
    const [securityData, setSecurityData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loadingSecurity, setLoadingSecurity] = useState(false);

    // Apariencia State
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

    // Inicializar datos
    useEffect(() => {
        if (user) {
            setProfileData({
                nombre: user.nombre || '',
                apellido: user.apellido || '',
                email: user.email || '',
                telefono: user.telefono || '',
                cedula: user.cedula || ''
            });
        }

        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            setTheme('system');
        }
    }, [user]);

    // --- Handlers Perfil ---
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingProfile(true);
        try {
            await authService.updateProfile({
                nombre: profileData.nombre,
                apellido: profileData.apellido,
                telefono: profileData.telefono
            });
            alert('Perfil actualizado correctamente');
            // Idealmente actualizar el contexto aquí, por ahora recargamos para simplificar o asumimos que el usuario lo nota
        } catch (error: any) {
            alert(error.response?.data?.mensaje || 'Error al actualizar perfil');
        } finally {
            setLoadingProfile(false);
        }
    };

    // --- Handlers Seguridad ---
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (securityData.newPassword !== securityData.confirmPassword) {
            alert('Las contraseñas nuevas no coinciden');
            return;
        }
        setLoadingSecurity(true);
        try {
            await authService.changePassword(securityData.currentPassword, securityData.newPassword);
            alert('Contraseña actualizada correctamente');
            setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            alert(error.response?.data?.mensaje || 'Error al cambiar contraseña');
        } finally {
            setLoadingSecurity(false);
        }
    };

    // --- Handlers Apariencia ---
    const applyTheme = (selectedTheme: 'light' | 'dark' | 'system') => {
        const root = window.document.documentElement;
        const isDark = selectedTheme === 'dark' ||
            (selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
        }

        if (selectedTheme === 'system') {
            localStorage.removeItem('theme');
        } else {
            localStorage.setItem('theme', selectedTheme);
        }
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        applyTheme(newTheme);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 min-h-[600px]">
            {/* Sidebar de Navegación de Ajustes */}
            <nav className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 lg:pr-6">
                <button
                    onClick={() => setActiveTab('perfil')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'perfil'
                            ? 'bg-uide-blue/10 text-uide-blue shadow-sm'
                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
                        }`}
                >
                    <FaUser size={16} />
                    Mi Perfil
                </button>
                <button
                    onClick={() => setActiveTab('seguridad')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'seguridad'
                            ? 'bg-uide-blue/10 text-uide-blue shadow-sm'
                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
                        }`}
                >
                    <FaLock size={16} />
                    Seguridad
                </button>
                <button
                    onClick={() => setActiveTab('apariencia')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'apariencia'
                            ? 'bg-uide-blue/10 text-uide-blue shadow-sm'
                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
                        }`}
                >
                    <FaPalette size={16} />
                    Apariencia
                </button>
            </nav>

            {/* Contenido Principal */}
            <main className="flex-1 animate-fade-in">

                {/* --- TAB PERFIL --- */}
                {activeTab === 'perfil' && (
                    <div className="space-y-8 max-w-2xl">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Información Personal</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Actualiza tus datos de contacto y visualización.</p>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</label>
                                    <input
                                        type="text"
                                        value={profileData.nombre}
                                        onChange={(e) => setProfileData({ ...profileData, nombre: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Apellido</label>
                                    <input
                                        type="text"
                                        value={profileData.apellido}
                                        onChange={(e) => setProfileData({ ...profileData, apellido: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={profileData.email}
                                    disabled
                                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed"
                                />
                                <p className="text-[10px] text-slate-400 italic">El correo institucional no se puede modificar.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={profileData.telefono}
                                        onChange={(e) => setProfileData({ ...profileData, telefono: e.target.value })}
                                        placeholder="+593 99 999 9999"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cédula</label>
                                    <input
                                        type="text"
                                        value={profileData.cedula}
                                        disabled
                                        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loadingProfile}
                                    className="flex items-center gap-2 px-6 py-3 bg-uide-blue hover:bg-uide-blue-dark text-white rounded-xl font-bold shadow-lg shadow-uide-blue/20 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingProfile ? <span className="animate-spin material-symbols-outlined text-sm">sync</span> : <FaSave />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* --- TAB SEGURIDAD --- */}
                {activeTab === 'seguridad' && (
                    <div className="space-y-8 max-w-2xl">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Seguridad de la Cuenta</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona tu contraseña y sesiones activas.</p>
                        </div>

                        <form onSubmit={handlePasswordChange} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña Actual</label>
                                <input
                                    type="password"
                                    required
                                    value={securityData.currentPassword}
                                    onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                />
                            </div>

                            <hr className="border-slate-200 dark:border-slate-700" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={securityData.newPassword}
                                        onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmar Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={securityData.confirmPassword}
                                        onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loadingSecurity}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingSecurity ? <span className="animate-spin material-symbols-outlined text-sm">sync</span> : <FaLock />}
                                    Actualizar Contraseña
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* --- TAB APARIENCIA --- */}
                {activeTab === 'apariencia' && (
                    <div className="space-y-8 max-w-3xl">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Personalización Visual</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Elige cómo quieres ver la interfaz de UIDE Gestión.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {/* Light Mode */}
                            <div
                                onClick={() => handleThemeChange('light')}
                                className={`cursor-pointer group relative p-4 rounded-2xl border-2 transition-all ${theme === 'light' ? 'border-uide-blue bg-uide-blue/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                            >
                                <div className="flex items-center justify-center h-32 bg-slate-100 rounded-xl mb-4 border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="w-3/4 h-3/4 bg-white rounded-lg shadow-sm flex flex-col p-2 space-y-2">
                                        <div className="h-2 w-1/2 bg-slate-200 rounded"></div>
                                        <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                                        <div className="h-2 w-full bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className={`font-bold ${theme === 'light' ? 'text-uide-blue' : 'text-slate-600 dark:text-slate-400'}`}>Claro</p>
                                </div>
                                {theme === 'light' && <div className="absolute top-4 right-4 text-uide-blue"><span className="material-symbols-outlined">check_circle</span></div>}
                            </div>

                            {/* Dark Mode */}
                            <div
                                onClick={() => handleThemeChange('dark')}
                                className={`cursor-pointer group relative p-4 rounded-2xl border-2 transition-all ${theme === 'dark' ? 'border-uide-blue bg-uide-blue/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                            >
                                <div className="flex items-center justify-center h-32 bg-slate-900 rounded-xl mb-4 border border-slate-800 overflow-hidden shadow-sm">
                                    <div className="w-3/4 h-3/4 bg-slate-800 rounded-lg shadow-sm flex flex-col p-2 space-y-2 border border-slate-700">
                                        <div className="h-2 w-1/2 bg-slate-600 rounded"></div>
                                        <div className="h-2 w-3/4 bg-slate-700 rounded"></div>
                                        <div className="h-2 w-full bg-slate-700 rounded"></div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className={`font-bold ${theme === 'dark' ? 'text-uide-blue' : 'text-slate-600 dark:text-slate-400'}`}>Oscuro</p>
                                </div>
                                {theme === 'dark' && <div className="absolute top-4 right-4 text-uide-blue"><span className="material-symbols-outlined">check_circle</span></div>}
                            </div>

                            {/* System Mode */}
                            <div
                                onClick={() => handleThemeChange('system')}
                                className={`cursor-pointer group relative p-4 rounded-2xl border-2 transition-all ${theme === 'system' ? 'border-uide-blue bg-uide-blue/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                            >
                                <div className="flex items-center justify-center h-32 bg-slate-200 rounded-xl mb-4 border border-slate-300 overflow-hidden shadow-sm relative">
                                    <div className="absolute inset-x-0 inset-y-0 bg-gradient-to-tr from-slate-100 via-slate-300 to-slate-800"></div>
                                    <div className="z-10 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full font-bold text-xs uppercase text-slate-800">Auto</div>
                                </div>
                                <div className="text-center">
                                    <p className={`font-bold ${theme === 'system' ? 'text-uide-blue' : 'text-slate-600 dark:text-slate-400'}`}>Sistema</p>
                                </div>
                                {theme === 'system' && <div className="absolute top-4 right-4 text-uide-blue"><span className="material-symbols-outlined">check_circle</span></div>}
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex gap-3">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                <p className="font-bold mb-1">Nota sobre temas</p>
                                <p className="text-xs opacity-80">El modo "Sistema" sincronizará la apariencia con la configuración de tu sistema operativo (Windows/macOS/Android).</p>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
