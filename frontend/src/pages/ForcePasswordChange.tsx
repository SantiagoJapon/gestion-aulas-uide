import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/api';

export default function ForcePasswordChange() {
    const { user, logout, updateUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const getStrength = (p: string) => {
        if (!p) return { level: 0, label: '', color: '' };
        let score = 0;
        if (p.length >= 8) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;
        const levels = [
            { level: 0, label: '', color: '' },
            { level: 1, label: 'Débil', color: 'bg-rose-500' },
            { level: 2, label: 'Media', color: 'bg-amber-400' },
            { level: 3, label: 'Buena', color: 'bg-sky-400' },
            { level: 4, label: 'Fuerte', color: 'bg-emerald-500' },
        ];
        return levels[score] || levels[0];
    };

    const strength = getStrength(password);

    const rolePath: Record<string, string> = {
        admin: '/admin',
        director: '/director',
        profesor: '/profesor',
        docente: '/profesor',
        estudiante: '/estudiante',
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            await authService.changePasswordFirstLogin(password);
            setSuccess(true);
            if (user) {
                updateUser({ ...user, requiere_cambio_password: false } as any);
            }
            setTimeout(() => {
                const path = rolePath[user?.rol || ''] || '/';
                navigate(path);
            }, 2500);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.mensaje || '';
            setError(msg.toLowerCase().includes('incorrecta')
                ? 'No se pudo verificar tu sesión. Intenta ingresar de nuevo.'
                : msg || 'Error al actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden font-outfit">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-uide-blue/20 rounded-full blur-[120px] animate-pulse delay-700" />
                <div className="absolute top-[30%] right-[10%] w-[20%] h-[20%] bg-emerald-500/10 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
            </div>

            <div className="relative z-10 w-full max-w-[440px] animate-fade-in-up">
                {/* Logo o Marca */}
                <div className="flex justify-center mb-8">
                    <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl">
                        <div className="bg-gradient-to-br from-primary to-uide-blue size-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                            U
                        </div>
                    </div>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-[40px] rounded-[2.5rem] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500">

                    {/* Header Section */}
                    <div className="relative p-8 pb-4 text-center">
                        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-primary/20 to-uide-blue/20 border border-white/10 mb-6 group transition-transform duration-500 hover:scale-110">
                            {success ? (
                                <span className="material-symbols-outlined text-3xl text-emerald-400 animate-bounce">check_circle</span>
                            ) : (
                                <span className="material-symbols-outlined text-3xl text-primary group-hover:rotate-12 transition-transform">lock_person</span>
                            )}
                        </div>

                        <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
                            {success ? '¡Acceso Asegurado!' : 'Configura tu Seguridad'}
                        </h1>
                        <p className="text-slate-400 text-sm mt-2 font-medium px-4">
                            {success
                                ? 'Todo listo. Estamos preparando tu espacio de trabajo...'
                                : `Hola ${user?.nombre?.split(' ')[0] || 'Docente'}, es momento de establecer una contraseña segura.`}
                        </p>
                    </div>

                    <div className="p-8 pt-6">
                        {success ? (
                            <div className="space-y-6 py-4">
                                <div className="flex justify-center">
                                    <div className="relative size-24">
                                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-4xl text-emerald-500">verified_user</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full animate-[width_2.5s_ease-in-out]" style={{ width: '100%' }} />
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-3 animate-shake">
                                        <span className="material-symbols-outlined text-lg">warning</span>
                                        {error}
                                    </div>
                                )}

                                {/* Password Input Group */}
                                <div className="space-y-4">
                                    <div className="group space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                                            Nueva Contraseña
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary">
                                                <span className="material-symbols-outlined text-xl">password</span>
                                            </div>
                                            <input
                                                type={showPass ? 'text' : 'password'}
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-12 py-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 focus:bg-white/[0.07] transition-all font-bold"
                                                placeholder="Crea una clave fuerte"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPass(!showPass)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-xl">
                                                    {showPass ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>
                                        {/* Strength Indicators */}
                                        {password && (
                                            <div className="px-1 space-y-2 pt-1 animate-fade-in">
                                                <div className="flex gap-1.5">
                                                    {[1, 2, 3, 4].map(i => (
                                                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= strength.level ? strength.color : 'bg-white/5'}`} />
                                                    ))}
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Seguridad</span>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${strength.color.replace('bg-', 'text-')}`}>
                                                        {strength.label}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="group space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                                            Confirmar Contraseña
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary">
                                                <span className="material-symbols-outlined text-xl">lock_reset</span>
                                            </div>
                                            <input
                                                type="password"
                                                className={`w-full bg-white/5 border rounded-2xl pl-12 pr-12 py-4 text-white placeholder:text-slate-600 outline-none transition-all font-bold focus:ring-2 ${confirmPassword
                                                        ? password === confirmPassword
                                                            ? 'border-emerald-500/30 focus:ring-emerald-500/30'
                                                            : 'border-rose-500/30 focus:ring-rose-500/30'
                                                        : 'border-white/5 focus:ring-primary/40 focus:border-primary/40'
                                                    }`}
                                                placeholder="Repite la clave"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                            {confirmPassword && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                                                    <span className={`material-symbols-outlined text-lg ${password === confirmPassword ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {password === confirmPassword ? 'check_circle' : 'error'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !password || password !== confirmPassword}
                                    className="w-full relative group overflow-hidden bg-gradient-to-r from-primary to-uide-blue text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-primary/20 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] mt-2"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                                    <div className="flex items-center justify-center gap-3 relative z-10">
                                        {loading ? (
                                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span className="material-symbols-outlined text-xl">task_alt</span>
                                        )}
                                        <span className="uppercase tracking-[0.15em] text-xs">Finalizar Configuración</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { logout(); navigate('/login'); }}
                                    className="w-full text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-colors pt-2"
                                >
                                    Salir sin cambiar
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <p className="text-center text-slate-600 text-[10px] mt-12 font-bold uppercase tracking-[0.3em]">
                    UIDE • Security System v2.0
                </p>
            </div>
        </div>
    );
}
