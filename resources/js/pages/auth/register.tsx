import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '@css/Login.css';
import logo from '@/assets/logo_leonor_cerna 2.png';
import { useAuth } from '../../hooks/useAuth';
import { RegisterData } from '../../store/authStore';

const Register: React.FC = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [formData, setFormData] = useState<RegisterData>({
        nombre: '',
        apellidos: '',
        correo: '',
        password: '',
        password_confirmation: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await register(formData);
            setShowSuccessMessage(true);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error?.response?.data?.message || 'Error al registrar usuario');
        } finally {
            setLoading(false);
        }
    };

    // Mostrar mensaje de éxito
    if (showSuccessMessage) {
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
                <form className="login-form" onSubmit={onSubmit}>
                    <div className="input-group">
                        <label htmlFor="nombre">Nombres</label>
                        <input
                            type="text"
                            id="nombre"
                            name="nombre"
                            required
                            value={formData.nombre}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="apellidos">Apellidos</label>
                        <input
                            type="text"
                            id="apellidos"
                            name="apellidos"
                            required
                            value={formData.apellidos}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="correo">Correo Electrónico</label>
                        <input
                            type="email"
                            id="correo"
                            name="correo"
                            required
                            value={formData.correo}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            minLength={8}
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password_confirmation">Confirmar Contraseña</label>
                        <input
                            type="password"
                            id="password_confirmation"
                            name="password_confirmation"
                            required
                            minLength={8}
                            value={formData.password_confirmation}
                            onChange={handleChange}
                        />
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Registrando...' : 'Registrar'}
                    </button>
                    <Link to="/login" className="btn btn-secondary">
                        Volver al Login
                    </Link>
                </form>
            </div>
        </div>
    );
};

export default Register;
