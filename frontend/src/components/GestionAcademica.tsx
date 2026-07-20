import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import DocenteTable from './DocenteTable';
import EstudianteTable from './EstudianteTable';
import MateriaManagement from './MateriaManagement';
import SubirEstudiantes from './SubirEstudiantes';
import ImportarCupos from './ImportarCupos';
import DashboardWidget from './dashboard/DashboardWidget';

type AcademicoTab = 'docentes' | 'estudiantes' | 'materias';

interface GestionAcademicaProps {
  mode?: 'admin' | 'director';
}

const GestionAcademica: React.FC<GestionAcademicaProps> = ({ mode = 'admin' }) => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<AcademicoTab>('docentes');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('docentes')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            activeTab === 'docentes'
              ? 'bg-white text-primary shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Docentes
        </button>
        <button
          onClick={() => setActiveTab('estudiantes')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            activeTab === 'estudiantes'
              ? 'bg-white text-primary shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Estudiantes
        </button>
        {mode === 'director' && (
          <button
            onClick={() => setActiveTab('materias')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'materias'
                ? 'bg-white text-primary shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Materias
          </button>
        )}
      </div>

      <div className="animate-fade-in">
        {activeTab === 'docentes' && mode === 'director' && (
          <DashboardWidget title="Plantilla Docente" icon="badge">
            <DocenteTable carreraId={user?.carrera?.id || 0} />
          </DashboardWidget>
        )}
        {activeTab === 'docentes' && mode === 'admin' && <DocenteTable carreraId={0} />}

        {activeTab === 'estudiantes' && mode === 'director' && (
          <DirectorEstudiantesTab />
        )}
        {activeTab === 'estudiantes' && mode === 'admin' && <EstudianteTable />}

        {activeTab === 'materias' && mode === 'director' && (
          <DashboardWidget title="Catálogo de Materias" subtitle="Administración de la malla curricular" icon="menu_book">
            <MateriaManagement carreraId={user?.carrera?.id || 0} />
          </DashboardWidget>
        )}
      </div>
    </div>
  );
};

const DirectorEstudiantesTab: React.FC = () => {
  const { user } = useContext(AuthContext);
  const nombreCarrera = user?.carrera?.carrera || user?.carrera_director || '';

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <DashboardWidget
        title="Base de Datos de Alumnado"
        subtitle={`Estudiantes registrados en la carrera de ${nombreCarrera}`}
        icon="people"
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
};

export default GestionAcademica;
