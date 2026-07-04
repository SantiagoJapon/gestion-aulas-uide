import { useState, useEffect, useCallback } from 'react';
import DashboardWidget from './dashboard/DashboardWidget';
import { healthService, HealthStatus } from '../services/api';

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  connected: { icon: 'check_circle', color: 'text-emerald-500' },
  configured: { icon: 'check_circle', color: 'text-emerald-500' },
  disconnected: { icon: 'error', color: 'text-red-500' },
  not_configured: { icon: 'remove_circle', color: 'text-gray-500' },
  healthy: { icon: 'check_circle', color: 'text-emerald-500' },
  degraded: { icon: 'warning', color: 'text-yellow-500' },
  unhealthy: { icon: 'error', color: 'text-red-500' },
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

export default function SystemHealthWidget() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    const result = await healthService.getStatus();
    if (result.success && result.data) {
      setHealth(result.data);
      setError(null);
    } else {
      setError(result.error || 'Error al obtener estado');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const statusInfo = health ? STATUS_ICONS[health.status] || STATUS_ICONS.unhealthy : null;
  const items = health ? [
    { label: 'Base de Datos', key: 'database' },
    { label: 'Redis (Colas)', key: 'redis' },
    { label: 'SMTP (Emails)', key: 'smtp' },
    { label: 'Evolution API', key: 'evolution_api' },
  ] : [];

  return (
    <DashboardWidget
      title="Estado del Sistema"
      subtitle={health ? `Versión ${health.version} · ${health.environment}` : 'Monitoreo'}
      icon="monitoring"
      action={
        <button
          onClick={() => { setLoading(true); fetchHealth(); }}
          className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors"
        >
          {loading ? '...' : 'Actualizar'}
        </button>
      }
    >
      {loading && !health ? (
        <div className="flex items-center justify-center py-8">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <span className="material-symbols-outlined text-3xl text-red-500 mb-2">cloud_off</span>
          <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Sin conexión al backend</p>
          <p className="text-[9px] text-muted-foreground/60 mt-1">{error}</p>
        </div>
      ) : health ? (
        <div className="space-y-4">
          {/* Status general */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-xl ${statusInfo?.color}`}>{statusInfo?.icon}</span>
              <span className="text-xs font-bold uppercase tracking-wide">
                {health.status === 'healthy' ? 'Operacional' : health.status === 'degraded' ? 'Degradado' : 'No Disponible'}
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">{formatUptime(health.uptime)}</span>
          </div>

          {/* Checks individuales */}
          {items.map(({ label, key }) => {
            const val = health.checks[key as keyof typeof health.checks];
            const info = STATUS_ICONS[val] || STATUS_ICONS.not_configured;
            const labelMap: Record<string, string> = {
              connected: 'Conectado',
              configured: 'Configurado',
              disconnected: 'Desconectado',
              not_configured: 'No configurado',
            };
            return (
              <div key={key} className="flex items-center justify-between py-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`material-symbols-outlined text-base ${info.color}`}>{info.icon}</span>
                  <span className={`text-[10px] font-bold ${info.color}`}>
                    {labelMap[val] || val}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Timestamp */}
          <div className="pt-2 border-t border-border/40 text-center">
            <p className="text-[8px] text-muted-foreground/50 font-mono">
              Última verificación: {new Date(health.timestamp).toLocaleTimeString('es-EC')}
            </p>
          </div>
        </div>
      ) : null}
    </DashboardWidget>
  );
}
