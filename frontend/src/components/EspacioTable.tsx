import React, { useState, useEffect } from 'react';
import { espacioService, Espacio, EspacioStats } from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const TIPOS = ['BIBLIOTECA', 'SALA_DESCANSO', 'ZONA_TRABAJO', 'CUBICULO', 'OTRO'] as const;
const ESTADOS = ['DISPONIBLE', 'NO_DISPONIBLE', 'MANTENIMIENTO'] as const;

const TIPO_LABELS: Record<string, string> = {
  BIBLIOTECA: 'Biblioteca',
  SALA_DESCANSO: 'Sala de Descanso',
  ZONA_TRABAJO: 'Zona de Trabajo',
  CUBICULO: 'Cubículo',
  OTRO: 'Otro',
};

const TIPO_COLORS: Record<string, string> = {
  BIBLIOTECA: 'bg-blue-100 text-blue-800',
  SALA_DESCANSO: 'bg-green-100 text-green-800',
  ZONA_TRABAJO: 'bg-amber-100 text-amber-800',
  CUBICULO: 'bg-purple-100 text-purple-800',
  OTRO: 'bg-slate-100 text-slate-800',
};

const ESTADO_DOT: Record<string, string> = {
  DISPONIBLE: 'bg-green-500',
  MANTENIMIENTO: 'bg-amber-500',
  NO_DISPONIBLE: 'bg-red-500',
};

const EspacioTable: React.FC = () => {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<EspacioStats | null>(null);
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEspacio, setCurrentEspacio] = useState<Espacio | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo: 'BIBLIOTECA' as string,
    capacidad: '',
    estado: 'DISPONIBLE' as string,
    descripcion: '',
  });

  const loadStats = async () => {
    try {
      const response = await espacioService.getEspaciosStats();
      setStats(response.stats);
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  };

  const loadEspacios = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = {};
      if (filterTipo) filters.tipo = filterTipo;
      if (filterEstado) filters.estado = filterEstado;
      if (searchTerm) filters.search = searchTerm;
      const response = await espacioService.getEspacios(filters);
      setEspacios(response.espacios);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar espacios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEspacios();
    loadStats();
  }, [filterTipo, filterEstado]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadEspacios();
  };

  const totalPages = Math.ceil(espacios.length / itemsPerPage);
  const paginatedEspacios = espacios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openCreateModal = () => {
    setCurrentEspacio(null);
    setFormData({ codigo: '', nombre: '', tipo: 'BIBLIOTECA', capacidad: '', estado: 'DISPONIBLE', descripcion: '' });
    setModalOpen(true);
  };

  const openEditModal = (espacio: Espacio) => {
    setCurrentEspacio(espacio);
    setFormData({
      codigo: espacio.codigo,
      nombre: espacio.nombre,
      tipo: espacio.tipo,
      capacidad: String(espacio.capacidad),
      estado: espacio.estado,
      descripcion: espacio.descripcion || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        capacidad: parseInt(formData.capacidad),
        tipo: formData.tipo as Espacio['tipo'],
        estado: formData.estado as Espacio['estado'],
      };
      if (currentEspacio) {
        await espacioService.updateEspacio(currentEspacio.id, data);
      } else {
        await espacioService.createEspacio(data);
      }
      setModalOpen(false);
      loadEspacios();
      loadStats();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detalles?.[0]?.mensaje || 'Error al guardar';
      alert(msg);
    }
  };

  const handleDelete = async (espacio: Espacio) => {
    if (!confirm(`¿Desactivar el espacio "${espacio.nombre}"?`)) return;
    try {
      await espacioService.deleteEspacio(espacio.id);
      loadEspacios();
      loadStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al desactivar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Espacios</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Disponibles</p>
            <p className="text-2xl font-bold text-green-600">{stats.disponibles}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">En Mantenimiento</p>
            <p className="text-2xl font-bold text-amber-600">{stats.enMantenimiento}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">No Disponibles</p>
            <p className="text-2xl font-bold text-red-600">{stats.noDisponibles}</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterTipo}
            onChange={(e) => { setFilterTipo(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button
            onClick={() => { setFilterTipo(''); setFilterEstado(''); setSearchTerm(''); setCurrentPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Limpiar
          </button>
          <button
            onClick={openCreateModal}
            className="ml-auto flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            <FaPlus /> Nuevo Espacio
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando espacios...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : espacios.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay espacios registrados. Crea uno nuevo.</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Capacidad</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedEspacios.map((espacio) => (
                  <tr key={espacio.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{espacio.codigo}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {espacio.nombre}
                      {espacio.descripcion && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{espacio.descripcion}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[espacio.tipo] || TIPO_COLORS.OTRO}`}>
                        {TIPO_LABELS[espacio.tipo] || espacio.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-900">{espacio.capacidad}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className={`w-2 h-2 rounded-full ${ESTADO_DOT[espacio.estado] || 'bg-gray-400'}`}></span>
                        {espacio.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openEditModal(espacio)} className="text-blue-600 hover:text-blue-800" title="Editar">
                          <FaEdit />
                        </button>
                        {espacio.estado !== 'NO_DISPONIBLE' && (
                          <button onClick={() => handleDelete(espacio)} className="text-red-600 hover:text-red-800" title="Desactivar">
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
                <p className="text-sm text-gray-500">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, espacios.length)} de {espacios.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronLeft className="text-sm" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-md text-sm ${currentPage === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronRight className="text-sm" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentEspacio ? 'Editar Espacio' : 'Nuevo Espacio'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    required
                    placeholder="BIB-01"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacidad}
                    onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  placeholder="Cubículo Biblioteca 1"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                  placeholder="Notas adicionales sobre el espacio..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  {currentEspacio ? 'Guardar Cambios' : 'Crear Espacio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EspacioTable;
