/**
 * planificacionCarrera.ts — Módulo de planificación colaborativa (Rommie).
 *
 * Wrapper tipado de /api/planificacion-colaborativa/* (backend Fase 4).
 * Sigue el patrón documentado en services/api.ts ("créalo en ./api/tu-servicio.ts
 * y re-expórtalo al final") en vez del monolito histórico, dado el tamaño
 * de este módulo (10 endpoints).
 */
import api from './axiosInstance';

const BASE = '/planificacion-colaborativa';

export type EstadoFlujoPlanificacion = 'BORRADOR' | 'ENVIADA' | 'CONFIRMADA';
export type EstadoBloqueDisponibilidad = 'LIBRE' | 'EN_REVISION' | 'CONFIRMADO';

export interface FlujoPlanificacion {
  id: number;
  carrera_id: number;
  periodo_id: number | null;
  estado: EstadoFlujoPlanificacion;
  fecha_limite: string | null;
  fecha_confirmacion: string | null;
  created_at: string;
  updated_at: string;
  carrera?: { id: number; carrera: string };
}

export interface BloqueDisponibilidad {
  id: number;
  clase_id: number;
  aula_id: number | null;
  dia: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: EstadoBloqueDisponibilidad;
  flujo_planificacion_id: number | null;
  updated_at: string;
}

export interface SugerenciaAula {
  aulaId: number;
  aulaCodigo: string;
  isOvercapacity: boolean;
}

export interface SugerenciaAlternativa {
  mensaje: string;
  aula: string | null;
  aulaId?: number;
  sobrecupo?: boolean;
}

export interface ConflictoEnvio {
  claseId: number;
  conflictoId: number;
  sugerencia: SugerenciaAlternativa | null;
}

/** Bloque propuesto por el director (enviar) o por el admin (fill-gaps). */
export interface BloquePropuesto {
  claseId: number;
  aulaId: number;
  dia: string;
  horaInicio: string;
  horaFin: string;
}

export interface PropuestaFillGaps extends BloquePropuesto {
  materia: string;
  carrera?: string;
  aulaCodigo: string;
  isOvercapacity: boolean;
}

export interface SinAsignarFillGaps {
  claseId: number;
  materia: string;
  motivo: string;
}

/**
 * Clase que la distribución NO va a tocar. §3.4 exige que el preview
 * muestre esto junto a lo que sí se asigna: el admin aprueba con las dos
 * listas a la vista, no solo con la de cambios.
 */
export interface SinCambiosFillGaps {
  claseId: number;
  materia: string;
  carrera?: string;
  estado: 'CONFIRMADO' | 'EN_REVISION' | 'LEGADO';
  aulaCodigo: string | null;
  dia: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  motivo: string;
}

export interface EstadisticasFillGaps {
  totalClasesEnAlcance: number;
  totalCandidatas: number;
  sinCambios: number;
  propuestas: number;
  sinAsignar: number;
}

export interface EstadoPlanificacionResponse {
  success: boolean;
  flujo: FlujoPlanificacion | null;
  bloques: BloqueDisponibilidad[];
}

export interface CalcularFillGapsResponse {
  success: boolean;
  /** Identifica este cálculo. Aplicar lo referencia en vez de reenviar el array. */
  previewId: number;
  propuestas: PropuestaFillGaps[];
  /** Lo que queda fijo: la otra mitad de la evidencia que pide §3.4. */
  sinCambios: SinCambiosFillGaps[];
  sinAsignar: SinAsignarFillGaps[];
  estadisticas: EstadisticasFillGaps;
}

export interface AplicarFillGapsResponse {
  success: boolean;
  previewId: number;
  calculadoEn: string;
  aplicadas: number[];
  omitidas: { claseId: number; motivo: string }[];
}

export interface ReasignacionExcepcionalParams {
  bloqueId: number;
  motivo: string;
  nuevaAulaId?: number;
  nuevoDia?: string;
  nuevaHoraInicio?: string;
  nuevaHoraFin?: string;
}

