import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '@css/Login.css';
import logo from '@/assets/logo_leonor_cerna 2.png';

interface ApiError {
    response?: {
        data?: {
            message?: string;
            errors?: {
                email?: string[];
            };
        };
    };
}

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        try {
            const response = await fetch('/api/v1/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ correo: email })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setMessage(data.message || 'Se ha enviado un enlace de recuperación a tu correo electrónico.');
            } else {
                throw { response: { data } };
            }
        } catch (err: unknown) {
            const apiError = err as ApiError;
            const errorMessage = apiError?.response?.data?.message || 
                               apiError?.response?.data?.errors?.email?.[0] || 
                               'Error al enviar el enlace de recuperación';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="login-container">
                <div className="login-box">
                    <div className="login-header">
                        <img src={logo} alt="Logo I.E. Leonor Cerna de Valdiviezo" />
                        <h2>I.E. LEONOR CERNA DE VALDIVIEZO</h2>
                    </div>
                    <div className="success-message-container">
                        <div className="success-icon">✉️</div>
                        <h3>Correo Enviado</h3>
                        {message && <p className="success-message">{message}</p>}
                        <Link to="/login" className="btn btn-primary">
                            Volver al Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <img src={logo} alt="Logo I.E. Leonor Cerna de Valdiviezo" />
                    <h2>I.E. LEONOR CERNA DE VALDIVIEZO</h2>
                </div>
                <div className="forgot-password-content">
                    <h3>Recuperar Contraseña</h3>
                    <p>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
                    
                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label htmlFor="email">Correo Electrónico</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="tu.correo@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}
                        {message && <div className="success-message">{message}</div>}

                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={loading}
                        >
                            {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                        </button>
                        
                        <Link to="/login" className="btn btn-secondary">
                            Volver al Login
                        </Link>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
