import { useState, useEffect } from 'react';
import { FaWhatsapp, FaCopy, FaCheck } from 'react-icons/fa';
import { usuarioService, User } from '../services/api';
import { Modal } from './common/Modal';
import { Button } from './common/Button';

interface DirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  directorToEdit?: User | null;
}

interface Credenciales {
  email: string;
  password: string;
  whatsapp_enviado: boolean;
  email_enviado?: boolean;
  nombre: string;
}

export const DirectorModal = ({ isOpen, onClose, onSuccess, directorToEdit }: DirectorModalProps) => {
  const [saving, setSaving] = useState(false);
  const [credenciales, setCredenciales] = useState<Credenciales | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCredenciales(null);
      setError(null);
      if (directorToEdit) {
        setFormData({
          nombre: directorToEdit.nombre || '',
          apellido: directorToEdit.apellido || '',
          email: directorToEdit.email || '',
          password: '',
          telefono: directorToEdit.telefono || ''
        });
      } else {
        setFormData({ nombre: '', apellido: '', email: '', password: '', telefono: '' });
      }
    }
  }, [directorToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (directorToEdit) {
        // Edición: actualizar datos
        await usuarioService.updateDirector(directorToEdit.id, formData);
        onSuccess();
        onClose();
      } else {
        // Creación: siempre retorna credenciales del backend
        const res = await usuarioService.createDirector({
          ...formData,
          rol: 'director'
        } as any);
        onSuccess();
        // Mostrar panel de credenciales (sin cerrar el modal)
        if ((res as any).credenciales) {
          setCredenciales({
            email: (res as any).credenciales.email,
            password: (res as any).credenciales.password,
            whatsapp_enviado: (res as any).credenciales.whatsapp_enviado,
            email_enviado: (res as any).credenciales.email_enviado,
            nombre: `${formData.nombre} ${formData.apellido}`
          });
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.mensaje || err.message || 'Error al guardar director.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string, field: 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // fallback silencioso
    }
  };

  const handleAddAnother = () => {
    setCredenciales(null);
    setFormData({ nombre: '', apellido: '', email: '', password: '', telefono: '' });
  };

  const modalTitle = credenciales
    ? '✅ Director Registrado'
    : directorToEdit
      ? 'Editar Director'
      : 'Nuevo Director';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); setCredenciales(null); }}
      title={modalTitle}
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
                ¡Director registrado!
              </h4>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {credenciales.nombre} ya puede acceder al sistema.
              </p>
            </div>
          </div>

          {/* Credenciales */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Credenciales de acceso generadas
            </p>

            {/* Email */}
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border group">
              <span className="material-symbols-outlined text-xl text-primary">mail</span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">
                  Correo institucional
                </p>
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
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">
                  Contraseña temporal
                </p>
                <p className="font-black text-foreground font-mono tracking-widest">
                  {credenciales.password}
                </p>
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
                {credenciales.whatsapp_enviado
                  ? 'Notificación enviada por WhatsApp'
                  : 'Sin número de WhatsApp registrado'}
              </p>
              <p className="text-[10px] font-medium opacity-70 mt-0.5">
                {credenciales.whatsapp_enviado
                  ? 'El director recibió sus credenciales y el link del sistema.'
                  : 'Puedes compartir las credenciales manualmente.'}
              </p>
            </div>
          </div>

          {/* Nota informativa */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800">
            <span className="material-symbols-outlined text-blue-500 text-xl flex-shrink-0">info</span>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Al ingresar por primera vez, el sistema le pedirá al director que establezca una contraseña personal. La contraseña temporal expira en el primer uso.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              className="flex-1 rounded-2xl"
              onClick={() => { onClose(); setCredenciales(null); }}
            >
              Cerrar
            </Button>
            <Button
              variant="primary"
              className="flex-1 rounded-2xl"
              onClick={handleAddAnother}
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Agregar otro
            </Button>
          </div>
        </div>
      ) : (
        /* ── Formulario de creación / edición ── */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error global */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20 text-sm font-medium">
              <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
              {error}
            </div>
          )}

          {/* Avatar preview */}
          <div className="flex items-center gap-5 p-4 bg-muted/30 rounded-3xl border border-border">
            <div className="size-16 rounded-3xl bg-primary text-white flex items-center justify-center font-black text-3xl shadow-xl flex-shrink-0">
              {formData.nombre[0] || '?'}
            </div>
            <div>
              <h4 className="font-black text-lg text-foreground">
                {directorToEdit ? 'Editar datos del director' : 'Registrar nuevo director'}
              </h4>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {directorToEdit
                  ? 'Actualización de datos institucionales'
                  : 'Se creará cuenta de acceso automáticamente'}
              </p>
            </div>
          </div>

          {/* Campos: Nombre y Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Nombre *
              </label>
              <input
                required
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Ej: Juan"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Apellido *
              </label>
              <input
                required
                type="text"
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Ej: Pérez"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
              Email Institucional *
            </label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="correo@institucional.edu.ec"
            />
          </div>

          {/* Teléfono WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
              Teléfono WhatsApp
              <span className="ml-1 text-green-600">(para notificación automática)</span>
            </label>
            <div className="relative">
              <FaWhatsapp className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500" />
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Ej: 593987654321"
              />
            </div>
            {!directorToEdit && formData.telefono && (
              <p className="text-[10px] text-green-600 font-bold ml-1 flex items-center gap-1">
                <FaWhatsapp size={10} /> Las credenciales se enviarán automáticamente a este número
              </p>
            )}
          </div>

          {/* Contraseña — solo al editar */}
          {directorToEdit && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Nueva Contraseña
                <span className="ml-1 text-muted-foreground/50">(opcional — dejar en blanco para mantener)</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          )}

          {/* Info box para nuevos directores */}
          {!directorToEdit && (
            <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/20">
              <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">auto_awesome</span>
              <div className="text-xs font-medium text-foreground/70">
                <strong className="text-foreground">Acceso automático:</strong> Al guardar, se creará una cuenta con contraseña temporal{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary">uide2026</code>.
                {formData.telefono
                  ? <span className="text-green-600"> Las credenciales se enviarán por WhatsApp al número ingresado.</span>
                  : <span> Si ingresas un teléfono, las credenciales se enviarán por WhatsApp.</span>
                }
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button type="button" variant="ghost" className="rounded-2xl" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="rounded-2xl px-8" loading={saving}>
              {directorToEdit ? 'Guardar Cambios' : 'Crear Director y Generar Acceso'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
