import React, { useEffect, useState } from 'react';
import { carreraService, Carrera } from '../services/api';
import { FaPlus, FaEdit, FaCheck, FaTimes, FaToggleOn, FaToggleOff } from 'react-icons/fa';

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

  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const value = newCarrera.trim();
    if (!value || adding) return;
    try {
      setAdding(true);
      setError(null);
      console.log('Creando carrera:', value);
      const result = await carreraService.createCarrera(value);
      console.log('Carrera creada:', result);
      setNewCarrera('');
      await loadCarreras();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Error al crear carrera';
      setError(errorMsg);
      console.error('Error al crear carrera:', err.response?.status, err.response?.data || err.message);
    } finally {
      setAdding(false);
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
    <div className="bg-transparent rounded-2xl border-none animate-fade-in">
      {/* Header simplificado */}
      <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">
            Activas: <span className="text-primary">{stats.activas}</span> • Total: {stats.total}
          </p>
        </div>
        <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 cursor-pointer hover:text-primary transition-colors">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          Mostrar inactivas
        </label>
      </div>

      {error && (
        <div className="mx-6 mt-6 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
          <FaTimes />
          {error}
        </div>
      )}

      {/* Input de Registro */}
      <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row gap-3 border-b border-slate-50 dark:border-slate-800">
        <input
          type="text"
          value={newCarrera}
          onChange={(e) => setNewCarrera(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-2 focus:ring-uide-blue/20 outline-none"
          placeholder="Nombre de la nueva carrera..."
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newCarrera.trim()}
          className="bg-uide-blue text-white font-black py-3 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-uide-blue/10 flex items-center justify-center gap-2 text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {adding ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          ) : (
            <FaPlus />
          )}
          <span className="hidden sm:inline">{adding ? 'Creando...' : 'Agregar'}</span>
        </button>
      </div>

      {/* Grid de Carreras */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-[3px] border-slate-100 border-t-uide-blue"></div>
        </div>
      ) : carreras.length === 0 ? (
        <div className="p-12 text-center text-slate-400 font-bold text-sm">
          No hay carreras registradas
        </div>
      ) : (
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {carreras.map((carrera) => (
            <div key={carrera.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors flex items-center justify-between group">
              <div className="flex-1 min-w-0 pr-4">
                {editingId === carrera.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditSave(carrera.id)}
                      autoFocus
                      className="w-full border border-uide-blue/30 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-2 focus:ring-uide-blue/20 outline-none"
                    />
                    <button onClick={() => handleEditSave(carrera.id)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg"><FaCheck /></button>
                    <button onClick={handleEditCancel} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><FaTimes /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className={`w-1.5 h-1.5 rounded-full ${carrera.activa ? 'bg-uide-blue shadow-sm shadow-uide-blue/50' : 'bg-slate-300'}`}></span>
                    <span className={`text-sm font-bold truncate ${carrera.activa ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through decoration-2'}`}>
                      {carrera.carrera}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                {editingId !== carrera.id && (
                  <>
                    <button
                      onClick={() => handleEditStart(carrera)}
                      className="p-2.5 text-slate-400 hover:text-uide-blue hover:bg-uide-blue/5 rounded-xl transition-all"
                      title="Editar nombre"
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleToggle(carrera, !carrera.activa)}
                      className={`p-2.5 rounded-xl transition-all ${carrera.activa
                        ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                        : 'text-slate-400 hover:text-uide-blue hover:bg-uide-blue/5'
                        }`}
                      title={carrera.activa ? 'Desactivar' : 'Reactivar'}
                    >
                      {carrera.activa ? <FaToggleOn size={18} /> : <FaToggleOff size={18} />}
                    </button>
                  </>
                )}
              </div>

              {/* Mobile Status Indicator (always visible) */}
              <div className="sm:hidden ml-2">
                {!carrera.activa && <span className="text-[8px] font-black uppercase text-red-400 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Baja</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CarreraTable;
