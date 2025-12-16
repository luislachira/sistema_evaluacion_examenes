import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import clienteApi from '../../api/clienteApi';
import { Card } from '@/components/ui/card';

interface Intento {
  idIntento: number;
  idExamen: number;
  hora_inicio: string;
  hora_fin: string;
  puntaje: number | null;
  es_aprobado: boolean;
  examen: {
    idExamen: number;
    titulo: string;
    codigo_examen?: string;
  } | null;
}

const HistorialDocente: React.FC = () => {
  const navigate = useNavigate();
  const [intentos, setIntentos] = useState<Intento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'aprobados' | 'no_aprobados'>('todos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clienteApi.get('/docente/historial');
      const datos = Array.isArray(response.data) ? response.data : [];
      setIntentos(datos);
    } catch {
      setError('Error al cargar el historial de intentos');
    } finally {
      setLoading(false);
    }
  };

  const verResultado = (intento: Intento) => {
    navigate(`/docente/intentos/${intento.idIntento}/resultado`);
  };

  // Filtrar intentos
  const intentosFiltrados = intentos.filter(intento => {
    // Filtro por estado
    if (filtroEstado === 'aprobados' && !intento.es_aprobado) return false;
    if (filtroEstado === 'no_aprobados' && intento.es_aprobado) return false;

    // Filtro por búsqueda
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      const tituloExamen = intento.examen?.titulo?.toLowerCase() || '';
      const codigoExamen = intento.examen?.codigo_examen?.toLowerCase() || '';
      if (!tituloExamen.includes(busquedaLower) && !codigoExamen.includes(busquedaLower)) {
        return false;
      }
    }

    return true;
  });


  // Calcular estadísticas
  const estadisticas = {
    total: intentos.length,
    aprobados: intentos.filter(i => i.es_aprobado).length,
    no_aprobados: intentos.filter(i => !i.es_aprobado).length,
    promedio: intentos.length > 0
      ? intentos.reduce((sum, i) => {
          const puntaje = typeof i.puntaje === 'number' ? i.puntaje : parseFloat(String(i.puntaje || 0));
          return sum + (isNaN(puntaje) ? 0 : puntaje);
        }, 0) / intentos.length
      : 0,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Historial de Resultados</h1>
          <p className="text-gray-600 mt-2">Revisa tus exámenes realizados y sus resultados</p>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Intentos</p>
                <p className="text-3xl font-bold mt-2">{estadisticas.total}</p>
              </div>
              <div className="text-4xl opacity-50">📊</div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Aprobados</p>
                <p className="text-3xl font-bold mt-2">{estadisticas.aprobados}</p>
                <p className="text-green-100 text-xs mt-1">
                  {estadisticas.total > 0 ? ((estadisticas.aprobados / estadisticas.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="text-4xl opacity-50">✅</div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">No Aprobados</p>
                <p className="text-3xl font-bold mt-2">{estadisticas.no_aprobados}</p>
                <p className="text-red-100 text-xs mt-1">
                  {estadisticas.total > 0 ? ((estadisticas.no_aprobados / estadisticas.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="text-4xl opacity-50">❌</div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Promedio</p>
                <p className="text-3xl font-bold mt-2">{estadisticas.promedio.toFixed(2)}</p>
                <p className="text-purple-100 text-xs mt-1">Puntos promedio</p>
              </div>
              <div className="text-4xl opacity-50">📈</div>
            </div>
          </Card>
        </div>

        {/* Filtros y Búsqueda */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Examen</label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por título o código..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'aprobados' | 'no_aprobados')}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todos</option>
                <option value="aprobados">Solo Aprobados</option>
                <option value="no_aprobados">Solo No Aprobados</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Tabla de Historial */}
        {error ? (
          <Card className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          </Card>
        ) : loading ? (
          <Card className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando resultados...</p>
          </Card>
        ) : intentosFiltrados.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {intentos.length === 0 ? 'No hay intentos registrados' : 'No se encontraron resultados'}
            </h3>
            <p className="text-gray-600">
              {intentos.length === 0
                ? 'Aún no has completado ningún examen'
                : 'Intenta ajustar los filtros de búsqueda'}
            </p>
            {intentos.length === 0 && (
              <Link
                to="/docente/examenes"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ver Exámenes Disponibles
              </Link>
            )}
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Examen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Finalización
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Puntaje
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {intentosFiltrados.length > 0 ? (
                    intentosFiltrados.map((intento) => (
                    <tr key={intento.idIntento} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {intento.examen?.titulo || 'Sin título'}
                          </div>
                          {intento.examen?.codigo_examen && (
                            <div className="text-xs text-gray-500 mt-1">
                              Código: {intento.examen.codigo_examen}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {intento.hora_fin}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {(() => {
                            const puntaje = typeof intento.puntaje === 'number'
                              ? intento.puntaje
                              : parseFloat(String(intento.puntaje || 0));
                            return isNaN(puntaje) ? '0.00' : puntaje.toFixed(2);
                          })()} pts
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            intento.es_aprobado
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {intento.es_aprobado ? '✅ Aprobado' : '❌ No Aprobado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => verResultado(intento)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No hay resultados para mostrar
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default HistorialDocente;
