import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import MainLayout from './components/layout/MainLayout';
import LoadingScreen from './components/loading-screen';

/**
 * Este componente protege las rutas que requieren autenticación.
 * 1. Comprueba si el usuario está autenticado usando el hook useAuth.
 * 2. Si está autenticado, renderiza el MainLayout (que incluye el Sidebar)
 * y dentro de él, la página que el usuario intentaba visitar (los children).
 * 3. Si NO está autenticado, redirige al usuario a la página de /login.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string | string[] }> = ({ children, requiredRole }) => {
    const { isAuthenticated, isInitialized, user } = useAuth();
    const location = useLocation();

    // Muestra un estado de carga mientras se verifica la sesión inicial.
    if (!isInitialized) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                state={{ from: location }}
                replace
            />
        );
    }

    // Verificación de roles (si se especificaron)
    if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        const userRole = user?.rol;

        if (!userRole || !roles.includes(userRole)) {
            // Redirigir según el rol del usuario
            if (userRole === '0') {
                return <Navigate to="/admin/dashboard" replace />;
            } else if (userRole === '1') {
                return <Navigate to="/docente/examenes" replace />;
            }
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // Si está autenticado, muestra el layout principal con el contenido de la página solicitada.
    return <MainLayout>{children}</MainLayout>;
};

export default ProtectedRoute;
