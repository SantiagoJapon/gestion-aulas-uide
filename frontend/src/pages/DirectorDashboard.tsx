import { useState, useEffect, useContext } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import { AuthContext } from '../context/AuthContext';
import MapaCalor from '../components/MapaCalor';
import HorarioVisual from '../components/HorarioVisual';
import { planificacionService, distribucionService, notificacionService } from '../services/api';
import { Button } from '../components/common/Button';
import UserSettings from '../components/UserSettings';
import ReporteEjecutivo from '../components/ReporteEjecutivo';
import SubirEstudiantes from '../components/SubirEstudiantes';
import DocenteTable from '../components/DocenteTable';
import EstudianteTable from '../components/EstudianteTable';
import ClaseEditModal from '../components/ClaseEditModal';

const DirectorDashboard = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({ total_clases: 0, clases_asignadas: 0, clases_pendientes: 0, porcentaje_completado: 0 });
  const [misClases, setMisClases] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [editingClase, setEditingClase] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isComunicadoOpen, setIsComunicadoOpen] = useState(false); // Modal para comunicados

  // ... (Subcomponente interno o externo, aquí interno por brevedad)
  const ComunicadoModal = () => {
    const [titulo, setTitulo] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [prioridad, setPrioridad] = useState('MEDIA');
    const [sending, setSending] = useState(false);

    if (!isComunicadoOpen) return null;

    const handleEnviar = async (e: React.FormEvent) => {
      e.preventDefault();
      setSending(true);
      try {
        // El director envía a su carrera por defecto (backend valida req.user.carrera_id o carrera_director)
        // No necesitamos enviar carrera_id explícito si el backend lo deduce, 
        // pero para seguridad enviamos el que tenemos en user context si existe.
        const carreraId = user?.carrera?.id;

        await notificacionService.crear({
          titulo,
          mensaje,
          tipo: 'CARRERA',
          prioridad,
          carrera_id: carreraId // Opcional si el backend es inteligente
        });
        alert("Comunicado enviado exitosamente a todos los estudiantes de la carrera.");
        setIsComunicadoOpen(false);
        setTitulo('');
        setMensaje('');
      } catch (error) {
        console.error(error);
        alert("Error al enviar comunicado.");
      } finally {
        setSending(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
        <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-foreground tracking-tight">Nuevo Comunicado Oficial</h3>
            <button onClick={() => setIsComunicadoOpen(false)} className="text-muted-foreground hover:text-foreground">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <form onSubmit={handleEnviar} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Título</label>
              <input
                required
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Ej: Inicio de Exámenes Parciales"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Mensaje</label>
              <textarea
                required
                value={mensaje}
                onChange={e => setMensaje(e.target.value)}
                className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none h-32 resize-none"
                placeholder="Escriba el contenido del comunicado..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Prioridad</label>
              <div className="flex gap-2">
                {['BAJA', 'MEDIA', 'ALTA'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrioridad(p)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${prioridad === p
                      ? (p === 'ALTA' ? 'bg-red-500 text-white border-red-600' : p === 'MEDIA' ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-500 text-white border-slate-600')
                      : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 border-transparent'
                      }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2">
              <Button variant="primary" fullWidth loading={sending} type="submit">
                <span className="material-symbols-outlined text-lg mr-2">send</span>
                Enviar Comunicado
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const carreraId = user?.carrera?.id;
      const [resStats, resHorario] = await Promise.all([
        distribucionService.getEstado(carreraId),
        distribucionService.getMiDistribucion(carreraId)
      ]);

      if (resStats.success) setStats(resStats.estadisticas);
      if (resHorario.success) setMisClases(resHorario.clases || []);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleClaseUpdate = async () => {
    setIsEditModalOpen(false);
    setEditingClase(null);
    await loadStats();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const carreraId = user?.carrera?.id;
    if (!carreraId) {
      alert('No se pudo determinar el ID de tu carrera. Contacta al administrador.');
      return;
    }

    try {
      setUploading(true);
      const res = await planificacionService.subirPlanificacion(selectedFile, carreraId);
      if (res.success) {
        setSelectedFile(null);
        loadStats();
        alert('Planificación subida exitosamente');
      }
    } catch (error: any) {
      const mensaje = error.response?.data?.mensaje || error.message || 'Error al subir planificación';
      alert(mensaje);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-10 pb-20 animate-fade-in px-1">

            {/* 1. KPIs SUPERIORES - Vista Panorámica */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { label: 'Clases Totales', value: stats.total_clases, icon: 'analytics', color: 'blue', desc: 'Carga académica' },
                { label: 'Asignadas', value: stats.clases_asignadas, icon: 'verified', color: 'emerald', desc: 'Con aula física' },
                { label: 'Pendientes', value: stats.clases_pendientes, icon: 'clock_loader_40', color: 'orange', desc: 'Por distribuir' },
                { label: 'Conflictos', value: (stats as any).conflictos || 0, icon: 'warning', color: 'red', desc: 'Solapamientos' },
                { label: 'Eficiencia', value: `${stats.porcentaje_completado}%`, icon: 'query_stats', color: 'purple', desc: 'Meta institucional' }
              ].map((kpi, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-border/50 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`size-12 rounded-2xl bg-${kpi.color}-500/10 flex items-center justify-center text-${kpi.color}-600`}>
                      <span className="material-symbols-outlined text-2xl">{kpi.icon}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-foreground tracking-tighter leading-none">{loadingStats ? '...' : kpi.value}</h4>
                    <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest mt-2">{kpi.label}</p>
                    <p className="text-[9px] text-muted-foreground/60 font-medium uppercase mt-1">{kpi.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. AREA DE HORARIO (FULL WIDTH) - Fundamental para legibilidad */}
            <div className="w-full">
              <DashboardWidget
                title="Horario de Carrera"
                subtitle="Mapa cronológico de clases distribuidas"
                icon="calendar_view_week"
                noPadding
              >
                <div className="p-2 min-h-[500px] overflow-hidden rounded-[2rem]">
                  <HorarioVisual />
                </div>
              </DashboardWidget>
            </div>

            {/* 3. GRID DINÁMICO (Tabla + Acciones) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              {/* Listado Detallado (8/12) */}
              <div className="lg:col-span-8 space-y-8">
                <DashboardWidget
                  title="Detalle de Distribución"
                  subtitle="Verifique y edite estados de aulas individualmente"
                  icon="format_list_bulleted"
                >
                  <div className="overflow-x-auto -mx-6">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-muted/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/50">
                        <tr>
                          <th className="px-8 py-5">Materia / Nivel</th>
                          <th className="px-6 py-5">Horario</th>
                          <th className="px-6 py-5 text-center">Aula</th>
                          <th className="px-6 py-5 text-right">Docente</th>
                          <th className="px-8 py-5 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {loadingStats ? (
                          [1, 2, 3].map(i => (
                            <tr key={i} className="animate-pulse">
                              <td colSpan={5} className="px-8 py-10 h-20 bg-muted/5"></td>
                            </tr>
                          ))
                        ) : misClases.length > 0 ? (
                          misClases.slice(0, 8).map((clase, i) => (
                            <tr key={i} className="hover:bg-muted/20 transition-all group">
                              <td className="px-8 py-5">
                                <p className="font-black text-foreground text-xs leading-none">{clase.materia}</p>
                                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter mt-1.5 opacity-60">Ciclo {clase.ciclo} • {clase.paralelo}</p>
                              </td>
                              <td className="px-6 py-5">
                                <span className="inline-flex items-center px-2 py-1 rounded-xl bg-primary/5 text-primary text-[10px] font-black uppercase tracking-tighter ring-1 ring-primary/10">
                                  {clase.dia} {clase.hora_inicio}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-center">
                                {clase.estado === 'conflicto' ? (
                                  <span className="px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-black uppercase shadow-sm animate-pulse flex items-center justify-center gap-1 mx-auto w-fit">
                                    <span className="material-symbols-outlined text-xs">warning</span>
                                    Conflicto
                                  </span>
                                ) : clase.aula_asignada ? (
                                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black border border-emerald-500/20 uppercase shadow-sm">
                                    {typeof clase.aula === 'object' ? (clase.aula as any).nombre : clase.aula_asignada}
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-black border border-slate-500/20 uppercase">
                                    Sin Aula
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-5 text-right">
                                <p className="text-[10px] font-bold text-foreground/80 truncate max-w-[150px]">{clase.docente}</p>
                              </td>
                              <td className="px-8 py-5 text-right font-black">
                                <button
                                  onClick={() => { setEditingClase(clase); setIsEditModalOpen(true); }}
                                  className="size-10 rounded-2xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center ml-auto"
                                >
                                  <span className="material-symbols-outlined text-xl">edit_square</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-8 py-24 text-center">
                              <div className="bg-muted/20 size-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-4xl text-muted-foreground/30">inbox</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">Sin datos de distribución</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </DashboardWidget>
              </div>

              {/* BARRA LATERAL (4/12) */}
              <div className="lg:col-span-4 space-y-10">

                {/* Herramientas de Carga */}
                <DashboardWidget title="Centro de Datos" icon="database">
                  <div className="space-y-8">
                    {/* Horarios */}
                    <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 relative overflow-hidden group">
                      <div className="relative z-10">
                        <h4 className="text-[11px] font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">backup</span>
                          Subir Planificación
                        </h4>
                        <form onSubmit={handleUpload} className="space-y-4">
                          <label className="relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-primary/20 rounded-3xl hover:bg-primary/5 transition-all cursor-pointer group/label bg-white/50 dark:bg-black/20">
                            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <span className="material-symbols-outlined text-4xl text-primary/30 group-hover/label:text-primary transition-colors">upload_file</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase mt-3 text-center truncate w-full">
                              {selectedFile ? selectedFile.name : 'Seleccionar Excel'}
                            </span>
                          </label>
                          <Button variant="primary" fullWidth loading={uploading} size="sm" disabled={!selectedFile}>
                            Procesar Ahora
                          </Button>
                        </form>
                      </div>
                    </div>

                    {/* Acciones de Distribución */}
                    <div className="pt-6 border-t border-border">
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">settings_motion_mode</span>
                        Distribución Automática
                      </h4>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed">
                          Si ha subido una nueva planificación, ejecute el algoritmo para asignar aulas automáticamente a su carrera.
                        </p>
                        <Button
                          variant="secondary"
                          fullWidth
                          size="sm"
                          onClick={async () => {
                            if (!confirm('¿Iniciar distribución para ' + (user?.carrera?.carrera || 'su carrera') + '?')) return;
                            try {
                              const res = await distribucionService.ejecutarDistribucion(user?.carrera?.id);
                              if (res.success) {
                                alert('Distribución completada: ' + res.estadisticas.exitosas + ' clases asignadas.');
                                loadStats();
                              }
                            } catch (e: any) {
                              alert(e.response?.data?.mensaje || 'Error al ejecutar distribución');
                            }
                          }}
                        >
                          <span className="material-symbols-outlined text-base mr-2">auto_fix_high</span>
                          Ejecutar Distribución
                        </Button>
                      </div>
                    </div>

                    {/* Estudiantes */}
                    <div className="pt-6 border-t border-border">
                      <div className="text-[10px] font-black text-foreground uppercase mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-primary rounded-full"></div> Sheet 1: Estudiantes
                      </div>
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">group_add</span>
                        Carga de Estudiantes
                      </h4>
                      <SubirEstudiantes isCompact />
                    </div>
                  </div>
                </DashboardWidget>

                {/* Perfil del Director */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all duration-700">
                    <span className="material-symbols-outlined text-[12rem]">verified_user</span>
                  </div>
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="size-20 bg-primary text-white rounded-[1.5rem] flex items-center justify-center font-black text-3xl shadow-xl border-4 border-white/10 group-hover:scale-105 transition-transform">
                      {user?.nombre?.[0]}{user?.apellido?.[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-xl leading-none tracking-tight mb-2">{user?.nombre}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-3">Director Académico</p>
                      <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                        <span className="size-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                        Sesión Activa
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Carrera Asignada</p>
                    <p className="text-sm font-bold text-slate-200 truncate">{user?.carrera?.carrera || user?.carrera_director || 'Carrera UIDE'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. MAPA DE CALOR (ANCHO COMPLETO) - Evita el amontonamiento visual */}
            <div className="pt-10 border-t border-border/50">
              <DashboardWidget
                title="Monitoreo de Saturación"
                subtitle="Mapa de calor detallado de ocupación de aulas por franja horaria"
                icon="grid_view"
                noPadding
              >
                <div className="p-4 overflow-hidden rounded-[2rem] bg-background">
                  <MapaCalor carreraId={user?.carrera?.id} />
                </div>
              </DashboardWidget>
            </div>
          </div>
        );
      case 'heatmap':
        return <MapaCalor />;
      case 'estudiantes':
        const nombreCarrera = user?.carrera?.carrera || user?.carrera_director || '';
        return (
          <div className="space-y-12 animate-fade-in pb-20">
            <DashboardWidget
              title="Base de Datos de Alumnado"
              subtitle={`Estudiantes registrados en la carrera de ${nombreCarrera}`}
              icon="people"
              action={
                <Button size="sm" variant="secondary" onClick={() => setIsComunicadoOpen(true)}>
                  <span className="material-symbols-outlined text-sm mr-2">campaign</span>
                  Enviar Comunicado
                </Button>
              }
            >
              <div className="mt-4">
                <EstudianteTable carreraNombre={nombreCarrera} />
              </div>
            </DashboardWidget>

            <DashboardWidget
              title="Carga Masiva de Alumnos"
              subtitle="Importar listado oficial desde archivo Excel"
              icon="upload_file"
            >
              <div className="mt-4">
                <SubirEstudiantes carreraNombre={nombreCarrera} isCompact />
              </div>
            </DashboardWidget>
          </div>
        );
      case 'docentes':
        return (
          <DashboardWidget title="Plantilla Docente" icon="badge">
            <DocenteTable carreraId={user?.carrera?.id || 0} />
          </DashboardWidget>
        );
      case 'settings':
        return <UserSettings />;
      case 'reportes':
        return <ReporteEjecutivo carreraPreseleccionada={{ id: user?.carrera?.id || 0, nombre: user?.carrera?.carrera || '' }} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      title="Director"
      subtitle="UIDE Gestión"
    >
      <div className="mb-12 px-2 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-foreground tracking-tighter leading-none mb-3">
            {user ? `${user.nombre}` : 'Bienvenido'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10">
              UIDE Académico
            </span>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
              {new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </div>

      {renderContent()}

      <ClaseEditModal
        clase={editingClase}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleClaseUpdate}
      />

      <ComunicadoModal />
    </DashboardLayout>
  );
};

export default DirectorDashboard;
