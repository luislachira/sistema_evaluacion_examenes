import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import FormularioPregunta from './FormularioPregunta';
import GestionCategorias from './GestionCategorias';
import GestionContextos from './GestionContextos';
import '@css/banco-preguntas.css';

// Iconos inline
const IconPlus = ({ size = 20, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const IconFilter = ({ size = 20, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);
const IconFileText = ({ size = 12, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);

const IconUpload = ({ size = 20, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);
const IconExport = ({ size = 20, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

interface Categoria { idCategoria: number; nombre: string; }
interface PreguntaItem {
  idPregunta: number;
  codigo: string;
  enunciado: string;
  categoria?: { idCategoria: number; nombre: string };
  contexto?: { idContexto: number; titulo?: string; texto?: string } | null;
  ano: number;
  idContexto?: number | null;
  opciones?: Array<{ idOpcion: number; contenido: string; es_correcta: boolean }>;
}

const BancoPreguntas: React.FC = () => {
  const { token } = useAuth();
  const [preguntas, setPreguntas] = useState<PreguntaItem[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paginacion, setPaginacion] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0
  });

  // RF-A.3.5: Filtros del Banco de Preguntas
  const [categoriaId, setCategoriaId] = useState<string>('todos');
  const [ano, setAno] = useState<string>('todos');
  const [codigo, setCodigo] = useState<string>('');
  const [page, setPage] = useState(1);

  // Modal y edición
  const [mostrarModal, setMostrarModal] = useState(false);
  const [preguntaEditando, setPreguntaEditando] = useState<PreguntaItem | null>(null);
  const [mostrarGestionCategorias, setMostrarGestionCategorias] = useState(false);
  const [mostrarGestionContextos, setMostrarGestionContextos] = useState(false);
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const cargarCategorias = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/admin/categorias', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setCategorias(data.data || data);
      }
    } catch {
      // Error al cargar categorías, se ignora silenciosamente
      // Mantener el estado actual (categorías vacío) si falla la carga
      setCategorias([]);
    }
  }, [token]);

  const cargarPreguntas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoriaId !== 'todos') params.append('idCategoria', categoriaId);
      if (ano !== 'todos') params.append('ano', ano);
      if (codigo) params.append('codigo', codigo);
      params.append('per_page', '10');
      params.append('page', String(page));

      const response = await fetch(`/api/v1/admin/preguntas?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Error al cargar las preguntas');
      const data = await response.json();
      setPreguntas(Array.isArray(data) ? data : (data.data || []));
      if (data.current_page) {
        setPaginacion({
          current_page: data.current_page,
          last_page: data.last_page,
          per_page: data.per_page,
          total: data.total,
          from: data.from || 0,
          to: data.to || 0
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [categoriaId, ano, codigo, page, token]);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [categoriaId, ano, codigo]);


  const eliminarPregunta = async (id: number) => {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    try {
      const res = await fetch(`/api/v1/admin/preguntas/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
      if (res.ok) {
        cargarPreguntas();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al eliminar la pregunta');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const abrirModalCrear = () => {
    setPreguntaEditando(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = async (pregunta: PreguntaItem) => {
    try {
      const res = await fetch(`/api/v1/admin/preguntas/${pregunta.idPregunta}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        setPreguntaEditando(Array.isArray(json) ? json[0] : json);
        setMostrarModal(true);
      } else {
        alert('Error al cargar la pregunta');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setPreguntaEditando(null);
  };

  const onPreguntaGuardada = () => {
    cargarPreguntas();
    cerrarModal();
  };

  const handleExportar = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();
      if (categoriaId !== 'todos') params.append('idCategoria', categoriaId);
      if (ano !== 'todos') params.append('ano', ano);
      if (codigo) params.append('codigo', codigo);

      const response = await fetch(`/api/v1/admin/preguntas/exportar/csv?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        method: 'GET'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || 'Error al exportar las preguntas');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preguntas_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (_error) {
      alert('Error al exportar las preguntas');
    } finally {
      setExportando(false);
    }
  };

  const handleImportar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    if (!archivo.name.endsWith('.csv') && !archivo.name.endsWith('.txt')) {
      alert('Por favor, seleccione un archivo CSV o TXT');
      return;
    }

    if (!confirm(`¿Está seguro de importar el archivo "${archivo.name}"? Esto creará nuevas preguntas en el banco.`)) {
      event.target.value = '';
      return;
    }

    try {
      setImportando(true);
      const formData = new FormData();
      formData.append('archivo', archivo);

      const response = await fetch('/api/v1/admin/preguntas/importar/csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || 'Error al importar las preguntas');
        return;
      }

      let mensaje = `Importación completada:\n- Preguntas importadas: ${data.importadas}`;
      if (data.total_errores > 0) {
        mensaje += `\n- Errores: ${data.total_errores}`;
        if (data.errores && data.errores.length > 0) {
          mensaje += '\n\nErrores encontrados:\n' + data.errores.slice(0, 10).join('\n');
          if (data.errores.length > 10) {
            mensaje += `\n... y ${data.errores.length - 10} error(es) más`;
          }
        }
      }
      alert(mensaje);

      // Recargar preguntas
      cargarPreguntas();
    } catch (_error) {
      alert('Error al importar las preguntas');
    } finally {
      setImportando(false);
      event.target.value = '';
    }
  };

  useEffect(() => { cargarPreguntas(); }, [cargarPreguntas]);

  // Prevenir scroll del body cuando hay modales abiertos
  useEffect(() => {
    if (mostrarModal || mostrarGestionCategorias || mostrarGestionContextos) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mostrarModal, mostrarGestionCategorias, mostrarGestionContextos]);

  const anosDisponibles = useMemo(() => Array.from({ length: 15 }).map((_, i) => String(2025 - i)), []);

  return (
    <div className={`min-h-screen bg-gray-50 p-6 ${(mostrarModal || mostrarGestionCategorias || mostrarGestionContextos) ? 'overflow-hidden' : ''}`}>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Banco de Preguntas - EPT</h1>
              <p className="text-gray-600">Gestión de preguntas para exámenes de ascenso - Educación para el Trabajo</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <IconUpload size={20} />
                {importando ? 'Importando...' : 'Importar'}
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleImportar}
                  disabled={importando}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleExportar}
                disabled={exportando}
              >
                <IconExport size={20} />
                {exportando ? 'Exportando...' : 'Exportar'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" onClick={() => setMostrarGestionCategorias(true)}>📚 Gestión Categorías</button>
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" onClick={() => setMostrarGestionContextos(true)}>📄 Gestión Contextos</button>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700" onClick={abrirModalCrear}><IconPlus size={20} />Nueva Pregunta</button>
            </div>
          </div>
        </div>

        <>
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center gap-2 mb-4"><IconFilter size={20} className="text-gray-600" /><h2 className="text-lg font-semibold">Filtros</h2></div>
            {/* RF-A.3.5: Filtros del Banco de Preguntas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select className="w-full px-3 py-2 border rounded-lg" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                  <option value="todos">Todas</option>
                  {categorias.map(c => (<option key={c.idCategoria} value={String(c.idCategoria)}>{c.nombre}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                <select className="w-full px-3 py-2 border rounded-lg" value={ano} onChange={(e) => setAno(e.target.value)}>
                  <option value="todos">Todos</option>
                  {anosDisponibles.map(a => (<option key={a} value={a}>{a}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  placeholder="Buscar por código..."
                  className="w-full px-3 py-2 border rounded-lg"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Preguntas ({preguntas.length})</h2>
              </div>
            </div>
            <div className="divide-y">
              {error && <div className="p-6 text-red-600">{error}</div>}
              {loading && <div className="p-6 text-center text-gray-500">Cargando preguntas...</div>}
              {!loading && preguntas.length === 0 && <div className="p-6 text-gray-500">No se encontraron preguntas</div>}
              {preguntas.map(p => {
                // Extraer texto plano del HTML
                const extraerTextoPlano = (html: string): string => {
                  if (!html) return '';
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(html, 'text/html');
                  return doc.body.textContent || doc.body.innerText || '';
                };

                const enunciadoPlano = extraerTextoPlano(p.enunciado || '');
                const primerParrafo = enunciadoPlano.substring(0, 150);

                return (
                  <div key={p.idPregunta} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{p.codigo}</span>
                          {p.ano && <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{p.ano}</span>}
                          {p.contexto && <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1"><IconFileText size={12} />Con contexto</span>}
                        </div>
                        <p className="text-gray-900 mb-3 text-sm line-clamp-2" title={enunciadoPlano}>
                          {primerParrafo}
                          {enunciadoPlano.length > 150 ? '...' : ''}
                        </p>
                        {p.contexto && (
                          <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-purple-700 mb-1">
                              <IconFileText size={16} />
                              <span className="font-medium">Contexto: {p.contexto.titulo || `ID: ${p.contexto.idContexto}`}</span>
                            </div>
                            {p.contexto.texto && (
                              <p className="text-xs text-purple-600 line-clamp-2" title={extraerTextoPlano(p.contexto.texto)}>
                                {extraerTextoPlano(p.contexto.texto).substring(0, 100)}...
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="text-gray-600"><strong>Categoría:</strong> {p.categoria?.nombre ?? 'Sin categoría'}</span>
                          {p.contexto && <span className="text-gray-400">•</span>}
                          {p.contexto && <span className="text-gray-600"><strong>Contexto:</strong> {p.contexto.titulo || `ID: ${p.idContexto}`}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 ml-4">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar" onClick={() => abrirModalEditar(p)}>✎</button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar" onClick={() => eliminarPregunta(p.idPregunta)}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginación */}
            {paginacion.total > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {paginacion.from} a {paginacion.to} de {paginacion.total} resultados
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={paginacion.current_page === 1 || loading}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm text-gray-700">
                      Página {paginacion.current_page} de {paginacion.last_page}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(paginacion.last_page, p + 1))}
                      disabled={paginacion.current_page === paginacion.last_page || loading}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>


        {/* Modal Formulario */}
        {mostrarModal && (
          <FormularioPregunta
            pregunta={preguntaEditando ? {
              id: String(preguntaEditando.idPregunta),
              idPregunta: String(preguntaEditando.idPregunta),
              codigo: preguntaEditando.codigo,
              texto: preguntaEditando.enunciado,
              idCategoria: preguntaEditando.categoria?.idCategoria,
              dificultad: '1' as const,
              ano: preguntaEditando.ano,
              tiene_contexto: !!preguntaEditando.contexto,
              idContexto: preguntaEditando.idContexto ? String(preguntaEditando.idContexto) : undefined,
              opciones: preguntaEditando.opciones?.map((op, idx) => ({
                letra: String.fromCharCode(65 + idx), // A, B, C, D...
                texto: op.contenido,
                es_correcta: op.es_correcta,
                orden: idx + 1
              })) || []
            } : null}
            onGuardar={onPreguntaGuardada}
            onCancelar={cerrarModal}
          />
        )}

        {/* Modal Gestión Categorías */}
        {mostrarGestionCategorias && (
          <GestionCategorias
            onCerrar={() => setMostrarGestionCategorias(false)}
            onCategoriaActualizada={() => {
              cargarCategorias();
            }}
          />
        )}

        {/* Modal Gestión Contextos */}
        {mostrarGestionContextos && (
          <GestionContextos
            onCerrar={() => setMostrarGestionContextos(false)}
            onContextoActualizado={() => {
              // Recargar preguntas para reflejar cambios en los contextos inmediatamente
              cargarPreguntas();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BancoPreguntas;
