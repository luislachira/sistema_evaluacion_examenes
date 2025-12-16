import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import clienteApi from '../api/clienteApi';

interface UseAutoLogoutOptions {
  checkInterval?: number; // Intervalo para verificar el estado en milisegundos (default: 30 segundos)
  warningTime?: number; // Tiempo antes de cerrar para mostrar advertencia en segundos (default: 60 segundos)
}

interface ActivityStatus {
  minutes_remaining: number;
  seconds_remaining: number;
  last_activity: string;
  inactivity_timeout: number;
}

/**
 * Hook para mostrar advertencia de inactividad basado en el estado del backend
 * La lógica de cierre de sesión está manejada completamente por el backend
 *
 * @param options - Opciones de configuración
 * @param options.checkInterval - Intervalo para verificar el estado en milisegundos (default: 30000 = 30 segundos)
 * @param options.warningTime - Tiempo antes de cerrar para mostrar advertencia en segundos (default: 60 = 1 minuto)
 */
export function useAutoLogout(options: UseAutoLogoutOptions = {}) {
  const { isAuthenticated } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const checkInterval = options.checkInterval || 30 * 1000; // 30 segundos por defecto
  const warningTime = options.warningTime || 60; // 1 minuto antes por defecto (en segundos)

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Función para verificar el estado de actividad desde el backend
  const checkActivityStatus = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const response = await clienteApi.get<ActivityStatus>('/user/activity-status');
      const status = response.data;

      // Convertir segundos restantes a milisegundos para el estado
      const secondsRemaining = status.seconds_remaining;

      // Si quedan menos segundos que el tiempo de advertencia, mostrar advertencia
      if (secondsRemaining <= warningTime && secondsRemaining > 0) {
        setShowWarning(true);
        setTimeRemaining(secondsRemaining * 1000); // Convertir a milisegundos

        // Actualizar el contador cada segundo
        if (warningIntervalRef.current) {
          clearInterval(warningIntervalRef.current);
        }

        let remaining = secondsRemaining;
        warningIntervalRef.current = setInterval(() => {
          remaining -= 1;
          setTimeRemaining(remaining * 1000);

          if (remaining <= 0) {
            if (warningIntervalRef.current) {
              clearInterval(warningIntervalRef.current);
            }
            setShowWarning(false);
          }
        }, 1000);
      } else if (secondsRemaining > warningTime) {
        // Si hay suficiente tiempo, ocultar la advertencia
        setShowWarning(false);
        setTimeRemaining(0);
        if (warningIntervalRef.current) {
          clearInterval(warningIntervalRef.current);
        }
      }
    } catch {
      // Si hay un error (por ejemplo, 401), el interceptor de axios manejará el cierre de sesión
      setShowWarning(false);
      setTimeRemaining(0);
      if (warningIntervalRef.current) {
        clearInterval(warningIntervalRef.current);
      }
    }
  }, [isAuthenticated, warningTime]);

  // Función para extender la sesión (cuando el usuario hace clic en "Continuar")
  // Simplemente hace una petición al backend que actualizará la última actividad
  const extendSession = useCallback(async () => {
    try {
      // Cerrar el modal inmediatamente
      setShowWarning(false);
      setTimeRemaining(0);

      // Limpiar el intervalo de advertencia
      if (warningIntervalRef.current) {
        clearInterval(warningIntervalRef.current);
        warningIntervalRef.current = null;
      }

      // Hacer una petición simple al backend para actualizar la última actividad
      await clienteApi.get('/user');

      // Esperar un momento para que el backend actualice la última actividad
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verificar el estado actualizado
      await checkActivityStatus();
    } catch {
      // Si hay un error, volver a verificar el estado
      await checkActivityStatus();
    }
  }, [checkActivityStatus]);

  // Verificar el estado periódicamente
  useEffect(() => {
    if (!isAuthenticated) {
      // Limpiar intervalos si no está autenticado
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (warningIntervalRef.current) {
        clearInterval(warningIntervalRef.current);
      }
      setShowWarning(false);
      setTimeRemaining(0);
      return;
    }

    // Verificar inmediatamente
    checkActivityStatus();

    // Configurar intervalo para verificar periódicamente
    intervalRef.current = setInterval(() => {
      checkActivityStatus();
    }, checkInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (warningIntervalRef.current) {
        clearInterval(warningIntervalRef.current);
      }
    };
  }, [isAuthenticated, checkInterval, checkActivityStatus]);

  return {
    showWarning,
    timeRemaining,
    extendSession,
  };
}

