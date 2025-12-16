import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import clienteApi from '../../api/clienteApi';
import { Card } from '@/components/ui/card';

interface DashboardStats {
  estadisticas: {
    total_usuarios: number;
    usuarios_activos: number;
    total_examenes: number;
    examenes_publicados: number;
    examenes_borrador: number;
    examenes_finalizados: number;
    total_preguntas: number;
    total_intentos: number;
    intentos_completados: number;
    intentos_en_progreso: number;
  };
  intentos_por_dia: Array<{ fecha: string; total: number }>;
  tasa_aprobacion: {
    aprobados: number;
    no_aprobados: number;
    total: number;
    porcentaje_aprobacion: number;
  };
  examenes_por_estado: {
    borrador: number;
    publicados: number;
    finalizados: number;
  };
  promedio_puntaje_global: number;
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'];

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clienteApi.get('/admin/dashboard');
      setStats(response.data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const errorMessage = axiosError?.response?.data?.message || axiosError?.message || 'Error al cargar las estadísticas del dashboard';

      // Si es un error 403, indicar que no tiene permisos
      if (axiosError?.response?.status === 403) {
        setError('No tienes permisos para acceder a esta sección. Por favor, inicia sesión como administrador.');
      } else if (axiosError?.response?.status === 401) {
        setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error || 'No se pudieron cargar las estadísticas'}
      </div>
    );
  }

  // Preparar datos para gráficos
  const datosAprobacion = [
    { name: 'Aprobados', value: stats.tasa_aprobacion.aprobados },
    { name: 'No Aprobados', value: stats.tasa_aprobacion.no_aprobados },
  ];

  const datosExamenesEstado = [
    { name: 'Borrador', value: stats.examenes_por_estado.borrador },
    { name: 'Publicados', value: stats.examenes_por_estado.publicados },
    { name: 'Finalizados', value: stats.examenes_por_estado.finalizados },
  ];

  // Formatear fechas para el gráfico de línea
  const datosIntentosPorDia = stats.intentos_por_dia.map(item => ({
    fecha: new Date(item.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    total: item.total,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
          <p className="text-gray-600 mt-2">Resumen general del sistema</p>
        </div>

        {/* Tarjetas de Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Usuarios</p>
                <p className="text-3xl font-bold mt-2">{stats.estadisticas.total_usuarios}</p>
                <p className="text-blue-100 text-xs mt-1">{stats.estadisticas.usuarios_activos} activos</p>
              </div>
              <div className="text-4xl opacity-50">👥</div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Exámenes</p>
                <p className="text-3xl font-bold mt-2">{stats.estadisticas.total_examenes}</p>
                <p className="text-green-100 text-xs mt-1">
                  {stats.estadisticas.examenes_publicados} publicados
                </p>
              </div>
              <div className="text-4xl opacity-50">📝</div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Preguntas</p>
                <p className="text-3xl font-bold mt-2">{stats.estadisticas.total_preguntas}</p>
                <p className="text-purple-100 text-xs mt-1">En banco de preguntas</p>
              </div>
              <div className="text-4xl opacity-50">❓</div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Total Intentos</p>
                <p className="text-3xl font-bold mt-2">{stats.estadisticas.total_intentos}</p>
                <p className="text-orange-100 text-xs mt-1">
                  {stats.estadisticas.intentos_completados} completados
                </p>
              </div>
              <div className="text-4xl opacity-50">📊</div>
            </div>
          </Card>
        </div>

        {/* Segunda fila de tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6 bg-white border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Exámenes en Borrador</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.estadisticas.examenes_borrador}</p>
              </div>
              <div className="text-3xl">📄</div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Exámenes Publicados</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.estadisticas.examenes_publicados}</p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Exámenes Finalizados</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.estadisticas.examenes_finalizados}</p>
              </div>
              <div className="text-3xl">🏁</div>
            </div>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Línea - Intentos por Día */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Intentos Completados (Últimos 30 días)</h2>
            {datosIntentosPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={datosIntentosPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Intentos" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No hay datos disponibles
              </div>
            )}
          </Card>

          {/* Gráfico de Dona - Tasa de Aprobación */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tasa de Aprobación</h2>
            {stats.tasa_aprobacion.total > 0 ? (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-gray-900">
                      {stats.tasa_aprobacion.porcentaje_aprobacion}%
                    </p>
                    <p className="text-sm text-gray-600">Tasa de aprobación</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={datosAprobacion}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {datosAprobacion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Aprobados: {stats.tasa_aprobacion.aprobados}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>No Aprobados: {stats.tasa_aprobacion.no_aprobados}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No hay datos disponibles
              </div>
            )}
          </Card>
        </div>

        {/* Gráfico de Barras - Exámenes por Estado */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Exámenes Creados (Últimos 7 días)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosExamenesEstado}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" name="Cantidad" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Estadísticas Adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Intentos en Progreso</h3>
            <div className="text-4xl font-bold text-indigo-600 mb-2">
              {stats.estadisticas.intentos_en_progreso}
            </div>
            <p className="text-sm text-gray-600">Exámenes actualmente en curso</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Promedio Global de Puntajes</h3>
            <div className="text-4xl font-bold text-yellow-600 mb-2">
              {stats.promedio_puntaje_global.toFixed(2)}
            </div>
            <p className="text-sm text-gray-600">Puntos promedio de todos los intentos completados</p>
          </Card>
        </div>

        {/* Accesos Rápidos */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/examenes"
              className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">📝</div>
                <div>
                  <p className="font-semibold text-gray-900">Gestión de Exámenes</p>
                  <p className="text-sm text-gray-600">Administrar exámenes del sistema</p>
                </div>
              </div>
            </Link>
            <Link
              to="/admin/usuarios"
              className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">👥</div>
                <div>
                  <p className="font-semibold text-gray-900">Gestión de Usuarios</p>
                  <p className="text-sm text-gray-600">Administrar usuarios del sistema</p>
                </div>
              </div>
            </Link>
            <Link
              to="/admin/resultados"
              className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">📊</div>
                <div>
                  <p className="font-semibold text-gray-900">Resultados</p>
                  <p className="text-sm text-gray-600">Ver resultados de exámenes</p>
                </div>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
