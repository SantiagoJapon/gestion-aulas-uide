import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [token] = useState(searchParams.get('token') || '');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Token de recuperación no válido o inexistente.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== passwordConfirm) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await authService.resetPasswordWithToken(token, password);
            setMessage(response.mensaje);
            // Redirigir después de unos segundos
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.mensaje || 'Error al restablecer la contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md z-10">
                <div className="bg-card rounded-2xl sm:rounded-3xl shadow-xl border border-border w-full transition-colors duration-300">
                    <div className="p-8 sm:p-10">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-foreground mb-2">Nueva Contraseña</h1>
                            <p className="text-sm text-muted-foreground">
                                Define tu nueva clave para acceder al sistema
                            </p>
                        </div>

                        {message && (
                            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-sm flex items-start gap-2">
                                <span className="material-symbols-outlined text-lg flex-shrink-0">check_circle</span>
                                <span>{message}</span>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
                                <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {!message && token ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                                        Nueva Contraseña
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                            <span className="material-symbols-outlined text-xl">lock</span>
                                        </span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            minLength={8}
                                            className="w-full pl-11 pr-12 py-3 bg-muted/50 dark:bg-muted/30 border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-1"
                                        >
                                            <span className="material-symbols-outlined text-xl">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="passwordConfirm" className="block text-sm font-medium text-foreground mb-1.5">
                                        Confirmar Contraseña
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                            <span className="material-symbols-outlined text-xl">lock</span>
                                        </span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="passwordConfirm"
                                            value={passwordConfirm}
                                            onChange={(e) => setPasswordConfirm(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            minLength={8}
                                            className="w-full pl-11 pr-4 py-3 bg-muted/50 dark:bg-muted/30 border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/30 rounded-xl space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requisitos de seguridad:</p>
                                    <ul className="text-xs text-muted-foreground space-y-1 ml-1">
                                        <li className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-green-500' : ''}`}>
                                            <span className="material-symbols-outlined text-sm">{password.length >= 8 ? 'check_circle' : 'circle'}</span>
                                            Mínimo 8 caracteres
                                        </li>
                                        <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? 'text-green-500' : ''}`}>
                                            <span className="material-symbols-outlined text-sm">{/[A-Z]/.test(password) ? 'check_circle' : 'circle'}</span>
                                            Al menos una letra mayúscula
                                        </li>
                                        <li className={`flex items-center gap-1.5 ${/[a-z]/.test(password) ? 'text-green-500' : ''}`}>
                                            <span className="material-symbols-outlined text-sm">{/[a-z]/.test(password) ? 'check_circle' : 'circle'}</span>
                                            Al menos una letra minúscula
                                        </li>
                                        <li className={`flex items-center gap-1.5 ${/\d/.test(password) ? 'text-green-500' : ''}`}>
                                            <span className="material-symbols-outlined text-sm">{/\d/.test(password) ? 'check_circle' : 'circle'}</span>
                                            Al menos un número
                                        </li>
                                    </ul>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-xl transition disabled:opacity-50 shadow-lg shadow-primary/25"
                                >
                                    {loading ? 'Restableciendo...' : 'Restablecer mi Contraseña'}
                                </button>
                            </form>
                        ) : null}

                        <div className="mt-8 text-center text-sm">
                            <Link to="/login" className="text-primary font-medium hover:underline">
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
