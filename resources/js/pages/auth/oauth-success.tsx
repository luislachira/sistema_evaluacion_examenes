import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authStore, UsuarioDTO } from '../../store/authStore';
import '@css/Login.css';
import logo from '@/assets/logo_leonor_cerna 2.png';

const OAuthCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        const token = searchParams.get('token');
        const userJson = searchParams.get('user');
        const errorMsg = searchParams.get('error');
        const pending = searchParams.get('pending');


        // Verificar si la cuenta está pendiente de aprobación
        if (pending === 'true') {
            setIsPending(true);
            return;
        }

        if (errorMsg) {
            setError(decodeURIComponent(errorMsg));
            setTimeout(() => {
                navigate('/login');
            }, 3000);
            return;
        }

        if (token && userJson) {
            try {
                const user: UsuarioDTO = JSON.parse(decodeURIComponent(userJson));


                // Guardar en el auth store (simular el proceso de login)
                const newState = {
                    token,
                    user,
                    isInitialized: true
                };

                // 1. Guardar en localStorage
                localStorage.setItem('auth_state_v1', JSON.stringify({ user, token }));

                // 2. Actualizar el estado del authStore usando setState (si existe ese método)
                // Si tu authStore no tiene setState, necesitamos actualizar directamente
                if (typeof authStore.setState === 'function') {
                    authStore.setState(newState);
                } else {
                    // Actualizar el estado interno y notificar listeners
                    // Esto depende de cómo esté implementado tu authStore
                    Object.assign(authStore.getState(), newState);
                }


                // 3. Forzar un re-render notificando a los listeners
                // Esto asegura que todos los componentes que usan useAuth se actualicen
                const listeners = (authStore as { listeners?: (() => void)[] }).listeners;
                if (listeners) {
                    listeners.forEach((listener: () => void) => listener());
                }

                // Redirigir según el rol
                const isAdmin = user.rol === '0';
                const redirectPath = isAdmin ? '/admin/dashboard' : '/docente/examenes';


                // Usar un pequeño delay para asegurar que el estado se actualizó
                setTimeout(() => {
                    navigate(redirectPath, { replace: true });
                }, 100);
            } catch {
                setError('Error al procesar la autenticación. Por favor, inténtalo de nuevo.');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } else {
            setError('No se recibió información de autenticación.');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        }
    }, [searchParams, navigate]);

    // Mostrar mensaje de cuenta pendiente
    if (isPending) {
        return (
            <div className="login-container">
                <div className="login-box" style={{ textAlign: 'center' }}>
                    <div className="login-header">
                        <img src={logo} alt="Logo I.E. Leonor Cerna de Valdiviezo" />
                        <h2>I.E. LEONOR CERNA DE VALDIVIEZO</h2>
                    </div>
                    <div style={{
                        padding: '2rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            fontSize: '3rem',
                            color: '#f7b731'
                        }}>
                            ⏳
                        </div>
                        <h3 style={{
                            margin: 0,
                            color: '#333',
                            fontSize: '1.25rem',
                            fontWeight: '600'
                        }}>
                            Registro Exitoso
                        </h3>
                        <p style={{
                            margin: 0,
                            color: '#555',
                            fontSize: '1rem',
                            lineHeight: '1.6'
                        }}>
                            Tu cuenta ha sido creada correctamente.
                        </p>
                        <p style={{
                            margin: 0,
                            color: '#555',
                            fontSize: '1rem',
                            lineHeight: '1.6',
                            fontWeight: '500'
                        }}>
                            Por favor, espera hasta que el administrador acepte tu solicitud.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="btn btn-primary"
                            style={{ marginTop: '1rem', maxWidth: '250px' }}
                        >
                            Volver al Login
                        </button>

                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                        }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500', color: '#374151' }}>
                                ¿Quieres registrar otra cuenta?
                            </p>
                            <p style={{ margin: 0 }}>
                                Al hacer clic en "Volver al Login" y luego en "Sign in with Google", podrás seleccionar otra cuenta de Google o agregar una nueva.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                gap: '20px'
            }}>
                <div style={{ color: 'red', fontSize: '18px' }}>❌ {error}</div>
                <div>Redirigiendo al login...</div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '10px'
        }}>
            <div className="spinner" />
            <div>Procesando inicio de sesión...</div>
        </div>
    );
};

export default OAuthCallback;
