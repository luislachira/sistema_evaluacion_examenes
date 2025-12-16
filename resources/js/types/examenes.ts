// Tipos basados en las migraciones de la base de datos (RF-A.4.2)
export interface Examen {
  idExamen: number;
  idTipoConcurso: number;
  codigo_examen?: string | null;
  titulo: string;
  descripcion?: string | null;
  tiempo_limite: number;
  tipo_acceso: 'publico' | 'privado';
  estado: '0' | '1' | '2'; // '0': Borrador, '1': Publicado, '2': Finalizado
  tipoConcurso?: {
    idTipoConcurso: number;
    nombre: string;
  };
  subpruebas?: Subprueba[];
  postulaciones?: Postulacion[];
  preguntas?: PreguntaExamen[];
  usuariosAsignados?: Array<{
    idUsuario: number;
    nombre: string;
    apellidos: string;
    correo: string;
  }>;
  // Campos legacy para compatibilidad (si vienen del backend)
  id?: number;
  codigo?: string | null;
  tipo?: '0' | '1' | '2' | '3';
  total_preguntas?: number;
  duracion_minutos?: number;
  publico?: boolean;
  activo?: boolean;
  veces_usado?: number;
  intentos_completados?: number;
  intentos_en_progreso?: number;
  promedio_puntaje?: number | null;
  fecha_creacion?: string;
  updated_at?: string;
  fecha_inicio_vigencia?: string | null;
  fecha_fin_vigencia?: string | null;
  // Campos del wizard
  paso_actual?: number;
  completitud?: number;
  estado_pasos?: {
    paso1: boolean;
    paso2: boolean;
    paso3: boolean;
    paso4: boolean;
    paso5: boolean;
  };
  fecha_publicacion?: string | null;
  fecha_finalizacion?: string | null;
}

export interface PreguntaExamen {
  idPregunta: number;
  codigo: string;
  enunciado: string;
  categoria?: {
    idCategoria: number;
    nombre: string;
  } | null;
  contexto?: {
    idContexto: number;
    titulo?: string | null;
    texto?: string | null;
  } | null;
  ano?: number;
  opciones?: Array<{
    idOpcion: number;
    contenido: string;
    es_correcta: boolean;
    // Campos adicionales del backend para compatibilidad
    id?: number;
    texto?: string;
    letra?: string;
  }>;
  pivot?: {
    orden: number;
    idSubprueba?: number | null;
    puntaje?: number;
  };
  // Campos legacy para compatibilidad
  id?: string | number;
  texto?: string;
  dificultad?: '0' | '1' | '2';
  tema?: {
    id: number;
    nombre: string;
  } | null;
}

export interface Postulacion {
  idPostulacion: number;
  idExamen: number;
  nombre: string;
  descripcion?: string | null;
  tipo_aprobacion?: '0' | '1'; // 0 = conjunta, 1 = independiente
  subpruebas?: Array<{
    idSubprueba: number;
    nombre: string;
    puntaje_minimo: number;
  }>;
  examen?: Examen;
  reglasPuntaje?: ReglaPuntaje[];
  reglas_count?: number; // Conteo de reglas de puntaje configuradas para esta postulación
}

export interface Subprueba {
  idSubprueba: number;
  idExamen: number;
  nombre: string;
  puntaje_por_pregunta: number;
  duracion_minutos?: number;
  orden?: number;
  reglasPuntaje?: ReglaPuntaje[];
  preguntas_count?: number; // Conteo de preguntas asignadas a esta subprueba
}

export interface ReglaPuntaje {
  idRegla: number;
  idPostulacion: number;
  idSubprueba: number;
  puntaje_correcto: number;
  puntaje_incorrecto: number;
  puntaje_en_blanco: number;
  puntaje_minimo_subprueba: number | null;
  postulacion?: Postulacion;
  subprueba?: Subprueba;
}

export interface ResultadoSubprueba {
  idResultado: number;
  idIntento: number;
  idSubprueba: number;
  puntaje_obtenido: number;
  puntaje_minimo_requerido: number;
  puntaje_maximo?: number;
  es_aprobado: boolean;
  subprueba?: Subprueba;
  total_preguntas?: number;
  preguntas_correctas?: number;
}

export interface Tema {
  id: number;
  nombre: string;
}

export interface CreateExamenRequest {
  codigo_examen: string;
  titulo: string;
  idTipoConcurso: number;
  tipo_acceso: 'publico' | 'privado';
  estado: '0' | '1';
  tiempo_limite: number;
  descripcion?: string | null;
  fecha_inicio_vigencia?: string | null;
  fecha_fin_vigencia?: string | null;
  preguntas?: {
    idPregunta: number;
    idSubprueba: number;
    orden: number;
  }[];
  // Usuarios asignados (para examen privado - RF-A.4.6)
  usuarios_asignados?: number[];
}

