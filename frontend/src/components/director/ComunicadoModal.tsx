import { useState } from 'react';
import { Button } from '../common/Button';
import { notificacionService } from '../../services/api';

interface ComunicadoModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

const DESTINATARIOS = [
    {
        val: 'docentes',
        label: 'Docentes',
        desc: 'Solo los profesores de la carrera',
        icon: 'badge',
    },
    {
        val: 'estudiantes',
        label: 'Estudiantes',
        desc: 'Solo los alumnos de la carrera',
        icon: 'school',
    },
    {
        val: 'todos',
        label: 'Todos',
        desc: 'Docentes y estudiantes',
        icon: 'groups',
    },
];

export const ComunicadoModal = ({ isOpen, onClose, user }: ComunicadoModalProps) => {
    const [titulo, setTitulo] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [prioridad, setPrioridad] = useState('MEDIA');
    const [destinatario, setDestinatario] = useState<'docentes' | 'estudiantes' | 'todos'>('docentes');
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const handleEnviar = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            const carreraId = user?.carrera?.id;
            const tituloFinal = destinatario === 'docentes'
                ? `[Docentes] ${titulo}`
                : destinatario === 'estudiantes'
                    ? `[Estudiantes] ${titulo}`
                    : titulo;

            await notificacionService.crear({
                titulo: tituloFinal,
                mensaje,
                tipo: 'CARRERA',
                prioridad,
                carrera_id: carreraId
            });

            alert('Comunicado enviado exitosamente.');
            onClose();
            setTitulo('');
            setMensaje('');
            setDestinatario('docentes');
        } catch (error) {
            console.error(error);
            alert('Error al enviar comunicado.');
        } finally {
            setSending(false);
        }
    };

    const btnLabel = destinatario === 'docentes'
        ? 'Enviar a todos los docentes'
        : destinatario === 'estudiantes'
            ? 'Enviar a todos los estudiantes'
            : 'Enviar a docentes y estudiantes';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-foreground tracking-tight">Nuevo Comunicado</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleEnviar} className="space-y-4">
                    {/* Destinatario */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Destinatario</label>
                        <div className="flex gap-2">
                            {DESTINATARIOS.map(d => (
                                <button
                                    key={d.val}
                                    type="button"
                                    onClick={() => setDestinatario(d.val as typeof destinatario)}
                                    className={`flex-1 p-3 rounded-2xl border text-center transition-all ${destinatario === d.val
                                        ? 'bg-primary/10 border-primary/30 text-primary'
                                        : 'bg-muted/20 border-transparent text-muted-foreground hover:bg-muted/40'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-xl block mx-auto mb-1">{d.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-wide block">{d.label}</span>
                                    <span className="text-[9px] text-muted-foreground leading-tight block mt-0.5">{d.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Título */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase text-slate-500">Título</label>
                        <input
                            required
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-xl px-4 py-2.5 text-sm font-medium"
                        />
                    </div>

                    {/* Mensaje */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase text-slate-500">Mensaje</label>
                        <textarea
                            required
                            value={mensaje}
                            onChange={e => setMensaje(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-xl px-4 py-3 text-sm h-28 font-medium resize-none"
                        />
                    </div>

                    {/* Prioridad */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase text-slate-500">Prioridad</label>
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

                    <Button variant="primary" fullWidth loading={sending} type="submit">
                        <span className="material-symbols-outlined text-lg mr-2">send</span>
                        {btnLabel}
                    </Button>
                </form>
            </div>
        </div>
    );
};
