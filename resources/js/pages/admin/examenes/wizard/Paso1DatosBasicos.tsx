import React, { useState, useEffect } from 'react';
import { examenesService } from '../../../../services/examenesService';
import EditorTextoEnriquecido from '../../../../components/EditorTextoEnriquecido';
import type { Examen } from '../../../../types/examenes';
import type { AxiosErrorResponse } from '../../../../types/errors';

interface TipoConcurso {
  idTipoConcurso: number;
  nombre: string;
}

interface Props {
  examenId: number;
  examen: Examen;
  soloLectura?: boolean;
  onCompletado: () => void;
  onSiguiente: () => void;
  onVolver: () => void;
}

const Paso1DatosBasicos: React.FC<Props> = ({
  examenId,
  examen,
  soloLectura = false,
  onCompletado,
  onSiguiente,
  onVolver
}) => {
  // Inicializar formData con los datos del examen si están disponibles
  const [formData, setFormData] = useState(() => {
    if (examen) {
      return {
        codigo_examen: examen.codigo_examen || '',
        titulo: examen.titulo || '',
        idTipoConcurso: examen.idTipoConcurso ? String(examen.idTipoConcurso) : '',
        descripcion: examen.descripcion || '',
        tiempo_limite: examen.tiempo_limite || 270,
        tipo_acceso: (examen.tipo_acceso as 'publico' | 'privado') || 'publico',
      };
    }
    return {
      codigo_examen: '',
      titulo: '',
      idTipoConcurso: '',
      descripcion: '',
      tiempo_limite: 270,
      tipo_acceso: 'publico' as 'publico' | 'privado',
    };
  });

  // Actualizar formData cuando cambie el examen o el examenId
  useEffect(() => {
    if (examen && examen.idExamen) {
      const nuevosDatos = {
        codigo_examen: examen.codigo_examen || '',
        titulo: examen.titulo || '',
        idTipoConcurso: examen.idTipoConcurso ? String(examen.idTipoConcurso) : '',
        descripcion: examen.descripcion || '',
        tiempo_limite: examen.tiempo_limite || 270,
        tipo_acceso: (examen.tipo_acceso as 'publico' | 'privado') || 'publico',
      };

      setFormData(nuevosDatos);
    }
  }, [examen, examenId]);

  const [tiposConcurso, setTiposConcurso] = useState<TipoConcurso[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    cargarTiposConcurso();
  }, []);

  const cargarTiposConcurso = async () => {
    try {
      const data = await examenesService.admin.getCreateData();
      // Mapear id a idTipoConcurso para compatibilidad
      setTiposConcurso((data.tipo_concursos || []).map(tc => ({
        idTipoConcurso: (tc as { id?: number; idTipoConcurso?: number }).idTipoConcurso || (tc as { id?: number; idTipoConcurso?: number }).id || 0,
        nombre: tc.nombre
      })));
    } catch {
      // Error al cargar tipos de concurso, se ignora silenciosamente
      // Mantener el estado actual (tiposConcurso vacío) si falla la carga
      setTiposConcurso([]);
    }
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!formData.codigo_examen || formData.codigo_examen.trim().length === 0) {
      nuevosErrores.codigo_examen = 'El código del examen es obligatorio';
    }

    if (!formData.titulo || formData.titulo.length < 10 || formData.titulo.length > 255) {
      nuevosErrores.titulo = 'El título debe tener entre 10 y 255 caracteres';
    }

    if (!formData.idTipoConcurso) {
      nuevosErrores.idTipoConcurso = 'Debe seleccionar un tipo de concurso';
    }

    if (!formData.descripcion || formData.descripcion.length < 20 || formData.descripcion.length > 50000) {
      nuevosErrores.descripcion = 'La descripción debe tener entre 20 y 50,000 caracteres';
    }

    if (!formData.tiempo_limite || formData.tiempo_limite < 30 || formData.tiempo_limite > 600) {
      nuevosErrores.tiempo_limite = 'El tiempo límite debe estar entre 30 y 600 minutos';
    }

    // Las fechas de vigencia se configuran en el Paso 6

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
      // Actualizar el examen
      // IMPORTANTE: No enviar 'estado' para mantener el examen en borrador
      await examenesService.admin.updateExamen(examenId, {
        codigo_examen: formData.codigo_examen,
        titulo: formData.titulo,
        idTipoConcurso: parseInt(formData.idTipoConcurso as string),
        descripcion: formData.descripcion,
        tiempo_limite: formData.tiempo_limite,
        tipo_acceso: formData.tipo_acceso,
        estado: '0', // Mantener en borrador
      });

      // Marcar paso como completado
      await examenesService.admin.actualizarPaso(examenId, 1);
      onCompletado();
      onSiguiente();
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      setErrors({
        general: axiosError.response?.data?.message || 'Error al guardar los datos básicos'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          PASO 1: Datos Básicos del Examen
        </h2>
        <p className="text-sm text-gray-600">
          Complete todos los campos obligatorios para continuar al siguiente paso.
        </p>
      </div>

      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{errors.general}</p>
        </div>
      )}

      {soloLectura && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            ⚠️ Modo solo lectura: Este examen está publicado y no se puede editar. Para editarlo, debes finalizarlo primero (cambiar el estado a "Finalizado").
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Código del Examen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código del Examen <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.codigo_examen}
              onChange={(e) => setFormData({ ...formData, codigo_examen: e.target.value })}
              disabled={soloLectura}
              className={`w-full px-3 py-2 border rounded-md ${errors.codigo_examen ? 'border-red-500' : 'border-gray-300'} ${soloLectura ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="Ej: SIM-ASC-2024"
            />
            {errors.codigo_examen && (
              <p className="mt-1 text-sm text-red-600">{errors.codigo_examen}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Formato sugerido: XXX-XXX-YYYY (ej. SIM-ASC-2024)
            </p>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              disabled={soloLectura}
              className={`w-full px-3 py-2 border rounded-md ${errors.titulo ? 'border-red-500' : 'border-gray-300'} ${soloLectura ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="Ej: Simulacro Ascenso EPT 2024"
            />
            {errors.titulo && (
              <p className="mt-1 text-sm text-red-600">{errors.titulo}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Mínimo 10 caracteres, máximo 255 caracteres
            </p>
          </div>

          {/* Tipo de Concurso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Concurso <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.idTipoConcurso}
              onChange={(e) => setFormData({ ...formData, idTipoConcurso: e.target.value })}
              disabled={soloLectura}
              className={`w-full px-3 py-2 border rounded-md ${errors.idTipoConcurso ? 'border-red-500' : 'border-gray-300'} ${soloLectura ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">Seleccione...</option>
              {tiposConcurso.map((tipo) => (
                <option key={tipo.idTipoConcurso} value={tipo.idTipoConcurso}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
            {errors.idTipoConcurso && (
              <p className="mt-1 text-sm text-red-600">{errors.idTipoConcurso}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción <span className="text-red-500">*</span>
            </label>
            <EditorTextoEnriquecido
              value={formData.descripcion}
              onChange={(value) => setFormData({ ...formData, descripcion: value })}
              placeholder="Ingrese la descripción del examen..."
              disabled={soloLectura}
            />
            {errors.descripcion && (
              <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Mínimo 20 caracteres, máximo 50,000 caracteres. Soporta texto enriquecido, imágenes y tablas.
            </p>
          </div>

          {/* Tiempo Límite */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiempo Límite Total <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.tiempo_limite}
                onChange={(e) => setFormData({ ...formData, tiempo_limite: parseInt(e.target.value) || 0 })}
                disabled={soloLectura}
                className={`w-32 px-3 py-2 border rounded-md ${errors.tiempo_limite ? 'border-red-500' : 'border-gray-300'} ${soloLectura ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                min="30"
                max="600"
              />
              <span className="text-sm text-gray-600">minutos</span>
            </div>
            {errors.tiempo_limite && (
              <p className="mt-1 text-sm text-red-600">{errors.tiempo_limite}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Tiempo total para completar TODAS las subpruebas (30-600 minutos)
            </p>
          </div>

          {/* Tipo de Acceso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Acceso <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="publico"
                  checked={formData.tipo_acceso === 'publico'}
                  onChange={(e) => {
                    const valor = e.target.value as 'publico' | 'privado';
                    setFormData({ ...formData, tipo_acceso: valor });
                  }}
                  disabled={soloLectura}
                  className="mr-2"
                />
                Público
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="privado"
                  checked={formData.tipo_acceso === 'privado'}
                  onChange={(e) => {
                    const valor = e.target.value as 'publico' | 'privado';
                    setFormData({ ...formData, tipo_acceso: valor });
                  }}
                  disabled={soloLectura}
                  className="mr-2"
                />
                Privado
              </label>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <button
            type="button"
            onClick={onVolver}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar y Continuar →'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Paso1DatosBasicos;

