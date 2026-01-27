import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { estudianteService } from '../services/api';

export default function Register() {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    passwordConfirm: '',
    rol: 'estudiante' as 'admin' | 'director' | 'profesor' | 'estudiante' | 'docente',
    cedula: '',
    telefono: '',
  });
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState({
    loading: false,
    found: false,
    message: ''
  });
  const [autoFillEmail, setAutoFillEmail] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('@uide.edu.ec');
  };

  const splitNombreCompleto = (nombreCompleto: string) => {
    const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) {
      return { nombre: '', apellido: '' };
    }
    if (partes.length === 1) {
      return { nombre: partes[0], apellido: 'No Registrado' };
    }
    const nombre = partes[0];
    const apellido = partes.slice(1).join(' ');
    return { nombre, apellido };
  };

  useEffect(() => {
    const email = formData.email.trim().toLowerCase();

    if (!email || !validateEmail(email) || formData.rol !== 'estudiante') {
      setLookupStatus({ loading: false, found: false, message: '' });
      return;
    }

    if (autoFillEmail === email && lookupStatus.found) {
      return;
    }

    const timer = setTimeout(async () => {
      setLookupStatus({ loading: true, found: false, message: '' });

      try {
        const response = await estudianteService.lookupByEmail(email);

        if (!response.found || !response.estudiante) {
          setLookupStatus({
            loading: false,
            found: false,
            message: 'No se encontró al estudiante en la base de datos.'
          });
          return;
        }

        const { nombre: nombreCompleto, cedula } = response.estudiante;
        const { nombre, apellido } = splitNombreCompleto(nombreCompleto || '');

        setFormData((prev) => {
          const shouldOverwrite = !prev.nombre || !prev.apellido || autoFillEmail === email;
          if (!shouldOverwrite) {
            return prev;
          }
          return {
            ...prev,
            nombre: nombre || prev.nombre,
            apellido: apellido || prev.apellido,
            cedula: cedula || prev.cedula
          };
        });

        setAutoFillEmail(email);
        setLookupStatus({
          loading: false,
          found: true,
          message: 'Datos del estudiante cargados desde la base.'
        });
      } catch (err) {
        setLookupStatus({
          loading: false,
          found: false,
          message: 'No se pudo consultar la base de estudiantes.'
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email, formData.rol, autoFillEmail, lookupStatus.found]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value,
    });

    // Validar email en tiempo real
    if (name === 'email') {
      if (value && !validateEmail(value)) {
        setEmailError('Debe usar el correo institucional (@uide.edu.ec). No se permiten otros correos como Gmail.');
      } else {
        setEmailError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    // Validación de email institucional
    if (!formData.email) {
      setEmailError('El correo electrónico es obligatorio');
      return;
    }

    if (!validateEmail(formData.email)) {
      setEmailError('Debe usar el correo institucional (@uide.edu.ec). No se permiten otros correos como Gmail.');
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('La contraseña debe contener al menos una mayúscula, una minúscula y un número');
      return;
    }

    setLoading(true);

    try {
      const { passwordConfirm, ...registerData } = formData;
      await register(registerData);
      // Redirigir según el rol
      const rolePath: Record<string, string> = {
        admin: '/admin',
        director: '/director',
        profesor: '/profesor',
        docente: '/profesor',
        estudiante: '/estudiante',
      };
      navigate(rolePath[formData.rol] || '/');
    } catch (err: any) {
      console.error('Error completo al registrar:', err);
      console.error('Response data:', err.response?.data);
      
      // Extraer mensaje de error más detallado
      let errorMessage = 'Error al registrar usuario';
      let errorDetails: string[] = [];
      
      if (err.response?.data) {
        const data = err.response.data;
        
        // Si hay errores de validación detallados
        if (data.detalles && Array.isArray(data.detalles)) {
          errorDetails = data.detalles.map((d: any) => {
            const campo = d.campo || d.path || 'campo';
            const mensaje = d.mensaje || d.message || 'Error de validación';
            return `• ${campo}: ${mensaje}`;
          });
          errorMessage = 'Errores de validación:\n' + errorDetails.join('\n');
        } else if (data.detalles && typeof data.detalles === 'string') {
          errorMessage = data.detalles;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.mensaje) {
          errorMessage = data.mensaje;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Si el error es de conexión, mostrar mensaje más específico
      if (!err.response) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en http://localhost:3000';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-6">
      <div className="bg-card rounded-2xl shadow-card border border-border w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Registro de Usuario</h1>
          <p className="text-muted-foreground">Sistema de Gestión de Aulas UIDE</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 mb-6 rounded-lg animate-fade-in">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-destructive mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-medium mb-2">Error al registrar</p>
                <div className="text-sm whitespace-pre-line">
                  {error.split('\n').map((line, idx) => (
                    <p key={idx} className={idx === 0 ? 'font-semibold' : ''}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-muted-foreground mb-2">
                Nombre *
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="apellido" className="block text-sm font-medium text-muted-foreground mb-2">
                Apellido *
              </label>
              <input
                type="text"
                id="apellido"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">
              Email Institucional *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="usuario@uide.edu.ec"
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                emailError 
                  ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                  : formData.email && validateEmail(formData.email)
                  ? 'border-green-500 focus:ring-green-500 bg-green-50'
                  : 'border-input focus:ring-ring bg-background'
              }`}
            />
            {emailError && (
              <div className="mt-2 p-3 bg-destructive/10 border-l-4 border-destructive rounded">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-destructive mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      {emailError}
                    </p>
                    <p className="text-xs text-destructive/80 mt-1">
                      Solo se aceptan correos que terminen en <strong>@uide.edu.ec</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
            {formData.email && validateEmail(formData.email) && !emailError && (
              <div className="mt-2 flex items-center text-green-600 text-sm">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Correo institucional válido
              </div>
            )}
            {lookupStatus.message && (
              <div
                className={`mt-2 text-sm ${
                  lookupStatus.loading
                    ? 'text-yellow-700'
                    : lookupStatus.found
                    ? 'text-green-700'
                    : 'text-gray-600'
                }`}
              >
                {lookupStatus.loading ? 'Consultando base de estudiantes...' : lookupStatus.message}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-2">
                Contraseña *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mínimo 8 caracteres, mayúscula, minúscula y número
              </p>
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-muted-foreground mb-2">
                Confirmar Contraseña *
              </label>
              <input
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rol" className="block text-sm font-medium text-muted-foreground mb-2">
                Rol *
              </label>
              <select
                id="rol"
                name="rol"
                value={formData.rol}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="estudiante">Estudiante</option>
                <option value="profesor">Profesor</option>
                <option value="director">Director</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label htmlFor="cedula" className="block text-sm font-medium text-muted-foreground mb-2">
                Cédula (opcional)
              </label>
              <input
                type="text"
                id="cedula"
                name="cedula"
                value={formData.cedula}
                onChange={handleChange}
                maxLength={10}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-muted-foreground mb-2">
              Teléfono (opcional)
            </label>
            <input
              type="text"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!emailError || !validateEmail(formData.email)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
          {emailError && (
            <p className="text-xs text-destructive text-center mt-2">
              No puedes registrarte hasta que uses un correo institucional válido
            </p>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-primary hover:underline font-medium">
              Inicia sesión aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}






