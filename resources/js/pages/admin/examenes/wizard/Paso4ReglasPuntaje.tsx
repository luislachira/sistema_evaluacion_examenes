import React, { useState, useEffect } from 'react';
import { examenesService } from '../../../../services/examenesService';
import type { Examen, Subprueba, Postulacion, ReglaPuntaje, DatosPaso4 } from '../../../../types/examenes';
import type { AxiosErrorResponse } from '../../../../types/errors';

interface Props {
  examenId: number;
  examen: Examen;
  datosPaso?: DatosPaso4 | null;
  soloLectura?: boolean;
  onCompletado: () => void;
  onSiguiente: () => void;
  onVolver: () => void;
}

const Paso4ReglasPuntaje: React.FC<Props> = ({
  examenId,
  examen,
  datosPaso,
  soloLectura = false,
  onCompletado,
  onSiguiente,
  onVolver
}) => {
  const [subpruebas, setSubpruebas] = useState<Subprueba[]>([]);
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [reglas, setReglas] = useState<ReglaPuntaje[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRegla, setEditingRegla] = useState<ReglaPuntaje | null>(null);
  const [formData, setFormData] = useState({
    idPostulacion: '',
    idSubprueba: '',
    puntaje_correcto: '',
    puntaje_minimo_subprueba: ''
  });
  const datosCargadosRef = React.useRef<string | null>(null);
  const datosPasoAnteriorRef = React.useRef<DatosPaso4 | null | undefined>(null);

  // Verificar si el examen está finalizado (estado '1' = publicado o '2' = finalizado)
  const examenFinalizado = (examen?.estado === '1' || examen?.estado === '2');

  // Resetear estado cuando cambian los datos del paso
  useEffect(() => {
    if (datosPaso !== datosPasoAnteriorRef.current) {
      datosCargadosRef.current = null;
      datosPasoAnteriorRef.current = datosPaso || null;
    }
  }, [datosPaso]);

  const cargarDatos = React.useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [subpruebasData, postulacionesData] = await Promise.all([
        examenesService.admin.getSubpruebas(examenId),
        examenesService.admin.getPostulaciones(examenId)
      ]);
      setSubpruebas(subpruebasData);
      setPostulaciones(postulacionesData);

      // Cargar reglas de todas las postulaciones, filtrando solo las que tienen subpruebas válidas
      const todasReglas: ReglaPuntaje[] = [];
      const subpruebasIds = subpruebasData.map(s => s.idSubprueba);
      for (const post of postulacionesData) {
        try {
          const reglasPost = await examenesService.admin.getReglasPuntaje(post.idPostulacion);
          // Filtrar reglas que tienen subpruebas válidas
          const reglasValidas = reglasPost.filter(r => subpruebasIds.includes(r.idSubprueba));
          todasReglas.push(...reglasValidas);
        } catch (_err) {
          // Ignorar errores al cargar reglas de una postulación específica
        }
      }
      setReglas(todasReglas);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      const errorMessage = axiosError.response?.data?.message || 'Error al cargar los datos';
      setError(errorMessage);
    } finally {
      setLoadingData(false);
    }
  }, [examenId]);

  // Usar datosPaso si está disponible, sino cargar desde el API
  useEffect(() => {
    // Crear una clave única para estos datos
    const datosKey = datosPaso
      ? `datos-${examenId}-${JSON.stringify({
        subpruebas: datosPaso.subpruebas?.map(s => s.idSubprueba) || [],
        postulaciones: datosPaso.postulaciones?.map(p => p.idPostulacion) || []
      })}`
      : `api-${examenId}`;

    // Si la clave cambió, resetear el ref para forzar recarga
    if (datosCargadosRef.current !== datosKey) {
      datosCargadosRef.current = null;
    }

    if (datosPaso && Array.isArray(datosPaso.subpruebas) && Array.isArray(datosPaso.postulaciones)) {
      setLoadingData(true);
      // Usar datos del paso cargado desde el wizard
      setSubpruebas(datosPaso.subpruebas.map((s: { idSubprueba: number; nombre: string }) => ({
        idSubprueba: s.idSubprueba,
        idExamen: examenId,
        nombre: s.nombre,
        puntaje_por_pregunta: 0,
        orden: 0
      })));

      // Mapear postulaciones con sus reglas
      const postulacionesMapeadas: Postulacion[] = datosPaso.postulaciones.map((p: {
        idPostulacion: number;
        nombre: string;
        descripcion?: string | null;
        tipo_aprobacion: '0' | '1';
        reglasPuntaje?: Array<{
          idRegla: number;
          idSubprueba: number;
          puntaje_correcto: number;
          puntaje_incorrecto: number;
          puntaje_en_blanco: number;
          puntaje_minimo_subprueba: number | null;
        }>;
      }) => ({
        idPostulacion: p.idPostulacion,
        idExamen: examenId,
        nombre: p.nombre,
        descripcion: p.descripcion,
        tipo_aprobacion: p.tipo_aprobacion,
        reglasPuntaje: (p.reglasPuntaje || []).map((r: {
          idRegla: number;
          idSubprueba: number;
          puntaje_correcto: number;
          puntaje_incorrecto: number;
          puntaje_en_blanco: number;
          puntaje_minimo_subprueba: number | null;
        }) => ({
          idRegla: r.idRegla,
          idPostulacion: p.idPostulacion,
          idSubprueba: r.idSubprueba,
          puntaje_correcto: r.puntaje_correcto,
          puntaje_incorrecto: r.puntaje_incorrecto,
          puntaje_en_blanco: r.puntaje_en_blanco,
          puntaje_minimo_subprueba: r.puntaje_minimo_subprueba
        }))
      }));
      setPostulaciones(postulacionesMapeadas);

      // Extraer todas las reglas, filtrando solo las que tienen subpruebas válidas
      const todasReglas: ReglaPuntaje[] = [];
      const subpruebasIds = datosPaso.subpruebas.map((s: { idSubprueba: number }) => s.idSubprueba);

      // Verificar que todas las subpruebas en datosPaso sean válidas
      if (subpruebasIds.length === 0) {
        // Si no hay subpruebas válidas, cargar desde el API
        cargarDatos().then(() => {
          datosCargadosRef.current = datosKey;
        });
        return;
      }

      postulacionesMapeadas.forEach(post => {
        if (post.reglasPuntaje && Array.isArray(post.reglasPuntaje)) {
          // Filtrar reglas que tienen subpruebas válidas
          const reglasValidas = post.reglasPuntaje.filter((r: ReglaPuntaje) => {
            // Verificar que el idSubprueba esté en la lista de subpruebas válidas
            return subpruebasIds.includes(r.idSubprueba);
          });
          todasReglas.push(...reglasValidas);
        }
      });

      // Filtrado adicional: asegurar que todas las reglas tengan subpruebas válidas
      const reglasFinales = todasReglas.filter(r => {
        return subpruebasIds.includes(r.idSubprueba);
      });

      setReglas(reglasFinales);

      // Si no hay reglas válidas pero hay postulaciones, cargar desde el API como respaldo
      if (reglasFinales.length === 0 && postulacionesMapeadas.length > 0) {
        cargarDatos().then(() => {
          datosCargadosRef.current = datosKey;
        });
      } else {
        setLoadingData(false);
        datosCargadosRef.current = datosKey;
      }
    } else {
      // Si no hay datosPaso, cargar desde el API
      if (datosCargadosRef.current !== datosKey) {
        cargarDatos().then(() => {
          datosCargadosRef.current = datosKey;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datosPaso, examenId]);


  const handleCrearRegla = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.idPostulacion || !formData.idSubprueba) {
      setError('Debe seleccionar una postulación y una subprueba');
      return;
    }

    const puntajeCorrecto = parseFloat(formData.puntaje_correcto);
    if (isNaN(puntajeCorrecto) || puntajeCorrecto < 0.01 || puntajeCorrecto > 10.00) {
      setError('El puntaje por respuesta correcta debe estar entre 0.01 y 10.00');
      return;
    }

    // Verificar que no exista ya una regla para esta combinación
    const existeRegla = reglas.find(
      r => r.idPostulacion === parseInt(formData.idPostulacion) &&
        r.idSubprueba === parseInt(formData.idSubprueba)
    );
    if (existeRegla) {
      setError('Ya existe una regla para esta combinación de postulación y subprueba');
      return;
    }

    setLoading(true);
    try {
      await examenesService.admin.createReglaPuntaje(parseInt(formData.idPostulacion), {
        idSubprueba: parseInt(formData.idSubprueba),
        puntaje_correcto: puntajeCorrecto,
        puntaje_incorrecto: 0.00, // Siempre 0 según normativa
        puntaje_en_blanco: 0.00, // Siempre 0 según normativa
        puntaje_minimo_subprueba: formData.puntaje_minimo_subprueba ? parseFloat(formData.puntaje_minimo_subprueba) : null
      });

      await cargarDatos();
      setFormData({ idPostulacion: '', idSubprueba: '', puntaje_correcto: '', puntaje_minimo_subprueba: '' });
      setShowModal(false);
      setEditingRegla(null);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      setError(axiosError.response?.data?.message || 'Error al crear la regla de puntaje');
    } finally {
      setLoading(false);
    }
  };

  const handleEditarRegla = (regla: ReglaPuntaje) => {
    // Verificar que el examen no esté finalizado (estado '1' = publicado o '2' = finalizado)
    if (!examen || examenFinalizado) {
      setError('No se pueden editar reglas de puntaje cuando el examen está finalizado.');
      return;
    }
    setEditingRegla(regla);
    setFormData({
      idPostulacion: regla.idPostulacion.toString(),
      idSubprueba: regla.idSubprueba.toString(),
      puntaje_correcto: regla.puntaje_correcto.toString(),
      puntaje_minimo_subprueba: regla.puntaje_minimo_subprueba ? regla.puntaje_minimo_subprueba.toString() : ''
    });
    setShowModal(true);
  };

  const handleActualizarRegla = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingRegla) return;

    // Verificar que el examen no esté finalizado (estado '1' = publicado o '2' = finalizado)
    if (!examen || examenFinalizado) {
      setError('No se pueden editar reglas de puntaje cuando el examen está finalizado.');
      return;
    }

    const puntajeCorrecto = parseFloat(formData.puntaje_correcto);
    if (isNaN(puntajeCorrecto) || puntajeCorrecto < 0.01 || puntajeCorrecto > 10.00) {
      setError('El puntaje por respuesta correcta debe estar entre 0.01 y 10.00');
      return;
    }

    setLoading(true);
    try {
      await examenesService.admin.updateReglaPuntaje(editingRegla.idRegla, {
        puntaje_correcto: puntajeCorrecto,
        puntaje_incorrecto: 0.00, // Siempre 0 según normativa
        puntaje_en_blanco: 0.00, // Siempre 0 según normativa
        puntaje_minimo_subprueba: formData.puntaje_minimo_subprueba ? parseFloat(formData.puntaje_minimo_subprueba) : null
      });

      await cargarDatos();
      setFormData({ idPostulacion: '', idSubprueba: '', puntaje_correcto: '', puntaje_minimo_subprueba: '' });
      setShowModal(false);
      setEditingRegla(null);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      setError(axiosError.response?.data?.message || 'Error al actualizar la regla de puntaje');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: number) => {
    // Verificar que el examen no esté finalizado (estado '1' = publicado o '2' = finalizado)
    if (!examen || examenFinalizado) {
      setError('No se pueden eliminar reglas de puntaje cuando el examen está finalizado.');
      return;
    }

    if (!confirm('¿Está seguro de eliminar esta regla?')) {
      return;
    }

    try {
      await examenesService.admin.deleteReglaPuntaje(id);
      await cargarDatos();
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      setError(axiosError.response?.data?.message || 'Error al eliminar la regla');
    }
  };

  // Verificar que cada postulación tenga al menos 1 regla
  const postulacionesSinReglas = postulaciones.filter(post => {
    return !reglas.some(r => r.idPostulacion === post.idPostulacion);
  });

  const puedeContinuar = postulaciones.length > 0 && postulacionesSinReglas.length === 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          PASO 4: Configuración de Reglas de Puntaje
        </h2>
        <p className="text-sm text-gray-600">
          Debe configurar cómo se calificará cada postulación. Cada postulación debe tener al menos 1 regla configurada.
        </p>
      </div>

      {error && !showModal && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Validación pendiente - Solo mostrar cuando los datos estén cargados */}
      {!loadingData && postulacionesSinReglas.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm font-medium mb-2">
            ⚠ VALIDACIÓN PENDIENTE:
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-700">
            {postulacionesSinReglas.map(post => (
              <li key={post.idPostulacion}>
                La postulación "{post.nombre}" no tiene reglas configuradas
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Matriz de reglas */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Matriz de Reglas de Puntaje</h3>
          {!soloLectura && examen && !examenFinalizado && (
            <button
              onClick={() => {
                setFormData({ idPostulacion: '', idSubprueba: '', puntaje_correcto: '', puntaje_minimo_subprueba: '' });
                setEditingRegla(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Nueva Regla Puntaje
            </button>
          )}
        </div>

        {loadingData ? (
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <p className="text-gray-600">Cargando datos...</p>
          </div>
        ) : postulaciones.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <p className="text-gray-600">Debe crear postulaciones en el Paso 3 antes de configurar reglas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {postulaciones.map((postulacion) => {
              // Obtener IDs de subpruebas válidas
              const subpruebasIds = subpruebas.map(s => s.idSubprueba);

              // Filtrar reglas de esta postulación y asegurar que tengan subpruebas válidas
              const reglasPost = reglas
                .filter(r => r.idPostulacion === postulacion.idPostulacion)
                .filter(r => {
                  // Verificar que la regla tenga una subprueba válida (debe existir en el array de subpruebas)
                  return subpruebasIds.includes(r.idSubprueba);
                });

              // Eliminar duplicados por idSubprueba (mantener solo la primera)
              const reglasUnicas = reglasPost.reduce((acc: ReglaPuntaje[], regla) => {
                const existe = acc.find(r => r.idSubprueba === regla.idSubprueba);
                if (!existe) {
                  acc.push(regla);
                }
                return acc;
              }, []);

              const tieneReglas = reglasUnicas.length > 0;

              return (
                <div key={postulacion.idPostulacion} className="p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-900">
                      POSTULACIÓN: {postulacion.nombre}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded ${tieneReglas ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {tieneReglas ? '✓ CONFIGURADA' : '⚠ SIN REGLAS'}
                    </span>
                  </div>

                  {tieneReglas ? (
                    <div className="space-y-2">
                      {reglasUnicas.map((regla) => {
                        const subprueba = subpruebas.find(s => s.idSubprueba === regla.idSubprueba);
                        // Si no se encuentra la subprueba, no debería mostrarse (ya fue filtrada arriba)
                        // Pero por seguridad, verificamos nuevamente
                        if (!subprueba) {
                          return null; // No renderizar reglas con subpruebas eliminadas
                        }

                        return (
                          <div
                            key={regla.idRegla}
                            className="p-3 rounded border bg-gray-50 border-gray-200 flex justify-between items-center"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                Subprueba: {subprueba.nombre}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                • Puntaje por acierto: {regla.puntaje_correcto} puntos
                              </p>
                              {regla.puntaje_minimo_subprueba && (
                                <p className="text-xs text-gray-600">
                                  • Puntaje mínimo requerido: {regla.puntaje_minimo_subprueba} puntos
                                </p>
                              )}
                            </div>
                            {!soloLectura && examen && !examenFinalizado && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditarRegla(regla)}
                                  className="px-2 py-1 text-blue-600 hover:text-blue-800 text-sm"
                                  title="Editar regla (solo en borrador)"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleEliminar(regla.idRegla)}
                                  className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                                  title="Eliminar regla (solo en borrador)"
                                >
                                  ❌
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay reglas configuradas para esta postulación.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {puedeContinuar && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ Requisito cumplido: Todas las postulaciones tienen reglas configuradas
            </p>
          </div>
        )}
      </div>

      {/* Modal para crear/editar regla */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingRegla ? 'Editar Regla de Puntaje' : 'Crear Regla de Puntaje'}
            </h3>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={editingRegla ? handleActualizarRegla : handleCrearRegla}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Para la Postulación <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.idPostulacion}
                    onChange={(e) => setFormData({ ...formData, idPostulacion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    disabled={!!editingRegla}
                  >
                    <option value="">Seleccione...</option>
                    {postulaciones.map(post => (
                      <option key={post.idPostulacion} value={post.idPostulacion}>
                        {post.nombre}
                      </option>
                    ))}
                  </select>
                  {editingRegla && (
                    <p className="mt-1 text-xs text-gray-500">
                      La postulación no se puede modificar al editar
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    En la Subprueba <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.idSubprueba}
                    onChange={(e) => setFormData({ ...formData, idSubprueba: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    disabled={!!editingRegla}
                  >
                    <option value="">Seleccione...</option>
                    {subpruebas.map(sub => (
                      <option key={sub.idSubprueba} value={sub.idSubprueba}>
                        {sub.nombre}
                      </option>
                    ))}
                  </select>
                  {editingRegla && (
                    <p className="mt-1 text-xs text-gray-500">
                      La subprueba no se puede modificar al editar
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Puntaje por Respuesta Correcta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="10.00"
                    value={formData.puntaje_correcto}
                    onChange={(e) => setFormData({ ...formData, puntaje_correcto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="1.50"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Decimal positivo (0.01 - 10.00). Ejemplo: 1.5 puntos por cada acierto.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Puntaje Mínimo Requerido (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.puntaje_minimo_subprueba}
                    onChange={(e) => setFormData({ ...formData, puntaje_minimo_subprueba: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="57.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Deje vacío si esta subprueba NO requiere puntaje mínimo. Ejemplo: 57.00 puntos mínimo para aprobar.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRegla(null);
                    setFormData({ idPostulacion: '', idSubprueba: '', puntaje_correcto: '', puntaje_minimo_subprueba: '' });
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (editingRegla ? 'Actualizando...' : 'Creando...') : (editingRegla ? 'Actualizar Regla Puntaje' : 'Crear Regla Puntaje')}
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
          ← Volver a Paso 3
        </button>
        <button
          onClick={async () => {
            if (puedeContinuar) {
              await examenesService.admin.actualizarPaso(examenId, 4);
              onCompletado();
              onSiguiente();
            }
          }}
          disabled={!puedeContinuar}
          className={`px-6 py-2 rounded-md ${puedeContinuar
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

export default Paso4ReglasPuntaje;

