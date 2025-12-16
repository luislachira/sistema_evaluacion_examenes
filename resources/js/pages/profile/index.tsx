import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { FaUser, FaEnvelope, FaKey, FaSave, FaTimes, FaUserCircle } from 'react-icons/fa';
import clienteApi from '../../api/clienteApi';

interface PerfilData {
    nombre: string;
    apellidos: string;
    correo: string;
    password: string;
    confirmPassword: string;
}

const Perfil: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState<PerfilData>({
        nombre: user?.nombre || '',
        apellidos: user?.apellidos || '',
        correo: user?.correo || '',
        password: '',
        confirmPassword: ''
    });

    const [originalData, setOriginalData] = useState<PerfilData>({
        nombre: user?.nombre || '',
        apellidos: user?.apellidos || '',
        correo: user?.correo || '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            const userData = {
                nombre: user.nombre || '',
                apellidos: user.apellidos || '',
                correo: user.correo || '',
                password: '',
                confirmPassword: ''
            };
            setFormData(userData);
            setOriginalData(userData);
        }
    }, [user]);

    const handleInputChange = (field: keyof PerfilData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleEdit = () => {
        setIsEditing(true);
        setMessage(null);
    };

    const handleCancel = () => {
        setFormData(originalData);
        setIsEditing(false);
        setMessage(null);
    };

    const validateForm = (): boolean => {
        if (!formData.nombre.trim() || !formData.apellidos.trim() || !formData.correo.trim()) {
            setMessage({ type: 'error', text: 'Todos los campos básicos son obligatorios.' });
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.correo)) {
            setMessage({ type: 'error', text: 'Por favor ingresa un correo válido.' });
            return false;
        }

        if (formData.password && formData.password.length < 6) {
            setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setLoading(true);
        setMessage(null);

        try {
            const updateData: {
                nombre: string;
                apellidos: string;
                correo: string;
                password?: string;
                password_confirmation?: string;
            } = {
                nombre: formData.nombre,
                apellidos: formData.apellidos,
                correo: formData.correo
            };

            // Solo incluir password si se proporcionó
            if (formData.password) {
                updateData.password = formData.password;
                updateData.password_confirmation = formData.confirmPassword;
            }

            await clienteApi.put('/profile', updateData);

            // Actualizar el contexto de autenticación con los nuevos datos
            if (updateUser) {
                updateUser({
                    ...user,
                    nombre: formData.nombre,
                    apellidos: formData.apellidos,
                    correo: formData.correo
                });
            }

            // Actualizar los datos originales
            const newOriginalData = { ...formData, password: '', confirmPassword: '' };
            setOriginalData(newOriginalData);
            setFormData(newOriginalData);

            setIsEditing(false);
            setMessage({ type: 'success', text: 'Perfil actualizado exitosamente.' });
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            setMessage({
                type: 'error',
                text: apiError.response?.data?.message || 'Error al actualizar el perfil.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="perfil-container w-full p-6" style={{ maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <FaUserCircle className="mr-3 text-blue-600" />
                    Mi Perfil
                </h1>
                <p className="text-gray-600 mt-2">Gestiona tu información personal y configuración de cuenta</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
                {/* Información del usuario - Card lateral */}
                <Card className="lg:col-span-1 min-w-0">
                    <CardHeader className="text-center">
                        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaUserCircle className="text-4xl text-blue-600" />
                        </div>
                        <CardTitle className="text-xl break-words">{user?.nombre} {user?.apellidos}</CardTitle>
                        <p className="text-sm text-gray-600">
                            {user?.rol === '0' ? 'Administrador' : 'Docente'}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center text-sm text-gray-600 break-words">
                                <FaEnvelope className="mr-2 flex-shrink-0" />
                                <span className="break-all">{user?.correo}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <FaUser className="mr-2 flex-shrink-0" />
                                <span>ID: {user?.idUsuario}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Formulario de edición - Card principal */}
                <Card className="lg:col-span-2 min-w-0">
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <CardTitle className="text-xl">Información Personal</CardTitle>
                        {!isEditing ? (
                            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                                <FaUser className="mr-2" />
                                Editar Perfil
                            </Button>
                        ) : (
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                                <Button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                                >
                                    <FaSave className="mr-2" />
                                    {loading ? 'Guardando...' : 'Guardar'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={loading}
                                    className="w-full sm:w-auto"
                                >
                                    <FaTimes className="mr-2" />
                                    Cancelar
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        {message && (
                            <Alert className={`mb-4 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                                    {message.text}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                            {/* Datos básicos */}
                            <div className="space-y-4 min-w-0">
                                <div>
                                    <Label htmlFor="nombre">Nombre</Label>
                                    <Input
                                        id="nombre"
                                        value={formData.nombre}
                                        onChange={(e) => handleInputChange('nombre', e.target.value)}
                                        disabled={!isEditing}
                                        className={!isEditing ? 'bg-gray-50' : ''}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="apellidos">Apellidos</Label>
                                    <Input
                                        id="apellidos"
                                        value={formData.apellidos}
                                        onChange={(e) => handleInputChange('apellidos', e.target.value)}
                                        disabled={!isEditing}
                                        className={!isEditing ? 'bg-gray-50' : ''}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="correo">Correo Electrónico</Label>
                                    <Input
                                        id="correo"
                                        type="email"
                                        value={formData.correo}
                                        onChange={(e) => handleInputChange('correo', e.target.value)}
                                        disabled={!isEditing}
                                        className={!isEditing ? 'bg-gray-50' : ''}
                                    />
                                </div>

                            </div>

                            {/* Cambio de contraseña */}
                            {isEditing && (
                                <div className="space-y-4 min-w-0">
                                    <div>
                                        <Label htmlFor="password">Nueva Contraseña (opcional)</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => handleInputChange('password', e.target.value)}
                                            placeholder="Dejar vacío para mantener la actual"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={formData.confirmPassword}
                                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                            placeholder="Confirmar nueva contraseña"
                                        />
                                    </div>

                                    <div className="flex items-center text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                                        <FaKey className="mr-2 text-blue-600 flex-shrink-0" />
                                        <span className="break-words">Si no deseas cambiar tu contraseña, deja estos campos vacíos.</span>
                                    </div>
                                </div>
                            )}

                            {/* Información de solo lectura cuando no está editando */}
                            {!isEditing && (
                                <div className="space-y-4 min-w-0">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-3">Información de Cuenta</h4>
                                        <div className="space-y-2 text-sm text-gray-600">
                                            <div className="flex justify-between">
                                                <span>Rol:</span>
                                                <span className="font-medium">
                                                    {user?.rol === '0' ? 'Administrador' : 'Docente'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>ID de Usuario:</span>
                                                <span className="font-medium">{user?.idUsuario}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Estado:</span>
                                                <span className="font-medium text-green-600">Activo</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Perfil;
