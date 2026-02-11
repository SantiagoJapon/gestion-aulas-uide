import axios from 'axios';

// Configuración base de Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a todas las requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
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
  carrera_director?: string | null;
  carrera_nombre?: string;
  carrera?: {
    id: number;
    carrera: string;
    carrera_normalizada: string;
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

export interface Estudiante {
  id: number;
  cedula: string;
  nombre: string;
  escuela: string | null;
  nivel: string | null;
  email: string | null;
  edad: number | null;
  telegram_id?: number | null;
  fecha_registro?: string | null;
}

export interface ListarEstudiantesResponse {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  estudiantes: Estudiante[];
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
  login: async (email: string, password: string, rememberMe: boolean = false): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
      rememberMe,
    });
    return response.data;
  },

  register: async (data: RegisterData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/register', data);
    return response.data;
  },

  getProfile: async (): Promise<{ usuario: User }> => {
    const response = await api.get<{ usuario: User }>('/auth/perfil');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<{ mensaje: string; usuario: User }> => {
    const response = await api.put<{ mensaje: string; usuario: User }>('/auth/perfil', data);
    return response.data;
  },

  changePassword: async (passwordActual: string, passwordNuevo: string): Promise<{ mensaje: string }> => {
    const response = await api.put<{ mensaje: string }>('/auth/cambiar-password', {
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
    const response = await api.get('/estudiantes/lookup', { params: { email } });
    return response.data;
  },

  getEstudiantes: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    escuela?: string;
    nivel?: string;
  } = {}): Promise<ListarEstudiantesResponse> => {
    const response = await api.get<ListarEstudiantesResponse>('/estudiantes', { params });
    return response.data;
  },

  subirEstudiantes: async (formData: FormData): Promise<any> => {
    const response = await api.post('/estudiantes/subir', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    });
    return response.data;
  },

  getHistorialCargas: async (tipo: string = 'estudiantes'): Promise<any> => {
    const response = await api.get('/estudiantes/historial-cargas', { params: { tipo } });
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
    const response = await api.get<AulasResponse>('/aulas', { params: filters });
    return response.data;
  },

  getAulaById: async (id: number): Promise<AulaResponse> => {
    const response = await api.get<AulaResponse>(`/aulas/${id}`);
    return response.data;
  },

  createAula: async (data: Partial<Aula>): Promise<AulaResponse> => {
    const response = await api.post<AulaResponse>('/aulas', data);
    return response.data;
  },

  updateAula: async (id: number, data: Partial<Aula>): Promise<AulaResponse> => {
    const response = await api.put<AulaResponse>(`/aulas/${id}`, data);
    return response.data;
  },

  deleteAula: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/aulas/${id}`);
    return response.data;
  },

  getAulasStats: async (): Promise<{ success: boolean; stats: AulaStats }> => {
    const response = await api.get<{ success: boolean; stats: AulaStats }>('/aulas/stats/summary');
    return response.data;
  },
};

// Servicios de carreras
export const carreraService = {
  getCarreras: async (includeInactive = false): Promise<{ success: boolean; total: number; activas: number; carreras: Carrera[] }> => {
    const response = await api.get('/carreras', { params: { includeInactive } });
    return response.data;
  },

  createCarrera: async (carrera: string): Promise<{ success: boolean; message: string; carrera: Carrera }> => {
    const response = await api.post('/carreras', { carrera });
    return response.data;
  },

  updateCarrera: async (id: number, data: Partial<Carrera>): Promise<{ success: boolean; message: string; carrera: Carrera }> => {
    const response = await api.put(`/carreras/${id}`, data);
    return response.data;
  },

  deleteCarrera: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/carreras/${id}`);
    return response.data;
  },
};

