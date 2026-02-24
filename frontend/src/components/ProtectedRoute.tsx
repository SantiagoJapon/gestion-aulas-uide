import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { token, user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  // Si el usuario tiene contraseña temporal, forzar el cambio antes de acceder a cualquier dashboard
  if (user?.requiere_cambio_password && window.location.pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />;
  }

  return <>{children}</>;
};






