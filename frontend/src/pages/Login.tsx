import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const REMEMBER_EMAIL_KEY = 'login_remember_email';

export default function Login() {
  const { login, loginEstudiante } = useContext(AuthContext);
  const navigate = useNavigate();
  const [mode, setMode] = useState<'docente' | 'estudiante'>('docente');
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_EMAIL_KEY) || '');
  const [password, setPassword] = useState('');
  const [cedula, setCedula] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rememberMe && email) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else if (!rememberMe) {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  }, [rememberMe, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'estudiante') {
        await loginEstudiante(cedula);
        navigate('/estudiante');
      } else {
        await login(email, password, rememberMe);
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        const user = JSON.parse(storedUser || '{}');

        // Si el usuario tiene contraseña temporal, redirigir al cambio obligatorio
        if (user.requiere_cambio_password) {
          navigate('/cambiar-password');
          return;
        }

        const rolePath: Record<string, string> = {
          admin: '/admin',
          director: '/director',
          profesor: '/profesor',
          docente: '/profesor',
          estudiante: '/estudiante',
        };
        navigate(rolePath[user.rol] || '/');
      }
    } catch (err: any) {
      let errorMessage = mode === 'estudiante' ? 'Cédula no encontrada' : 'Error al iniciar sesión';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.mensaje) {
        errorMessage = err.response.data.mensaje;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      if (!err.response) {
        setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 transition-colors duration-300 relative overflow-hidden">
      {/* Decoración de fondo sutil */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="bg-card rounded-2xl sm:rounded-3xl shadow-xl border border-border w-full max-w-sm sm:max-w-md transition-colors duration-300 relative z-10">
        <div className="p-6 sm:p-8 lg:p-10">
          {/* Logo + Título */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg shadow-primary/25">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1.5">
              {mode === 'estudiante' ? 'Portal Estudiante' : 'Panel de Administración'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Acceso Institucional Seguro
            </p>
          </div>

          {/* Toggle Docente / Estudiante */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative flex bg-muted/50 dark:bg-muted/30 border border-input rounded-xl p-1 w-full max-w-xs">
              <button
                type="button"
                onClick={() => { setMode('docente'); setError(''); }}
                className={`flex-1 py-2 px-3 text-sm font-semibold rounded-lg transition-all duration-200 ${mode === 'docente'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span className="material-symbols-outlined text-base align-middle mr-1">badge</span>
                Docente
              </button>
              <button
                type="button"
                onClick={() => { setMode('estudiante'); setError(''); }}
                className={`flex-1 py-2 px-3 text-sm font-semibold rounded-lg transition-all duration-200 ${mode === 'estudiante'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span className="material-symbols-outlined text-base align-middle mr-1">school</span>
                Estudiante
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'estudiante' ? (
              <>
                {/* Cédula para estudiantes */}
                <div>
                  <label htmlFor="cedula" className="block text-sm font-medium text-foreground mb-1.5">
                    Número de Cédula
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <span className="material-symbols-outlined text-xl">id_card</span>
                    </span>
                    <input
                      type="text"
                      id="cedula"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Ingresa tu cédula (10 dígitos)"
                      required
                      maxLength={10}
                      pattern="\d{10}"
                      className="w-full pl-11 pr-4 py-3 bg-muted/50 dark:bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-background transition outline-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                    Ingresa los 10 dígitos de tu cédula para acceder a tu portal
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Correo Institucional */}
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
                      className="w-full pl-11 pr-4 py-3 bg-muted/50 dark:bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-background transition outline-none"
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                    Contraseña
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
                      className="w-full pl-11 pr-12 py-3 bg-muted/50 dark:bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-background transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-1"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Recordarme + Olvidaste contraseña */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-input bg-muted text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-muted-foreground">Recordarme</span>
                  </label>
                  <a
                    href="/login"
                    className="text-sm font-medium text-primary hover:opacity-90 hover:underline transition"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 mt-2"
            >
              {loading
                ? (mode === 'estudiante' ? 'Verificando cédula...' : 'Iniciando sesión...')
                : (mode === 'estudiante' ? 'Acceder como Estudiante' : 'Iniciar Sesión')
              }
            </button>
          </form>

          {mode === 'docente' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                ¿No tienes cuenta?{' '}
                <a href="/register" className="text-primary font-medium hover:underline">
                  Regístrate aquí
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
