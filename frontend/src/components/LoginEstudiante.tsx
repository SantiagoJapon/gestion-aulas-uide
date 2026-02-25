import { useState } from 'react';
import api from '../services/api';

interface EstudianteData {
  id: number;
  cedula: string;
  nombre: string;
  escuela: string;
  nivel: string;
  email: string;
  edad: number | null;
  materias: any[];
}

export default function LoginEstudiante() {
  const [cedula, setCedula] = useState('');
  const [estudiante, setEstudiante] = useState<EstudianteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/api/estudiantes/login/${cedula}`);

      if (response.data.success) {
        setEstudiante(response.data.estudiante);
        sessionStorage.setItem('estudiante', JSON.stringify(response.data.estudiante));
      }
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al buscar estudiante');
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarSesion = () => {
    setEstudiante(null);
    sessionStorage.removeItem('estudiante');
    setCedula('');
  };

  if (estudiante) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 p-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-8">Bienvenido/a</h2>

          <div className="bg-card shadow-card rounded-xl p-6 mb-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Datos del Estudiante</h3>
            <div className="space-y-2 text-foreground">
              <p><strong>Nombre:</strong> {estudiante.nombre}</p>
              <p><strong>Cédula:</strong> {estudiante.cedula}</p>
              <p><strong>Email:</strong> {estudiante.email}</p>
              <p><strong>Carrera:</strong> {estudiante.escuela || 'No especificado'}</p>
              <p><strong>Nivel:</strong> {estudiante.nivel || 'No especificado'}</p>
            </div>
          </div>

          {estudiante.materias && estudiante.materias.length > 0 && (
            <div className="bg-card shadow-card rounded-xl p-6 mb-6 border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Materias Inscritas</h3>
              <ul className="space-y-2">
                {estudiante.materias.map((materia: any, index: number) => (
                  <li key={index} className="border-b border-border pb-2">
                    <strong className="text-foreground">{materia.codigo_materia}</strong> - {materia.nombre_materia}
                    <br />
                    <span className="text-sm text-muted-foreground">
                      Nivel {materia.nivel} | Paralelo {materia.paralelo}
                      {materia.aula_nombre && ` | Aula: ${materia.aula_nombre}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleCerrarSesion}
            className="w-full px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 flex items-center justify-center p-6">
      <div className="bg-card rounded-2xl shadow-card border border-border w-full max-w-md p-8">
        <h2 className="text-3xl font-bold text-foreground mb-2 text-center">Login Estudiante</h2>
        <p className="text-muted-foreground text-center mb-8">Sistema de Gestión de Aulas UIDE</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Ingresa tu Cédula
            </label>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ingrese su número de cédula"
              maxLength={10}
              className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">10 dígitos</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Buscando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
