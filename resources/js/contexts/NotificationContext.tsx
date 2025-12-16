import React, { createContext, useContext, ReactNode } from 'react';
import NotificationSystem, { useNotifications, Notification } from '../components/notifications/NotificationSystem';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  dismissNotification: (id: string) => void;
  dismissAll: () => void;
  notifySuccess: (title: string, message?: string, options?: Partial<Notification>) => string;
  notifyError: (title: string, message?: string, options?: Partial<Notification>) => string;
  notifyWarning: (title: string, message?: string, options?: Partial<Notification>) => string;
  notifyInfo: (title: string, message?: string, options?: Partial<Notification>) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const notificationMethods = useNotifications();

  return (
    <NotificationContext.Provider value={notificationMethods}>
      {children}
      <NotificationSystem
        notifications={notificationMethods.notifications}
        onDismiss={notificationMethods.dismissNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext debe ser usado dentro de un NotificationProvider');
  }
  return context;
};

// Hook personalizado para notificaciones específicas de exámenes
export const useExamenNotifications = () => {
  const { notifySuccess, notifyError, notifyWarning, notifyInfo } = useNotificationContext();

  const notifyExamenCreado = (nombreExamen: string) => {
    return notifySuccess(
      'Examen creado exitosamente',
      `El examen "${nombreExamen}" ha sido creado y está listo para ser configurado.`,
      { duration: 6000 }
    );
  };

  const notifyExamenActualizado = (nombreExamen: string) => {
    return notifySuccess(
      'Examen actualizado',
      `Los cambios en "${nombreExamen}" han sido guardados correctamente.`,
      { duration: 5000 }
    );
  };

  const notifyExamenEliminado = (nombreExamen: string) => {
    return notifySuccess(
      'Examen eliminado',
      `El examen "${nombreExamen}" ha sido eliminado del sistema.`,
      { duration: 5000 }
    );
  };

  const notifyExamenIniciado = (nombreExamen: string, duracion: string) => {
    return notifyInfo(
      'Examen iniciado',
      `Has comenzado "${nombreExamen}". Tienes ${duracion} para completarlo.`,
      { duration: 8000 }
    );
  };

  const notifyExamenFinalizado = (nombreExamen: string, puntaje?: number) => {
    const mensaje = puntaje
      ? `Has obtenido ${puntaje} puntos en "${nombreExamen}".`
      : `Has finalizado "${nombreExamen}". Los resultados estarán disponibles pronto.`;

    return notifySuccess(
      'Examen completado',
      mensaje,
      { duration: 8000 }
    );
  };

  const notifyTiempoAgotado = (nombreExamen: string) => {
    return notifyWarning(
      'Tiempo agotado',
      `Se ha agotado el tiempo para "${nombreExamen}". El examen se finalizó automáticamente.`,
      { duration: 10000, persistent: true }
    );
  };

  const notifyExamenProgramado = (nombreExamen: string, fechaInicio: string) => {
    return notifyInfo(
      'Examen programado',
      `"${nombreExamen}" estará disponible el ${fechaInicio}.`,
      { duration: 7000 }
    );
  };

  const notifyExamenDisponible = (nombreExamen: string) => {
    return notifyInfo(
      'Nuevo examen disponible',
      `El examen "${nombreExamen}" ya está disponible para ser tomado.`,
      {
        duration: 0,
        persistent: true,
        actions: [
          {
            label: 'Ver examen',
            action: () => {
              // Navegar al examen
              window.location.href = '/docente/examenes';
            },
            style: 'primary'
          }
        ]
      }
    );
  };

  const notifyExamenProximoVencer = (nombreExamen: string, tiempoRestante: string) => {
    return notifyWarning(
      'Examen próximo a vencer',
      `El examen "${nombreExamen}" estará disponible solo por ${tiempoRestante} más.`,
      {
        duration: 10000,
        actions: [
          {
            label: 'Tomar ahora',
            action: () => {
              window.location.href = '/docente/examenes';
            },
            style: 'primary'
          }
        ]
      }
    );
  };

  const notifyResultadoDisponible = (nombreExamen: string, aprobado: boolean, puntaje: number) => {
    return aprobado
      ? notifySuccess(
          'Resultado disponible - ¡Aprobado!',
          `Has aprobado "${nombreExamen}" con ${puntaje} puntos.`,
          {
            duration: 10000,
            actions: [
              {
                label: 'Ver detalles',
                action: () => {
                  window.location.href = '/docente/historial';
                },
                style: 'primary'
              }
            ]
          }
        )
      : notifyWarning(
          'Resultado disponible',
          `Has obtenido ${puntaje} puntos en "${nombreExamen}".`,
          {
            duration: 10000,
            actions: [
              {
                label: 'Ver detalles',
                action: () => {
                  window.location.href = '/docente/historial';
                },
                style: 'primary'
              }
            ]
          }
        );
  };

  const notifyErrorConexion = () => {
    return notifyError(
      'Error de conexión',
      'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet.',
      { duration: 8000 }
    );
  };

  const notifyErrorGuardado = (accion: string) => {
    return notifyError(
      'Error al guardar',
      `No se pudo ${accion}. Por favor, inténtalo nuevamente.`,
      { duration: 6000 }
    );
  };

  const notifyRespuestaGuardada = () => {
    return notifySuccess(
      'Respuesta guardada',
      'Tu respuesta ha sido guardada automáticamente.',
      { duration: 3000 }
    );
  };

  // Notificaciones de seguridad
  const notifySecurityRestriction = (field: 'rol' | 'estado', message: string) => {
    return notifyWarning(
      `🔒 Restricción de Seguridad`,
      message,
      {
        duration: 8000,
        persistent: true,
        actions: [
          {
            label: 'Entendido',
            action: () => {
              // Solo cerrar la notificación
            },
            style: 'primary'
          },
          {
            label: '¿Por qué?',
            action: () => {
              notifyInfo(
                'Protección de Cuenta',
                'Esta restricción evita que accidentalmente pierdas acceso a tu cuenta de administrador. Para cambios críticos, contacta a otro administrador.',
                { duration: 10000 }
              );
            },
            style: 'secondary'
          }
        ]
      }
    );
  };

  return {
    // Notificaciones generales
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,

    // Notificaciones específicas de exámenes
    notifyExamenCreado,
    notifyExamenActualizado,
    notifyExamenEliminado,
    notifyExamenIniciado,
    notifyExamenFinalizado,
    notifyTiempoAgotado,
    notifyExamenProgramado,
    notifyExamenDisponible,
    notifyExamenProximoVencer,
    notifyResultadoDisponible,
    notifyErrorConexion,
    notifyErrorGuardado,
    notifyRespuestaGuardada,

    // Notificaciones de seguridad
    notifySecurityRestriction
  };
};
