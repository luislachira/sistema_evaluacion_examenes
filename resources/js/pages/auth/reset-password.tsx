import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '@css/Login.css';
import logo from '@/assets/logo_leonor_cerna 2.png';

interface ApiError {
    response?: {
        data?: {
            message?: string;
            errors?: {
                [key: string]: string[];
            };
        };
    };
}

const ResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: searchParams.get('email') || '',
        password: '',
        password_confirmation: '',
        token: searchParams.get('token') || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Si no tenemos token o email, redirigir a forgot-password
        if (!formData.token || !formData.email) {
            navigate('/forgot-password');
        }
    }, [formData.token, formData.email, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        // Limpiar errores del campo cuando el usuario escriba
        if (fieldErrors[e.target.name]) {
            setFieldErrors({
                ...fieldErrors,
                [e.target.name]: ''
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});
        setLoading(true);

        try {
            const response = await fetch('/api/v1/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    correo: formData.email,
                    password: formData.password,
                    password_confirmation: formData.password_confirmation,
                    token: formData.token
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
            } else {
                throw { response: { data } };
            }
        } catch (err: unknown) {
            const apiError = err as ApiError;
            
            if (apiError?.response?.data?.errors) {
                // Manejar errores de validación por campo
                const errors = apiError.response.data.errors;
                const newFieldErrors: {[key: string]: string} = {};
                
                Object.keys(errors).forEach(field => {
                    newFieldErrors[field] = errors[field][0];
                });
                
                setFieldErrors(newFieldErrors);
            } else {
                setError(apiError?.response?.data?.message || 'Error al restablecer la contraseña');
            }
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
                        <div className="success-icon">✓</div>
                        <h3>Contraseña Restablecida</h3>
                        <p className="success-message">
                            Tu contraseña ha sido restablecida exitosamente.
                        </p>
                        <Link to="/login" className="btn btn-primary">
                            Iniciar Sesión
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
                    <h3>Restablecer Contraseña</h3>
                    <p>Ingresa tu nueva contraseña.</p>
                    
                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label htmlFor="email">Correo Electrónico</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                readOnly
                                className="readonly-input"
                            />
                            {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
                        </div>

                        <div className="input-group">
                            <label htmlFor="password">Nueva Contraseña</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                placeholder="Mínimo 8 caracteres"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={8}
                                autoFocus
                            />
                            {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
                        </div>

                        <div className="input-group">
                            <label htmlFor="password_confirmation">Confirmar Contraseña</label>
                            <input
                                type="password"
                                id="password_confirmation"
                                name="password_confirmation"
                                placeholder="Confirma tu nueva contraseña"
                                value={formData.password_confirmation}
                                onChange={handleChange}
                                required
                                minLength={8}
                            />
                            {fieldErrors.password_confirmation && <div className="field-error">{fieldErrors.password_confirmation}</div>}
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={loading}
                        >
                            {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
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

export default ResetPassword;
