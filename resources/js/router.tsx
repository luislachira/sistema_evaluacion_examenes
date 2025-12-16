import React, { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from '@/ProtectedRoute';

// Componente de carga
const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
);

// --- Lazy loading de componentes de autenticación ---
const Login = lazy(() => import('@/pages/auth/login'));
const Register = lazy(() => import('@/pages/auth/register'));
const ForgotPassword = lazy(() => import('@/pages/auth/forgot-password'));
const ResetPassword = lazy(() => import('@/pages/auth/reset-password'));
const OAuthCallback = lazy(() => import('@/pages/auth/oauth-success'));

// --- Lazy loading de páginas Admin ---
const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));
const Usuarios = lazy(() => import('@/pages/admin/usuarios'));
const BancoPreguntas = lazy(() => import('@/pages/banco-preguntas'));
const ExamenesAdmin = lazy(() => import('@/pages/admin/examenes'));
const FormularioExamen = lazy(() => import('@/pages/admin/examenes/FormularioExamen'));
const WizardExamen = lazy(() => import('@/pages/admin/examenes/WizardExamen'));
const ResultadosAdmin = lazy(() => import('@/pages/admin/resultados'));
const ConfiguracionAdmin = lazy(() => import('@/pages/admin/configuracion'));

// --- Lazy loading de páginas Docente ---
const ExamenesDocente = lazy(() => import('@/pages/docente/examenes'));
const DetalleExamen = lazy(() => import('@/pages/docente/examenes/DetalleExamen'));
const TomarExamen = lazy(() => import('@/pages/docente/examenes/TomarExamen'));
const HistorialDocente = lazy(() => import('@/pages/docente/historial'));
const Perfil = lazy(() => import('@/pages/profile'));
const ResultadoIntento = lazy(() => import('@/pages/docente/resultado'));
const ConfiguracionDocente = lazy(() => import('@/pages/docente/configuracion'));

// --- Componente de redirección por rol ---
const RoleBasedRedirect = lazy(() => import('@/components/RoleBasedRedirect'));

// Aquí definimos todas las rutas de nuestra aplicación
const router = createBrowserRouter([
    // --- Rutas Públicas ---
    {
        path: '/login',
        element: <Suspense fallback={<LoadingFallback />}><Login /></Suspense>,
    },
    {
        path: '/register',
        element: <Suspense fallback={<LoadingFallback />}><Register /></Suspense>,
    },
    {
        path: '/forgot-password',
        element: <Suspense fallback={<LoadingFallback />}><ForgotPassword /></Suspense>,
    },
    {
        path: '/reset-password',
        element: <Suspense fallback={<LoadingFallback />}><ResetPassword /></Suspense>,
    },
    {
        path: '/oauth/callback',
        element: <Suspense fallback={<LoadingFallback />}><OAuthCallback /></Suspense>,
    },

    // --- Rutas Protegidas - Admin (rol: "0") ---
    {
        path: '/',
        element: <ProtectedRoute requiredRole="0">
                    <Suspense fallback={<LoadingFallback />}><AdminDashboard /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/admin/dashboard',
        element: <ProtectedRoute requiredRole="0">
                    <Suspense fallback={<LoadingFallback />}><AdminDashboard /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/admin/usuarios',
        element: <ProtectedRoute requiredRole="0">
                    <Suspense fallback={<LoadingFallback />}><Usuarios /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/admin/banco-preguntas',
        element: <ProtectedRoute requiredRole="0">
                    <Suspense fallback={<LoadingFallback />}><BancoPreguntas /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/admin/examenes',
        element: <ProtectedRoute requiredRole="0">
                    <Suspense fallback={<LoadingFallback />}><ExamenesAdmin /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/admin/examenes/crear',
        element: <ProtectedRoute requiredRole="0">
                    <Suspense fallback={<LoadingFallback />}><FormularioExamen /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/admin/examenes/:id/wizard',
        element: <ProtectedRoute requiredRole="0">
                    <Suspense fallback={<LoadingFallback />}><WizardExamen /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/admin/examenes/:id/editar',
        element: <ProtectedRoute requiredRole="0">
                    <Suspense fallback={<LoadingFallback />}><FormularioExamen /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/admin/examenes/:id',
        element: <ProtectedRoute requiredRole="0">
                    <Suspense fallback={<LoadingFallback />}><FormularioExamen /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/admin/resultados',
        element: <ProtectedRoute requiredRole="0">
                    <Suspense fallback={<LoadingFallback />}><ResultadosAdmin /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/admin/configuracion',
        element: <ProtectedRoute requiredRole="0">
                    <Suspense fallback={<LoadingFallback />}><ConfiguracionAdmin /></Suspense>
                </ProtectedRoute>,
    },

    // --- Rutas Protegidas - Docente (rol: "1") ---
    {
        path: '/docente',
        element: <ProtectedRoute requiredRole="1">
                    <Suspense fallback={<LoadingFallback />}><ExamenesDocente /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/docente/examenes',
        element: <ProtectedRoute requiredRole="1">
                    <Suspense fallback={<LoadingFallback />}><ExamenesDocente /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/docente/examenes/:id/detalle',
        element: <ProtectedRoute requiredRole="1">
                    <Suspense fallback={<LoadingFallback />}><DetalleExamen /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/docente/examenes/:id/iniciar',
        element: <ProtectedRoute requiredRole="1">
                    <Suspense fallback={<LoadingFallback />}><TomarExamen /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/docente/historial',
        element: <ProtectedRoute requiredRole="1">
                    <Suspense fallback={<LoadingFallback />}><HistorialDocente /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/docente/resultados',
        element: <ProtectedRoute requiredRole="1">
                    <Suspense fallback={<LoadingFallback />}><HistorialDocente /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/docente/intentos/:id/resultado',
        element: <ProtectedRoute requiredRole="1">
                    <Suspense fallback={<LoadingFallback />}><ResultadoIntento /></Suspense>
                </ProtectedRoute>,
    },
    {
        path: '/docente/configuracion',
        element: <ProtectedRoute requiredRole="1">
                    <Suspense fallback={<LoadingFallback />}><ConfiguracionDocente /></Suspense>
                </ProtectedRoute>,
    },

    // --- Rutas Comunes (ambos roles) ---
    {
        path: '/profile',
        element: <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}><Perfil /></Suspense>
                </ProtectedRoute>,
    },

    // Ruta por defecto - redirige según rol
    {
        path: '*',
        element: <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}><RoleBasedRedirect /></Suspense>
                </ProtectedRoute>,
    }
]);

export default router;