export const planificacionCarreraService = {
  // ============================================
  // Director (o admin) — sobre una carrera propia
  // ============================================

  obtenerEstado: async (carreraId: number, periodoId?: number): Promise<EstadoPlanificacionResponse> => {
    const params = periodoId ? { periodoId } : {};
    const response = await api.get<EstadoPlanificacionResponse>(`${BASE}/${carreraId}/estado`, { params });
    return response.data;
  },

  reabrirBorrador: async (
    carreraId: number,
    periodoId?: number
  ): Promise<{ success: boolean; flujo: FlujoPlanificacion }> => {
    const response = await api.post(`${BASE}/${carreraId}/reabrir`, { periodoId });
    return response.data;
  },

  sugerirAula: async (
    carreraId: number,
    claseId: number
  ): Promise<{ success: boolean; sugerencia: SugerenciaAula | null; mensaje?: string }> => {
    const response = await api.post(`${BASE}/${carreraId}/sugerir`, { claseId });
    return response.data;
  },

  enviarPlanificacion: async (
    carreraId: number,
    bloques: BloquePropuesto[],
    periodoId?: number
  ): Promise<{ success: boolean; flujo: FlujoPlanificacion; conflictos: ConflictoEnvio[] }> => {
    const response = await api.post(`${BASE}/${carreraId}/enviar`, { periodoId, bloques });
    return response.data;
  },

  confirmarPlanificacion: async (
    carreraId: number,
    periodoId?: number
  ): Promise<{ success: boolean; flujo: FlujoPlanificacion }> => {
    const response = await api.post(`${BASE}/${carreraId}/confirmar`, { periodoId });
    return response.data;
  },

  // ============================================
  // Admin exclusivo
  // ============================================

  detectarCarrerasSinEnviar: async (
    periodoId?: number
  ): Promise<{ success: boolean; vencidas: FlujoPlanificacion[] }> => {
    const params = periodoId ? { periodoId } : {};
    const response = await api.get(`${BASE}/admin/pendientes`, { params });
    return response.data;
  },

  extenderFechaLimite: async (
    carreraId: number,
    nuevaFecha: string,
    periodoId?: number | null
  ): Promise<{ success: boolean; registro: { id: number; carrera_id: number; nueva_fecha: string } }> => {
    const response = await api.post(`${BASE}/admin/${carreraId}/fecha-limite/extender`, {
      nuevaFecha,
      periodoId: periodoId ?? null,
    });
    return response.data;
  },

  calcularFillGaps: async (
    carreraId?: number,
    periodoId?: number | null
  ): Promise<CalcularFillGapsResponse> => {
    const response = await api.post(`${BASE}/admin/fill-gaps/calcular`, { carreraId, periodoId });
    return response.data;
  },

  crearFlujo: async (
    carreraId: number,
    periodoId?: number,
    fechaLimite?: string
  ): Promise<{ success: boolean; flujo: FlujoPlanificacion }> => {
    const response = await api.post(`${BASE}/admin/crear-flujo`, { carreraId, periodoId, fechaLimite });
    return response.data;
  },

  /**
   * Aplica un cálculo previo por su id. Ya no se reenvía el array de
   * propuestas: el backend lee las suyas del preview guardado, así que el
   * cliente no puede inventar asignaciones que el motor nunca produjo.
   */
  aplicarFillGaps: async (previewId: number): Promise<AplicarFillGapsResponse> => {
    const response = await api.post(`${BASE}/admin/fill-gaps/aplicar`, { previewId });
    return response.data;
  },

  reasignacionExcepcional: async (
    params: ReasignacionExcepcionalParams
  ): Promise<{ success: boolean; bloque: BloqueDisponibilidad; registro: { id: number; motivo: string } }> => {
    const response = await api.post(`${BASE}/admin/reasignacion-excepcional`, params);
    return response.data;
  },
};
