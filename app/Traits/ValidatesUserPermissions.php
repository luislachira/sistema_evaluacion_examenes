<?php

namespace App\Traits;

use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * Trait para centralizar validaciones de permisos de usuario
 * Proporciona métodos reutilizables para validar roles y estados de usuario
 */
trait ValidatesUserPermissions
{
    /**
     * Valida que el usuario autenticado tenga el rol especificado
     *
     * @param string $requiredRole El rol requerido ('0' para Admin, '1' para Docente)
     * @param Usuario|null $user El usuario a validar (por defecto usa el autenticado)
     * @return bool|JsonResponse true si tiene el rol, JsonResponse con error si no
     */
    protected function validateRole(string $requiredRole, ?Usuario $user = null): bool|JsonResponse
    {
        $user = $user ?? Auth::user();

        if (!$user || !($user instanceof Usuario)) {
            return response()->json([
                'message' => 'Usuario no autenticado',
                'error' => 'unauthenticated'
            ], 401);
        }

        if ($user->rol !== $requiredRole) {
            $roleName = $requiredRole === Usuario::ROL_ADMINISTRADOR ? 'Administrador' : 'Docente';
            $userRoleName = ($user->rol === Usuario::ROL_ADMINISTRADOR) ? 'Administrador' : 'Docente';

            return response()->json([
                'message' => "Acceso denegado. Esta operación requiere permisos de {$roleName}. Su rol actual es: {$userRoleName}.",
                'error' => 'insufficient_permissions',
                'required_role' => $requiredRole,
                'user_role' => $user->rol
            ], 403);
        }

        return true;
    }

    /**
     * Valida que el usuario esté activo
     *
     * @param Usuario|null $user El usuario a validar (por defecto usa el autenticado)
     * @return bool|JsonResponse true si está activo, JsonResponse con error si no
     */
    protected function validateUserActive(?Usuario $user = null): bool|JsonResponse
    {
        $user = $user ?? Auth::user();

        if (!$user || !($user instanceof Usuario)) {
            return response()->json([
                'message' => 'Usuario no autenticado',
                'error' => 'unauthenticated'
            ], 401);
        }

        // Los administradores siempre pueden acceder
        if ($user->rol === Usuario::ROL_ADMINISTRADOR) {
            return true;
        }

        if ($user->estado !== Usuario::ESTADO_ACTIVO) {
            $estadoName = match ($user->estado) {
                Usuario::ESTADO_PENDIENTE => 'pendiente de aprobación',
                Usuario::ESTADO_SUSPENDIDO => 'suspendido',
                default => 'inactivo'
            };

            return response()->json([
                'message' => "Su cuenta está {$estadoName}. Contacte al administrador para más información.",
                'error' => 'account_inactive',
                'estado' => $user->estado
            ], 403);
        }

        return true;
    }

    /**
     * Valida que el usuario sea el propietario del recurso
     *
     * @param int $resourceUserId El ID del usuario propietario del recurso
     * @param Usuario|null $user El usuario a validar (por defecto usa el autenticado)
     * @return bool|JsonResponse true si es el propietario, JsonResponse con error si no
     */
    protected function validateOwnership(int $resourceUserId, ?Usuario $user = null): bool|JsonResponse
    {
        $user = $user ?? Auth::user();

        if (!$user || !($user instanceof Usuario)) {
            return response()->json([
                'message' => 'Usuario no autenticado',
                'error' => 'unauthenticated'
            ], 401);
        }

        // Los administradores pueden acceder a cualquier recurso
        if ($user->rol === Usuario::ROL_ADMINISTRADOR) {
            return true;
        }

        if ($user->idUsuario !== $resourceUserId) {
            return response()->json([
                'message' => 'No tienes permiso para acceder a este recurso',
                'error' => 'forbidden'
            ], 403);
        }

        return true;
    }

    /**
     * Valida rol y estado activo en una sola llamada
     *
     * @param string $requiredRole El rol requerido
     * @param Usuario|null $user El usuario a validar
     * @return bool|JsonResponse true si pasa todas las validaciones
     */
    protected function validateRoleAndActive(string $requiredRole, ?Usuario $user = null): bool|JsonResponse
    {
        $roleValidation = $this->validateRole($requiredRole, $user);
        if ($roleValidation !== true) {
            return $roleValidation;
        }

        $activeValidation = $this->validateUserActive($user);
        if ($activeValidation !== true) {
            return $activeValidation;
        }

        return true;
    }
}
