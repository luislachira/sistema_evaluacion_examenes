import React from 'react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import '@css/Login.css';
// import logo from '@img/logo.png';
import { useAuth } from '../../hooks/useAuth';

// --- Interfaces y Tipos ---
interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

// --- Iconos SVG para los botones de OAuth ---
const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 9.92C34.553 6.08 29.625 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
        <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l4.841-4.841C34.553 6.08 29.625 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
        <path fill="#4CAF50" d="m24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.228 0-9.652-3.512-11.289-8.223l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 35.337 44 30.022 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
    </svg>
);

const MicrosoftIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 21 21">
        <path fill="#f25022" d="M1 1h9v9H1z"/>
        <path fill="#00a4ef" d="M1 11h9v9H1z"/>
        <path fill="#7fba00" d="M11 1h9v9h-9z"/>
        <path fill="#ffb900" d="M11 11h9v9h-9z"/>
    </svg>
);

const Login: React.FC = () => {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login({ correo, password });
            // La redirección ahora es manejada por el useEffect
        } catch (err: unknown) {
            const apiError = err as ApiError;
            setError(apiError?.response?.data?.message || 'Error al iniciar sesión.');
        } finally {
            setLoading(false);
        }
    };

    const oauthLogin = (provider: 'google' | 'microsoft') => {
        // En una API, la redirección a OAuth debe ser manejada por el backend
        window.location.href = `/api/v1/oauth/redirect/${provider}`;
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <h2>LOGO</h2>{/* <img src={logo} alt="Logo I.E." /> */}
                    <br />
                    {/* Espacio reservado para tu logo / Reserved space for your logo */}
                    <h2>"NOMBRE DE LA INSTITUCIÓN"</h2>
                </div>
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="correo">Correo</label>
                        <input
                            type="email"
                            id="correo"
                            name="correo"
                            placeholder="tu.correo@ejemplo.com"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    <div className="form-options">
                        <Link to="/forgot-password" className="btn-link">¿Olvidaste tu contraseña?</Link>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                    {/* --- Navegación Corregida --- */}
                    <Link to="/register" className="btn btn-secondary-link">
                        ¿No tienes una cuenta? Regístrate
                    </Link>
                </form>

                <div className="oauth-section">
                    <div className="oauth-divider">
                        <span>or</span>
                    </div>
                    <div className="oauth-buttons">
                        <button type="button" className="oauth-btn google" onClick={() => oauthLogin('google')}>
                            <GoogleIcon />
                            Sign in with Google
                        </button>
                        <button type="button" className="oauth-btn microsoft" onClick={() => oauthLogin('microsoft')}>
                            <MicrosoftIcon />
                            Sign in with Microsoft
                        </button>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', textAlign: 'center', marginTop: '0.5rem' }}>
                        Implementado por Luis Lachira
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Login;
