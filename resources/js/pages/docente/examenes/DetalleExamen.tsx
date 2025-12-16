import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { examenesService } from '../../../services/examenesService';
import type { Examen, Postulacion } from '../../../types/examenes';
import ContenidoHTML from '../../../components/ContenidoHTML';

const DetalleExamen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [examen, setExamen] = useState<Examen | null>(null);
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModalPostulacion, setShowModalPostulacion] = useState(false);
  const [postulacionSeleccionada, setPostulacionSeleccionada] = useState<number | null>(null);
  const [subpruebaSeleccionada, setSubpruebaSeleccionada] = useState<number | null>(null);
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    if (id) {
      verificarIntentoEnCurso();
      loadDetalleExamen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const verificarIntentoEnCurso = async () => {
    if (!id) return;

    try {
      // Intentar cargar un intento existente
      const response = await examenesService.docente.cargarIntento(parseInt(id));

      // Si el examen ya fue finalizado, redirigir silenciosamente
      if (response && 'ya_finalizado' in response && response.ya_finalizado) {
        navigate(`/docente/examenes`, { replace: true });
        return;
      }

      // Si hay un intento en curso (tiene_intento !== false), redirigir directamente al examen
      if (response && response.tiene_intento !== false) {
        navigate(`/docente/examenes/${id}/iniciar`);
      }
      // Si no hay intento (tiene_intento === false), continuar normalmente
      // El usuario podrá seleccionar postulación
    } catch (err: unknown) {
      // Si el error es porque ya finalizó el examen, redirigir silenciosamente
      if (err && typeof err === 'object' && 'response' in err &&
          err.response && typeof err.response === 'object' && 'data' in err.response &&
          err.response.data && typeof err.response.data === 'object' && 'ya_finalizado' in err.response.data) {
        navigate(`/docente/examenes`, { replace: true });
        return;
      }
      // Error al cargar intento, continuar normalmente
      // El usuario podrá seleccionar postulación
    }
  };

  const loadDetalleExamen = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await examenesService.docente.getDetalleExamen(parseInt(id || '0'));
      setExamen(data);

      // Las postulaciones vienen incluidas en el detalle del examen
      if (data.postulaciones && Array.isArray(data.postulaciones)) {
        setPostulaciones(data.postulaciones);
      } else {
        // Fallback: intentar cargar desde el endpoint de admin si no vienen incluidas
        if (data.idExamen || data.id) {
          try {
            const postulacionesData = await examenesService.admin.getPostulaciones(data.idExamen || data.id || 0);
            setPostulaciones(postulacionesData);
          } catch {
            setPostulaciones([]);
          }
        }
      }
    } catch (err: unknown) {
      // Si el error es porque ya finalizó el examen, redirigir silenciosamente
      if ((err && typeof err === 'object' && 'response' in err &&
          err.response && typeof err.response === 'object' && 'data' in err.response &&
          err.response.data && typeof err.response.data === 'object' && 'ya_finalizado' in err.response.data) ||
          (err instanceof Error && 'ya_finalizado' in err && (err as Error & { ya_finalizado?: boolean }).ya_finalizado)) {
        navigate(`/docente/examenes`, { replace: true });
        return;
      }
      
      const errorMessage = (err && typeof err === 'object' && 'response' in err &&
        err.response && typeof err.response === 'object' && 'data' in err.response &&
        err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data &&
        typeof err.response.data.message === 'string')
        ? err.response.data.message
        : 'Error al cargar los detalles del examen';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const estaDisponible = examen ? examenesService.utils.estaDisponible(examen) : false;
  const estadoVisual = examen ? examenesService.utils.getEstadoVisual(examen) : null;

  // RF-D.1.2: Manejar inicio de examen con idPostulacion
  const handleIniciarExamen = async () => {
    if (!postulacionSeleccionada) {
      alert('Debe seleccionar una postulación para continuar');
      return;
    }

    // Verificar si la postulación requiere selección de subprueba
    const postulacion = postulaciones.find(p => p.idPostulacion === postulacionSeleccionada);
    if (postulacion?.tipo_aprobacion === '1' && !subpruebaSeleccionada) {
      alert('Debe seleccionar una subprueba para esta postulación');
      return;
    }

    if (!examen || !id) {
      return;
    }

    setIniciando(true);
    try {
      // Llamar al servicio para iniciar el examen con la postulación seleccionada
      await examenesService.docente.iniciarExamen(
        parseInt(id),
        postulacionSeleccionada,
        subpruebaSeleccionada || undefined
      );

      // Navegar a la página de tomar examen
      navigate(`/docente/examenes/${examen.idExamen || examen.id || id}/iniciar`);
    } catch (err: unknown) {
      const errorMessage = (err && typeof err === 'object' && 'response' in err &&
        err.response && typeof err.response === 'object' && 'data' in err.response &&
        err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data &&
        typeof err.response.data.message === 'string')
        ? err.response.data.message
        : 'Error al iniciar el examen';
      alert(errorMessage);
    } finally {
      setIniciando(false);
    }
  };

  // Obtener la postulación seleccionada para mostrar sus subpruebas
  const postulacionActual = postulaciones.find(p => p.idPostulacion === postulacionSeleccionada);
  const requiereSubprueba = postulacionActual?.tipo_aprobacion === '1';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !examen) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error || 'Examen no encontrado'}
        </div>
        <Link
          to="/docente/examenes"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          ← Volver a la lista de exámenes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Botón volver */}
        <Link
          to="/docente/examenes"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a la lista de exámenes
        </Link>

        {/* Card principal */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header con estado */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {estadoVisual && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      estadoVisual.color === 'success' ? 'bg-green-100 text-green-800' :
                      estadoVisual.color === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      estadoVisual.color === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {estadoVisual.icono} {estadoVisual.texto}
                    </span>
                  )}
                  {examen.tipoConcurso && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {examen.tipoConcurso.nombre}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{examen.titulo}</h1>
                {(examen.codigo_examen || examen.codigo) && (
                  <p className="text-sm text-gray-600 mt-1">Código: {examen.codigo_examen || examen.codigo}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-6">
            {/* Instrucciones/Descripción */}
            {examen.descripcion && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Instrucciones</h2>
                <ContenidoHTML
                  html={examen.descripcion}
                  className="prose max-w-none text-gray-700"
                />
              </div>
            )}

            {/* Información del examen */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Examen</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <span className="text-gray-600 font-medium mr-2">📝 Preguntas:</span>
                  <span className="text-gray-900 font-semibold">{examen.total_preguntas || (examen.preguntas ? examen.preguntas.length : 0)}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-600 font-medium mr-2">⏱️ Duración:</span>
                  <span className="text-gray-900 font-semibold">
                    {examenesService.utils.formatearDuracion(examen.duracion_minutos || examen.tiempo_limite || 60)}
                  </span>
                </div>
                {/* Información adicional del examen */}
                {examen.subpruebas && examen.subpruebas.length > 0 && (
                  <div className="flex items-center">
                    <span className="text-gray-600 font-medium mr-2">📊 Subpruebas:</span>
                    <span className="text-gray-900 font-semibold">{examen.subpruebas.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Fechas */}
            {(examen.fecha_inicio_vigencia || examen.fecha_fin_vigencia) && (
              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Fechas y Horarios</h2>
                <div className="space-y-3">
                  {examen.fecha_inicio_vigencia && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">📅 Inicio:</span>
                      <span className="text-gray-900 font-semibold">
                        {examen.fecha_inicio_vigencia}
                      </span>
                    </div>
                  )}
                  {examen.fecha_fin_vigencia && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">📅 Fin:</span>
                        <span className="text-gray-900 font-semibold">
                          {examen.fecha_fin_vigencia}
                        </span>
                      </div>
                      {(() => {
                        const ahora = new Date();
                        const fin = new Date(examen.fecha_fin_vigencia);
                        const diasRestantes = Math.ceil((fin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
                        return diasRestantes >= 0 ? (
                          <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                            <span className="text-gray-600 font-medium">⏳ Tiempo restante:</span>
                            <span className="text-blue-700 font-bold text-lg">
                              {diasRestantes === 0 ? 'Último día' : `${diasRestantes} día(s)`}
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Alertas */}
            {estadoVisual && estadoVisual.color === 'info' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">⏰ Este examen comenzará pronto</p>
              </div>
            )}

            {estadoVisual && estadoVisual.color === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">❌ Este examen no está disponible en este momento</p>
              </div>
            )}

            {estaDisponible && examen.fecha_fin_vigencia && (() => {
              const ahora = new Date();
              const fin = new Date(examen.fecha_fin_vigencia);
              const diasRestantes = Math.ceil((fin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
              return diasRestantes >= 0 && diasRestantes <= 2 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <p className="text-orange-800 font-medium">🚨 Tiempo limitado - ¡No olvides tomar el examen!</p>
                </div>
              ) : null;
            })()}

            {/* Botón de acción */}
            {/* NOTA: Siempre mostramos el botón si el examen está publicado.
                El servidor validará la disponibilidad real cuando el usuario intente iniciar. */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              {examen.estado === '1' ? (
                <button
                  onClick={() => setShowModalPostulacion(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-colors shadow-md hover:shadow-lg"
                >
                  🚀 Iniciar Examen
                </button>
              ) : (
                <div className="w-full bg-gray-200 text-gray-500 px-6 py-4 rounded-lg font-semibold text-lg text-center cursor-not-allowed">
                  No disponible
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recomendaciones</h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Antes de iniciar:</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Asegúrate de tener una conexión a internet estable</li>
                    <li>Cierra otras aplicaciones para evitar distracciones</li>
                    <li>Ten papel y lápiz a mano si es necesario</li>
                    <li>Verifica que tienes tiempo suficiente</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Durante el examen:</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>El tiempo se cuenta automáticamente</li>
                    <li>Puedes navegar entre preguntas libremente</li>
                    <li>Tus respuestas se guardan automáticamente</li>
                    <li>Revisa todas tus respuestas antes de finalizar</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RF-D.1.2: Modal para confirmar postulación */}
      {showModalPostulacion && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Seleccionar Postulación
              </h3>
              <p className="text-gray-600 mb-4">
                Por favor, seleccione la postulación a la que se presenta para este examen:
              </p>

              {postulaciones.length === 0 ? (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    No hay postulaciones disponibles para este examen. Por favor, contacte al administrador.
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postulación <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={postulacionSeleccionada || ''}
                    onChange={(e) => {
                      const nuevaPostulacion = e.target.value ? parseInt(e.target.value) : null;
                      setPostulacionSeleccionada(nuevaPostulacion);
                      // Limpiar subprueba seleccionada al cambiar de postulación
                      setSubpruebaSeleccionada(null);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccione una postulación</option>
                    {postulaciones.map(postulacion => (
                      <option key={postulacion.idPostulacion} value={postulacion.idPostulacion}>
                        {postulacion.nombre}
                      </option>
                    ))}
                  </select>
                  {postulaciones.find(p => p.idPostulacion === postulacionSeleccionada)?.descripcion && (
                    <p className="mt-2 text-sm text-gray-600">
                      {postulaciones.find(p => p.idPostulacion === postulacionSeleccionada)?.descripcion}
                    </p>
                  )}

                  {/* Selector de subprueba para postulaciones independientes */}
                  {requiereSubprueba && postulacionActual?.subpruebas && postulacionActual.subpruebas.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subprueba (Nivel de Escala) <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={subpruebaSeleccionada || ''}
                        onChange={(e) => setSubpruebaSeleccionada(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Seleccione una subprueba</option>
                        {postulacionActual.subpruebas.map(subprueba => (
                          <option key={subprueba.idSubprueba} value={subprueba.idSubprueba}>
                            {subprueba.nombre}
                            {subprueba.puntaje_minimo > 0 ? ` (Mínimo: ${subprueba.puntaje_minimo})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500">
                        Seleccione el nivel de escala al que desea postular. Solo se evaluará esta subprueba.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowModalPostulacion(false);
                    setPostulacionSeleccionada(null);
                    setSubpruebaSeleccionada(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleIniciarExamen}
                  disabled={!postulacionSeleccionada || iniciando || postulaciones.length === 0 || (requiereSubprueba && !subpruebaSeleccionada)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {iniciando ? 'Iniciando...' : 'Confirmar e Iniciar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleExamen;

