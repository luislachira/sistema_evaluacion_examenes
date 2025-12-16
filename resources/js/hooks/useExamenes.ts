import { useState, useEffect, useCallback, useRef } from 'react';
import { examenesService } from '../services/examenesService';
import { useAuth } from './useAuth';
import type {
  Examen,
  CreateExamenRequest,
  UpdateExamenRequest,
  ExamenFilters,
  PaginatedExamenes,
  Tema
} from '../types/examenes';

interface UseExamenesResult {
  // Estado
  examenes: Examen[];
  paginacion: PaginatedExamenes | null;
  categorias: Tema[];
  docentes: never[];
  loading: boolean;
  error: string | null;

  // Métodos CRUD
  getExamenes: (filters?: ExamenFilters) => Promise<void>;
  createExamen: (data: CreateExamenRequest) => Promise<boolean>;
  updateExamen: (id: number, data: UpdateExamenRequest) => Promise<boolean>;
  deleteExamen: (id: number) => Promise<boolean>;
  getExamen: (id: number) => Promise<Examen | null>;

  // Métodos auxiliares
  getCategorias: () => Promise<void>;
  getDocentes: () => Promise<void>;
  generarPreguntas: () => Promise<boolean>;
  duplicarExamen: (id: number) => Promise<boolean>;
  cambiarEstado: (id: number, estado: '0' | '1' | '2') => Promise<boolean>;

  // Utilidades
  clearError: () => void;
  refresh: () => Promise<void>;
}

