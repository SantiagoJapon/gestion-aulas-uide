import { useState, useEffect } from 'react';
import { planificacionService, PlanificacionSubida } from '../services/api';
import { FaDownload, FaFileExcel, FaCalendarAlt, FaUser, FaCheckCircle } from 'react-icons/fa';

export default function PlanificacionesTable() {
  const [planificaciones, setPlanificaciones] = useState<PlanificacionSubida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState<number | null>(null);

  useEffect(() => {
    cargarPlanificaciones();
  }, []);

  const cargarPlanificaciones = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await planificacionService.listar();
      setPlanificaciones(response.planificaciones);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cargar planificaciones');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargar = async (id: number) => {
    try {
      setDescargando(id);
      await planificacionService.descargar(id);
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al descargar archivo');
      console.error('Error:', err);
    } finally {
      setDescargando(null);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-card p-6 border border-border">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Cargando planificaciones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border-2 border-destructive/50 rounded-xl p-6">
        <p className="text-destructive font-medium">{error}</p>
      </div>
    );
  }

  if (planificaciones.length === 0) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <FaFileExcel className="text-yellow-600" size={24} />
          <div>
            <h3 className="font-semibold text-yellow-900">Sin planificaciones</h3>
            <p className="text-sm text-yellow-700">No hay planificaciones subidas aún</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="p-6 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FaFileExcel className="text-primary" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Planificaciones Subidas
              </h3>
              <p className="text-sm text-muted-foreground">
                {planificaciones.length} archivo{planificaciones.length !== 1 ? 's' : ''} encontrado{planificaciones.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={cargarPlanificaciones}
            className="px-4 py-2 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Carrera
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Archivo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Clases
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Subido Por
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {planificaciones.map((plan) => (
              <tr key={plan.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-foreground">
                    {plan.carrera?.carrera || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <FaFileExcel className="text-green-600" />
                    <div className="text-sm text-foreground max-w-xs truncate" title={plan.nombre_archivo_original}>
                      {plan.nombre_archivo_original}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {plan.total_clases}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-muted-foreground" size={14} />
                    <div className="text-sm text-foreground">
                      {plan.usuario ? `${plan.usuario.nombre} ${plan.usuario.apellido}` : 'N/A'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-muted-foreground" size={14} />
                    <div className="text-sm text-muted-foreground">
                      {formatFecha(plan.fecha_subida)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    plan.estado === 'procesado' 
                      ? 'bg-green-100 text-green-800' 
                      : plan.estado === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {plan.estado === 'procesado' && <FaCheckCircle size={12} />}
                    {plan.estado === 'procesado' ? 'Procesado' : plan.estado}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => handleDescargar(plan.id)}
                    disabled={descargando === plan.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Descargar archivo"
                  >
                    {descargando === plan.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span className="text-sm">Descargando...</span>
                      </>
                    ) : (
                      <>
                        <FaDownload size={14} />
                        <span className="text-sm">Descargar</span>
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
