import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';

const IconX = ({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface TipoConcurso {
  idTipoConcurso: number;
  nombre: string;
}

interface Props {
  onCerrar: () => void;
  onTipoConcursoActualizado?: () => void;
}

const GestionTipoConcurso: React.FC<Props> = ({ onCerrar, onTipoConcursoActualizado }) => {
  const { token } = useAuth();
  const [tiposConcurso, setTiposConcurso] = useState<TipoConcurso[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    nombre: '',
  });

  const [editando, setEditando] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
  });

  const cargarTiposConcurso = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/tipo-concursos', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        setTiposConcurso(Array.isArray(json) ? json : (json.data || []));
      }
    } catch {
      // Error al cargar tipos de concurso, se ignora silenciosamente
      // Mantener el estado actual (tiposConcurso vacío) si falla la carga
      setTiposConcurso([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarTiposConcurso();
  }, [cargarTiposConcurso]);

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
      nuevosErrors.nombre = ['El nombre del tipo de concurso es obligatorio'];
    } else if (data.nombre.length > 255) {
      nuevosErrors.nombre = ['El nombre no puede exceder 255 caracteres'];
    }

    const nombreExiste = tiposConcurso.some(t =>
      t.nombre.toLowerCase() === data.nombre.toLowerCase() &&
      t.idTipoConcurso !== editando
    );

    if (nombreExiste) {
      nuevosErrors.nombre = ['Ya existe un tipo de concurso con este nombre'];
    }

    setErrors(nuevosErrors);
    return Object.keys(nuevosErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario(formData)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/tipo-concursos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setFormData({ nombre: '' });
        cargarTiposConcurso();
        if (onTipoConcursoActualizado) onTipoConcursoActualizado();
      } else {
        if (data.errors) setErrors(data.errors);
        else alert(data.message || 'Error al crear el tipo de concurso');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicion = (tipoConcurso: TipoConcurso) => {
    setEditando(tipoConcurso.idTipoConcurso);
    setEditForm({
      nombre: tipoConcurso.nombre,
    });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setEditForm({ nombre: '' });
    setErrors({});
  };

  const guardarEdicion = async (id: number) => {
    if (!validarFormulario(editForm)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/tipo-concursos/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (res.ok) {
        setEditando(null);
        setEditForm({ nombre: '' });
        cargarTiposConcurso();
        if (onTipoConcursoActualizado) onTipoConcursoActualizado();
      } else {
        if (data.errors) setErrors(data.errors);
        else alert(data.message || 'Error al actualizar el tipo de concurso');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const eliminarTipoConcurso = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar el tipo de concurso "${nombre}"?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/tipo-concursos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });

      if (res.ok) {
        cargarTiposConcurso();
        if (onTipoConcursoActualizado) onTipoConcursoActualizado();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al eliminar el tipo de concurso');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-banco backdrop-blur-md bg-black/30 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-2xl font-bold text-gray-900">Gestión de Tipos de Concurso</h3>
          <button onClick={onCerrar} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full">
            <IconX size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Formulario nuevo tipo */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Nuevo Tipo de Concurso</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ej: Ascenso de Escala"
                  maxLength={255}
                />
                {errors.nombre && <div className="text-red-600 text-sm mt-1">{errors.nombre[0]}</div>}
              </div>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Tipo de Concurso'}
              </button>
            </form>
          </div>

          {/* Lista de tipos */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Tipos de Concurso Existentes ({tiposConcurso.length})</h4>
            {loading && tiposConcurso.length === 0 ? (
              <div className="text-gray-500">Cargando tipos de concurso...</div>
            ) : tiposConcurso.length === 0 ? (
              <div className="text-gray-500">No hay tipos de concurso registrados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Nombre</th>
                      <th className="border p-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiposConcurso.map((tipo) => (
                      <tr key={tipo.idTipoConcurso}>
                        <td className="border p-2">
                          {editando === tipo.idTipoConcurso ? (
                            <input
                              type="text"
                              value={editForm.nombre}
                              onChange={(e) => handleEditInputChange('nombre', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                              maxLength={255}
                            />
                          ) : (
                            <span>{tipo.nombre}</span>
                          )}
                        </td>
                        <td className="border p-2">
                          {editando === tipo.idTipoConcurso ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => guardarEdicion(tipo.idTipoConcurso)}
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
                                onClick={() => iniciarEdicion(tipo)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                disabled={loading}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => eliminarTipoConcurso(tipo.idTipoConcurso, tipo.nombre)}
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
  );
};

export default GestionTipoConcurso;

