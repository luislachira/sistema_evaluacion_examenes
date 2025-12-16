import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import EditorTextoEnriquecido from '../../components/EditorTextoEnriquecido';

const IconX = ({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface Categoria {
  idCategoria: number;
  nombre: string;
}

interface Contexto {
  idContexto: number;
  titulo?: string | null;
  texto?: string;
  ano?: number;
  num_preguntas_asociadas?: number;
  activo?: boolean;
  categoria?: { idCategoria: number; nombre: string };
}

interface Props {
  onCerrar: () => void;
  onContextoActualizado?: () => void;
}

const GestionContextos: React.FC<Props> = ({ onCerrar, onContextoActualizado }) => {
  const { token } = useAuth();
  const [contextos, setContextos] = useState<Contexto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    idCategoria: 0,
    titulo: '',
    texto: '',
    ano: new Date().getFullYear()
  });

  const [editando, setEditando] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    idCategoria: 0,
    titulo: '',
    texto: '',
    ano: new Date().getFullYear()
  });

  const cargarCategorias = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/categorias', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        setCategorias(json.data || json || []);
      }
    } catch {
      // Error al cargar categorías, se ignora silenciosamente
      // Mantener el estado actual (categorías vacío) si falla la carga
      setCategorias([]);
    }
  }, [token]);

  const cargarContextos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/contextos?per_page=50', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        // El backend devuelve un array directo, no un objeto con 'data'
        setContextos(Array.isArray(json) ? json : (json.data || []));
      }
    } catch {
      // Error al cargar contextos, se ignora silenciosamente
      // Mantener el estado actual (contextos vacío) si falla la carga
      setContextos([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarCategorias();
    cargarContextos();
  }, [cargarCategorias, cargarContextos]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: [] }));
    }
  };

  const handleEditInputChange = (field: string, value: string | number) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const validarFormulario = (data: typeof formData) => {
    const nuevosErrors: Record<string, string[]> = {};
    if (!data.idCategoria || data.idCategoria === 0) {
      nuevosErrors.idCategoria = ['Debe seleccionar una categoría'];
    }
    // El título es opcional, no se valida
    // Validar que el texto no esté vacío (remover tags HTML para verificar)
    const textoPlano = data.texto ? data.texto.replace(/<[^>]*>/g, '').trim() : '';
    if (!textoPlano) {
      nuevosErrors.texto = ['El texto es obligatorio'];
    }
    if (!data.ano || data.ano <= 0) {
      nuevosErrors.ano = ['El año es obligatorio'];
    }
    setErrors(nuevosErrors);
    return Object.keys(nuevosErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario(formData)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/contextos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          idCategoria: parseInt(String(formData.idCategoria)),
          titulo: formData.titulo.trim(),
          texto: formData.texto.trim(),
          ano: parseInt(String(formData.ano || new Date().getFullYear())),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormData({ idCategoria: 0, titulo: '', texto: '', ano: new Date().getFullYear() });
        cargarContextos();
        if (onContextoActualizado) onContextoActualizado();
      } else {
        if (data.errors) setErrors(data.errors);
        else alert(data.message || 'Error al crear el contexto');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicion = (contexto: Contexto) => {
    setEditando(String(contexto.idContexto));
    setEditForm({
      idCategoria: contexto.categoria?.idCategoria || 0,
      titulo: contexto.titulo || '',
      texto: contexto.texto || '',
      ano: contexto.ano || new Date().getFullYear()
    });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setEditForm({ idCategoria: 0, titulo: '', texto: '', ano: new Date().getFullYear() });
    setErrors({});
  };

  const guardarEdicion = async (id: string) => {
    // Validar solo la categoría para edición (el idContexto ya existe)
    if (!editForm.idCategoria || editForm.idCategoria === 0) {
      setErrors({ idCategoria: ['Debe seleccionar una categoría'] });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/contextos/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          idCategoria: parseInt(String(editForm.idCategoria)),
          titulo: editForm.titulo.trim(),
          texto: editForm.texto.trim(),
          ano: parseInt(String(editForm.ano || new Date().getFullYear())),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditando(null);
        setEditForm({ idCategoria: 0, titulo: '', texto: '', ano: new Date().getFullYear() });
        cargarContextos();
        if (onContextoActualizado) onContextoActualizado();
      } else {
        if (data.errors) setErrors(data.errors);
        else alert(data.message || 'Error al actualizar el contexto');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const eliminarContexto = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar el contexto "${titulo || id}"?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/contextos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });

      if (res.ok) {
        cargarContextos();
        if (onContextoActualizado) onContextoActualizado();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al eliminar el contexto');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-banco backdrop-blur-md bg-black/30 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-2xl font-bold text-gray-900">Gestión de Contextos</h3>
          <button onClick={onCerrar} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full">
            <IconX size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Formulario nuevo contexto */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Nuevo Contexto</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select
                  value={formData.idCategoria}
                  onChange={(e) => handleInputChange('idCategoria', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value={0}>Seleccionar categoría</option>
                  {categorias.map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>)}
                </select>
                {errors.idCategoria && <div className="text-red-600 text-sm mt-1">{errors.idCategoria[0]}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => handleInputChange('titulo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Título del contexto"
                  maxLength={255}
                />
                {errors.titulo && <div className="text-red-600 text-sm mt-1">{errors.titulo[0]}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Texto *</label>
                <EditorTextoEnriquecido
                  value={formData.texto || ''}
                  onChange={(html) => handleInputChange('texto', html)}
                  placeholder="Escribe el texto del contexto aquí. Puedes usar formato, tablas e imágenes."
                  tipoRecurso="contexto_texto"
                  idRecurso={undefined}
                />
                {errors.texto && <div className="text-red-600 text-sm mt-1">{errors.texto[0]}</div>}
                <p className="text-xs text-gray-500 mt-2">
                  Puedes formatear texto, insertar imágenes y crear tablas para el contexto.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año *</label>
                <input
                  type="number"
                  value={formData.ano}
                  onChange={(e) => handleInputChange('ano', parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1900"
                  max="2100"
                />
                {errors.ano && <div className="text-red-600 text-sm mt-1">{errors.ano[0]}</div>}
              </div>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Contexto'}
              </button>
            </form>
          </div>

          {/* Lista de contextos */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contextos Existentes ({contextos.length})</h4>
            {loading && contextos.length === 0 ? (
              <div className="text-gray-500">Cargando contextos...</div>
            ) : contextos.length === 0 ? (
              <div className="text-gray-500">No hay contextos registrados</div>
            ) : (
              <div className="space-y-3">
                {contextos.map((contexto) => (
                  <div key={contexto.idContexto} className="border rounded-lg p-4">
                    {editando === String(contexto.idContexto) ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría * (RF-A.3.2)</label>
                            <select
                              value={editForm.idCategoria}
                              onChange={(e) => handleEditInputChange('idCategoria', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              <option value={0}>Seleccionar categoría</option>
                              {categorias.map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>)}
                            </select>
                            {errors.idCategoria && <div className="text-red-600 text-sm mt-1">{errors.idCategoria[0]}</div>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                            <input
                              type="number"
                              value={editForm.ano}
                              onChange={(e) => handleEditInputChange('ano', parseInt(e.target.value) || new Date().getFullYear())}
                              className="w-full px-3 py-2 border rounded-lg"
                              min="1900"
                              max="2100"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                          <input
                            type="text"
                            value={editForm.titulo}
                            onChange={(e) => handleEditInputChange('titulo', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                            maxLength={200}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Texto</label>
                          <EditorTextoEnriquecido
                            value={editForm.texto || ''}
                            onChange={(html) => handleEditInputChange('texto', html)}
                            placeholder="Escribe el texto del contexto aquí. Puedes usar formato, tablas e imágenes."
                            tipoRecurso="contexto_texto"
                            idRecurso={String(contexto.idContexto)}
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Puedes formatear texto, insertar imágenes y crear tablas para el contexto.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => guardarEdicion(String(contexto.idContexto))}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            disabled={loading}
                          >
                            Guardar
                          </button>
                          <button
                            onClick={cancelarEdicion}
                            className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                            disabled={loading}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{contexto.idContexto}</span>
                              <span className="text-sm font-semibold">{contexto.titulo || 'Sin título'}</span>
                              {contexto.ano && <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">{contexto.ano}</span>}
                            </div>
                            {contexto.categoria && (
                              <div className="text-sm text-gray-600 mb-2">
                                <strong>Categoría:</strong> {contexto.categoria.nombre}
                              </div>
                            )}
                            {contexto.texto && (() => {
                              // Extraer solo el primer párrafo del texto (sin HTML)
                              const extraerPrimerParrafo = (html: string): string => {
                                if (!html) return '';
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(html, 'text/html');
                                const firstParagraph = doc.querySelector('p');
                                if (firstParagraph) {
                                  return firstParagraph.textContent || firstParagraph.innerText || '';
                                }
                                const texto = doc.body.textContent || doc.body.innerText || '';
                                return texto.split('\n')[0].trim();
                              };

                              const textoPlano = extraerPrimerParrafo(contexto.texto);
                              const primerParrafo = textoPlano.substring(0, 100);
                              return (
                                <p className="text-sm text-gray-700 mb-2 line-clamp-2" title={textoPlano}>
                                  {primerParrafo}
                                  {textoPlano.length > 100 ? '...' : ''}
                                </p>
                              );
                            })()}
                            {contexto.num_preguntas_asociadas !== undefined && (
                              <div className="text-xs text-gray-500">
                                Preguntas asociadas: {contexto.num_preguntas_asociadas}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => iniciarEdicion(contexto)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              disabled={loading}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => eliminarContexto(String(contexto.idContexto), contexto.titulo || String(contexto.idContexto))}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                              disabled={loading}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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

export default GestionContextos;

