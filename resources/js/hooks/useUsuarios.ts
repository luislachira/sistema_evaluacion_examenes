import { useState, useEffect } from 'react';
import clienteApi from '../api/clienteApi';

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
}

interface Usuario {
    idUsuario: number;
    nombre: string;
    apellidos: string;
    correo: string;
    rol: string;
    estado: string;
    created_at: string;
}

interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface UsuariosResponse {
    data: Usuario[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export const useUsuarios = () => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationData | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('todos');
    const [estadoFilter, setEstadoFilter] = useState('todos');

    const fetchUsuarios = async (page: number = 1, search: string = '', rol: string = 'todos', estado: string = 'todos') => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: '10'
            });
            
            if (search) {
                params.append('search', search);
            }
            if (rol !== 'todos') {
                params.append('rol', rol);
            }
            if (estado !== 'todos') {
                params.append('estado', estado);
            }

            const response = await clienteApi.get(`/admin/usuarios?${params.toString()}`);
            const data: UsuariosResponse = response.data;
            
            setUsuarios(data.data || []);
            setPagination({
                current_page: data.current_page,
                last_page: data.last_page,
                per_page: data.per_page,
                total: data.total,
                from: data.from,
                to: data.to
            });
            setCurrentPage(page);
        } catch (err: unknown) {
            const error = err as ApiError;
            setError(error.response?.data?.message || 'Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const aprobarUsuario = async (idUsuario: number) => {
        try {
            await clienteApi.patch(`/admin/usuarios/${idUsuario}/approve`);
            await fetchUsuarios(currentPage, searchTerm, roleFilter, estadoFilter);
            return { success: true };
        } catch (err: unknown) {
            const error = err as ApiError;
            return {
                success: false,
                error: error.response?.data?.message || 'Error al aprobar usuario'
            };
        }
    };

    const suspenderUsuario = async (idUsuario: number) => {
        try {
            await clienteApi.patch(`/admin/usuarios/${idUsuario}/suspend`);
            await fetchUsuarios(currentPage, searchTerm, roleFilter, estadoFilter);
            return { success: true };
        } catch (err: unknown) {
            const error = err as ApiError;
            return {
                success: false,
                error: error.response?.data?.message || 'Error al suspender usuario'
            };
        }
    };

    const eliminarUsuario = async (idUsuario: number) => {
        try {
            await clienteApi.delete(`/admin/usuarios/${idUsuario}`);
            // Si eliminamos el último usuario de la página y no es la primera, volver a la página anterior
            const newPage = usuarios.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
            await fetchUsuarios(newPage, searchTerm, roleFilter, estadoFilter);
            return { success: true };
        } catch (err: unknown) {
            const error = err as ApiError;
            return {
                success: false,
                error: error.response?.data?.message || 'Error al eliminar usuario'
            };
        }
    };

    const crearUsuario = async (userData: Omit<Usuario, 'idUsuario' | 'created_at'> & { password: string }) => {
        try {
            await clienteApi.post('/admin/usuarios', userData);
            // Ir a la primera página después de crear
            await fetchUsuarios(1, searchTerm, roleFilter, estadoFilter);
            return { success: true };
        } catch (err: unknown) {
            const error = err as ApiError;
            return {
                success: false,
                error: error.response?.data?.message || 'Error al crear usuario'
            };
        }
    };

    const actualizarUsuario = async (idUsuario: number, userData: Partial<Usuario & { password?: string }>) => {
        try {
            const updateData = { ...userData };
            if (!updateData.password) {
                delete updateData.password;
            }

            await clienteApi.put(`/admin/usuarios/${idUsuario}`, updateData);
            await fetchUsuarios(currentPage, searchTerm, roleFilter, estadoFilter);
            return { success: true };
        } catch (err: unknown) {
            const error = err as ApiError;
            return {
                success: false,
                error: error.response?.data?.message || 'Error al actualizar usuario'
            };
        }
    };

    useEffect(() => {
        fetchUsuarios(1, searchTerm, roleFilter, estadoFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Solo ejecutar una vez al montar el componente

    return {
        usuarios,
        loading,
        error,
        pagination,
        currentPage,
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
    };
};
