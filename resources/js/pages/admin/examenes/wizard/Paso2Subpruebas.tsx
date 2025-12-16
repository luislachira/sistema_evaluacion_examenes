import React, { useState, useEffect } from 'react';
import { examenesService } from '../../../../services/examenesService';
import type { Examen, Subprueba, DatosPaso2 } from '../../../../types/examenes';
import type { AxiosErrorResponse } from '../../../../types/errors';

interface Props {
  examenId: number;
  examen: Examen;
  datosPaso?: DatosPaso2 | null;
  soloLectura?: boolean;
  onCompletado: () => void;
  onSiguiente: () => void;
  onVolver: () => void;
}

const Paso2Subpruebas: React.FC<Props> = ({
  examenId,
  examen,
  datosPaso,
  soloLectura = false,
  onCompletado,
  onSiguiente,
  onVolver
}) => {
  const [subpruebas, setSubpruebas] = useState<Subprueba[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSubprueba, setEditingSubprueba] = useState<Subprueba | null>(null);
  const [formData, setFormData] = useState({ nombre: '' });
  const datosCargadosRef = React.useRef<string | null>(null);
  const datosPasoAnteriorRef = React.useRef<DatosPaso2 | null | undefined>(null);

  // Verificar si el examen está finalizado (estado '1' = publicado o '2' = finalizado)
  const examenFinalizado = (examen?.estado === '1' || examen?.estado === '2');
  
  // Resetear cache cuando cambian los datos del paso
  useEffect(() => {
    if (datosPaso !== datosPasoAnteriorRef.current) {
      datosCargadosRef.current = null;
      datosPasoAnteriorRef.current = datosPaso || null;
    }
  }, [datosPaso]);

  // Calcular el siguiente orden disponible
  const calcularSiguienteOrden = React.useCallback(() => {
    if (subpruebas.length === 0) {
      return 1;
    }
    // Encontrar el orden máximo y sumar 1
    const maxOrden = Math.max(...subpruebas.map(s => s.orden || 0));
    return maxOrden + 1;
  }, [subpruebas]);

  const cargarSubpruebas = React.useCallback(async () => {
    try {
      const data = await examenesService.admin.getSubpruebas(examenId);
      setSubpruebas(data);
    } catch {
      // Error al cargar las subpruebas, se ignora silenciosamente
      setError('Error al cargar las subpruebas');
    }
  }, [examenId]);

  // Usar datosPaso si está disponible, sino cargar desde el API
  useEffect(() => {
    // Crear una clave única para estos datos
    const datosKey = datosPaso
      ? `datos-${examenId}-${JSON.stringify(datosPaso.subpruebas?.map(s => s.idSubprueba) || [])}`
      : `api-${examenId}`;

    // Evitar cargar datos múltiples veces para la misma clave
    if (datosCargadosRef.current === datosKey) {
      return;
    }

    if (datosPaso && datosPaso.subpruebas && Array.isArray(datosPaso.subpruebas)) {
      // Usar datos del paso cargado desde el wizard
      setSubpruebas(datosPaso.subpruebas.map((s: {
        idSubprueba: number;
        nombre: string;
        puntaje_por_pregunta: number;
        duracion_minutos?: number;
        orden?: number;
        preguntas_count?: number;
      }) => ({
        idSubprueba: s.idSubprueba,
        idExamen: examenId,
        nombre: s.nombre,
        puntaje_por_pregunta: s.puntaje_por_pregunta,
        duracion_minutos: s.duracion_minutos,
        orden: s.orden || 0,
        preguntas_count: s.preguntas_count ?? 0
      })));
      datosCargadosRef.current = datosKey;
    } else if (!datosPaso) {
      // Si no hay datosPaso, cargar desde el API solo una vez
      if (datosCargadosRef.current !== datosKey) {
        cargarSubpruebas().then(() => {
          datosCargadosRef.current = datosKey;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datosPaso, examenId]);


  const handleCrearSubprueba = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar que el examen no esté finalizado (estado '1' = publicado o '2' = finalizado)
    if (!examen || examenFinalizado) {
      setError('No se pueden crear subpruebas cuando el examen está finalizado.');
      return;
    }

    if (!formData.nombre.trim() || formData.nombre.length < 5 || formData.nombre.length > 100) {
      setError('El nombre debe tener entre 5 y 100 caracteres');
      return;
    }

    // Calcular automáticamente el siguiente orden disponible
    const siguienteOrden = calcularSiguienteOrden();

    setLoading(true);
    try {
      await examenesService.admin.createSubprueba(examenId, {
        nombre: formData.nombre.trim(),
        orden: siguienteOrden,
        puntaje_por_pregunta: 0, // Se maneja en reglas de puntaje
        duracion_minutos: 0 // El tiempo es compartido
      });

      await cargarSubpruebas();
      setFormData({ nombre: '' });
      setShowModal(false);
      setEditingSubprueba(null);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      const errorData = axiosError.response?.data;

      // Manejar errores de validación de Laravel
      if (errorData && 'errors' in errorData && errorData.errors) {
        const errors = errorData.errors as Record<string, string[]>;
        // Obtener el primer error disponible
        const firstErrorKey = Object.keys(errors)[0];
        if (firstErrorKey && errors[firstErrorKey] && errors[firstErrorKey].length > 0) {
          setError(errors[firstErrorKey][0]);
        } else {
          setError(errorData.message || 'Error al crear la subprueba');
        }
      } else {
        const message = errorData?.message || (errorData && 'mensaje' in errorData ? errorData.mensaje : undefined);
        setError(message || 'Error al crear la subprueba');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditarSubprueba = (subprueba: Subprueba) => {
    // Verificar que el examen no esté publicado (estado '1')
    if (!examen || examenFinalizado) {
      setError('No se pueden editar subpruebas cuando el examen está finalizado.');
      return;
    }
    setEditingSubprueba(subprueba);
    setFormData({ nombre: subprueba.nombre });
    setShowModal(true);
  };

  const handleActualizarSubprueba = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingSubprueba) return;

    // Verificar que el examen no esté publicado (estado '1')
    if (!examen || examenFinalizado) {
      setError('No se pueden editar subpruebas cuando el examen está finalizado.');
      return;
    }

    if (!formData.nombre.trim() || formData.nombre.length < 5 || formData.nombre.length > 100) {
      setError('El nombre debe tener entre 5 y 100 caracteres');
      return;
    }

    setLoading(true);
    try {
      await examenesService.admin.updateSubprueba(editingSubprueba.idSubprueba, {
        nombre: formData.nombre.trim(),
        orden: editingSubprueba.orden || 1,
        puntaje_por_pregunta: editingSubprueba.puntaje_por_pregunta || 0,
        duracion_minutos: editingSubprueba.duracion_minutos && editingSubprueba.duracion_minutos > 0 ? editingSubprueba.duracion_minutos : 1
      });

      await cargarSubpruebas();
      setFormData({ nombre: '' });
      setShowModal(false);
      setEditingSubprueba(null);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      const errorData = axiosError.response?.data;

      // Manejar errores de validación de Laravel
      if (errorData && 'errors' in errorData && errorData.errors) {
        const errors = errorData.errors as Record<string, string[]>;
        // Obtener el primer error disponible
        const firstErrorKey = Object.keys(errors)[0];
        if (firstErrorKey && errors[firstErrorKey] && errors[firstErrorKey].length > 0) {
          setError(errors[firstErrorKey][0]);
        } else {
          setError(errorData.message || 'Error al actualizar la subprueba');
        }
      } else {
        const message = errorData?.message || (errorData && 'mensaje' in errorData ? errorData.mensaje : undefined);
        setError(message || 'Error al actualizar la subprueba');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: number) => {
    // Verificar que el examen no esté publicado (estado '1')
    if (!examen || examenFinalizado) {
      setError('No se pueden eliminar subpruebas cuando el examen está finalizado.');
      return;
    }

    if (!confirm('¿Está seguro de eliminar esta subprueba? Se eliminarán también todas las preguntas asociadas a esta subprueba.')) {
      return;
    }

    try {
      await examenesService.admin.deleteSubprueba(id);
      await cargarSubpruebas();
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      setError(axiosError.response?.data?.message || 'Error al eliminar la subprueba');
    }
  };

  const puedeContinuar = subpruebas.length >= 1;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          PASO 2: Gestión de Subpruebas
        </h2>
        <p className="text-sm text-gray-600">
          Debe crear al menos 1 subprueba para continuar. Las subpruebas son las secciones del examen.
        </p>
      </div>

      {error && !showModal && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Lista de subpruebas */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Subpruebas Creadas</h3>
          {!soloLectura && examen && !examenFinalizado && (
            <button
              onClick={() => {
                setFormData({ nombre: '' });
                setEditingSubprueba(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Nueva Subprueba
            </button>
          )}
        </div>

        {subpruebas.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <p className="text-gray-600 mb-2">⚠ Aún no hay subpruebas creadas.</p>
            <p className="text-sm text-gray-500">Debe crear al menos 1 subprueba para continuar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subpruebas.map((subprueba) => (
              <div
                key={subprueba.idSubprueba}
                className="p-4 bg-white border border-gray-200 rounded-lg flex justify-between items-center"
              >
                <div>
                  <h4 className="font-medium text-gray-900">
                    #{subprueba.orden} - {subprueba.nombre}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Preguntas asignadas: {subprueba.preguntas_count ?? 0}
                    {subprueba.preguntas_count === 0 && ' (se asignarán en el Paso 5)'}
                  </p>
                </div>
                {!soloLectura && examen && !examenFinalizado && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditarSubprueba(subprueba)}
                      className="px-3 py-1 text-blue-600 hover:text-blue-800"
                      title="Editar subprueba (solo en borrador)"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(subprueba.idSubprueba)}
                      className="px-3 py-1 text-red-600 hover:text-red-800"
                      title="Eliminar subprueba y sus preguntas asociadas (solo en borrador)"
                    >
                      ❌ Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {puedeContinuar && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ Requisito cumplido: Al menos 1 subprueba creada
            </p>
          </div>
        )}
      </div>

      {/* Modal para crear/editar subprueba */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingSubprueba ? 'Editar Subprueba' : 'Crear Subprueba'}
            </h3>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={editingSubprueba ? handleActualizarSubprueba : handleCrearSubprueba}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Subprueba <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: Prueba Única Nacional"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Mínimo 5 caracteres, máximo 100 caracteres
                  </p>
                </div>

                {!editingSubprueba && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Orden automático:</strong> Esta subprueba se creará con el orden #{calcularSiguienteOrden()}.
                      El orden se asigna automáticamente de forma secuencial.
                    </p>
                  </div>
                )}
                {editingSubprueba && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Orden:</strong> #{editingSubprueba.orden} (no se puede modificar)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSubprueba(null);
                    setFormData({ nombre: '' });
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (editingSubprueba ? 'Actualizando...' : 'Creando...') : (editingSubprueba ? 'Actualizar Subprueba' : 'Crear Subprueba')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        <button
          onClick={onVolver}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← Volver a Paso 1
        </button>
        <button
          onClick={async () => {
            if (puedeContinuar) {
              await examenesService.admin.actualizarPaso(examenId, 2);
              onCompletado();
              onSiguiente();
            }
          }}
          disabled={!puedeContinuar}
          className={`px-6 py-2 rounded-md ${
            puedeContinuar
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {puedeContinuar ? 'Guardar y Continuar →' : '🔒 Guardar y Continuar →'}
        </button>
      </div>
    </div>
  );
};

export default Paso2Subpruebas;

