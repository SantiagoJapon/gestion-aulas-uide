import { useState } from 'react';
import { FaTimes, FaUserPlus } from 'react-icons/fa';

interface CreateDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateDirectorModal = ({ isOpen, onClose, onSuccess }: CreateDirectorModalProps) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implementar lógica de creación
    setTimeout(() => {
      setLoading(false);
      onClose();
      if (onSuccess) onSuccess();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <FaUserPlus className="mr-2 text-primary" />
            Nuevo Director
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-center text-gray-500 py-4">
            Funcionalidad de creación de directores en desarrollo.
          </p>
          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
