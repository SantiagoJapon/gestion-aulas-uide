import { useState, useEffect } from 'react';
import { FaTimes, FaUserPlus, FaSave, FaTrash } from 'react-icons/fa';
import { usuarioService, User } from '../services/api';

interface DirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  directorToEdit?: User | null; // If null, mode is CREATE
}

export const DirectorModal = ({ isOpen, onClose, onSuccess, directorToEdit }: DirectorModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (directorToEdit) {
      setFormData({
        nombre: directorToEdit.nombre || '',
        apellido: directorToEdit.apellido || '',
        email: directorToEdit.email || '',
        password: '', // Password mostly handled separately or optionally
        telefono: directorToEdit.telefono || ''
      });
    } else {
      // Reset for Create mode
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        telefono: ''
      });
    }
    setError(null);
  }, [directorToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (directorToEdit) {
        // Update
        await usuarioService.updateDirector(directorToEdit.id, formData);
      } else {
        // Create
        if (!formData.password) {
          setError("La contraseña es obligatoria para nuevos usuarios.");
          setLoading(false);
          return;
        }
        await usuarioService.createDirector(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.mensaje || err.message || 'Error al guardar director.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            {directorToEdit ? (
              <>
                <span className="material-symbols-outlined mr-2 text-uide-blue">edit</span>
                Editar Director
              </>
            ) : (
              <>
                <span className="material-symbols-outlined mr-2 text-uide-blue">person_add</span>
                Nuevo Director
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
              <input
                required
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-uide-blue"
                placeholder="Ej. Juan"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apellido</label>
              <input
                required
                type="text"
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-uide-blue"
                placeholder="Ej. Pérez"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Institucional</label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-uide-blue"
              placeholder="juan.perez@uide.edu.ec"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              {directorToEdit ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
            </label>
            <input
              required={!directorToEdit}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-uide-blue"
              placeholder={directorToEdit ? "Dejar en blanco para mantener actual" : "********"}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
            <input
              type="text"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-uide-blue"
              placeholder="099..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-uide-blue text-white rounded-lg text-sm font-bold shadow-md hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <FaSave />
              )}
              {directorToEdit ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
