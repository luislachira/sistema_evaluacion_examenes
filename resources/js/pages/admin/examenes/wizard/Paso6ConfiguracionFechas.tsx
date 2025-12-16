import React, { useState, useEffect } from 'react';
import { examenesService } from '../../../../services/examenesService';
import type { Examen, DatosPaso6 } from '../../../../types/examenes';
import type { AxiosErrorResponse } from '../../../../types/errors';

interface Props {
  examenId: number;
  examen: Examen;
  datosPaso?: DatosPaso6 | null;
  soloLectura?: boolean;
  onCompletado: () => void;
  onSiguiente: () => void;
  onVolver: () => void;
}

const Paso6ConfiguracionFechas: React.FC<Props> = ({
  examenId,
  examen,
  datosPaso,
  soloLectura = false,
  onCompletado,
  onSiguiente,
  onVolver
}) => {
  const [formData, setFormData] = useState({
    fecha_inicio_vigencia: '',
    fecha_fin_vigencia: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Función para convertir fecha a formato datetime-local
  // Maneja formatos: ISO (2025-11-18T14:30:00), d-m-Y H:i (18-11-2025 14:30), y otros
  const convertirFechaADatetimeLocal = (fecha: string | null | undefined): string => {
    if (!fecha) return '';

    try {
      let fechaObj: Date | null = null;

      // Intentar detectar el formato d-m-Y H:i (18-11-2025 14:30)
      const formatoDMY = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::\d{2})?$/;
      const matchDMY = fecha.match(formatoDMY);
      
      if (matchDMY) {
        // Formato d-m-Y H:i encontrado
        const dia = parseInt(matchDMY[1], 10);
        const mes = parseInt(matchDMY[2], 10) - 1; // Los meses en Date son 0-indexed
        const año = parseInt(matchDMY[3], 10);
        const horas = parseInt(matchDMY[4], 10);
        const minutos = parseInt(matchDMY[5], 10);
        
        fechaObj = new Date(año, mes, dia, horas, minutos);
      } else {
        // Intentar parsear como ISO o cualquier otro formato
        fechaObj = new Date(fecha);
      }

      // Verificar que la fecha sea válida
      if (!fechaObj || isNaN(fechaObj.getTime())) {
        return '';
      }

      // Obtener año, mes, día, hora y minutos en la zona horaria local
      const año = fechaObj.getFullYear();
      const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
      const dia = String(fechaObj.getDate()).padStart(2, '0');
      const horas = String(fechaObj.getHours()).padStart(2, '0');
      const minutos = String(fechaObj.getMinutes()).padStart(2, '0');

      // Formato: yyyy-MM-ddThh:mm
      return `${año}-${mes}-${dia}T${horas}:${minutos}`;
    } catch {
      return '';
    }
  };

  // Actualizar formData cuando cambie el examen o datosPaso
  useEffect(() => {
    if (datosPaso && datosPaso.fecha_inicio_vigencia !== undefined && datosPaso.fecha_fin_vigencia !== undefined) {
      // Usar datos del paso cargado desde el wizard
      const fechaInicio = convertirFechaADatetimeLocal(datosPaso.fecha_inicio_vigencia);
      const fechaFin = convertirFechaADatetimeLocal(datosPaso.fecha_fin_vigencia);
      setFormData({
        fecha_inicio_vigencia: fechaInicio,
        fecha_fin_vigencia: fechaFin,
      });
    } else if (examen && (examen.fecha_inicio_vigencia || examen.fecha_fin_vigencia)) {
      // Si no hay datosPaso o no tiene fechas, usar datos del examen
      setFormData({
        fecha_inicio_vigencia: convertirFechaADatetimeLocal(examen.fecha_inicio_vigencia),
        fecha_fin_vigencia: convertirFechaADatetimeLocal(examen.fecha_fin_vigencia),
      });
    }
  }, [examen, datosPaso]);

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!formData.fecha_inicio_vigencia) {
      nuevosErrores.fecha_inicio_vigencia = 'La fecha de inicio es obligatoria';
    }

    if (!formData.fecha_fin_vigencia) {
      nuevosErrores.fecha_fin_vigencia = 'La fecha de fin es obligatoria';
    }

    if (formData.fecha_inicio_vigencia && formData.fecha_fin_vigencia) {
      const fechaInicio = new Date(formData.fecha_inicio_vigencia);
      const fechaFin = new Date(formData.fecha_fin_vigencia);

      if (fechaFin <= fechaInicio) {
        nuevosErrores.fecha_fin_vigencia = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }

      const diferenciaAnios = (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (diferenciaAnios > 2) {
        nuevosErrores.fecha_fin_vigencia = 'El rango de fechas no puede exceder 2 años';
      }

      // Validar que la diferencia entre fechas sea al menos igual al tiempo límite del examen
      if (examen && examen.tiempo_limite) {
        const diferenciaMinutos = (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60);
        if (diferenciaMinutos < examen.tiempo_limite) {
          nuevosErrores.fecha_fin_vigencia = `La diferencia entre la fecha de inicio y fin de vigencia (${Math.round(diferenciaMinutos)} minutos) debe ser al menos igual al tiempo límite del examen (${examen.tiempo_limite} minutos)`;
        }
      }
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      // Actualizar el examen con las fechas
      await examenesService.admin.updateExamen(examenId, {
        fecha_inicio_vigencia: formData.fecha_inicio_vigencia,
        fecha_fin_vigencia: formData.fecha_fin_vigencia,
        estado: '0', // Mantener en borrador
      });

      // Marcar paso como completado
      await examenesService.admin.actualizarPaso(examenId, 6);

      // Esperar a que se complete la actualización antes de continuar
      await onCompletado();

      // Pequeño delay para asegurar que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 300));

      onSiguiente();
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      setErrors({
        general: axiosError.response?.data?.message || 'Error al guardar las fechas de vigencia'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          PASO 6: Configuración de Fechas de Vigencia
        </h2>
        <p className="text-sm text-gray-600">
          Configure las fechas de inicio y fin de vigencia del examen. El examen permanecerá en estado Borrador hasta que complete todos los pasos anteriores.
        </p>
      </div>

      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Fechas de Vigencia */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio de Vigencia <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.fecha_inicio_vigencia}
                onChange={(e) => setFormData({ ...formData, fecha_inicio_vigencia: e.target.value })}
                disabled={soloLectura}
                className={`w-full px-3 py-2 border rounded-md ${errors.fecha_inicio_vigencia ? 'border-red-500' : 'border-gray-300'} ${soloLectura ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {errors.fecha_inicio_vigencia && (
                <p className="mt-1 text-sm text-red-600">{errors.fecha_inicio_vigencia}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Fecha y hora en que el examen estará disponible
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin de Vigencia <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.fecha_fin_vigencia}
                onChange={(e) => setFormData({ ...formData, fecha_fin_vigencia: e.target.value })}
                disabled={soloLectura}
                className={`w-full px-3 py-2 border rounded-md ${errors.fecha_fin_vigencia ? 'border-red-500' : 'border-gray-300'} ${soloLectura ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {errors.fecha_fin_vigencia && (
                <p className="mt-1 text-sm text-red-600">{errors.fecha_fin_vigencia}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Fecha y hora en que el examen dejará de estar disponible
              </p>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Información importante</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• El examen permanecerá en estado <strong>Borrador</strong> hasta que complete todos los pasos.</li>
              <li>• Una vez completado el wizard, el examen se publicará automáticamente cuando llegue la fecha de inicio.</li>
              <li>• El rango de fechas no puede exceder 2 años.</li>
              <li>• La fecha de fin debe ser posterior a la fecha de inicio.</li>
              {examen && examen.tiempo_limite && (
                <li>• La diferencia entre la fecha de inicio y fin de vigencia debe ser al menos igual al tiempo límite del examen ({examen.tiempo_limite} minutos).</li>
              )}
            </ul>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <button
            type="button"
            onClick={onVolver}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← Anterior
          </button>
          <button
            type="submit"
            disabled={loading || soloLectura}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Finalizar Configuración ✓'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Paso6ConfiguracionFechas;

