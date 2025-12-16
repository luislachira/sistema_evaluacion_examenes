import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import clienteApi from '../api/clienteApi';

/**
 * Hook para detectar actividad del usuario y actualizar la sesión automáticamente
 * Detecta clics, teclas presionadas, scroll y toques (touchstart)
 * NOTA: mousemove está desactivado para evitar demasiadas actualizaciones innecesarias
 */
export function useActivityTracker() {
  const { isAuthenticated } = useAuth();
  const lastActivityUpdateRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Tiempo mínimo entre actualizaciones (30 segundos) para evitar demasiadas peticiones
  const MIN_UPDATE_INTERVAL = 30 * 1000; // 30 segundos

  // Función para actualizar la actividad en el backend
  const updateActivity = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastActivityUpdateRef.current;

    // Solo actualizar si ha pasado el tiempo mínimo desde la última actualización
    if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
      return;
    }

    try {
      // Hacer una petición simple al backend para actualizar la última actividad
      // El middleware CheckUserActivity actualizará automáticamente el updated_at del token
      await clienteApi.get('/user');
      lastActivityUpdateRef.current = now;
    } catch {
      // Silenciar errores para no interrumpir la experiencia del usuario
      // El interceptor de axios ya maneja los errores 401
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // MIN_UPDATE_INTERVAL es una constante, no necesita estar en las dependencias

  // Función debounced para actualizar actividad
  const debouncedUpdateActivity = useCallback(() => {
    // Limpiar timeout anterior si existe
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Esperar 2 segundos antes de actualizar (debounce)
    debounceTimeoutRef.current = setTimeout(() => {
      updateActivity();
    }, 2000);
  }, [updateActivity]);

  // Detectar actividad del usuario
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Eventos que indican actividad del usuario
    // mousemove removido para evitar demasiadas actualizaciones innecesarias
    const events = ['click', 'keydown', 'scroll', 'touchstart'];

    // Agregar listeners para cada evento
    events.forEach(event => {
      document.addEventListener(event, debouncedUpdateActivity, { passive: true });
    });

    // Cleanup: remover listeners
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, debouncedUpdateActivity);
      });
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isAuthenticated, debouncedUpdateActivity]);

  // Actualizar actividad inmediatamente cuando el componente se monta
  useEffect(() => {
    if (isAuthenticated) {
      updateActivity();
    }
  }, [isAuthenticated, updateActivity]);
}

