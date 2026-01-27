import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Redirigir según el rol (se hará en AuthContext o aquí)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const rolePath: Record<string, string> = {
        admin: '/admin',
        director: '/director',
        profesor: '/profesor',
        docente: '/profesor',
        estudiante: '/estudiante',
      };
      navigate(rolePath[user.rol] || '/');
    } catch (err: any) {
      console.error('Error completo al iniciar sesión:', err);
      
      // Extraer mensaje de error más detallado
      let errorMessage = 'Error al iniciar sesión';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.detalles) {
        // Si hay errores de validación detallados
        const detalles = Array.isArray(err.response.data.detalles) 
          ? err.response.data.detalles.map((d: any) => d.mensaje || d.message).join(', ')
          : err.response.data.detalles;
        errorMessage = `Errores de validación: ${detalles}`;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.mensaje) {
        errorMessage = err.response.data.mensaje;
      }
      
      setError(errorMessage);
      
      // Si el error es de conexión, mostrar mensaje más específico
      if (!err.response) {
        setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-6">
      <div className="bg-card rounded-2xl shadow-card border border-border w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Iniciar Sesión</h1>
          <p className="text-muted-foreground">Sistema de Gestión de Aulas UIDE</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 mb-6 rounded-lg animate-fade-in">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-destructive mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-medium mb-1">Error al iniciar sesión</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">
              Email Institucional
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@uide.edu.ec"
              required
              className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-2">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <a href="/register" className="text-primary hover:underline font-medium">
              Regístrate aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}






