import { useState, useEffect, useMemo } from 'react';
import { distribucionService } from '../services/api';
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaMinusCircle,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaInfoCircle
} from 'react-icons/fa';

interface ClaseDistribucion {
  id: number;
  carrera: string;
  materia: string;
  ciclo: string;
  paralelo: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  num_estudiantes: number;
  docente: string;
  aula_asignada: string | null;
  aula_nombre: string | null;
  aula_capacidad: number | null;
  estado: 'asignada' | 'pendiente' | 'conflicto';
}

interface Estadisticas {
  total_clases: number;
  asignadas: number;
  pendientes: number;
  conflictos: number;
  porcentaje_completado: number;
}

export default function DistribucionEspacios() {
  const [clases, setClases] = useState<ClaseDistribucion[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    total_clases: 0,
    asignadas: 0,
    pendientes: 0,
    conflictos: 0,
    porcentaje_completado: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCiclo, setFiltroCiclo] = useState('');
  const [filtroCarrera, setFiltroCarrera] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [soloConflictos, setSoloConflictos] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await distribucionService.getClasesDistribucion();
      if (response.success) {
        setClases(response.clases);
        setEstadisticas(response.estadisticas);
      }
    } catch (err: any) {
      console.error('Error al cargar distribución:', err);
      setError('Error al cargar los datos de distribución');
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const ciclosUnicos = useMemo(() => {
    const ciclos = [...new Set(clases.map(c => c.ciclo).filter(Boolean))];
    return ciclos.sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [clases]);

  const carrerasUnicas = useMemo(() => {
    return [...new Set(clases.map(c => c.carrera).filter(Boolean))].sort();
  }, [clases]);

  // Filtered classes
  const clasesFiltradas = useMemo(() => {
    return clases.filter(clase => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchSearch =
          clase.materia?.toLowerCase().includes(term) ||
          clase.docente?.toLowerCase().includes(term) ||
          clase.aula_asignada?.toLowerCase().includes(term) ||
          clase.carrera?.toLowerCase().includes(term) ||
          String(clase.id).includes(term);
        if (!matchSearch) return false;
      }
      if (filtroCiclo && clase.ciclo !== filtroCiclo) return false;
      if (filtroCarrera && clase.carrera !== filtroCarrera) return false;
      if (filtroEstado && clase.estado !== filtroEstado) return false;
      if (soloConflictos && clase.estado !== 'conflicto') return false;
      return true;
    });
  }, [clases, searchTerm, filtroCiclo, filtroCarrera, filtroEstado, soloConflictos]);

  // Pagination
  const totalPages = Math.ceil(clasesFiltradas.length / itemsPerPage);
  const clasesPaginadas = clasesFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroCiclo, filtroCarrera, filtroEstado, soloConflictos]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'asignada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <FaCheckCircle size={10} />
            Asignada
          </span>
        );
      case 'conflicto':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <FaExclamationTriangle size={10} />
            Conflicto
          </span>
        );
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
            <FaMinusCircle size={10} />
            Pendiente
          </span>
        );
      default:
        return null;
    }
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Cargando distribucion...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button onClick={cargarDatos} className="mt-3 text-sm text-red-600 underline hover:text-red-800">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Progreso General de Distribucion
          </h3>
          <span className="text-2xl font-bold text-gray-900">
            {estadisticas.porcentaje_completado}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(estadisticas.porcentaje_completado)}`}
            style={{ width: `${estadisticas.porcentaje_completado}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {estadisticas.asignadas} de {estadisticas.total_clases} clases asignadas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Clases</p>
          <p className="text-3xl font-bold text-gray-900">{estadisticas.total_clases}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Asignadas</p>
          <p className="text-3xl font-bold text-green-600">{estadisticas.asignadas}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pendientes</p>
          <p className="text-3xl font-bold text-gray-500">{estadisticas.pendientes}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Conflictos</p>
          <p className="text-3xl font-bold text-amber-600">{estadisticas.conflictos}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Buscar por materia, docente, aula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Ciclo filter */}
          <select
            value={filtroCiclo}
            onChange={(e) => setFiltroCiclo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
            <option value="">Todos los Ciclos</option>
            {ciclosUnicos.map(c => (
              <option key={c} value={c}>Ciclo {c}</option>
            ))}
          </select>

          {/* Carrera filter */}
          <select
            value={filtroCarrera}
            onChange={(e) => setFiltroCarrera(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
            <option value="">Todas las Carreras</option>
            {carrerasUnicas.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Estado filter */}
          <select
            value={filtroEstado}
            onChange={(e) => {
              setFiltroEstado(e.target.value);
              if (e.target.value === 'conflicto') setSoloConflictos(false);
            }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
            <option value="">Todos los Estados</option>
            <option value="asignada">Asignada</option>
            <option value="pendiente">Pendiente</option>
            <option value="conflicto">Conflicto</option>
          </select>

          {/* Conflicts toggle */}
          <button
            onClick={() => {
              setSoloConflictos(!soloConflictos);
              if (!soloConflictos) setFiltroEstado('');
            }}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
              soloConflictos
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FaExclamationTriangle size={12} />
            Solo Conflictos
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Cod.
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Materia
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Ciclo
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Docente
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Horario
                </th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Est.
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Aula
                </th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clasesPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No se encontraron clases con los filtros aplicados
                  </td>
                </tr>
              ) : (
                clasesPaginadas.map((clase) => (
                  <tr
                    key={clase.id}
                    className={`hover:bg-gray-50/50 transition-colors ${
                      clase.estado === 'conflicto' ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-500">
                        {String(clase.id).padStart(4, '0')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={clase.materia}>
                          {clase.materia}
                        </p>
                        <p className="text-xs text-gray-400">{clase.carrera}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {clase.ciclo || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700 truncate max-w-[150px]" title={clase.docente}>
                        {clase.docente || 'Sin asignar'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <p className="text-gray-700 font-medium">{clase.dia}</p>
                        <p className="text-xs text-gray-400">
                          {clase.hora_inicio} - {clase.hora_fin}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-700">
                        {clase.num_estudiantes || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {clase.aula_asignada ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {clase.aula_asignada}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getEstadoBadge(clase.estado)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Filas por pagina:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded px-2 py-1 text-sm bg-white"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="ml-2">
                {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, clasesFiltradas.length)} de {clasesFiltradas.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FaChevronLeft size={12} />
              </button>
              {generatePageNumbers().map((page, idx) =>
                typeof page === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FaChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FaInfoCircle className="text-gray-400" size={14} />
          <h4 className="text-sm font-semibold text-gray-600">Leyenda</h4>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="text-green-500" size={14} />
            <span className="text-gray-600">Asignada - Aula confirmada sin conflictos</span>
          </div>
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-amber-500" size={14} />
            <span className="text-gray-600">Conflicto - Solapamiento de horario en el aula</span>
          </div>
          <div className="flex items-center gap-2">
            <FaMinusCircle className="text-gray-400" size={14} />
            <span className="text-gray-600">Pendiente - Sin aula asignada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
