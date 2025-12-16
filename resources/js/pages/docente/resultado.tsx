import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ContenidoHTML from '../../components/ContenidoHTML';

interface Respuesta {
  idRespuesta: number;
  idPregunta: number;
  pregunta: {
    enunciado: string;
    opciones: Array<{
      idOpcion: number;
      contenido: string;
      es_correcta: boolean;
    }>;
  };
  opcionSeleccionada: {
    idOpcion: number;
    contenido: string;
    es_correcta: boolean;
  } | null;
}

interface ResultadoSubprueba {
  idResultado: number;
  idSubprueba: number;
  puntaje_obtenido: number;
  puntaje_minimo_requerido: number;
  puntaje_maximo?: number;
  es_aprobado: boolean;
  total_preguntas?: number;
  preguntas_correctas?: number;
  subprueba?: {
    idSubprueba: number;
    nombre: string;
  };
}

interface Postulacion {
  idPostulacion: number;
  nombre: string;
  descripcion?: string | null;
  tipo_aprobacion?: '0' | '1';
}

interface Intento {
  idIntento: number;
  puntaje: number | string | null;
  es_aprobado: boolean;
  examen: {
    titulo: string;
  } | null;
  postulacion?: Postulacion | null;
  respuestas: Respuesta[];
  resultados_subpruebas?: ResultadoSubprueba[];
}

