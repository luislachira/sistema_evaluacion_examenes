import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from './loading-screen';

/**
 * Componente que redirige al usuario según su rol
 * - Administrador (rol '0') -> /admin/dashboard
 * - Docente (rol '1') -> /docente/examenes
 */
const RoleBasedRedirect: React.FC = () => {
    const { user, isInitialized } = useAuth();

    // Mostrar loading mientras se verifica la sesión
    if (!isInitialized) {
        return <LoadingScreen />;
    }

    // Redirigir según el rol
    if (user?.rol === '0') {
        return <Navigate to="/admin/dashboard" replace />;
    } else if (user?.rol === '1') {
        return <Navigate to="/docente/examenes" replace />;
    }

    // Si no hay usuario o rol desconocido, redirigir al login
    return <Navigate to="/login" replace />;
};

export default RoleBasedRedirect;
