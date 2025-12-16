import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { examenesService } from '../../../services/examenesService';
import type { Examen } from '../../../types/examenes';

const ExamenesDocente: React.FC = () => {
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paginacion, setPaginacion] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0
  });
  const [page, setPage] = useState(1);

  const loadExamenes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await examenesService.docente.getExamenesDisponibles(page, 10);

      setExamenes(response.data || []);

      // Calcular el total: usar response.total si está disponible, sino contar los datos
      const totalExamenes = response.total !== undefined
        ? response.total
        : (Array.isArray(response.data) ? response.data.length : 0);

      setPaginacion({
        current_page: response.current_page || 1,
        last_page: response.last_page || 1,
        per_page: response.per_page || 10,
        total: totalExamenes,
        from: response.from || 0,
        to: response.to || 0
      });
    } catch (err: unknown) {
      const errorMessage = (err && typeof err === 'object' && 'response' in err &&
        err.response && typeof err.response === 'object' && 'data' in err.response &&
        err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data &&
        typeof err.response.data.message === 'string')
        ? err.response.data.message
        : 'Error al cargar los exámenes disponibles';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadExamenes();
  }, [loadExamenes]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Exámenes de Ascenso</h1>
              <p className="text-gray-600 mt-2">
                Selecciona un examen para comenzar. Asegúrate de tener tiempo suficiente antes de iniciar.
              </p>
            </div>
            {/* Contador de exámenes disponibles */}
            <div className="bg-blue-100 border-2 border-blue-300 rounded-lg px-6 py-4 text-center min-w-[140px]">
              <div className="text-3xl font-bold text-blue-700">
                {loading ? '...' : (paginacion.total || 0)}
              </div>
              <div className="text-sm text-blue-600 font-medium mt-1">
                {loading
                  ? 'Cargando...'
                  : (paginacion.total === 1 ? 'Examen disponible' : 'Exámenes disponibles')
                }
              </div>
            </div>
          </div>
        </div>

        {/* Mostrar error si existe */}
        {error && (
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}

        {/* Mostrar loading spinner si está cargando */}
        {loading && (
          <div className="flex justify-center items-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Lista de exámenes - Solo mostrar si no está cargando */}
        {!loading && (
          <>
            {examenes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay exámenes disponibles</h3>
                <p className="text-gray-600">
                  No tienes exámenes pendientes en este momento. Revisa más tarde o contacta con el administrador.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {examenes.map((examen) => {
                  const estadoVisual = examenesService.utils.getEstadoVisual(examen);
                  const estaDisponible = examenesService.utils.estaDisponible(examen);

                  return (
                    <Link
                      key={examen.id}
                      to={`/docente/examenes/${examen.id}/detalle`}
                      className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 block ${
                        estaDisponible
                          ? 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
                          : 'border-gray-100 opacity-75 cursor-not-allowed'
                      }`}
                    >
                      <div className="p-6">
                        {/* Estado y tipo */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              estadoVisual.color === 'success' ? 'bg-green-100 text-green-800' :
                              estadoVisual.color === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              estadoVisual.color === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {estadoVisual.icono} {estadoVisual.texto}
                            </span>
                            {examen.tipoConcurso && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {examen.tipoConcurso.nombre}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Título */}
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {examen.titulo}
                        </h3>

                        {/* Información esencial */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">📝</span>
                            <span>{examen.total_preguntas || 0} pregunta{examen.total_preguntas !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">⏱️</span>
                            <span>
                              {examen.duracion_minutos !== undefined
                                ? examenesService.utils.formatearDuracion(examen.duracion_minutos)
                                : examenesService.utils.formatearDuracion(examen.tiempo_limite)}
                            </span>
                          </div>
                        </div>

                        {/* Botón de acción */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className={`text-center px-4 py-2 rounded-lg font-medium text-sm ${
                            estaDisponible
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-50 text-gray-500'
                          }`}>
                            {estaDisponible ? 'Ver detalles →' : 'No disponible'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

      {/* Información adicional */}
      {examenes.length > 0 && (
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Importante</h3>
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
      )}

      {/* Paginación */}
      {paginacion.total > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {paginacion.from} a {paginacion.to} de {paginacion.total} resultados
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={paginacion.current_page === 1 || loading}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-700">
                Página {paginacion.current_page} de {paginacion.last_page}
              </span>
              <button
                onClick={() => setPage(p => Math.min(paginacion.last_page, p + 1))}
                disabled={paginacion.current_page === paginacion.last_page || loading}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ExamenesDocente;
