import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import EditorTextoEnriquecido from '../../components/EditorTextoEnriquecido';

// Iconos inline
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

interface Contexto {
  idContexto: number;
  titulo?: string | null;
  texto?: string;
  idCategoria?: number;
  categoria?: { idCategoria: number; nombre: string };
}

interface Opcion {
  letra: string;
  texto: string;
  es_correcta: boolean;
  orden: number;
}

interface PreguntaData {
  id?: string;
  idPregunta?: string;
  codigo?: string;
  texto: string;
  respuesta_correcta?: string;
  idCategoria?: number;
  dificultad: '0'|'1'|'2';
  ano?: number;
  tiene_contexto: boolean;
  idContexto?: string;
  opciones: Opcion[];
}

interface Props {
  pregunta?: PreguntaData | null;
  onGuardar: () => void;
  onCancelar: () => void;
}

const FormularioPregunta: React.FC<Props> = ({ pregunta, onGuardar, onCancelar }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contextos, setContextos] = useState<Contexto[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState<PreguntaData>({
    texto: '',
    codigo: '',
    idCategoria: undefined,
    dificultad: '1',
    ano: new Date().getFullYear(),
    tiene_contexto: false,
    opciones: [
      { letra: 'A', texto: '', es_correcta: false, orden: 1 },
      { letra: 'B', texto: '', es_correcta: false, orden: 2 }
    ]
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
      const res = await fetch('/api/v1/admin/contextos?per_page=100', {
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
    }
  }, [token]);

  useEffect(() => {
    cargarCategorias();
    cargarContextos();
    if (pregunta) {
      const ops = pregunta.opciones || [];
      // Mapear opciones: si tienen 'contenido' (del backend) o 'texto' (ya mapeado)
      const opcionesMapeadas = ops.length > 0 ? ops.map((op: Opcion & { contenido?: string }, idx: number) => ({
        letra: op.letra || String.fromCharCode(65 + idx),
        texto: op.texto || op.contenido || '',
        es_correcta: op.es_correcta || false,
        orden: op.orden || idx + 1
      })) : [
        { letra: 'A', texto: '', es_correcta: false, orden: 1 },
        { letra: 'B', texto: '', es_correcta: false, orden: 2 }
      ];

      setFormData({
        id: pregunta.id,
        idPregunta: pregunta.idPregunta || pregunta.id,
        codigo: pregunta.codigo || '',
        texto: pregunta.texto,
        respuesta_correcta: pregunta.respuesta_correcta,
        idCategoria: pregunta.idCategoria || undefined,
        dificultad: pregunta.dificultad || '1',
        ano: pregunta.ano,
        tiene_contexto: pregunta.tiene_contexto || false,
        idContexto: pregunta.idContexto ? String(pregunta.idContexto) : undefined,
        opciones: opcionesMapeadas
      });
    }
  }, [pregunta, cargarCategorias, cargarContextos]);

  const handleInputChange = (field: keyof PreguntaData, value: string | number | boolean | undefined) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Si cambia la categoría, verificar si el contexto seleccionado pertenece a la nueva categoría
      if (field === 'idCategoria' && prev.idContexto && prev.tiene_contexto) {
        const contextoSeleccionado = contextos.find(ctx => String(ctx.idContexto) === String(prev.idContexto));
        if (contextoSeleccionado) {
          const ctxCategoriaId = contextoSeleccionado.idCategoria || contextoSeleccionado.categoria?.idCategoria;
          if (ctxCategoriaId !== value) {
            // El contexto no pertenece a la nueva categoría, limpiarlo
            newData.idContexto = undefined;
          }
        }
      }

      return newData;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: [] }));
    }
  };

  const handleOpcionChange = (index: number, field: keyof Opcion, value: string | boolean | number) => {
    const nuevasOpciones = [...formData.opciones];
    nuevasOpciones[index] = { ...nuevasOpciones[index], [field]: value };
    setFormData(prev => ({ ...prev, opciones: nuevasOpciones }));
  };

  const agregarOpcion = () => {
    if (formData.opciones.length < 6) {
      const letras = ['A','B','C','D','E','F'];
      const siguienteLetra = letras[formData.opciones.length];
      setFormData(prev => ({
        ...prev,
        opciones: [...prev.opciones, { letra: siguienteLetra, texto: '', es_correcta: false, orden: prev.opciones.length + 1 }]
      }));
    }
  };

  const eliminarOpcion = (index: number) => {
    if (formData.opciones.length > 2) {
      const nuevas = formData.opciones.filter((_, i) => i !== index);
      // Reordenar
      nuevas.forEach((op, i) => { op.orden = i + 1; });
      setFormData(prev => ({ ...prev, opciones: nuevas }));
    }
  };

  // Función auxiliar para extraer texto plano del HTML
  const extraerTextoPlano = (html: string): string => {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || doc.body.innerText || '';
  };

  const validarFormulario = () => {
    const nuevosErrors: Record<string, string[]> = {};
    if (!formData.texto.trim()) nuevosErrors.texto = ['El texto es obligatorio'];
    if (!formData.idCategoria || formData.idCategoria === 0) nuevosErrors.idCategoria = ['Debe seleccionar una categoría'];
    if (!pregunta?.id && !formData.codigo?.trim()) nuevosErrors.codigo = ['El código es obligatorio'];

    // Validar opciones: extraer texto plano del HTML para verificar que no esté vacío
    const opsVacias = formData.opciones.filter(o => !extraerTextoPlano(o.texto || '').trim());
    if (opsVacias.length > 0) nuevosErrors.opciones = ['Todas las opciones deben tener texto'];

    const correctas = formData.opciones.filter(o => o.es_correcta);
    if (correctas.length === 0) {
      nuevosErrors.opciones = [...(nuevosErrors.opciones || []), 'Debe haber al menos una opción correcta'];
    }

    if (formData.tiene_contexto && !formData.idContexto) {
      nuevosErrors.idContexto = ['Debe seleccionar un contexto cuando la pregunta requiere contexto'];
    }

    setErrors(nuevosErrors);
    return Object.keys(nuevosErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setLoading(true);
    setErrors({});

    try {
      const url = pregunta?.id ? `/api/v1/admin/preguntas/${pregunta.id}` : '/api/v1/admin/preguntas';
      const method = pregunta?.id ? 'PUT' : 'POST';

      // Encontrar el índice de la opción correcta
      const indiceCorrecta = formData.opciones.findIndex(op => op.es_correcta);
      if (indiceCorrecta === -1) {
        alert('Debe seleccionar al menos una opción correcta.');
        setLoading(false);
        return;
      }

      const payload = {
        codigo: formData.codigo,
        enunciado: formData.texto,
        idCategoria: formData.idCategoria,
        ano: formData.ano || new Date().getFullYear(),
        idContexto: formData.tiene_contexto ? (formData.idContexto ? parseInt(formData.idContexto) : null) : null,
        opciones: formData.opciones.map((op) => ({
          contenido: op.texto
        })),
        opcion_correcta: indiceCorrecta
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        onGuardar();
      } else {
        if (data.errors) setErrors(data.errors);
        alert(data.message || 'Error al guardar');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-banco backdrop-blur-md bg-black/30 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-2xl font-bold text-gray-900">{pregunta?.id ? 'Editar Pregunta' : 'Nueva Pregunta'}</h3>
          <button onClick={onCancelar} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full">
            <IconX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Código (solo para nuevas) */}
          {!pregunta?.id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
              <input
                type="text"
                value={formData.codigo || ''}
                onChange={(e) => handleInputChange('codigo', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Ej: EPT-2023-01"
                maxLength={100}
              />
              {errors.codigo && <div className="text-red-600 text-sm mt-1">{errors.codigo[0]}</div>}
            </div>
          )}

          {/* Texto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto de la pregunta *</label>
            <EditorTextoEnriquecido
              value={formData.texto || ''}
              onChange={(html) => handleInputChange('texto', html)}
              placeholder="Escribe el texto de la pregunta aquí. Puedes usar formato, tablas e imágenes."
              tipoRecurso="pregunta_imagen"
              idRecurso={formData.idPregunta || undefined}
            />
            <p className="text-xs text-gray-500 mt-2">
              Puedes formatear texto, insertar imágenes y crear tablas para la pregunta.
            </p>
            {errors.texto && <div className="text-red-600 text-sm mt-1">{errors.texto[0]}</div>}
          </div>

          {/* Categoría y Año */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select
                value={formData.idCategoria || 0}
                onChange={(e) => handleInputChange('idCategoria', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value={0}>Seleccionar categoría</option>
                {categorias.map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>)}
              </select>
              {errors.idCategoria && <div className="text-red-600 text-sm mt-1">{errors.idCategoria[0]}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año *</label>
              <input
                type="number"
                value={formData.ano || ''}
                onChange={(e) => handleInputChange('ano', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border rounded-lg"
                min="1900"
                max="2100"
                required
              />
            </div>
          </div>

          {/* Contexto */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tiene_contexto"
                checked={formData.tiene_contexto}
                onChange={(e) => {
                  handleInputChange('tiene_contexto', e.target.checked);
                  if (!e.target.checked) {
                    handleInputChange('idContexto', undefined);
                  }
                }}
                className="w-4 h-4"
              />
              <label htmlFor="tiene_contexto" className="text-sm font-medium text-gray-700">
                Esta pregunta requiere contexto
              </label>
            </div>
            {formData.tiene_contexto && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contexto *</label>
                <select
                  value={formData.idContexto || ''}
                  onChange={(e) => handleInputChange('idContexto', e.target.value || undefined)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccionar contexto</option>
                  {contextos
                    .filter(ctx => {
                      if (!formData.idCategoria) return true;
                      // El idCategoria puede venir directamente o en categoria.idCategoria
                      const ctxCategoriaId = ctx.idCategoria || ctx.categoria?.idCategoria;
                      return ctxCategoriaId === formData.idCategoria;
                    })
                    .map(ctx => (
                      <option key={ctx.idContexto} value={ctx.idContexto}>
                        {ctx.titulo || `Contexto ${ctx.idContexto}`}
                      </option>
                    ))}
                </select>
                {formData.idCategoria && contextos.filter(ctx => {
                  const ctxCategoriaId = ctx.idCategoria || ctx.categoria?.idCategoria;
                  return ctxCategoriaId === formData.idCategoria;
                }).length === 0 && (
                  <div className="text-yellow-600 text-sm mt-1">
                    No hay contextos disponibles para esta categoría. Puede crear uno desde "Gestión Contextos".
                  </div>
                )}
                {errors.idContexto && <div className="text-red-600 text-sm mt-1">{errors.idContexto[0]}</div>}
              </div>
            )}
          </div>


          {/* Opciones */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Opciones *</label>
              {formData.opciones.length < 6 && (
                <button type="button" onClick={agregarOpcion} className="text-blue-600 hover:text-blue-800 text-sm">
                  + Agregar opción
                </button>
              )}
            </div>
            {formData.opciones.map((op, idx) => (
              <div key={idx} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 font-bold text-gray-700">{op.letra})</span>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={op.es_correcta}
                        onChange={(e) => {
                          const nuevas = [...formData.opciones];
                          nuevas[idx].es_correcta = e.target.checked;
                          setFormData(prev => ({ ...prev, opciones: nuevas }));
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">Correcta</span>
                    </label>
                  </div>
                  {formData.opciones.length > 2 && (
                    <button
                      type="button"
                      onClick={() => eliminarOpcion(idx)}
                      className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                      title="Eliminar opción"
                    >
                      × Eliminar
                    </button>
                  )}
                </div>
                <EditorTextoEnriquecido
                  value={op.texto || ''}
                  onChange={(html) => handleOpcionChange(idx, 'texto', html)}
                  placeholder={`Escribe el texto de la opción ${op.letra} aquí. Puedes usar formato, tablas e imágenes.`}
                  tipoRecurso="opcion_imagen"
                  idRecurso={pregunta?.idPregunta ? `${pregunta.idPregunta}-${idx}` : undefined}
                />
              </div>
            ))}
            {errors.opciones && <div className="text-red-600 text-sm mt-1">{errors.opciones.join(', ')}</div>}
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4 border-t">
            <button type="button" onClick={onCancelar} className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700" disabled={loading}>
              {loading ? 'Guardando...' : (pregunta?.id ? 'Actualizar' : 'Crear Pregunta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioPregunta;

