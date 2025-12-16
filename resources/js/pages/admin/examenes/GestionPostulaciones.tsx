import React, { useState, useEffect, useCallback } from 'react';
import { examenesService } from '../../../services/examenesService';
import type { Postulacion } from '../../../types/examenes';
import GestionReglasPuntaje from './GestionReglasPuntaje';

const IconX = ({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface Props {
  examenId: number;
  onCerrar: () => void;
  onPostulacionesActualizadas?: () => void;
}

const GestionPostulaciones: React.FC<Props> = ({ examenId, onCerrar, onPostulacionesActualizadas }) => {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [postulacionParaReglas, setPostulacionParaReglas] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });

  const [editando, setEditando] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
    descripcion: '',
  });

  const cargarPostulaciones = useCallback(async () => {
    try {
      setLoading(true);
      const postulacionesData = await examenesService.admin.getPostulaciones(examenId);
      setPostulaciones(postulacionesData);
    } catch {
      // Error al cargar postulaciones, se ignora silenciosamente
      // Mantener el estado actual (postulaciones vacío) si falla la carga
      setPostulaciones([]);
    } finally {
      setLoading(false);
    }
  }, [examenId]);

  useEffect(() => {
    cargarPostulaciones();
  }, [cargarPostulaciones]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: [] }));
    }
  };

  const handleEditInputChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const validarFormulario = (data: typeof formData) => {
    const nuevosErrors: Record<string, string[]> = {};
    if (!data.nombre.trim()) {
      nuevosErrors.nombre = ['El nombre es obligatorio'];
    }

    setErrors(nuevosErrors);
    return Object.keys(nuevosErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario(formData)) return;

    setLoading(true);
    try {
      await examenesService.admin.createPostulacion(examenId, {
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
      });

      setFormData({ nombre: '', descripcion: '' });
      cargarPostulaciones();
      if (onPostulacionesActualizadas) onPostulacionesActualizadas();
    } catch (e: unknown) {
      const error = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Error al crear la postulación');
      }
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicion = (postulacion: Postulacion) => {
    setEditando(postulacion.idPostulacion);
    setEditForm({
      nombre: postulacion.nombre,
      descripcion: postulacion.descripcion || '',
    });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setEditForm({ nombre: '', descripcion: '' });
    setErrors({});
  };

  const guardarEdicion = async (id: number) => {
    if (!validarFormulario(editForm)) return;

    setLoading(true);
    try {
      await examenesService.admin.updatePostulacion(id, {
        nombre: editForm.nombre,
        descripcion: editForm.descripcion || undefined,
      });

      setEditando(null);
      setEditForm({ nombre: '', descripcion: '' });
      cargarPostulaciones();
      if (onPostulacionesActualizadas) onPostulacionesActualizadas();
    } catch (e: unknown) {
      const error = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Error al actualizar la postulación');
      }
    } finally {
      setLoading(false);
    }
  };

  const eliminarPostulacion = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar la postulación "${nombre}"?`)) return;

    setLoading(true);
    try {
      await examenesService.admin.deletePostulacion(id);
      cargarPostulaciones();
      if (onPostulacionesActualizadas) onPostulacionesActualizadas();
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Error al eliminar la postulación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-overlay-banco backdrop-blur-md bg-black/30 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
            <h3 className="text-2xl font-bold text-gray-900">Gestión de Postulaciones</h3>
            <button onClick={onCerrar} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full">
              <IconX size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Formulario nueva postulación */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Nueva Postulación</h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ej: Ascenso III Escala"
                    maxLength={255}
                    required
                  />
                  {errors.nombre && <div className="text-red-600 text-sm mt-1">{errors.nombre[0]}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => handleInputChange('descripcion', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Descripción de la postulación (opcional)"
                    rows={3}
                  />
                  {errors.descripcion && <div className="text-red-600 text-sm mt-1">{errors.descripcion[0]}</div>}
                </div>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Postulación'}
                </button>
              </form>
            </div>

            {/* Lista de postulaciones */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Postulaciones Existentes ({postulaciones.length})</h4>
              {loading && postulaciones.length === 0 ? (
                <div className="text-gray-500">Cargando postulaciones...</div>
              ) : postulaciones.length === 0 ? (
                <div className="text-gray-500">No hay postulaciones registradas</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Nombre</th>
                        <th className="border p-2 text-left">Descripción</th>
                        <th className="border p-2 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {postulaciones.map((postulacion) => (
                        <tr key={postulacion.idPostulacion}>
                          <td className="border p-2">
                            {editando === postulacion.idPostulacion ? (
                              <input
                                type="text"
                                value={editForm.nombre}
                                onChange={(e) => handleEditInputChange('nombre', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                                maxLength={255}
                              />
                            ) : (
                              <span>{postulacion.nombre}</span>
                            )}
                          </td>
                          <td className="border p-2">
                            {editando === postulacion.idPostulacion ? (
                              <textarea
                                value={editForm.descripcion}
                                onChange={(e) => handleEditInputChange('descripcion', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                                rows={2}
                              />
                            ) : (
                              <span className="text-sm text-gray-600">{postulacion.descripcion || 'Sin descripción'}</span>
                            )}
                          </td>
                          <td className="border p-2">
                            {editando === postulacion.idPostulacion ? (
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => guardarEdicion(postulacion.idPostulacion)}
                                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                  disabled={loading}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={cancelarEdicion}
                                  className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                                  disabled={loading}
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => setPostulacionParaReglas(postulacion.idPostulacion)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  disabled={loading}
                                  title="Gestionar Reglas de Puntaje"
                                >
                                  Reglas
                                </button>
                                <button
                                  onClick={() => iniciarEdicion(postulacion)}
                                  className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                  disabled={loading}
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => eliminarPostulacion(postulacion.idPostulacion, postulacion.nombre)}
                                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                  disabled={loading}
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t">
            <button onClick={onCerrar} className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Reglas de Puntaje */}
      {postulacionParaReglas && (
        <GestionReglasPuntaje
          postulacionId={postulacionParaReglas}
          examenId={examenId}
          onCerrar={() => setPostulacionParaReglas(null)}
          onReglaActualizada={() => {
            cargarPostulaciones();
          }}
        />
      )}
    </>
  );
};

export default GestionPostulaciones;

