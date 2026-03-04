/**
 * api.ts — Barrel de servicios API del frontend.
 *
 * La instancia Axios y sus interceptores están en ./api/axiosInstance.ts
 * Este archivo centraliza todos los servicios y tipos para que los componentes
 * puedan importar directamente desde 'services/api' sin cambiar nada.
 *
 * Para agregar un nuevo servicio: créalo en ./api/tu-servicio.ts
 * y re-expórtalo al final de este archivo.
 */
import api from './api/axiosInstance';


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
  requiere_cambio_password?: boolean;
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
  facultad?: string | null;
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

  changePasswordFirstLogin: async (passwordNuevo: string): Promise<{ mensaje: string }> => {
    const response = await api.put<{ mensaje: string }>('/auth/primer-ingreso', { passwordNuevo });
    return response.data;
  },

  crearDirector: async (data: {
    nombre: string;
    apellido: string;
    email: string;
    telefono?: string;
    carrera_director: string;
  }): Promise<{
    success: boolean;
    usuario: User;
    credenciales: { email: string; password: string; whatsapp_enviado: boolean };
  }> => {
    const response = await api.post('/auth/crear-director', data);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; mensaje: string }> => {
    const response = await api.post<{ success: boolean; mensaje: string }>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPasswordWithToken: async (token: string, passwordNuevo: string): Promise<{ success: boolean; mensaje: string }> => {
    const response = await api.post<{ success: boolean; mensaje: string }>('/auth/reset-password', {
      token,
      password: passwordNuevo
    });
    return response.data;
  },
};


export interface EstudianteLoginResponse {
  success: boolean;
  token: string;
  estudiante: Estudiante;
  usuario: User;
}

