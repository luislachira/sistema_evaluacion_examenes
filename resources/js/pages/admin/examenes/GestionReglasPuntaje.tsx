import React, { useState, useEffect, useCallback } from 'react';
import { examenesService } from '../../../services/examenesService';
import type { ReglaPuntaje, Subprueba } from '../../../types/examenes';

const IconX = ({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface Props {
  postulacionId: number;
  examenId: number;
  onCerrar: () => void;
  onReglaActualizada?: () => void;
}

const GestionReglasPuntaje: React.FC<Props> = ({ postulacionId, examenId, onCerrar, onReglaActualizada }) => {
  const [reglas, setReglas] = useState<ReglaPuntaje[]>([]);
  const [subpruebas, setSubpruebas] = useState<Subprueba[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    idSubprueba: '',
    puntaje_correcto: '',
    puntaje_incorrecto: '',
    puntaje_en_blanco: '',
    puntaje_minimo_subprueba: '',
  });

  const [editando, setEditando] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    puntaje_correcto: '',
    puntaje_incorrecto: '',
    puntaje_en_blanco: '',
    puntaje_minimo_subprueba: '',
  });

  const cargarSubpruebas = useCallback(async () => {
    try {
      const subpruebasData = await examenesService.admin.getSubpruebas(examenId);
      setSubpruebas(subpruebasData);
    } catch {
      // Error al cargar subpruebas, se ignora silenciosamente
      // Mantener el estado actual (subpruebas vacío) si falla la carga
      setSubpruebas([]);
    }
  }, [examenId]);

  const cargarReglas = useCallback(async () => {
    try {
      setLoading(true);
      const reglasData = await examenesService.admin.getReglasPuntaje(postulacionId);
      setReglas(reglasData);
    } catch {
      // Error al cargar reglas, se ignora silenciosamente
      // Mantener el estado actual (reglas vacío) si falla la carga
      setReglas([]);
    } finally {
      setLoading(false);
    }
  }, [postulacionId]);

  useEffect(() => {
    cargarSubpruebas();
    cargarReglas();
  }, [cargarSubpruebas, cargarReglas]);

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
    if (!data.idSubprueba) {
      nuevosErrors.idSubprueba = ['Debe seleccionar una subprueba'];
    }
    if (!data.puntaje_correcto || isNaN(parseFloat(data.puntaje_correcto))) {
      nuevosErrors.puntaje_correcto = ['El puntaje correcto debe ser un número válido'];
    }
    if (!data.puntaje_incorrecto || isNaN(parseFloat(data.puntaje_incorrecto))) {
      nuevosErrors.puntaje_incorrecto = ['El puntaje incorrecto debe ser un número válido'];
    }
    if (!data.puntaje_en_blanco || isNaN(parseFloat(data.puntaje_en_blanco))) {
      nuevosErrors.puntaje_en_blanco = ['El puntaje en blanco debe ser un número válido'];
    }
    if (!data.puntaje_minimo_subprueba || isNaN(parseFloat(data.puntaje_minimo_subprueba)) || parseFloat(data.puntaje_minimo_subprueba) < 0) {
      nuevosErrors.puntaje_minimo_subprueba = ['El puntaje mínimo debe ser un número válido mayor o igual a 0'];
    }

    setErrors(nuevosErrors);
    return Object.keys(nuevosErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario(formData)) return;

    setLoading(true);
    try {
      await examenesService.admin.createReglaPuntaje(postulacionId, {
        idSubprueba: parseInt(formData.idSubprueba),
        puntaje_correcto: parseFloat(formData.puntaje_correcto),
        puntaje_incorrecto: parseFloat(formData.puntaje_incorrecto),
        puntaje_en_blanco: parseFloat(formData.puntaje_en_blanco),
        puntaje_minimo_subprueba: parseFloat(formData.puntaje_minimo_subprueba),
      });

      setFormData({
        idSubprueba: '',
        puntaje_correcto: '',
        puntaje_incorrecto: '',
        puntaje_en_blanco: '',
        puntaje_minimo_subprueba: '',
      });
      cargarReglas();
      if (onReglaActualizada) onReglaActualizada();
    } catch (e: unknown) {
      const error = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Error al crear la regla');
      }
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicion = (regla: ReglaPuntaje) => {
    setEditando(regla.idRegla);
    setEditForm({
      puntaje_correcto: String(regla.puntaje_correcto),
      puntaje_incorrecto: String(regla.puntaje_incorrecto),
      puntaje_en_blanco: String(regla.puntaje_en_blanco),
      puntaje_minimo_subprueba: String(regla.puntaje_minimo_subprueba),
    });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setEditForm({
      puntaje_correcto: '',
      puntaje_incorrecto: '',
      puntaje_en_blanco: '',
      puntaje_minimo_subprueba: '',
    });
    setErrors({});
  };

  const validarFormularioEdicion = (data: typeof editForm) => {
    const nuevosErrors: Record<string, string[]> = {};
    if (!data.puntaje_correcto || isNaN(parseFloat(data.puntaje_correcto))) {
      nuevosErrors.puntaje_correcto = ['El puntaje correcto debe ser un número válido'];
    }
    if (!data.puntaje_incorrecto || isNaN(parseFloat(data.puntaje_incorrecto))) {
      nuevosErrors.puntaje_incorrecto = ['El puntaje incorrecto debe ser un número válido'];
    }
    if (!data.puntaje_en_blanco || isNaN(parseFloat(data.puntaje_en_blanco))) {
      nuevosErrors.puntaje_en_blanco = ['El puntaje en blanco debe ser un número válido'];
    }
    if (!data.puntaje_minimo_subprueba || isNaN(parseFloat(data.puntaje_minimo_subprueba)) || parseFloat(data.puntaje_minimo_subprueba) < 0) {
      nuevosErrors.puntaje_minimo_subprueba = ['El puntaje mínimo debe ser un número válido mayor o igual a 0'];
    }

    setErrors(nuevosErrors);
    return Object.keys(nuevosErrors).length === 0;
  };

  const guardarEdicion = async (id: number) => {
    if (!validarFormularioEdicion(editForm)) return;

    setLoading(true);
    try {
      await examenesService.admin.updateReglaPuntaje(id, {
        puntaje_correcto: parseFloat(editForm.puntaje_correcto),
        puntaje_incorrecto: parseFloat(editForm.puntaje_incorrecto),
        puntaje_en_blanco: parseFloat(editForm.puntaje_en_blanco),
        puntaje_minimo_subprueba: parseFloat(editForm.puntaje_minimo_subprueba),
      });

      setEditando(null);
      setEditForm({
        puntaje_correcto: '',
        puntaje_incorrecto: '',
        puntaje_en_blanco: '',
        puntaje_minimo_subprueba: '',
      });
      cargarReglas();
      if (onReglaActualizada) onReglaActualizada();
    } catch (e: unknown) {
      const error = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Error al actualizar la regla');
      }
    } finally {
      setLoading(false);
    }
  };

  const eliminarRegla = async (id: number, subpruebaNombre: string) => {
    if (!confirm(`¿Eliminar la regla para "${subpruebaNombre}"?`)) return;

    setLoading(true);
    try {
      await examenesService.admin.deleteReglaPuntaje(id);
      cargarReglas();
      if (onReglaActualizada) onReglaActualizada();
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Error al eliminar la regla');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-banco backdrop-blur-md bg-black/30 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-2xl font-bold text-gray-900">Gestión de Reglas de Puntaje</h3>
          <button onClick={onCerrar} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full">
            <IconX size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Formulario nueva regla */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Nueva Regla de Puntaje</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subprueba *</label>
                  <select
                    value={formData.idSubprueba}
                    onChange={(e) => handleInputChange('idSubprueba', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Seleccione una subprueba</option>
                    {subpruebas.map(subprueba => (
                      <option key={subprueba.idSubprueba} value={subprueba.idSubprueba}>
                        {subprueba.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.idSubprueba && <div className="text-red-600 text-sm mt-1">{errors.idSubprueba[0]}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puntaje Mínimo Subprueba *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.puntaje_minimo_subprueba}
                    onChange={(e) => handleInputChange('puntaje_minimo_subprueba', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ej: 70.00"
                  />
                  {errors.puntaje_minimo_subprueba && <div className="text-red-600 text-sm mt-1">{errors.puntaje_minimo_subprueba[0]}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puntaje Correcto *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.puntaje_correcto}
                    onChange={(e) => handleInputChange('puntaje_correcto', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ej: 2.00"
                  />
                  {errors.puntaje_correcto && <div className="text-red-600 text-sm mt-1">{errors.puntaje_correcto[0]}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puntaje Incorrecto *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.puntaje_incorrecto}
                    onChange={(e) => handleInputChange('puntaje_incorrecto', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ej: -0.25 o 0.00"
                  />
                  {errors.puntaje_incorrecto && <div className="text-red-600 text-sm mt-1">{errors.puntaje_incorrecto[0]}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puntaje En Blanco *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.puntaje_en_blanco}
                    onChange={(e) => handleInputChange('puntaje_en_blanco', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ej: 0.00"
                  />
                  {errors.puntaje_en_blanco && <div className="text-red-600 text-sm mt-1">{errors.puntaje_en_blanco[0]}</div>}
                </div>
              </div>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Regla'}
              </button>
            </form>
          </div>

          {/* Lista de reglas */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Reglas Existentes ({reglas.length})</h4>
            {loading && reglas.length === 0 ? (
              <div className="text-gray-500">Cargando reglas...</div>
            ) : reglas.length === 0 ? (
              <div className="text-gray-500">No hay reglas registradas</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Subprueba</th>
                      <th className="border p-2 text-left">P. Correcto</th>
                      <th className="border p-2 text-left">P. Incorrecto</th>
                      <th className="border p-2 text-left">P. En Blanco</th>
                      <th className="border p-2 text-left">P. Mínimo</th>
                      <th className="border p-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reglas.map((regla) => (
                      <tr key={regla.idRegla}>
                        <td className="border p-2">
                          <span>{regla.subprueba?.nombre || 'N/A'}</span>
                        </td>
                        <td className="border p-2">
                          {editando === regla.idRegla ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.puntaje_correcto}
                              onChange={(e) => handleEditInputChange('puntaje_correcto', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          ) : (
                            <span>{Number(regla.puntaje_correcto).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="border p-2">
                          {editando === regla.idRegla ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.puntaje_incorrecto}
                              onChange={(e) => handleEditInputChange('puntaje_incorrecto', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          ) : (
                            <span>{Number(regla.puntaje_incorrecto).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="border p-2">
                          {editando === regla.idRegla ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.puntaje_en_blanco}
                              onChange={(e) => handleEditInputChange('puntaje_en_blanco', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          ) : (
                            <span>{Number(regla.puntaje_en_blanco).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="border p-2">
                          {editando === regla.idRegla ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editForm.puntaje_minimo_subprueba}
                              onChange={(e) => handleEditInputChange('puntaje_minimo_subprueba', e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          ) : (
                            <span>{Number(regla.puntaje_minimo_subprueba).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="border p-2">
                          {editando === regla.idRegla ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => guardarEdicion(regla.idRegla)}
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
                                onClick={() => iniciarEdicion(regla)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                disabled={loading}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => eliminarRegla(regla.idRegla, regla.subprueba?.nombre || '')}
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

export default GestionReglasPuntaje;