export const useExamenes = (): UseExamenesResult => {
  const { isAuthenticated, token } = useAuth();
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [paginacion, setPaginacion] = useState<PaginatedExamenes | null>(null);
  const [categorias, setCategorias] = useState<Tema[]>([]);
  const [docentes] = useState<never[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<ExamenFilters>({});

  // Refs para evitar llamadas duplicadas en React StrictMode
  const categoriasCargadasRef = useRef(false);
  const categoriasCargandoRef = useRef(false);

  const handleError = useCallback((err: unknown) => {

    if (err instanceof Error) {
      setError(err.message);
    } else if (typeof err === 'object' && err !== null && 'response' in err) {
      const axiosError = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      if (axiosError.response?.data?.message) {
        setError(axiosError.response.data.message);
      } else if (axiosError.response?.data?.errors) {
        const errors = Object.values(axiosError.response.data.errors).flat();
        setError(Array.isArray(errors) ? errors.join(', ') : String(errors));
      } else {
        setError('Error de conexión con el servidor');
      }
    } else {
      setError('Ha ocurrido un error inesperado');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getExamenes = useCallback(async (filters: ExamenFilters = {}) => {
    if (!isAuthenticated || !token) {
      return;
    }

    // Pequeño delay para asegurar que el token esté disponible
    await new Promise(resolve => setTimeout(resolve, 50));

    setLoading(true);
    setError(null);

    try {
      const result = await examenesService.admin.getExamenes(filters);

      setExamenes(result.data);
      setPaginacion(result);
      setCurrentFilters(filters);
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, handleError]);

  const getCategorias = useCallback(async () => {
    if (!isAuthenticated || !token) {
      return;
    }

    // Pequeño delay para asegurar que el token esté disponible
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const result = await examenesService.admin.getCreateData();
      setCategorias(result.categorias || []);
    } catch (err: unknown) {
      handleError(err);
    }
  }, [isAuthenticated, token, handleError]);

  const getDocentes = useCallback(async () => {
    // Método obsoleto - mantenido por compatibilidad
  }, []);

  const createExamen = useCallback(async (data: CreateExamenRequest): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await examenesService.admin.createExamen(data);

      // Refrescar la lista después de crear
      await getExamenes(currentFilters);

      return true;
    } catch (err: unknown) {
      handleError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getExamenes, currentFilters, handleError]);

  const updateExamen = useCallback(async (id: number, data: UpdateExamenRequest): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await examenesService.admin.updateExamen(id, data);

      // Refrescar la lista después de actualizar
      await getExamenes(currentFilters);

      return true;
    } catch (err: unknown) {
      handleError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getExamenes, currentFilters, handleError]);

  const deleteExamen = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await examenesService.admin.deleteExamen(id);

      // Refrescar la lista después de eliminar
      await getExamenes(currentFilters);

      return true;
    } catch (err: unknown) {
      handleError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getExamenes, currentFilters, handleError]);

  const getExamen = useCallback(async (id: number): Promise<Examen | null> => {
    if (!id || isNaN(id)) {
      setError('ID de examen inválido');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await examenesService.admin.getExamen(id);
      return result.data;
    } catch (err: unknown) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const generarPreguntas = useCallback(async (): Promise<boolean> => {
    // Método obsoleto - usar el modal directamente
    return false;
  }, []);

  const duplicarExamen = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await examenesService.admin.duplicarExamen(id);

      // Refrescar la lista después de duplicar
      await getExamenes(currentFilters);

      return true;
    } catch (err: unknown) {
      handleError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getExamenes, currentFilters, handleError]);

  const cambiarEstado = useCallback(async (id: number, estado: '0' | '1' | '2'): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await examenesService.admin.cambiarEstado(id, estado);

      // Refrescar la lista después de cambiar el estado
      await getExamenes(currentFilters);

      return true;
    } catch (err: unknown) {
      handleError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getExamenes, currentFilters, handleError]);

  const refresh = useCallback(async () => {
    await getExamenes(currentFilters);
  }, [getExamenes, currentFilters]);

  // Cargar categorías al montar el hook (solo una vez)
  useEffect(() => {
    if (isAuthenticated && token && !categoriasCargadasRef.current && !categoriasCargandoRef.current && categorias.length === 0) {
      categoriasCargandoRef.current = true;
      getCategorias().finally(() => {
        categoriasCargadasRef.current = true;
        categoriasCargandoRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]); // getCategorias intencionalmente omitido para evitar loops

  return {
    // Estado
    examenes,
    paginacion,
    categorias,
    docentes,
    loading,
    error,

    // Métodos CRUD
    getExamenes,
    createExamen,
    updateExamen,
    deleteExamen,
    getExamen,

    // Métodos auxiliares
    getCategorias,
    getDocentes,
    generarPreguntas,
    duplicarExamen,
    cambiarEstado,

    // Utilidades
    clearError,
    refresh
  };
};

// Hook específico para la toma de exámenes (docentes)
interface UseTomaExamenResult {
  // Estado del examen en curso
  examenActivo: Examen | null;
  resultadoId: number | null;
  tiempoRestante: number;
  horaFin: string | null; // RF-D.2.2: Hora de finalización del servidor
  preguntaActual: number;
  respuestas: { [preguntaId: string]: number[] };

  // Estado general
  loading: boolean;
  error: string | null;
  conexionPerdida: boolean;
  respuestasPendientes: { [preguntaId: string]: number[] };
  preguntasDisponibles: number[];
  preguntaActualPermitida: number;

  // Métodos
  iniciarExamen: (id: number, idPostulacion: number) => Promise<boolean>;
  cargarIntento: (id: number) => Promise<boolean>;
  guardarRespuesta: (preguntaId: string, opciones: number[]) => Promise<boolean>;
  finalizarExamen: () => Promise<boolean>;
  siguientePregunta: () => Promise<void>;
  preguntaAnterior: () => Promise<void>;
  irAPregunta: (index: number) => Promise<void>;

  // Utilidades
  clearError: () => void;
  salirExamen: () => void;
  sincronizarRespuestasPendientes: () => Promise<void>;
}

export const useTomaExamen = (): UseTomaExamenResult => {
  const [examenActivo, setExamenActivo] = useState<Examen | null>(null);
  const [resultadoId, setResultadoId] = useState<number | null>(null);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [horaFin, setHoraFin] = useState<string | null>(null); // RF-D.2.2: Hora de finalización del servidor
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [respuestas, setRespuestas] = useState<{ [preguntaId: string]: number[] }>({});
  const [respuestasPendientes, setRespuestasPendientes] = useState<{ [preguntaId: string]: number[] }>({});
  const [preguntasDisponibles, setPreguntasDisponibles] = useState<number[]>([]);
  const [preguntaActualPermitida, setPreguntaActualPermitida] = useState<number>(0);
  const [conexionPerdida, setConexionPerdida] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const handleError = useCallback((err: unknown) => {

    if (err instanceof Error) {
      setError(err.message);
    } else if (typeof err === 'object' && err !== null && 'response' in err) {
      const axiosError = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      if (axiosError.response?.data?.message) {
        setError(axiosError.response.data.message);
      } else {
        setError('Error de conexión con el servidor');
      }
    } else {
      setError('Ha ocurrido un error inesperado');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // RF-D.2.2: Timer countdown - Calcular diferencia entre new Date() (hora local) y hora_fin recibida del servidor
  useEffect(() => {
    if (horaFin && resultadoId) {
      const id = setInterval(() => {
        const ahora = new Date();
        const fin = new Date(horaFin);

        // Validar que la fecha sea válida
        if (isNaN(fin.getTime())) {
          setTiempoRestante(0);
          return;
        }

        const diferencia = Math.max(0, Math.floor((fin.getTime() - ahora.getTime()) / 1000));

        // Validar que la diferencia sea un número válido
        if (isNaN(diferencia) || !isFinite(diferencia)) {
          setTiempoRestante(0);
          return;
        }

        setTiempoRestante(diferencia);

        if (diferencia <= 0) {
          // Tiempo agotado, finalizar automáticamente
          finalizarExamen();
        }
      }, 1000);

      setIntervalId(id);
      return () => clearInterval(id);
    } else {
      // Si no hay horaFin o resultadoId, establecer tiempo restante a 0
      setTiempoRestante(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horaFin, resultadoId]); // finalizarExamen intencionalmente omitido para evitar loops

  const iniciarExamen = useCallback(async (id: number, idPostulacion: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await examenesService.docente.iniciarExamen(id, idPostulacion);

      setExamenActivo(result.examen);
      setResultadoId(result.resultado_id);
      setHoraFin(result.hora_fin); // RF-D.2.2: Guardar hora_fin del servidor
      // Calcular tiempo restante inicial
      if (result.hora_fin) {
        const ahora = new Date();
        const fin = new Date(result.hora_fin);

        // Validar que la fecha sea válida
        if (!isNaN(fin.getTime())) {
          const diferencia = Math.max(0, Math.floor((fin.getTime() - ahora.getTime()) / 1000));
          // Validar que la diferencia sea un número válido
          if (!isNaN(diferencia) && isFinite(diferencia)) {
            setTiempoRestante(diferencia);
          } else {
            setTiempoRestante(0);
          }
        } else {
          setTiempoRestante(0);
        }
      } else {
        setTiempoRestante(0);
      }

      // Usar la última pregunta vista si está disponible, de lo contrario usar la pregunta actual permitida
      const preguntaInicial = result.ultima_pregunta_vista !== undefined
        ? result.ultima_pregunta_vista
        : (result.pregunta_actual_permitida ?? 0);

      // Cargar respuestas guardadas del intento PRIMERO
      if (result.respuestas_guardadas) {
        setRespuestas(result.respuestas_guardadas);
      } else {
        setRespuestas({});
      }

      // Establecer preguntas disponibles y pregunta actual permitida
      if (result.preguntas_disponibles) {
        setPreguntasDisponibles(result.preguntas_disponibles);
      }
      if (result.pregunta_actual_permitida !== undefined) {
        setPreguntaActualPermitida(result.pregunta_actual_permitida);
      }

      // Establecer pregunta actual DESPUÉS de cargar las respuestas
      setPreguntaActual(preguntaInicial);

      return true;
    } catch (err: unknown) {
      handleError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // RF-D.2.2: Cargar intento existente en curso
  const cargarIntento = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await examenesService.docente.cargarIntento(id);

      // Si el examen ya fue finalizado, retornar false sin establecer error
      // El componente se encargará de redirigir
      if (result && 'ya_finalizado' in result && result.ya_finalizado) {
        setLoading(false);
        return false;
      }

      if (!result || !result.examen) {
        setLoading(false);
        return false;
      }

      setExamenActivo(result.examen);
      setResultadoId(result.resultado_id ?? null);
      setHoraFin(result.hora_fin ?? null); // RF-D.2.2: Guardar hora_fin del servidor
      // Calcular tiempo restante inicial
      if (result.hora_fin) {
        const ahora = new Date();
        const fin = new Date(result.hora_fin);

        // Validar que la fecha sea válida
        if (!isNaN(fin.getTime())) {
          const diferencia = Math.max(0, Math.floor((fin.getTime() - ahora.getTime()) / 1000));
          // Validar que la diferencia sea un número válido
          if (!isNaN(diferencia) && isFinite(diferencia)) {
            setTiempoRestante(diferencia);
          } else {
            setTiempoRestante(0);
          }
        } else {
          setTiempoRestante(0);
        }
      } else {
        setTiempoRestante(0);
      }

      // Usar la última pregunta vista si está disponible, de lo contrario usar la pregunta actual permitida
      const preguntaInicial = result.ultima_pregunta_vista !== undefined
        ? result.ultima_pregunta_vista
        : (result.pregunta_actual_permitida ?? 0);

      // Cargar respuestas guardadas del intento PRIMERO
      if (result.respuestas_guardadas) {
        setRespuestas(result.respuestas_guardadas);
      } else {
        setRespuestas({});
      }

      // Establecer preguntas disponibles y pregunta actual permitida
      if (result.preguntas_disponibles) {
        setPreguntasDisponibles(result.preguntas_disponibles);
      }
      if (result.pregunta_actual_permitida !== undefined) {
        setPreguntaActualPermitida(result.pregunta_actual_permitida);
      }

      // Establecer pregunta actual DESPUÉS de cargar las respuestas
      setPreguntaActual(preguntaInicial);

      return true;
    } catch (err: unknown) {
      // Si el error es porque ya finalizó el examen, retornar false sin establecer error
      // El componente se encargará de redirigir
      if (err && typeof err === 'object' && 'response' in err &&
          err.response && typeof err.response === 'object' && 'data' in err.response &&
          err.response.data && typeof err.response.data === 'object' && 'ya_finalizado' in err.response.data) {
        setLoading(false);
        return false;
      }

      handleError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const guardarRespuesta = useCallback(async (preguntaId: string, opciones: number[]): Promise<boolean> => {
    if (!resultadoId) return false;

    // Actualizar respuestas localmente inmediatamente (optimistic update)
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: opciones
    }));

    // Guardar en localStorage como backup
    try {
      const storageKey = `examen_respuestas_${resultadoId}`;
      const respuestasGuardadas = JSON.parse(localStorage.getItem(storageKey) || '{}');
      respuestasGuardadas[preguntaId] = opciones;
      localStorage.setItem(storageKey, JSON.stringify(respuestasGuardadas));
    } catch {
      // Ignorar errores de localStorage
    }

    // Intentar guardar en el servidor
    try {
      await examenesService.docente.guardarRespuesta(resultadoId, preguntaId, opciones);

      // Si tiene éxito, eliminar de pendientes
      setRespuestasPendientes(prev => {
        const nuevas = { ...prev };
        delete nuevas[preguntaId];
        return nuevas;
      });
      setConexionPerdida(false);

      // Actualizar preguntas disponibles después de guardar
      if (examenActivo && resultadoId) {
        try {
          const preguntaIndex = examenActivo.preguntas?.findIndex(p =>
            String(p.idPregunta || p.id) === preguntaId
          ) ?? -1;

          if (preguntaIndex >= 0) {
            const validacion = await examenesService.docente.validarNavegacion(resultadoId, preguntaIndex);
            setPreguntasDisponibles(validacion.preguntas_disponibles);
            setPreguntaActualPermitida(validacion.pregunta_actual_permitida);
          }
        } catch {
          // Ignorar errores en la actualización de navegación
        }
      }

      return true;
    } catch (err: unknown) {
      // Verificar si el error es porque el examen fue finalizado
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { message?: string; tiempo_expirado?: boolean } } };
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;
        
        // Si el examen fue finalizado (422 con tiempo_expirado o mensaje específico)
        if (status === 422 && (data?.tiempo_expirado || data?.message?.includes('finalizado'))) {
          // El examen fue finalizado, retornar false para que el componente pueda redirigir
          return false;
        }
      }
      
      // Error de conexión: guardar en pendientes para sincronizar después
      setRespuestasPendientes(prev => ({
        ...prev,
        [preguntaId]: opciones
      }));
      setConexionPerdida(true);

      // No mostrar error al usuario para no interrumpir el examen

      return true; // Retornar true para que el usuario pueda continuar
    }
  }, [resultadoId, examenActivo]);

  const finalizarExamen = useCallback(async (): Promise<boolean> => {
    if (!resultadoId) return false;

    setLoading(true);

    try {
      await examenesService.docente.finalizarExamen(resultadoId);

      // Limpiar estado
      if (intervalId) clearInterval(intervalId);
      setExamenActivo(null);
      setResultadoId(null);
      setTiempoRestante(0);
      setPreguntaActual(0);
      setRespuestas({});

      return true;
    } catch (err: unknown) {
      handleError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [resultadoId, intervalId, handleError]);

  const siguientePregunta = useCallback(async () => {
    if (!examenActivo || !resultadoId) return;

    const totalPreguntas = examenActivo.preguntas?.length || 0;
    const siguienteIndice = preguntaActual + 1;

    if (siguienteIndice >= totalPreguntas) return;

    // Validar con el backend antes de navegar
    try {
      const validacion = await examenesService.docente.validarNavegacion(resultadoId, siguienteIndice);
      if (validacion.permitido) {
        setPreguntaActual(siguienteIndice);
        setPreguntasDisponibles(validacion.preguntas_disponibles);
        setPreguntaActualPermitida(validacion.pregunta_actual_permitida);
        setError(null); // Limpiar error si la navegación fue exitosa
      } else {
        setError(validacion.mensaje);
      }
    } catch (err: unknown) {
      handleError(err);
    }
  }, [examenActivo, preguntaActual, resultadoId, handleError]);

  const preguntaAnterior = useCallback(async () => {
    if (!examenActivo || !resultadoId || preguntaActual <= 0) return;

    const anteriorIndice = preguntaActual - 1;

    // Validar con el backend antes de navegar
    try {
      const validacion = await examenesService.docente.validarNavegacion(resultadoId, anteriorIndice);
      if (validacion.permitido) {
        setPreguntaActual(anteriorIndice);
        setPreguntasDisponibles(validacion.preguntas_disponibles);
        setPreguntaActualPermitida(validacion.pregunta_actual_permitida);
        setError(null); // Limpiar error si la navegación fue exitosa
      } else {
        // Si no está permitido, intentar navegar de todas formas si la pregunta anterior tiene respuesta
        const preguntaAnterior = examenActivo.preguntas?.[anteriorIndice];
        if (preguntaAnterior) {
          const preguntaAnteriorId = preguntaAnterior.idPregunta || preguntaAnterior.id;
          const tieneRespuesta = respuestas[String(preguntaAnteriorId)]?.length > 0;
          if (tieneRespuesta) {
            // Permitir retroceder a preguntas respondidas
            setPreguntaActual(anteriorIndice);
            setError(null);
          } else {
            setError(validacion.mensaje);
          }
        } else {
          setError(validacion.mensaje);
        }
      }
    } catch (err: unknown) {
      handleError(err);
    }
  }, [examenActivo, preguntaActual, resultadoId, respuestas, handleError]);

  const irAPregunta = useCallback(async (index: number) => {
    if (!examenActivo || !resultadoId) return;

    const totalPreguntas = examenActivo.preguntas?.length || 0;
    if (index < 0 || index >= totalPreguntas) return;

    // Validar con el backend antes de navegar
    try {
      const validacion = await examenesService.docente.validarNavegacion(resultadoId, index);
      if (validacion.permitido) {
        setPreguntaActual(index);
        setPreguntasDisponibles(validacion.preguntas_disponibles);
        setPreguntaActualPermitida(validacion.pregunta_actual_permitida);
        setError(null); // Limpiar error si la navegación fue exitosa
      } else {
        // Si no está permitido, verificar si la pregunta tiene respuesta guardada
        const pregunta = examenActivo.preguntas?.[index];
        if (pregunta) {
          const preguntaId = pregunta.idPregunta || pregunta.id;
          const tieneRespuesta = respuestas[String(preguntaId)]?.length > 0;
          if (tieneRespuesta) {
            // Permitir navegar a preguntas respondidas aunque no estén en la lista de disponibles
            setPreguntaActual(index);
            setError(null);
          } else {
            setError(validacion.mensaje);
          }
        } else {
          setError(validacion.mensaje);
        }
      }
    } catch (err: unknown) {
      handleError(err);
    }
  }, [examenActivo, resultadoId, respuestas, handleError]);

  const salirExamen = useCallback(() => {
    if (intervalId) clearInterval(intervalId);
    setExamenActivo(null);
    setResultadoId(null);
    setTiempoRestante(0);
    setPreguntaActual(0);
    setRespuestas({});
    setRespuestasPendientes({});
    setConexionPerdida(false);
  }, [intervalId]);

  // Sincronizar respuestas pendientes cuando se recupere la conexión
  const sincronizarRespuestasPendientes = useCallback(async (): Promise<void> => {
    if (!resultadoId) return;

    // Usar una función para obtener el estado actual
    setRespuestasPendientes(current => {
      const pendientes = { ...current };
      if (Object.keys(pendientes).length === 0) return pendientes;

      // Sincronizar cada respuesta pendiente
      Object.entries(pendientes).forEach(async ([preguntaId, opciones]) => {
        try {
          await examenesService.docente.guardarRespuesta(resultadoId, preguntaId, opciones);
          setRespuestasPendientes(prev => {
            const nuevas = { ...prev };
            delete nuevas[preguntaId];
            return nuevas;
          });
        } catch {
          // Ignorar errores al sincronizar respuestas pendientes
        }
      });

      return pendientes;
    });

    // Verificar si quedan pendientes después de un breve delay
    setTimeout(() => {
      setRespuestasPendientes(current => {
        if (Object.keys(current).length === 0) {
          setConexionPerdida(false);
        }
        return current;
      });
    }, 500);
  }, [resultadoId]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervalId]);

  return {
    // Estado del examen en curso
    examenActivo,
    resultadoId,
    tiempoRestante,
    horaFin, // RF-D.2.2: Hora de finalización del servidor
    preguntaActual,
    respuestas,

    // Estado general
    loading,
    error,
    conexionPerdida,
    respuestasPendientes,
    preguntasDisponibles,
    preguntaActualPermitida,

    // Métodos
    iniciarExamen,
    cargarIntento,
    guardarRespuesta,
    finalizarExamen,
    siguientePregunta,
    preguntaAnterior,
    irAPregunta,

    // Utilidades
    clearError,
    salirExamen,
    sincronizarRespuestasPendientes
  };
};