const ResultadoIntento: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [intento, setIntento] = useState<Intento | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarResultado = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/docente/intentos/${id}/resultado`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // El backend devuelve { intento: {...}, respuestas: [...], resultados_subpruebas: [...] }
        // Necesitamos acceder a data.intento
        if (data.intento) {
          // Combinar el intento con las respuestas
          setIntento({
            ...data.intento,
            respuestas: data.respuestas || [],
            resultados_subpruebas: data.resultados_subpruebas || []
          });
        } else {
          // Si viene directamente el intento (compatibilidad)
          setIntento(data);
        }
      }
    } catch {
      // Ignorar errores al cargar resultado
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    cargarResultado();
  }, [cargarResultado]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">Cargando resultado...</div>
        </div>
      </div>
    );
  }

  if (!intento) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">No se pudo cargar el resultado</p>
            <button
              onClick={() => navigate('/docente/historial')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Volver al Historial
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/docente/historial')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Volver al Historial
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Resultado del Examen</h1>
          <p className="text-gray-600 mt-2">{intento.examen?.titulo || 'Examen no disponible'}</p>
          {intento.postulacion && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">Postulación seleccionada:</p>
              <p className="text-base font-semibold text-gray-900">{intento.postulacion.nombre}</p>
              {intento.postulacion.descripcion && (
                <p className="text-sm text-gray-600 mt-1">{intento.postulacion.descripcion}</p>
              )}
            </div>
          )}
        </div>

        {/* RF-D.3.1: Muestra de Resultado Inmediato */}
        <div className={`bg-white rounded-lg shadow-sm p-6 mb-6 border-2 ${
          intento.es_aprobado ? 'border-green-500' : 'border-red-500'
        }`}>
          <div className="text-center">
            <h2 className={`text-4xl font-bold mb-6 ${
              intento.es_aprobado ? 'text-green-600' : 'text-red-600'
            }`}>
              {intento.es_aprobado ? 'APROBADO' : 'NO APROBADO'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Puntaje Obtenido</p>
                <p className="text-xl font-semibold text-gray-900">
                  {(() => {
                    const puntaje = typeof intento.puntaje === 'number'
                      ? intento.puntaje
                      : parseFloat(String(intento.puntaje || 0));
                    return isNaN(puntaje) ? '0.00' : puntaje.toFixed(2);
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Puntaje Mínimo Requerido</p>
                <p className="text-xl font-semibold text-gray-900">
                  {(() => {
                    const puntajeMinimo = intento.resultados_subpruebas?.reduce((sum, r) => {
                      const min = typeof r.puntaje_minimo_requerido === 'number'
                        ? r.puntaje_minimo_requerido
                        : parseFloat(String(r.puntaje_minimo_requerido || 0));
                      return sum + (isNaN(min) ? 0 : min);
                    }, 0) || 0;
                    return puntajeMinimo.toFixed(2);
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Puntaje Máximo</p>
                <p className="text-xl font-semibold text-blue-600">
                  {(() => {
                    const puntajeMaximo = intento.resultados_subpruebas?.reduce((sum, r) => {
                      const max = typeof r.puntaje_maximo === 'number'
                        ? r.puntaje_maximo
                        : parseFloat(String(r.puntaje_maximo || 0));
                      return sum + (isNaN(max) ? 0 : max);
                    }, 0) || 0;
                    return puntajeMaximo.toFixed(2);
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resultados por Subprueba */}
        {intento.resultados_subpruebas && intento.resultados_subpruebas.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Resultados por Subprueba</h3>
            <div className="space-y-4">
              {intento.resultados_subpruebas.map((resultado) => (
                <div key={resultado.idResultado} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-medium text-gray-900">
                      {resultado.subprueba?.nombre || `Subprueba ${resultado.idSubprueba}`}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      resultado.es_aprobado
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {resultado.es_aprobado ? 'Aprobado' : 'No Aprobado'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                    <div>
                      <p className="text-sm text-gray-600">Puntaje Obtenido</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {(() => {
                          const puntaje = typeof resultado.puntaje_obtenido === 'number'
                            ? resultado.puntaje_obtenido
                            : parseFloat(String(resultado.puntaje_obtenido || 0));
                          return isNaN(puntaje) ? '0.00' : puntaje.toFixed(2);
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Puntaje Máximo</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {(() => {
                          const puntaje = typeof resultado.puntaje_maximo === 'number'
                            ? resultado.puntaje_maximo
                            : parseFloat(String(resultado.puntaje_maximo || 0));
                          return isNaN(puntaje) ? '0.00' : puntaje.toFixed(2);
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Preguntas Correctas</p>
                      <p className="text-lg font-semibold text-green-600">
                        {resultado.preguntas_correctas ?? 0} / {resultado.total_preguntas ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Puntaje Mínimo Requerido</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {(() => {
                          const puntaje = typeof resultado.puntaje_minimo_requerido === 'number'
                            ? resultado.puntaje_minimo_requerido
                            : parseFloat(String(resultado.puntaje_minimo_requerido || 0));
                          return isNaN(puntaje) ? '0.00' : puntaje.toFixed(2);
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detalle de Respuestas */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold mb-4">Detalle de Respuestas</h3>
          <div className="space-y-6">
            {intento.respuestas?.map((respuesta, idx) => {
              const esCorrecta = respuesta.opcionSeleccionada?.es_correcta || false;

              return (
                <div key={respuesta.idRespuesta} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="font-semibold text-gray-700">Pregunta {idx + 1}:</span>
                    <div
                      className={`flex-1 p-3 rounded-lg ${
                        esCorrecta
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <ContenidoHTML
                        html={respuesta.pregunta?.enunciado || ''}
                        className="text-gray-900 mb-3"
                      />
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Todas las opciones de la pregunta:</p>
                        {respuesta.pregunta?.opciones?.map((opcion, index) => {
                          // Comparar IDs numéricos para asegurar la comparación correcta
                          const esSeleccionada = respuesta.opcionSeleccionada &&
                            Number(opcion.idOpcion) === Number(respuesta.opcionSeleccionada.idOpcion);
                          const esCorrectaOpcion = Boolean(opcion.es_correcta);
                          const letra = String.fromCharCode(65 + index); // A, B, C, D...

                          return (
                            <div
                              key={opcion.idOpcion}
                              className={`p-3 rounded ${
                                esSeleccionada && esCorrectaOpcion
                                  ? 'bg-green-200 border-2 border-green-500'
                                  : esSeleccionada && !esCorrectaOpcion
                                  ? 'bg-red-200 border-2 border-red-500'
                                  : !esSeleccionada && esCorrectaOpcion
                                  ? 'bg-green-100 border-2 border-green-400'
                                  : 'bg-gray-50 border border-gray-200'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  esSeleccionada && esCorrectaOpcion
                                    ? 'bg-green-600 text-white'
                                    : esSeleccionada && !esCorrectaOpcion
                                    ? 'bg-red-600 text-white'
                                    : !esSeleccionada && esCorrectaOpcion
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-300 text-gray-700'
                                }`}>
                                  {letra}
                                </span>
                                <div className="flex-1">
                                  <ContenidoHTML
                                    html={opcion.contenido}
                                    className="text-sm font-medium text-gray-900"
                                  />
                                </div>
                                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                  {esSeleccionada && (
                                    <span className={`text-xs font-semibold whitespace-nowrap ${
                                      esCorrectaOpcion ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {esCorrectaOpcion ? '✓ Tu respuesta' : '✗ Tu respuesta'}
                                    </span>
                                  )}
                                  {esCorrectaOpcion && (
                                    <span className="text-xs text-green-700 font-semibold whitespace-nowrap">
                                      ✓ Correcta
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultadoIntento;

