import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import MapaCalor from '../components/MapaCalor';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import AppearanceSettings from '../components/AppearanceSettings';

// --- Sub-componentes internos para el Dashboard Estudiante ---

const BuscadorAulas = () => {
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    setIsSearching(true);
    // Simulación de búsqueda
    await new Promise(r => setTimeout(r, 800));
    setResults([
      { id: 1, aula: 'Sala Estudio 1', edificio: 'Edi A', capacidad: 10, disponible: true },
      { id: 2, aula: 'Sala Estudio 2', edificio: 'Edi B', capacidad: 8, disponible: true },
    ]);
    setIsSearching(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <select
          value={selectedDay}
          onChange={e => setSelectedDay(e.target.value)}
          className="bg-muted border border-border rounded-xl px-3 py-2 text-xs font-bold"
        >
          <option value="">Día</option>
          <option value="Lunes">Lunes</option>
          <option value="Martes">Martes</option>
        </select>
        <select
          value={selectedTime}
          onChange={e => setSelectedTime(e.target.value)}
          className="bg-muted border border-border rounded-xl px-3 py-2 text-xs font-bold"
        >
          <option value="">Hora</option>
          <option value="08:00">08:00</option>
          <option value="10:00">10:00</option>
        </select>
      </div>
      <Button variant="primary" fullWidth size="sm" onClick={handleSearch} loading={isSearching}>
        Buscar Aulas Libres
      </Button>
      {results.length > 0 && (
        <div className="space-y-2 mt-4">
          {results.map(r => (
            <div key={r.id} className="p-3 bg-muted/50 rounded-xl border border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-foreground uppercase">{r.aula}</p>
                <p className="text-[10px] text-muted-foreground font-bold">{r.edificio} • {r.capacidad} pers.</p>
              </div>
              <button className="text-primary text-[10px] font-black uppercase hover:underline">Reservar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TimelineHoy = () => {
  const clases = [
    { hora: '08:00', materia: 'Derecho Constitucional', aula: 'A-301', estado: 'pasada' },
    { hora: '10:00', materia: 'Derecho Civil I', aula: 'B-205', estado: 'actual' },
    { hora: '14:00', materia: 'Introducción al Derecho', aula: 'A-102', estado: 'futura' },
  ];

  return (
    <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
      {clases.map((c, i) => (
        <div key={i} className="relative pl-10">
          <div className={`absolute left-0 size-8 rounded-full flex items-center justify-center border-4 border-background z-10 ${c.estado === 'actual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
            <span className="material-symbols-outlined text-sm font-bold">
              {c.estado === 'actual' ? 'play_arrow' : 'schedule'}
            </span>
          </div>
          <div className={`${c.estado === 'actual' ? 'bg-primary/5 border-primary/20' : 'bg-transparent border-transparent'} border p-3 rounded-2xl transition-all`}>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{c.hora}</p>
            <h4 className="text-sm font-black text-foreground uppercase tracking-tight">{c.materia}</h4>
            <div className="flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-xs text-primary">room</span>
              <span className="text-[10px] font-bold text-muted-foreground">{c.aula}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function EstudianteDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'general' | 'horario' | 'reportes' | 'settings'>('general');

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            {/* Header Greeting */}
            <div className="bg-primary rounded-3xl p-8 text-primary-foreground relative overflow-hidden shadow-2xl shadow-primary/20">
              <div className="relative z-10">
                <h2 className="text-3xl font-black tracking-tight mb-2">¡Hola, {user?.nombre}!</h2>
                <p className="text-uide-blue-light/80 font-bold uppercase tracking-widest text-xs">Derecho • Segundo Nivel</p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black uppercase opacity-60">Tu próxima clase</p>
                    <p className="text-sm font-black">10:00 - Derecho Civil I</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black uppercase opacity-60">Lugar</p>
                    <p className="text-sm font-black">Aula B-205</p>
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl opacity-10 rotate-12 scale-150">school</span>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <DashboardWidget title="Clases de Hoy" subtitle="Línea de tiempo académica" icon="view_timeline">
                  <TimelineHoy />
                </DashboardWidget>
                <DashboardWidget title="Buscador de Aulas" subtitle="Encuentra donde estudiar" icon="search_check">
                  <BuscadorAulas />
                </DashboardWidget>
              </div>
              <div className="space-y-6">
                <DashboardWidget title="Mi Progreso" icon="donut_large">
                  <div className="space-y-6 py-2">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
                        <span>Créditos</span>
                        <span>86 / 126</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden border border-border">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
                        <span>Horas Académicas</span>
                        <span>450 / 625</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden border border-border">
                        <div className="h-full bg-primary rounded-full" style={{ width: '72%' }}></div>
                      </div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-2xl border border-dashed border-border text-center">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Promedio General</p>
                      <p className="text-2xl font-black text-foreground">8.9</p>
                    </div>
                  </div>
                </DashboardWidget>

                <DashboardWidget title="Mapa de Calor" icon="hub">
                  <MapaCalor />
                </DashboardWidget>
              </div>
            </div>
          </div>
        );

      case 'horario':
        return (
          <div className="space-y-6 animate-fade-in">
            <DashboardWidget title="Mi Horario Oficial" icon="calendar_month">
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-200">event_note</span>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">Cargando horario completo...</p>
              </div>
            </DashboardWidget>
          </div>
        );

      case 'settings':
        return (
          <div className="max-w-2xl mx-auto py-8 space-y-8 animate-fade-in">
            <DashboardWidget title="Perfil Estudiantil" icon="account_circle">
              <div className="flex items-center gap-4 bg-muted/50 p-6 rounded-3xl border border-border">
                <div className="size-20 bg-background rounded-2xl border border-border flex items-center justify-center font-black text-2xl text-foreground shadow-sm">
                  {user?.nombre?.[0]}{user?.apellido?.[0]}
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{user?.nombre} {user?.apellido}</h3>
                  <p className="text-sm font-bold text-muted-foreground">{user?.email}</p>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Estudiante Regular</p>
                </div>
              </div>
            </DashboardWidget>

            <AppearanceSettings />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      title="Estudiante"
      subtitle="Portal Alumno"
    >
      {renderContent()}
    </DashboardLayout>
  );
}
