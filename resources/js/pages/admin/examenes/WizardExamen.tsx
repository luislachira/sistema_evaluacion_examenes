import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examenesService } from '../../../services/examenesService';
import { Card } from '@/components/ui/card';
import type {
  Examen,
  DatosPaso2,
  DatosPaso3,
  DatosPaso4,
  DatosPaso5,
  DatosPaso6
} from '../../../types/examenes';
import type { AxiosErrorResponse } from '../../../types/errors';
import Paso1DatosBasicos from './wizard/Paso1DatosBasicos';
import Paso2Subpruebas from './wizard/Paso2Subpruebas';
import Paso3Postulaciones from './wizard/Paso3Postulaciones';
import Paso4ReglasPuntaje from './wizard/Paso4ReglasPuntaje';
import Paso5Ensamblador from './wizard/Paso5Ensamblador';
import Paso6ConfiguracionFechas from './wizard/Paso6ConfiguracionFechas';

interface EstadoWizard {
  examen_id: number;
  completitud: number;
  paso_actual: number;
  estado_pasos: {
    paso1: boolean;
    paso2: boolean;
    paso3: boolean;
    paso4: boolean;
    paso5: boolean;
    paso6: boolean;
  };
  siguiente_paso: number | null;
  puede_publicar: boolean;
  estado: string;
}

