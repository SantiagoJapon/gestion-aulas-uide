import React, { useState, useEffect } from 'react';
import { aulaService, carreraService, Aula, AulaStats, Carrera } from '../services/api';
import { Modal } from './common/Modal';
import { FaBan, FaPlus, FaEdit, FaTrash, FaDoorOpen, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface AulaFilters {
  tipo: string;
  estado: string;
}

const AulaTable: React.FC = () => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AulaStats | null>(null);
  const [filters, setFilters] = useState<AulaFilters>({
    tipo: '',
    estado: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [currentAula, setCurrentAula] = useState<Aula | null>(null);
  const [carreras, setCarreras] = useState<Carrera[]>([]);

  const [formData, setFormData] = useState<{
    codigo: string;
    nombre: string;
    capacidad: string;
    tipo: string;
    equipamiento: string;
    restriccion_carrera: string;
    estado: 'disponible' | 'mantenimiento' | 'no_disponible';
    notas: string;
  }>({
    codigo: '',
    nombre: '',
    capacidad: '',
    tipo: 'AULA',
    equipamiento: '',
    restriccion_carrera: '',
    estado: 'disponible',
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
      if (filters.tipo) filtersToSend.tipo = filters.tipo;
      if (filters.estado) filtersToSend.estado = filters.estado;

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
    // Cargar carreras activas desde la base de datos
    carreraService.getCarreras(false).then((res) => {
      setCarreras(res.carreras.filter((c) => c.activa));
    }).catch(() => {
      console.error('No se pudieron cargar las carreras');
    });
  }, [filters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      // Validar campos requeridos
      if (!formData.codigo.trim()) { alert('El código del aula es obligatorio'); return; }
      if (!formData.nombre.trim()) { alert('El nombre del aula es obligatorio'); return; }
      if (!formData.capacidad || parseInt(formData.capacidad) < 1) { alert('La capacidad debe ser al menos 1'); return; }
      if (!formData.tipo) { alert('Selecciona la categoría del espacio'); return; }

      // Parsear equipamiento — enviar null si está vacío (JSONB no acepta {})
      let equipamientoObj: any = null;
      if (formData.equipamiento && formData.equipamiento.trim()) {
        try {
          equipamientoObj = JSON.parse(formData.equipamiento);
        } catch {
          equipamientoObj = { descripcion: formData.equipamiento.trim() };
        }
      }

      const data: any = {
        codigo: formData.codigo.trim().toUpperCase(),
        nombre: formData.nombre.trim(),
        capacidad: parseInt(formData.capacidad),
        tipo: formData.tipo,
        equipamiento: equipamientoObj,
        restriccion_carrera: formData.restriccion_carrera || null,
        // Prioritaria si tiene carrera asignada (incluyendo auditorio institucional)
        es_prioritaria: !!formData.restriccion_carrera,
        estado: formData.estado,
        notas: formData.notas?.trim() || null,
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
      const respData = err.response?.data;
      const detalles = respData?.detalles?.map((d: any) => `• ${d.campo}: ${d.mensaje}`).join('\n') || '';
      const errorMsg = respData?.mensaje || respData?.error || err.message || 'Error al guardar el aula';
      const fullMsg = detalles ? `${errorMsg}\n\n${detalles}` : errorMsg;
      setError(errorMsg);
      console.error('Error al guardar aula:', err.response?.data || err);
      alert(fullMsg);
    }
  };

  const resetForm = () => {
    setCurrentAula(null);
    setFormData({
      codigo: '',
      nombre: '',
      capacidad: '',
      tipo: 'AULA',
      equipamiento: '',
      restriccion_carrera: '',
      estado: 'disponible',
      notas: '',
    });
  };

  const openEdit = (aula: Aula) => {
    setCurrentAula(aula);
    setFormData({
      codigo: aula.codigo || '',
      nombre: aula.nombre,
      capacidad: aula.capacidad.toString(),
      tipo: (aula.tipo || 'AULA').toUpperCase(),
      equipamiento: aula.equipamiento ? JSON.stringify(aula.equipamiento, null, 2) : '',
      restriccion_carrera: aula.restriccion_carrera || '',
      // Normalizar estado a minúsculas para coincidir con la BD
      estado: (aula.estado || 'disponible').toLowerCase() as any,
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
        return 'bg-violet-100 text-violet-700 border-violet-200 shadow-sm shadow-violet-100';
      case 'AUDITORIO':
        return 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm shadow-rose-100';
      case 'SALA_ESPECIAL':
        return 'bg-cyan-100 text-cyan-700 border-cyan-200 shadow-sm shadow-cyan-100';
      default:
        return 'bg-muted text-muted-foreground border-border';
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
    setFilters({ tipo: '', estado: '' });
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="p-0 sm:p-2 lg:p-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Inventario de Aulas
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Gestiona los espacios del campus UIDE.</p>
        </div>
        <button
          onClick={openCreate}
          className="w-full sm:w-auto bg-primary hover:scale-[1.02] active:scale-[0.98] text-primary-foreground font-bold py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          <FaPlus className="text-sm" />
          Agregar Aula
        </button>
      </div>

      {/* Estadísticas Compactas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8">
          <div className="mac-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Aulas</p>
            <p className="text-2xl sm:text-3xl font-black text-foreground mt-1">{stats.total}</p>
          </div>
          <div className="mac-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider">Capacidad</p>
            <div className="flex items-baseline gap-1 mt-1">
              <p className="text-2xl sm:text-3xl font-black text-foreground">{stats.capacidadTotal}</p>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-bold">est.</span>
            </div>
          </div>
          <div className="hidden md:block mac-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider">Promedio</p>
            <div className="flex items-baseline gap-1 mt-1">
              <p className="text-2xl sm:text-3xl font-black text-foreground">
                {stats.total > 0 ? Math.round(stats.capacidadTotal / stats.total) : 0}
              </p>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-bold">por aula</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-xl flex items-center gap-3 animate-fade-in">
          <FaBan className="text-red-400 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Filtros Modernos */}
      <div className="bg-card rounded-2xl border border-border shadow-sm mb-6 overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por código o nombre..."
              className="w-full pl-11 pr-4 py-3 border border-border rounded-xl bg-muted/50 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background transition-all outline-none"
            />
          </div>

          <div className="flex overflow-x-auto gap-2 pb-1 lg:pb-0 scrollbar-hide">
            <select
              value={filters.tipo}
              onChange={(e) => { setFilters({ ...filters, tipo: e.target.value }); setCurrentPage(1); }}
              className="border border-border rounded-xl px-4 py-3 bg-muted/50 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">Todos los Tipos</option>
              <option value="AULA">Aula Común</option>
              <option value="LABORATORIO">Laboratorio</option>
              <option value="AUDITORIO">Auditorio</option>
              <option value="SALA_ESPECIAL">Sala Especial</option>
            </select>

            <select
              value={filters.estado}
              onChange={(e) => { setFilters({ ...filters, estado: e.target.value }); setCurrentPage(1); }}
              className="border border-border rounded-xl px-4 py-3 bg-muted/50 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">Todos los Estados</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
              <option value="NO_DISPONIBLE">Fuera de Uso</option>
            </select>

            {(filters.tipo || filters.estado || searchTerm) && (
              <button
                onClick={limpiarFiltros}
                className="px-4 py-3 text-sm font-bold text-uide-blue hover:bg-uide-blue/5 rounded-xl transition-all whitespace-nowrap"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vista de Datos: Cards vs Table */}
      {loading ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border shadow-sm">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-[3px] border-slate-100 border-t-uide-blue"></div>
          <p className="text-slate-500 mt-4 text-sm font-medium">Sincronizando aulas...</p>
        </div>
      ) : filteredAulas.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border shadow-sm">
          <FaDoorOpen className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-muted-foreground font-bold">No se encontraron resultados</p>
          <p className="text-xs text-muted-foreground mt-1">Intenta con otros términos de búsqueda</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mobile View: Cards */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {paginatedAulas.map((aula) => {
              const estado = getEstadoDot(aula.estado);
              return (
                <div key={aula.id} className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4 animate-fade-in">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-uide-blue uppercase tracking-widest">{aula.codigo || 'S/C'}</span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{aula.nombre}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(aula)}
                        className="p-2.5 bg-muted text-muted-foreground hover:text-primary rounded-xl transition-colors"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(aula.id)}
                        className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 pt-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Estado</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${estado.dot} shadow-sm`}></span>
                        <span className={`text-xs font-bold ${estado.text}`}>{estado.label}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Categoría</p>
                      <span className={`inline-block px-2.5 py-1 text-[10px] font-black rounded-lg border mt-1 ${getTipoBadge(aula.tipo)}`}>
                        {aula.tipo || 'AULA'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Capacidad</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{aula.capacidad} est.</p>
                    </div>
                  </div>

                  {(aula.es_prioritaria || aula.restriccion_carrera) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50 dark:border-slate-700/50">
                      {aula.es_prioritaria && (
                        <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-[9px] font-black rounded-lg border border-amber-100 dark:border-amber-900/30 flex items-center gap-1 uppercase tracking-tighter">
                          <span className="material-symbols-outlined text-[12px] font-bold">star</span> Prioritaria
                        </span>
                      )}
                      {aula.restriccion_carrera && (
                        <span className="px-2 py-1 bg-uide-blue/5 dark:bg-uide-blue/10 text-uide-blue text-[9px] font-black rounded-lg border border-uide-blue/10 flex items-center gap-1 uppercase tracking-tighter">
                          <span className="material-symbols-outlined text-[12px] font-bold">school</span> {aula.restriccion_carrera}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden sm:block bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Código</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nombre del Espacio</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Capacidad</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Categoría</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estado</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedAulas.map((aula) => {
                    const estado = getEstadoDot(aula.estado);
                    return (
                      <tr key={aula.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-bold text-uide-blue text-sm tracking-tight">{aula.codigo || '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{aula.nombre}</div>
                          <div className="flex gap-2 mt-1.5">
                            {aula.es_prioritaria && (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black rounded border border-amber-100 uppercase">Prioritaria</span>
                            )}
                            {aula.restriccion_carrera && (
                              <span className="px-1.5 py-0.5 bg-uide-blue/5 text-uide-blue text-[9px] font-black rounded border border-uide-blue/10 uppercase">{aula.restriccion_carrera}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{aula.capacidad} <span className="text-[10px] text-slate-400 font-medium">estudiantes</span></span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-[10px] font-black rounded-lg border leading-none ${getTipoBadge(aula.tipo)}`}>
                            {aula.tipo || 'AULA'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${estado.dot} shadow-sm`}></span>
                            <span className={`text-xs font-bold ${estado.text}`}>{estado.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <button
                              onClick={() => openEdit(aula)}
                              className="p-2 text-slate-400 hover:text-uide-blue hover:bg-uide-blue/5 rounded-xl transition-all"
                              title="Editar"
                            >
                              <FaEdit className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDelete(aula.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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
          </div>

          {/* Pagination Modernizada */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              <p className="text-xs font-bold text-muted-foreground order-2 sm:order-1">
                Mostrando <span className="text-foreground">{((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAulas.length)}</span> de {filteredAulas.length} registros
              </p>
              <div className="flex items-center gap-1 shadow-sm rounded-2xl p-1 bg-card border border-border order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-uide-blue hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                >
                  <FaChevronLeft className="text-xs" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && <span className="px-2 text-slate-300">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === page
                          ? 'bg-uide-blue text-white shadow-lg shadow-uide-blue/20 scale-105'
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                          }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))
                }
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-uide-blue hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                >
                  <FaChevronRight className="text-xs" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Formulario Responsive */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={currentAula ? 'Actualizar Información' : 'Registrar Nueva Aula'}
        size="lg"
      >
        <div className="text-xs text-slate-500 font-medium mb-4">Completa los campos para continuar.</div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Código Identificador</label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                required
                className="w-full border border-border rounded-xl px-4 py-3 bg-muted/50 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Ej: A-101"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nombre Descriptivo</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                className="w-full border border-border rounded-xl px-4 py-3 bg-muted/50 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Ej: Aula de Informática"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Capacidad Máxima</label>
              <input
                type="number"
                value={formData.capacidad}
                onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                required
                min="1"
                className="w-full border border-border rounded-xl px-4 py-3 bg-muted/50 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Categoría de Espacio</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full border border-border rounded-xl px-4 py-3 bg-muted/50 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="AULA">Aula Común</option>
                <option value="LABORATORIO">Laboratorio</option>
                <option value="AUDITORIO">Auditorio</option>
                <option value="SALA_ESPECIAL">Sala Especial</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Carrera Asignada
              </label>
              <p className="text-[10px] text-muted-foreground ml-1 -mt-1">
                La carrera elegida tendrá prioridad en la asignación automática, pero cualquier otra carrera también puede usar el espacio si hay disponibilidad.
                Selecciona «Auditorio institucional» para excluirlo de la distribución de clases.
              </p>
              <select
                value={formData.restriccion_carrera}
                onChange={(e) => setFormData({ ...formData, restriccion_carrera: e.target.value })}
                className="w-full border border-border rounded-xl px-4 py-3 bg-muted/50 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">🌐 Uso general (sin restricción)</option>
                {carreras.length === 0 && (
                  <option disabled>— Cargando carreras... —</option>
                )}
                {carreras.map((c) => (
                  <option key={c.id} value={c.carrera}>🎓 {c.carrera}</option>
                ))}
                <option disabled>──────────────</option>
                <option value="AUDITORIO_INSTITUCIONAL">🏛️ Auditorio (uso institucional, sin clases)</option>
              </select>
              {formData.restriccion_carrera === 'AUDITORIO_INSTITUCIONAL' && (
                <p className="text-[10px] text-blue-600 font-bold ml-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">info</span>
                  Este espacio quedará <strong>excluido de la distribución automática de clases</strong>. Solo se podrá reservar manualmente.
                </p>
              )}
              {formData.restriccion_carrera && formData.restriccion_carrera !== 'AUDITORIO_INSTITUCIONAL' && (
                <p className="text-[10px] text-amber-600 font-bold ml-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">star</span>
                  Prioridad para <strong>{formData.restriccion_carrera}</strong>. Las demás carreras también pueden usar este espacio.
                </p>
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Estado de Operatividad</label>
              <div className="flex gap-2">
                {(['disponible', 'mantenimiento', 'no_disponible'] as const).map((estado) => (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => setFormData({ ...formData, estado })}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${formData.estado === estado
                      ? 'bg-uide-blue text-white border-uide-blue shadow-lg shadow-uide-blue/20 scale-105'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'
                      }`}
                  >
                    {estado.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { setModalOpen(false); resetForm(); }}
              className="flex-1 px-6 py-4 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-[2] px-6 py-4 bg-uide-blue text-white rounded-2xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-uide-blue/20 text-sm uppercase tracking-widest"
            >
              {currentAula ? 'Guardar Cambios' : 'Confirmar Registro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AulaTable;
