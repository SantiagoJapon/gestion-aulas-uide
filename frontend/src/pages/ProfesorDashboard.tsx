import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { distribucionService, notificacionService, incidenciaService } from '../services/api';
import UserSettings from '../components/UserSettings';
import HorarioVisual from '../components/HorarioVisual';
import ReservaWidget from '../components/reservas/ReservaWidget';
import GuidedTour from '../components/common/GuidedTour';
import { Step } from 'react-joyride';
import IncidenciasView from '../components/IncidenciasView';


// --- Utility Functions ---

const getNomalizedDay = () => {
  const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const today = new Date().getDay();
  return days[today];
};

const getStatusClass = (start: string, end: string) => {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  if (currentMins >= startMins && currentMins < endMins) return 'actual';
  if (currentMins < startMins) return 'futura';
  return 'pasada';
};

// --- Modals ---

const ClassActionModal = ({ isOpen, onClose, clase }: { isOpen: boolean; onClose: () => void; clase: any }) => {
  const [step, setStep] = useState<'menu' | 'avisar' | 'reportar'>('menu');
  const [mensaje, setMensaje] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('menu');
      setMensaje('');
    }
  }, [isOpen]);

  if (!isOpen || !clase) return null;

  const handleSendNotification = async (msg: string) => {
    setSending(true);
    try {
      await notificacionService.crear({
        prioridad: msg.includes('cancelada') || msg.includes('tarde') ? 'ALTA' : 'MEDIA',
        clase_id: clase.id,
        tipo: 'CLASE',
        titulo: `Aviso Informativo - ${clase.materia}`,
        mensaje: msg
      });
      alert(`Mensaje enviado a los estudiantes de ${clase.materia}:\n"${msg}"`);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al enviar notificación.");
    } finally {
      setSending(false);
    }
  };

  // const [reportStep, setReportStep] = useState(false); // Unused
  const [problema, setProblema] = useState('');
  const [detalles, setDetalles] = useState('');

  const handleSendReport = async () => {
    if (!problema) {
      alert("Seleccione un tipo de problema");
      return;
    }
    setSending(true);
    try {
      // Mapeo simple de texto a ENUM
      let tipo = 'OTRO';
      if (problema.includes('Proyector')) tipo = 'HARDWARE';
      if (problema.includes('Computadora')) tipo = 'HARDWARE';
      if (problema.includes('Limpieza')) tipo = 'LIMPIEZA';
      if (problema.includes('Aire')) tipo = 'CLIMATIZACION';

      const formDataIncidencia = new FormData();
      formDataIncidencia.append('titulo', problema);
      formDataIncidencia.append('descripcion', detalles || 'Sin detalles adicionales');
      formDataIncidencia.append('tipo', tipo);
      formDataIncidencia.append('prioridad', 'MEDIA');
      formDataIncidencia.append('aula_codigo', clase.codigo || clase.aula || 'S/A');

      await incidenciaService.crear(formDataIncidencia);
      alert("Reporte enviado a administración. Se generó un ticket de incidencia.");
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al enviar reporte");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-brand-navy text-white relative shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded">{clase.codigo}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">{clase.aula || 'Sin Aula'}</span>
          </div>
          <h3 className="text-xl font-black leading-tight">{clase.materia}</h3>
          <p className="text-sm font-medium opacity-90 mt-1">{clase.hora_inicio} - {clase.hora_fin}</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {step === 'menu' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-2 text-center">Seleccione una acción</p>

              <button
                onClick={() => setStep('avisar')}
                className="w-full p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 flex items-center gap-4 hover:shadow-lg hover:shadow-amber-500/10 transition-all group"
              >
                <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">campaign</span>
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-black text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400">Enviar Aviso a Estudiantes</h4>
                  <p className="text-xs text-muted-foreground">Notifica retrasos, cambios o mensajes urgentes.</p>
                </div>
                <span className="material-symbols-outlined text-muted-foreground ml-auto">chevron_right</span>
              </button>

              <button
                onClick={() => setStep('reportar')}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:shadow-lg transition-all group"
              >
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">build</span>
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-black text-foreground">Reportar Incidencia de Aula</h4>
                  <p className="text-xs text-muted-foreground">Equipo dañado, limpieza, iluminación...</p>
                </div>
                <span className="material-symbols-outlined text-muted-foreground ml-auto">chevron_right</span>
              </button>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 mt-4">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-bold text-blue-800 dark:text-blue-300">Estudiantes Inscritos</span>
                  <span className="bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-black text-[10px]">{clase.estudiantes || 0}</span>
                </div>
                <div className="h-1.5 w-full bg-blue-200 dark:bg-blue-900/50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-2/3"></div>
                </div>
              </div>
            </div>
          )}

          {step === 'avisar' && (
            <div className="space-y-4 animate-fade-in">
              <button onClick={() => setStep('menu')} className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
                <span className="material-symbols-outlined text-sm">arrow_back</span> Volver
              </button>

              <h4 className="text-lg font-black text-foreground">Enviar Notificación</h4>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { text: "Llegaré 5 min tarde", icon: "timer_5" },
                  { text: "Llegaré 10 min tarde", icon: "timer_10" },
                  { text: "Clase en Laboratorio", icon: "science" },
                  { text: "Clase Virtual (Link en EVEA)", icon: "videocam" }
                ].map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendNotification(opt.text)}
                    className="p-3 bg-muted/50 hover:bg-primary/10 hover:border-primary/30 border border-border rounded-xl text-left transition-all active:scale-95 group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-xl group-hover:scale-110 transition-transform">{opt.icon}</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground group-hover:text-primary leading-tight">{opt.text}</span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-3 material-symbols-outlined text-muted-foreground text-sm">edit</span>
                <textarea
                  value={mensaje}
                  onChange={e => setMensaje(e.target.value)}
                  placeholder="Escribir mensaje personalizado..."
                  className="w-full pl-9 pr-4 py-3 bg-muted/30 border border-border rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                ></textarea>
              </div>

              <button
                onClick={() => handleSendNotification(mensaje)}
                disabled={!mensaje.trim() || sending}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                    Enviar Mensaje
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'reportar' && (
            <div className="space-y-4 animate-fade-in">
              <button onClick={() => setStep('menu')} className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
                <span className="material-symbols-outlined text-sm">arrow_back</span> Volver
              </button>
              <h4 className="text-lg font-black text-foreground">Reportar Incidencia</h4>
              <p className="text-xs text-muted-foreground mb-4">La administración recibirá este reporte inmediatamente.</p>

              <div className="space-y-3">
                <select
                  value={problema}
                  onChange={(e) => setProblema(e.target.value)}
                  className="w-full p-3 rounded-xl bg-muted/30 border border-border text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">Seleccione el problema...</option>
                  <option value="Proyector Dañado">Proyector Dañado</option>
                  <option value="Computadora/Audio">Computadora/Audio</option>
                  <option value="Limpieza / Orden">Limpieza / Orden</option>
                  <option value="Iluminación / Aire Acond.">Iluminación / Aire Acond.</option>
                  <option value="Mobiliario">Mobiliario</option>
                  <option value="Otro">Otro</option>
                </select>
                <textarea
                  value={detalles}
                  onChange={(e) => setDetalles(e.target.value)}
                  placeholder="Detalles adicionales..."
                  className="w-full p-3 bg-muted/30 border border-border rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                ></textarea>
                <button
                  onClick={handleSendReport}
                  disabled={sending}
                  className="w-full py-3 bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">build</span>
                      Enviar Reporte
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Aviso General Modal ---

const MENSAJES_PREDEFINIDOS = [
  { text: 'Llegaré 5 minutos tarde, espérenme en el aula.', icon: 'timer_5' },
  { text: 'La clase de hoy será en laboratorio.', icon: 'science' },
  { text: 'El enlace para la clase virtual está en el EVEA.', icon: 'videocam' },
  { text: 'La clase de hoy ha sido cancelada.', icon: 'cancel' },
];

const AvisoGeneralModal = ({ isOpen, onClose, schedule }: { isOpen: boolean; onClose: () => void; schedule: any[] }) => {
  const [claseId, setClaseId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [prioridad, setPrioridad] = useState('MEDIA');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMensaje('');
      setPrioridad('MEDIA');
      if (schedule.length > 0) setClaseId(String(schedule[0].id));
    }
  }, [isOpen, schedule]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!mensaje.trim() || !claseId) return;
    setSending(true);
    try {
      const claseSeleccionada = schedule.find(c => String(c.id) === claseId);
      await notificacionService.crear({
        titulo: `Aviso — ${claseSeleccionada?.materia || 'Clase'}`,
        mensaje,
        tipo: 'CLASE',
        prioridad,
        clase_id: Number(claseId),
      });
      alert('Aviso enviado correctamente a los estudiantes de la clase.');
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al enviar el aviso.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-brand-navy text-white relative shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <span className="material-symbols-outlined text-uide-gold text-lg">campaign</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Aviso General</span>
          </div>
          <h3 className="text-xl font-black leading-tight">Notificar a Estudiantes</h3>
          <p className="text-sm text-white/70 mt-1">Selecciona la clase y el mensaje.</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
          {/* Selector de clase */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Clase</label>
            <select
              value={claseId}
              onChange={e => setClaseId(e.target.value)}
              className="w-full p-3 rounded-xl bg-muted/30 border border-border text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {schedule.length === 0 && <option value="">Sin clases asignadas</option>}
              {schedule.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.materia} · {c.dia} {c.hora_inicio}–{c.hora_fin}
                </option>
              ))}
            </select>
          </div>

          {/* Mensajes predefinidos */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mensajes rápidos</label>
            <div className="grid grid-cols-2 gap-2">
              {MENSAJES_PREDEFINIDOS.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setMensaje(opt.text)}
                  className={`p-3 rounded-2xl text-left border transition-all group active:scale-95 ${mensaje === opt.text
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-muted/50 border-border hover:bg-primary/5 hover:border-primary/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl block mb-1 group-hover:scale-110 transition-transform">{opt.icon}</span>
                  <span className="text-[10px] font-bold leading-tight">{opt.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mensaje personalizado */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mensaje personalizado</label>
            <textarea
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder="Escribe un mensaje personalizado..."
              className="w-full p-3 bg-muted/30 border border-border rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          {/* Prioridad */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Prioridad</label>
            <div className="flex gap-2">
              {[
                { val: 'BAJA', label: 'Baja' },
                { val: 'MEDIA', label: 'Media' },
                { val: 'ALTA', label: 'Alta (Urgente)' },
              ].map(p => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setPrioridad(p.val)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${prioridad === p.val
                    ? (p.val === 'ALTA' ? 'bg-red-500 text-white border-red-600' : p.val === 'MEDIA' ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-500 text-white border-slate-600')
                    : 'bg-muted/20 text-muted-foreground border-transparent hover:bg-muted/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Enviar */}
          <button
            onClick={handleSend}
            disabled={!mensaje.trim() || !claseId || sending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? (
              <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">send</span>
                Enviar notificación
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Components ---

const TimelineDocente = ({ classes, onClassClick }: { classes: any[], onClassClick: (c: any) => void }) => {
  if (classes.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center opacity-50 bg-muted/30 rounded-3xl border border-dashed border-border">
        <span className="material-symbols-outlined text-5xl mb-2 text-muted-foreground">event_busy</span>
        <p className="text-sm font-bold">No tienes clases asignadas hoy</p>
      </div>
    )
  };

  return (
    <div className="space-y-4">
      {classes.map((c, i) => {
        const estado = getStatusClass(c.hora_inicio, c.hora_fin);
        return (
          <div
            key={i}
            onClick={() => onClassClick(c)}
            className={`relative p-5 rounded-2xl border transition-all cursor-pointer group ${estado === 'actual'
              ? 'bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white border-brand-navy shadow-xl shadow-brand-navy/20 scale-[1.02]'
              : 'bg-card hover:bg-muted/50 border-border hover:border-primary/30 hover:shadow-lg'
              }`}
          >
            {estado === 'actual' && (
              <span className="absolute top-4 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
              </span>
            )}

            <div className="flex items-start justify-between mb-2">
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded mb-2 inline-block ${estado === 'actual' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                  {c.hora_inicio} - {c.hora_fin}
                </span>
                <h4 className="text-lg font-black uppercase tracking-tight leading-none mb-1">{c.materia}</h4>
                <p className={`text-xs font-medium ${estado === 'actual' ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {c.carrera || 'Ingeniería'} • Nivel {c.nivel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10 dark:border-border/10">
              <div className="flex items-center gap-2">
                <div className={`size-8 rounded-full flex items-center justify-center ${estado === 'actual' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                  <span className="material-symbols-outlined text-sm">room</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-[9px] font-bold uppercase ${estado === 'actual' ? 'text-white/60' : 'text-muted-foreground'}`}>Aula</span>
                  <span className="text-xs font-black uppercase">{c.aula || 'S/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span className={`text-[9px] font-bold uppercase ${estado === 'actual' ? 'text-white/60' : 'text-muted-foreground'}`}>Alumnos</span>
                  <span className="text-xs font-black uppercase">{c.estudiantes || 0} inscritos</span>
                </div>
              </div>

              <div className="ml-auto">
                <span className={`text-xs font-bold uppercase flex items-center gap-1 group-hover:underline ${estado === 'actual' ? 'text-white' : 'text-primary'}`}>
                  Gestionar <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )
}



export default function ProfesorDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('general');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isAvisoOpen, setIsAvisoOpen] = useState(false);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await distribucionService.getMiDistribucion();
        if (res.success && res.clases) {
          setSchedule(res.clases);
        }
      } catch (error) {
        console.error("Error al cargar horario:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const todayName = getNomalizedDay();
  const clasesHoy = schedule
    .filter(c => c.dia.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === todayName)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  // Next class logic
  const nextClass = clasesHoy.find(c => getStatusClass(c.hora_inicio, c.hora_fin) !== 'pasada');

  // --- Tour Logic ---
  const [runTour, setRunTour] = useState(false);
  const tourSteps: Step[] = [
    {
      target: '#tour-logo',
      content: '¡Bienvenido a su Panel Docente! Aquí podrá gestionar sus clases y comunicarse con sus estudiantes.',
      placement: 'right' as const,
      disableBeacon: true,
    },
    {
      target: '#tour-search',
      content: 'El Buscador Global le permite verificar el estado de cualquier aula o docente de la facultad al instante.',
    },
    {
      target: '#tour-header-profe',
      content: 'Este es su resumen de hoy. Verá rápidamente su próxima actividad y el lugar asignado.',
    },
    {
      target: '#tour-clases-profe',
      content: 'Aquí tiene su lista de clases de hoy. Al hacer clic en una, podrá enviar avisos a sus alumnos o reportar problemas técnicos en el aula.',
    },
    {
      target: '#tour-reservas-profe',
      content: 'Como docente, también puede reservar espacios especiales para tutorías o reuniones.',
    },
    {
      target: '#tour-nav-horario',
      content: 'Acceda a su horario completo semanal desde aquí para una mejor planificación.',
    },
    {
      target: '#tour-help-button',
      content: 'Si tiene dudas sobre las nuevas funciones, puede reiniciar esta guía aquí.',
      placement: 'top-end',
      disableScrolling: true,
      spotlightPadding: 10,
    }
  ];

  useEffect(() => {
    // Auto-ejecución solo la primera vez para profesores
    const hasSeenTour = localStorage.getItem('uide_tour_profesor_v1');
    if (!hasSeenTour) {
      setRunTour(true);
    }

    // Escuchar reinicio manual
    const handleRestart = () => {
      setRunTour(false);
      setTimeout(() => setRunTour(true), 100);
    };

    window.addEventListener('restart-uide-tour', handleRestart);
    return () => window.removeEventListener('restart-uide-tour', handleRestart);
  }, []);

  const handleTourFinish = () => {
    localStorage.setItem('uide_tour_profesor_v1', 'true');
    setRunTour(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6 animate-fade-in">
            <GuidedTour steps={tourSteps} run={runTour} onFinish={handleTourFinish} />
            {/* Header */}
            {/* Friendly Header Card */}
            <div id="tour-header-profe" className="bg-gradient-to-br from-[#003da5] via-[#002D72] to-[#001a4d] rounded-[2.5rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl shadow-uide-blue/30 border border-white/10 group">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-white/15 transition-all duration-700"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex flex-col lg:flex-row items-center gap-6 text-center lg:text-left">
                  {/* Mascot / Avatar */}
                  <div className="relative shrink-0">
                    <div className="size-24 sm:size-32 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-inner overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <img src="/image_guia.png" alt="Mascota UIDE" className="w-full h-full object-contain" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 size-10 bg-emerald-500 border-4 border-[#002D72] rounded-full flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-white text-lg">school</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-3">
                      <span className="bg-uide-gold/20 text-uide-gold px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-uide-gold/20">Portal Docente</span>
                      <span className="bg-white/10 text-white/80 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-sm">Cuerpo Académico</span>
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">
                      ¡Hola, <span className="text-uide-gold">Prof. {user?.nombre}</span>!
                    </h2>
                    <p className="text-base sm:text-lg font-medium text-white/70 max-w-lg leading-relaxed italic">
                      "Formando líderes con valores. Tienes {clasesHoy.length} clases para hoy."
                    </p>
                    <div className="mt-4 flex items-center justify-center lg:justify-start gap-4">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('restart-uide-tour'))}
                        className="text-xs font-bold bg-white text-[#002D72] px-4 py-2 rounded-xl hover:bg-uide-gold hover:text-white transition-all shadow-lg active:scale-95"
                      >
                        Recorrido Docente
                      </button>
                      <button
                        onClick={() => setIsAvisoOpen(true)}
                        className="text-[11px] font-black bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-all shadow-lg"
                      >
                        <span className="material-symbols-outlined text-xs mr-1 align-middle">campaign</span>
                        AVISO GENERAL
                      </button>
                    </div>
                  </div>
                </div>

                {nextClass ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2rem] min-w-[240px] flex flex-col gap-2 shadow-2xl hover:bg-white/15 transition-colors border-l-4 border-l-uide-gold">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-uide-gold">Próxima Clase</span>
                      <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black">{nextClass.hora_inicio}</span>
                      <span className="text-xs font-medium text-white/60">en {nextClass.aula || 'S/A'}</span>
                    </div>
                    <span className="text-sm font-black truncate max-w-[200px] uppercase tracking-tight">{nextClass.materia}</span>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10 text-[11px] text-white/80">
                      <span className="material-symbols-outlined text-sm">group</span>
                      <span className="font-medium">{nextClass.estudiantes || 0} Estudiantes inscritos</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] min-w-[240px] flex flex-col justify-center items-center text-center gap-3 shadow-xl">
                    <div className="size-16 bg-white/10 rounded-full flex items-center justify-center mb-1">
                      <span className="material-symbols-outlined text-4xl text-uide-gold">verified</span>
                    </div>
                    <div>
                      <span className="block text-sm font-black uppercase tracking-widest text-white">¡Jornada Completa!</span>
                      <span className="text-[10px] text-white/50 font-medium">No tienes más clases hoy</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Column */}
              <div id="tour-clases-profe" className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Agenda de Hoy</h3>
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">{new Date().toLocaleDateString()}</span>
                </div>

                {loading ? (
                  <div className="p-12 text-center text-muted-foreground">Cargando agenda...</div>
                ) : (
                  <TimelineDocente classes={clasesHoy} onClassClick={(c) => setSelectedClass(c)} />
                )}
              </div>

              {/* Sidebar Column */}
              <div id="tour-reservas-profe" className="space-y-6">
                <ReservaWidget />

                <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white shadow-lg">
                  <h4 className="font-black text-lg mb-2">¿Necesitas Ayuda?</h4>
                  <p className="text-xs text-white/80 mb-4 leading-relaxed">
                    Contacta con soporte técnico si tienes problemas con el equipamiento del aula.
                  </p>
                  <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold uppercase transition-colors">
                    Contactar Soporte
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'horario':
        return (
          <div className="space-y-6 animate-fade-in">
            <HorarioVisual mode="personal" title="Mi Horario Académico" />
          </div>
        );

      case 'incidencias':
        return <IncidenciasView />;

      case 'settings':
        return <UserSettings />;

      default:
        // No llamar setActiveTab aquí — sería setState-durante-render (causa pantalla en blanco).
        // Si el tab no existe, mostrar el contenido principal.
        return (
          <div className="space-y-6 animate-fade-in">
            <GuidedTour steps={tourSteps} run={runTour} onFinish={handleTourFinish} />
            {/* Si llegamos aquí con un tab desconocido, redirigir al inicio */}
            <div className="p-8 text-center text-muted-foreground">
              <span className="material-symbols-outlined text-5xl mb-2 block">error_outline</span>
              <p className="font-bold">Sección no encontrada</p>
              <button
                onClick={() => setActiveTab('general')}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      title="Portal Docente"
    >
      {renderContent()}

      {/* Modal de Acción (Notifications / Report) */}
      <ClassActionModal
        isOpen={!!selectedClass}
        onClose={() => setSelectedClass(null)}
        clase={selectedClass}
      />

      {/* Modal de Aviso General */}
      <AvisoGeneralModal
        isOpen={isAvisoOpen}
        onClose={() => setIsAvisoOpen(false)}
        schedule={schedule}
      />
    </DashboardLayout>
  );
}
