import React, { useEffect, useState } from 'react';
import { estudianteService, Estudiante, ListarEstudiantesResponse } from '../services/api';
import { FaUserGraduate, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface EstudianteTableProps {
  carreraNombre?: string;
}

const EstudianteTable: React.FC<EstudianteTableProps> = ({ carreraNombre }) => {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number>(1);
  const limit = 20;

  const loadEstudiantes = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Parameters<typeof estudianteService.getEstudiantes>[0] = {
        page,
        limit,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (carreraNombre) {
        params.escuela = carreraNombre;
      }

      const response: ListarEstudiantesResponse = await estudianteService.getEstudiantes(params);

      setEstudiantes(response.estudiantes);
      setTotal(response.total);
      setPages(response.pages || 1);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.mensaje || err?.response?.data?.error || 'Error al cargar estudiantes';
      setError(errorMsg);
      console.error('Error al cargar estudiantes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEstudiantes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadEstudiantes();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <FaUserGraduate className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Estudiantes cargados desde Excel
            </h2>
            <p className="text-sm text-muted-foreground">
              Listado proveniente de la tabla <strong>estudiantes</strong> en la base de datos.
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Total registrados: <span className="font-semibold text-foreground">{total}</span>
        </div>
      </div>

      {/* Búsqueda */}
      <form onSubmit={handleSearchSubmit} className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cédula, nombre o email..."
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Buscar
        </button>
      </form>

      {error && (
        <div className="bg-destructive/10 border border-destructive/40 text-destructive text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-[3px] border-border border-t-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Cargando estudiantes...</p>
          </div>
        ) : estudiantes.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No se encontraron estudiantes para los filtros actuales.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Verifica el término de búsqueda o vuelve a cargar el Excel desde la sección correspondiente.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Cédula</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Nombre</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Escuela</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Nivel</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantes.map((est) => (
                    <tr key={est.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{est.cedula}</td>
                      <td className="px-4 py-3 text-foreground">
                        <div className="font-medium">{est.nombre}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {est.escuela || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {est.nivel || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {est.email || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div>
                Mostrando página <span className="font-semibold text-foreground">{page}</span> de{' '}
                <span className="font-semibold text-foreground">{pages}</span>. Total:{' '}
                <span className="font-semibold text-foreground">{total}</span> estudiantes.
              </div>
              {pages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors"
                  >
                    <FaChevronLeft className="text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors"
                  >
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EstudianteTable;

