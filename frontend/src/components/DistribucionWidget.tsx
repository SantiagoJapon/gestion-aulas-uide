import React, { useEffect, useState } from 'react';
import { distribucionService } from '../services/api';

interface EstadoDistribucion {
  success: boolean;
  estadisticas: {
    total_clases: number;
    clases_asignadas: number;
    clases_pendientes: number;
    total_carreras: number;
    porcentaje_completado: number;
  };
  carreras: Array<{
    id: number;
    nombre_carrera: string;
    estado: string;
    total_clases: number;
    clases_asignadas: number;
    clases_pendientes: number;
    porcentaje_completado: number;
    director_nombre: string | null;
    director_email: string | null;
  }>;
  timestamp: string;
}

const DistribucionWidget: React.FC = () => {
  const [estado, setEstado] = useState<EstadoDistribucion | null>(null);
  const [loading, setLoading] = useState(false);
  const [n8nDisponible, setN8nDisponible] = useState(true);

  useEffect(() => {
    fetchEstado();
    const interval = setInterval(fetchEstado, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEstado = async () => {
    try {
      const data = await distribucionService.getEstado();
      if (data === null) {
        // n8n no está disponible
        setN8nDisponible(false);
        setEstado(null);
      } else {
        setEstado(data);
        setN8nDisponible(true);
      }
    } catch (error: any) {
      // Error inesperado (no relacionado con n8n)
      setN8nDisponible(false);
      setEstado(null);
    }
  };

  const handleForzarDistribucion = async () => {
    if (!window.confirm('¿Seguro que deseas ejecutar la distribución ahora?')) return;

    setLoading(true);
    try {
      const result = await distribucionService.forzarDistribucion();
      window.alert(result?.mensaje || 'Distribución ejecutada');
      fetchEstado();
    } catch (error) {
      window.alert('Error al ejecutar distribución');
    } finally {
      setLoading(false);
    }
  };

  if (!estado && !n8nDisponible) {
    return (
      <div className="bg-card rounded-xl shadow-card p-6 border border-border">
        <div className="text-center py-6">
          <p className="text-muted-foreground mb-2">
            Widget de Distribución Automática
          </p>
          <p className="text-sm text-muted-foreground/70">
            (Requiere configuración de n8n - Opcional)
          </p>
        </div>
      </div>
    );
  }

  if (!estado && n8nDisponible) {
    return (
      <div className="bg-card rounded-xl shadow-card p-6 border border-border">
        <p className="text-muted-foreground">Cargando estado de distribución...</p>
      </div>
    );
  }

  // Type guard: ensure estado is not null before rendering
  if (!estado) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl shadow-card p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-foreground">Estado de Distribución</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-border rounded-lg p-4 bg-muted/20">
          <p className="text-sm text-muted-foreground mb-1">Carreras Activas</p>
          <p className="text-2xl font-bold text-foreground">
            {estado.estadisticas.total_carreras}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            En el sistema
          </p>
        </div>

        <div className="border border-border rounded-lg p-4 bg-muted/20">
          <p className="text-sm text-muted-foreground mb-1">Clases Asignadas</p>
          <p className="text-2xl font-bold text-foreground">
            {estado.estadisticas.clases_asignadas} / {estado.estadisticas.total_clases}
          </p>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${estado.estadisticas.porcentaje_completado}%` }}
            />
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 bg-muted/20">
          <p className="text-sm text-muted-foreground mb-1">Clases Pendientes</p>
          <p className="text-2xl font-bold text-foreground">
            {estado.estadisticas.clases_pendientes}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Sin aula asignada
          </p>
        </div>
      </div>

      <div className="border border-border rounded-lg p-4 mb-6">
        <h4 className="text-lg font-semibold text-foreground mb-3">Detalle por Carrera</h4>
        <div className="space-y-2">
          {estado.carreras.map((carrera) => (
            <div key={carrera.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{carrera.nombre_carrera}</p>
                {carrera.director_nombre && (
                  <p className="text-xs text-muted-foreground">
                    Director: {carrera.director_nombre}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {carrera.clases_asignadas} / {carrera.total_clases}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {carrera.porcentaje_completado}% asignado
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    carrera.porcentaje_completado === 100 
                      ? 'bg-green-100 text-green-800' 
                      : carrera.porcentaje_completado > 0
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {carrera.porcentaje_completado === 100 
                    ? 'Completo' 
                    : carrera.porcentaje_completado > 0
                    ? 'En proceso'
                    : 'Pendiente'
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {estado.estadisticas.porcentaje_completado === 100 ? (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4">
          ✅ Todas las clases tienen aulas asignadas
        </div>
      ) : estado.estadisticas.porcentaje_completado > 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded-lg mb-4">
          ⏳ {estado.estadisticas.clases_pendientes} clases pendientes de asignar ({estado.estadisticas.porcentaje_completado}% completado)
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg mb-4">
          📋 Listo para comenzar la distribución
        </div>
      )}

      <button
        onClick={handleForzarDistribucion}
        disabled={loading}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition disabled:opacity-60"
      >
        {loading ? 'Ejecutando...' : '🚀 Forzar Distribución Ahora'}
      </button>
    </div>
  );
};

export default DistribucionWidget;
