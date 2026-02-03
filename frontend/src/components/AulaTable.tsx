import React, { useState, useEffect } from 'react';
import { aulaService, Aula } from '../services/api';
import { FaBuilding, FaUsers, FaTools, FaBan, FaChartBar, FaPlus, FaEdit, FaTrash, FaDoorOpen, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface AulaFilters {
  edificio: string;
  tipo: string;
  estado: string;
  piso: string;
}

interface AulaStats {
  total: number;
  disponibles: number;
  enMantenimiento: number;
  noDisponibles: number;
  capacidadTotal: number;
  totalEdificios: number;
  porEdificio: Array<{edificio: string; total: string; capacidad_total: string}>;
  porTipo: Array<{tipo: string; total: string; capacidad_total: string}>;
}

const AulaTable: React.FC = () => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AulaStats | null>(null);
  const [filters, setFilters] = useState<AulaFilters>({
    edificio: '',
    tipo: '',
    estado: '',
    piso: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [currentAula, setCurrentAula] = useState<Aula | null>(null);
  const [formData, setFormData] = useState<{
    codigo: string;
    nombre: string;
    capacidad: string;
    tipo: string;
    edificio: string;
    piso: string;
    equipamiento: string;
    restriccion_carrera: string;
    es_prioritaria: boolean;
    estado: 'DISPONIBLE' | 'MANTENIMIENTO' | 'NO_DISPONIBLE';
    notas: string;
  }>({
    codigo: '',
    nombre: '',
    capacidad: '',
    tipo: 'AULA',
    edificio: '',
    piso: '1',
    equipamiento: '',
    restriccion_carrera: '',
    es_prioritaria: false,
    estado: 'DISPONIBLE',
    notas: '',
  });

  const loadStats = async () => {
    try {
      const response = await aulaService.getAulasStats();
      setStats(response.stats);
    } catch (err: any) {
      console.error('Error al cargar estadísticas:', err);
    }
  };

  const loadAulas = async () => {
    try {
      setLoading(true);
      setError(null);
      const filtersToSend: any = {};
      if (filters.edificio) filtersToSend.edificio = filters.edificio;
      if (filters.tipo) filtersToSend.tipo = filters.tipo;
      if (filters.estado) filtersToSend.estado = filters.estado;
      if (filters.piso) filtersToSend.piso = filters.piso;

      const response = await aulaService.getAulas(filtersToSend);
      setAulas(response.aulas);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar las aulas');
      console.error('Error al cargar aulas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAulas();
    loadStats();
  }, [filters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      // Parsear equipamiento si es JSON string
      let equipamientoObj = {};
      if (formData.equipamiento) {
        try {
          equipamientoObj = JSON.parse(formData.equipamiento);
        } catch {
          // Si no es JSON válido, crear objeto con descripción
          equipamientoObj = { descripcion: formData.equipamiento };
        }
      }

      const data: any = {
        codigo: formData.codigo,
        nombre: formData.nombre,
        capacidad: parseInt(formData.capacidad),
        tipo: formData.tipo,
        edificio: formData.edificio || null,
        piso: parseInt(formData.piso),
        equipamiento: equipamientoObj,
        restriccion_carrera: formData.restriccion_carrera || null,
        es_prioritaria: formData.es_prioritaria,
        estado: formData.estado,
        notas: formData.notas || null,
      };

      if (currentAula) {
        await aulaService.updateAula(currentAula.id, data);
      } else {
        await aulaService.createAula(data);
      }

      setModalOpen(false);
      resetForm();
      loadAulas();
      loadStats();
    } catch (err: any) {
      const errorMsg = err.response?.data?.mensaje || err.response?.data?.error || 'Error al guardar el aula';
      setError(errorMsg);
      console.error('Error al guardar aula:', err);
      alert(errorMsg);
    }
  };

  const resetForm = () => {
    setCurrentAula(null);
    setFormData({
      codigo: '',
      nombre: '',
      capacidad: '',
      tipo: 'AULA',
      edificio: '',
      piso: '1',
      equipamiento: '',
      restriccion_carrera: '',
      es_prioritaria: false,
      estado: 'DISPONIBLE',
      notas: '',
    });
  };

  const openEdit = (aula: Aula) => {
    setCurrentAula(aula);
    setFormData({
      codigo: aula.codigo || '',
      nombre: aula.nombre,
      capacidad: aula.capacidad.toString(),
      tipo: aula.tipo || 'Estándar',
      edificio: aula.edificio || '',
      piso: aula.piso?.toString() || '1',
      equipamiento: aula.equipamiento ? JSON.stringify(aula.equipamiento, null, 2) : '',
      restriccion_carrera: aula.restriccion_carrera || '',
      es_prioritaria: aula.es_prioritaria || false,
      estado: aula.estado,
      notas: aula.notas || '',
    });
    setModalOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de desactivar esta aula?')) {
      try {
        await aulaService.deleteAula(id);
        loadAulas();
        loadStats();
      } catch (err: any) {
        const errorMsg = err.response?.data?.mensaje || err.response?.data?.error || 'Error al desactivar el aula';
        setError(errorMsg);
        alert(errorMsg);
        console.error('Error al desactivar aula:', err);
      }
    }
  };

  const getEstadoDot = (estado: string) => {
    const estadoUpper = estado.toUpperCase();
    switch (estadoUpper) {
      case 'DISPONIBLE':
        return { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Disponible' };
      case 'MANTENIMIENTO':
        return { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Mantenimiento' };
      case 'NO_DISPONIBLE':
      case 'NO DISPONIBLE':
        return { dot: 'bg-red-500', text: 'text-red-700', label: 'No disponible' };
      case 'OCUPADA':
        return { dot: 'bg-blue-500', text: 'text-blue-700', label: 'Ocupada' };
      default:
        return { dot: 'bg-gray-400', text: 'text-gray-600', label: estado };
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo?.toUpperCase()) {
      case 'LABORATORIO':
        return 'bg-violet-100 text-violet-700 border-violet-200';
      case 'AUDITORIO':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'SALA_ESPECIAL':
        return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Filtrar por búsqueda local
  const filteredAulas = aulas.filter((aula) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (aula.codigo?.toLowerCase().includes(term)) ||
      (aula.nombre?.toLowerCase().includes(term)) ||
      (aula.tipo?.toLowerCase().includes(term))
    );
  });

  // Paginación
  const totalPages = Math.ceil(filteredAulas.length / itemsPerPage);
  const paginatedAulas = filteredAulas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const limpiarFiltros = () => {
    setFilters({ edificio: '', tipo: '', estado: '', piso: '' });
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Inventario de Aulas y Capacidad
          </h2>
          <p className="text-muted-foreground mt-1">Gestiona las aulas y espacios del campus UIDE.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 px-5 rounded-lg transition flex items-center gap-2 shadow-sm"
        >
          <FaPlus className="text-sm" />
          Agregar Aula
        </button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Total Aulas</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Capacidad Total</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">{stats.capacidadTotal}</p>
              <span className="text-sm text-gray-500">estudiantes</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Capacidad Promedio</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">
                {stats.total > 0 ? Math.round(stats.capacidadTotal / stats.total) : 0}
              </p>
              <span className="text-sm text-gray-500">por aula</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-xl flex items-center gap-3">
          <FaBan className="text-red-400 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por código, nombre o tipo..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition"
            />
          </div>

          {/* Filtros inline */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.tipo}
              onChange={(e) => { setFilters({ ...filters, tipo: e.target.value }); setCurrentPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Tipo: Todos</option>
              <option value="AULA">Aula</option>
              <option value="LABORATORIO">Laboratorio</option>
              <option value="AUDITORIO">Auditorio</option>
              <option value="SALA_ESPECIAL">Sala Especial</option>
            </select>

            <select
              value={filters.estado}
              onChange={(e) => { setFilters({ ...filters, estado: e.target.value }); setCurrentPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Estado: Todos</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
              <option value="NO_DISPONIBLE">No disponible</option>
            </select>

            {(filters.tipo || filters.estado || filters.edificio || filters.piso || searchTerm) && (
              <button
                onClick={limpiarFiltros}
                className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-[3px] border-gray-200 border-t-primary"></div>
          <p className="text-gray-500 mt-4 text-sm">Cargando aulas...</p>
        </div>
      ) : filteredAulas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FaDoorOpen className="text-5xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No se encontraron aulas</p>
          <p className="text-sm text-gray-400 mt-1">Ajusta los filtros o agrega una nueva aula</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacidad</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAulas.map((aula) => {
                  const estado = getEstadoDot(aula.estado);
                  return (
                    <tr key={aula.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-primary text-sm">{aula.codigo || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 text-sm">{aula.nombre}</div>
                        {(aula.es_prioritaria || aula.restriccion_carrera) && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {aula.es_prioritaria && (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-medium rounded border border-amber-200">Prioritaria</span>
                            )}
                            {aula.restriccion_carrera && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded border border-blue-200">{aula.restriccion_carrera}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{aula.capacidad} estudiantes</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md border ${getTipoBadge(aula.tipo)}`}>
                          {aula.tipo || 'AULA'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${estado.dot}`}></span>
                          <span className={`text-sm font-medium ${estado.text}`}>{estado.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(aula)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition"
                            title="Editar"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDelete(aula.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Desactivar"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer con paginación */}
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAulas.length)} de{' '}
              <span className="font-semibold text-gray-700">{filteredAulas.length}</span> aulas
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <FaChevronLeft className="text-xs" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                        currentPage === page
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <FaChevronRight className="text-xs" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Formulario */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-card p-6 rounded-xl w-full max-w-3xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-2xl font-bold text-foreground mb-6">
              {currentAula ? 'Editar' : 'Nueva'} Aula
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Código del Aula *
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  required
                  className="w-full border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Ej: AULA-C12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className="w-full border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Ej: Aula C12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Capacidad *
                </label>
                <input
                  type="number"
                  value={formData.capacidad}
                  onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                  required
                  min="1"
                  className="w-full border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>

              <div>
                <select
                  value={formData.edificio}
                  onChange={(e) => setFormData({ ...formData, edificio: e.target.value })}
                  className="w-full border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="">Seleccionar edificio</option>
                  <option value="Edificio A">Edificio A</option>
                  <option value="Edificio B">Edificio B</option>
                  <option value="Edificio C">Edificio C</option>
                  <option value="Laboratorios">Laboratorios</option>
                  <option value="Auditorio">Auditorio</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Tipo *
                </label>
                <select
                  value={formData.piso}
                  onChange={(e) => setFormData({ ...formData, piso: e.target.value })}
                  className="w-full border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="1">Piso 1</option>
                  <option value="2">Piso 2</option>
                  <option value="3">Piso 3</option>
                  <option value="4">Piso 4</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Restricción de Carrera
                </label>
                <input
                  type="text"
                  value={formData.restriccion_carrera}
                  onChange={(e) => setFormData({ ...formData, restriccion_carrera: e.target.value })}
                  className="w-full border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Ej: Derecho, Arquitectura (dejar vacío para uso general)"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Equipamiento (JSON)
                </label>
                <textarea
                  value={formData.equipamiento}
                  onChange={(e) => setFormData({ ...formData, equipamiento: e.target.value })}
                  rows={3}
                  className="w-full border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent font-mono text-sm"
                  placeholder='Ej: {"proyector": true, "computadoras": 30, "pizarra_digital": true}'
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formato JSON o descripción simple
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.es_prioritaria}
                    onChange={(e) => setFormData({ ...formData, es_prioritaria: e.target.checked })}
                    className="w-5 h-5 text-primary border-input rounded focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-sm font-medium text-muted-foreground">Aula Prioritaria</span>
                </label>
                <p className="text-xs text-muted-foreground mt-1 ml-8">
                  Se dará prioridad en la asignación automática
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Estado *
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'DISPONIBLE' | 'MANTENIMIENTO' | 'NO_DISPONIBLE' })}
                  className="w-full border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                  <option value="NO_DISPONIBLE">No disponible</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Notas
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                  className="w-full border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Notas adicionales, observaciones, mantenimientos programados..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-semibold shadow-lg"
              >
                {currentAula ? 'Actualizar' : 'Crear'} Aula
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AulaTable;



