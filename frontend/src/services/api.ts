import axios from 'axios';

// Configuración base de Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a todas las requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Tipos para las respuestas
export interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'admin' | 'director' | 'profesor' | 'estudiante' | 'docente';
  cedula?: string;
  telefono?: string;
  carrera_director?: number | null;
  carrera_nombre?: string;
  carrera?: {
    id: number;
    nombre: string;
    normalizada: string;
  };
  estado: 'activo' | 'inactivo';
}

export interface LoginResponse {
  mensaje: string;
  usuario: User;
  token: string;
}

export interface RegisterData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol?: 'admin' | 'director' | 'profesor' | 'estudiante' | 'docente';
  cedula?: string;
  telefono?: string;
}

export interface EstudianteLookup {
  cedula?: string;
  nombre?: string;
  escuela?: string;
  nivel?: string;
  email?: string;
  edad?: number | null;
}

// Tipos para Aulas
export interface Aula {
  id: number;
  codigo: string;
  nombre: string;
  capacidad: number;
  tipo: 'AULA' | 'LABORATORIO' | 'SALA_ESPECIAL' | 'AUDITORIO';
  ubicacion?: string;
  edificio?: string;
  piso?: string;
  equipamiento?: string;
  restriccion_carrera?: string;
  es_prioritaria?: boolean;
  estado: 'DISPONIBLE' | 'MANTENIMIENTO' | 'NO_DISPONIBLE' | 'OCUPADA';
  notas?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AulasResponse {
  success: boolean;
  count: number;
  aulas: Aula[];
}

export interface AulaResponse {
  success: boolean;
  aula: Aula;
}

export interface AulaStats {
  total: number;
  disponibles: number;
  enMantenimiento: number;
  noDisponibles: number;
  capacidadTotal: number;
  porEdificio: Array<{
    edificio: string;
    total: number;
    capacidad_total: number;
  }>;
}

export interface Carrera {
  id: number;
  carrera: string;
  activa: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

// Servicios de autenticación
export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  register: async (data: RegisterData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/register', data);
    return response.data;
  },

  getProfile: async (): Promise<{ usuario: User }> => {
    const response = await api.get<{ usuario: User }>('/api/auth/perfil');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<{ mensaje: string; usuario: User }> => {
    const response = await api.put<{ mensaje: string; usuario: User }>('/api/auth/perfil', data);
    return response.data;
  },

  changePassword: async (passwordActual: string, passwordNuevo: string): Promise<{ mensaje: string }> => {
    const response = await api.put<{ mensaje: string }>('/api/auth/cambiar-password', {
      passwordActual,
      passwordNuevo,
      passwordConfirmacion: passwordNuevo,
    });
    return response.data;
  },
};

// Servicios de estudiantes (lookup por email)
export const estudianteService = {
  lookupByEmail: async (email: string): Promise<{ success: boolean; found: boolean; estudiante?: EstudianteLookup }> => {
    const response = await api.get('/api/estudiantes/lookup', { params: { email } });
    return response.data;
  }
};

// Servicios de aulas
export const aulaService = {
  getAulas: async (filters?: {
    edificio?: string;
    carrera?: string;
    capacidadMin?: number;
    estado?: string;
    es_laboratorio?: boolean;
  }): Promise<AulasResponse> => {
    const response = await api.get<AulasResponse>('/api/aulas', { params: filters });
    return response.data;
  },

  getAulaById: async (id: number): Promise<AulaResponse> => {
    const response = await api.get<AulaResponse>(`/api/aulas/${id}`);
    return response.data;
  },

  createAula: async (data: Partial<Aula>): Promise<AulaResponse> => {
    const response = await api.post<AulaResponse>('/api/aulas', data);
    return response.data;
  },

  updateAula: async (id: number, data: Partial<Aula>): Promise<AulaResponse> => {
    const response = await api.put<AulaResponse>(`/api/aulas/${id}`, data);
    return response.data;
  },

  deleteAula: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/aulas/${id}`);
    return response.data;
  },

  getAulasStats: async (): Promise<{ success: boolean; stats: AulaStats }> => {
    const response = await api.get<{ success: boolean; stats: AulaStats }>('/api/aulas/stats/summary');
    return response.data;
  },
};

// Servicios de carreras
export const carreraService = {
  getCarreras: async (includeInactive = false): Promise<{ success: boolean; total: number; activas: number; carreras: Carrera[] }> => {
    const response = await api.get('/api/carreras', { params: { includeInactive } });
    return response.data;
  },

  createCarrera: async (carrera: string): Promise<{ success: boolean; message: string; carrera: Carrera }> => {
    const response = await api.post('/api/carreras', { carrera });
    return response.data;
  },

  updateCarrera: async (id: number, data: Partial<Carrera>): Promise<{ success: boolean; message: string; carrera: Carrera }> => {
    const response = await api.put(`/api/carreras/${id}`, data);
    return response.data;
  },

  deleteCarrera: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/api/carreras/${id}`);
    return response.data;
  },
};

// Servicios de usuarios (admin)
export const usuarioService = {
  getDirectores: async (): Promise<{ success: boolean; total: number; usuarios: User[] }> => {
    const response = await api.get('/api/usuarios', { params: { rol: 'director' } });
    return response.data;
  },

  updateDirectorCarrera: async (id: number, carrera: string | null): Promise<{ success: boolean; message: string; usuario: User }> => {
    const response = await api.put(`/api/usuarios/${id}/carrera`, { carrera });
    return response.data;
  },
};

