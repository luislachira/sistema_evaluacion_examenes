import clienteApi from '../api/clienteApi';
import type {
  Examen,
  CreateExamenRequest,
  UpdateExamenRequest,
  ExamenFilters,
  PaginatedExamenes,
  DatosPaso1,
  DatosPaso2,
  DatosPaso3,
  DatosPaso4,
  DatosPaso5,
  DatosPaso6
} from '../types/examenes';

export const examenesService = {
  // Endpoints para administradores
  admin: {
    /**
     * Obtener lista paginada de exámenes
     */
    getExamenes: async (filters: ExamenFilters = {}): Promise<PaginatedExamenes> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.estado) params.append('estado', filters.estado);
      if (filters.idTipoConcurso) params.append('idTipoConcurso', filters.idTipoConcurso.toString());
      if (filters.tipo_acceso) params.append('tipo_acceso', filters.tipo_acceso);
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.page) params.append('page', filters.page.toString());

      const response = await clienteApi.get(`/admin/examenes?${params.toString()}`);

      // Mapear idExamen a id para compatibilidad con el frontend
      if (response.data && response.data.data) {
        response.data.data = response.data.data.map((examen: Examen) => ({
          ...examen,
          id: examen.idExamen || examen.id
        }));
      }

      return response.data;
    },

    /**
     * Obtener datos para crear un nuevo examen
     * Retorna: { categorias: Array<{id: number, nombre: string}>, tipo_concursos: Array<{id: number, nombre: string}> }
     */
    getCreateData: async (): Promise<{ categorias: Array<{id: number; nombre: string}>; tipo_concursos: Array<{id: number; nombre: string}> }> => {
      const response = await clienteApi.get(`/admin/examenes/create`);
      return response.data;
    },

    /**
     * Crear un nuevo examen básico (para iniciar el wizard)
     * Crea un examen con valores mínimos y retorna el ID para redirigir al wizard
     */
    createExamenBasico: async (): Promise<{ data: Examen }> => {
      // Generar código único temporal
      const timestamp = Date.now();
      const codigoTemporal = `EXAM-${timestamp}`;

      // Obtener el primer tipo de concurso disponible como valor por defecto
      const createData = await clienteApi.get(`/admin/examenes/create`);
      const tipoConcursos = createData.data.tipo_concursos || [];
      // El backend puede devolver 'id' o 'idTipoConcurso', verificar ambos
      const primerTipoConcurso = tipoConcursos.length > 0
        ? (tipoConcursos[0].idTipoConcurso || tipoConcursos[0].id || null)
        : null;

      if (!primerTipoConcurso) {
        throw new Error('No hay tipos de concurso disponibles. Debe crear al menos uno antes de crear un examen.');
      }

      const dataBasico: CreateExamenRequest = {
        codigo_examen: codigoTemporal,
        titulo: '', // Vacío para forzar completar el Paso 1
        idTipoConcurso: primerTipoConcurso,
        descripcion: '', // Vacío para forzar completar el Paso 1
        tipo_acceso: 'publico',
        estado: '0', // Siempre Borrador
        tiempo_limite: 270, // Valor por defecto
        // Las fechas se configuran en el Paso 6
      };

      const response = await clienteApi.post(`/admin/examenes`, dataBasico);
      return response.data;
    },

    /**
     * Crear un nuevo examen
     */
    createExamen: async (data: CreateExamenRequest): Promise<{ message?: string; data: Examen }> => {
      const response = await clienteApi.post(`/admin/examenes`, data);
      return response.data;
    },

    /**
     * Obtener un examen específico
     */
    getExamen: async (id: number): Promise<{ data: Examen }> => {
      if (!id || isNaN(Number(id)) || Number(id) <= 0) {
        throw new Error(`ID de examen inválido: ${id}`);
      }
      const response = await clienteApi.get(`/admin/examenes/${id}`);
      return response.data;
    },

    /**
     * Obtener datos para editar un examen
     * Retorna: { data: Examen, categorias: Array<{id: number, nombre: string}>, tipo_concursos: Array<{id: number, nombre: string}> }
     */
    getEditData: async (id: number): Promise<{ data: Examen; categorias: Array<{id: number; nombre: string}>; tipo_concursos: Array<{id: number; nombre: string}> }> => {
      if (!id || isNaN(Number(id)) || Number(id) <= 0) {
        throw new Error(`ID de examen inválido para edición: ${id}`);
      }
      const response = await clienteApi.get(`/admin/examenes/${id}/edit`);
      return response.data;
    },

    /**
     * Actualizar un examen existente
     */
    updateExamen: async (id: number, data: UpdateExamenRequest): Promise<{ message?: string; data: Examen }> => {
      if (!id || isNaN(Number(id)) || Number(id) <= 0) {
        throw new Error(`ID de examen inválido para actualización: ${id}`);
      }
      const response = await clienteApi.put(`/admin/examenes/${id}`, data);
      return response.data;
    },

    /**
     * Eliminar un examen
     */
    deleteExamen: async (id: number): Promise<{ message?: string }> => {
      if (!id || isNaN(Number(id)) || Number(id) <= 0) {
        throw new Error(`ID de examen inválido para eliminación: ${id}`);
      }
      const response = await clienteApi.delete(`/admin/examenes/${id}`);
      return response.data;
    },

    /**
     * Duplicar un examen existente
     */
    duplicarExamen: async (id: number): Promise<{ message: string; data: Examen }> => {
      if (!id || isNaN(Number(id)) || Number(id) <= 0) {
        throw new Error(`ID de examen inválido para duplicación: ${id}`);
      }
      const response = await clienteApi.post(`/admin/examenes/${id}/duplicar`);
      return response.data;
    },

    /**
     * Cambiar estado de un examen (borrador/publicado/archivado)
     */
    cambiarEstado: async (id: number, estado: '0' | '1' | '2'): Promise<{ message: string; data: Examen }> => {
      if (!id || isNaN(Number(id)) || Number(id) <= 0) {
        throw new Error(`ID de examen inválido para cambio de estado: ${id}`);
      }
      const response = await clienteApi.patch(`/admin/examenes/${id}/estado`, { estado });
      return response.data;
    },

    /**
     * Obtener datos específicos de un paso del wizard
     * Paso 5 devuelve directamente el objeto, los demás devuelven { data: ... }
     */
    getDatosPaso: async (id: number, paso: number): Promise<{ data: DatosPaso1 | DatosPaso2 | DatosPaso3 | DatosPaso4 | DatosPaso6 } | DatosPaso5> => {
      const response = await clienteApi.get(`/admin/examenes/${id}/wizard/paso/${paso}`);
      return response.data;
    },

    /**
     * Obtener el estado del wizard para un examen
     */
    getEstadoWizard: async (id: number): Promise<{
      examen_id: number;
      completitud: number;
      paso_actual: number;
      estado_pasos: {
        paso1: boolean;
        paso2: boolean;
        paso3: boolean;
        paso4: boolean;
        paso5: boolean;
        paso6: boolean;
      };
      siguiente_paso: number | null;
      puede_publicar: boolean;
      estado: string;
    }> => {
      const response = await clienteApi.get(`/admin/examenes/${id}/wizard/estado`);
      return response.data;
    },

    /**
     * Validar si se puede acceder a un paso específico
     */
    validarAccesoPaso: async (id: number, paso: number): Promise<{
      puede_acceder: boolean;
      mensaje?: string;
      pasos_incompletos?: number[];
    }> => {
      const response = await clienteApi.post(`/admin/examenes/${id}/wizard/validar-paso`, { paso });
      return response.data;
    },

    /**
     * Actualizar el paso actual del examen
     */
    actualizarPaso: async (id: number, paso: number): Promise<{
      message: string;
      paso_actual: number;
      completitud: number;
    }> => {
      const response = await clienteApi.post(`/admin/examenes/${id}/wizard/actualizar-paso`, { paso });
      return response.data;
    },

    /**
     * RF-A.4.1: Obtener subpruebas de un examen
     */
    getSubpruebas: async (examenId: number): Promise<import('../types/examenes').Subprueba[]> => {
      const response = await clienteApi.get(`/admin/examenes/${examenId}/subpruebas`);
      return response.data;
    },

    createSubprueba: async (examenId: number, data: { nombre: string; orden: number; puntaje_por_pregunta?: number; duracion_minutos?: number }): Promise<import('../types/examenes').Subprueba> => {
      const response = await clienteApi.post(`/admin/examenes/${examenId}/subpruebas`, {
        nombre: data.nombre,
        orden: data.orden,
        puntaje_por_pregunta: data.puntaje_por_pregunta || 0,
        duracion_minutos: data.duracion_minutos || 0
      });
      return response.data;
    },

    updateSubprueba: async (id: number, data: { nombre: string; orden: number; puntaje_por_pregunta?: number; duracion_minutos?: number }): Promise<import('../types/examenes').Subprueba> => {
      const response = await clienteApi.put(`/admin/subpruebas/${id}`, {
        nombre: data.nombre,
        orden: data.orden,
        puntaje_por_pregunta: data.puntaje_por_pregunta || 0,
        duracion_minutos: data.duracion_minutos || 0
      });
      return response.data;
    },

    deleteSubprueba: async (id: number): Promise<void> => {
      await clienteApi.delete(`/admin/subpruebas/${id}`);
    },

    /**
     * RF-A.9: CRUD de Postulaciones
     */
    getPostulaciones: async (examenId: number): Promise<import('../types/examenes').Postulacion[]> => {
      const response = await clienteApi.get(`/admin/examenes/${examenId}/postulaciones`);
      return response.data;
    },

    createPostulacion: async (examenId: number, data: { nombre: string; descripcion?: string }): Promise<import('../types/examenes').Postulacion> => {
      const response = await clienteApi.post(`/admin/examenes/${examenId}/postulaciones`, data);
      return response.data;
    },

    updatePostulacion: async (id: number, data: { nombre: string; descripcion?: string }): Promise<import('../types/examenes').Postulacion> => {
      const response = await clienteApi.put(`/admin/postulaciones/${id}`, data);
      return response.data;
    },

    deletePostulacion: async (id: number): Promise<void> => {
      await clienteApi.delete(`/admin/postulaciones/${id}`);
    },

    /**
     * RF-A.8: CRUD de Reglas de Puntaje (por Postulación)
     */
    getReglasPuntaje: async (postulacionId: number): Promise<import('../types/examenes').ReglaPuntaje[]> => {
      const response = await clienteApi.get(`/admin/postulaciones/${postulacionId}/reglas`);
      return response.data;
    },

    createReglaPuntaje: async (postulacionId: number, data: {
      idSubprueba: number;
      puntaje_correcto: number;
      puntaje_incorrecto: number;
      puntaje_en_blanco: number;
      puntaje_minimo_subprueba: number | null;
    }): Promise<import('../types/examenes').ReglaPuntaje> => {
      const response = await clienteApi.post(`/admin/postulaciones/${postulacionId}/reglas`, data);
      return response.data;
    },

    updateReglaPuntaje: async (id: number, data: {
      puntaje_correcto: number;
      puntaje_incorrecto: number;
      puntaje_en_blanco: number;
      puntaje_minimo_subprueba: number | null;
    }): Promise<import('../types/examenes').ReglaPuntaje> => {
      const response = await clienteApi.put(`/admin/reglas/${id}`, data);
      return response.data;
    },

    deleteReglaPuntaje: async (id: number): Promise<void> => {
      await clienteApi.delete(`/admin/reglas/${id}`);
    },

  },

  // Endpoints para docentes
  docente: {
    /**
     * Obtener exámenes disponibles para el docente
     * Filtra por visibilidad: público o grupo cerrado (si está asignado)
     */
    getExamenesDisponibles: async (page: number = 1, perPage: number = 10): Promise<PaginatedExamenes> => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', perPage.toString());
      const response = await clienteApi.get(`/docente/examenes?${params.toString()}`);

      // El backend devuelve: { data: [...], current_page, last_page, ... }
      // axios ya procesa response.data, así que response.data contiene el objeto completo
      const result = response.data;

      // Si data es un array directo (caso especial), convertir a formato paginado
      if (Array.isArray(result)) {
        return {
          data: result.map((examen: Examen) => ({
            ...examen,
            id: examen.idExamen || examen.id
          })),
          current_page: page,
          last_page: 1,
          per_page: perPage,
          total: result.length,
          from: result.length > 0 ? 1 : 0,
          to: result.length
        };
      }

      // Mapear idExamen a id para compatibilidad con el frontend
      if (result && result.data && Array.isArray(result.data)) {
        result.data = result.data.map((examen: Examen) => ({
          ...examen,
          id: examen.idExamen || examen.id
        }));
      }

      return result;
    },

    /**
     * Obtener detalles de un examen específico
     * Incluye instrucciones completas y toda la información
     */
    getDetalleExamen: async (examenId: number): Promise<Examen> => {
      try {
        const response = await clienteApi.get(`/docente/examenes/${examenId}`, {
          validateStatus: (status) => {
            // Permitir 422 para manejar el caso de examen ya finalizado sin mostrar error en consola
            return status < 500;
          }
        });
        
        // Si es 422 y tiene ya_finalizado, lanzar error especial
        if (response.status === 422 && response.data && typeof response.data === 'object' && 'ya_finalizado' in response.data) {
          const error = new Error('Examen ya finalizado') as Error & { ya_finalizado?: boolean };
          error.ya_finalizado = true;
          throw error;
        }
        
        const examen = response.data.data || response.data;

        // Mapear idExamen a id para compatibilidad con el frontend
        if (examen) {
          return {
            ...examen,
            id: examen.idExamen || examen.id
          };
        }

        return examen;
      } catch (err: unknown) {
        // Si el error es porque ya finalizó el examen, lanzar un error especial
        if (err && typeof err === 'object' && 'response' in err &&
            err.response && typeof err.response === 'object' && 'data' in err.response &&
            err.response.data && typeof err.response.data === 'object' && 'ya_finalizado' in err.response.data) {
          const error = new Error('Examen ya finalizado') as Error & { ya_finalizado?: boolean };
          error.ya_finalizado = true;
          throw error;
        }
        throw err;
      }
    },

    /**
     * Iniciar un nuevo intento de examen
     * RF-D.1.2: Requiere idPostulacion
     */
    iniciarExamen: async (examenId: number, idPostulacion: number, idSubpruebaSeleccionada?: number): Promise<{
      intento: {
        idIntento: number;
        idExamen: number;
        idUsuario: number;
        idPostulacion: number;
        hora_inicio: string;
        hora_fin: string;
        estado: string;
      };
      examen: Examen;
      tiempo_limite: number;
      tiempo_restante: number; // Tiempo restante en segundos
      hora_fin: string; // RF-D.2.1: Hora de finalización del servidor
      resultado_id: number; // Compatibilidad con frontend
      pregunta_actual_permitida: number;
      preguntas_disponibles: number[];
      ultima_pregunta_vista?: number; // Índice de la última pregunta vista
      respuestas_guardadas?: { [preguntaId: string]: number[] }; // Respuestas guardadas del intento
    }> => {
      const response = await clienteApi.post(`/docente/examenes/${examenId}/iniciar`, {
        idPostulacion: idPostulacion,
        ...(idSubpruebaSeleccionada && { idSubpruebaSeleccionada })
      });
      return response.data;
    },

    /**
     * Cargar intento existente en curso
     * RF-D.2.2: Cargar intento ya iniciado
     */
    cargarIntento: async (examenId: number): Promise<{
      intento?: {
        idIntento: number;
        idExamen: number;
        idUsuario: number;
        idPostulacion: number;
        hora_inicio: string;
        hora_fin: string;
        estado: string;
      };
      examen?: Examen;
      tiempo_limite?: number;
      tiempo_restante?: number; // Tiempo restante en segundos
      hora_fin?: string; // RF-D.2.2: Hora de finalización del servidor
      resultado_id?: number;
      pregunta_actual_permitida?: number;
      preguntas_disponibles?: number[];
      ultima_pregunta_vista?: number; // Índice de la última pregunta vista
      respuestas_guardadas?: { [preguntaId: string]: number[] }; // Respuestas guardadas del intento
      tiene_intento?: boolean; // Indicador de si hay un intento en curso
      message?: string; // Mensaje cuando no hay intento
      ya_finalizado?: boolean; // Indicador de que el examen ya fue finalizado
    }> => {
      try {
        const response = await clienteApi.get(`/docente/examenes/${examenId}/intento`, {
          validateStatus: (status) => {
            // No lanzar excepción para 422 si es porque el examen ya fue finalizado
            return status < 500;
          }
        });
        
        // Si es 422 y tiene ya_finalizado, retornar el objeto con la bandera
        if (response.status === 422 && response.data && typeof response.data === 'object' && 'ya_finalizado' in response.data) {
          return { ya_finalizado: true, tiene_intento: false };
        }
        
        return response.data;
      } catch (err: unknown) {
        // Si el error es porque ya finalizó el examen, retornar objeto con la bandera
        if (err && typeof err === 'object' && 'response' in err &&
            err.response && typeof err.response === 'object' && 'data' in err.response &&
            err.response.data && typeof err.response.data === 'object' && 'ya_finalizado' in err.response.data) {
          return { ya_finalizado: true, tiene_intento: false };
        }
        throw err;
      }
    },

    /**
     * Guardar respuesta de una pregunta
     */
    guardarRespuesta: async (
      resultadoId: number,
      preguntaId: string,
      opcionesSeleccionadas: number[]
    ): Promise<void> => {
      // La ruta correcta es /intentos/{intentoExamen}/respuesta según routes/api.php
      await clienteApi.post(`/docente/intentos/${resultadoId}/respuesta`, {
        idPregunta: parseInt(preguntaId, 10), // Convertir a número para que coincida con la validación del backend
        idOpcionSeleccionada: opcionesSeleccionadas.length > 0 ? opcionesSeleccionadas[0] : null
      });
    },

    /**
     * Finalizar examen
     */
    finalizarExamen: async (resultadoId: number): Promise<{
      message: string;
      resultado: {
        puntaje: number;
        puntaje_total: number;
        aprobado: boolean;
        tiempo_usado: string;
        respuestas_correctas: number;
        total_preguntas: number;
      };
      mostrar_resultados: boolean;
    }> => {
      const response = await clienteApi.post(`/docente/intentos/${resultadoId}/finalizar`);
      return response.data;
    },

    /**
     * Obtener navegación de preguntas paginada
     */
    obtenerNavegacionPreguntas: async (
      resultadoId: number,
      page: number = 1,
      perPage: number = 25
    ): Promise<{
      data: Array<{
        id: number;
        numero: number;
        orden: number | null;
        tieneRespuesta: boolean;
        tieneContexto: boolean;
      }>;
      pagination: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }> => {
      const response = await clienteApi.get(`/docente/intentos/${resultadoId}/navegacion`, {
        params: { page, per_page: perPage }
      });
      return response.data;
    },

    /**
     * Validar si puede navegar a una pregunta específica
     */
    validarNavegacion: async (
      resultadoId: number,
      indicePregunta: number
    ): Promise<{
      permitido: boolean;
      pregunta_actual_permitida: number;
      preguntas_disponibles: number[];
      mensaje: string;
    }> => {
      const response = await clienteApi.post(`/docente/intentos/${resultadoId}/validar-navegacion`, {
        indice_pregunta: indicePregunta
      });
      return response.data;
    }
  },

  // Utilidades comunes
  utils: {
    /**
     * Formatear duración en texto legible
     */
    formatearDuracion: (minutos: number): string => {
      if (minutos >= 60) {
        const horas = Math.floor(minutos / 60);
        const minutosRestantes = minutos % 60;

        if (minutosRestantes > 0) {
          return `${horas}h ${minutosRestantes}min`;
        } else {
          return `${horas}h`;
        }
      } else {
        return `${minutos}min`;
      }
    },

    /**
     * Formatear tiempo restante en segundos a formato HH:MM:SS o MM:SS
     */
    formatearTiempoRestante: (segundos: number): string => {
      // Validar que segundos sea un número válido
      if (typeof segundos !== 'number' || isNaN(segundos) || !isFinite(segundos)) {
        return '00:00';
      }

      if (segundos < 0) segundos = 0;

      const horas = Math.floor(segundos / 3600);
      const minutos = Math.floor((segundos % 3600) / 60);
      const segs = Math.floor(segundos % 60);

      if (horas > 0) {
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
      } else {
        return `${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
      }
    },

    /**
     * Obtener estado visual del examen
     * Estados: '0' = Borrador, '1' = Publicado, '2' = Finalizado
     */
    getEstadoVisual: (examen: Examen): {
      texto: string;
      color: 'success' | 'warning' | 'error' | 'info';
      icono: string;
    } => {
      if (examen.estado === '0') {
        return { texto: 'Borrador', color: 'warning', icono: '📝' };
      }

      if (examen.estado === '2') {
        return { texto: 'Finalizado', color: 'info', icono: '🏁' };
      }

      // Estado '1' = Publicado
      return { texto: 'Publicado', color: 'success', icono: '✅' };
    },

    /**
     * Verificar si un examen PARECE estar disponible (solo para UI, NO para validación)
     *
     * ⚠️ IMPORTANTE: Esta función solo se usa para mostrar información en el frontend.
     * El servidor SIEMPRE valida la disponibilidad real cuando el usuario intenta iniciar el examen.
     *
     * @param examen - El examen a verificar
     * @returns true si parece disponible (solo para mostrar en UI), false en caso contrario
     */
    estaDisponible: (examen: Examen): boolean => {
      // Solo verificar estado básico (publicado)
      // NO verificar fechas aquí porque el servidor es la única fuente de verdad
      // El servidor siempre valida cuando el usuario intenta iniciar
      return examen.estado === '1';
    },

  }
};
