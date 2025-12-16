import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import type { Subprueba } from '../../../types/examenes';

const IconX = ({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface Props {
  examenId: number;
  onCerrar: () => void;
  onSubpruebasActualizadas?: () => void;
}

const GestionSubpruebas: React.FC<Props> = ({ examenId, onCerrar, onSubpruebasActualizadas }) => {
  const { token } = useAuth();
  const [subpruebas, setSubpruebas] = useState<Subprueba[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    nombre: '',
    puntaje_por_pregunta: '',
    duracion_minutos: '',
    orden: '',
  });

  const [editando, setEditando] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
    puntaje_por_pregunta: '',
    duracion_minutos: '',
    orden: '',
  });

  const cargarSubpruebas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/examenes/${examenId}/subpruebas`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const subpruebasData = Array.isArray(json) ? json : (json.data || []);
        setSubpruebas(subpruebasData.map((s: Subprueba) => ({
          ...s,
          puntaje_por_pregunta: typeof s.puntaje_por_pregunta === 'string'
            ? parseFloat(s.puntaje_por_pregunta)
            : Number(s.puntaje_por_pregunta)
        })));
      }
    } catch {
      // Error al cargar subpruebas, se ignora silenciosamente
      // Mantener el estado actual (subpruebas vacío) si falla la carga
      setSubpruebas([]);
    } finally {
      setLoading(false);
    }
  }, [examenId, token]);

  useEffect(() => {
    cargarSubpruebas();
  }, [cargarSubpruebas]);

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
      nuevosErrors.nombre = ['El nombre de la subprueba es obligatorio'];
    }
    if (!data.puntaje_por_pregunta || isNaN(parseFloat(data.puntaje_por_pregunta)) || parseFloat(data.puntaje_por_pregunta) < 0) {
      nuevosErrors.puntaje_por_pregunta = ['El puntaje por pregunta debe ser un número válido mayor o igual a 0'];
    }
    if (!data.duracion_minutos || isNaN(parseInt(data.duracion_minutos)) || parseInt(data.duracion_minutos) < 1) {
      nuevosErrors.duracion_minutos = ['La duración en minutos debe ser un número válido mayor a 0'];
    }
    if (!data.orden || isNaN(parseInt(data.orden)) || parseInt(data.orden) < 1) {
      nuevosErrors.orden = ['El orden debe ser un número válido mayor a 0'];
    }

    setErrors(nuevosErrors);
    return Object.keys(nuevosErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario(formData)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/examenes/${examenId}/subpruebas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          puntaje_por_pregunta: parseFloat(formData.puntaje_por_pregunta),
          duracion_minutos: parseInt(formData.duracion_minutos),
          orden: parseInt(formData.orden),
        }),
      });

      if (res.ok) {
        setFormData({ nombre: '', puntaje_por_pregunta: '', duracion_minutos: '', orden: '' });
        setErrors({});
        cargarSubpruebas();
        if (onSubpruebasActualizadas) onSubpruebasActualizadas();
      } else {
        const errorData = await res.json();
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else {
          alert(errorData.message || 'Error al crear la subprueba');
        }
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (subprueba: Subprueba) => {
    setEditando(subprueba.idSubprueba);
    setEditForm({
      nombre: subprueba.nombre,
      puntaje_por_pregunta: String(subprueba.puntaje_por_pregunta),
      duracion_minutos: String(subprueba.duracion_minutos || ''),
      orden: String(subprueba.orden || ''),
    });
    setErrors({});
  };

  const handleActualizar = async () => {
    if (!editando) return;

    const nuevosErrors: Record<string, string[]> = {};
    if (!editForm.nombre.trim()) {
      nuevosErrors.nombre = ['El nombre de la subprueba es obligatorio'];
    }
    if (!editForm.puntaje_por_pregunta || isNaN(parseFloat(editForm.puntaje_por_pregunta)) || parseFloat(editForm.puntaje_por_pregunta) < 0) {
      nuevosErrors.puntaje_por_pregunta = ['El puntaje por pregunta debe ser un número válido mayor o igual a 0'];
    }
    if (!editForm.duracion_minutos || isNaN(parseInt(editForm.duracion_minutos)) || parseInt(editForm.duracion_minutos) < 1) {
      nuevosErrors.duracion_minutos = ['La duración en minutos debe ser un número válido mayor a 0'];
    }
    if (!editForm.orden || isNaN(parseInt(editForm.orden)) || parseInt(editForm.orden) < 1) {
      nuevosErrors.orden = ['El orden debe ser un número válido mayor a 0'];
    }

    if (Object.keys(nuevosErrors).length > 0) {
      setErrors(nuevosErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/subpruebas/${editando}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          nombre: editForm.nombre.trim(),
          puntaje_por_pregunta: parseFloat(editForm.puntaje_por_pregunta),
          duracion_minutos: parseInt(editForm.duracion_minutos),
          orden: parseInt(editForm.orden),
        }),
      });

      if (res.ok) {
        setEditando(null);
        setEditForm({ nombre: '', puntaje_por_pregunta: '', duracion_minutos: '', orden: '' });
        setErrors({});
        cargarSubpruebas();
        if (onSubpruebasActualizadas) onSubpruebasActualizadas();
      } else {
        const errorData = await res.json();
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else {
          alert(errorData.message || 'Error al actualizar la subprueba');
        }
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (idSubprueba: number) => {
    if (!confirm('¿Estás seguro de eliminar esta subprueba? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/subpruebas/${idSubprueba}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        cargarSubpruebas();
        if (onSubpruebasActualizadas) onSubpruebasActualizadas();
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Error al eliminar la subprueba');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-overlay-banco backdrop-blur-md bg-black/30 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-6 border-b bg-white">
            <h3 className="text-2xl font-bold text-gray-900">Gestión de Subpruebas</h3>
            <button onClick={onCerrar} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full">
              <IconX size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Formulario para crear nueva subprueba */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <h4 className="text-lg font-semibold mb-4">Nueva Subprueba</h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Conocimientos Pedagógicos"
                      required
                    />
                    {errors.nombre && (
                      <p className="text-red-500 text-xs mt-1">{errors.nombre[0]}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Puntaje por Pregunta *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={formData.puntaje_por_pregunta}
                      onChange={(e) => handleInputChange('puntaje_por_pregunta', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: 1.5"
                      required
                    />
                    {errors.puntaje_por_pregunta && (
                      <p className="text-red-500 text-xs mt-1">{errors.puntaje_por_pregunta[0]}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duración (minutos) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duracion_minutos}
                      onChange={(e) => handleInputChange('duracion_minutos', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: 60"
                      required
                    />
                    {errors.duracion_minutos && (
                      <p className="text-red-500 text-xs mt-1">{errors.duracion_minutos[0]}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Orden *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.orden}
                      onChange={(e) => handleInputChange('orden', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: 1"
                      required
                    />
                    {errors.orden && (
                      <p className="text-red-500 text-xs mt-1">{errors.orden[0]}</p>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Agregar Subprueba'}
                </button>
              </form>
            </div>

            {/* Lista de subpruebas */}
            {loading && subpruebas.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : subpruebas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay subpruebas creadas. Crea una nueva subprueba arriba.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Subpruebas Existentes</h4>
                {subpruebas.map((subprueba) => (
                  <div key={subprueba.idSubprueba} className="bg-white border border-gray-200 rounded-lg p-4">
                    {editando === subprueba.idSubprueba ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                            <input
                              type="text"
                              value={editForm.nombre}
                              onChange={(e) => handleEditInputChange('nombre', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors.nombre && (
                              <p className="text-red-500 text-xs mt-1">{errors.nombre[0]}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Puntaje por Pregunta *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="10"
                              value={editForm.puntaje_por_pregunta}
                              onChange={(e) => handleEditInputChange('puntaje_por_pregunta', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors.puntaje_por_pregunta && (
                              <p className="text-red-500 text-xs mt-1">{errors.puntaje_por_pregunta[0]}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duración (minutos) *</label>
                            <input
                              type="number"
                              min="1"
                              value={editForm.duracion_minutos}
                              onChange={(e) => handleEditInputChange('duracion_minutos', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors.duracion_minutos && (
                              <p className="text-red-500 text-xs mt-1">{errors.duracion_minutos[0]}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Orden *</label>
                            <input
                              type="number"
                              min="1"
                              value={editForm.orden}
                              onChange={(e) => handleEditInputChange('orden', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors.orden && (
                              <p className="text-red-500 text-xs mt-1">{errors.orden[0]}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleActualizar}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => {
                              setEditando(null);
                              setEditForm({ nombre: '', puntaje_por_pregunta: '', duracion_minutos: '', orden: '' });
                              setErrors({});
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900">{subprueba.nombre}</h5>
                          <p className="text-sm text-gray-600 mt-1">
                            Puntaje por pregunta: {Number(subprueba.puntaje_por_pregunta).toFixed(2)} pts
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditar(subprueba)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(subprueba.idSubprueba)}
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  );
};

export default GestionSubpruebas;

