import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import MapaCalor from '../components/MapaCalor';
import {
  FaBookOpen,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaBuilding,
  FaUsers,
  FaSearch,
  FaChartLine,
  FaFileAlt,
  FaArrowRight,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner
} from 'react-icons/fa';

interface ReservaItem {
  id: number;
  aula: string;
  dia: string;
  fecha: string;
  hora: string;
  estado: 'activa' | 'completada';
  proposito: string;
}

const MisReservasWidget = () => {
  const [showCancelModal, setShowCancelModal] = useState<number | null>(null);

  const reservas: ReservaItem[] = [
    { id: 1, aula: 'Sala Estudio 2', dia: 'Miércoles', fecha: '22 Ene', hora: '14:00 - 16:00', estado: 'activa', proposito: 'Estudio grupal' },
    { id: 2, aula: 'Lab. Computación 1', dia: 'Viernes', fecha: '24 Ene', hora: '10:00 - 12:00', estado: 'activa', proposito: 'Práctica' },
    { id: 3, aula: 'Sala Estudio 1', dia: 'Lunes', fecha: '13 Ene', hora: '16:00 - 18:00', estado: 'completada', proposito: 'Estudio grupal' },
  ];

  const handleCancel = () => {
    setShowCancelModal(null);
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Mis Reservas</h3>
          <p className="text-sm text-muted-foreground">Historial de reservas de aulas</p>
        </div>
        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-700">
          {reservas.filter(r => r.estado === 'activa').length} activas
        </span>
      </div>

      <div className="space-y-3">
        {reservas.map((reserva) => (
          <div
            key={reserva.id}
            className={`p-4 rounded-lg border transition-all ${
              reserva.estado === 'activa' ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    reserva.estado === 'activa' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {reserva.aula}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    reserva.estado === 'activa' ? 'bg-green-500/10 text-green-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {reserva.estado === 'activa' ? 'Activa' : 'Completada'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="h-3 w-3" />
                    <span>{reserva.dia}, {reserva.fecha}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaClock className="h-3 w-3" />
                    <span>{reserva.hora}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{reserva.proposito}</p>
              </div>
              {reserva.estado === 'activa' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowCancelModal(reserva.id)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showCancelModal !== null}
        onClose={() => setShowCancelModal(null)}
        title="Cancelar Reserva"
        size="sm"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <FaExclamationCircle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground">
            Esta acción no se puede deshacer. La reserva será cancelada inmediatamente.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowCancelModal(null)}>
              Volver
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleCancel}>
              Cancelar Reserva
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const BuscadorAulas = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reserving, setReserving] = useState<number | null>(null);
  const [reserved, setReserved] = useState<number[]>([]);

  const results = [
    { id: 1, aula: 'Sala Estudio 1', edificio: 'Edificio A', capacidad: 10, disponible: true },
    { id: 2, aula: 'Sala Estudio 2', edificio: 'Edificio B', capacidad: 8, disponible: true },
    { id: 3, aula: 'Lab. Computación 3', edificio: 'Edificio C', capacidad: 25, disponible: false },
  ];

  const handleSearch = async () => {
    if (!selectedDay || !selectedTime) return;
    setIsSearching(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSearching(false);
    setSearchDone(true);
  };

  const handleReserve = async (id: number) => {
    setReserving(id);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setReserving(null);
    setReserved((prev) => [...prev, id]);
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-6 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <FaSearch className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Buscar Aulas Disponibles</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Encuentra aulas libres para estudio grupal</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Día</label>
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Seleccionar día</option>
            <option value="lunes">Lunes</option>
            <option value="martes">Martes</option>
            <option value="miercoles">Miércoles</option>
            <option value="jueves">Jueves</option>
            <option value="viernes">Viernes</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Hora</label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Seleccionar hora</option>
            <option value="08:00">08:00 - 10:00</option>
            <option value="10:00">10:00 - 12:00</option>
            <option value="14:00">14:00 - 16:00</option>
            <option value="16:00">16:00 - 18:00</option>
          </select>
        </div>
      </div>

      <Button
        onClick={handleSearch}
        disabled={!selectedDay || !selectedTime || isSearching}
        variant="primary"
        fullWidth
      >
        {isSearching ? (
          <>
            <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
            Buscando...
          </>
        ) : (
          <>
            <FaSearch className="mr-2 h-4 w-4" />
            Buscar Aulas
          </>
        )}
      </Button>

      {searchDone && (
        <div className="space-y-3 pt-4 border-t border-border mt-4">
          <p className="text-sm text-muted-foreground">
            {results.filter(r => r.disponible).length} aulas disponibles
          </p>
          {results.map((result) => (
            <div
              key={result.id}
              className={`p-3 rounded-lg border transition-all ${
                result.disponible ? 'border-border hover:border-primary/30' : 'border-border bg-muted/50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{result.aula}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FaMapMarkerAlt className="h-3 w-3" />
                    <span>{result.edificio}</span>
                    <span>•</span>
                    <FaUsers className="h-3 w-3" />
                    <span>{result.capacidad} personas</span>
                  </div>
                </div>
                {result.disponible && !reserved.includes(result.id) ? (
                  <Button
                    size="sm"
                    onClick={() => handleReserve(result.id)}
                    disabled={reserving === result.id}
                  >
                    {reserving === result.id ? (
                      <FaSpinner className="h-4 w-4 animate-spin" />
                    ) : (
                      'Reservar'
                    )}
                  </Button>
                ) : reserved.includes(result.id) ? (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-700 flex items-center gap-1">
                    <FaCheckCircle className="h-3 w-3" />
                    Reservada
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                    No disponible
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProgressCard = ({ title, value, total, percentage }: { title: string; value: number; total: number; percentage: number }) => {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-lg transition-all">
      <p className="text-sm text-muted-foreground mb-2">{title}</p>
      <div className="flex items-end gap-2 mb-3">
        <p className="text-3xl font-bold text-foreground">{percentage}%</p>
        <FaChartLine className="h-5 w-5 text-green-600 mb-1" />
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-2 bg-primary rounded-full" style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-xs text-muted-foreground mt-2">{value} de {total}</p>
    </div>
  );
};

export default function EstudianteDashboard() {
  const { user } = useContext(AuthContext);
  const currentDate = new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const clasesHoy = [
    { id: 1, hora: '08:00 - 10:00', materia: 'Derecho Constitucional', docente: 'Dr. Juan Pérez', aula: 'A-301', edificio: 'Edificio A - Piso 3', estado: 'proxima' },
    { id: 2, hora: '10:00 - 12:00', materia: 'Derecho Civil I', docente: 'Dra. María González', aula: 'B-205', edificio: 'Edificio B - Piso 2', estado: 'futuro' },
    { id: 3, hora: '14:00 - 16:00', materia: 'Introducción al Derecho', docente: 'Abg. Carlos López', aula: 'A-102', edificio: 'Edificio A - Piso 1', estado: 'futuro' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Hola, {user?.nombre || 'Estudiante'}!</h1>
          <p className="text-muted-foreground">Derecho - Segundo Nivel</p>
          <p className="text-sm text-muted-foreground capitalize">{currentDate}</p>
        </div>

        <div className="bg-card border border-primary/50 rounded-2xl shadow-card p-6 mb-8 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="p-4 rounded-2xl bg-primary/10">
              <FaBookOpen className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white mb-3">
                HOY - 08:00
              </span>
              <h2 className="text-2xl font-bold text-foreground mb-2">Derecho Constitucional</h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FaClock className="h-4 w-4" />
                  <span>08:00 - 10:00 (En 25 minutos)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FaUsers className="h-4 w-4" />
                  <span>Dr. Juan Pérez</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <FaBuilding className="h-5 w-5 text-primary" />
                  <span className="text-lg">Aula A-301</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FaMapMarkerAlt className="h-4 w-4" />
                  <span>Edificio A - Piso 3</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button>Ver ubicación</Button>
                <Button variant="outline" className="bg-transparent">Ver detalles</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Materias</p>
                <p className="text-3xl font-bold text-foreground">8</p>
                <p className="text-xs text-muted-foreground">Este periodo</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <FaBookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <ProgressCard title="Progreso horas" value={450} total={625} percentage={72} />
          <ProgressCard title="Progreso créditos" value={86} total={126} percentage={68} />

          <div className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mis reservas</p>
                <p className="text-3xl font-bold text-foreground">2</p>
                <p className="text-xs text-green-600">1/3 disponibles</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10">
                <FaCalendarAlt className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <BuscadorAulas />
          <MisReservasWidget />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <div className="bg-card border border-border rounded-xl shadow-card">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Clases de hoy</h3>
              <span className="px-2 py-1 rounded-full text-xs font-semibold border border-border text-muted-foreground">
                {clasesHoy.length} clases
              </span>
            </div>
            <div className="p-6 space-y-4">
              {clasesHoy.map((clase, index) => (
                <div key={clase.id} className="relative">
                  {index < clasesHoy.length - 1 && (
                    <div className="absolute left-[18px] top-12 bottom-0 w-0.5 bg-border" />
                  )}
                  <div className={`p-4 rounded-lg border transition-all ${
                    clase.estado === 'proxima' ? 'border-blue-500/50 bg-blue-500/5' : 'border-border hover:border-primary/30'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg z-10 ${clase.estado === 'proxima' ? 'bg-blue-500 text-white' : 'bg-accent'}`}>
                        <FaClock className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-muted-foreground">{clase.hora}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            clase.estado === 'proxima' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {clase.estado === 'proxima' ? 'Próxima' : 'Futuro'}
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground mb-1">{clase.materia}</h4>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <FaUsers className="h-3 w-3" />
                            <span>{clase.docente}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaBuilding className="h-3 w-3 text-primary" />
                            <span className="font-medium text-foreground">{clase.aula}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" fullWidth className="bg-transparent">
                Ver horario completo
                <FaArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-card">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Acciones rápidas</h3>
            </div>
            <div className="p-6 grid gap-3 sm:grid-cols-2">
              {[
                { title: 'Mi horario', desc: 'Ver calendario', icon: FaCalendarAlt, color: 'bg-blue-500/10 text-blue-600' },
                { title: 'Mi progreso', desc: 'Estadísticas', icon: FaChartLine, color: 'bg-green-500/10 text-green-600' },
                { title: 'Aulas libres', desc: 'Para estudio', icon: FaSearch, color: 'bg-purple-500/10 text-purple-600' },
                { title: 'Mis reservas', desc: 'Gestionar', icon: FaFileAlt, color: 'bg-yellow-500/10 text-yellow-600' },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.title}
                    className="h-auto w-full p-4 rounded-lg border border-border hover:bg-accent transition-all bg-transparent text-left"
                  >
                    <div className={`p-2 rounded-lg ${action.color} inline-flex mb-2`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-semibold text-sm text-foreground">{action.title}</div>
                    <div className="text-xs text-muted-foreground">{action.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-card border border-green-500/30 rounded-xl shadow-card p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <FaChartLine className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Vas muy bien en tu progreso académico</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Llevas un 70% de avance promedio en horas y créditos. Continúa así para completar tu carrera a tiempo.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-semibold border border-border bg-background">450 horas completadas</span>
                <span className="px-2 py-1 rounded-full text-xs font-semibold border border-border bg-background">86 créditos ganados</span>
                <span className="px-2 py-1 rounded-full text-xs font-semibold border border-border bg-background">8 materias activas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mapa de Calor - Vista Estudiante (SU CARRERA) */}
        <div className="animate-fade-in">
          <MapaCalor
            titulo="Mapa de Calor - Mi Carrera"
            showExport={false}
          />
        </div>
      </div>
    </div>
  );
}






