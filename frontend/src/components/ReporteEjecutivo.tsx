import { useState, useEffect } from 'react';
import { reporteService, ReporteHistorial, carreraService, Carrera } from '../services/api';
import {
    FaFilePdf,
    FaDownload,
    FaTrash,
    FaChartBar,
    FaFilter,
    FaHistory,
    FaSync,
    FaCheckCircle,
    FaExclamationTriangle,
    FaBuilding,
    FaUsers
} from 'react-icons/fa';

interface ReporteEjecutivoProps {
    carreraPreseleccionada?: {
        id: number;
        nombre: string;
    };
}

export const ReporteEjecutivo = ({ carreraPreseleccionada }: ReporteEjecutivoProps) => {
    const [historial, setHistorial] = useState<ReporteHistorial[]>([]);
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [filtros, setFiltros] = useState({
        carrera_id: carreraPreseleccionada ? String(carreraPreseleccionada.id) : '',
        nombre: ''
    });
    const [metricasActuales, setMetricasActuales] = useState<any>(null);

    useEffect(() => {
        cargarDatos();
        if (carreraPreseleccionada) {
            setFiltros(prev => ({ ...prev, carrera_id: String(carreraPreseleccionada.id) }));
        }
    }, [carreraPreseleccionada]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const promises: Promise<any>[] = [
                reporteService.getHistorial(),
                reporteService.getMetricasActuales()
            ];

            // Solo cargar lista de carreras si NO hay una preseleccionada (es decir, si es Admin)
            if (!carreraPreseleccionada) {
                promises.push(carreraService.getCarreras());
            }

            const results = await Promise.all(promises);
            setHistorial(results[0].historial); // Historial debería venir filtrado por backend idealmente, o lo filtramos aquí
            setMetricasActuales(results[1].metricas);

            if (!carreraPreseleccionada && results[2]) {
                setCarreras(results[2].carreras);
            }
        } catch (error) {
            console.error('Error al cargar datos de reportes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerarReporte = async () => {
        try {
            setGenerating(true);
            const data = {
                nombre: filtros.nombre || undefined,
                carrera_id: filtros.carrera_id || undefined,
                tipo: filtros.carrera_id ? 'CARRERA' : 'GENERAL'
            };
            await reporteService.generarReporte(data);
            alert('Reporte generado exitosamente');
            cargarDatos();
            setFiltros({ ...filtros, nombre: '' });
        } catch (error) {
            console.error('Error al generar reporte:', error);
            alert('Error al generar el reporte');
        } finally {
            setGenerating(false);
        }
    };

    const handleDescargar = async (reporte: ReporteHistorial) => {
        try {
            await reporteService.descargarReporte(reporte.id, reporte.nombre + '.pdf');
        } catch (error) {
            console.error('Error al descargar:', error);
            alert('Error al descargar el archivo');
        }
    };

    const handleEliminar = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este registro del historial?')) return;
        try {
            await reporteService.eliminarReporte(id);
            setHistorial(historial.filter(h => h.id !== id));
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
    };

    if (loading && historial.length === 0) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-uide-blue"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header con métricas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><FaCheckCircle /></span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Éxito Asignación</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                        {metricasActuales?.resumen?.porcentaje_exito}%
                    </h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FaChartBar /></span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Eficiencia Cap.</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                        {metricasActuales?.resumen?.eficiencia_capacidad}%
                    </h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="p-2 bg-orange-100 text-orange-600 rounded-lg"><FaExclamationTriangle /></span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Sin Aula</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                        {metricasActuales?.resumen?.huerfanos}
                    </h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><FaUsers /></span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Docentes</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                        {metricasActuales?.carga_docentes?.length || 0}
                    </h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="p-2 bg-purple-100 text-purple-600 rounded-lg"><FaBuilding /></span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Edificios</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                        {metricasActuales?.uso_edificios?.length || 0}
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Panel de Configuración de Reporte */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-mac border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <FaFilter className="text-uide-blue" size={16} />
                            Configurar Reporte
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Personalizado</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Reporte Semestral"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-uide-blue outline-none transition-all text-sm"
                                    value={filtros.nombre}
                                    onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar por Carrera</label>
                                <select
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-uide-blue outline-none transition-all text-sm disabled:opacity-70 disabled:bg-slate-100"
                                    value={filtros.carrera_id}
                                    onChange={(e) => setFiltros({ ...filtros, carrera_id: e.target.value })}
                                    disabled={!!carreraPreseleccionada}
                                >
                                    {carreraPreseleccionada ? (
                                        <option value={carreraPreseleccionada.id}>{carreraPreseleccionada.nombre}</option>
                                    ) : (
                                        <>
                                            <option value="">Todas las Carreras</option>
                                            {carreras.map(c => (
                                                <option key={c.id} value={c.id}>{c.carrera}</option>
                                            ))}
                                        </>
                                    )}
                                </select>
                            </div>

                            <button
                                onClick={handleGenerarReporte}
                                disabled={generating}
                                className="w-full mt-4 flex items-center justify-center gap-3 bg-uide-blue text-white py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {generating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Generando...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaFilePdf size={18} />
                                        <span>Generar PDF Ejecutivo</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="bg-uide-blue/5 border border-uide-blue/10 p-4 rounded-xl">
                        <h4 className="text-uide-blue text-sm font-bold flex items-center gap-2 mb-2">
                            <FaSync className="animate-spin-slow" /> Tip Sugerido
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            Los reportes ejecutivos incluyen análisis de saturación, lista de conflictos y eficiencia de capacidad institucional.
                        </p>
                    </div>
                </div>

                {/* Historial de Reportes */}
                <div className="lg:col-span-2 capitalize">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-mac border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <FaHistory className="text-slate-400" size={16} />
                                Historial de Reportes
                            </h3>
                            <button
                                onClick={cargarDatos}
                                className="text-uide-blue hover:bg-uide-blue/5 p-2 rounded-lg transition-colors"
                                title="Sincronizar historial"
                            >
                                <FaSync size={14} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            {historial.length === 0 ? (
                                <div className="p-10 text-center text-slate-400">
                                    <span className="material-symbols-outlined text-5xl mb-2">folder_open</span>
                                    <p className="text-sm font-medium">No hay reportes generados aún.</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Reporte</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {historial.map((reporte) => (
                                            <tr key={reporte.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{reporte.nombre}</span>
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1 uppercase">
                                                            <FaUsers size={10} /> {reporte.tipo === 'GENERAL' ? 'Toda la Universidad' : 'Carrera Específica'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 border-slate-100">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                                        {new Date(reporte.fecha_generacion).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleDescargar(reporte)}
                                                            className="p-2 bg-uide-blue/10 text-uide-blue rounded-lg hover:bg-uide-blue hover:text-white transition-all shadow-sm"
                                                            title="Descargar PDF"
                                                        >
                                                            <FaDownload size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEliminar(reporte.id)}
                                                            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                            title="Eliminar registro"
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReporteEjecutivo;
