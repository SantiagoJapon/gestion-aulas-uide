import { useState, useRef } from 'react';
import {
    FaUpload, FaCheckCircle, FaTimesCircle,
    FaInfoCircle
} from 'react-icons/fa';
import { estudianteService } from '../services/api';
import { Button } from './common/Button';

interface ImportarCuposProps {
    carreraNombre?: string;
    isCompact?: boolean;
}

export default function ImportarCupos({ isCompact = false }: ImportarCuposProps) {
    const [archivo, setArchivo] = useState<File | null>(null);
    const [cargando, setCargando] = useState(false);
    const [resultado, setResultado] = useState<any>(null);
    const [error, setError] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
                setError('Solo se permiten archivos Excel (.xlsx, .xls)');
                return;
            }
            setArchivo(file);
            setError('');
            setResultado(null);
        }
    };

    const handleUpload = async () => {
        if (!archivo) {
            setError('Selecciona un archivo primero');
            return;
        }

        setCargando(true);
        setError('');
        setResultado(null);

        try {
            const formData = new FormData();
            formData.append('archivo', archivo);

            const response = await estudianteService.syncProyeccionCupos(formData);

            setResultado(response);
            setArchivo(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            setError(
                err.response?.data?.mensaje ||
                err.response?.data?.error ||
                'Error al procesar la proyección de cupos'
            );
        } finally {
            setCargando(false);
        }
    };

    const limpiar = () => {
        setArchivo(null);
        setError('');
        setResultado(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className={`animate-fade-in ${isCompact ? '' : 'p-4 max-w-5xl mx-auto'}`}>
            <div className="grid grid-cols-1 gap-6">
                <div className="col-span-1">
                    <div className={`${isCompact ? '' : 'mac-card p-6 rounded-3xl border border-border shadow-sm'}`}>
                        <div
                            className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${archivo
                                ? 'border-uide-gold bg-uide-gold/5'
                                : 'border-border bg-muted/30 hover:bg-muted/50'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />

                            {!archivo ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                                        <FaUpload size={20} />
                                    </div>
                                    <p className="text-sm font-black text-foreground uppercase tracking-tight">
                                        Subir Proyección de Cupos
                                    </p>
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                                        Archivo Excel (PROYECCION CUPOS...)
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center animate-fade-in">
                                    <div className="w-12 h-12 rounded-full bg-uide-gold/10 flex items-center justify-center text-uide-gold mb-3">
                                        <FaCheckCircle size={20} />
                                    </div>
                                    <p className="text-sm font-black text-foreground truncate max-w-xs">{archivo.name}</p>
                                    <button
                                        onClick={limpiar}
                                        className="mt-2 px-2 py-1 text-[9px] font-black uppercase text-red-500 hover:bg-red-50 rounded-lg transition"
                                    >
                                        Cambiar archivo
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl animate-fade-in flex items-start gap-3">
                                <FaTimesCircle className="text-red-500 text-sm shrink-0 mt-0.5" />
                                <p className="text-[10px] font-bold text-red-700 leading-tight">{error}</p>
                            </div>
                        )}

                        {resultado && (
                            <div className="mt-4 p-4 bg-uide-blue/5 border border-uide-blue/10 rounded-xl animate-fade-in">
                                <div className="flex items-start gap-4">
                                    <FaCheckCircle className="text-uide-blue text-xl shrink-0" />
                                    <div className="flex-1">
                                        <h3 className="text-[11px] font-black text-uide-blue uppercase tracking-tight mb-2">Sincronización Exitosa</h3>
                                        <p className="text-[10px] font-medium text-slate-600 mb-2">{resultado.mensaje}</p>
                                        <div className="bg-white/50 p-2 rounded-lg border border-uide-blue/5">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Resumen:</p>
                                            <p className="text-[11px] font-black text-slate-700">
                                                {resultado.detalles?.vinculados_nuevos} inscripciones nuevas procesadas.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <Button
                                onClick={handleUpload}
                                disabled={!archivo || cargando}
                                loading={cargando}
                                fullWidth
                                variant="primary"
                                className="py-3 text-[11px] font-black uppercase tracking-widest"
                            >
                                {!cargando && <FaUpload className="mr-2 inline" />}
                                {cargando ? 'Sincronizando Cupos...' : 'Sincronizar Inscripciones'}
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                        <FaInfoCircle className="text-uide-gold mt-0.5 shrink-0" size={14} />
                        <p className="text-[9px] text-slate-500 font-bold leading-relaxed uppercase">
                            Este proceso vincula automáticamente a los estudiantes con sus clases basándose en la cédula y nombre de materia. Use el archivo oficial "PROYECCIÓN CUPOS".
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
