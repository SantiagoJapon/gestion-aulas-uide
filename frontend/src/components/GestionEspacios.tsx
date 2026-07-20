import React, { useState } from 'react';
import AulaTable from './AulaTable';
import EspacioTable from './EspacioTable';

type EspacioTab = 'aulas' | 'comunes';

const GestionEspacios: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EspacioTab>('aulas');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('aulas')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            activeTab === 'aulas'
              ? 'bg-white text-primary shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Aulas Académicas
        </button>
        <button
          onClick={() => setActiveTab('comunes')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            activeTab === 'comunes'
              ? 'bg-white text-primary shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Espacios Comunes
        </button>
      </div>

      <div className="animate-fade-in">
        {activeTab === 'aulas' ? <AulaTable /> : <EspacioTable />}
      </div>
    </div>
  );
};

export default GestionEspacios;
