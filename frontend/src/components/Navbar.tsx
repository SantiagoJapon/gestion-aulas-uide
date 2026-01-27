import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  FaHome, 
  FaBuilding, 
  FaFileUpload, 
  FaCalendarAlt, 
  FaSearch,
  FaSignOutAlt,
  FaUser,
  FaBars,
  FaTimes
} from 'react-icons/fa';

export const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/';
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
        return '/';
    }
  };

  const getNavLinks = () => {
    if (!user) return [];
    
    const baseLinks = [
      { to: getDashboardPath(), label: 'Dashboard', icon: FaHome },
    ];

    switch (user.rol) {
      case 'admin':
        return [
          ...baseLinks,
          { to: '/admin/aulas', label: 'Aulas', icon: FaBuilding },
        ];
      case 'director':
        return [
          ...baseLinks,
          { to: '/director/planificaciones', label: 'Planificaciones', icon: FaFileUpload },
        ];
      case 'profesor':
      case 'docente':
        return [
          ...baseLinks,
          { to: '/profesor/horario', label: 'Mi Horario', icon: FaCalendarAlt },
        ];
      case 'estudiante':
        return [
          ...baseLinks,
          { to: '/estudiante/buscar', label: 'Buscar Aulas', icon: FaSearch },
          { to: '/estudiante/reservas', label: 'Mis Reservas', icon: FaCalendarAlt },
        ];
      default:
        return baseLinks;
    }
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-card/95 text-foreground border-b border-border sticky top-0 z-50 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo y Links Desktop */}
          <div className="flex items-center space-x-8">
            <Link
              to={getDashboardPath()}
              className="text-lg font-semibold hover:text-primary transition-colors flex items-center gap-2"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <FaBuilding className="text-lg" />
              </span>
              <div className="leading-tight">
                <div className="text-foreground">UIDE Loja</div>
                <div className="text-xs text-muted-foreground">Gestión de Aulas</div>
              </div>
            </Link>
            
            {/* Links Desktop */}
            <div className="hidden md:flex space-x-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
                  >
                    <Icon className="text-sm" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Info y Logout Desktop */}
          {user && (
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-muted px-4 py-2 rounded-lg">
                <FaUser className="text-sm text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {user.nombre} {user.apellido}
                </span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {user.rol}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <FaSignOutAlt />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          {user && (
            <button
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <FaTimes className="text-2xl" /> : <FaBars className="text-2xl" />}
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden border-t border-border py-4 animate-fade-in">
            <div className="space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Icon />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              <div className="border-t border-border pt-4 mt-4">
                <div className="px-4 py-2 flex items-center space-x-2 text-muted-foreground">
                  <FaUser />
                  <span className="text-sm">
                    {user.nombre} {user.apellido}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <FaSignOutAlt />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};






