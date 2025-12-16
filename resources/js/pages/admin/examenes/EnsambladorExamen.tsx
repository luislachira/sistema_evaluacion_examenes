import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';

const IconX = ({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface Opcion {
  idOpcion: number;
  contenido: string;
  es_correcta: boolean;
}

interface Pregunta {
  idPregunta: number;
  codigo: string;
  enunciado: string;
  categoria?: { idCategoria: number; nombre: string };
  contexto?: { idContexto: number; titulo?: string } | null;
  ano: number;
  opciones?: Opcion[];
}

interface PreguntaExamen {
  idPregunta: number;
  codigo: string;
  enunciado: string;
  categoria?: { idCategoria: number; nombre: string };
  contexto?: { idContexto: number; titulo?: string } | null;
  ano: number;
  orden: number;
  opciones?: Opcion[];
  idSubprueba?: number;
}

interface Props {
  examenId: number;
  soloLectura?: boolean;
  onCerrar: () => void;
  onPreguntasActualizadas?: () => void;
  mostrarComoModal?: boolean; // Controla si se muestra como modal o contenido incrustado
}

const EnsambladorExamen = ({ examenId, soloLectura = false, onCerrar, onPreguntasActualizadas, mostrarComoModal = true }: Props) => {
  const { token } = useAuth();
  const [preguntasDisponibles, setPreguntasDisponibles] = useState<Pregunta[]>([]);
  // Cambiar a estructura organizada por subprueba: { [idSubprueba]: PreguntaExamen[] }
  const [preguntasPorSubprueba, setPreguntasPorSubprueba] = useState<Record<number, PreguntaExamen[]>>({});
  const [preguntasPorSubpruebaInicial, setPreguntasPorSubpruebaInicial] = useState<Record<number, PreguntaExamen[]>>({}); // Estado inicial para cancelar
  const [loading, setLoading] = useState(false);
  const [generandoAleatorio, setGenerandoAleatorio] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // RF-A.3.5: Filtros del Banco de Preguntas
  const [filtros, setFiltros] = useState({
    idCategoria: '',
    ano: '',
    codigo: '',
  });

  const [preguntaArrastrando, setPreguntaArrastrando] = useState<number | null>(null);
  const [subpruebas, setSubpruebas] = useState<Array<{ idSubprueba: number; nombre: string }>>([]);
  const [mostrarModalCantidad, setMostrarModalCantidad] = useState(false);
  const [cantidadInput, setCantidadInput] = useState('10');
  const [subpruebaSeleccionadaParaGenerar, setSubpruebaSeleccionadaParaGenerar] = useState<number | null>(null);
  const [examenEstado, setExamenEstado] = useState<string | null>(null); // Estado del examen ('0' = borrador, '1' = publicado)

  // Filtros para la generación aleatoria (independientes de los filtros del banco)
  const [filtrosGeneracion, setFiltrosGeneracion] = useState({
    idCategoria: '',
    ano: '',
    codigo: '',
  });

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/examenes/${examenId}/ensamblar`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setPreguntasDisponibles(data.preguntas_disponibles || []);

        // Organizar preguntas por subprueba
        const preguntasPorSubpruebaMap: Record<number, PreguntaExamen[]> = {};

        if (data.preguntas_por_subprueba) {
          // Si vienen organizadas por subprueba desde el backend
          Object.entries(data.preguntas_por_subprueba).forEach(([idSubpruebaStr, preguntasSubprueba]: [string, unknown]) => {
            const idSubprueba = parseInt(idSubpruebaStr, 10);
            if (Array.isArray(preguntasSubprueba)) {
              preguntasPorSubpruebaMap[idSubprueba] = preguntasSubprueba.map((p: Pregunta & { orden?: number }) => ({
                idPregunta: p.idPregunta,
                codigo: p.codigo,
                enunciado: p.enunciado,
                categoria: p.categoria,
                contexto: p.contexto,
                ano: p.ano,
                orden: p.orden || 0,
                opciones: p.opciones || [],
                idSubprueba: idSubprueba
              })).sort((a, b) => a.orden - b.orden);
            }
          });
        } else if (data.examen?.preguntas) {
          // Si vienen directamente del examen, agruparlas por idSubprueba
          (data.examen.preguntas || []).forEach((p: Pregunta & { orden?: number; pivot?: { orden?: number; idSubprueba?: number } }, index: number) => {
            const idSubprueba = p.pivot?.idSubprueba;
            if (idSubprueba) {
              if (!preguntasPorSubpruebaMap[idSubprueba]) {
                preguntasPorSubpruebaMap[idSubprueba] = [];
              }
              preguntasPorSubpruebaMap[idSubprueba].push({
                idPregunta: p.idPregunta,
                codigo: p.codigo,
                enunciado: p.enunciado,
                categoria: p.categoria,
                contexto: p.contexto,
                ano: p.ano,
                orden: p.pivot?.orden || p.orden || (index + 1),
                opciones: p.opciones || [],
                idSubprueba: idSubprueba
              });
            }
          });

          // Ordenar cada grupo por orden
          Object.keys(preguntasPorSubpruebaMap).forEach(idSubpruebaStr => {
            const idSubprueba = parseInt(idSubpruebaStr, 10);
            preguntasPorSubpruebaMap[idSubprueba].sort((a, b) => a.orden - b.orden);
          });
        }

        // Inicializar todas las subpruebas (incluso si no tienen preguntas)
        const preguntasPorSubpruebaCompleto: Record<number, PreguntaExamen[]> = {};
        if (data.subpruebas) {
          data.subpruebas.forEach((s: { idSubprueba: number; nombre: string }) => {
            preguntasPorSubpruebaCompleto[s.idSubprueba] = preguntasPorSubpruebaMap[s.idSubprueba] || [];
          });
        }

        setPreguntasPorSubprueba(preguntasPorSubpruebaCompleto);
        // Guardar el estado inicial para poder restaurar si se cancela
        setPreguntasPorSubpruebaInicial(JSON.parse(JSON.stringify(preguntasPorSubpruebaCompleto)));

        // Cargar subpruebas
        if (data.subpruebas) {
          setSubpruebas(data.subpruebas.map((s: { idSubprueba: number; nombre: string }) => ({
            idSubprueba: s.idSubprueba,
            nombre: s.nombre
          })));
        } else {
          setSubpruebas([]);
        }

        // Cargar estado del examen
        if (data.examen?.estado !== undefined) {
          setExamenEstado(data.examen.estado);
        }
      }
    } catch {
      // Ignorar errores al cargar datos
    } finally {
      setLoading(false);
    }
  }, [examenId, token]);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examenId]);

  const filtrarPreguntas = useCallback(() => {
    let filtradas = preguntasDisponibles;

    if (filtros.idCategoria) {
      filtradas = filtradas.filter(p => p.categoria?.idCategoria === parseInt(filtros.idCategoria));
    }
    if (filtros.ano) {
      filtradas = filtradas.filter(p => p.ano === parseInt(filtros.ano));
    }
    if (filtros.codigo) {
      filtradas = filtradas.filter(p => p.codigo.toLowerCase().includes(filtros.codigo.toLowerCase()));
    }

    return filtradas;
  }, [preguntasDisponibles, filtros]);

  const preguntasFiltradas = filtrarPreguntas();

  // Función auxiliar: obtener todas las preguntas del examen (aplanadas)
  const obtenerTodasLasPreguntas = useCallback((): PreguntaExamen[] => {
    return Object.values(preguntasPorSubprueba).flat();
  }, [preguntasPorSubprueba]);

  // Función auxiliar: verificar si una pregunta ya está en el examen
  const preguntaYaEstaEnExamen = useCallback((idPregunta: number): boolean => {
    return obtenerTodasLasPreguntas().some(p => p.idPregunta === idPregunta);
  }, [obtenerTodasLasPreguntas]);

  // RF-A.4.4: Drag and Drop - Agregar pregunta al examen
  const handleDragStart = (e: React.DragEvent, preguntaId: number) => {
    setPreguntaArrastrando(preguntaId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Manejar drop en una subprueba específica
  const handleDropEnSubprueba = (e: React.DragEvent, idSubprueba: number) => {
    e.preventDefault();
    if (preguntaArrastrando) {
      const pregunta = preguntasDisponibles.find(p => p.idPregunta === preguntaArrastrando);
      if (pregunta && !preguntaYaEstaEnExamen(pregunta.idPregunta)) {
        const preguntasDeEstaSubprueba = preguntasPorSubprueba[idSubprueba] || [];
        const nuevaPregunta: PreguntaExamen = {
          ...pregunta,
          orden: preguntasDeEstaSubprueba.length + 1,
          idSubprueba: idSubprueba
        };

        setPreguntasPorSubprueba({
          ...preguntasPorSubprueba,
          [idSubprueba]: [...preguntasDeEstaSubprueba, nuevaPregunta]
        });
      }
      setPreguntaArrastrando(null);
    }
  };


  // RF-A.4.4: Drag and Drop - Reordenar preguntas dentro de una subprueba
  const handleDragStartExamen = (e: React.DragEvent, idSubprueba: number, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ idSubprueba, index }));
  };

  const handleDropExamen = (e: React.DragEvent, idSubprueba: number, targetIndex: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    try {
      const { idSubprueba: sourceSubprueba, index: sourceIndex } = JSON.parse(data);

      // Solo reordenar si es la misma subprueba
      if (sourceSubprueba === idSubprueba && !isNaN(sourceIndex) && sourceIndex !== targetIndex) {
        const preguntasDeEstaSubprueba = [...(preguntasPorSubprueba[idSubprueba] || [])];
        const [removida] = preguntasDeEstaSubprueba.splice(sourceIndex, 1);
        preguntasDeEstaSubprueba.splice(targetIndex, 0, removida);

        // Reordenar los índices
        preguntasDeEstaSubprueba.forEach((p, idx) => {
          p.orden = idx + 1;
        });

        setPreguntasPorSubprueba({
          ...preguntasPorSubprueba,
          [idSubprueba]: preguntasDeEstaSubprueba
        });
      }
    } catch {
      // Ignorar errores al parsear datos de drag and drop
    }
  };

  const eliminarPregunta = (idPregunta: number, idSubprueba: number) => {
    // Solo eliminar del estado local, no de la base de datos hasta que se guarde
    const preguntasDeEstaSubprueba = (preguntasPorSubprueba[idSubprueba] || []).filter(p => p.idPregunta !== idPregunta);

    // Reordenar los índices
    preguntasDeEstaSubprueba.forEach((p, idx) => {
      p.orden = idx + 1;
    });

    setPreguntasPorSubprueba({
      ...preguntasPorSubprueba,
      [idSubprueba]: preguntasDeEstaSubprueba
    });
  };

  const eliminarTodasLasPreguntas = () => {
    // Solo permitir si el examen está en borrador
    if (examenEstado !== '0' && examenEstado !== null) {
      alert('⚠️ Solo se pueden eliminar todas las preguntas cuando el examen está en estado borrador.');
      return;
    }

    // Confirmar acción
    if (window.confirm('¿Estás seguro de que deseas eliminar todas las preguntas del examen?\n\nEsta acción solo se puede realizar cuando el examen está en borrador.')) {
      // Limpiar todas las subpruebas
      const subpruebasVacias: Record<number, PreguntaExamen[]> = {};
      subpruebas.forEach(s => {
        subpruebasVacias[s.idSubprueba] = [];
      });
      setPreguntasPorSubprueba(subpruebasVacias);
    }
  };

  // RF-A.4.4: Abrir modal para generar aleatorio para una subprueba específica
  const abrirModalGenerarAleatorio = (idSubprueba?: number) => {
    // Verificar que haya subpruebas configuradas
    if (subpruebas.length === 0) {
      alert('⚠ El examen debe tener al menos una subprueba configurada antes de generar preguntas aleatorias.\n\nPor favor, configure las subpruebas desde el botón "Gestionar Subpruebas" en la página del examen.');
      return;
    }

    if (loading) {
      return;
    }

    if (generandoAleatorio) {
      return;
    }

    // Si no se especifica subprueba, usar la primera
    const subpruebaParaGenerar = idSubprueba || (subpruebas.length > 0 ? subpruebas[0].idSubprueba : null);
    setSubpruebaSeleccionadaParaGenerar(subpruebaParaGenerar);

    // Resetear filtros de generación
    setFiltrosGeneracion({
      idCategoria: '',
      ano: '',
      codigo: '',
    });

    // Abrir modal
    setCantidadInput('10');
    setMostrarModalCantidad(true);
  };

  // RF-A.4.4: Generar Aleatorio
  const generarAleatorio = async (cantidadStr: string) => {
    // Si el usuario ingresa una cadena vacía o solo espacios
    const cantidadTrimmed = cantidadStr.trim();
    if (cantidadTrimmed === '') {
      alert('⚠️ Por favor ingrese un número válido');
      return;
    }

    // Validar que sea un número válido
    const cantidad = parseInt(cantidadTrimmed, 10);
    if (isNaN(cantidad) || cantidad <= 0) {
      alert('⚠️ Por favor ingrese un número mayor a 0');
      return;
    }

    // Cerrar modal
    setMostrarModalCantidad(false);

    try {
      setGenerandoAleatorio(true);
      const payload: { cantidad: number; idCategoria?: number; ano?: number; codigo?: string; preguntas_actuales?: number[] } = {
        cantidad: cantidad,
      };

      // Incluir filtros de generación si están configurados
      if (filtrosGeneracion.idCategoria) {
        payload.idCategoria = parseInt(filtrosGeneracion.idCategoria);
      }

      if (filtrosGeneracion.ano) {
        payload.ano = parseInt(filtrosGeneracion.ano);
      }

      if (filtrosGeneracion.codigo && filtrosGeneracion.codigo.trim()) {
        payload.codigo = filtrosGeneracion.codigo.trim();
      }

      // Incluir las preguntas que están actualmente en el estado local del frontend
      // para que el backend las excluya al generar aleatorias
      const todasLasPreguntas = obtenerTodasLasPreguntas();
      if (todasLasPreguntas.length > 0) {
        payload.preguntas_actuales = todasLasPreguntas.map(p => p.idPregunta);
      }

      const res = await fetch(`/api/v1/admin/examenes/${examenId}/preguntas/generar-aleatorio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();

        // Agregar las preguntas generadas al estado local (no a la BD todavía)
        if (data.preguntas_disponibles && Array.isArray(data.preguntas_disponibles) && subpruebaSeleccionadaParaGenerar) {
          const preguntasDeEstaSubprueba = preguntasPorSubprueba[subpruebaSeleccionadaParaGenerar] || [];
          const nuevasPreguntas: PreguntaExamen[] = data.preguntas_disponibles.map((p: Pregunta, index: number) => ({
            idPregunta: p.idPregunta,
            codigo: p.codigo,
            enunciado: p.enunciado,
            categoria: p.categoria,
            contexto: p.contexto,
            ano: p.ano,
            orden: preguntasDeEstaSubprueba.length + index + 1,
            opciones: p.opciones || [],
            idSubprueba: subpruebaSeleccionadaParaGenerar
          }));

          setPreguntasPorSubprueba({
            ...preguntasPorSubprueba,
            [subpruebaSeleccionadaParaGenerar]: [...preguntasDeEstaSubprueba, ...nuevasPreguntas]
          });
          alert(`✓ ${data.message || 'Preguntas generadas exitosamente'}\nPreguntas agregadas: ${data.cantidad || 0}\n\nRecuerda presionar "Guardar Cambios" para guardar las modificaciones.`);
        } else {
          alert(`✓ ${data.message || 'Preguntas generadas exitosamente'}\nPreguntas agregadas: ${data.cantidad || 0}`);
        }
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Error al generar preguntas aleatorias' }));
        const mensaje = errorData.message || 'Error al generar preguntas aleatorias';
        const disponibles = errorData.disponibles ?? null;
        const solicitadas = errorData.solicitadas ?? null;

        if (mensaje.includes('subprueba')) {
          alert(`⚠ ${mensaje}\n\nPor favor, configure al menos una subprueba para este examen antes de generar preguntas aleatorias.`);
        } else if (mensaje.includes('suficientes') || mensaje.includes('disponibles')) {
          let mensajeCompleto = `⚠ ${mensaje}`;
          if (disponibles !== null && solicitadas !== null) {
            mensajeCompleto += `\n\nDisponibles: ${disponibles}\nSolicitadas: ${solicitadas}`;
          }
          mensajeCompleto += '\n\nIntenta eliminar algunas preguntas del examen o reduce la cantidad solicitada.';
          alert(mensajeCompleto);
        } else {
          alert(`❌ ${mensaje}`);
        }
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setGenerandoAleatorio(false);
    }
  };

  const guardar = async () => {
    try {
      setGuardando(true);
      // Aplanar todas las preguntas de todas las subpruebas, manteniendo el orden dentro de cada subprueba
      const preguntasData: Array<{ idPregunta: number; orden: number; idSubprueba: number }> = [];

      Object.entries(preguntasPorSubprueba).forEach(([idSubpruebaStr, preguntas]) => {
        const idSubprueba = parseInt(idSubpruebaStr, 10);
        preguntas.forEach((p, index) => {
          preguntasData.push({
            idPregunta: p.idPregunta,
            orden: index + 1, // Orden dentro de la subprueba
            idSubprueba: idSubprueba
          });
        });
      });

      const payload = { preguntas: preguntasData };

      const res = await fetch(`/api/v1/admin/examenes/${examenId}/preguntas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (onPreguntasActualizadas) onPreguntasActualizadas();
        onCerrar();
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Error al guardar las preguntas' }));
        const mensaje = errorData.message || errorData.errors ? JSON.stringify(errorData.errors || errorData) : 'Error al guardar las preguntas';
        alert(mensaje);
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const extraerTextoPlano = (html: string): string => {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || doc.body.innerText || '';
  };

  const contenido = (
    <div className={`bg-white rounded-lg shadow-2xl w-full max-w-7xl ${mostrarComoModal ? 'max-h-[95vh]' : 'max-h-[80vh]'} overflow-hidden flex flex-col`}>
        <div className="flex justify-between items-center p-6 border-b bg-white">
          <h3 className="text-2xl font-bold text-gray-900">Ensamblador de Examen</h3>
          <button onClick={onCerrar} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full">
            <IconX size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* RF-A.4.4: Columna Izquierda - Banco de Preguntas */}
          <div className="w-1/2 border-r overflow-y-auto p-4 bg-gray-50">
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-3">Banco de Preguntas</h4>

              {/* RF-A.3.5: Filtros */}
              <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
                    <select
                      value={filtros.idCategoria}
                      onChange={(e) => setFiltros({ ...filtros, idCategoria: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    >
                      <option value="">Todas</option>
                      {Array.from(new Set(preguntasDisponibles.map(p => p.categoria?.idCategoria).filter(Boolean))).map(id => {
                        const cat = preguntasDisponibles.find(p => p.categoria?.idCategoria === id)?.categoria;
                        return cat ? <option key={id} value={id}>{cat.nombre}</option> : null;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Año</label>
                    <input
                      type="number"
                      value={filtros.ano}
                      onChange={(e) => setFiltros({ ...filtros, ano: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded"
                      placeholder="Año"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Código</label>
                    <input
                      type="text"
                      value={filtros.codigo}
                      onChange={(e) => setFiltros({ ...filtros, codigo: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded"
                      placeholder="Buscar código"
                    />
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-2">
                {preguntasFiltradas.length} pregunta(s) disponible(s)
              </div>
            </div>

            <div className="space-y-2">
              {preguntasFiltradas.map((pregunta) => {
                const yaEstaEnExamen = preguntaYaEstaEnExamen(pregunta.idPregunta);
                const textoPlano = extraerTextoPlano(pregunta.enunciado).substring(0, 100);

                return (
                  <div
                    key={pregunta.idPregunta}
                    draggable={!soloLectura && !yaEstaEnExamen}
                    onDragStart={!soloLectura && !yaEstaEnExamen ? (e) => handleDragStart(e, pregunta.idPregunta) : undefined}
                    className={`p-3 rounded-lg border ${
                      soloLectura || yaEstaEnExamen
                        ? 'bg-gray-200 border-gray-300 opacity-50 cursor-not-allowed'
                        : 'bg-white border-gray-300 hover:border-blue-500 hover:shadow-md cursor-move'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {pregunta.codigo}
                          </span>
                          {pregunta.categoria && (
                            <span className="text-xs text-gray-600">{pregunta.categoria.nombre}</span>
                          )}
                          {pregunta.ano && (
                            <span className="text-xs text-gray-500">{pregunta.ano}</span>
                          )}
                        </div>
                            <p className="text-sm text-gray-900 line-clamp-2">{textoPlano}...</p>
                            {pregunta.opciones && pregunta.opciones.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                {pregunta.opciones.length} opción(es) disponible(s)
                              </div>
                            )}
                            {yaEstaEnExamen && (
                              <span className="text-xs text-green-600 mt-1 block">✓ Ya en el examen</span>
                            )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RF-A.4.4: Columna Derecha - Preguntas del Examen organizadas por Subprueba */}
          <div className="w-1/2 overflow-y-auto p-4 bg-white">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-lg font-semibold">Preguntas del Examen ({obtenerTodasLasPreguntas().length})</h4>
                  <p className="text-sm text-gray-600">Organizadas por subprueba - Arrastra para reordenar</p>
                </div>
                {/* Botón para eliminar todas las preguntas - Solo visible en borrador */}
                {!soloLectura && (examenEstado !== '1') ? (
                  obtenerTodasLasPreguntas().length > 0 && (
                    <button
                      onClick={eliminarTodasLasPreguntas}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-1"
                      title="Eliminar todas las preguntas (solo en borrador)"
                    >
                      <span>🗑️</span>
                      <span>Eliminar Todas</span>
                    </button>
                  )
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              {subpruebas.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No hay subpruebas configuradas</p>
                  <p className="text-xs mt-2">Configure las subpruebas primero</p>
                </div>
              ) : (
                subpruebas.map((subprueba) => {
                  const preguntasDeEstaSubprueba = preguntasPorSubprueba[subprueba.idSubprueba] || [];
                  return (
                    <div key={subprueba.idSubprueba} className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-gray-900">{subprueba.nombre}</h5>
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                            {preguntasDeEstaSubprueba.length} pregunta(s)
                          </span>
                        </div>
                        {!soloLectura && (
                          <button
                            onClick={() => abrirModalGenerarAleatorio(subprueba.idSubprueba)}
                            disabled={generandoAleatorio || loading}
                            className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                            title="Generar preguntas aleatorias para esta subprueba"
                          >
                            🎲 Generar
                          </button>
                        )}
                      </div>
                      <div
                        onDragOver={!soloLectura ? handleDragOver : undefined}
                        onDrop={!soloLectura ? (e) => handleDropEnSubprueba(e, subprueba.idSubprueba) : undefined}
                        className={`min-h-[100px] border-2 border-dashed rounded-lg p-2 ${
                          preguntasDeEstaSubprueba.length === 0
                            ? 'border-gray-300 bg-gray-50'
                            : 'border-transparent bg-white'
                        }`}
                      >
                        {preguntasDeEstaSubprueba.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            <p>Arrastra preguntas aquí</p>
                            <p className="text-xs mt-1">o usa "Generar"</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {preguntasDeEstaSubprueba.map((pregunta, index) => {
                              const textoPlano = extraerTextoPlano(pregunta.enunciado).substring(0, 100);
                              return (
                                <div
                                  key={pregunta.idPregunta}
                                  draggable={!soloLectura}
                                  onDragStart={!soloLectura ? (e) => handleDragStartExamen(e, subprueba.idSubprueba, index) : undefined}
                                  onDragOver={!soloLectura ? handleDragOver : undefined}
                                  onDrop={!soloLectura ? (e) => handleDropExamen(e, subprueba.idSubprueba, index) : undefined}
                                  className={`p-2 rounded-lg border border-blue-300 bg-blue-50 ${soloLectura ? 'cursor-default' : 'hover:bg-blue-100 cursor-move'}`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-1.5 py-0.5 rounded">
                                          #{pregunta.orden}
                                        </span>
                                        <span className="text-xs font-mono text-gray-500">{pregunta.codigo}</span>
                                      </div>
                                      <p className="text-xs text-gray-900 line-clamp-2">{textoPlano}...</p>
                                    </div>
                                    {!soloLectura && (
                                      <button
                                        onClick={() => eliminarPregunta(pregunta.idPregunta, subprueba.idSubprueba)}
                                        className="ml-2 text-red-600 hover:text-red-800 text-xs"
                                        title="Eliminar"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-white flex justify-end space-x-3">
          <button
            onClick={() => {
              // Restaurar el estado inicial al cancelar
              setPreguntasPorSubprueba(JSON.parse(JSON.stringify(preguntasPorSubpruebaInicial)));
              onCerrar();
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          {!soloLectura && (
            <button
              onClick={guardar}
              disabled={guardando || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          )}
        </div>
      </div>
  );

  return (
    <>
      {mostrarComoModal ? (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 p-4 z-50 flex items-center justify-center">
          {contenido}
        </div>
      ) : (
        contenido
      )}

      {/* Modal para cantidad de preguntas aleatorias con filtros */}
      {mostrarModalCantidad && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Generar Preguntas Aleatorias
            </h3>
            {subpruebaSeleccionadaParaGenerar && (
              <p className="text-sm text-gray-600 mb-4">
                Para: <span className="font-semibold text-purple-600">
                  {subpruebas.find(s => s.idSubprueba === subpruebaSeleccionadaParaGenerar)?.nombre}
                </span>
              </p>
            )}

            {/* Filtros */}
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={filtrosGeneracion.idCategoria}
                  onChange={(e) => setFiltrosGeneracion({ ...filtrosGeneracion, idCategoria: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Todas las categorías</option>
                  {Array.from(new Set(preguntasDisponibles.map(p => p.categoria?.idCategoria).filter(Boolean))).map(id => {
                    const cat = preguntasDisponibles.find(p => p.categoria?.idCategoria === id)?.categoria;
                    return cat ? <option key={id} value={id}>{cat.nombre}</option> : null;
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Año
                </label>
                <input
                  type="number"
                  value={filtrosGeneracion.ano}
                  onChange={(e) => setFiltrosGeneracion({ ...filtrosGeneracion, ano: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ej: 2024 (dejar vacío para todos)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={filtrosGeneracion.codigo}
                  onChange={(e) => setFiltrosGeneracion({ ...filtrosGeneracion, codigo: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Buscar por código (dejar vacío para todos)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad de preguntas
                </label>
                <input
                  type="number"
                  min="1"
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      generarAleatorio(cantidadInput);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ej: 10"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                onClick={() => {
                  setMostrarModalCantidad(false);
                  setCantidadInput('10');
                  setFiltrosGeneracion({
                    idCategoria: '',
                    ano: '',
                    codigo: '',
                  });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => generarAleatorio(cantidadInput)}
                disabled={generandoAleatorio}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generandoAleatorio ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnsambladorExamen;

