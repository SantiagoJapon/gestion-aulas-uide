import { useState, useEffect, useMemo } from 'react';
import { FaSearch, FaEdit, FaWhatsapp, FaKey, FaCheckCircle, FaExclamationCircle, FaCopy, FaCheck, FaBook } from 'react-icons/fa';
import { Button } from './common/Button';
import DocenteCargaModal from './DocenteCargaModal';
import { Modal } from './common/Modal';
import { docenteService, carreraService, Docente, Carrera } from '../services/api';

interface DocenteTableProps {
    carreraId: number;
}

interface Credenciales {
    email: string;
    password: string;
    whatsapp_enviado: boolean;
    email_enviado?: boolean;
    nombre: string;
    isReset?: boolean;
}

export default function DocenteTable({ carreraId }: DocenteTableProps) {
    const [docentes, setDocentes] = useState<Docente[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [accFilter, setAccFilter] = useState('all');
    const [isCargaModalOpen, setIsCargaModalOpen] = useState(false);
    const [docenteCarga, setDocenteCarga] = useState<Docente | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        telefono: '',
        titulo_pregrado: '',
        titulo_posgrado: '',
        tipo: 'Tiempo Completo',
        carrera_id: 0,
    });
    const [saving, setSaving] = useState(false);

    // Carreras disponibles (solo para admin, cuando carreraId === 0)
    const [carreras, setCarreras] = useState<Carrera[]>([]);

    // Panel de credenciales post-creación
    const [credenciales, setCredenciales] = useState<Credenciales | null>(null);
    const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

    // Credential Generation State
    const [generando, setGenerando] = useState(false);

    useEffect(() => {
        loadDocentes();
    }, [carreraId]);

    // Cargar carreras activas solo cuando es admin (carreraId === 0)
    useEffect(() => {
        if (carreraId === 0) {
            carreraService.getCarreras().then(res => {
                if (res.success) setCarreras(res.carreras.filter(c => c.activa));
            }).catch(console.error);
        }
    }, [carreraId]);

    const loadDocentes = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (carreraId && carreraId > 0) {
                params.carrera_id = carreraId;
            }
            const response = await docenteService.getDocentes(params);
            setDocentes(response.docentes || []);
        } catch (err: any) {
            console.error('Error cargando docentes:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredDocentes = useMemo(() => {
        return docentes.filter(d => {
            const matchesSearch = d.nombre.toLowerCase().includes(search.toLowerCase()) ||
                (d.email && d.email.toLowerCase().includes(search.toLowerCase())) ||
                (d.carga?.materias && d.carga.materias.toLowerCase().includes(search.toLowerCase()));

            if (!matchesSearch) return false;

            if (accFilter === 'with_account') return !!d.usuario_id;
            if (accFilter === 'no_account') return !d.usuario_id;
            if (accFilter === 'active') return d.usuario?.last_login;

            return true;
        });
    }, [docentes, search, accFilter]);

    const handleOpenModal = (docente?: Docente) => {
        setCredenciales(null);
        if (docente) {
            // Verificar si es un director - no se puede editar desde aquí
            if (docente.es_director) {
                alert('Los directores se gestionan desde el panel de Directores. Usa el botón de la llave para generar o renovar sus credenciales de acceso.');
                return;
            }
            setEditingDocente(docente);
            setFormData({
                nombre: docente.nombre,
                email: docente.email || '',
                telefono: docente.telefono || '',
                titulo_pregrado: docente.titulo_pregrado || '',
                titulo_posgrado: docente.titulo_posgrado || '',
                tipo: docente.tipo || 'Tiempo Completo',
                carrera_id: 0,
            });
        } else {
            setEditingDocente(null);
            setFormData({ nombre: '', email: '', telefono: '', titulo_pregrado: '', titulo_posgrado: '', tipo: 'Tiempo Completo', carrera_id: 0 });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingDocente) {
                const res = await docenteService.updateDocente(editingDocente.id, formData);
                if (res.success) {
                    loadDocentes();
                    if (res.credenciales) {
                        // Nueva cuenta creada durante la edición → mostrar credenciales
                        setCredenciales({
                            email: res.credenciales.email,
                            password: res.credenciales.password,
                            whatsapp_enviado: res.credenciales.whatsapp_enviado,
                            nombre: formData.nombre
                        });
                    } else {
                        setIsModalOpen(false);
                    }
                }
            } else {
                const res = await docenteService.createDocente({
                    ...formData,
                    carrera_id: carreraId > 0 ? carreraId : formData.carrera_id,
                });
                if (res.success) {
                    loadDocentes();
                    // Mostrar credenciales en el mismo modal (sin cerrar)
                    if (res.credenciales) {
                        setCredenciales({
                            email: res.credenciales.email,
                            password: res.credenciales.password,
                            whatsapp_enviado: res.credenciales.whatsapp_enviado,
                            nombre: formData.nombre
                        });
                    } else {
                        setIsModalOpen(false);
                    }
                }
            }
        } catch (err: any) {
            console.error('Error guardando docente:', err);
            const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Error al guardar docente';
            alert(`No se pudo guardar: ${errorMsg}`);
        } finally {
            setSaving(false);
        }
    };

    const handleGenerarMasivo = async () => {
        if (!confirm(`¿Estás seguro de que deseas generar cuentas de acceso para todos los docentes de esta carrera que aún no tienen una? Se enviarán notificaciones por WhatsApp automáticamente.`)) return;

        try {
            setGenerando(true);
            const res = await docenteService.generarCredenciales(carreraId);
            if (res.success) {
                alert(res.mensaje);
                loadDocentes();
            }
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Error al generar accesos masivos');
        } finally {
            setGenerando(false);
        }
    };

    const handleCrearCuenta = async (docente: Docente) => {
        try {
            setGenerando(true);
            const res = await docenteService.crearCuenta(docente.id);
            if (res.success) {
                loadDocentes();
                setCredenciales({
                    email: res.credenciales.email,
                    password: res.credenciales.password,
                    whatsapp_enviado: res.credenciales.whatsapp_enviado,
                    nombre: docente.nombre,
                    isReset: res.mensaje?.includes('restablec')
                });
                setEditingDocente(null);
                setIsModalOpen(true);
            }
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Error al procesar la cuenta');
        } finally {
            setGenerando(false);
        }
    };

    const copyToClipboard = async (text: string, field: 'email' | 'password') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            // fallback
        }
    };

    const getAccesoStatus = (d: Docente) => {
        if (!d.usuario_id) return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">
                <FaExclamationCircle size={8} /> Sin Cuenta
            </span>
        );
        if (d.usuario?.requiere_cambio_password) return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-200">
                <FaKey size={8} /> Por Activar
            </span>
        );
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700 border border-green-200">
                <FaCheckCircle size={8} /> Activo
            </span>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header y Acciones */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                        <span className="material-symbols-outlined text-2xl">school</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Plantilla Docente</h2>
                        <p className="text-sm font-medium text-muted-foreground">Gestión de identidades académicas y accesos.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Botón Masivo - Solo si hay docentes sin cuenta */}
                    {docentes.some(d => !d.usuario_id) && (
                        <button
                            onClick={handleGenerarMasivo}
                            disabled={generando || loading}
                            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                            title="Generar accesos para todos los que no tienen"
                        >
                            {generando ? (
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-sm">key_visualizer</span>
                            )}
                            Accesos Pendientes
                        </button>
                    )}
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-sm">person_add</span>
                        Nuevo Docente
                    </button>
                    <button
                        onClick={loadDocentes}
                        className="p-3 bg-muted rounded-2xl text-muted-foreground hover:text-primary transition-all active:rotate-180 duration-500"
                        title="Refrescar lista"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                    </button>
                </div>
            </div>

            {/* Filtros y Búsqueda */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative group">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, materia o email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-card dark:bg-slate-900 border border-border rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-sm"
                    />
                </div>
                <select
                    value={accFilter}
                    onChange={(e) => setAccFilter(e.target.value)}
                    className="px-4 py-3.5 bg-card dark:bg-slate-900 border border-border rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-xs uppercase tracking-widest cursor-pointer"
                >
                    <option value="all">Todos los Accesos</option>
                    <option value="no_account">Sin Cuenta Creada</option>
                    <option value="with_account">Con Cuenta</option>
                    <option value="active">Sesión Iniciada recientemente</option>
                </select>
            </div>

            {/* Tabla */}
            <div className="bg-card dark:bg-slate-900 border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4">
                        <div className="size-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Sincronizando plantilla...</p>
                    </div>
                ) : filteredDocentes.length === 0 ? (
                    <div className="py-24 text-center">
                        <div className="size-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-border/50">
                            <span className="material-symbols-outlined text-4xl text-muted-foreground/30">search_off</span>
                        </div>
                        <p className="text-lg font-black text-foreground">No encontramos docentes</p>
                        <p className="text-sm text-muted-foreground font-medium">No hay registros que coincidan con los filtros actuales.</p>
                        <Button variant="ghost" className="mt-6" onClick={() => { setSearch(''); setAccFilter('all'); }}>Limpiar búsqueda</Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border">
                                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Información Docente</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Título / Dedicación</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Acceso</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Carga Académica</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredDocentes.map((docente) => (
                                    <tr key={docente.id} className="hover:bg-muted/10 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary flex items-center justify-center font-black text-lg border border-primary/10 shadow-sm">
                                                    {docente.nombre[0]}
                                                </div>
                                                <div className="max-w-[180px]">
                                                    <p className="font-black text-foreground leading-none mb-1.5 truncate group-hover:text-primary transition-colors">{docente.nombre}</p>
                                                    <div className="flex flex-col gap-1">
                                                        <p className="text-[11px] text-muted-foreground font-bold truncate flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[14px]">mail</span>
                                                            {docente.email || 'Sin correo institucional'}
                                                        </p>
                                                        {docente.telefono && (
                                                            <p className="text-[11px] text-green-600 font-black flex items-center gap-1.5">
                                                                <FaWhatsapp size={10} />
                                                                {docente.telefono}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-foreground line-clamp-1 max-w-[150px]">
                                                    {(docente as any).es_director
                                                        ? ((docente as any).carrera_director || 'Director')
                                                        : (docente.titulo_posgrado || docente.titulo_pregrado || 'Sin título')}
                                                </p>
                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${(docente as any).es_director
                                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                    : docente.tipo?.includes('Completo')
                                                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                        : 'bg-orange-50 text-orange-600 border border-orange-100'
                                                    }`}>
                                                    {(docente as any).es_director ? '🎓 Director de Carrera' : docente.tipo}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                {getAccesoStatus(docente)}
                                                {docente.usuario?.last_login && (
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">
                                                        Uso: {new Date(docente.usuario.last_login).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 border-x border-border/5">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                                                    <span className="text-lg font-black text-foreground">{docente.carga?.total_horas || 0}</span>
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase">Horas</span>
                                                </div>
                                                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest text-center opacity-70">
                                                    {docente.carga?.total_clases || 0} CLASES CARGADAS
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {docente.telefono && (
                                                    <button
                                                        onClick={() => window.open(`https://wa.me/${docente.telefono}`, '_blank')}
                                                        className="size-9 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-green-100"
                                                        title="Contactar WhatsApp"
                                                    >
                                                        <FaWhatsapp />
                                                    </button>
                                                )}
                                                {(!docente.usuario_id || docente.usuario?.requiere_cambio_password) && (
                                                    <button
                                                        onClick={() => handleCrearCuenta(docente)}
                                                        disabled={generando}
                                                        className="size-9 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm border border-primary/20 disabled:opacity-50"
                                                        title={docente.usuario_id ? 'Reenviar credenciales' : 'Crear cuenta de acceso'}
                                                    >
                                                        <FaKey />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { setDocenteCarga(docente); setIsCargaModalOpen(true); }}
                                                    className="size-9 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm border border-primary/10"
                                                    title="Gestionar Carga Académica"
                                                >
                                                    <FaBook />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(docente)}
                                                    className="size-9 rounded-xl bg-muted text-muted-foreground hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm border border-border"
                                                    title="Editar información"
                                                >
                                                    <FaEdit />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Crear / Editar */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setCredenciales(null); }}
                title={credenciales ? (credenciales.isReset ? '🔄 Credenciales Restablecidas' : '✅ Cuenta Creada') : editingDocente ? 'Editar Docente' : 'Nuevo Docente'}
                size="lg"
            >
                {/* ── Panel de credenciales post-creación ── */}
                {credenciales ? (
                    <div className="space-y-6">
                        {/* Header de éxito */}
                        <div className="flex items-center gap-4 p-5 bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl border border-emerald-200 dark:border-emerald-800">
                            <div className="size-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
                                <span className="material-symbols-outlined text-3xl">how_to_reg</span>
                            </div>
                            <div>
                                <h4 className="font-black text-lg text-emerald-800 dark:text-emerald-300">
                                    {credenciales.isReset ? '¡Credenciales restablecidas!' : '¡Docente registrado!'}
                                </h4>
                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                    {credenciales.nombre} {credenciales.isReset ? 'puede ingresar con la contraseña temporal.' : 'ya puede acceder al sistema.'}
                                </p>
                            </div>
                        </div>

                        {/* Credenciales */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Credenciales de acceso generadas</p>

                            {/* Email */}
                            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border group">
                                <span className="material-symbols-outlined text-xl text-primary">mail</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Correo institucional</p>
                                    <p className="font-black text-foreground truncate">{credenciales.email}</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(credenciales.email, 'email')}
                                    className="size-9 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center flex-shrink-0"
                                    title="Copiar email"
                                >
                                    {copiedField === 'email' ? <FaCheck size={12} /> : <FaCopy size={12} />}
                                </button>
                            </div>

                            {/* Contraseña */}
                            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border group">
                                <span className="material-symbols-outlined text-xl text-amber-500">key</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Contraseña temporal</p>
                                    <p className="font-black text-foreground font-mono tracking-widest">{credenciales.password}</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(credenciales.password, 'password')}
                                    className="size-9 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center flex-shrink-0"
                                    title="Copiar contraseña"
                                >
                                    {copiedField === 'password' ? <FaCheck size={12} /> : <FaCopy size={12} />}
                                </button>
                            </div>
                        </div>

                        {/* Estado Email */}
                        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${credenciales.email_enviado
                            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400'
                            : 'bg-muted/30 border-border text-muted-foreground'
                            }`}>
                            <span className="material-symbols-outlined text-xl flex-shrink-0">email</span>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest">
                                    {credenciales.email_enviado ? 'Email enviado exitosamente' : 'Email no enviado'}
                                </p>
                                <p className="text-[10px] font-medium opacity-70 mt-0.5">
                                    {credenciales.email_enviado
                                        ? `Las credenciales fueron enviadas a ${credenciales.email}`
                                        : 'Revisa la configuración del servidor de correo.'}
                                </p>
                            </div>
                        </div>

                        {/* Estado WhatsApp */}
                        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${credenciales.whatsapp_enviado
                            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400'
                            : 'bg-muted/30 border-border text-muted-foreground'
                            }`}>
                            <FaWhatsapp className="text-xl flex-shrink-0" />
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest">
                                    {credenciales.whatsapp_enviado ? 'Notificación enviada por WhatsApp' : 'Sin número de WhatsApp registrado'}
                                </p>
                                <p className="text-[10px] font-medium opacity-70 mt-0.5">
                                    {credenciales.whatsapp_enviado
                                        ? 'El docente recibió sus credenciales y el link del sistema.'
                                        : 'Puedes compartir las credenciales manualmente.'}
                                </p>
                            </div>
                        </div>

                        {/* Nota informativa */}
                        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800">
                            <span className="material-symbols-outlined text-blue-500 text-xl flex-shrink-0">info</span>
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                Al ingresar por primera vez, el sistema le pedirá al docente que establezca una contraseña personal. La contraseña temporal expira en el primer uso.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="ghost"
                                className="flex-1 rounded-2xl"
                                onClick={() => { setIsModalOpen(false); setCredenciales(null); }}
                            >
                                Cerrar
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1 rounded-2xl"
                                onClick={() => { setCredenciales(null); setFormData({ nombre: '', email: '', telefono: '', titulo_pregrado: '', titulo_posgrado: '', tipo: 'Tiempo Completo', carrera_id: 0 }); }}
                            >
                                <span className="material-symbols-outlined text-sm">person_add</span>
                                Agregar otro
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* ── Formulario de creación / edición ── */
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Avatar preview */}
                        <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-3xl border border-border mb-6">
                            <div className="size-16 rounded-3xl bg-primary text-white flex items-center justify-center font-black text-3xl shadow-xl">
                                {formData.nombre[0] || '?'}
                            </div>
                            <div>
                                <h4 className="font-black text-lg text-foreground">
                                    {editingDocente ? 'Editar datos del docente' : 'Registrar nuevo docente'}
                                </h4>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {editingDocente ? 'Actualización de identidad académica' : 'Se creará cuenta de acceso automáticamente'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nombre Completo *</label>
                                <input
                                    required
                                    className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej: Ing. María García"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                                    Email Institucional
                                    {!editingDocente && <span className="ml-1 text-muted-foreground/50">(opcional — se auto-genera)</span>}
                                </label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="nombre@uide.edu.ec"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                                    Teléfono WhatsApp
                                    <span className="ml-1 text-green-600">(para notificación automática)</span>
                                </label>
                                <div className="relative">
                                    <FaWhatsapp className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500" />
                                    <input
                                        placeholder="Ej: 593987654321"
                                        className="w-full pl-10 pr-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                        value={formData.telefono}
                                        onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                    />
                                </div>
                                {!editingDocente && formData.telefono && (
                                    <p className="text-[10px] text-green-600 font-bold ml-1 flex items-center gap-1">
                                        <FaWhatsapp size={10} /> Las credenciales se enviarán automáticamente a este número
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tipo de Dedicación</label>
                                <select
                                    className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                                    value={formData.tipo}
                                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                >
                                    <option value="Tiempo Completo">Tiempo Completo</option>
                                    <option value="Tiempo Parcial">Tiempo Parcial</option>
                                    <option value="Medio Tiempo">Medio Tiempo</option>
                                </select>
                            </div>
                        </div>

                        {/* Selector de carrera: solo visible para admin (carreraId === 0) al crear */}
                        {carreraId === 0 && !editingDocente && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                                    Carrera *
                                </label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                                    value={formData.carrera_id}
                                    onChange={e => setFormData({ ...formData, carrera_id: Number(e.target.value) })}
                                >
                                    <option value={0}>Seleccionar carrera...</option>
                                    {carreras.map(c => (
                                        <option key={c.id} value={c.id}>{c.carrera}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Título Pregrado</label>
                                <input
                                    className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={formData.titulo_pregrado}
                                    onChange={e => setFormData({ ...formData, titulo_pregrado: e.target.value })}
                                    placeholder="Ej: Ingeniero en Sistemas"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Títulos Posgrado</label>
                                <textarea
                                    rows={2}
                                    className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                    value={formData.titulo_posgrado}
                                    onChange={e => setFormData({ ...formData, titulo_posgrado: e.target.value })}
                                    placeholder="Ej: Magíster en Educación"
                                />
                            </div>
                        </div>

                        {/* Info box para nuevos docentes */}
                        {!editingDocente && (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                                    <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">auto_awesome</span>
                                    <div className="text-xs font-medium text-foreground/70">
                                        <strong className="text-foreground">Acceso automático:</strong> Al guardar, se creará una cuenta con contraseña temporal <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary">uide2026</code>.
                                        {formData.telefono
                                            ? <span className="text-green-600"> Las credenciales se enviarán por WhatsApp al número ingresado.</span>
                                            : <span> Si ingresas un teléfono, las credenciales se enviarán por WhatsApp.</span>
                                        }
                                    </div>
                                </div>

                                {formData.nombre && !formData.email && (
                                    <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-dashed border-border animate-in fade-in slide-in-from-top-2">
                                        <span className="material-symbols-outlined text-sm text-muted-foreground">contact_mail</span>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            Vista previa del correo: <span className="text-primary lowercase bg-primary/5 px-2 py-0.5 rounded ml-1">
                                                {(() => {
                                                    const titulos = ['Ing.', 'Dr.', 'Dra.', 'Abg.', 'Mag.', 'Msc.', 'Mgs.', 'Lic.', 'Phd.', 'Psic.', 'Arq.'];
                                                    let n = formData.nombre.trim();
                                                    for (const t of titulos) if (n.toLowerCase().startsWith(t.toLowerCase())) n = n.substring(t.length).trim();
                                                    const partes = n.split(' ');
                                                    const nom = (partes[0] || 'docente').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                    const ape = (partes[1] || 'uide').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                    return `${nom}.${ape}@docente.uide.edu.ec`;
                                                })()}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-6 border-t border-border">
                            <Button type="button" variant="ghost" className="rounded-2xl" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" variant="primary" className="rounded-2xl px-8" loading={saving}>
                                {editingDocente ? 'Guardar Cambios' : 'Crear Docente y Generar Acceso'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal de Carga Académica */}
            {docenteCarga && (
                <DocenteCargaModal
                    docente={docenteCarga}
                    isOpen={isCargaModalOpen}
                    onClose={() => setIsCargaModalOpen(false)}
                    onUpdate={loadDocentes}
                />
            )}
        </div>
    );
}
