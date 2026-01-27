import { useState } from 'react';
import { distribucionService } from '../services/api';
import { FaPlayCircle, FaCheckCircle, FaTrash, FaSpinner } from 'react-icons/fa';

interface EjecutarDistribucionProps {
  onDistribucionCompletada?: () => void;
}

export default function EjecutarDistribucion({ onDistribucionCompletada }: EjecutarDistribucionProps) {
  const [loading, setLoading] = useState(false);
  const [limpiando, setLimpiando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');

  const handleEjecutarDistribucion = async () => {
    if (!confirm('¿Ejecutar la distribución automática de aulas?\n\nEsto asignará aulas a todas las clases según la disponibilidad y restricciones.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResultado(null);

      const response = await distribucionService.ejecutarDistribucion();
      
      setResultado(response);
      
      if (response.success) {
        setTimeout(() => {
          if (onDistribucionCompletada) {
            onDistribucionCompletada();
          }
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al ejecutar distribución');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiarDistribucion = async () => {
    if (!confirm('¿Limpiar todas las asignaciones de aulas?\n\nEsto eliminará TODAS las distribuciones actuales.')) {
      return;
    }

    try {
      setLimpiando(true);
      setError('');
      setResultado(null);

      await distribucionService.limpiarDistribucion();
      
      alert('Distribución limpiada exitosamente');
      
      if (onDistribucionCompletada) {
        onDistribucionCompletada();
      }
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al limpiar distribución');
      console.error('Error:', err);
    } finally {
      setLimpiando(false);
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="p-6 border-b border-border bg-gradient-to-r from-green-50 to-green-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
            <FaPlayCircle className="text-green-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Distribución Automática de Aulas
            </h3>
            <p className="text-sm text-muted-foreground">
              Asigna aulas a todas las clases según disponibilidad y restricciones
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Botones de acción */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleEjecutarDistribucion}
            disabled={loading || limpiando}
            className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" size={20} />
                <span>Ejecutando distribución...</span>
              </>
            ) : (
              <>
                <FaPlayCircle size={20} />
                <span>Ejecutar Distribución</span>
              </>
            )}
          </button>

          <button
            onClick={handleLimpiarDistribucion}
            disabled={loading || limpiando}
            className="px-6 py-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 font-semibold"
            title="Limpiar todas las asignaciones"
          >
            {limpiando ? (
              <>
                <FaSpinner className="animate-spin" size={16} />
                <span>Limpiando...</span>
              </>
            ) : (
              <>
                <FaTrash size={16} />
                <span>Limpiar</span>
              </>
            )}
          </button>
        </div>

        {/* Resultado */}
        {resultado && resultado.success && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-4">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-green-600 flex-shrink-0 mt-1" size={24} />
              <div className="flex-1">
                <h4 className="font-bold text-green-900 mb-2">
                  ¡Distribución Completada!
                </h4>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-700 mb-1">Total Procesadas</p>
                    <p className="text-2xl font-bold text-green-900">
                      {resultado.estadisticas?.total_procesadas || 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-700 mb-1">Exitosas</p>
                    <p className="text-2xl font-bold text-green-600">
                      {resultado.estadisticas?.exitosas || 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <p className="text-xs text-orange-700 mb-1">Fallidas</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {resultado.estadisticas?.fallidas || 0}
                    </p>
                  </div>
                </div>
                {resultado.estadisticas?.fallidas > 0 && (
                  <p className="text-sm text-orange-700 mt-3">
                    ⚠️ Algunas clases no pudieron ser asignadas por falta de aulas disponibles o restricciones.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border-2 border-destructive/50 rounded-xl p-4">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {/* Instrucciones */}
        {!resultado && !error && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Instrucciones:</h4>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li>Asegúrate de que los directores hayan subido sus planificaciones</li>
              <li>Las aulas se asignarán según capacidad y restricciones configuradas</li>
              <li>Las clases más grandes se asignarán primero</li>
              <li>Puedes ejecutar la distribución múltiples veces (sobrescribe la anterior)</li>
              <li>Usa "Limpiar" para eliminar todas las asignaciones y empezar de nuevo</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