// Servicios de usuarios (admin y directores)
export const usuarioService = {
  getUsuarios: async (params: { rol?: string; carrera_id?: number } = {}): Promise<{ success: boolean; total: number; usuarios: User[] }> => {
    const response = await api.get('/usuarios', { params });
    return response.data;
  },

  getDirectores: async (): Promise<{ success: boolean; total: number; usuarios: User[] }> => {
    return usuarioService.getUsuarios({ rol: 'director' });
  },

  createUsuario: async (data: Partial<User>): Promise<{ success: boolean; usuario: User }> => {
    const response = await api.post('/usuarios', data);
    return response.data;
  },

  // Mantener alias por compatibilidad
  createDirector: async (data: Partial<User>) => usuarioService.createUsuario({ ...data, rol: 'director' }),

  updateUsuario: async (id: number, data: Partial<User>): Promise<{ success: boolean; mensaje: string; usuario: User }> => {
    const response = await api.put(`/usuarios/${id}`, data);
    return response.data;
  },

  // Mantener alias por compatibilidad
  updateDirector: async (id: number, data: Partial<User>) => usuarioService.updateUsuario(id, data),

  deleteUsuario: async (id: number): Promise<{ success: boolean; mensaje: string }> => {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  },

  // Mantener alias por compatibilidad
  deleteDirector: async (id: number) => usuarioService.deleteUsuario(id),

  updateDirectorCarrera: async (id: number, carrera: string | null): Promise<{ success: boolean; message: string; usuario: User }> => {
    const response = await api.put(`/usuarios/${id}/carrera`, { carrera });
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
      const response = await api.get<EstadoDistribucion>('/distribucion/estado', { params });
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
    const response = await api.get<MapaCalorResponse>('/distribucion/heatmap', { params });
    return response.data;
  },

  // Obtener mi distribución según rol
  getMiDistribucion: async (carreraId?: number): Promise<MiDistribucionResponse> => {
    const params = carreraId ? { carrera_id: carreraId } : {};
    const response = await api.get<MiDistribucionResponse>('/distribucion/mi-distribucion', { params });
    return response.data;
  },

  // Generar reporte
  generarReporte: async (carreraId?: string, formato: 'json' | 'pdf' | 'excel' = 'json') => {
    const params: any = { formato };
    if (carreraId) params.carrera_id = carreraId;
    const response = await api.get('/distribucion/reporte', { params });
    return response.data;
  },

  // Forzar redistribución (admin)
  forzarDistribucion: async (carreraId?: number) => {
    const response = await api.post('/distribucion/forzar', { carrera_id: carreraId });
    return response.data;
  },

  // Limpiar distribución (admin)
  limpiarDistribucion: async (carreraId?: number) => {
    const response = await api.post('/distribucion/limpiar', { carrera_id: carreraId });
    return response.data;
  },

  // Ejecutar distribución automática
  ejecutarDistribucion: async (carreraId?: number) => {
    const params = carreraId ? { carrera_id: carreraId } : {};
    const response = await api.post('/distribucion/ejecutar', {}, { params });
    return response.data;
  },

  // Obtener horario
  obtenerHorario: async (carreraId?: number | string) => {
    const params = carreraId ? { carrera_id: carreraId } : {};
    const response = await api.get('/distribucion/horario', { params });
    return response.data;
  },

  // Obtener todas las clases con estado de distribución
  getClasesDistribucion: async () => {
    const response = await api.get('/distribucion/clases');
    return response.data;
  },

  // Actualizar una clase individualmente
  updateClase: async (id: number, data: any) => {
    const response = await api.put(`/distribucion/clase/${id}`, data);
    return response.data;
  },

  // Consultar disponibilidad de aulas
  getDisponibilidadAulas: async (params: { dia: string; hora_inicio: string; hora_fin: string; capacidad_minima?: number }) => {
    const response = await api.get('/distribucion/disponibilidad', { params });
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
    const response = await api.get<ListarPlanificacionesResponse>('/planificaciones/listar');
    return response.data;
  },

  // Subir planificación
  subirPlanificacion: async (archivo: File, carreraId?: number): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (carreraId) formData.append('carrera_id', carreraId.toString());
    const response = await api.post<{ success: boolean; message: string }>('/planificaciones/subir', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Descargar planificación
  descargar: async (id: number): Promise<void> => {
    const response = await api.get(`/planificaciones/descargar/${id}`, {
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

// ============================================
// ESPACIOS
// ============================================

export interface Espacio {
  id: number;
  codigo: string;
  nombre: string;
  tipo: 'BIBLIOTECA' | 'SALA_DESCANSO' | 'ZONA_TRABAJO' | 'CUBICULO' | 'OTRO';
  capacidad: number;
  estado: 'DISPONIBLE' | 'NO_DISPONIBLE' | 'MANTENIMIENTO';
  descripcion?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EspaciosResponse {
  success: boolean;
  count: number;
  espacios: Espacio[];
}

export interface EspacioStats {
  total: number;
  disponibles: number;
  enMantenimiento: number;
  noDisponibles: number;
  porTipo: Array<{ tipo: string; total: number; capacidad_total: number }>;
}

// ============================================
// ESPACIOS
// ============================================

export const espacioService = {
  getEspacios: async (filters?: { tipo?: string; estado?: string; search?: string }): Promise<EspaciosResponse> => {
    const response = await api.get<EspaciosResponse>('/espacios', { params: filters });
    return response.data;
  },

  getEspacioById: async (id: number): Promise<{ success: boolean; espacio: Espacio }> => {
    const response = await api.get(`/espacios/${id}`);
    return response.data;
  },

  createEspacio: async (data: Partial<Espacio>): Promise<{ success: boolean; message: string; espacio: Espacio }> => {
    const response = await api.post('/espacios', data);
    return response.data;
  },

  updateEspacio: async (id: number, data: Partial<Espacio>): Promise<{ success: boolean; message: string; espacio: Espacio }> => {
    const response = await api.put(`/espacios/${id}`, data);
    return response.data;
  },

  deleteEspacio: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/espacios/${id}`);
    return response.data;
  },

  getEspaciosStats: async (): Promise<{ success: boolean; stats: EspacioStats }> => {
    const response = await api.get('/espacios/stats/summary');
    return response.data;
  },
};

// ============================================
// REPORTES
// ============================================

export interface ReporteHistorial {
  id: number;
  nombre: string;
  tipo: 'GENERAL' | 'CARRERA' | 'AULA' | 'ESPACIOS';
  filtros: any;
  metadatos: any;
  ruta_archivo: string;
  formato: string;
  usuario_id: number;
  fecha_generacion: string;
  generadoPor?: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

export const reporteService = {
  // Obtener métricas en tiempo real
  getMetricasActuales: async (carreraId?: string) => {
    const params = carreraId ? { carrera_id: carreraId } : {};
    const response = await api.get('/reportes/metricas', { params });
    return response.data;
  },

  // Generar un nuevo reporte
  generarReporte: async (data: { nombre?: string; carrera_id?: string; tipo?: string }) => {
    const response = await api.post('/reportes/generar', data);
    return response.data;
  },

  // Obtener historial de reportes
  getHistorial: async (tipo?: string): Promise<{ success: boolean; historial: ReporteHistorial[] }> => {
    const params = tipo ? { tipo } : {};
    const response = await api.get('/reportes/historial', { params });
    return response.data;
  },

  // Eliminar un reporte del historial
  eliminarReporte: async (id: number) => {
    const response = await api.delete(`/reportes/${id}`);
    return response.data;
  },

  // Descargar un reporte
  descargarReporte: async (id: number, nombreArchivo: string): Promise<void> => {
    const response = await api.get(`/reportes/descargar/${id}`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default api;