// Tipos para Distribución
export interface EstadoDistribucion {
  success: boolean;
  estadisticas: {
    total_carreras: number;
    total_clases: number;
    clases_asignadas: number;
    clases_pendientes: number;
    porcentaje_completado: number;
  };
  carreras: Array<{
    id: number;
    nombre_carrera: string;
    estado: string;
    total_clases: number;
    clases_asignadas: number;
    clases_pendientes: number;
    porcentaje_completado: number;
    director_nombre?: string | null;
    director_email?: string | null;
  }>;
  timestamp?: string;
}

export interface PuntoMapaCalor {
  dia: string;
  hora: number;
  nivel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMPTY';
  porcentaje_ocupacion: number;
  aulas_ocupadas: number;
  total_aulas: number;
  clases_activas: number;
}

export interface DetalleMapaCalor {
  dia: string;
  hora: number;
  clases: Array<{
    materia: string;
    aula: string;
    docente: string;
    estudiantes: number;
    carrera: string;
  }>;
}

export interface MapaCalorResponse {
  success: boolean;
  estadisticas: {
    total_aulas: number;
    total_clases: number;
    promedio_ocupacion: number;
    horas_pico: string[];
  };
  puntos: PuntoMapaCalor[];
  detalles: DetalleMapaCalor[];
}

export interface MiDistribucionResponse {
  success: boolean;
  rol: string;
  estadisticas: {
    total_clases: number;
    clases_asignadas: number;
    clases_pendientes: number;
    porcentaje_completado: number;
  };
  clases: Array<{
    id: number;
    materia: string;
    codigo: string;
    nivel: string;
    paralelo: string;
    dia: string;
    hora_inicio: string;
    hora_fin: string;
    aula: string | null;
    docente: string;
    estudiantes: number;
    estado: string;
  }>;
  por_dia: {
    [key: string]: Array<any>;
  };
}

// Servicios de distribución
export const distribucionService = {
  // Obtener estado general de distribución
  getEstado: async (carreraId?: number): Promise<EstadoDistribucion> => {
    try {
      const params = carreraId ? { carrera_id: carreraId } : {};
      const response = await api.get<EstadoDistribucion>('/api/distribucion/estado', { params });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 500 || error.response?.status === 404) {
        return {
          success: false,
          estadisticas: {
            total_carreras: 0,
            total_clases: 0,
            clases_asignadas: 0,
            clases_pendientes: 0,
            porcentaje_completado: 0,
          },
          carreras: []
        };
      }
      throw error;
    }
  },

  // Obtener mapa de calor
  getMapaCalor: async (carreraId?: number): Promise<MapaCalorResponse> => {
    const params = carreraId ? { carrera_id: carreraId } : {};
    const response = await api.get<MapaCalorResponse>('/api/distribucion/heatmap', { params });
    return response.data;
  },

  // Obtener mi distribución según rol
  getMiDistribucion: async (carreraId?: number): Promise<MiDistribucionResponse> => {
    const params = carreraId ? { carrera_id: carreraId } : {};
    const response = await api.get<MiDistribucionResponse>('/api/distribucion/mi-distribucion', { params });
    return response.data;
  },

  // Generar reporte
  generarReporte: async (carreraId?: string, formato: 'json' | 'pdf' | 'excel' = 'json') => {
    const params: any = { formato };
    if (carreraId) params.carrera_id = carreraId;
    const response = await api.get('/api/distribucion/reporte', { params });
    return response.data;
  },

  // Forzar redistribución (admin)
  forzarDistribucion: async (carreraId?: number) => {
    const response = await api.post('/api/distribucion/forzar', { carrera_id: carreraId });
    return response.data;
  },

  // Limpiar distribución (admin)
  limpiarDistribucion: async (carreraId?: number) => {
    const response = await api.post('/api/distribucion/limpiar', { carrera_id: carreraId });
    return response.data;
  },

  // Ejecutar distribución automática
  ejecutarDistribucion: async () => {
    const response = await api.post('/api/distribucion/ejecutar');
    return response.data;
  },

  // Obtener horario
  obtenerHorario: async (carreraId?: number) => {
    const params = carreraId ? { carrera_id: carreraId } : {};
    const response = await api.get('/api/distribucion/horario', { params });
    return response.data;
  }
};

// ============================================
// PLANIFICACIONES
// ============================================

export interface PlanificacionSubida {
  id: number;
  carrera_id: number;
  usuario_id: number;
  nombre_archivo_original: string;
  nombre_archivo_guardado: string;
  ruta_archivo: string;
  total_clases: number;
  estado: string;
  fecha_subida: string;
  carrera?: {
    id: number;
    carrera: string;
  };
  usuario?: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
}

export interface ListarPlanificacionesResponse {
  success: boolean;
  planificaciones: PlanificacionSubida[];
}

export const planificacionService = {
  // Listar planificaciones
  listar: async (): Promise<ListarPlanificacionesResponse> => {
    const response = await api.get<ListarPlanificacionesResponse>('/api/planificaciones/listar');
    return response.data;
  },

  // Descargar planificación
  descargar: async (id: number): Promise<void> => {
    const response = await api.get(`/api/planificaciones/descargar/${id}`, {
      responseType: 'blob'
    });
    
    // Crear URL para descargar
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Obtener nombre del archivo del header si está disponible
    const contentDisposition = response.headers['content-disposition'];
    let filename = `planificacion-${id}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/);
      if (match) filename = match[1];
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default api;




