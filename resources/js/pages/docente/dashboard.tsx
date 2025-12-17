import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface Examen {
  idExamen: number;
  titulo: string;
  descripcion: string;
  tiempo_limite: number;
  tipo_acceso: string;
  total_preguntas?: number;
  tipoConcurso?: {
    nombre: string;
  };
  id?: number;
}

const DocenteDashboard: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarExamenes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/docente/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExamenes(data);
      }
    } catch {
      // Ignorar errores al cargar exámenes
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarExamenes();
  }, [cargarExamenes]);

  const iniciarExamen = (examen: Examen) => {
    // RF-D.2.1: Navegar a la página de detalle donde se mostrará el modal para seleccionar escala
    navigate(`/docente/examenes/${examen.idExamen || examen.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Exámenes Disponibles</h1>
              <p className="text-gray-600 mt-2">Seleccione un examen para comenzar</p>
            </div>
            {/* Contador de exámenes disponibles */}
            <div className="bg-blue-100 border-2 border-blue-300 rounded-lg px-6 py-4 text-center">
              <div className="text-3xl font-bold text-blue-700">{examenes.length}</div>
              <div className="text-sm text-blue-600 font-medium mt-1">
                {examenes.length === 1 ? 'Examen disponible' : 'Exámenes disponibles'}
              </div>
            </div>
          </div>
        </div>

        {/* RF-D.1.2: Cuadrícula de tarjetas de exámenes */}
        {loading ? (
          <div className="text-center py-12">Cargando exámenes...</div>
        ) : examenes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No hay exámenes disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {examenes.map((examen) => (
              <div
                key={examen.idExamen}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{examen.titulo}</h3>
                  {examen.tipoConcurso && (
                    <p className="text-sm text-gray-500 mb-2">{examen.tipoConcurso.nombre}</p>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-3">{examen.descripcion}</p>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium mr-2">📝</span>
                    <span>{examen.total_preguntas || 0} pregunta{(examen.total_preguntas || 0) !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>⏱️ {examen.tiempo_limite} minutos</span>
                    <span className={`px-2 py-1 rounded ${examen.tipo_acceso === 'publico' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {examen.tipo_acceso === 'publico' ? 'Público' : 'Privado'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => iniciarExamen(examen)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ver Detalles
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocenteDashboard;

