import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTomaExamen } from '../../../hooks/useExamenes';
import { examenesService } from '../../../services/examenesService';
import ContenidoHTML from '../../../components/ContenidoHTML';

const TomarExamen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    examenActivo,
    resultadoId,
    tiempoRestante,
    horaFin,
    preguntaActual,
    respuestas,
    loading,
    error,
    conexionPerdida,
    respuestasPendientes,
    preguntasDisponibles,
    cargarIntento,
    guardarRespuesta,
    finalizarExamen,
    siguientePregunta,
    preguntaAnterior,
    irAPregunta,
    clearError,
    salirExamen,
    sincronizarRespuestasPendientes
  } = useTomaExamen();

  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<number[]>([]);
  const [paginaNavegacion, setPaginaNavegacion] = useState(1); // Página actual de la navegación (1-indexed)
  const [navegacionPreguntas, setNavegacionPreguntas] = useState<Array<{
    id: number;
    numero: number;
    orden: number | null;
    tieneRespuesta: boolean;
    tieneContexto: boolean;
  }>>([]);
  const [paginacionNavegacion, setPaginacionNavegacion] = useState<{
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  } | null>(null);
  const [loadingNavegacion, setLoadingNavegacion] = useState(false);

  // RF-D.2.2: Cargar intento existente al montar el componente
  // El examen ya debería estar iniciado desde DetalleExamen
  useEffect(() => {
    if (id && !examenActivo && !loading) {
      cargarIntento(parseInt(id)).catch((err: unknown) => {
        // Si el error es porque ya finalizó el examen, redirigir silenciosamente
        if (err && typeof err === 'object' && 'response' in err &&
            err.response && typeof err.response === 'object' && 'data' in err.response &&
            err.response.data && typeof err.response.data === 'object' && 'ya_finalizado' in err.response.data) {
          navigate('/docente/examenes', { replace: true });
        }
      });
    }
  }, [id, examenActivo, loading, cargarIntento, navigate]);

  // Cargar respuesta guardada al cambiar de pregunta
  useEffect(() => {
    if (examenActivo?.preguntas && preguntaActual < examenActivo.preguntas.length) {
      const pregunta = examenActivo.preguntas[preguntaActual];
      const preguntaId = pregunta?.id || pregunta?.idPregunta;
      if (preguntaId) {
        const respuestaGuardada = respuestas[String(preguntaId)] || [];
        setRespuestaSeleccionada(respuestaGuardada);
      }

    }
  }, [examenActivo, preguntaActual, respuestas]);

  // Sincronizar respuestas pendientes cuando se recupere la conexión
  useEffect(() => {
    if (conexionPerdida && resultadoId) {
      // Intentar sincronizar cada 10 segundos
      const interval = setInterval(() => {
        sincronizarRespuestasPendientes();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [conexionPerdida, resultadoId, sincronizarRespuestasPendientes]);

  // Verificar periódicamente si el examen se finalizó automáticamente
  useEffect(() => {
    if (!id || !resultadoId || !examenActivo) {
      return;
    }

    // Función para verificar y redirigir si el examen está finalizado
    const verificarYRedirigir = async () => {
      try {
        // Verificar el estado del intento/examen
        const result = await examenesService.docente.cargarIntento(parseInt(id));
        
        // Si el examen fue finalizado automáticamente
        if (result && 'ya_finalizado' in result && result.ya_finalizado) {
          // Redirigir a la página de resultados
          navigate(`/docente/intentos/${resultadoId}/resultado`, { replace: true });
          return true;
        } else if (result && result.intento && result.intento.estado === 'enviado') {
          // Si el intento está en estado 'enviado', el examen fue finalizado
          navigate(`/docente/intentos/${resultadoId}/resultado`, { replace: true });
          return true;
        }
        return false;
      } catch (err) {
        // Ignorar errores silenciosamente para no interrumpir al usuario
        // Solo registrar en consola en desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.debug('Error al verificar estado del examen:', err);
        }
        return false;
      }
    };

    // Verificar inmediatamente al montar (por si el examen se finalizó mientras el usuario estaba en la página)
    verificarYRedirigir();

    // Verificar cada 30 segundos si el examen está finalizado
    const interval = setInterval(() => {
      verificarYRedirigir();
    }, 30000); // Verificar cada 30 segundos

    return () => clearInterval(interval);
  }, [id, resultadoId, examenActivo, navigate]);

  // Detectar cuando se recupera la conexión
  useEffect(() => {
    const handleOnline = () => {
      if (conexionPerdida && resultadoId) {
        sincronizarRespuestasPendientes();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [conexionPerdida, resultadoId, sincronizarRespuestasPendientes]);

  // Prevenir salir accidentalmente y navegación fuera de la página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examenActivo) {
        e.preventDefault();
        e.returnValue = '¿Estás seguro de que quieres salir? El examen se guardará automáticamente, pero perderás el tiempo restante.';
        return e.returnValue;
      }
    };

    // Prevenir navegación del router
    const handlePopState = (e: PopStateEvent) => {
      if (examenActivo) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
        setShowConfirmExit(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Bloquear navegación del historial
    window.history.pushState(null, '', window.location.pathname);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [examenActivo]);

  // Manejar selección de respuesta (sin guardar automáticamente)
  const handleRespuestaChange = (opcionId: number) => {
    if (!examenActivo?.preguntas || preguntaActual >= examenActivo.preguntas.length) return;

    const pregunta = examenActivo.preguntas[preguntaActual];
    let nuevasRespuestas: number[];

    // Determinar si es múltiple selección: si hay más de una opción correcta, es múltiple
    const opcionesCorrectas = pregunta.opciones?.filter(op => op.es_correcta).length || 0;
    const esMultipleSeleccion = opcionesCorrectas > 1;

    if (esMultipleSeleccion) {
      // Múltiple selección: toggle
      if (respuestaSeleccionada.includes(opcionId)) {
        nuevasRespuestas = respuestaSeleccionada.filter(id => id !== opcionId);
      } else {
        nuevasRespuestas = [...respuestaSeleccionada, opcionId];
      }
    } else {
      // Selección única
      nuevasRespuestas = [opcionId];
    }

    setRespuestaSeleccionada(nuevasRespuestas);
  };


  // Refs para evitar recargas innecesarias y loops
  const ultimaRecargaRef = React.useRef<number>(0);
  const recargandoRef = React.useRef<boolean>(false);
  const paginaNavegacionRef = React.useRef<number>(1);
  const cargaActualIdRef = React.useRef<number>(0);

  // Cargar navegación de preguntas desde el backend
  const cargarNavegacionPreguntas = React.useCallback(async (page: number = 1, forzar: boolean = false) => {
    if (!resultadoId) return;

    // Si no es forzado, verificar si hay una carga en curso
    if (!forzar && recargandoRef.current) return;

    // Evitar recargas muy frecuentes (mínimo 1 segundo entre recargas) solo si no es forzado
    const ahora = Date.now();
    if (!forzar && ahora - ultimaRecargaRef.current < 1000) {
      return;
    }

    // Generar un ID único para esta carga
    const cargaId = ++cargaActualIdRef.current;
    recargandoRef.current = true;
    setLoadingNavegacion(true);
    try {
      const data = await examenesService.docente.obtenerNavegacionPreguntas(resultadoId, page, 25);

      // Solo actualizar el estado si esta es la carga más reciente
      if (cargaId === cargaActualIdRef.current) {
        setNavegacionPreguntas(data.data);
        setPaginacionNavegacion(data.pagination);
        // Solo sincronizar paginaNavegacion si es diferente (evitar loops)
        // El backend es la fuente de verdad, pero solo actualizamos si hay diferencia
        if (data.pagination.current_page !== paginaNavegacionRef.current) {
          setPaginaNavegacion(data.pagination.current_page);
        }
        ultimaRecargaRef.current = ahora;
      }
    } catch {
      // Error al cargar navegación de preguntas, se ignora silenciosamente
      // El estado de carga se actualiza en el bloque finally
    } finally {
      // Solo actualizar el estado de carga si esta es la carga más reciente
      if (cargaId === cargaActualIdRef.current) {
        setLoadingNavegacion(false);
        recargandoRef.current = false;
      }
    }
  }, [resultadoId]); // Removido paginaNavegacion de dependencias para evitar loops

  // Ref para almacenar la función y evitar loops
  const cargarNavegacionRef = React.useRef(cargarNavegacionPreguntas);
  cargarNavegacionRef.current = cargarNavegacionPreguntas;

  // Cargar navegación cuando se carga el intento o cambia la página
  useEffect(() => {
    if (resultadoId && paginaNavegacion > 0) {
      // Verificar que la página solicitada sea diferente a la actual para evitar recargas innecesarias
      const paginaActual = Number(paginacionNavegacion?.current_page) || 0;
      if (paginaNavegacion !== paginaActual) {
        // Usar forzar: true cuando el usuario cambia manualmente la página
        // Esto evita el bloqueo por recargandoRef y el delay de 1 segundo
        cargarNavegacionRef.current(paginaNavegacion, true);
      }
    }
  }, [resultadoId, paginaNavegacion, paginacionNavegacion?.current_page]); // Removido cargarNavegacionPreguntas para evitar loops

  // Actualizar ref de página de navegación cuando cambia
  useEffect(() => {
    paginaNavegacionRef.current = paginaNavegacion;
  }, [paginaNavegacion]);

  // Ya no recargamos automáticamente la navegación - se recarga manualmente cuando el usuario guarda

  // Sincronizar página de navegación cuando cambia la pregunta actual (solo si no está en la página actual)
  useEffect(() => {
    if (!examenActivo?.preguntas || preguntaActual >= examenActivo.preguntas.length || !resultadoId) {
      return;
    }

    const pregunta = examenActivo.preguntas[preguntaActual];
    const preguntaId = pregunta?.id || pregunta?.idPregunta;

    if (!preguntaId || navegacionPreguntas.length === 0 || !paginacionNavegacion) {
      return;
    }

    // Buscar la pregunta en la navegación actual
    const preguntaEnNavegacion = navegacionPreguntas.find(p => p.id === preguntaId);

    // Si la pregunta no está en la página actual, no hacer nada por ahora
    // El usuario puede navegar manualmente usando los botones de paginación
    if (!preguntaEnNavegacion) {
      // No recargar automáticamente para evitar loops
      // El usuario puede usar los botones de paginación si necesita ver otras preguntas
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntaActual, examenActivo, resultadoId]);

  // Navegar a pregunta específica usando el número de pregunta del backend
  const handleNavegacionPregunta = async (preguntaNav: { id: number; numero: number }) => {
    // NO guardar automáticamente - el usuario debe usar el botón Guardar

    // Encontrar el índice de la pregunta en el array original usando el orden
    const preguntaEnExamen = examenActivo?.preguntas?.find(
      (p) => (p.id || p.idPregunta) === preguntaNav.id
    );

    if (preguntaEnExamen && examenActivo?.preguntas) {
      const index = examenActivo.preguntas.findIndex(
        (p) => (p.id || p.idPregunta) === preguntaNav.id
      );
      if (index !== -1) {
        // La validación se hace dentro de irAPregunta
        await irAPregunta(index);

        // Actualizar la página de navegación si es necesario
        if (paginacionNavegacion) {
          const nuevaPagina = Math.ceil(preguntaNav.numero / 25);
          const paginaActual = paginacionNavegacion.current_page;
          if (nuevaPagina !== paginaActual && nuevaPagina >= 1 && nuevaPagina <= paginacionNavegacion.last_page) {
            setPaginaNavegacion(nuevaPagina);
          }
        }
      }
    }
  };

  // Finalizar examen
  const handleFinalizarExamen = async () => {
    // Guardar respuesta actual si hay una seleccionada
    if (examenActivo?.preguntas && preguntaActual < examenActivo.preguntas.length) {
      const pregunta = examenActivo.preguntas[preguntaActual];
      const preguntaId = pregunta?.id || pregunta?.idPregunta;
      if (preguntaId && respuestaSeleccionada.length > 0) {
        const success = await guardarRespuesta(String(preguntaId), respuestaSeleccionada);
        // Si guardarRespuesta retorna false, el examen fue finalizado
        if (!success && resultadoId) {
          navigate(`/docente/intentos/${resultadoId}/resultado`, { replace: true });
          return;
        }
      }
    }

    // Sincronizar respuestas pendientes antes de finalizar
    if (Object.keys(respuestasPendientes).length > 0 && resultadoId) {
      try {
        await sincronizarRespuestasPendientes();
        // Esperar un momento para que se sincronicen
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch {
        // Error al sincronizar respuestas pendientes, se ignora silenciosamente
        // El examen continuará normalmente aunque falle la sincronización
      }
    }

    // Guardar el ID del intento antes de finalizar (se limpia en el hook)
    const intentoId = resultadoId;

    const success = await finalizarExamen();
    if (success && intentoId) {
      setShowConfirmSubmit(false);
      // Limpiar localStorage
      localStorage.removeItem(`examen_respuestas_${intentoId}`);
      // Redirigir a la página de resultado con el ID del intento
      navigate(`/docente/intentos/${intentoId}/resultado`);
    } else {
      // Si falla, no redirigir - mantener al usuario en el examen
      setShowConfirmSubmit(false);
    }
  };

  // Salir del examen
  const handleSalirExamen = async () => {
    if (window.confirm('¿Estás seguro de que quieres salir? Se guardarán todas las respuestas pendientes.')) {
      // Guardar respuesta actual si hay una seleccionada
      if (examenActivo?.preguntas && preguntaActual < examenActivo.preguntas.length) {
        const pregunta = examenActivo.preguntas[preguntaActual];
        const preguntaId = pregunta?.id || pregunta?.idPregunta;
        if (preguntaId && respuestaSeleccionada.length > 0) {
          const success = await guardarRespuesta(String(preguntaId), respuestaSeleccionada);
          // Si guardarRespuesta retorna false, el examen fue finalizado
          if (!success && resultadoId) {
            navigate(`/docente/intentos/${resultadoId}/resultado`, { replace: true });
            return;
          }
        }
      }

      // Sincronizar todas las respuestas pendientes antes de salir
      if (Object.keys(respuestasPendientes).length > 0 && resultadoId) {
        await sincronizarRespuestasPendientes();
      }

      salirExamen();
      if (resultadoId) {
        localStorage.removeItem(`examen_respuestas_${resultadoId}`);
      }
      navigate('/docente/examenes');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Iniciando examen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => navigate('/docente/examenes')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Volver a exámenes
          </button>
        </div>
      </div>
    );
  }

  if (!examenActivo || !examenActivo.preguntas) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No se pudo cargar el examen.</p>
          <button
            onClick={() => navigate('/docente/examenes')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Volver a exámenes
          </button>
        </div>
      </div>
    );
  }

  const pregunta = examenActivo.preguntas[preguntaActual];
  const totalPreguntas = examenActivo.preguntas.length;
  const progreso = ((preguntaActual + 1) / totalPreguntas) * 100;

  // Contar respuestas completadas
  const respuestasCompletadas = Object.keys(respuestas).length;
  const tiempoFormateado = examenesService.utils.formatearTiempoRestante(tiempoRestante);

  // Verificar si todas las preguntas están respondidas
  const todasPreguntasRespondidas = examenActivo?.preguntas
    ? navegacionPreguntas.length > 0 && navegacionPreguntas.every(p => p.tieneRespuesta)
    : false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fijo con información del examen */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{examenActivo.titulo}</h1>
              <div className="text-sm text-gray-600">
                Pregunta {preguntaActual + 1} de {totalPreguntas} • {respuestasCompletadas} respondidas
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Indicador de conexión */}
              {conexionPerdida && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-lg text-xs flex items-center space-x-2">
                  <svg className="animate-pulse w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Sin conexión - Guardando localmente</span>
                </div>
              )}

              {/* Temporizador */}
              {horaFin && (
                <div className={`px-3 py-2 rounded-lg font-mono text-sm ${
                  tiempoRestante > 0 && tiempoRestante <= 300
                    ? 'bg-red-100 text-red-800'
                    : tiempoRestante > 0 && tiempoRestante <= 900
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  ⏰ {tiempoFormateado}
                </div>
              )}

              {/* Botón salir */}
              <button
                onClick={() => setShowConfirmExit(true)}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                Salir
              </button>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-3">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>

          {/* Navegación horizontal debajo de la barra de progreso */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Navegación de preguntas</h3>
              <button
                onClick={() => setShowConfirmSubmit(true)}
                disabled={!todasPreguntasRespondidas}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title={!todasPreguntasRespondidas ? 'Debe responder todas las preguntas antes de finalizar' : 'Finalizar examen'}
              >
                Finalizar Examen {todasPreguntasRespondidas ? '✓' : ''}
              </button>
            </div>

            {/* Scroll horizontal para las preguntas */}
            <div className="overflow-x-auto pb-2">
              {loadingNavegacion ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 min-w-max">
                    {navegacionPreguntas.map((preguntaNav) => {
                      const preguntaActualData = examenActivo?.preguntas?.[preguntaActual];
                      const esPreguntaActual = preguntaActualData &&
                        (preguntaActualData.id || preguntaActualData.idPregunta) === preguntaNav.id;

                      // Encontrar el índice de la pregunta en el array de preguntas
                      const preguntaIndex = examenActivo?.preguntas?.findIndex(
                        (p) => (p.id || p.idPregunta) === preguntaNav.id
                      ) ?? -1;

                      // Verificar si la pregunta está disponible para navegar
                      // Permitir navegar a preguntas respondidas o a las que están en la lista de disponibles
                      const preguntaTieneRespuesta = preguntaNav.tieneRespuesta;
                      const estaDisponible = preguntaIndex >= 0 && (
                        preguntasDisponibles.includes(preguntaIndex) ||
                        preguntaTieneRespuesta
                      );

                      return (
                        <button
                          key={preguntaNav.id}
                          onClick={() => handleNavegacionPregunta(preguntaNav)}
                          disabled={!estaDisponible}
                          className={`w-10 h-10 text-sm font-medium rounded flex-shrink-0 ${
                            esPreguntaActual
                              ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                              : preguntaNav.tieneRespuesta
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 border-2 border-green-300'
                              : estaDisponible
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200'
                              : 'bg-gray-50 text-gray-400 border-2 border-gray-100 cursor-not-allowed opacity-50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={
                            !estaDisponible
                              ? 'Debe responder las preguntas en orden'
                              : `Pregunta ${preguntaNav.numero}${preguntaNav.tieneRespuesta ? ' (Respondida)' : ''}${preguntaNav.tieneContexto ? ' (Con contexto)' : ''}`
                          }
                        >
                          {preguntaNav.numero}
                        </button>
                      );
                    })}
                  </div>

                  {/* Controles de paginación */}
                  {paginacionNavegacion && paginacionNavegacion.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <button
                        onClick={() => {
                          const paginaActual = Number(paginacionNavegacion?.current_page) || 1;
                          const nuevaPagina = paginaActual - 1;
                          if (nuevaPagina >= 1 && nuevaPagina !== paginaActual && resultadoId) {
                            // Actualizar el estado de la página, el useEffect se encargará de cargar
                            setPaginaNavegacion(nuevaPagina);
                          }
                        }}
                        disabled={!paginacionNavegacion || paginacionNavegacion.current_page === 1 || loadingNavegacion || !resultadoId}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Anterior
                      </button>
                      <span className="text-sm text-gray-600">
                        Página {paginacionNavegacion?.current_page || 1} de {paginacionNavegacion?.last_page || 1}
                      </span>
                      <button
                        onClick={() => {
                          const paginaActual = Number(paginacionNavegacion?.current_page) || 1;
                          const nuevaPagina = paginaActual + 1;
                          const lastPage = Number(paginacionNavegacion?.last_page) || 1;
                          if (paginacionNavegacion && nuevaPagina <= lastPage && nuevaPagina !== paginaActual && resultadoId) {
                            // Actualizar el estado de la página, el useEffect se encargará de cargar
                            setPaginaNavegacion(nuevaPagina);
                          }
                        }}
                        disabled={!paginacionNavegacion || paginacionNavegacion.current_page >= paginacionNavegacion.last_page || loadingNavegacion || !resultadoId}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Leyenda */}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-600 rounded mr-1"></div>
                Actual
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-100 border-2 border-green-300 rounded mr-1"></div>
                Respondida
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-100 border-2 border-gray-200 rounded mr-1"></div>
                Sin responder
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Contenido Principal - Área para mostrar la pregunta */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border">
            {/* RF-D.2.2: Lógica de Contexto - Mostrar contexto si la pregunta lo tiene */}
            {(() => {
              const contextoTexto = pregunta.contexto?.texto || '';
              const enunciadoCompleto = pregunta.enunciado || pregunta.texto || '';
              
              // Función para extraer texto plano de HTML
              const extraerTextoPlano = (html: string): string => {
                if (!html) return '';
                const temp = document.createElement('div');
                temp.innerHTML = html;
                return (temp.textContent || temp.innerText || '').replace(/\s+/g, ' ').trim();
              };
              
              // Determinar si mostrar el contexto o no
              let mostrarContexto = true;
              let enunciadoLimpio = enunciadoCompleto;
              
              if (contextoTexto && enunciadoCompleto) {
                const contextoPlano = extraerTextoPlano(contextoTexto);
                const enunciadoPlano = extraerTextoPlano(enunciadoCompleto);
                
                // Si el enunciado contiene el contexto completo, no mostrar el contexto por separado
                // y removerlo del enunciado
                if (contextoPlano.length > 20 && enunciadoPlano.includes(contextoPlano)) {
                  // Intentar remover el contexto del enunciado
                  const contextoHTML = contextoTexto.trim();
                  
                  // Método 1: Buscar y remover el contexto HTML completo
                  if (enunciadoCompleto.includes(contextoHTML)) {
                    enunciadoLimpio = enunciadoCompleto.replace(contextoHTML, '').trim();
                    // Si el enunciado después de remover el contexto es muy corto, mantener el original
                    const enunciadoLimpioPlano = extraerTextoPlano(enunciadoLimpio);
                    if (enunciadoLimpioPlano.length < 20) {
                      enunciadoLimpio = enunciadoCompleto;
                      mostrarContexto = false; // No mostrar contexto si está completamente en el enunciado
                    }
                  } else {
                    // Método 2: Remover por texto plano (buscar la primera oración del contexto)
                    // Extraer las primeras palabras del contexto para buscar en el enunciado
                    const primerasPalabras = contextoPlano.substring(0, Math.min(100, contextoPlano.length));
                    const inicioEnEnunciado = enunciadoPlano.indexOf(primerasPalabras);
                    
                    if (inicioEnEnunciado !== -1) {
                      // Encontrar dónde termina el contexto en el enunciado
                      // Buscar un punto de corte común (como "Para ello, les propone lo siguiente:")
                      const marcadoresFin = [
                        'para ello, les propone lo siguiente:',
                        'para evaluar las respuestas',
                        'la docente ha elaborado',
                        'a continuación'
                      ];
                      
                      let finContexto = -1;
                      for (const marcador of marcadoresFin) {
                        const posMarcador = enunciadoPlano.toLowerCase().indexOf(marcador, inicioEnEnunciado);
                        if (posMarcador !== -1) {
                          // Buscar el siguiente punto o dos puntos después del marcador
                          const siguientePunto = enunciadoPlano.indexOf('.', posMarcador);
                          const siguienteDosPuntos = enunciadoPlano.indexOf(':', posMarcador);
                          finContexto = Math.min(
                            siguientePunto !== -1 ? siguientePunto + 1 : enunciadoPlano.length,
                            siguienteDosPuntos !== -1 ? siguienteDosPuntos + 1 : enunciadoPlano.length
                          );
                          break;
                        }
                      }
                      
                      if (finContexto === -1) {
                        // Si no encontramos un marcador, usar la longitud del contexto
                        finContexto = inicioEnEnunciado + contextoPlano.length;
                      }
                      
                      // Remover el contexto del enunciado HTML
                      // Aproximar la posición en el HTML original
                      const parser = new DOMParser();
                      const doc = parser.parseFromString(enunciadoCompleto, 'text/html');
                      const bodyHTML = doc.body.innerHTML;
                      
                      // Buscar el texto antes y después del contexto
                      const textoAntes = enunciadoPlano.substring(0, inicioEnEnunciado);
                      const textoDespues = enunciadoPlano.substring(finContexto);
                      
                      // Intentar reconstruir el HTML sin el contexto
                      if (textoDespues.length > 10) {
                        // Buscar el texto después en el HTML
                        const indexDespues = bodyHTML.toLowerCase().indexOf(textoDespues.substring(0, 50).toLowerCase());
                        if (indexDespues !== -1) {
                          enunciadoLimpio = bodyHTML.substring(indexDespues).trim();
                        } else {
                          // Si no encontramos, usar el texto después directamente
                          enunciadoLimpio = textoDespues;
                        }
                      } else if (textoAntes.length > 10) {
                        // Si no hay texto después, usar el texto antes
                        const indexAntes = bodyHTML.toLowerCase().indexOf(textoAntes.substring(Math.max(0, textoAntes.length - 50)).toLowerCase());
                        if (indexAntes !== -1) {
                          enunciadoLimpio = bodyHTML.substring(0, indexAntes).trim();
                        }
                      }
                      
                      // Validar que el enunciado limpio tenga contenido válido
                      const enunciadoLimpioPlano = extraerTextoPlano(enunciadoLimpio);
                      if (!enunciadoLimpioPlano || enunciadoLimpioPlano.length < 20) {
                        enunciadoLimpio = enunciadoCompleto;
                        mostrarContexto = false;
                      }
                    } else {
                      // Si no encontramos el contexto en el enunciado, mostrar ambos normalmente
                      mostrarContexto = true;
                    }
                  }
                  
                  // Limpiar etiquetas vacías y espacios al inicio
                  enunciadoLimpio = enunciadoLimpio
                    .replace(/^[\s\n\r]+/, '')
                    .replace(/^<div[^>]*>\s*<\/div>\s*/i, '')
                    .replace(/^<span[^>]*>\s*<\/span>\s*/i, '')
                    .replace(/^<p[^>]*>\s*<\/p>\s*/i, '')
                    .trim();
                }
              }
              
              return (
                <>
                  {pregunta.contexto && pregunta.contexto.idContexto && mostrarContexto && (
                    <div className="p-6 border-b bg-blue-50">
                      <h3 className="text-sm font-semibold text-blue-900 mb-2">
                        {pregunta.contexto.titulo || 'Contexto'}
                      </h3>
                      <ContenidoHTML
                        html={contextoTexto}
                        className="text-gray-800 prose prose-sm max-w-none"
                      />
                    </div>
                  )}

                  {/* Pregunta */}
                  <div className="p-6 border-b">
                    <div className="flex items-start justify-between mb-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                        Pregunta {preguntaActual + 1}
                      </span>
                      <span className="text-sm text-gray-500">
                        {pregunta.pivot?.puntaje
                          ? `${Number(pregunta.pivot.puntaje).toFixed(2)} puntos`
                          : '0 puntos'}
                      </span>
                    </div>

                    <ContenidoHTML
                      html={enunciadoLimpio}
                      className="text-lg font-medium text-gray-900 leading-relaxed prose max-w-none"
                    />
                  </div>
                </>
              );
            })()}

            {/* Opciones */}
            <div className="p-6">
              <div className="space-y-3">
                {pregunta.opciones && pregunta.opciones.length > 0 ? pregunta.opciones.map((opcion, index) => {
                  const opcionId = opcion.id || opcion.idOpcion;
                  const esSeleccionada = respuestaSeleccionada.includes(opcionId);
                  // Determinar si es múltiple selección: si hay más de una opción correcta
                  const opcionesCorrectas = pregunta.opciones?.filter(op => op.es_correcta).length || 0;
                  const esMultipleSeleccion = opcionesCorrectas > 1;
                  const preguntaId = pregunta?.id || pregunta?.idPregunta;

                  return (
                    <label
                      key={opcionId}
                      className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        esSeleccionada
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type={esMultipleSeleccion ? 'checkbox' : 'radio'}
                        name={`pregunta_${preguntaId}`}
                        value={opcionId}
                        checked={esSeleccionada}
                        onChange={() => handleRespuestaChange(opcionId)}
                        className="mt-1 mr-3"
                      />

                      <div className="flex-1">
                        <span className="inline-block bg-gray-100 text-gray-600 w-6 h-6 rounded-full text-center text-sm font-medium mr-3 flex-shrink-0">
                          {opcion.letra || String.fromCharCode(65 + index)}
                        </span>

                        <ContenidoHTML
                          html={opcion.texto || opcion.contenido || ''}
                          className="text-gray-900 prose prose-sm max-w-none"
                        />
                      </div>
                    </label>
                  );
                }) : (
                  <div className="text-gray-500 text-center py-4">
                    No hay opciones disponibles para esta pregunta
                  </div>
                )}
              </div>

              {(() => {
                const opcionesCorrectas = pregunta.opciones?.filter(op => op.es_correcta).length || 0;
                return opcionesCorrectas > 1 ? (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Instrucción:</strong> Esta pregunta permite múltiples respuestas.
                      Selecciona todas las opciones correctas.
                    </p>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Navegación */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
              <button
                onClick={() => preguntaAnterior()}
                disabled={preguntaActual === 0}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>

              <div className="flex gap-2">
                {/* Botón Guardar - Solo visible en la última pregunta cuando hay respuesta seleccionada */}
                {preguntaActual === totalPreguntas - 1 && respuestaSeleccionada.length > 0 && (
                  <button
                    onClick={async () => {
                      // Guardar respuesta de la última pregunta
                      if (examenActivo?.preguntas && preguntaActual < examenActivo.preguntas.length) {
                        const pregunta = examenActivo.preguntas[preguntaActual];
                        const preguntaId = pregunta?.id || pregunta?.idPregunta;
                        if (preguntaId) {
                          const success = await guardarRespuesta(String(preguntaId), respuestaSeleccionada);
                          // Si guardarRespuesta retorna false, el examen fue finalizado
                          if (!success && resultadoId) {
                            navigate(`/docente/intentos/${resultadoId}/resultado`, { replace: true });
                            return;
                          }
                          // Recargar navegación después de guardar para actualizar el estado
                          if (resultadoId) {
                            setTimeout(() => {
                              cargarNavegacionRef.current(paginaNavegacionRef.current, true);
                            }, 300);
                          }
                        }
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    title="Guardar respuesta de la última pregunta"
                  >
                    💾 Guardar
                  </button>
                )}

                {/* Botón Siguiente - Oculto en la última pregunta */}
                {preguntaActual < totalPreguntas - 1 && (
                  <button
                    onClick={async () => {
                      // Guardar respuesta actual antes de navegar si hay una seleccionada
                      if (examenActivo?.preguntas && preguntaActual < examenActivo.preguntas.length) {
                        const pregunta = examenActivo.preguntas[preguntaActual];
                        const preguntaId = pregunta?.id || pregunta?.idPregunta;
                        if (preguntaId && respuestaSeleccionada.length > 0) {
                          const success = await guardarRespuesta(String(preguntaId), respuestaSeleccionada);
                          // Si guardarRespuesta retorna false, el examen fue finalizado
                          if (!success && resultadoId) {
                            navigate(`/docente/intentos/${resultadoId}/resultado`, { replace: true });
                            return;
                          }
                          // Recargar navegación después de guardar
                          if (resultadoId) {
                            setTimeout(() => {
                              cargarNavegacionRef.current(paginaNavegacionRef.current, true);
                            }, 300);
                          }
                        }
                      }
                      await siguientePregunta();
                    }}
                    disabled={
                      !preguntasDisponibles.includes(preguntaActual + 1) && respuestaSeleccionada.length === 0
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para salir */}
      {showConfirmExit && (
        <div className="fixed inset-0 md:left-[240px] backdrop-blur-md bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              ¿Salir del examen?
            </h3>
            <p className="text-gray-600 mb-6">
              Si sales ahora, perderás el progreso no guardado. ¿Estás seguro de que deseas salir?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmExit(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalirExamen}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para finalizar */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 md:left-[240px] backdrop-blur-md bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              ¿Finalizar examen?
            </h3>
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                Estás a punto de finalizar el examen. Revisa el resumen:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total de preguntas:</span>
                  <span className="font-medium">{totalPreguntas}</span>
                </div>
                <div className="flex justify-between">
                  <span>Preguntas respondidas:</span>
                  <span className="font-medium text-green-600">{respuestasCompletadas}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sin responder:</span>
                  <span className="font-medium text-red-600">{totalPreguntas - respuestasCompletadas}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tiempo restante:</span>
                  <span className="font-medium">{tiempoFormateado}</span>
                </div>
              </div>
              {totalPreguntas - respuestasCompletadas > 0 && (
                <p className="text-orange-600 text-sm mt-3">
                  ⚠️ Tienes preguntas sin responder. ¿Deseas continuar?
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Continuar examen
              </button>
              <button
                onClick={handleFinalizarExamen}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Finalizar examen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TomarExamen;
