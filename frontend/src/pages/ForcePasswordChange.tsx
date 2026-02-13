import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/api';
import { Button } from '../components/common/Button';
import { FaLock, FaShieldAlt } from 'react-icons/fa';

export default function ForcePasswordChange() {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            // Usamos la misma clave temporal que se les asignó 'uide2024' como passwordActual
            // Si el backend lo cambió, esto fallará, pero es el valor por defecto solicitado.
            await authService.changePassword('uide2024', password);

            // Actualizar el estado local para quitar el flag de requiere_cambio_password
            // Lo más fácil es desloguear y pedir que entre con la nueva clave para asegurar consistencia
            alert('Contraseña actualizada con éxito. Por favor inicia sesión con tu nueva contraseña.');
            logout();
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al cambiar la contraseña. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-border w-full max-w-md overflow-hidden p-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary text-white mb-6 shadow-xl shadow-primary/20">
                        <FaShieldAlt className="text-4xl" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Seguridad de Cuenta</h1>
                    <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto">
                        Por ser tu primer ingreso con una clave temporal, debes establecer una contraseña personal.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold flex items-center gap-3 animate-shake">
                        <span className="material-symbols-outlined">error</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                        <div className="relative">
                            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                                type="password"
                                required
                                placeholder="Mínimo 6 caracteres"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none font-bold transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                        <div className="relative">
                            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                                type="password"
                                required
                                placeholder="Repite tu nueva contraseña"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none font-bold transition-all"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                            loading={loading}
                        >
                            Actualizar Contraseña
                        </Button>

                        <button
                            type="button"
                            onClick={() => { logout(); navigate('/login'); }}
                            className="w-full mt-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors"
                        >
                            Cancelar y Salir
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