// Servicios de estudiantes (lookup por email)
export const estudianteService = {
  loginByCedula: async (cedula: string): Promise<EstudianteLoginResponse> => {
    const response = await api.get<EstudianteLoginResponse>(`/estudiantes/login/${cedula}`);
    return response.data;
  },

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
  },

  getEstudianteLoad: async (id: number): Promise<{ success: boolean; estudiante: Estudiante; materias: any[] }> => {
    const response = await api.get(`/estudiantes/${id}/load`);
    return response.data;
  },

  syncProyeccionCupos: async (formData: FormData): Promise<any> => {
    const response = await api.post('/estudiantes/sync-proyeccion', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    });
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

  createCarrera: async (carrera: string, facultad?: string): Promise<{ success: boolean; message: string; carrera: Carrera }> => {
    const response = await api.post('/carreras', { carrera, facultad });
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

  // Mantener alias por compatibilidad — retorna credenciales al crear directores
  createDirector: async (data: Partial<User>): Promise<{
    success: boolean;
    usuario: User;
    mensaje?: string;
    credenciales?: { email: string; password: string; whatsapp_enviado: boolean };
  }> => usuarioService.createUsuario({ ...data, rol: 'director' }) as any,


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

  generarCredenciales: async (id: number): Promise<{ success: boolean; credenciales: { email: string; password: string; whatsapp_enviado: boolean; email_enviado?: boolean }; mensaje: string }> => {
    const response = await api.post(`/usuarios/${id}/generar-credenciales`);
    return response.data;
  },

  updateDirectorCarrera: async (id: number, carrera: string | null): Promise<{ success: boolean; message: string; usuario: User }> => {
    const response = await api.put(`/usuarios/${id}/carrera`, { carrera });
    return response.data;
  },

  resetPassword: async (id: number): Promise<{ success: boolean; mensaje: string }> => {
    const response = await api.post(`/usuarios/${id}/reset-password`);
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
    capacidad_aula: number;
    sobrecupo: boolean;
    porcentaje_uso: number | null;
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

  // Para director: obtener SUS PROPIAS clases como docente
  getMisClasesComoDocente: async (): Promise<MiDistribucionResponse> => {
    const response = await api.get<MiDistribucionResponse>('/distribucion/mi-distribucion', { params: { como_docente: true } });
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
  },

  // Obtener carga docente (horas, clases, conflictos por profesor)
  getDocentesCarga: async (carreraId?: number): Promise<{
    success: boolean;
    docentes: Array<{
      docente: string;
      total_clases: number;
      clases_asignadas: number;
      horas_totales: number;
      conflictos: number;
    }>;
  }> => {
    const params = carreraId ? { carrera_id: carreraId } : {};
    const response = await api.get('/distribucion/docentes-carga', { params });
    return response.data;
  }
};

// ============================================
// BÚSQUEDA
// ============================================

export interface SearchResult {
  id: string;
  type: 'materia' | 'docente' | 'aula' | 'estudiante';
  title: string;
  subtitle: string;
  icon: string;
  link: string;
}

export const searchService = {
  // Búsqueda global (Spotlight)
  globalSearch: async (q: string): Promise<{ success: boolean; results: SearchResult[] }> => {
    const response = await api.get('/search/global', { params: { q } });
    return response.data;
  },

  // Buscar disponibilidad de aulas
  buscarDisponibilidad: async (params: {
    dia: string;
    fecha?: string;
    hora_inicio: string;
    hora_fin: string;
    capacidad_minima?: number;
    tipo_espacio?: 'aula' | 'espacio';
  }): Promise<{ success: boolean; count: number; aulas: Aula[]; espacios: Espacio[] }> => {
    const response = await api.get('/search/disponibilidad', { params });
    return response.data;
  },
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

export interface ReporteSalud {
  total_clases: number;
  clases_sin_horario: number;
  clases_sin_estudiantes: number;
  clases_sin_docente: number;
  estado_general: 'bueno' | 'atencion_requerida';
  recomendacion: string;
}

export interface SubirPlanificacionResponse {
  success: boolean;
  mensaje: string;
  reporte_salud?: ReporteSalud;
  resultado?: {
    clases_guardadas: number;
    hoja_usada: string;
    total_hojas: number;
    errores: string[] | null;
    distribucion: {
      estado: string;
      mensaje: string;
    };
  };
}

export const planificacionService = {
  // Listar planificaciones
  listar: async (): Promise<ListarPlanificacionesResponse> => {
    const response = await api.get<ListarPlanificacionesResponse>('/planificaciones/listar');
    return response.data;
  },

  // Subir planificación
  subirPlanificacion: async (archivo: File, carreraId?: number): Promise<SubirPlanificacionResponse> => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (carreraId) formData.append('carrera_id', carreraId.toString());
    const response = await api.post<SubirPlanificacionResponse>('/planificaciones/subir', formData, {
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

  // Descargar el excel de distribución actual (en vivo)
  descargarExcelActual: async (carreraId?: string) => {
    const params = carreraId ? { carrera_id: carreraId } : {};
    const response = await api.get('/reportes/descargar-excel', {
      params,
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const fecha = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `distribucion_${carreraId || 'total'}_${fecha}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// ============================================
// RESERVAS
// ============================================

export interface Reserva {
  id: number;
  aula_codigo?: string;
  espacio_codigo?: string;
  dia: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo?: string;
  estado: 'activa' | 'cancelada' | 'pendiente_aprobacion' | 'rechazada' | 'finalizada';
  tipo_espacio?: string;
  usuario_id?: number;
  estudiante_id?: number;
  solicitante_nombre?: string;
  solicitante_cedula?: string;
  rol_usuario?: string;
  es_grupal?: boolean;
  num_personas?: number;
  created_at: string;
}

export const reservaService = {
  crear: async (data: {
    aula_codigo?: string;
    espacio_codigo?: string;
    tipo_espacio?: string;
    dia: string;
    fecha?: string;
    hora_inicio: string;
    hora_fin: string;
    motivo?: string
  }): Promise<{ success: boolean; reserva: Reserva }> => {
    // Si no se envía fecha, calcularla basada en el día (opcional, el backend lo requiere)
    // Por simplicidad, el frontend debe enviar la fecha
    const response = await api.post('/reservas', data);
    return response.data;
  },

  misReservas: async (): Promise<{ success: boolean; reservas: Reserva[] }> => {
    const response = await api.get('/reservas/mis-reservas');
    return response.data;
  },

  cancelar: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/reservas/${id}`);
    return response.data;
  },

  getDisponibles: async (params: { fecha: string; hora_inicio: string; hora_fin: string; tipo?: string }): Promise<{ success: boolean; aulas: Aula[] }> => {
    const response = await api.get('/reservas/disponibles', { params });
    return response.data;
  },

  // Admin / Director
  listarTodas: async (params?: { fecha?: string; estado?: string; busqueda?: string; pagina?: number; limite?: number }): Promise<{ success: boolean; reservas: Reserva[]; total?: number; pagina?: number; totalPaginas?: number }> => {
    const response = await api.get('/reservas/todas', { params });
    return response.data;
  },

  listarPendientes: async (): Promise<{ success: boolean; reservas: Reserva[] }> => {
    const response = await api.get('/reservas/pendientes');
    return response.data;
  },

  cambiarEstado: async (id: number, estado: string, motivo_rechazo?: string): Promise<{ success: boolean; message: string; reserva: Reserva }> => {
    const response = await api.patch(`/reservas/${id}/estado`, { estado, motivo_rechazo });
    return response.data;
  }
};

// ============================================
// BÚSQUEDA REAL-TIME (Reemplaza Bot)
// ============================================

export const busquedaService = {
  buscarDocente: async (q: string) => {
    const response = await api.get('/busqueda/docente', { params: { q } });
    return response.data;
  },
  estadoAula: async (codigo: string) => {
    const response = await api.get('/busqueda/aula', { params: { codigo } });
    return response.data;
  }
};

// ============================================
// NOTIFICACIONES
// ============================================

export interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'CLASE' | 'CARRERA' | 'GLOBAL' | 'SISTEMA' | 'DIRECTA';
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  leida: boolean;
  fecha_expiracion?: string;
  created_at: string;
  remitenteInfo?: {
    nombre: string;
    apellido: string;
    rol: string;
  };
}

export const notificacionService = {
  crear: async (data: {
    titulo: string;
    mensaje: string;
    tipo: string;
    prioridad?: string;
    destinatario_id?: number;
    carrera_id?: number;
    clase_id?: number;
  }): Promise<{ success: boolean; notificacion: Notificacion }> => {
    const response = await api.post('/notificaciones', data);
    return response.data;
  },

  misNotificaciones: async (): Promise<{ success: boolean; notificaciones: Notificacion[] }> => {
    const response = await api.get('/notificaciones/mis-notificaciones');
    return response.data;
  },

  marcarLeida: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.put(`/notificaciones/${id}/leida`);
    return response.data;
  }
};

// ============================================
// INCIDENCIAS
// ============================================

export interface Incidencia {
  id: number;
  titulo: string;
  descripcion: string;
  tipo: 'EQUIPOS' | 'OBJETOS_OLVIDADOS' | 'LIMPIEZA' | 'ACCESO' | 'OTRO';
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  estado: 'PENDIENTE' | 'REVISANDO' | 'RESUELTO' | 'CERRADO';
  aula_codigo: string;
  foto_path?: string;
  nota_director?: string;
  carrera_id?: number;
  fecha_resolucion?: string;
  respuesta_tecnica?: string;
  created_at: string;
  reportadoPor?: {
    nombre: string;
    apellido: string;
    email: string;
  };
  aula?: {
    nombre: string;
    edificio: string;
    piso: number;
  };
}

// URL base para servir archivos estáticos del backend
const BACKEND_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');

export function incidenciaFotoUrl(foto_path?: string): string | null {
  if (!foto_path) return null;
  return `${BACKEND_BASE}/uploads/incidencias/${foto_path}`;
}

export const TIPO_INCIDENCIA_LABELS: Record<string, string> = {
  EQUIPOS: 'Equipo dañado',
  OBJETOS_OLVIDADOS: 'Obj. olvidado',
  LIMPIEZA: 'Limpieza',
  ACCESO: 'Problema acceso',
  OTRO: 'Otro'
};

export const incidenciaService = {
  crear: async (formData: FormData): Promise<{ success: boolean; incidencia: Incidencia }> => {
    const response = await api.post('/incidencias', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  listar: async (filters?: { estado?: string; aula?: string }): Promise<{ success: boolean; incidencias: Incidencia[] }> => {
    const params = new URLSearchParams();
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.aula) params.append('aula', filters.aula);

    const response = await api.get(`/incidencias?${params.toString()}`);
    return response.data;
  },

  actualizarEstado: async (id: number, data: { estado: string; respuesta_tecnica?: string; nota_director?: string }): Promise<{ success: boolean; incidencia: Incidencia }> => {
    const response = await api.put(`/incidencias/${id}/estado`, data);
    return response.data;
  }
};

// ============================================
// DOCENTES (Extraídos del Excel)
// ============================================

export interface Docente {
  id: number | string;
  nombre: string;
  email: string | null;
  telefono?: string | null;
  titulo_pregrado: string | null;
  titulo_posgrado: string | null;
  tipo: string;
  carrera_id: number | null;
  usuario_id?: number | null;
  es_director?: boolean;
  usuario?: {
    id: number;
    email: string;
    estado: string;
    requiere_cambio_password: boolean;
    last_login?: string;
  };
  carrera?: {
    id: number;
    carrera: string;
  };
  carga?: {
    total_clases: number;
    total_horas: number;
    materias: string;
  };
}

export const docenteService = {
  getDocentes: async (params: { carrera_id?: number; tipo?: string; search?: string } = {}): Promise<{ success: boolean; docentes: Docente[] }> => {
    const response = await api.get<{ success: boolean; docentes: Docente[] }>('/docentes', { params });
    return response.data;
  },

  getDocenteById: async (id: number): Promise<{ success: boolean; docente: Docente }> => {
    const response = await api.get<{ success: boolean; docente: Docente }>(`/docentes/${id}`);
    return response.data;
  },

  createDocente: async (data: Partial<Docente>): Promise<{
    success: boolean;
    docente: Docente;
    mensaje: string;
    credenciales?: { email: string; password: string; whatsapp_enviado: boolean } | null;
  }> => {
    const response = await api.post('/docentes', data);
    return response.data;
  },

  updateDocente: async (id: number | string, data: Partial<Docente>): Promise<{ success: boolean; docente: Docente; mensaje: string; credenciales?: { email: string; password: string; whatsapp_enviado: boolean } }> => {
    const response = await api.put(`/docentes/${id}`, data);
    return response.data;
  },

  updateTelefono: async (id: number | string, telefono: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.put<{ success: boolean; message: string }>(`/docentes/${id}/telefono`, { telefono });
    return response.data;
  },

  crearCuenta: async (id: number | string): Promise<{ success: boolean; credenciales: { email: string; password: string; whatsapp_enviado: boolean; email_enviado?: boolean }; mensaje: string }> => {
    const response = await api.post(`/docentes/${id}/crear-cuenta`);
    return response.data;
  },

  generarCredenciales: async (carrera_id?: number): Promise<{ success: boolean; mensaje: string; stats: any }> => {
    const response = await api.post<{ success: boolean; mensaje: string; stats: any }>('/docentes/generar-credenciales', { carrera_id });
    return response.data;
  }
};

// ============================================
// CATÁLOGO DE MATERIAS
// ============================================

export interface MateriaCatalogo {
  id: number;
  codigo: string;
  nombre: string;
  creditos: number;
  ciclo: number;
  carrera_id: number;
  activo: boolean;
  carrera?: {
    id: number;
    carrera: string;
  };
}

export const materiaCatalogoService = {
  getMaterias: async (params: { carrera_id?: number; search?: string; ciclo?: number } = {}): Promise<{ success: boolean; materias: MateriaCatalogo[] }> => {
    const response = await api.get('/materias-catalogo', { params });
    return response.data;
  },
  getMateriaById: async (id: number): Promise<{ success: boolean; materia: MateriaCatalogo }> => {
    const response = await api.get(`/materias-catalogo/${id}`);
    return response.data;
  },
  createMateria: async (data: any): Promise<{ success: boolean; materia: MateriaCatalogo }> => {
    const response = await api.post('/materias-catalogo', data);
    return response.data;
  },
  updateMateria: async (id: number, data: any): Promise<{ success: boolean; materia: MateriaCatalogo }> => {
    const response = await api.put(`/materias-catalogo/${id}`, data);
    return response.data;
  },
  deleteMateria: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/materias-catalogo/${id}`);
    return response.data;
  },
  syncCatalogo: async (carrera_id: number): Promise<{ success: boolean; mensaje: string }> => {
    const response = await api.post('/materias-catalogo/sync', { carrera_id });
    return response.data;
  }
};

// ============================================
// GESTIÓN DE CLASES MANUALES Y ESTUDIANTES
// ============================================

export const gestionAcademicaService = {
  // Crear clase manual
  createClase: async (data: {
    materia_catalogo_id: number;
    docente_id: number | string;
    dia: string;
    hora_inicio: string;
    hora_fin: string;
    paralelo?: string;
    ciclo?: string;
    num_estudiantes?: number;
  }) => {
    const response = await api.post('/distribucion/clase', data);
    return response.data;
  },

  // Eliminar clase manual
  deleteClase: async (id: number) => {
    const response = await api.delete(`/distribucion/clase/${id}`);
    return response.data;
  },

  // Inscribir estudiantes individualmente
  inscribirEstudiantesManual: async (clase_id: number, estudiante_ids: number[]) => {
    const response = await api.post('/estudiantes/inscribir-manual', { clase_id, estudiante_ids });
    return response.data;
  },

  // Inscribir por nivel completo
  inscribirNivelCompleto: async (clase_id: number, nivel: string) => {
    const response = await api.post('/estudiantes/inscribir-nivel', { clase_id, nivel });
    return response.data;
  },

  // Desvincular estudiante
  desinscribirEstudiante: async (estudiante_id: number, clase_id: number) => {
    const response = await api.delete(`/estudiantes/${estudiante_id}/clase/${clase_id}`);
    return response.data;
  }
};

export default api;