export interface UpdateExamenRequest extends Partial<Omit<CreateExamenRequest, 'preguntas' | 'usuarios_asignados'>> {
  // Todos los campos son opcionales excepto preguntas y usuarios_asignados que se mantienen opcionales
  preguntas?: CreateExamenRequest['preguntas'];
  usuarios_asignados?: CreateExamenRequest['usuarios_asignados'];
}

export interface ExamenFilters {
  search?: string;
  estado?: '0' | '1';
  idTipoConcurso?: number;
  tipo_acceso?: 'publico' | 'privado';
  per_page?: number;
  page?: number;
}

export interface PaginatedExamenes {
  data: Examen[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface EstadisticasExamen {
  total_intentos: number;
  intentos_finalizados: number;
  intentos_en_progreso: number;
  intentos_abandonados?: number;
  promedio_puntaje: number;
  puntaje_maximo: number;
  puntaje_minimo: number;
  total_correctas?: number;
  total_incorrectas?: number;
}

export interface EstadisticasGenerales {
  total_examenes: number;
  examenes_borrador: number;
  examenes_publicados: number;
  examenes_archivados: number;
  examenes_activos: number;
  total_intentos: number;
  intentos_finalizados: number;
  promedio_puntaje_global: number;
}

// Enums para mejor tipado
export enum EstadoExamen {
  BORRADOR = '0',
  PUBLICADO = '1',
  ARCHIVADO = '2'
}

export enum TipoExamen {
  TIPO_0 = '0',
  TIPO_1 = '1',
  TIPO_2 = '2',
  TIPO_3 = '3'
}

// Tipos para datos específicos de cada paso del wizard
export interface DatosPaso1 {
  idExamen: number;
  codigo_examen?: string | null;
  titulo: string;
  descripcion?: string | null;
  idTipoConcurso: number;
  tiempo_limite: number;
  tipo_acceso: 'publico' | 'privado';
  estado: '0' | '1' | '2';
  tipoConcurso?: {
    idTipoConcurso: number;
    nombre: string;
  };
  // Campos adicionales del ExamenResource
  [key: string]: unknown;
}

export interface DatosPaso2 {
  idExamen: number;
  subpruebas: Array<{
    idSubprueba: number;
    nombre: string;
    puntaje_por_pregunta: number;
    duracion_minutos?: number;
    orden?: number;
  }>;
}

export interface DatosPaso3 {
  idExamen: number;
  postulaciones: Array<{
    idPostulacion: number;
    nombre: string;
    descripcion?: string | null;
    tipo_aprobacion: '0' | '1';
  }>;
}

export interface DatosPaso4 {
  idExamen: number;
  postulaciones: Array<{
    idPostulacion: number;
    nombre: string;
    descripcion?: string | null;
    tipo_aprobacion: '0' | '1';
    reglasPuntaje: Array<{
      idRegla: number;
      idSubprueba: number;
      puntaje_correcto: number;
      puntaje_incorrecto: number;
      puntaje_en_blanco: number;
      puntaje_minimo_subprueba: number | null;
      subprueba: {
        idSubprueba: number;
        nombre: string;
      } | null;
    }>;
  }>;
  subpruebas: Array<{
    idSubprueba: number;
    nombre: string;
  }>;
}

export interface DatosPaso5 {
  examen: Examen;
  subpruebas: Subprueba[];
  preguntas_por_subprueba: Record<number, Array<{
    idPregunta: number;
    codigo: string;
    enunciado: string;
    categoria: {
      idCategoria: number;
      nombre: string;
    } | null;
    contexto: {
      idContexto: number;
      titulo: string;
    } | null;
    opciones: Array<{
      idOpcion: number;
      contenido: string;
      es_correcta: boolean;
    }>;
    orden: number;
  }>>;
  preguntas_disponibles: Array<{
    idPregunta: number;
    codigo: string;
    enunciado: string;
    ano?: number;
    categoria: {
      idCategoria: number;
      nombre: string;
    } | null;
    contexto: {
      idContexto: number;
      titulo: string;
    } | null;
    opciones: Array<{
      idOpcion: number;
      contenido: string;
      es_correcta: boolean;
    }>;
  }>;
}

export interface DatosPaso6 {
  idExamen: number;
  fecha_inicio_vigencia: string | null;
  fecha_fin_vigencia: string | null;
  tipo_acceso: 'publico' | 'privado';
  usuariosAsignados: Array<{
    idUsuario: number;
    nombre: string | null;
    apellidos: string | null;
  }>;
}

// Tipo unión para todos los datos de pasos
export type DatosPasoWizard =
  | DatosPaso1
  | DatosPaso2
  | DatosPaso3
  | DatosPaso4
  | DatosPaso5
  | DatosPaso6;
