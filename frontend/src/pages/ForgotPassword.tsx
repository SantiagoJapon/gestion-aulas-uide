import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await authService.forgotPassword(email);
            setMessage(response.mensaje);
        } catch (err: any) {
            setError(err.response?.data?.mensaje || 'Error al procesar la solicitud');
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
                            <h1 className="text-2xl font-bold text-foreground mb-2">Recuperar Contraseña</h1>
                            <p className="text-sm text-muted-foreground">
                                Ingresa tu correo institucional para recibir instrucciones
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

                        {!message ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                                        Correo Institucional
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                            <span className="material-symbols-outlined text-xl">mail</span>
                                        </span>
                                        <input
                                            type="email"
                                            id="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="usuario@uide.edu.ec"
                                            required
                                            className="w-full pl-11 pr-4 py-3 bg-muted/50 dark:bg-muted/30 border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-xl transition disabled:opacity-50 shadow-lg shadow-primary/25"
                                >
                                    {loading ? 'Procesando...' : 'Enviar Instrucciones'}
                                </button>
                            </form>
                        ) : null}

                        <div className="mt-8 text-center text-sm">
                            <Link to="/login" className="text-primary font-medium hover:underline flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-base">arrow_back</span>
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
