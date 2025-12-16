import React from 'react';
import Sidebar from './Sidebar';
import Footer from './Footer';
import '@css/MainLayout.css';
import { useAuth } from '../../hooks/useAuth';
import { useAutoLogout } from '../../hooks/useAutoLogout';
import { useActivityTracker } from '../../hooks/useActivityTracker';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    // Hook para mostrar advertencia de inactividad y cerrar sesión automáticamente
    const { showWarning, timeRemaining, extendSession } = useAutoLogout({
        checkInterval: 30 * 1000, // Verificar cada 30 segundos
        warningTime: 60, // Mostrar advertencia cuando queden 60 segundos (1 minuto)
    });

    // Detectar actividad del usuario para actualizar la sesión automáticamente
    useActivityTracker();

    // Esta comprobación es una seguridad adicional. ProtectedRoute ya hace el trabajo principal.
    if (!isAuthenticated || !user) {
        return null; // O un spinner de carga
    }

    const role = user?.rol === '0' ? 'admin' : 'docente';
    const fullName = `${user?.nombre} ${user?.apellidos}`;

    // Función para formatear el tiempo restante
    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
            <div className="main-layout">
                <Sidebar user={{ fullName, role }} />
                <main className="content-area">
                    {children}
                    <Footer />
                </main>

                {/* Modal de advertencia de inactividad */}
                {showWarning && (
                    <div className="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-[9999]">
                        <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
                            <div className="text-center">
                                <div className="mb-4">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Sesión por expirar
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Su sesión se cerrará automáticamente en <strong className="text-red-600">{formatTime(timeRemaining)}</strong> debido a inactividad.
                                    </p>
                                    <p className="text-sm text-gray-500 mb-6">
                                        ¿Desea continuar trabajando?
                                    </p>
                                </div>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={extendSession}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                                    >
                                        Continuar sesión
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
    );
};

export default MainLayout;
