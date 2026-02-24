import { useState, useRef } from 'react';
import { incidenciaService } from '../services/api';

interface Props {
  aulaCode?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TIPOS = [
  { value: 'EQUIPOS',          label: 'Equipo dañado (proyector, HDMI, PC)' },
  { value: 'OBJETOS_OLVIDADOS', label: 'Objeto olvidado' },
  { value: 'LIMPIEZA',          label: 'Limpieza / Mantenimiento' },
  { value: 'ACCESO',            label: 'Problema de acceso' },
  { value: 'OTRO',              label: 'Otro' }
];

const PRIORIDADES = [
  { value: 'BAJA',  label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA',  label: 'Alta' }
];

const ReportarIncidenciaModal = ({ aulaCode = '', onClose, onSuccess }: Props) => {
  const [titulo, setTitulo]       = useState('');
  const [tipo, setTipo]           = useState('EQUIPOS');
  const [prioridad, setPrioridad] = useState('MEDIA');
  const [descripcion, setDescripcion] = useState('');
  const [aula, setAula]           = useState(aulaCode);
  const [foto, setFoto]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFoto(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return setError('El título es requerido');
    if (!aula.trim())   return setError('Debe indicar el aula');

    setLoading(true);
    setError('');

    const fd = new FormData();
    fd.append('titulo', titulo.trim());
    fd.append('tipo', tipo);
    fd.append('prioridad', prioridad);
    fd.append('descripcion', descripcion.trim());
    fd.append('aula_codigo', aula.trim());
    if (foto) fd.append('foto', foto);

    try {
      await incidenciaService.crear(fd);
      onSuccess();
    } catch {
      setError('Error al enviar el reporte. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-black text-foreground">Reportar Incidencia</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              {aula ? `Aula ${aula}` : 'Nueva incidencia'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo y Prioridad en fila */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tipo</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Prioridad</label>
              <select
                value={prioridad}
                onChange={e => setPrioridad(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Proyector sin señal HDMI"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              required
            />
          </div>

          {/* Aula */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aula *</label>
            <input
              type="text"
              value={aula}
              onChange={e => setAula(e.target.value)}
              placeholder="Ej: A-101"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              required
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Descripción</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Describe el problema con detalle..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Foto de evidencia */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Foto de evidencia <span className="text-muted-foreground font-normal normal-case">(opcional)</span>
            </label>

            {preview ? (
              <div className="relative rounded-2xl overflow-hidden border border-border">
                <img src={preview} alt="Preview" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => { setFoto(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="absolute top-2 right-2 size-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:bg-muted/10 transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Agregar foto</span>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFoto}
              className="hidden"
            />
          </div>

          {error && (
            <p className="text-[11px] text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-sm">send</span>
              )}
              {loading ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportarIncidenciaModal;
