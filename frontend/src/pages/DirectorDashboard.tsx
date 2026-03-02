import { useState, useEffect, useContext } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import { AuthContext } from '../context/AuthContext';
import MapaCalor from '../components/MapaCalor';
import HorarioVisual from '../components/HorarioVisual';
import { planificacionService, distribucionService } from '../services/api';
import { Button } from '../components/common/Button';
import UserSettings from '../components/UserSettings';
import ReporteEjecutivo from '../components/ReporteEjecutivo';
import SubirEstudiantes from '../components/SubirEstudiantes';
import DocenteTable from '../components/DocenteTable';
import MateriaManagement from '../components/MateriaManagement';
import EstudianteTable from '../components/EstudianteTable';
import ImportarCupos from '../components/ImportarCupos';
import ClaseEditModal from '../components/ClaseEditModal';
import DisponibilidadAulas from '../components/DisponibilidadAulas';
import GuidedTour from '../components/common/GuidedTour';
import { Step } from 'react-joyride';

import { HealthReportModal } from '../components/director/HealthReportModal';
import { ComunicadoModal } from '../components/director/ComunicadoModal';
import IncidenciasView from '../components/IncidenciasView';
import ReservasAdminView from '../components/reservas/ReservasAdminView';

const DirectorDashboard = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // --- Tour de Guia ---
  const [runTour, setRunTour] = useState(false);

  const tourSteps: Step[] = [
    {
      target: '#tour-logo',
      content: 'Bienvenido Director de Carrera. Este sistema te ayuda a gestionar la planificación académica de tu carrera.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#tour-nav-general',
      content: 'En INICIO verás un resumen de tu carrera: clases programadas, docentes asignados, conflictos y el porcentaje de eficiencia de distribución.',
      placement: 'right',
    },
    {
      target: '#tour-centro-datos',
      content: 'En el CENTRO DE DATOS puedes subir la planificación académica desde Excel con el botón "Subir Planificación" y ejecutar la distribución automática de clases.',
      placement: 'left',
    },
    {
      target: '#tour-nav-docentes',
      content: 'En DOCENTES gestionas la información de tus docentes: contacto, títulos y disponibilidad.',
      placement: 'right',
    },
    {
      target: '#tour-nav-estudiantes',
      content: 'En ESTUDIANTES puedes subir el listado de estudiantes inscritos desde Excel.',
      placement: 'right',
    },
    {
      target: '#tour-nav-incidencias',
      content: 'En INCIDENCIAS puedes reportar problemas de aulas, equipos o solicitar mantenimiento.',
      placement: 'right',
    },
    {
      target: '#tour-help-button',
      content: 'Si necesitas ayuda en cualquier momento, haz clic en este botón dorado de ayuda para reiniciar el tour.',
      placement: 'top-end',
      disableScrolling: true,
      spotlightPadding: 10,
    },
  ];

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('uide_tour_director_v1');
    if (!hasSeenTour) {
      setTimeout(() => setRunTour(true), 1000);
    }

    const handleRestart = () => {
      localStorage.removeItem('uide_tour_director_v1');
      setRunTour(false);
      setTimeout(() => setRunTour(true), 100);
    };

    window.addEventListener('restart-uide-tour', handleRestart);
    return () => window.removeEventListener('restart-uide-tour', handleRestart);
  }, []);

  const handleTourFinish = () => {
    localStorage.setItem('uide_tour_director_v1', 'true');
    setRunTour(false);
  };

  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({ total_clases: 0, clases_asignadas: 0, clases_pendientes: 0, sobrecupos: 0, porcentaje_completado: 0 });
  const [misClases, setMisClases] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [editingClase, setEditingClase] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isComunicadoOpen, setIsComunicadoOpen] = useState(false);
  const [healthReport, setHealthReport] = useState<any>(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

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

      if (resStats.success) {
        const clases = resHorario.success ? (resHorario.clases || []) : [];
        setStats({
          ...resStats.estadisticas,
          sobrecupos: clases.filter((c: any) => c.sobrecupo).length
        });
      }
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
        if (res.reporte_salud) {
          setHealthReport(res.reporte_salud);
          setIsHealthModalOpen(true);
        } else {
          alert('Planificación subida exitosamente');
        }
        loadStats();
      }
    } catch (error: any) {
      const mensaje = error.response?.data?.mensaje || error.message || 'Error al subir planificación';
      alert(mensaje);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const openManualManagement = () => {
    setActiveTab('docentes');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-10 pb-20 animate-fade-in px-1">

            {/* 1. KPIs SUPERIORES - Vista Panorámica */}
            <div id="tour-kpis-director" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Clases Totales', value: stats.total_clases, icon: 'analytics', color: 'blue', desc: 'Carga académica' },
                { label: 'Asignadas', value: stats.clases_asignadas, icon: 'verified', color: 'emerald', desc: 'Con aula física' },
                { label: 'Pendientes', value: stats.clases_pendientes, icon: 'clock_loader_40', color: 'orange', desc: 'Por distribuir' },
                { label: 'Conflictos', value: (stats as any).conflictos || 0, icon: 'warning', color: 'red', desc: 'Solapamientos' },
                { label: 'Sobrecupo', value: stats.sobrecupos, icon: 'event_seat', color: 'amber', desc: 'Capacidad excedida' },
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
            <div id="tour-horario-carrera" className="w-full">
              <DashboardWidget
                title="Horario de Carrera"
                subtitle="Mapa cronológico de clases distribuidas"
                icon="calendar_view_week"
                noPadding
              >
                <div className="p-2 min-h-[500px] overflow-hidden rounded-[2rem]">
                  <HorarioVisual carreraId={user?.carrera?.id} />
                </div>
              </DashboardWidget>
            </div>

            {/* 3. PANEL DE ALERTAS DE SOBRECUPO */}
            {misClases.filter((c: any) => c.sobrecupo).length > 0 && (
              <div className="rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-900/50 flex items-center gap-3">
                  <div className="size-9 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-600 text-xl">event_seat</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest">Alertas de Sobrecupo</h3>
                    <p className="text-[10px] text-amber-600/80 dark:text-amber-400/60 font-medium">
                      {misClases.filter((c: any) => c.sobrecupo).length} clase(s) asignadas a aulas con capacidad insuficiente — haz clic en Reasignar para ver alternativas disponibles
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
                  {misClases.filter((c: any) => c.sobrecupo).map((clase: any, i: number) => (
                    <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-amber-100/40 dark:hover:bg-amber-900/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-foreground truncate">{clase.materia}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          {clase.dia} {clase.hora_inicio} · Ciclo {clase.ciclo}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase">{clase.aula_asignada}</p>
                          <p className="text-[10px]">
                            <span className="text-red-600 font-black">{clase.num_estudiantes} est</span>
                            <span className="text-muted-foreground"> / {clase.aula_capacidad} cap ({clase.porcentaje_uso}%)</span>
                          </p>
                        </div>
                        <button
                          onClick={() => { setEditingClase(clase); setIsEditModalOpen(true); }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase transition-colors shadow-sm"
                        >
                          <span className="material-symbols-outlined text-sm">swap_horiz</span>
                          Reasignar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. GRID DINÁMICO (Tabla + Acciones) */}
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
                                ) : clase.estado === 'sobrecupo' ? (
                                  <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase shadow-sm flex items-center justify-center gap-1 mx-auto w-fit">
                                    <span className="material-symbols-outlined text-xs">event_seat</span>
                                    Sobrecupo
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
                <div id="tour-centro-datos">
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

                      {/* Gestión Manual */}
                      <div className="pt-6 border-t border-border">
                        <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">edit_calendar</span>
                          Gestión Académica Manual
                        </h4>
                        <div className="space-y-3">
                          <Button
                            variant="secondary"
                            fullWidth
                            size="sm"
                            className="rounded-2xl"
                            onClick={openManualManagement}
                          >
                            <span className="material-symbols-outlined text-base mr-2">person_add</span>
                            Gestionar por Docente
                          </Button>
                          <div className="p-4 bg-muted/30 rounded-2xl border border-dashed border-border text-center">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter leading-tight italic">
                              💡 Ve a "Docentes" y haz clic en 📖 para configurar carga.
                            </p>
                          </div>
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
                </div>

                {/* Perfil del Director */}
                <div id="tour-perfil-director" className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
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
      case 'disponibilidad':
        return <DisponibilidadAulas />;
      case 'reservas':
        return <ReservasAdminView />;
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

            <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10">
              <h5 className="text-xs font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">info</span>
                ¿Cómo gestionar estudiantes irregulares o con homologación?
              </h5>
              <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                Para estudiantes que no siguen un ciclo regular (repetidores o con materias homologadas):
                <br />1. Localice al estudiante en la tabla superior.
                <br />2. Haga clic en el botón <strong>CALENDAR_MONTH Carga</strong>.
                <br />3. Allí podrá añadir o quitar materias de <strong>cualquier ciclo</strong> de la carrera para personalizar su horario.
              </p>
            </div>

            <DashboardWidget
              title="Carga Masiva de Alumnos"
              subtitle="Importar listado oficial desde archivo Excel"
              icon="upload_file"
            >
              <div className="mt-4">
                <SubirEstudiantes carreraNombre={nombreCarrera} isCompact />
              </div>
            </DashboardWidget>

            <DashboardWidget
              title="Sincronización de Inscripciones (Cupos)"
              subtitle="Vincular estudiantes con sus materias proyectadas"
              icon="sync_alt"
            >
              <div className="mt-4">
                <ImportarCupos isCompact />
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
      case 'materias':
        return (
          <DashboardWidget title="Catálogo de Materias" subtitle="Administración de la malla curricular" icon="menu_book">
            <MateriaManagement carreraId={user?.carrera?.id || 0} />
          </DashboardWidget>
        );
      case 'settings':
        return <UserSettings />;
      case 'reportes':
        return <ReporteEjecutivo carreraPreseleccionada={{ id: user?.carrera?.id || 0, nombre: user?.carrera?.carrera || '' }} />;
      case 'incidencias':
        return <IncidenciasView />;
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
      {/* Friendly Header Card */}
      <div id="tour-header-card" className="bg-gradient-to-br from-[#003da5] via-[#002D72] to-[#001a4d] rounded-[2.5rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl shadow-uide-blue/30 border border-white/10 group mb-12">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-white/15 transition-all duration-700"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex flex-col lg:flex-row items-center gap-6 text-center lg:text-left">
            {/* Mascot / Avatar */}
            <div className="relative shrink-0">
              <div className="size-24 sm:size-32 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-inner overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                <img src="/image_guia.png" alt="Mascota UIDE" className="w-full h-full object-contain" />
              </div>
              <div className="absolute -bottom-2 -right-2 size-10 bg-uide-gold border-4 border-[#002D72] rounded-full flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-lg">verified_user</span>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-3">
                <span className="bg-uide-gold/20 text-uide-gold px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-uide-gold/20">Panel Directivo</span>
                <span className="bg-white/10 text-white/80 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-sm">Gestión Académica</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">
                ¡Hola, <span className="text-uide-gold">{user?.nombre}</span>!
              </h2>
              <p className="text-base sm:text-lg font-medium text-white/70 max-w-lg leading-relaxed italic">
                {user?.carrera?.carrera || "Director de Facultad"} • Loja, Ecuador
              </p>
              <div className="mt-4 flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('restart-uide-tour'))}
                  className="text-xs font-bold bg-white text-[#002D72] px-4 py-2 rounded-xl hover:bg-uide-gold hover:text-white transition-all shadow-lg active:scale-95"
                >
                  Reiniciar Guía
                </button>
                <button
                  onClick={() => setIsComunicadoOpen(true)}
                  className="text-[11px] font-black bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-all shadow-lg active:scale-95 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">campaign</span>
                  Comunicado Docentes
                </button>
                <p className="text-[11px] text-white/50 font-medium uppercase tracking-widest">
                  {new Date().toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-[2rem] min-w-[200px] flex-col items-center justify-center text-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-uide-gold">Estado Global</span>
            <div className="text-3xl font-black">ACTIVO</div>
            <div className="flex items-center gap-1.5">
              <div className="size-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-white/60">Sincronizado</span>
            </div>
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

      <HealthReportModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        report={healthReport}
      />

      <ComunicadoModal
        isOpen={isComunicadoOpen}
        onClose={() => setIsComunicadoOpen(false)}
        user={user}
      />

      <GuidedTour
        steps={tourSteps}
        run={runTour}
        onFinish={handleTourFinish}
      />

    </DashboardLayout>
  );
};

export default DirectorDashboard;
