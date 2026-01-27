import React, { useEffect, useState } from 'react';
import { distribucionService, usuarioService, User } from '../services/api';

interface CarreraConfig {
  id: number;
  nombre_carrera: string;
  estado: string;
}

const DirectorAssignmentTable: React.FC = () => {
  const [directores, setDirectores] = useState<User[]>([]);
  const [carreras, setCarreras] = useState<CarreraConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [directoresRes, distribucionRes] = await Promise.all([
        usuarioService.getDirectores(),
        distribucionService.getEstado(),
      ]);
      setDirectores(directoresRes.usuarios || []);
      setCarreras(distribucionRes?.carreras || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar directores');
      console.error('Error al cargar directores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAsignar = async (directorId: number, carrera: string | null) => {
    try {
      await usuarioService.updateDirectorCarrera(directorId, carrera);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al asignar carrera');
      console.error('Error al asignar carrera:', err);
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-foreground">Asignar directores por carrera</h3>
      </div>

      {error && (
        <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 mb-4 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Cargando directores...</p>
        </div>
      ) : directores.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No hay directores registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/40">
                <th className="border border-border p-3 text-left font-semibold text-muted-foreground">Director</th>
                <th className="border border-border p-3 text-left font-semibold text-muted-foreground">Email</th>
                <th className="border border-border p-3 text-left font-semibold text-muted-foreground">Carrera asignada</th>
              </tr>
            </thead>
            <tbody>
              {directores.map((director) => (
                <tr key={director.id} className="hover:bg-muted/30">
                  <td className="border border-border p-3 font-medium">
                    {director.nombre} {director.apellido}
                  </td>
                  <td className="border border-border p-3">{director.email}</td>
                  <td className="border border-border p-3">
                    {director.carrera_nombre ? (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{director.carrera_nombre}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          (ID: {director.carrera_director})
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Sin asignar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DirectorAssignmentTable;
