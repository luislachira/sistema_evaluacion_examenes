import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useExamenes } from '../../../hooks/useExamenes';
import { examenesService } from '../../../services/examenesService';
import type { ExamenFilters } from '../../../types/examenes';
import { Card } from '@/components/ui/card';
import GestionTipoConcurso from './GestionTipoConcurso';
import GestionSubpruebas from './GestionSubpruebas';
import GestionPostulaciones from './GestionPostulaciones';
import EnsambladorExamen from './EnsambladorExamen';
import AsignarUsuarios from './AsignarUsuarios';
import ContenidoHTML from '../../../components/ContenidoHTML';
import '@css/banco-preguntas.css';
import '@css/admin/examenes.css';

const ExamenesIndex: React.FC = () => {
  const navigate = useNavigate();
  const {
    examenes,
    paginacion,
    loading,
    error,
    getExamenes,
    deleteExamen,
    cambiarEstado,
    duplicarExamen,
    clearError
  } = useExamenes();

  // Ref para evitar llamadas duplicadas en React StrictMode
  const examenesCargadosRef = useRef(false);

  // Función helper para extraer texto plano del HTML
  const extraerTextoPlano = (html: string): string => {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || doc.body.innerText || '';
  };

  // Función helper para extraer solo la primera línea de texto del HTML
  const extraerPrimeraLinea = (html: string): string => {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const texto = doc.body.textContent || doc.body.innerText || '';
    // Obtener solo la primera línea (hasta el primer salto de línea o los primeros caracteres)
    const primeraLinea = texto.split('\n')[0].trim();
    // Limitar a 100 caracteres para la tabla
    return primeraLinea.length > 100 ? primeraLinea.substring(0, 100) + '...' : primeraLinea;
  };

  const [filters, setFilters] = useState<ExamenFilters>({
    search: '',
    estado: undefined,
    per_page: 10,
    page: 1
  });

  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [mostrarGestionTipoConcurso, setMostrarGestionTipoConcurso] = useState(false);
  const [examenParaSubpruebas, setExamenParaSubpruebas] = useState<number | null>(null);
  const [examenParaPostulaciones, setExamenParaPostulaciones] = useState<number | null>(null);
  const [examenParaEnsamblar, setExamenParaEnsamblar] = useState<number | null>(null);
  const [examenParaAsignar, setExamenParaAsignar] = useState<number | null>(null);
  const [creandoExamen, setCreandoExamen] = useState(false);

  // Cargar exámenes al montar el componente (solo una vez)
  useEffect(() => {
    if (!examenesCargadosRef.current) {
      examenesCargadosRef.current = true;
      getExamenes(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prevenir scroll del body cuando hay modales abiertos
  useEffect(() => {
    if (mostrarGestionTipoConcurso || examenParaSubpruebas || examenParaPostulaciones || examenParaEnsamblar || examenParaAsignar || showDeleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mostrarGestionTipoConcurso, examenParaSubpruebas, examenParaPostulaciones, examenParaEnsamblar, examenParaAsignar, showDeleteModal]);

  // Manejar búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => {
      const newFilters = { ...prev, page: 1 };
      getExamenes(newFilters);
      return newFilters;
    });
  };

  // Cambiar filtros
  const handleFilterChange = (key: keyof ExamenFilters, value: string | number | undefined) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value, page: 1 };
      getExamenes(newFilters);
      return newFilters;
    });
  };

  // Cambiar página
  const handlePageChange = (page: number) => {
    setFilters(prev => {
      const newFilters = { ...prev, page };
      getExamenes(newFilters);
      return newFilters;
    });
  };

  // Eliminar examen (exámenes en borrador o finalizados)
  const handleDelete = async (id: number) => {
    if (!id || isNaN(Number(id))) {
      setShowDeleteModal(null);
      return;
    }

    try {
      const success = await deleteExamen(id);
      if (success) {
        setShowDeleteModal(null);
        // Recargar la lista de exámenes
        getExamenes(filters);
      }
    } catch (error: unknown) {
      // Mostrar mensaje de error al usuario
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          alert(axiosError.response.data.message);
        } else {
          alert('Error al eliminar el examen. Solo se pueden eliminar exámenes en estado Borrador (0) o Finalizado (2).');
        }
      } else {
        alert('Error al eliminar el examen. Solo se pueden eliminar exámenes en estado Borrador (0) o Finalizado (2).');
      }
      setShowDeleteModal(null);
    }
  };


  // Duplicar examen
  const handleDuplicate = async (id: number) => {
    if (!id || isNaN(Number(id))) {
      return;
    }
    await duplicarExamen(id);
  };

  return (
    <Card className="examenes-card-wrapper">
        <div className="examenes-container">
        {/* Header */}
        <div className="examenes-header">
            <div>
            <h1 className="examenes-header-title">Gestión de Exámenes</h1>
            <p className="examenes-header-subtitle">Administra los exámenes del sistema</p>
            </div>
            <div className="examenes-header-actions">
              <button
                onClick={() => setMostrarGestionTipoConcurso(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base whitespace-nowrap"
              >
                📋 Gestión Tipo Concurso
              </button>
              <button
                onClick={async () => {
                  try {
                    setCreandoExamen(true);
                    const response = await examenesService.admin.createExamenBasico();
                    const examenId = response.data.idExamen || response.data.id;
                    if (examenId) {
                      navigate(`/admin/examenes/${examenId}/wizard`);
                    } else {
                      alert('Error al crear el examen. No se recibió un ID válido.');
                    }
                  } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : 'Error al crear el examen. Por favor, intente nuevamente.';
                    alert(errorMessage);
                  } finally {
                    setCreandoExamen(false);
                  }
                }}
                disabled={creandoExamen || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
              >
                {creandoExamen ? 'Creando...' : '+ Crear Examen'}
              </button>
            </div>
        </div>

        {/* Filtros */}
        <div className="examenes-filtros">
            <form onSubmit={handleSearch} className="examenes-filtros-form">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar
                </label>
                <input
                    type="text"
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Buscar por código de examen..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                </label>
                <select
                    value={filters.estado || ''}
                    onChange={(e) => handleFilterChange('estado', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Todos</option>
                    <option value="0">Borrador</option>
                    <option value="1">Publicado</option>
                    <option value="2">Finalizado</option>
                </select>
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Por página
                </label>
                <select
                    value={filters.per_page || 10}
                    onChange={(e) => handleFilterChange('per_page', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                </select>
                </div>

                <div className="flex items-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                >
                    {loading ? 'Buscando...' : 'Buscar'}
                </button>
                </div>
            </form>
            </div>
        </div>

        {/* Mensajes de error */}
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex justify-between items-center">
                <span>{error}</span>
                <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
                >
                ✕
                </button>
            </div>
            </div>
        )}

        {/* Loading */}
        {loading && (
            <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )}

        {/* Tabla de exámenes */}
        {!loading && (
            <div className="examenes-tabla-container">
            {/* Vista de tabla para pantallas grandes (xl+) */}
            <div className="examenes-tabla-wrapper examenes-tabla-desktop">
                <table className="examenes-tabla">
                <thead>
                    <tr>
                    <th className="examenes-th-examen">Examen</th>
                    <th>Configuración</th>
                    <th>Fechas</th>
                    <th>Completitud</th>
                    <th>Estado</th>
                    <th>Estadísticas</th>
                    <th className="examenes-th-acciones">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {examenes.map((examen) => {
                    const estadoVisual = examenesService.utils.getEstadoVisual(examen);

                    return (
                        <tr key={examen.id || examen.idExamen}>
                        <td className="examenes-td-examen">
                            <div>
                            <div className="font-medium text-gray-900 truncate" title={examen.titulo}>
                              {examen.titulo}
                            </div>
                            {examen.descripcion && (
                                <div className="text-sm text-gray-500 mt-1 truncate" title={extraerTextoPlano(examen.descripcion)}>
                                  {extraerPrimeraLinea(examen.descripcion)}
                                </div>
                            )}
                            <div className="examenes-card-badges">
                                {examen.codigo_examen && (
                                    <span className="examenes-badge codigo">
                                        {examen.codigo_examen}
                                    </span>
                                )}
                                {examen.tipoConcurso && (
                                    <span className="examenes-badge tipo">
                                        {examen.tipoConcurso.nombre}
                                    </span>
                                )}
                            </div>
                            </div>
                        </td>

                        <td>
                            <div className="space-y-1">
                            <div>{examen.total_preguntas ?? 0} preguntas</div>
                            {examen.duracion_minutos !== undefined ? (
                                <div>{examenesService.utils.formatearDuracion(examen.duracion_minutos)}</div>
                            ) : (
                                <div>{examenesService.utils.formatearDuracion(examen.tiempo_limite)}</div>
                            )}
                            {examen.subpruebas && examen.subpruebas.length > 0 && (
                              <div>{examen.subpruebas.length} subprueba(s)</div>
                            )}
                            </div>
                        </td>

                        <td>
                            <div className="space-y-1">
                            {examen.fecha_creacion && (
                                <div>
                                    <span className="font-medium">Creado:</span>{' '}
                                    {examen.fecha_creacion}
                                </div>
                            )}
                            {examen.updated_at && (
                                <div>
                                    <span className="font-medium">Actualizado:</span>{' '}
                                    {examen.updated_at}
                                </div>
                            )}
                            </div>
                        </td>

                        <td>
                            <div className="examenes-card-completitud">
                                <div className="examenes-card-completitud-header">
                                    <span className="examenes-card-completitud-label">
                                        {examen.completitud ?? 0}%
                                    </span>
                                </div>
                                <div className="examenes-card-completitud-bar">
                                    <div
                                        className={`examenes-card-completitud-fill ${
                                            (examen.completitud ?? 0) === 100
                                                ? 'completo'
                                                : (examen.completitud ?? 0) >= 50
                                                ? 'medio'
                                                : 'bajo'
                                        }`}
                                        style={{ width: `${examen.completitud ?? 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </td>

                        <td>
                            <span className={`examenes-badge-estado ${
                            estadoVisual.color === 'success' ? 'success' :
                            estadoVisual.color === 'warning' ? 'warning' :
                            estadoVisual.color === 'error' ? 'error' :
                            'info'
                            }`}>
                            {estadoVisual.icono} {estadoVisual.texto}
                            </span>
                        </td>

                        <td>
                            <div className="space-y-1">
                                <div className="font-medium">
                                    {examen.veces_usado || 0} intento(s) total
                                </div>
                                {examen.intentos_completados !== undefined && (
                                    <div className="text-green-600">
                                        ✓ {examen.intentos_completados || 0} completado(s)
                                    </div>
                                )}
                                {examen.intentos_en_progreso !== undefined && examen.intentos_en_progreso > 0 && (
                                    <div className="text-blue-600">
                                        ⏳ {examen.intentos_en_progreso} en progreso
                                    </div>
                                )}
                                {examen.promedio_puntaje !== undefined && examen.promedio_puntaje !== null && examen.promedio_puntaje > 0 && (
                                    <div className="text-gray-700">
                                        📊 Promedio: {examen.promedio_puntaje.toFixed(2)} pts
                                    </div>
                                )}
                                {(!examen.veces_usado || examen.veces_usado === 0) && (
                                    <div className="text-gray-400 italic">
                                        Sin participantes aún
                                    </div>
                                )}
                            </div>
                        </td>

                        <td className="examenes-td-acciones">
                            <div className="examenes-acciones-tabla">
                            {(examen.id || examen.idExamen) && !isNaN(Number(examen.id || examen.idExamen)) ? (
                                <>
                                  {/* Botón Ver - Para todos los estados (solo lectura si está finalizado) */}
                                  {(examen.id || examen.idExamen) && (
                                    <Link
                                      to={`/admin/examenes/${examen.id || examen.idExamen}/wizard`}
                                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                      title={examen.estado === '2' ? 'Ver Configuración (Solo Lectura)' : examen.estado === '0' ? 'Continuar Configuración' : 'Ver Detalles'}
                                    >
                                      {examen.estado === '2' ? '👁️' : examen.estado === '0' ? '⚙️' : '👁️'}
                                    </Link>
                                  )}
                                  {/* RF-A.4.5: Botón Asignar (solo para privados y NO finalizados) */}
                                  {examen.tipo_acceso === 'privado' && examen.estado !== '2' && (
                                    <button
                                      onClick={() => setExamenParaAsignar((examen.id || examen.idExamen) ?? null)}
                                      className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                                      title="Asignar Docentes"
                                    >
                                      👥
                                    </button>
                                  )}
                                  {/* Publicar - Solo para Borradores con 100% completitud */}
                                  {examen.estado === '0' && (examen.completitud ?? 0) === 100 && (
                                    <button
                                      onClick={async () => {
                                        if (confirm('¿Está seguro que desea publicar este examen?')) {
                                          await cambiarEstado((examen.id || examen.idExamen)!, '1');
                                        }
                                      }}
                                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                                      title="Publicar"
                                    >
                                      📢
                                    </button>
                                  )}
                                  {/* Finalizar - Solo para Publicados */}
                                  {examen.estado === '1' && (
                                    <button
                                      onClick={async () => {
                                        if (confirm('¿Está seguro que desea finalizar este examen?')) {
                                          await cambiarEstado((examen.id || examen.idExamen)!, '2');
                                        }
                                      }}
                                      className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                                      title="Finalizar"
                                    >
                                      ✓
                                    </button>
                                  )}
                                  {/* Ver Resultados - Solo para Finalizados */}
                                  {examen.estado === '2' && (
                                    <Link
                                      to={`/admin/resultados?examen=${examen.id || examen.idExamen}`}
                                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                                      title="Ver Resultados"
                                    >
                                      📊
                                    </Link>
                                  )}
                                  {/* Editar/Continuar Configuración - Solo para Borradores (NO finalizados) */}
                                  {examen.estado === '0' && (
                                    <Link
                                      to={`/admin/examenes/${examen.id || examen.idExamen}/wizard`}
                                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                      title="Editar/Continuar Configuración"
                                    >
                                      ✏️
                                    </Link>
                                  )}
                                  {/* Duplicar - Disponible para todos los estados */}
                                  {(examen.id || examen.idExamen) && (
                                    <button
                                      onClick={() => handleDuplicate((examen.id || examen.idExamen)!)}
                                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                                      title="Duplicar"
                                    >
                                      📋
                                    </button>
                                  )}
                                  {/* Eliminar (exámenes en borrador o finalizados) */}
                                  {(examen.estado === '0' || examen.estado === '2') && (examen.id || examen.idExamen) && (
                                    <button
                                      onClick={() => setShowDeleteModal((examen.id || examen.idExamen)!)}
                                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                                      title={`Eliminar definitivamente (${examen.estado === '0' ? 'Borrador' : 'Finalizado'})`}
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </>
                            ) : (
                                <span className="text-gray-400 text-sm" title="ID no válido">✏️</span>
                            )}
                            </div>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>

            {/* Vista de tabla compacta para tablets (lg-xl) */}
            <div className="examenes-tabla-wrapper examenes-tabla-tablet">
                <table className="examenes-tabla examenes-tabla-compacta">
                <thead>
                    <tr>
                    <th className="examenes-th-examen">Examen</th>
                    <th>Configuración</th>
                    <th>Estado</th>
                    <th>Completitud</th>
                    <th className="examenes-th-acciones">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {examenes.map((examen) => {
                    const estadoVisual = examenesService.utils.getEstadoVisual(examen);

                    return (
                        <tr key={examen.id || examen.idExamen}>
                        <td>
                            <div>
                            <div className="font-medium text-gray-900 text-sm truncate" title={examen.titulo}>
                              {examen.titulo}
                            </div>
                            <div className="examenes-card-badges">
                                {examen.codigo_examen && (
                                    <span className="examenes-badge codigo">
                                        {examen.codigo_examen}
                                    </span>
                                )}
                                {examen.tipoConcurso && (
                                    <span className="examenes-badge tipo">
                                        {examen.tipoConcurso.nombre}
                                    </span>
                                )}
                            </div>
                            </div>
                        </td>

                        <td>
                            <div className="space-y-0.5">
                            <div>{examen.total_preguntas ?? 0} preguntas</div>
                            {examen.duracion_minutos !== undefined ? (
                                <div>{examenesService.utils.formatearDuracion(examen.duracion_minutos)}</div>
                            ) : (
                                <div>{examenesService.utils.formatearDuracion(examen.tiempo_limite)}</div>
                            )}
                            </div>
                        </td>

                        <td>
                            <span className={`examenes-badge-estado ${
                            estadoVisual.color === 'success' ? 'success' :
                            estadoVisual.color === 'warning' ? 'warning' :
                            estadoVisual.color === 'error' ? 'error' :
                            'info'
                            }`}>
                            {estadoVisual.icono} {estadoVisual.texto}
                            </span>
                        </td>

                        <td>
                            <div className="examenes-card-completitud">
                                <div className="examenes-card-completitud-header">
                                    <span className="examenes-card-completitud-label">
                                        {examen.completitud ?? 0}%
                                    </span>
                                </div>
                                <div className="examenes-card-completitud-bar">
                                    <div
                                        className={`examenes-card-completitud-fill ${
                                            (examen.completitud ?? 0) === 100
                                                ? 'completo'
                                                : (examen.completitud ?? 0) >= 50
                                                ? 'medio'
                                                : 'bajo'
                                        }`}
                                        style={{ width: `${examen.completitud ?? 0}%`, height: '0.375rem' }}
                                    ></div>
                                </div>
                            </div>
                        </td>

                        <td className="examenes-td-acciones">
                            <div className="examenes-acciones-tabla">
                            {(examen.id || examen.idExamen) && !isNaN(Number(examen.id || examen.idExamen)) ? (
                                <>
                                  {(examen.id || examen.idExamen) && (
                                    <Link
                                      to={`/admin/examenes/${examen.id || examen.idExamen}/wizard`}
                                      className="text-blue-600 hover:text-blue-800 text-sm"
                                      title={examen.estado === '2' ? 'Ver' : examen.estado === '0' ? 'Configurar' : 'Ver'}
                                    >
                                      {examen.estado === '2' ? '👁️' : examen.estado === '0' ? '⚙️' : '👁️'}
                                    </Link>
                                  )}
                                  {examen.tipo_acceso === 'privado' && examen.estado !== '2' && (
                                    <button
                                      onClick={() => setExamenParaAsignar((examen.id || examen.idExamen) ?? null)}
                                      className="text-orange-600 hover:text-orange-800 text-sm"
                                      title="Asignar"
                                    >
                                      👥
                                    </button>
                                  )}
                                  {examen.estado === '0' && (examen.completitud ?? 0) === 100 && (
                                    <button
                                      onClick={async () => {
                                        if (confirm('¿Está seguro que desea publicar este examen?')) {
                                          await cambiarEstado((examen.id || examen.idExamen)!, '1');
                                        }
                                      }}
                                      className="text-green-600 hover:text-green-800 text-sm"
                                      title="Publicar"
                                    >
                                      📢
                                    </button>
                                  )}
                                  {examen.estado === '1' && (
                                    <button
                                      onClick={async () => {
                                        if (confirm('¿Está seguro que desea finalizar este examen?')) {
                                          await cambiarEstado((examen.id || examen.idExamen)!, '2');
                                        }
                                      }}
                                      className="text-orange-600 hover:text-orange-800 text-sm"
                                      title="Finalizar"
                                    >
                                      ✓
                                    </button>
                                  )}
                                  {examen.estado === '2' && (
                                    <Link
                                      to={`/admin/resultados?examen=${examen.id || examen.idExamen}`}
                                      className="text-purple-600 hover:text-purple-800 text-sm"
                                      title="Resultados"
                                    >
                                      📊
                                    </Link>
                                  )}
                                  {examen.estado === '0' && (
                                    <Link
                                      to={`/admin/examenes/${examen.id || examen.idExamen}/wizard`}
                                      className="text-indigo-600 hover:text-indigo-800 text-sm"
                                      title="Editar"
                                    >
                                      ✏️
                                    </Link>
                                  )}
                                  {(examen.id || examen.idExamen) && (
                                    <button
                                      onClick={() => handleDuplicate((examen.id || examen.idExamen)!)}
                                      className="text-purple-600 hover:text-purple-800 text-sm"
                                      title="Duplicar"
                                    >
                                      📋
                                    </button>
                                  )}
                                  {(examen.estado === '0' || examen.estado === '2') && (examen.id || examen.idExamen) && (
                                    <button
                                      onClick={() => setShowDeleteModal((examen.id || examen.idExamen)!)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                      title="Eliminar"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </>
                            ) : null}
                            </div>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>

            {/* Vista de cards para pantallas pequeñas y móviles */}
            <div className="examenes-cards">
                {examenes.map((examen) => {
                const estadoVisual = examenesService.utils.getEstadoVisual(examen);

                return (
                    <div key={examen.id || examen.idExamen} className="examenes-card">
                        {/* Header del card */}
                        <div className="examenes-card-header">
                            <h3 className="examenes-card-title">{examen.titulo}</h3>
                            {examen.descripcion && (
                                <ContenidoHTML
                                  html={examen.descripcion}
                                  className="examenes-card-description prose prose-sm max-w-none"
                                />
                            )}
                            <div className="examenes-card-badges">
                                {examen.codigo_examen && (
                                    <span className="examenes-badge codigo">
                                        {examen.codigo_examen}
                                    </span>
                                )}
                                {examen.tipoConcurso && (
                                    <span className="examenes-badge tipo">
                                        {examen.tipoConcurso.nombre}
                                    </span>
                                )}
                                <span className={`examenes-badge-estado ${
                                    estadoVisual.color === 'success' ? 'success' :
                                    estadoVisual.color === 'warning' ? 'warning' :
                                    estadoVisual.color === 'error' ? 'error' :
                                    'info'
                                }`}>
                                    {estadoVisual.icono} {estadoVisual.texto}
                                </span>
                            </div>
                        </div>

                        {/* Información del examen */}
                        <div className="examenes-card-info">
                            <div className="examenes-card-info-item">
                                <span className="examenes-card-info-label">Preguntas:</span>
                                <span className="examenes-card-info-value">{examen.total_preguntas ?? 0}</span>
                            </div>
                            <div className="examenes-card-info-item">
                                <span className="examenes-card-info-label">Duración:</span>
                                <span className="examenes-card-info-value">
                                    {examen.duracion_minutos !== undefined
                                        ? examenesService.utils.formatearDuracion(examen.duracion_minutos)
                                        : examenesService.utils.formatearDuracion(examen.tiempo_limite)
                                    }
                                </span>
                            </div>
                            {examen.subpruebas && examen.subpruebas.length > 0 && (
                                <div className="examenes-card-info-item">
                                    <span className="examenes-card-info-label">Subpruebas:</span>
                                    <span className="examenes-card-info-value">{examen.subpruebas.length}</span>
                                </div>
                            )}
                            <div className="examenes-card-info-item">
                                <span className="examenes-card-info-label">Intentos:</span>
                                <span className="examenes-card-info-value">{examen.veces_usado || 0}</span>
                            </div>
                        </div>

                        {/* Completitud */}
                        <div className="examenes-card-completitud">
                            <div className="examenes-card-completitud-header">
                                <span className="examenes-card-completitud-label">Completitud</span>
                                <span className="examenes-card-completitud-label">{examen.completitud ?? 0}%</span>
                            </div>
                            <div className="examenes-card-completitud-bar">
                                <div
                                    className={`examenes-card-completitud-fill ${
                                        (examen.completitud ?? 0) === 100
                                            ? 'completo'
                                            : (examen.completitud ?? 0) >= 50
                                            ? 'medio'
                                            : 'bajo'
                                    }`}
                                    style={{ width: `${examen.completitud ?? 0}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Estadísticas */}
                        {(examen.intentos_completados !== undefined || examen.intentos_en_progreso !== undefined || examen.promedio_puntaje !== undefined) && (
                            <div className="examenes-card-estadisticas">
                                {examen.intentos_completados !== undefined && (
                                    <div className="examenes-card-estadisticas-item text-green-600">
                                        ✓ {examen.intentos_completados || 0} completado(s)
                                    </div>
                                )}
                                {examen.intentos_en_progreso !== undefined && examen.intentos_en_progreso > 0 && (
                                    <div className="examenes-card-estadisticas-item text-blue-600">
                                        ⏳ {examen.intentos_en_progreso} en progreso
                                    </div>
                                )}
                                {examen.promedio_puntaje !== undefined && examen.promedio_puntaje !== null && examen.promedio_puntaje > 0 && (
                                    <div className="examenes-card-estadisticas-item text-gray-700">
                                        📊 Promedio: {examen.promedio_puntaje.toFixed(2)} pts
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fechas */}
                        {(examen.fecha_creacion || examen.updated_at) && (
                            <div className="examenes-card-fechas">
                                {examen.fecha_creacion && (
                                    <div>
                                        <span className="font-medium">Creado:</span>{' '}
                                        {examen.fecha_creacion}
                                    </div>
                                )}
                                {examen.updated_at && (
                                    <div>
                                        <span className="font-medium">Actualizado:</span>{' '}
                                        {examen.updated_at}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="examenes-card-acciones">
                            {(examen.id || examen.idExamen) && !isNaN(Number(examen.id || examen.idExamen)) ? (
                                <>
                                    {(examen.id || examen.idExamen) && (
                                        <Link
                                            to={`/admin/examenes/${examen.id || examen.idExamen}/wizard`}
                                            className="examenes-card-boton ver"
                                            title={examen.estado === '2' ? 'Ver Configuración (Solo Lectura)' : examen.estado === '0' ? 'Continuar Configuración' : 'Ver Detalles'}
                                        >
                                            {examen.estado === '2' ? '👁️ Ver' : examen.estado === '0' ? '⚙️ Configurar' : '👁️ Ver'}
                                        </Link>
                                    )}
                                    {examen.tipo_acceso === 'privado' && examen.estado !== '2' && (
                                        <button
                                            onClick={() => setExamenParaAsignar((examen.id || examen.idExamen) ?? null)}
                                            className="examenes-card-boton asignar"
                                            title="Asignar Docentes"
                                        >
                                            👥 Asignar
                                        </button>
                                    )}
                                    {examen.estado === '0' && (examen.completitud ?? 0) === 100 && (
                                        <button
                                            onClick={async () => {
                                                if (confirm('¿Está seguro que desea publicar este examen?')) {
                                                    await cambiarEstado((examen.id || examen.idExamen)!, '1');
                                                }
                                            }}
                                            className="examenes-card-boton publicar"
                                            title="Publicar"
                                        >
                                            📢 Publicar
                                        </button>
                                    )}
                                    {examen.estado === '1' && (
                                        <button
                                            onClick={async () => {
                                                if (confirm('¿Está seguro que desea finalizar este examen?')) {
                                                    await cambiarEstado((examen.id || examen.idExamen)!, '2');
                                                }
                                            }}
                                            className="examenes-card-boton finalizar"
                                            title="Finalizar"
                                        >
                                            ✓ Finalizar
                                        </button>
                                    )}
                                    {examen.estado === '2' && (
                                        <Link
                                            to={`/admin/resultados?examen=${examen.id || examen.idExamen}`}
                                            className="examenes-card-boton resultados"
                                            title="Ver Resultados"
                                        >
                                            📊 Resultados
                                        </Link>
                                    )}
                                    {examen.estado === '0' && (
                                        <Link
                                            to={`/admin/examenes/${examen.id || examen.idExamen}/wizard`}
                                            className="examenes-card-boton editar"
                                            title="Editar/Continuar Configuración"
                                        >
                                            ✏️ Editar
                                        </Link>
                                    )}
                                    {(examen.id || examen.idExamen) && (
                                        <button
                                            onClick={() => handleDuplicate((examen.id || examen.idExamen)!)}
                                            className="examenes-card-boton duplicar"
                                            title="Duplicar"
                                        >
                                            📋 Duplicar
                                        </button>
                                    )}
                                    {(examen.estado === '0' || examen.estado === '2') && (examen.id || examen.idExamen) && (
                                        <button
                                            onClick={() => setShowDeleteModal((examen.id || examen.idExamen)!)}
                                            className="examenes-card-boton eliminar"
                                            title={`Eliminar definitivamente (${examen.estado === '0' ? 'Borrador' : 'Finalizado'})`}
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    )}
                                </>
                            ) : null}
                        </div>
                    </div>
                );
                })}
            </div>

            {/* Paginación */}
            {paginacion && paginacion.total > 0 && (
                <div className="examenes-paginacion">
                <div className="examenes-paginacion-container">
                    <div className="examenes-paginacion-info">
                    Mostrando <strong>{paginacion.from || 0}</strong> a <strong>{paginacion.to || 0}</strong> de <strong>{paginacion.total || 0}</strong> resultados
                    </div>

                    <div className="examenes-paginacion-controls">
                        <button
                            onClick={() => handlePageChange(paginacion.current_page - 1)}
                            disabled={paginacion.current_page === 1 || loading || paginacion.last_page <= 1}
                            className="examenes-paginacion-boton"
                        >
                            <span className="hidden sm:inline">← Anterior</span>
                            <span className="sm:hidden">←</span>
                        </button>

                        {/* Páginas - Ocultar en móviles muy pequeños */}
                        <div className="hidden sm:flex items-center space-x-1">
                            {paginacion.last_page > 0 && Array.from({ length: Math.min(5, paginacion.last_page) }, (_, i) => {
                                const page = i + Math.max(1, paginacion.current_page - 2);
                                if (page > paginacion.last_page) return null;

                                return (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    disabled={loading}
                                    className={`examenes-paginacion-boton ${page === paginacion.current_page ? 'activa' : ''}`}
                                >
                                    {page}
                                </button>
                                );
                            })}
                        </div>

                        {/* Indicador de página en móviles muy pequeños */}
                        <div className="examenes-paginacion-indicador sm:hidden">
                            {paginacion.current_page} / {paginacion.last_page}
                        </div>

                        <button
                            onClick={() => handlePageChange(paginacion.current_page + 1)}
                            disabled={paginacion.current_page === paginacion.last_page || loading || paginacion.last_page <= 1}
                            className="examenes-paginacion-boton"
                        >
                            <span className="hidden sm:inline">Siguiente →</span>
                            <span className="sm:hidden">→</span>
                        </button>
                    </div>
                </div>
                </div>
            )}
            </div>
        )}

        {/* Empty state */}
        {!loading && examenes.length === 0 && (
            <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay exámenes</h3>
            <p className="text-gray-600 mb-4">
                {filters.search || filters.estado
                ? 'No se encontraron exámenes con los filtros aplicados.'
                : 'Comienza creando tu primer examen.'
                }
            </p>
            {!filters.search && !filters.estado && (
                <button
                onClick={async () => {
                  try {
                    setCreandoExamen(true);
                    const response = await examenesService.admin.createExamenBasico();
                    const examenId = response.data.idExamen || response.data.id;
                    if (examenId) {
                      navigate(`/admin/examenes/${examenId}/wizard`);
                    } else {
                      alert('Error al crear el examen. No se recibió un ID válido.');
                    }
                  } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : 'Error al crear el examen. Por favor, intente nuevamente.';
                    alert(errorMessage);
                  } finally {
                    setCreandoExamen(false);
                  }
                }}
                disabled={creandoExamen || loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {creandoExamen ? 'Creando...' : '+ Crear Primer Examen'}
                </button>
            )}
            </div>
        )}

        {/* Modal de confirmación para eliminar */}
        {showDeleteModal && (
            <div className="modal-overlay-banco backdrop-blur-md bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                ⚠️ Confirmar eliminación definitiva
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-red-800 font-medium mb-2">
                        Esta acción eliminará permanentemente el examen.
                    </p>
                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                        <li>Se eliminarán todas las relaciones con preguntas</li>
                        <li>Se eliminarán todas las asignaciones a usuarios</li>
                        <li>Se eliminarán los archivos adjuntos asociados</li>
                        <li>Se eliminarán todos los intentos y resultados asociados</li>
                        <li>Esta acción NO se puede deshacer</li>
                    </ul>
                </div>
                <p className="text-gray-600 mb-6">
                ¿Estás seguro de que deseas eliminar definitivamente este examen?
                </p>
                <div className="flex justify-end space-x-3">
                <button
                    onClick={() => setShowDeleteModal(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                    Cancelar
                </button>
                <button
                    onClick={() => showDeleteModal && handleDelete(showDeleteModal)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                    Eliminar definitivamente
                </button>
                </div>
            </div>
            </div>
        )}

        {/* RF-A.4.1: Modal Gestión Tipo Concurso */}
        {mostrarGestionTipoConcurso && (
          <GestionTipoConcurso
            onCerrar={() => setMostrarGestionTipoConcurso(false)}
            onTipoConcursoActualizado={() => {
              getExamenes(filters);
            }}
          />
        )}

        {/* RF-A.4.3: Modal Subpruebas - Solo si el examen NO está finalizado */}
        {examenParaSubpruebas && examenes.find(e => (e.id || e.idExamen) === examenParaSubpruebas)?.estado !== '2' && (
          <GestionSubpruebas
            examenId={examenParaSubpruebas!}
            onCerrar={() => setExamenParaSubpruebas(null)}
            onSubpruebasActualizadas={() => {
              getExamenes(filters);
            }}
          />
        )}

        {/* RF-A.9: Modal Postulaciones - Solo si el examen NO está finalizado */}
        {examenParaPostulaciones && examenes.find(e => (e.id || e.idExamen) === examenParaPostulaciones)?.estado !== '2' && (
          <GestionPostulaciones
            examenId={examenParaPostulaciones!}
            onCerrar={() => setExamenParaPostulaciones(null)}
            onPostulacionesActualizadas={() => {
              getExamenes(filters);
            }}
          />
        )}

        {/* RF-A.4.4: Modal Ensamblador - Solo si el examen NO está finalizado */}
        {examenParaEnsamblar && examenes.find(e => (e.id || e.idExamen) === examenParaEnsamblar)?.estado !== '2' && (
          <EnsambladorExamen
            examenId={examenParaEnsamblar!}
            onCerrar={() => setExamenParaEnsamblar(null)}
            onPreguntasActualizadas={() => {
              getExamenes(filters);
            }}
          />
        )}

        {/* RF-A.4.5: Modal Asignar Usuarios - Solo si el examen NO está finalizado */}
        {examenParaAsignar && examenes.find(e => (e.id || e.idExamen) === examenParaAsignar)?.estado !== '2' && (
          <AsignarUsuarios
            examenId={examenParaAsignar!}
            onCerrar={() => setExamenParaAsignar(null)}
            onAsignacionActualizada={() => {
              getExamenes(filters);
            }}
          />
        )}
    </Card>
  );
};

export default ExamenesIndex;
