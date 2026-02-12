import { createContext, useState, useEffect, ReactNode } from 'react';
import { authService, estudianteService, User } from '../services/api';

interface RegisterData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol?: 'admin' | 'director' | 'profesor' | 'estudiante' | 'docente';
  cedula?: string;
  telefono?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginEstudiante: (cedula: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token') || sessionStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Cargar usuario al iniciar si hay token
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          // Verificar que el token sigue siendo válido
          const profile = await authService.getProfile();
          setUser(profile.usuario);

          // Actualizar en el storage que corresponda
          if (localStorage.getItem('token')) {
            localStorage.setItem('user', JSON.stringify(profile.usuario));
          } else {
            sessionStorage.setItem('user', JSON.stringify(profile.usuario));
          }
        } catch (error) {
          // Token inválido, limpiar
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await authService.login(email, password, rememberMe);
      setToken(response.token);
      setUser(response.usuario);

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', response.token);
      storage.setItem('user', JSON.stringify(response.usuario));

      // Si no es recordado, nos aseguramos de que no haya restos en localStorage
      if (!rememberMe) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (error: any) {
      // Pasar el error completo para que el componente pueda acceder a response.data
      if (error.response) {
        // Si hay respuesta del servidor, lanzar el error con toda la información
        const errorWithResponse = new Error(error.response?.data?.error || 'Error al iniciar sesión');
        (errorWithResponse as any).response = error.response;
        throw errorWithResponse;
      } else {
        // Si no hay respuesta (error de red), lanzar error genérico
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
      }
    }
  };

  const loginEstudiante = async (cedula: string) => {
    try {
      const response = await estudianteService.loginByCedula(cedula);
      setToken(response.token);
      setUser(response.usuario);
      sessionStorage.setItem('token', response.token);
      sessionStorage.setItem('user', JSON.stringify(response.usuario));
    } catch (error: any) {
      if (error.response) {
        const errorWithResponse = new Error(error.response?.data?.mensaje || 'Estudiante no encontrado');
        (errorWithResponse as any).response = error.response;
        throw errorWithResponse;
      } else {
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
      }
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await authService.register(data);
      setToken(response.token);
      setUser(response.usuario);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.usuario));
    } catch (error: any) {
      // Pasar el error completo para que el componente pueda acceder a response.data
      if (error.response) {
        // Si hay respuesta del servidor, lanzar el error con toda la información
        const errorWithResponse = new Error(error.response?.data?.error || 'Error al registrar usuario');
        (errorWithResponse as any).response = error.response;
        throw errorWithResponse;
      } else {
        // Si no hay respuesta (error de red), lanzar error genérico
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
      }
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    if (localStorage.getItem('token')) {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } else {
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginEstudiante,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

