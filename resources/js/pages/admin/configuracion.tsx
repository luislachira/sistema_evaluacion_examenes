import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useAuth } from '../../hooks/useAuth';

const ConfiguracionAdmin: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [configuracion, setConfiguracion] = useState({
    notificaciones_email: true,
    notificaciones_sistema: true,
    exportar_automatico: false,
    tiempo_limite_default: 180,
    paginacion_default: 10,
  });

  useEffect(() => {
    // Cargar configuración guardada (si existe en el backend)
    // Por ahora usamos valores por defecto
  }, []);

  const handleChange = (key: string, value: boolean | number) => {
    setConfiguracion(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Aquí se guardaría la configuración en el backend
      // Por ahora solo simulamos el guardado
      await new Promise(resolve => setTimeout(resolve, 500));

      setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-600 mt-2">Gestiona las opciones y preferencias del sistema</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Configuración General */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuración General</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Tiempo Límite por Defecto (minutos)</label>
                <p className="text-xs text-gray-500 mt-1">Tiempo predeterminado para nuevos exámenes</p>
              </div>
              <input
                type="number"
                min="30"
                max="600"
                step="15"
                value={configuracion.tiempo_limite_default}
                onChange={(e) => handleChange('tiempo_limite_default', parseInt(e.target.value))}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-center"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Paginación por Defecto</label>
                <p className="text-xs text-gray-500 mt-1">Número de elementos por página</p>
              </div>
              <select
                value={configuracion.paginacion_default}
                onChange={(e) => handleChange('paginacion_default', parseInt(e.target.value))}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Notificaciones */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notificaciones</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Notificaciones por Email</label>
                <p className="text-xs text-gray-500 mt-1">Recibir notificaciones importantes por correo</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={configuracion.notificaciones_email}
                  onChange={(e) => handleChange('notificaciones_email', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Notificaciones del Sistema</label>
                <p className="text-xs text-gray-500 mt-1">Mostrar notificaciones en el panel</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={configuracion.notificaciones_sistema}
                  onChange={(e) => handleChange('notificaciones_sistema', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Exportación */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Exportación de Datos</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Exportación Automática</label>
                <p className="text-xs text-gray-500 mt-1">Exportar resultados automáticamente al finalizar exámenes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={configuracion.exportar_automatico}
                  onChange={(e) => handleChange('exportar_automatico', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Información del Sistema */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Información del Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Versión del Sistema:</span>
              <span className="ml-2 font-medium text-gray-900">1.0.0</span>
            </div>
            <div>
              <span className="text-gray-600">Usuario Actual:</span>
              <span className="ml-2 font-medium text-gray-900">
                {user?.nombre} {user?.apellidos}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Rol:</span>
              <span className="ml-2 font-medium text-gray-900">Administrador</span>
            </div>
            <div>
              <span className="text-gray-600">Última Actualización:</span>
              <span className="ml-2 font-medium text-gray-900">
                {new Date().toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>
          
          {/* Información del Desarrollador */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Desarrollador del Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Nombre:</span>
                <span className="ml-2 font-medium text-gray-900">Luis Lachira Nima</span>
              </div>
              <div>
                <span className="text-gray-600">Correo:</span>
                <a 
                  href="mailto:luislachiraofi1@gmail.com" 
                  className="ml-2 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  luislachiraofi1@gmail.com
                </a>
              </div>
              <div>
                <span className="text-gray-600">GitHub:</span>
                <a 
                  href="https://github.com/luislachira" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  luislachira
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* Botón Guardar */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionAdmin;

