import React, { useState, useEffect } from 'react';
import { aulaService, Aula } from '../services/api';
import { FaBuilding, FaUsers, FaTools, FaBan, FaChartBar, FaFilter, FaPlus, FaEdit, FaTrash, FaDoorOpen } from 'react-icons/fa';

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

  const getEstadoColor = (estado: string) => {
    const estadoUpper = estado.toUpperCase();
    switch (estadoUpper) {
      case 'DISPONIBLE':
        return 'bg-green-100 text-green-800';
      case 'MANTENIMIENTO':
        return 'bg-yellow-100 text-yellow-800';
      case 'NO_DISPONIBLE':
      case 'NO DISPONIBLE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const limpiarFiltros = () => {
    setFilters({
      edificio: '',
      tipo: '',
      estado: '',
      piso: '',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FaDoorOpen className="text-primary" />
            Gestión de Aulas
          </h2>
          <p className="text-muted-foreground mt-1">Administra las aulas de la institución</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition flex items-center gap-2 shadow-lg"
        >
          <FaPlus />
          Nueva Aula
        </button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg shadow-md border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Aulas</p>
                <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                <p className="text-xs text-blue-600 mt-1">{stats.totalEdificios} edificios</p>
              </div>
              <FaBuilding className="text-blue-500 text-4xl" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg shadow-md border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Disponibles</p>
                <p className="text-3xl font-bold text-green-900">{stats.disponibles}</p>
                <p className="text-xs text-green-600 mt-1">Listas para usar</p>
              </div>
              <FaUsers className="text-green-500 text-4xl" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-lg shadow-md border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 font-medium">Mantenimiento</p>
                <p className="text-3xl font-bold text-yellow-900">{stats.enMantenimiento}</p>
                <p className="text-xs text-yellow-600 mt-1">En reparación</p>
              </div>
              <FaTools className="text-yellow-500 text-4xl" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-lg shadow-md border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Capacidad Total</p>
                <p className="text-3xl font-bold text-purple-900">{stats.capacidadTotal}</p>
                <p className="text-xs text-purple-600 mt-1">Estudiantes</p>
              </div>
              <FaChartBar className="text-purple-500 text-4xl" />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 mb-4 rounded-lg animate-fade-in">
          <p className="font-medium flex items-center gap-2">
            <FaBan />
            Error
          </p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-card p-4 rounded-lg shadow-md border border-border mb-6">
        <div className="flex items-center gap-3 mb-4">
          <FaFilter className="text-primary" />
          <h3 className="font-semibold text-foreground">Filtros</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.edificio}
            onChange={(e) => setFilters({ ...filters, edificio: e.target.value })}
            className="border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            <option value="">Todos los edificios</option>
            <option value="Edificio A">Edificio A</option>
            <option value="Edificio B">Edificio B</option>
            <option value="Edificio C">Edificio C</option>
            <option value="Laboratorios">Laboratorios</option>
            <option value="Auditorio">Auditorio</option>
          </select>

          <select
            value={filters.tipo}
            onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
            className="border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            <option value="">Todos los tipos</option>
            <option value="Estándar">Estándar</option>
            <option value="Laboratorio">Laboratorio</option>
            <option value="Auditorio">Auditorio</option>
            <option value="Sala Especializada">Sala Especializada</option>
            <option value="CUBICULO">Cubículo</option>
            <option value="SALA_DESCANSO">Sala de Descanso</option>
            <option value="SALA_AUDIENCIAS">Sala de Audiencias</option>
          </select>

          <select
            value={filters.piso}
            onChange={(e) => setFilters({ ...filters, piso: e.target.value })}
            className="border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            <option value="">Todos los pisos</option>
            <option value="1">Piso 1</option>
            <option value="2">Piso 2</option>
            <option value="3">Piso 3</option>
            <option value="4">Piso 4</option>
          </select>

          <select
            value={filters.estado}
            onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
            className="border border-input rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
            <option value="NO_DISPONIBLE">No disponible</option>
          </select>

          <button
            onClick={limpiarFiltros}
            className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 bg-card rounded-lg">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-4">Cargando aulas...</p>
        </div>
      ) : aulas.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg">
          <FaDoorOpen className="text-6xl text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No se encontraron aulas</p>
          <p className="text-sm text-muted-foreground mt-2">Intenta ajustar los filtros o agrega una nueva aula</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Ubicación</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">Capacidad</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {aulas.map((aula) => (
                  <tr key={aula.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-primary">{aula.codigo || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{aula.nombre}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        {aula.es_prioritaria && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">Prioritaria</span>
                        )}
                        {aula.restriccion_carrera && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{aula.restriccion_carrera}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">{aula.edificio || '-'}</div>
                      <div className="text-xs text-muted-foreground">Piso {aula.piso || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FaUsers className="text-muted-foreground" />
                        <span className="font-semibold">{aula.capacidad}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                        {aula.tipo || 'Estándar'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(aula.estado)}`}>
                        {aula.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(aula)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(aula.id)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition"
                          title="Desactivar"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-muted/20 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Mostrando <span className="font-semibold">{aulas.length}</span> aula(s)
            </p>
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



