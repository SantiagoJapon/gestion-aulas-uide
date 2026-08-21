import { useRef, useState } from 'react';
import { planificacionService, SubirPlanificacionResponse } from '../../services/api';
import { Button } from '../common/Button';

interface SubirPlanificacionCardProps {
  carreraId: number;
  carreraNombre: string;
  onSuccess: (response: SubirPlanificacionResponse) => void;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const SubirPlanificacionCard = ({ carreraId, carreraNombre, onSuccess }: SubirPlanificacionCardProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selected: File | null) => {
    setError('');
    if (!selected) {
      setFile(null);
      return;
    }
    const nombreLower = selected.name.toLowerCase();
    if (!nombreLower.endsWith('.xlsx') && !nombreLower.endsWith('.xls')) {
      setError('Solo se permiten archivos Excel (.xlsx, .xls)');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setError('El archivo no debe superar 10MB');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const res = await planificacionService.subirPlanificacion(file, carreraId);
      if (res.success) {
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
        onSuccess(res);
      } else {
        setError(res.mensaje || 'Error al subir la planificación');
      }
    } catch (err: any) {
      setError(err.response?.data?.mensaje || err.message || 'Error al subir la planificación');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10 relative overflow-hidden group">
      <div className="relative z-10">
        <h4 className="text-[11px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">backup</span>
          Subir Planificación
        </h4>
        <p className="text-xs font-black text-slate-800 dark:text-slate-200 mb-3 truncate">
          {carreraNombre}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="relative flex flex-col items-center justify-center p-5 border-2 border-dashed border-primary/20 rounded-2xl hover:bg-primary/5 transition-all cursor-pointer group/label bg-white/50 dark:bg-black/20">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              disabled={uploading}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="material-symbols-outlined text-3xl text-primary/40 group-hover/label:text-primary transition-colors">upload_file</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase mt-2 text-center truncate w-full">
              {file ? file.name : 'Seleccionar Excel'}
            </span>
          </label>

          {error && (
            <p className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl px-3 py-2 leading-relaxed">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" fullWidth loading={uploading} size="sm" disabled={!file}>
            Procesar {carreraNombre.length > 15 ? 'Carrera' : carreraNombre}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SubirPlanificacionCard;
