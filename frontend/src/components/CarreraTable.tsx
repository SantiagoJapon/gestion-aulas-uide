import React, { useEffect, useState } from 'react';
import { carreraService, Carrera } from '../services/api';

const CarreraTable: React.FC = () => {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [newCarrera, setNewCarrera] = useState('');
  const [stats, setStats] = useState({ total: 0, activas: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const loadCarreras = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await carreraService.getCarreras(includeInactive);
      setCarreras(response.carreras);
      setStats({ total: response.total, activas: response.activas });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar carreras');
      console.error('Error al cargar carreras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCarreras();
  }, [includeInactive]);

  const handleAdd = async () => {
    const value = newCarrera.trim();
    if (!value) return;
    try {
      await carreraService.createCarrera(value);
      setNewCarrera('');
      loadCarreras();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear carrera');
      console.error('Error al crear carrera:', err);
    }
  };

  const handleToggle = async (carrera: Carrera, activa: boolean) => {
    try {
      await carreraService.updateCarrera(carrera.id, { activa });
      loadCarreras();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar carrera');
      console.error('Error al actualizar carrera:', err);
    }
  };

  const handleEditStart = (carrera: Carrera) => {
    setEditingId(carrera.id);
    setEditingValue(carrera.carrera);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleEditSave = async (id: number) => {
    const value = editingValue.trim();
    if (!value) return;
    try {
      await carreraService.updateCarrera(id, { carrera: value });
      setEditingId(null);
      setEditingValue('');
      loadCarreras();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar carrera');
      console.error('Error al actualizar carrera:', err);
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-6 border border-border">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-foreground">Carreras habilitadas</h3>
          <p className="text-sm text-muted-foreground">
            Activas: {stats.activas} • Total: {stats.total}
          </p>
        </div>
        <label className="flex items-center text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="mr-2"
          />
          Mostrar inactivas
        </label>
      </div>

      {error && (
        <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 mb-4 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          value={newCarrera}
          onChange={(e) => setNewCarrera(e.target.value)}
          className="flex-1 border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
          placeholder="Nueva carrera (ej: Psicología Clínica)"
        />
        <button
          onClick={handleAdd}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition"
        >
          Agregar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Cargando carreras...</p>
        </div>
      ) : carreras.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No hay carreras registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/40">
                <th className="border border-border p-3 text-left font-semibold text-muted-foreground">Carrera</th>
                <th className="border border-border p-3 text-center font-semibold text-muted-foreground">Estado</th>
                <th className="border border-border p-3 text-center font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {carreras.map((carrera) => (
                <tr key={carrera.id} className="hover:bg-muted/30">
                  <td className="border border-border p-3 font-medium">
                    {editingId === carrera.id ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="w-full border border-input rounded-lg px-3 py-1 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                      />
                    ) : (
                      carrera.carrera
                    )}
                  </td>
                  <td className="border border-border p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        carrera.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {carrera.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="border border-border p-3 text-center">
                    {editingId === carrera.id ? (
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleEditSave(carrera.id)}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="text-muted-foreground hover:text-foreground font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleEditStart(carrera)}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Editar
                        </button>
                        {carrera.activa ? (
                          <button
                            onClick={() => handleToggle(carrera, false)}
                            className="text-destructive hover:text-destructive/80 font-medium"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggle(carrera, true)}
                            className="text-primary hover:text-primary/80 font-medium"
                          >
                            Reactivar
                          </button>
                        )}
                      </div>
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

export default CarreraTable;
