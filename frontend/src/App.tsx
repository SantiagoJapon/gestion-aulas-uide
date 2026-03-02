import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import DirectorDashboard from './pages/DirectorDashboard';
import ProfesorDashboard from './pages/ProfesorDashboard';
import EstudianteDashboard from './pages/EstudianteDashboard';

import ForcePasswordChange from './pages/ForcePasswordChange';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Componente interno que usa el contexto
const AppRoutes = () => {
  const { token, user } = useContext(AuthContext);

  // Redirigir a dashboard según rol si está autenticado
  const getDefaultRoute = () => {
    if (!token || !user) return '/login';

    // Si requiere cambio de password, forzarlo sin importar el rol
    if (user.requiere_cambio_password) {
      return '/cambiar-password';
    }

    switch (user.rol) {
      case 'admin':
        return '/admin';
      case 'director':
        return '/director';
      case 'profesor':
      case 'docente':
        return '/profesor';
      case 'estudiante':
        return '/estudiante';
      default:
        return '/login';
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
        <Route
          path="/login"
          element={token ? <Navigate to={getDefaultRoute()} replace /> : <Login />}
        />
        <Route
          path="/cambiar-password"
          element={
            <ProtectedRoute allowedRoles={['admin', 'director', 'profesor', 'docente', 'estudiante']}>
              <ForcePasswordChange />
            </ProtectedRoute>
          }
        />
        <Route
          path="/register"
          element={token ? <Navigate to={getDefaultRoute()} replace /> : <Register />}
        />
        <Route
          path="/forgot-password"
          element={token ? <Navigate to={getDefaultRoute()} replace /> : <ForgotPassword />}
        />
        <Route
          path="/recuperar-password"
          element={token ? <Navigate to={getDefaultRoute()} replace /> : <ResetPassword />}
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/director"
          element={
            <ProtectedRoute allowedRoles={['director']}>
              <DirectorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profesor"
          element={
            <ProtectedRoute allowedRoles={['profesor', 'docente']}>
              <ProfesorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <EstudianteDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;






