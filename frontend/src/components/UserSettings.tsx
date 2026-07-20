import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/api';
import { FaUser, FaLock, FaSave } from 'react-icons/fa';

export default function UserSettings() {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState<'perfil' | 'seguridad'>('perfil');

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
    }, [user]);

    // --- Handlers Perfil ---
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (user?.rol === 'estudiante') return;
        setLoadingProfile(true);
        try {
            await authService.updateProfile({
                nombre: profileData.nombre,
                apellido: profileData.apellido,
                telefono: profileData.telefono,
                email: profileData.email,
                cedula: profileData.cedula
            });
            alert('Perfil actualizado correctamente');
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

    return (
        <div className="flex flex-col lg:flex-row gap-8 bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-200 min-h-[600px]">
            {/* Sidebar de Navegación de Ajustes */}
            <nav className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 border-b lg:border-b-0 lg:border-r border-slate-100 lg:pr-6">
                <button
                    onClick={() => setActiveTab('perfil')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'perfil'
                        ? 'bg-uide-blue/10 text-uide-blue shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <FaUser size={16} />
                    Mi Perfil
                </button>
                <button
                    onClick={() => setActiveTab('seguridad')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'seguridad'
                        ? 'bg-uide-blue/10 text-uide-blue shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <FaLock size={16} />
                    Seguridad
                </button>
            </nav>

            {/* Contenido Principal */}
            <main className="flex-1 animate-fade-in">

                {/* --- TAB PERFIL --- */}
                {activeTab === 'perfil' && (
                    <div className="space-y-8 max-w-2xl">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Información Personal</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {user?.rol === 'estudiante'
                                    ? 'Tus datos personales son gestionados por la administración.'
                                    : 'Actualiza tus datos de contacto y visualización.'}
                            </p>
                        </div>

                        {/* Vista solo-lectura para estudiantes */}
                        {user?.rol === 'estudiante' ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 items-start">
                                    <span className="material-symbols-outlined text-amber-500 shrink-0">info</span>
                                    <div className="text-sm text-amber-800">
                                        <p className="font-bold mb-1">Perfil de solo lectura</p>
                                        <p className="text-xs opacity-80">Los datos de los estudiantes son gestionados por la administración a través de la carga masiva de Excel. Para actualizar tus datos contacta a la secretaría.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[{ label: 'Nombre', value: profileData.nombre }, { label: 'Apellido', value: profileData.apellido }, { label: 'Email / Cédula', value: profileData.email || profileData.cedula }].map(({ label, value }) => (
                                        <div key={label} className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                                            <div className="px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-sm">
                                                {value || <span className="italic opacity-50">No registrado</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleProfileUpdate} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</label>
                                        <input
                                            type="text"
                                            value={profileData.nombre}
                                            onChange={(e) => setProfileData({ ...profileData, nombre: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Apellido</label>
                                        <input
                                            type="text"
                                            value={profileData.apellido}
                                            onChange={(e) => setProfileData({ ...profileData, apellido: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono</label>
                                        <input
                                            type="tel"
                                            value={profileData.telefono}
                                            onChange={(e) => setProfileData({ ...profileData, telefono: e.target.value })}
                                            placeholder="0999999999"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                        />
                                        <p className="text-[10px] text-slate-400 italic">Formato: 10 dígitos (ej: 0999999999)</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cédula</label>
                                        <input
                                            type="text"
                                            value={profileData.cedula}
                                            onChange={(e) => setProfileData({ ...profileData, cedula: e.target.value })}
                                            maxLength={10}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-uide-blue outline-none transition-all"
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
                        )}
                    </div>
                )}

                {/* --- TAB SEGURIDAD --- */}
                {activeTab === 'seguridad' && (
                    <div className="space-y-8 max-w-2xl">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Seguridad de la Cuenta</h3>
                            <p className="text-sm text-slate-500 mt-1">Gestiona tu contraseña y sesiones activas.</p>
                        </div>

                        {/* Panel informativo para estudiantes */}
                        {user?.rol === 'estudiante' ? (
                            <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl flex gap-4 items-start">
                                <div className="size-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-blue-600">id_card</span>
                                </div>
                                <div>
                                    <p className="font-bold text-blue-900 mb-1">Acceso con cédula</p>
                                    <p className="text-sm text-blue-700 opacity-80">Los estudiantes acceden al sistema únicamente con su número de cédula. No se requiere contraseña.</p>
                                    <p className="text-xs text-blue-600 mt-2 opacity-70">Si tienes problemas de acceso, contacta a la administración.</p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handlePasswordChange} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña Actual</label>
                                    <input
                                        type="password"
                                        required
                                        value={securityData.currentPassword}
                                        onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                    />
                                </div>

                                <hr className="border-slate-200" />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={securityData.newPassword}
                                            onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-uide-blue outline-none transition-all"
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
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-uide-blue outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={loadingSecurity}
                                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loadingSecurity ? <span className="animate-spin material-symbols-outlined text-sm">sync</span> : <FaLock />}
                                        Actualizar Contraseña
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

            </main>
        </div>
    );
}