const WizardExamen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const examenId = id ? parseInt(id) : null;

  const [estadoWizard, setEstadoWizard] = useState<EstadoWizard | null>(null);
  const [pasoActual, setPasoActual] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examen, setExamen] = useState<Examen | null>(null);
  const [datosPaso, setDatosPaso] = useState<DatosPaso2 | DatosPaso3 | DatosPaso4 | DatosPaso5 | DatosPaso6 | null>(null);
  const [cargandoPaso, setCargandoPaso] = useState(false);

  // Ref para evitar cargar estado del wizard múltiples veces
  const estadoWizardCargadoRef = React.useRef(false);

  const cargarEstadoWizard = React.useCallback(async () => {
    if (!examenId || estadoWizardCargadoRef.current) return;

    try {
      estadoWizardCargadoRef.current = true;
      setLoading(true);
      const estado = await examenesService.admin.getEstadoWizard(examenId);
      setEstadoWizard(estado);

      // Si hay un siguiente paso disponible, ir a ese paso
      // Si no, ir al paso actual guardado o al primero incompleto
      if (estado.siguiente_paso) {
        setPasoActual(estado.siguiente_paso);
      } else if (estado.paso_actual > 0) {
        setPasoActual(estado.paso_actual);
      } else {
        setPasoActual(1);
      }
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      setError(axiosError.response?.data?.message || 'Error al cargar el estado del examen');
      estadoWizardCargadoRef.current = false; // Resetear en caso de error
    } finally {
      setLoading(false);
    }
  }, [examenId]);

  // Ref para evitar cargar datos básicos múltiples veces
  const examenBasicoCargadoRef = React.useRef(false);

  // Cargar solo datos básicos del examen (para el paso 1) usando getDatosPaso
  const cargarExamen = React.useCallback(async () => {
    if (!examenId || examenBasicoCargadoRef.current) return;

    try {
      examenBasicoCargadoRef.current = true;
      // Usar getDatosPaso(1) para obtener solo los datos básicos sin relaciones pesadas
      const response = await examenesService.admin.getDatosPaso(examenId, 1);
      const examenData = (response as { data: Examen }).data;

      if (examenData && examenData.idExamen) {
        setExamen(examenData);
      } else {
        setError('Error: El examen no tiene la estructura esperada');
        examenBasicoCargadoRef.current = false; // Resetear en caso de error
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al cargar los datos del examen: ${errorMessage}`);
      examenBasicoCargadoRef.current = false; // Resetear en caso de error
    }
  }, [examenId]);

  // Refs para evitar cargar datos de pasos múltiples veces
  const datosPasoCargadosRef = React.useRef<Record<number, boolean>>({});
  const pasoAnteriorRef = React.useRef<number | null>(null);

  // Cargar datos específicos de un paso
  const cargarDatosPaso = React.useCallback(async (paso: number, forzarRecarga: boolean = false) => {
    if (!examenId) return;

    // Si se fuerza la recarga o es un paso diferente, resetear el cache
    if (forzarRecarga || pasoAnteriorRef.current !== paso) {
      datosPasoCargadosRef.current[paso] = false;
    }

    // Evitar cargar el mismo paso múltiples veces (solo si no se fuerza)
    if (!forzarRecarga && datosPasoCargadosRef.current[paso]) {
      return;
    }

    try {
      setCargandoPaso(true);
      datosPasoCargadosRef.current[paso] = true;
      pasoAnteriorRef.current = paso;
      const response = await examenesService.admin.getDatosPaso(examenId, paso);

      // Paso 5 devuelve directamente el objeto, los demás devuelven { data: ... }
      if (paso === 5) {
        setDatosPaso(response as DatosPaso5);
      } else {
        const responseWithData = response as { data: DatosPaso2 | DatosPaso3 | DatosPaso4 | DatosPaso6 };
        setDatosPaso(responseWithData.data);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al cargar los datos del paso ${paso}: ${errorMessage}`);
      datosPasoCargadosRef.current[paso] = false; // Resetear en caso de error
    } finally {
      setCargandoPaso(false);
    }
  }, [examenId]);

  // Resetear refs cuando cambia el examenId
  useEffect(() => {
    examenBasicoCargadoRef.current = false;
    datosPasoCargadosRef.current = {};
    estadoWizardCargadoRef.current = false;
  }, [examenId]);

  // Cargar estado del wizard y datos básicos al inicio (solo una vez)
  useEffect(() => {
    if (!examenId) {
      setError('ID de examen no válido');
      setLoading(false);
      return;
    }

    // Evitar recargar si ya se cargaron los datos básicos
    if (examenBasicoCargadoRef.current) {
      return;
    }

    const inicializar = async () => {
      await Promise.all([
        cargarEstadoWizard(),
        cargarExamen()
      ]);
    };

    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examenId]); // Solo dependemos de examenId, no de las funciones

  // Cargar datos específicos cuando cambia el paso
  useEffect(() => {
    if (!examenId || !estadoWizard) return;

    // Cargar datos del paso actual (excepto paso 1 que ya tiene los datos básicos)
    if (pasoActual > 1) {
      // Forzar recarga cuando se cambia de paso para asegurar datos actualizados
      cargarDatosPaso(pasoActual, true);
    } else {
      // Para el paso 1, los datos ya están en examen
      setDatosPaso(null);
    }
  }, [examenId, pasoActual, estadoWizard, cargarDatosPaso]);


  const handlePasoCompletado = async (paso: number) => {
    if (!examenId) return;

    try {
      // Actualizar el paso en el backend
      await examenesService.admin.actualizarPaso(examenId, paso);

      // Solo recargar el estado del wizard (no los datos básicos del examen)
      // Resetear el ref para permitir recargar el estado
      estadoWizardCargadoRef.current = false;
      await cargarEstadoWizard();
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      setError(axiosError.response?.data?.message || 'Error al actualizar el paso');
    }
  };

  const handleCambiarPaso = async (nuevoPaso: number) => {
    if (!examenId) return;

    // Validar acceso al paso
    try {
      const validacion = await examenesService.admin.validarAccesoPaso(examenId, nuevoPaso);

      if (!validacion.puede_acceder) {
        setError(validacion.mensaje || 'No puede acceder a este paso');
        return;
      }

      setPasoActual(nuevoPaso);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      const errorData = axiosError.response?.data;
      const mensaje = (errorData && typeof errorData === 'object' && 'mensaje' in errorData)
        ? (errorData as { mensaje?: string }).mensaje
        : undefined;
      setError(mensaje || 'No puede acceder a este paso');
    }
  };

  const handleFinalizarCreacion = async () => {
    if (!examenId) return;

    try {
      // Recargar el estado del wizard para asegurar que tenemos la información más actualizada
      const estadoActualizado = await examenesService.admin.getEstadoWizard(examenId);

      // Verificar que todos los pasos estén completos
      const todosCompletos = Object.values(estadoActualizado.estado_pasos).every(paso => paso === true);

      if (!todosCompletos) {
        setError('Debe completar todos los pasos antes de finalizar');
        // Recargar el estado para actualizar la UI
        await cargarEstadoWizard();
        return;
      }

      // Redirigir a la vista de gestión de exámenes
      navigate('/admin/examenes');
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorResponse;
      setError(axiosError.response?.data?.message || 'Error al finalizar la configuración del examen');
    }
  };

  const getEstadoPaso = (paso: number): 'completo' | 'actual' | 'bloqueado' => {
    if (!estadoWizard) return 'bloqueado';

    const estadoPaso = estadoWizard.estado_pasos[`paso${paso}` as keyof typeof estadoWizard.estado_pasos];

    if (paso === pasoActual) return 'actual';
    if (estadoPaso) return 'completo';

    // Verificar si puede acceder (todos los anteriores completos)
    let puedeAcceder = true;
    for (let i = 1; i < paso; i++) {
      if (!estadoWizard.estado_pasos[`paso${i}` as keyof typeof estadoWizard.estado_pasos]) {
        puedeAcceder = false;
        break;
      }
    }

    return puedeAcceder ? 'actual' : 'bloqueado';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error && !estadoWizard) {
    return (
      <div className="w-full pl-8 pr-6 py-8">
        <Card className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/admin/examenes')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Volver a Gestión de Exámenes
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Mostrar estado de carga si aún no se han cargado los datos
  if (loading || !estadoWizard || !examen) {
    return (
      <div className="w-full pl-8 pr-6 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Cargando datos del examen...
          </h2>
          <p className="text-gray-600">
            Por favor, espere un momento.
          </p>
          {!examen && !loading && (
            <p className="text-sm text-yellow-600 mt-2">
              Cargando información del examen...
            </p>
          )}
        </div>
      </div>
    );
  }

  const porcentajeCompletitud = estadoWizard.completitud;
  // Solo lectura cuando está publicado (estado '1'), no cuando está finalizado (estado '2')
  // Se puede editar en borrador (estado '0') y finalizado (estado '2')
  const esSoloLectura = estadoWizard.estado === '1'; // Examen publicado = solo lectura

  return (
    <div className="w-full pl-8 pr-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {esSoloLectura ? 'Configuración de Examen (Solo Lectura)' : 'Creación de Examen'} - PASO {pasoActual} de 6
            </h1>
            {examen.codigo_examen && (
              <p className="text-sm text-gray-600 mt-1">
                Examen: {examen.codigo_examen} - {examen.titulo}
              </p>
            )}
            {esSoloLectura && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ Este examen está publicado. Solo puedes ver su configuración, no puedes editarla. Para editarlo, debes finalizarlo primero (cambiar el estado a "Finalizado").
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/admin/examenes')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progreso: {porcentajeCompletitud}%
            </span>
            <span className="text-sm text-gray-500">
              {estadoWizard.completitud === 100 ? '✓ Completado' : 'En progreso'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${porcentajeCompletitud}%` }}
            ></div>
          </div>
        </div>

        {/* Indicadores de pasos */}
        <div className="grid grid-cols-6 gap-2 mt-6">
          {[1, 2, 3, 4, 5, 6].map((paso) => {
            const estado = getEstadoPaso(paso);
            const nombresPasos = [
              'Datos Básicos',
              'Subpruebas',
              'Postulaciones',
              'Reglas de Puntaje',
              'Ensamblador',
              'Config. Fechas'
            ];

            return (
              <button
                key={paso}
                onClick={() => !esSoloLectura && handleCambiarPaso(paso)}
                disabled={estado === 'bloqueado' || esSoloLectura}
                className={`
                  p-3 rounded-lg text-sm font-medium transition-all
                  ${estado === 'completo'
                    ? esSoloLectura
                      ? 'bg-green-100 text-green-800 border-2 border-green-300 cursor-default'
                      : 'bg-green-100 text-green-800 border-2 border-green-300 cursor-pointer hover:bg-green-200'
                    : estado === 'actual'
                    ? esSoloLectura
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-500 cursor-default'
                      : 'bg-blue-100 text-blue-800 border-2 border-blue-500 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-300 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center justify-center mb-1">
                  {estado === 'completo' ? (
                    <span className="text-lg">✓</span>
                  ) : estado === 'actual' ? (
                    <span className="text-lg">●</span>
                  ) : (
                    <span className="text-lg">🔒</span>
                  )}
                </div>
                <div className="text-xs">PASO {paso}</div>
                <div className="text-xs mt-1">{nombresPasos[paso - 1]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Contenido del paso actual */}
      <Card className="p-6">
        {cargandoPaso && pasoActual > 1 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando datos del paso {pasoActual}...</p>
            </div>
          </div>
        ) : (
          <>
            {pasoActual === 1 && (
              <Paso1DatosBasicos
                key={`paso1-${examen?.idExamen || examenId || 'new'}`}
                examenId={examenId!}
                examen={examen}
                soloLectura={esSoloLectura}
                onCompletado={() => handlePasoCompletado(1)}
                onSiguiente={() => handleCambiarPaso(2)}
                onVolver={() => navigate('/admin/examenes')}
              />
            )}

            {pasoActual === 2 && (
              <Paso2Subpruebas
                examenId={examenId!}
                examen={examen}
                datosPaso={pasoActual === 2 ? (datosPaso as DatosPaso2 | null) : undefined}
                soloLectura={esSoloLectura}
                onCompletado={() => handlePasoCompletado(2)}
                onSiguiente={() => handleCambiarPaso(3)}
                onVolver={() => handleCambiarPaso(1)}
              />
            )}

            {pasoActual === 3 && (
              <Paso3Postulaciones
                examenId={examenId!}
                examen={examen}
                datosPaso={pasoActual === 3 ? (datosPaso as DatosPaso3 | null) : undefined}
                soloLectura={esSoloLectura}
                onCompletado={() => handlePasoCompletado(3)}
                onSiguiente={() => handleCambiarPaso(4)}
                onVolver={() => handleCambiarPaso(2)}
              />
            )}

            {pasoActual === 4 && (
              <Paso4ReglasPuntaje
                examenId={examenId!}
                examen={examen}
                datosPaso={pasoActual === 4 ? (datosPaso as DatosPaso4 | null) : undefined}
                soloLectura={esSoloLectura}
                onCompletado={() => handlePasoCompletado(4)}
                onSiguiente={() => handleCambiarPaso(5)}
                onVolver={() => handleCambiarPaso(3)}
              />
            )}

            {pasoActual === 5 && (
              <Paso5Ensamblador
                examenId={examenId!}
                examen={examen}
                datosPaso={pasoActual === 5 ? (datosPaso as DatosPaso5 | null) : undefined}
                soloLectura={esSoloLectura}
                onCompletado={() => handlePasoCompletado(5)}
                onSiguiente={() => handleCambiarPaso(6)}
                onVolver={() => handleCambiarPaso(4)}
              />
            )}

            {pasoActual === 6 && (
              <Paso6ConfiguracionFechas
                examenId={examenId!}
                examen={examen}
                datosPaso={pasoActual === 6 ? (datosPaso as DatosPaso6 | null) : undefined}
                soloLectura={esSoloLectura}
                onCompletado={() => handlePasoCompletado(6)}
                onSiguiente={handleFinalizarCreacion}
                onVolver={() => handleCambiarPaso(5)}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default WizardExamen;

