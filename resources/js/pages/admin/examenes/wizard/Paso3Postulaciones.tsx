import React, { useState, useEffect } from 'react';
import { examenesService } from '../../../../services/examenesService';
import type { Examen, Postulacion, DatosPaso3 } from '../../../../types/examenes';
import type { AxiosErrorResponse } from '../../../../types/errors';

interface Props {
  examenId: number;
  examen: Examen;
  datosPaso?: DatosPaso3 | null;
  soloLectura?: boolean;
  onCompletado: () => void;
  onSiguiente: () => void;
  onVolver: () => void;
}

const Paso3Postulaciones: React.FC<Props> = ({
  examenId,
  examen,
  datosPaso,
  soloLectura = false,
  onCompletado,
  onSiguiente,
  onVolver
}) => {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPostulacion, setEditingPostulacion] = useState<Postulacion | null>(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const datosCargadosRef = React.useRef<string | null>(null);
  const datosPasoAnteriorRef = React.useRef<DatosPaso3 | null | undefined>(null);

  // Verificar si el examen está finalizado (estado '1' = publicado o '2' = finalizado)
  const examenFinalizado = (examen?.estado === '1' || examen?.estado === '2');
  
  // Resetear cache cuando cambian los datos del paso
  useEffect(() => {
    if (datosPaso !== datosPasoAnteriorRef.current) {
      datosCargadosRef.current = null;
      datosPasoAnteriorRef.current = datosPaso || null;
    }
  }, [datosPaso]);

  const cargarPostulaciones = React.useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const data = await examenesService.admin.getPostulaciones(examenId);
      setPostulaciones(data);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      const errorMessage = axiosError.response?.data?.message || 'Error al cargar las postulaciones';
      setError(errorMessage);
    } finally {
      setLoadingData(false);
    }
  }, [examenId]);

  // Usar datosPaso si está disponible, sino cargar desde el API
  useEffect(() => {
    // Verificar si datosPaso es del tipo correcto (DatosPaso3) y tiene postulaciones
    const tienePostulaciones = datosPaso && 'postulaciones' in datosPaso && Array.isArray(datosPaso.postulaciones) && datosPaso.postulaciones.length > 0;

    // Crear una clave única para estos datos
    const datosKey = tienePostulaciones
      ? `datos-${examenId}-${JSON.stringify(datosPaso.postulaciones.map(p => p.idPostulacion))}`
      : `api-${examenId}`;

    // Si datosPaso tiene postulaciones válidas, usarlas
    if (tienePostulaciones) {
      // Usar datos del paso cargado desde el wizard
      setPostulaciones(datosPaso.postulaciones.map((p: {
        idPostulacion: number;
        nombre: string;
        descripcion?: string | null;
        tipo_aprobacion: '0' | '1';
        reglas_count?: number;
      }) => ({
        idPostulacion: p.idPostulacion,
        idExamen: examenId,
        nombre: p.nombre,
        descripcion: p.descripcion,
        tipo_aprobacion: p.tipo_aprobacion,
        reglas_count: p.reglas_count ?? 0
      })));
      setLoadingData(false);
      datosCargadosRef.current = datosKey;
    } else {
      // Si no hay datosPaso válido o está vacío, siempre cargar desde el API
      // Esto asegura que cuando se navega entre pasos, siempre se recarguen los datos
      datosCargadosRef.current = null;
      cargarPostulaciones().then(() => {
        datosCargadosRef.current = datosKey;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datosPaso, examenId]);


  const handleCrearPostulacion = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!examen) {
      setError('Error: El examen no está cargado. Por favor, recarga la página.');
      return;
    }

    if (!formData.nombre.trim() || formData.nombre.length < 5 || formData.nombre.length > 100) {
      setError('El nombre debe tener entre 5 y 100 caracteres');
      return;
    }

    // Verificar que no haya otra postulación con el mismo nombre
    const nombreExistente = postulaciones.find(p => p.nombre.toLowerCase() === formData.nombre.toLowerCase());
    if (nombreExistente) {
      setError(`Ya existe una postulación con el nombre "${formData.nombre}"`);
      return;
    }

    // Verificar que el examen no esté finalizado (estado '1' = publicado o '2' = finalizado)
    if (!examen || examenFinalizado) {
      setError('No se pueden crear postulaciones cuando el examen está finalizado.');
      return;
    }

    setLoading(true);
    try {
      const dataToSend: { nombre: string; descripcion?: string } = {
        nombre: formData.nombre.trim(),
      };

      // Solo incluir descripcion si tiene contenido
      if (formData.descripcion && formData.descripcion.trim()) {
        dataToSend.descripcion = formData.descripcion.trim();
      }

      await examenesService.admin.createPostulacion(examenId, dataToSend);

      // Resetear el ref para forzar recarga
      datosCargadosRef.current = null;
      await cargarPostulaciones();
      setFormData({ nombre: '', descripcion: '' });
      setShowModal(false);
      setEditingPostulacion(null);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;

      const errorData = axiosError.response?.data;
      let errorMessage = 'Error al crear la postulación';

      if (errorData) {
        if (typeof errorData === 'object') {
          if ('message' in errorData && typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if ('errors' in errorData && typeof errorData.errors === 'object') {
            const errors = errorData.errors as Record<string, string[]>;
            if (errors.nombre && errors.nombre.length > 0) {
              errorMessage = errors.nombre[0];
            } else {
              // Mostrar el primer error disponible
              const firstErrorKey = Object.keys(errors)[0];
              if (firstErrorKey && errors[firstErrorKey] && errors[firstErrorKey].length > 0) {
                errorMessage = errors[firstErrorKey][0];
              }
            }
          } else {
            // Intentar extraer mensaje de cualquier propiedad
            const keys = Object.keys(errorData);
            for (const key of keys) {
              const value = (errorData as Record<string, unknown>)[key];
              if (typeof value === 'string') {
                errorMessage = value;
                break;
              } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
                errorMessage = value[0];
                break;
              }
            }
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditarPostulacion = (postulacion: Postulacion) => {
    // Verificar que el examen no esté publicado (estado '1')
    if (!examen || examenFinalizado) {
      setError('No se pueden editar postulaciones cuando el examen está finalizado.');
      return;
    }
    setEditingPostulacion(postulacion);
    setFormData({ nombre: postulacion.nombre, descripcion: postulacion.descripcion || '' });
    setShowModal(true);
  };

  const handleActualizarPostulacion = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editingPostulacion) return;

    // Verificar que el examen no esté publicado (estado '1')
    if (!examen || examenFinalizado) {
      setError('No se pueden editar postulaciones cuando el examen está finalizado.');
      return;
    }

    if (!formData.nombre.trim() || formData.nombre.length < 5 || formData.nombre.length > 100) {
      setError('El nombre debe tener entre 5 y 100 caracteres');
      return;
    }

    // Verificar que no haya otra postulación con el mismo nombre (excepto la que estamos editando)
    const nombreExistente = postulaciones.find(
      p => p.nombre.toLowerCase() === formData.nombre.toLowerCase() && p.idPostulacion !== editingPostulacion.idPostulacion
    );
    if (nombreExistente) {
      setError(`Ya existe una postulación con el nombre "${formData.nombre}"`);
      return;
    }

    setLoading(true);
    try {
      const dataToSend: { nombre: string; descripcion?: string } = {
        nombre: formData.nombre.trim(),
      };

      if (formData.descripcion && formData.descripcion.trim()) {
        dataToSend.descripcion = formData.descripcion.trim();
      }

      await examenesService.admin.updatePostulacion(editingPostulacion.idPostulacion, dataToSend);
      // Resetear el ref para forzar recarga
      datosCargadosRef.current = null;
      await cargarPostulaciones();
      setFormData({ nombre: '', descripcion: '' });
      setShowModal(false);
      setEditingPostulacion(null);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      setError(axiosError.response?.data?.message || 'Error al actualizar la postulación');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: number) => {
    // Verificar que el examen no esté publicado (estado '1')
    if (!examen || examenFinalizado) {
      setError('No se pueden eliminar postulaciones cuando el examen está finalizado.');
      return;
    }

    if (!confirm('¿Está seguro de eliminar esta postulación?')) {
      return;
    }

    try {
      await examenesService.admin.deletePostulacion(id);
      // Resetear el ref para forzar recarga
      datosCargadosRef.current = null;
      await cargarPostulaciones();
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      setError(axiosError.response?.data?.message || 'Error al eliminar la postulación');
    }
  };

  const puedeContinuar = postulaciones.length >= 1;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          PASO 3: Gestión de Postulaciones
        </h2>
        <p className="text-sm text-gray-600">
          Debe crear al menos 1 postulación para continuar. Las postulaciones son las opciones a las que un docente puede postular.
        </p>
      </div>

      {error && !showModal && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Lista de postulaciones */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Postulaciones Creadas</h3>
          {!soloLectura && examen && !examenFinalizado && (
            <button
              onClick={() => {
                setFormData({ nombre: '', descripcion: '' });
                setEditingPostulacion(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Nueva Postulación
            </button>
          )}
        </div>

        {loadingData ? (
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <p className="text-gray-600">Cargando datos...</p>
          </div>
        ) : postulaciones.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <p className="text-gray-600 mb-2">⚠ Aún no hay postulaciones creadas.</p>
            <p className="text-sm text-gray-500">Debe crear al menos 1 postulación para continuar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {postulaciones.map((postulacion) => (
              <div
                key={postulacion.idPostulacion}
                className="p-4 bg-white border border-gray-200 rounded-lg flex justify-between items-center"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{postulacion.nombre}</h4>
                  {postulacion.descripcion && (
                    <p className="text-sm text-gray-500 mt-1">{postulacion.descripcion}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Reglas configuradas: {postulacion.reglas_count ?? 0}
                    {postulacion.reglas_count === 0 && ' (se configurarán en el Paso 4)'}
                  </p>
                </div>
                {!soloLectura && examen && !examenFinalizado && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditarPostulacion(postulacion)}
                      className="px-3 py-1 text-blue-600 hover:text-blue-800"
                      title="Editar postulación (solo en borrador)"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(postulacion.idPostulacion)}
                      className="px-3 py-1 text-red-600 hover:text-red-800"
                      title="Eliminar postulación (solo en borrador)"
                    >
                      ❌ Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loadingData && puedeContinuar && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ Requisito cumplido: Al menos 1 postulación creada
            </p>
          </div>
        )}
      </div>

      {/* Modal para crear/editar postulación */}
      {showModal && (
        <div
          className="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setEditingPostulacion(null);
              setFormData({ nombre: '', descripcion: '' });
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">
              {editingPostulacion ? 'Editar Postulación' : 'Crear Postulación'}
            </h3>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editingPostulacion) {
                handleActualizarPostulacion(e);
              } else {
                handleCrearPostulacion(e);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Postulación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: III Escala Magisterial"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Mínimo 5 caracteres, máximo 100 caracteres. No puede haber dos postulaciones con el mismo nombre.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Máximo 500 caracteres
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPostulacion(null);
                    setFormData({ nombre: '', descripcion: '' });
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  onClick={() => {
                    // El formulario manejará el submit
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (editingPostulacion ? 'Actualizando...' : 'Creando...') : (editingPostulacion ? 'Actualizar Postulación' : 'Crear Postulación')}
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
          ← Volver a Paso 2
        </button>
        <button
          onClick={async () => {
            if (puedeContinuar) {
              await examenesService.admin.actualizarPaso(examenId, 3);
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

export default Paso3Postulaciones;

