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
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Indicador de fortaleza de contraseña
    const getStrength = (p: string) => {
        if (!p) return { level: 0, label: '', color: '' };
        let score = 0;
        if (p.length >= 8) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;
        const levels = [
            { level: 0, label: '', color: '' },
            { level: 1, label: 'Débil', color: 'bg-red-500' },
            { level: 2, label: 'Regular', color: 'bg-orange-400' },
            { level: 3, label: 'Buena', color: 'bg-yellow-400' },
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
            // Usamos la contraseña temporal como passwordActual
            // El backend acepta 'uide2026' como clave temporal estándar
            await authService.changePasswordFirstLogin(password);

            setSuccess(true);

            // Actualizar el usuario en contexto para quitar el flag
            if (user) {
                updateUser({ ...user, requiere_cambio_password: false } as any);
            }

            // Redirigir al dashboard correcto después de 2 segundos
            setTimeout(() => {
                const path = rolePath[user?.rol || ''] || '/';
                navigate(path);
            }, 2000);

        } catch (err: any) {
            // Si falla con uide2026, puede ser que ya cambió antes — intentar logout
            const msg = err.response?.data?.error || err.response?.data?.mensaje || '';
            if (msg.toLowerCase().includes('incorrecta')) {
                setError('No se pudo verificar tu contraseña temporal. Contacta al administrador.');
            } else {
                setError(msg || 'Error al cambiar la contraseña. Intenta de nuevo.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30 flex items-center justify-center p-6">
            {/* Fondo animado */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Card principal */}
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden">

                    {/* Header con gradiente */}
                    <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-white text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMCAwdi02aC02djZoNnptNiAwaDZ2LTZoLTZ2NnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
                        <div className="relative">
                            {success ? (
                                <div className="size-20 mx-auto mb-4 rounded-3xl bg-white/20 flex items-center justify-center animate-bounce">
                                    <span className="material-symbols-outlined text-5xl">check_circle</span>
                                </div>
                            ) : (
                                <div className="size-20 mx-auto mb-4 rounded-3xl bg-white/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-5xl">shield_lock</span>
                                </div>
                            )}
                            <h1 className="text-2xl font-black tracking-tight">
                                {success ? '¡Contraseña actualizada!' : 'Primer ingreso al sistema'}
                            </h1>
                            <p className="text-white/70 text-sm mt-1 font-medium">
                                {success
                                    ? 'Redirigiendo a tu panel...'
                                    : `Bienvenido/a, ${user?.nombre || 'docente'}. Por seguridad, debes crear tu contraseña personal.`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-8">
                        {success ? (
                            <div className="text-center py-4">
                                <div className="size-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl text-emerald-500">rocket_launch</span>
                                </div>
                                <p className="text-slate-600 font-medium">Tu contraseña ha sido guardada correctamente.</p>
                                <p className="text-sm text-slate-400 mt-1">Serás redirigido a tu panel en unos segundos...</p>
                                <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full animate-[width_2s_ease-in-out]" style={{ width: '100%', transition: 'width 2s' }} />
                                </div>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold flex items-start gap-3">
                                        <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
                                        <span>{error}</span>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Nueva contraseña */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            Nueva Contraseña
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                                                <span className="material-symbols-outlined text-xl">lock</span>
                                            </span>
                                            <input
                                                type={showPass ? 'text' : 'password'}
                                                required
                                                placeholder="Mínimo 6 caracteres"
                                                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none font-bold transition-all"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPass(!showPass)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-xl">
                                                    {showPass ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>

                                        {/* Barra de fortaleza */}
                                        {password && (
                                            <div className="mt-2 space-y-1">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4].map(i => (
                                                        <div
                                                            key={i}
                                                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.level ? strength.color : 'bg-slate-100'}`}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Fortaleza: <span className={`${strength.level >= 3 ? 'text-emerald-500' : strength.level >= 2 ? 'text-orange-400' : 'text-red-400'}`}>{strength.label}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirmar contraseña */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            Confirmar Contraseña
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                                                <span className="material-symbols-outlined text-xl">lock_reset</span>
                                            </span>
                                            <input
                                                type={showConfirm ? 'text' : 'password'}
                                                required
                                                placeholder="Repite tu nueva contraseña"
                                                className={`w-full pl-12 pr-12 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none font-bold transition-all ${confirmPassword && password !== confirmPassword
                                                    ? 'border-red-300 focus:border-red-400'
                                                    : confirmPassword && password === confirmPassword
                                                        ? 'border-emerald-300 focus:border-emerald-400'
                                                        : 'border-slate-100 focus:border-primary'
                                                    }`}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(!showConfirm)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-xl">
                                                    {showConfirm ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                            {confirmPassword && (
                                                <span className={`absolute right-12 top-1/2 -translate-y-1/2 material-symbols-outlined text-lg ${password === confirmPassword ? 'text-emerald-500' : 'text-red-400'}`}>
                                                    {password === confirmPassword ? 'check_circle' : 'cancel'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Botón */}
                                    <button
                                        type="submit"
                                        disabled={loading || (!!confirmPassword && password !== confirmPassword)}
                                        className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest text-xs mt-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-base">security</span>
                                                Establecer mi contraseña
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { logout(); navigate('/login'); }}
                                        className="w-full text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors py-2"
                                    >
                                        Cancelar y salir
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
