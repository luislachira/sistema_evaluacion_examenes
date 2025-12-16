import React, { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaUserShield, FaUser } from 'react-icons/fa';
import { useUsuarios } from '../../hooks/useUsuarios';
import { useExamenNotifications } from '../../contexts/NotificationContext';
import '@css/admin/usuarios.css';

interface Usuario {
    idUsuario: number;
    nombre: string;
    apellidos: string;
    correo: string;
    rol: string;
    estado: string;
    created_at: string;
}

interface FormData {
    nombre: string;
    apellidos: string;
    correo: string;
    password?: string;
    rol: string;
    estado: string;
}

const Usuarios: React.FC = () => {
    const { notifySuccess, notifyError } = useExamenNotifications();

    // 2. Llamar al hook de usuarios
    //    Obtenemos el estado (usuarios, loading, error) y las funciones de API
    const {
        usuarios,
        loading,
        error,
        pagination,
        searchTerm,
        roleFilter,
        estadoFilter,
        setSearchTerm,
        setRoleFilter,
        setEstadoFilter,
        fetchUsuarios,
        aprobarUsuario,
        suspenderUsuario,
        eliminarUsuario,
        crearUsuario,
        actualizarUsuario
    } = useUsuarios();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);

    // Estados para el formulario
    const [formData, setFormData] = useState<FormData>({
        nombre: '',
        apellidos: '',
        correo: '',
        password: '',
        rol: '1',
        estado: '1'
    });

    const [userToDelete, setUserToDelete] = useState<number | null>(null);

    // Usar usuarios directamente del hook (ya filtrados por el backend)
    const filteredUsuarios = usuarios;

    // Obtener badge de estado
    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case '1':
                return <Badge className="bg-green-500 text-white">Activo</Badge>;
            case '0':
                return <Badge className="bg-red-500 text-white">Inactivo</Badge>;
            case '2':
                return <Badge className="bg-orange-500 text-white">Pendiente</Badge>;
            default:
                return <Badge className="bg-gray-500 text-white">Desconocido</Badge>;
        }
    };

    // Obtener nombre del rol
    const getRoleName = (rol: string) => {
        return rol === '0' ? 'Administrador' : 'Docente';
    };

    // Manejar cambios del formulario
    const handleFormChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Manejar búsqueda
    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        fetchUsuarios(1, value, roleFilter, estadoFilter);
    };

    // Manejar cambio de filtro de rol
    const handleRoleFilterChange = (value: string) => {
        setRoleFilter(value);
        fetchUsuarios(1, searchTerm, value, estadoFilter);
    };

    // Manejar cambio de filtro de estado
    const handleEstadoFilterChange = (value: string) => {
        setEstadoFilter(value);
        fetchUsuarios(1, searchTerm, roleFilter, value);
    };

    // Manejar cambio de página
    const handlePageChange = (page: number) => {
        fetchUsuarios(page, searchTerm, roleFilter, estadoFilter);
    };

    // --- Manejadores de acciones (UI + Hook) ---
    //Crear "manejadores" que llaman al hook y luego manejan la UI

    // Aprobar usuario
    const handleAprobarUsuario = async (idUsuario: number) => {
        const result = await aprobarUsuario(idUsuario);
        if (result.success) {
            notifySuccess('Usuario Aprobado', 'El usuario ha sido activado.');
        } else {
            notifyError('Error', result.error || 'No se pudo aprobar al usuario.');
        }
    };

    // Suspender usuario
    const handleSuspenderUsuario = async (idUsuario: number) => {
        const result = await suspenderUsuario(idUsuario);
        if (result.success) {
            notifySuccess('Usuario Suspendido', 'El usuario ha sido desactivado.');
        } else {
            notifyError('Error', result.error || 'No se pudo suspender al usuario.');
        }
    };

    // Manejador para abrir el modal de confirmación
    const openConfirmDeleteModal = (idUsuario: number) => {
        setUserToDelete(idUsuario);
        setIsConfirmDeleteOpen(true);
    };

   // Manejador que ejecuta la eliminación
    const handleEliminarUsuario = async () => {
        if (userToDelete === null) return;

        const result = await eliminarUsuario(userToDelete);
        if (result.success) {
            notifySuccess('Usuario Eliminado', 'El usuario ha sido eliminado permanentemente.');
        } else {
            notifyError('Error', result.error || 'No se pudo eliminar al usuario.');
        }
        setIsConfirmDeleteOpen(false);
        setUserToDelete(null);
    };

    // Crear usuario
    const handleCrearUsuario = async () => {
        // Asegurarse de que el password no esté vacío
        if (!formData.password || formData.password.trim() === '') {
            notifyError('Error de Validación', 'La contraseña es obligatoria para crear un usuario.');
            return;
        }

        const result = await crearUsuario(formData as FormData & { password: string });
        if (result.success) {
            notifySuccess('Usuario Creado', 'El nuevo usuario ha sido registrado.');
            setIsAddModalOpen(false);
            setFormData({ nombre: '', apellidos: '', correo: '', password: '', rol: '1', estado: '1' });
        } else {
            notifyError('Error al Crear', result.error || 'No se pudo crear el usuario.');
        }
    };

    // Actualizar usuario
    const handleActualizarUsuario = async () => {
        if (!selectedUser) return;

        const updateData: Partial<FormData> = { ...formData };

        // Si el password está vacío, no lo enviamos
        if (!updateData.password || updateData.password.trim() === '') {
            delete updateData.password;
        }

        const result = await actualizarUsuario(selectedUser.idUsuario, updateData);

        if (result.success) {
            notifySuccess(
                'Usuario actualizado',
                `Los datos de ${selectedUser.nombre} ${selectedUser.apellidos} han sido actualizados.`
            );
            setIsEditModalOpen(false);
            setSelectedUser(null);
            setFormData({ nombre: '', apellidos: '', correo: '', password: '', rol: '1', estado: '1' });
        } else {
            // Aquí usamos el error genérico del hook.
            // Si necesitaras la lógica 403, el hook 'useUsuarios' tendría que ser modificado
            // para devolver el objeto de error completo, no solo el mensaje.
            notifyError('Error al actualizar', result.error || 'No se pudo actualizar el usuario.');
        }
    };

    // Abrir modal de edición
    const openEditModal = (usuario: Usuario) => {
        setSelectedUser(usuario);
        setFormData({
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            correo: usuario.correo,
            password: '',
            rol: usuario.rol,
            estado: usuario.estado
        });
        setIsEditModalOpen(true);
    };

    // Usar el 'loading' del hook
    if (loading) {
        return (
            <div className="usuarios-container">
                <div className="loading">Cargando usuarios...</div>
            </div>
        );
    }

    // Usar el 'error' del hook
    if (error) {
        return (
            <div className="usuarios-container">
                <div className="p-4 bg-red-100 text-red-700 rounded-lg">Error al cargar datos: {error}</div>
            </div>
        );
    }

    return (
            <div className="usuarios-container">
                <Card>
                    <CardHeader>
                        <div className="usuarios-header">
                            <CardTitle className="usuarios-title">Gestión de Usuarios</CardTitle>
                            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                                <DialogTrigger asChild>
                                    <Button className="add-user-btn">
                                        <FaPlus className="mr-2" />
                                        Agregar Usuario
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
                                        <DialogDescription>
                                            Completa los datos del nuevo usuario
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="form-grid">
                                        <div>
                                            <Label htmlFor="nombre">Nombre</Label>
                                            <Input
                                                id="nombre"
                                                value={formData.nombre}
                                                onChange={(e) => handleFormChange('nombre', e.target.value)}
                                                placeholder="Nombre del usuario"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="apellidos">Apellidos</Label>
                                            <Input
                                                id="apellidos"
                                                value={formData.apellidos}
                                                onChange={(e) => handleFormChange('apellidos', e.target.value)}
                                                placeholder="Apellidos del usuario"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="correo">Correo</Label>
                                            <Input
                                                id="correo"
                                                type="email"
                                                value={formData.correo}
                                                onChange={(e) => handleFormChange('correo', e.target.value)}
                                                placeholder="correo@ejemplo.com"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="password">Contraseña</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => handleFormChange('password', e.target.value)}
                                                placeholder="Contraseña"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="rol">Rol</Label>
                                            <Select value={formData.rol} onValueChange={(value) => handleFormChange('rol', value)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">Administrador</SelectItem>
                                                    <SelectItem value="1">Docente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="estado">Estado</Label>
                                            <Select value={formData.estado} onValueChange={(value) => handleFormChange('estado', value)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">Activo</SelectItem>
                                                    <SelectItem value="0">Inactivo</SelectItem>
                                                    <SelectItem value="2">Pendiente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button onClick={handleCrearUsuario}>
                                            Crear Usuario
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="usuarios-filters">
                            <div className="search-container">
                                <FaSearch className="search-icon" />
                                <Input
                                    type="text"
                                    placeholder="Buscar usuario..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="search-input"
                                />
                            </div>

                            <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos los roles</SelectItem>
                                    <SelectItem value="0">Administrador</SelectItem>
                                    <SelectItem value="1">Docente</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={estadoFilter} onValueChange={handleEstadoFilterChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los estados" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos los estados</SelectItem>
                                    <SelectItem value="1">Activo</SelectItem>
                                    <SelectItem value="0">Inactivo</SelectItem>
                                    <SelectItem value="2">Pendiente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>

                    <div className="usuarios-table-container">
                        {/* Vista de tabla para pantallas grandes (xl+) */}
                        <div className="table-wrapper usuarios-tabla-desktop">
                            <table className="usuarios-table">
                                <thead>
                                    <tr>
                                        <th className="table-col-id">ID</th>
                                        <th className="table-col-nombre">Nombre</th>
                                        <th className="table-col-email">Email</th>
                                        <th className="table-col-rol">Rol</th>
                                        <th className="table-col-estado">Estado</th>
                                        <th className="table-col-fecha">Fecha</th>
                                        <th className="table-col-acciones">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsuarios.map((usuario) => (
                                        <tr key={usuario.idUsuario}>
                                            <td className="table-col-id">{usuario.idUsuario.toString().padStart(3, '0')}</td>
                                            <td className="table-col-nombre">
                                                <div className="truncate" title={`${usuario.nombre} ${usuario.apellidos}`}>
                                                    {`${usuario.nombre} ${usuario.apellidos}`}
                                                </div>
                                            </td>
                                            <td className="table-col-email">
                                                <div className="truncate" title={usuario.correo}>{usuario.correo}</div>
                                            </td>
                                            <td className="table-col-rol">
                                                <div className="rol-cell">
                                                    {usuario.rol === '0' ? <FaUserShield className="text-blue-600 text-xs" /> : <FaUser className="text-gray-600 text-xs" />}
                                                    <span className="rol-text">{getRoleName(usuario.rol)}</span>
                                                </div>
                                            </td>
                                            <td className="table-col-estado">{getEstadoBadge(usuario.estado)}</td>
                                            <td className="table-col-fecha">{usuario.created_at}</td>
                                            <td className="table-col-acciones">
                                                <div className="acciones-cell">
                                                    {usuario.estado === '2' && (
                                                        <Button
                                                            size="sm"
                                                            className="aprobar-btn"
                                                            onClick={() => handleAprobarUsuario(usuario.idUsuario)}
                                                            title="Aprobar"
                                                        >
                                                            <FaCheck className="btn-icon" />
                                                            <span className="btn-text">Aprobar</span>
                                                        </Button>
                                                    )}

                                                    {usuario.estado === '1' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="suspender-btn"
                                                            onClick={() => handleSuspenderUsuario(usuario.idUsuario)}
                                                            title="Suspender"
                                                        >
                                                            <FaTimes className="btn-icon" />
                                                            <span className="btn-text">Suspender</span>
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="edit-btn"
                                                        onClick={() => openEditModal(usuario)}
                                                        title="Editar"
                                                    >
                                                        <FaEdit className="btn-icon" />
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="delete-btn"
                                                        onClick={() => openConfirmDeleteModal(usuario.idUsuario)}
                                                        title="Eliminar"
                                                    >
                                                        <FaTrash className="btn-icon" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista de tabla compacta para tablets (lg-xl) */}
                        <div className="table-wrapper usuarios-tabla-tablet">
                            <table className="usuarios-table usuarios-tabla-compacta">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Email</th>
                                        <th>Rol</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsuarios.map((usuario) => (
                                        <tr key={usuario.idUsuario}>
                                            <td>
                                                <div className="truncate" title={`${usuario.nombre} ${usuario.apellidos}`}>
                                                    {`${usuario.nombre} ${usuario.apellidos}`}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="truncate" title={usuario.correo}>{usuario.correo}</div>
                                            </td>
                                            <td>
                                                <div className="rol-cell">
                                                    {usuario.rol === '0' ? <FaUserShield className="text-blue-600 text-xs" /> : <FaUser className="text-gray-600 text-xs" />}
                                                    <span className="rol-text">{getRoleName(usuario.rol)}</span>
                                                </div>
                                            </td>
                                            <td>{getEstadoBadge(usuario.estado)}</td>
                                            <td>
                                                <div className="acciones-cell">
                                                    {usuario.estado === '2' && (
                                                        <Button
                                                            size="sm"
                                                            className="aprobar-btn"
                                                            onClick={() => handleAprobarUsuario(usuario.idUsuario)}
                                                            title="Aprobar"
                                                        >
                                                            <FaCheck className="btn-icon" />
                                                        </Button>
                                                    )}

                                                    {usuario.estado === '1' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="suspender-btn"
                                                            onClick={() => handleSuspenderUsuario(usuario.idUsuario)}
                                                            title="Suspender"
                                                        >
                                                            <FaTimes className="btn-icon" />
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="edit-btn"
                                                        onClick={() => openEditModal(usuario)}
                                                        title="Editar"
                                                    >
                                                        <FaEdit className="btn-icon" />
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="delete-btn"
                                                        onClick={() => openConfirmDeleteModal(usuario.idUsuario)}
                                                        title="Eliminar"
                                                    >
                                                        <FaTrash className="btn-icon" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista de cards para pantallas pequeñas y móviles */}
                        <div className="usuarios-cards">
                            {filteredUsuarios.map((usuario) => (
                                <div key={usuario.idUsuario} className="usuario-card">
                                    <div className="usuario-card-header">
                                        <div className="usuario-card-nombre">
                                            <h3>{`${usuario.nombre} ${usuario.apellidos}`}</h3>
                                            <span className="usuario-card-id">ID: {usuario.idUsuario.toString().padStart(3, '0')}</span>
                                        </div>
                                        {getEstadoBadge(usuario.estado)}
                                    </div>
                                    <div className="usuario-card-body">
                                        <div className="usuario-card-info">
                                            <div className="usuario-card-info-item">
                                                <span className="usuario-card-label">Email:</span>
                                                <span className="usuario-card-value">{usuario.correo}</span>
                                            </div>
                                            <div className="usuario-card-info-item">
                                                <span className="usuario-card-label">Rol:</span>
                                                <div className="rol-cell">
                                                    {usuario.rol === '0' ? <FaUserShield className="text-blue-600 text-xs" /> : <FaUser className="text-gray-600 text-xs" />}
                                                    <span className="rol-text">{getRoleName(usuario.rol)}</span>
                                                </div>
                                            </div>
                                            <div className="usuario-card-info-item">
                                                <span className="usuario-card-label">Fecha:</span>
                                                <span className="usuario-card-value">{usuario.created_at}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="usuario-card-acciones">
                                        {usuario.estado === '2' && (
                                            <Button
                                                size="sm"
                                                className="aprobar-btn"
                                                onClick={() => handleAprobarUsuario(usuario.idUsuario)}
                                                title="Aprobar"
                                            >
                                                <FaCheck className="btn-icon" />
                                                <span className="btn-text">Aprobar</span>
                                            </Button>
                                        )}

                                        {usuario.estado === '1' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="suspender-btn"
                                                onClick={() => handleSuspenderUsuario(usuario.idUsuario)}
                                                title="Suspender"
                                            >
                                                <FaTimes className="btn-icon" />
                                                <span className="btn-text">Suspender</span>
                                            </Button>
                                        )}

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="edit-btn"
                                            onClick={() => openEditModal(usuario)}
                                            title="Editar"
                                        >
                                            <FaEdit className="btn-icon" />
                                            <span className="btn-text">Editar</span>
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="delete-btn"
                                            onClick={() => openConfirmDeleteModal(usuario.idUsuario)}
                                            title="Eliminar"
                                        >
                                            <FaTrash className="btn-icon" />
                                            <span className="btn-text">Eliminar</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredUsuarios.length === 0 && !loading && (
                            <div className="no-users">
                                <p>No se encontraron usuarios que coincidan con los criterios de búsqueda.</p>
                            </div>
                        )}
                    </div>

                    {/* Paginación */}
                    {pagination && pagination.total > 0 && (
                        <div className="px-3 sm:px-4 xl:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                                <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                                    Mostrando {pagination.from} a {pagination.to} de {pagination.total} resultados
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.current_page - 1)}
                                        disabled={pagination.current_page === 1 || loading}
                                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ← Anterior
                                    </button>
                                    <span className="text-xs sm:text-sm text-gray-700">
                                        Página {pagination.current_page} de {pagination.last_page}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(pagination.current_page + 1)}
                                        disabled={pagination.current_page === pagination.last_page || loading}
                                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Modal de Edición */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar Usuario</DialogTitle>
                            <DialogDescription>
                                Modifica los datos del usuario
                            </DialogDescription>
                        </DialogHeader>
                        <div className="form-grid">
                            <div>
                                <Label htmlFor="edit-nombre">Nombre</Label>
                                <Input
                                    id="edit-nombre"
                                    value={formData.nombre}
                                    onChange={(e) => handleFormChange('nombre', e.target.value)}
                                    placeholder="Nombre del usuario"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-apellidos">Apellidos</Label>
                                <Input
                                    id="edit-apellidos"
                                    value={formData.apellidos}
                                    onChange={(e) => handleFormChange('apellidos', e.target.value)}
                                    placeholder="Apellidos del usuario"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-correo">Correo</Label>
                                <Input
                                    id="edit-correo"
                                    type="email"
                                    value={formData.correo}
                                    onChange={(e) => handleFormChange('correo', e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-password">Contraseña (dejar vacío para mantener la actual)</Label>
                                <Input
                                    id="edit-password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => handleFormChange('password', e.target.value)}
                                    placeholder="Nueva contraseña"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-rol">Rol</Label>
                                <Select value={formData.rol} onValueChange={(value) => handleFormChange('rol', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Administrador</SelectItem>
                                        <SelectItem value="1">Docente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="edit-estado">Estado</Label>
                                <Select value={formData.estado} onValueChange={(value) => handleFormChange('estado', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Activo</SelectItem>
                                        <SelectItem value="0">Inactivo</SelectItem>
                                        <SelectItem value="2">Pendiente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleActualizarUsuario}>
                                Actualizar Usuario
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* 8. Nuevo Modal de Confirmación para Eliminar */}
                <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirmar Eliminación</DialogTitle>
                            <DialogDescription>
                                ¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="destructive" onClick={handleEliminarUsuario}>
                                Sí, eliminar usuario
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
    );
};

export default Usuarios;
