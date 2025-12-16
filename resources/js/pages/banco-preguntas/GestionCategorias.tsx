import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';

const IconX = ({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface Categoria {
  idCategoria: number;
  nombre: string;
  descripcion?: string;
}

interface Props {
  onCerrar: () => void;
  onCategoriaActualizada?: () => void;
}

const GestionCategorias: React.FC<Props> = ({ onCerrar, onCategoriaActualizada }) => {
  const { token } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });

  const [editando, setEditando] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
    descripcion: '',
  });

  const cargarCategorias = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/categorias', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        setCategorias(json.data || json);
      }
    } catch {
      // Error al cargar categorías, se ignora silenciosamente
      // Mantener el estado actual (categorías vacío) si falla la carga
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

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
      nuevosErrors.nombre = ['El nombre de la categoría es obligatorio'];
    } else if (data.nombre.length > 255) {
      nuevosErrors.nombre = ['El nombre no puede exceder 255 caracteres'];
    }

    const nombreExiste = categorias.some(c =>
      c.nombre.toLowerCase() === data.nombre.toLowerCase() &&
      c.idCategoria !== editando
    );

    if (nombreExiste) {
      nuevosErrors.nombre = ['Ya existe una categoría con este nombre'];
    }

    setErrors(nuevosErrors);
    return Object.keys(nuevosErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario(formData)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/categorias', {
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
        setFormData({ nombre: '', descripcion: '' });
        cargarCategorias();
        if (onCategoriaActualizada) onCategoriaActualizada();
      } else {
        if (data.errors) setErrors(data.errors);
        else alert(data.message || 'Error al crear la categoría');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicion = (categoria: Categoria) => {
    setEditando(categoria.idCategoria);
    setEditForm({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || '',
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
      const res = await fetch(`/api/v1/admin/categorias/${id}`, {
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
        setEditForm({ nombre: '', descripcion: '' });
        cargarCategorias();
        if (onCategoriaActualizada) onCategoriaActualizada();
      } else {
        if (data.errors) setErrors(data.errors);
        else alert(data.message || 'Error al actualizar la categoría');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const eliminarCategoria = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/categorias/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });

      if (res.ok) {
        cargarCategorias();
        if (onCategoriaActualizada) onCategoriaActualizada();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al eliminar la categoría');
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
          <h3 className="text-2xl font-bold text-gray-900">Gestión de Categorías</h3>
          <button onClick={onCerrar} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full">
            <IconX size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Formulario nueva categoría */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Nueva Categoría</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Nombre de la categoría (ej: EPT, Matemática)"
                  maxLength={255}
                />
                {errors.nombre && <div className="text-red-600 text-sm mt-1">{errors.nombre[0]}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange('descripcion', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Descripción de la categoría"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Categoría'}
              </button>
            </form>
          </div>

          {/* Lista de categorías */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Categorías Existentes ({categorias.length})</h4>
            {loading && categorias.length === 0 ? (
              <div className="text-gray-500">Cargando categorías...</div>
            ) : categorias.length === 0 ? (
              <div className="text-gray-500">No hay categorías registradas</div>
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
                    {categorias.map((categoria) => (
                      <tr key={categoria.idCategoria}>
                        <td className="border p-2">
                          {editando === categoria.idCategoria ? (
                            <input
                              type="text"
                              value={editForm.nombre}
                              onChange={(e) => handleEditInputChange('nombre', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                              maxLength={255}
                            />
                          ) : (
                            <span>{categoria.nombre}</span>
                          )}
                        </td>
                        <td className="border p-2">
                          {editando === categoria.idCategoria ? (
                            <textarea
                              value={editForm.descripcion}
                              onChange={(e) => handleEditInputChange('descripcion', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                              rows={2}
                            />
                          ) : (
                            <span>{categoria.descripcion || '-'}</span>
                          )}
                        </td>
                        <td className="border p-2">
                          {editando === categoria.idCategoria ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => guardarEdicion(categoria.idCategoria)}
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
                                onClick={() => iniciarEdicion(categoria)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                disabled={loading}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => eliminarCategoria(categoria.idCategoria, categoria.nombre)}
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

export default GestionCategorias;

