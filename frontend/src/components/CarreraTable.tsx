import React, { useEffect, useState, useMemo } from 'react';
import { carreraService, Carrera } from '../services/api';
import { FaPlus, FaEdit, FaCheck, FaTimes, FaToggleOn, FaToggleOff, FaSearch, FaTrash, FaExclamationCircle } from 'react-icons/fa';
import { Button } from './common/Button';

const CarreraTable: React.FC = () => {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [newCarrera, setNewCarrera] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, activas: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [adding, setAdding] = useState(false);

  const loadCarreras = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await carreraService.getCarreras(includeInactive);
      setCarreras(response.carreras || []);
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
    if (!value || adding) return;
    try {
      setAdding(true);
      setError(null);
      const result = await carreraService.createCarrera(value);
      if (result.success) {
        setNewCarrera('');
        await loadCarreras();
        window.dispatchEvent(new CustomEvent('carrera-modified'));
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Error al crear carrera';
      setError(errorMsg);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (carrera: Carrera, activa: boolean) => {
    try {
      const res = await carreraService.updateCarrera(carrera.id, { activa });
      if (res.success) {
        loadCarreras();
        window.dispatchEvent(new CustomEvent('carrera-modified'));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar carrera');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de ELIMINAR esta carrera permanentemente? Esta acción borrará el registro de la base de datos. Si solo desea ocultarla, use el interruptor de activación lateral.')) return;
    try {
      const res = await carreraService.deleteCarrera(id);
      if (res.success) {
        loadCarreras();
        window.dispatchEvent(new CustomEvent('carrera-modified'));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar carrera');
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
      const res = await carreraService.updateCarrera(id, { carrera: value });
      if (res.success) {
        setEditingId(null);
        setEditingValue('');
        loadCarreras();
        window.dispatchEvent(new CustomEvent('carrera-modified'));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar carrera');
    }
  };

  const filteredCarreras = useMemo(() => {
    return carreras.filter(c =>
      c.carrera.toLowerCase().includes(search.toLowerCase())
    );
  }, [carreras, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Registro e Información */}
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        <div className="w-full md:flex-1 space-y-4">
          <div className="relative group">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Buscar carrera..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-sm shadow-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newCarrera}
              onChange={(e) => setNewCarrera(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3.5 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="Nombre de la nueva carrera..."
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newCarrera.trim()}
              className="bg-primary text-white font-black py-3.5 px-8 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <FaPlus />
              )}
              {adding ? 'Registrando...' : 'Agregar Carrera'}
            </button>
          </div>
        </div>

        <div className="w-full md:w-auto p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4 min-w-[200px]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Global</p>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                {stats.activas} Activas
              </span>
            </div>
          </div>

          <label className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-primary transition-colors select-none">
            <div className={`relative w-9 h-5 rounded-full transition-colors ${includeInactive ? 'bg-primary' : 'bg-slate-300'}`}>
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="sr-only"
              />
              <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${includeInactive ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            Mostrar Histórico
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in zoom-in-95">
          <FaExclamationCircle className="text-lg" />
          {error}
        </div>
      )}

      {/* Listado de Carreras */}
      <div className="bg-white dark:bg-black/20 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-[3px] border-slate-100 border-t-primary"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando estructura...</p>
          </div>
        ) : filteredCarreras.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="size-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300 mb-2">
              <span className="material-symbols-outlined text-4xl">inventory_2</span>
            </div>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-tight">No se encontraron resultados</p>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setIncludeInactive(true); }}>Ver todas</Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-900">
            {filteredCarreras.map((carrera) => (
              <div key={carrera.id} className="p-4 sm:p-6 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                <div className="flex-1 min-w-0 pr-4">
                  {editingId === carrera.id ? (
                    <div className="flex gap-2 items-center animate-in slide-in-from-left-2">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditSave(carrera.id)}
                        autoFocus
                        className="w-full border border-primary/30 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none"
                      />
                      <button onClick={() => handleEditSave(carrera.id)} className="size-10 flex items-center justify-center bg-emerald-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-transform"><FaCheck /></button>
                      <button onClick={handleEditCancel} className="size-10 flex items-center justify-center bg-slate-200 text-slate-600 rounded-xl hover:scale-105 active:scale-95 transition-transform"><FaTimes /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-2xl flex items-center justify-center font-black text-sm border shadow-sm transition-colors ${carrera.activa
                        ? 'bg-primary/5 text-primary border-primary/10'
                        : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {carrera.carrera[0]}
                      </div>
                      <div>
                        <p className={`text-sm font-bold tracking-tight transition-colors ${carrera.activa ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through decoration-2 opacity-60'}`}>
                          {carrera.carrera}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${carrera.activa ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {carrera.activa ? 'Vigente' : 'Inactiva'}
                          </span>
                          {carrera.activa && <span className="size-1 bg-emerald-500 rounded-full animate-pulse" />}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingId !== carrera.id && (
                    <>
                      <button
                        onClick={() => handleEditStart(carrera)}
                        className="size-10 flex items-center justify-center bg-white dark:bg-slate-900 text-slate-400 hover:text-primary hover:border-primary/20 border border-slate-100 dark:border-slate-800 rounded-xl transition-all hover:shadow-lg active:scale-90"
                        title="Editar nombre"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleToggle(carrera, !carrera.activa)}
                        className={`size-10 flex items-center justify-center rounded-xl transition-all border shadow-sm active:scale-90 hover:shadow-md ${carrera.activa
                          ? 'bg-white dark:bg-slate-900 text-slate-400 hover:text-amber-500 border-slate-100 dark:border-slate-800'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}
                        title={carrera.activa ? 'Desactivar' : 'Reactivar'}
                      >
                        {carrera.activa ? <FaToggleOn size={18} /> : <FaToggleOff size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete(carrera.id)}
                        className="size-10 flex items-center justify-center bg-white dark:bg-slate-900 text-slate-400 hover:text-red-500 hover:border-red-200 border border-slate-100 dark:border-slate-800 rounded-xl transition-all hover:shadow-lg active:scale-90"
                        title="Eliminar permanentemente"
                      >
                        <FaTrash size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarreraTable;
