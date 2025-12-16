import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examenesService } from '../../../services/examenesService';
import { Card } from '@/components/ui/card';

/**
 * Componente de redirección para creación/edición de exámenes
 *
 * Este componente redirige automáticamente al wizard para evitar conflictos
 * entre el formulario tradicional y el wizard. Todo se maneja ahora en el wizard.
 */
const FormularioExamen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && !isNaN(parseInt(id || '')));

  useEffect(() => {
    const redirigir = async () => {
      if (!isEditing) {
        // Creación: crear examen básico y redirigir al wizard
        try {
          const response = await examenesService.admin.createExamenBasico();
          const examenId = response.data.idExamen || response.data.id;
          if (examenId) {
            navigate(`/admin/examenes/${examenId}/wizard`, { replace: true });
          } else {
            navigate('/admin/examenes', { replace: true });
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Error al crear el examen.';
          alert(errorMessage);
          navigate('/admin/examenes', { replace: true });
        }
      } else if (id && !isNaN(parseInt(id))) {
        // Edición: redirigir directamente al wizard
        navigate(`/admin/examenes/${id}/wizard`, { replace: true });
      } else {
        // ID inválido
        navigate('/admin/examenes', { replace: true });
      }
    };

    redirigir();
  }, [isEditing, id, navigate]);

  // Mostrar mensaje de carga mientras redirige
  return (
    <Card>
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isEditing ? 'Redirigiendo al wizard de edición...' : 'Creando examen y redirigiendo al wizard...'}
          </h2>
          <p className="text-gray-600">
            Por favor, espere un momento.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default FormularioExamen;
