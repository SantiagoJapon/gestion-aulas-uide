import { createContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/api';

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
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Cargar usuario al iniciar si hay token
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          // Verificar que el token sigue siendo válido
          const profile = await authService.getProfile();
          setUser(profile.usuario);
          localStorage.setItem('user', JSON.stringify(profile.usuario));
        } catch (error) {
          // Token inválido, limpiar
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      setToken(response.token);
      setUser(response.usuario);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.usuario));
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
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

