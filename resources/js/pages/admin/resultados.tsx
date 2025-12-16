import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import ContenidoHTML from '../../components/ContenidoHTML';


interface OpcionSeleccionada {
  idOpcion: number;
  contenido: string;
  es_correcta: boolean;
}

interface RespuestaIntento {
  idRespuesta: number;
  enunciado: string;
  opcionSeleccionada: OpcionSeleccionada | null;
  opciones?: Array<{
    idOpcion: number;
    contenido: string;
    es_correcta: boolean;
  }>;
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
  idExamen: number;
  idUsuario: number;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  puntaje: number | string | null;
  es_aprobado: boolean;
  usuario: {
    idUsuario: number;
    nombre: string;
    apellidos: string;
  };
  examen: {
    idExamen: number;
    titulo: string;
  };
  postulacion?: Postulacion | null;
  respuestas?: RespuestaIntento[];
  resultados_subpruebas?: ResultadoSubprueba[];
}

const ResultadosAdmin: React.FC = () => {
  const { token } = useAuth();
  const [intentos, setIntentos] = useState<Intento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    search_examen: '',
    search_usuario: '',
    fecha_desde: '',
    fecha_hasta: '',
  });
  const [mostrarDetalle, setMostrarDetalle] = useState<Intento | null>(null);
  const [paginacion, setPaginacion] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0
  });
  const [page, setPage] = useState(1);


  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [filtros.search_examen, filtros.search_usuario, filtros.fecha_desde, filtros.fecha_hasta]);

  const cargarIntentos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.search_examen) params.append('search_examen', filtros.search_examen);
      if (filtros.search_usuario) params.append('search_usuario', filtros.search_usuario);
      if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
      params.append('per_page', '10');
      params.append('page', String(page));

      const response = await fetch(`/api/v1/admin/resultados?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const intentosData = data.data || data;
        setIntentos(intentosData);
        if (data.current_page) {
          setPaginacion({
            current_page: data.current_page,
            last_page: data.last_page,
            per_page: data.per_page,
            total: data.total,
            from: data.from || 0,
            to: data.to || 0
          });
        }
      }
    } catch {
      // Error al cargar intentos, se ignora silenciosamente
      // Mantener el estado actual si falla la carga
      setIntentos([]);
    } finally {
      setLoading(false);
    }
  }, [token, filtros, page]);

  useEffect(() => {
    cargarIntentos();
  }, [cargarIntentos]);

  const exportarCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.search_examen) params.append('search_examen', filtros.search_examen);
      if (filtros.search_usuario) params.append('search_usuario', filtros.search_usuario);
      if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);

      const response = await fetch(`/api/v1/admin/resultados/exportar/csv?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Obtener el nombre del archivo del header Content-Disposition que envía el servidor
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch) {
            a.download = filenameMatch[1];
          }
        }

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch {
      // Error al exportar, se ignora silenciosamente
      // No se muestra error al usuario para no interrumpir el flujo
    }
  };

  const verDetalle = async (intento: Intento) => {
    try {
      const response = await fetch(`/api/v1/admin/resultados/${intento.idIntento}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMostrarDetalle({
          ...intento,
          ...data.intento,
          respuestas: data.respuestas || intento.respuestas,
          resultados_subpruebas: data.resultados_subpruebas || []
        });
      }
    } catch {
      // Error al cargar detalle, se ignora silenciosamente
      // Mantener el estado actual si falla la carga
      setMostrarDetalle(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Resultados</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Gestión de resultados de exámenes</p>
          </div>
          <button
            onClick={exportarCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base w-full sm:w-auto"
          >
            Exportar CSV
          </button>
        </div>

        {/* RF-A.5.2: Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Filtros</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Examen</label>
              <input
                type="text"
                value={filtros.search_examen}
                onChange={(e) => setFiltros({ ...filtros, search_examen: e.target.value })}
                placeholder="Buscar por código de examen..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
              <input
                type="text"
                value={filtros.search_usuario}
                onChange={(e) => setFiltros({ ...filtros, search_usuario: e.target.value })}
                placeholder="Buscar por nombre o apellidos..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Desde</label>
              <input
                type="date"
                value={filtros.fecha_desde}
                onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Hasta</label>
              <input
                type="date"
                value={filtros.fecha_hasta}
                onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* RF-A.5.1: Tabla de Intentos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Vista de tabla para pantallas grandes */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Examen</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Fin</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puntaje</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 xl:px-6 py-4 text-center">Cargando...</td>
                  </tr>
                ) : intentos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 xl:px-6 py-4 text-center">No hay resultados</td>
                  </tr>
                ) : (
                  intentos.map((intento) => (
                    <tr key={intento.idIntento}>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {intento.idIntento}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {intento.usuario?.nombre} {intento.usuario?.apellidos}
                      </td>
                      <td className="px-4 xl:px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={intento.examen?.titulo}>
                        {intento.examen?.titulo}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {intento.hora_fin}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const puntaje = typeof intento.puntaje === 'number'
                            ? intento.puntaje
                            : parseFloat(String(intento.puntaje || 0));
                          return isNaN(puntaje) ? '0.00' : puntaje.toFixed(2);
                        })()}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            intento.es_aprobado
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {intento.es_aprobado ? 'Aprobado' : 'No Aprobado'}
                        </span>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => verDetalle(intento)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Vista de tarjetas para pantallas pequeñas y medianas */}
          <div className="lg:hidden">
            {loading ? (
              <div className="p-6 text-center">Cargando...</div>
            ) : intentos.length === 0 ? (
              <div className="p-6 text-center">No hay resultados</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {intentos.map((intento) => (
                  <div key={intento.idIntento} className="p-4 sm:p-6 hover:bg-gray-50">
                    <div className="flex flex-col space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-1">ID: {intento.idIntento}</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {intento.usuario?.nombre} {intento.usuario?.apellidos}
                          </p>
                        </div>
                        <span
                          className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                            intento.es_aprobado
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {intento.es_aprobado ? 'Aprobado' : 'No Aprobado'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Examen</p>
                        <p className="text-sm text-gray-900 line-clamp-2">{intento.examen?.titulo}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Fecha Fin</p>
                          <p className="text-gray-900">{intento.hora_fin}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Puntaje</p>
                          <p className="text-gray-900 font-semibold">
                            {(() => {
                              const puntaje = typeof intento.puntaje === 'number'
                                ? intento.puntaje
                                : parseFloat(String(intento.puntaje || 0));
                              return isNaN(puntaje) ? '0.00' : puntaje.toFixed(2);
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => verDetalle(intento)}
                          className="text-sm text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Ver Detalle →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Paginación */}
          {paginacion.total > 0 && (
            <div className="px-3 sm:px-4 xl:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                  Mostrando {paginacion.from} a {paginacion.to} de {paginacion.total} resultados
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={paginacion.current_page === 1 || loading}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Anterior
                  </button>
                  <span className="text-xs sm:text-sm text-gray-700">
                    Página {paginacion.current_page} de {paginacion.last_page}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(paginacion.last_page, p + 1))}
                    disabled={paginacion.current_page === paginacion.last_page || loading}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Detalle */}
        {mostrarDetalle && (
          <div className="modal-overlay-banco backdrop-blur-md bg-black/30 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Detalle del Intento</h2>
                <button
                  onClick={() => setMostrarDetalle(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              {/* Información de Postulación */}
              {mostrarDetalle.postulacion && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600 mb-1">Postulación seleccionada:</p>
                  <p className="text-lg font-semibold text-gray-900">{mostrarDetalle.postulacion.nombre}</p>
                  {mostrarDetalle.postulacion.descripcion && (
                    <p className="text-sm text-gray-600 mt-2">{mostrarDetalle.postulacion.descripcion}</p>
                  )}
                </div>
              )}

              {/* Card de Resultado General */}
              <div className={`bg-white rounded-lg shadow-sm p-6 mb-6 border-2 ${
                mostrarDetalle.es_aprobado ? 'border-green-500' : 'border-red-500'
              }`}>
                <div className="text-center">
                  <h3 className={`text-3xl font-bold mb-6 ${
                    mostrarDetalle.es_aprobado ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {mostrarDetalle.es_aprobado ? 'APROBADO' : 'NO APROBADO'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Puntaje Obtenido</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {(() => {
                          const puntaje = typeof mostrarDetalle.puntaje === 'number'
                            ? mostrarDetalle.puntaje
                            : parseFloat(String(mostrarDetalle.puntaje || 0));
                          return isNaN(puntaje) ? '0.00' : puntaje.toFixed(2);
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Puntaje Mínimo Requerido</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {(() => {
                          const puntajeMinimo = mostrarDetalle.resultados_subpruebas?.reduce((sum, r) => {
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
                          const puntajeMaximo = mostrarDetalle.resultados_subpruebas?.reduce((sum, r) => {
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
              {mostrarDetalle.resultados_subpruebas && mostrarDetalle.resultados_subpruebas.length > 0 && (
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Resultados por Subprueba</h4>
                  <div className="space-y-4">
                    {mostrarDetalle.resultados_subpruebas.map((resultado) => (
                      <div key={resultado.idResultado} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="text-base font-medium text-gray-900">
                            {resultado.subprueba?.nombre || `Subprueba ${resultado.idSubprueba}`}
                          </h5>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            resultado.es_aprobado
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {resultado.es_aprobado ? 'Aprobado' : 'No Aprobado'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-600">Puntaje Obtenido</p>
                            <p className="text-base font-semibold text-gray-900">
                              {(() => {
                                const puntaje = typeof resultado.puntaje_obtenido === 'number'
                                  ? resultado.puntaje_obtenido
                                  : parseFloat(String(resultado.puntaje_obtenido || 0));
                                return isNaN(puntaje) ? '0.00' : puntaje.toFixed(2);
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Puntaje Máximo</p>
                            <p className="text-base font-semibold text-blue-600">
                              {(() => {
                                const puntaje = typeof resultado.puntaje_maximo === 'number'
                                  ? resultado.puntaje_maximo
                                  : parseFloat(String(resultado.puntaje_maximo || 0));
                                return isNaN(puntaje) ? '0.00' : puntaje.toFixed(2);
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Preguntas Correctas</p>
                            <p className="text-base font-semibold text-green-600">
                              {resultado.preguntas_correctas ?? 0} / {resultado.total_preguntas ?? 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Puntaje Mínimo Requerido</p>
                            <p className="text-base font-semibold text-gray-900">
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
              <div className="space-y-6">
                {mostrarDetalle.respuestas?.map((resp, idx) => {
                  const esCorrecta = resp.opcionSeleccionada?.es_correcta || false;

                  return (
                    <div key={resp.idRespuesta || idx} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <p className="font-semibold text-base sm:text-lg text-gray-900 mb-3">
                        Pregunta {idx + 1}
                      </p>
                      <ContenidoHTML
                        html={resp.enunciado || 'Sin enunciado'}
                        className="text-sm sm:text-base text-gray-700 mt-2 mb-4 prose prose-sm max-w-none"
                      />
                      <div className={`mt-4 p-4 rounded-lg ${
                        esCorrecta
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Todas las opciones de la pregunta:</p>
                        <div className="space-y-2">
                          {resp.opciones?.map((opcion, index: number) => {
                            // Comparar IDs numéricos para asegurar la comparación correcta
                            const esSeleccionada = resp.opcionSeleccionada &&
                              Number(opcion.idOpcion) === Number(resp.opcionSeleccionada.idOpcion);
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
                                      className="text-sm sm:text-base font-medium text-gray-900"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                    {esSeleccionada && (
                                      <span className={`text-xs font-semibold whitespace-nowrap ${
                                        esCorrectaOpcion ? 'text-green-700' : 'text-red-700'
                                      }`}>
                                        {esCorrectaOpcion ? '✓ Respuesta del usuario' : '✗ Respuesta del usuario'}
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
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultadosAdmin;

