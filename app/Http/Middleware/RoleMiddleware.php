<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Usuario;

class RoleMiddleware
{
    /**
     * Maneja la verificación de rol del usuario autenticado.
     * 
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  $role  El rol requerido ('0' para Admin, '1' para Docente)
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        // Verificar que el usuario esté autenticado
        if (!$request->user()) {
            return response()->json([
                'message' => 'No autenticado. Por favor, inicia sesión.',
                'error' => 'unauthenticated'
            ], 401);
        }

        $user = $request->user();

        // Verificar que el usuario esté activo (excepto para administradores que siempre pueden acceder)
        if (!$user->esAdmin() && !$user->isActivo()) {
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

        // Verificar que el rol del usuario coincida con el requerido
        if ($user->rol !== $role) {
            $roleName = $role === Usuario::ROL_ADMINISTRADOR ? 'Administrador' : 'Docente';
            $userRoleName = $user->esAdmin() ? 'Administrador' : 'Docente';

            return response()->json([
                'message' => "Acceso denegado. Esta ruta requiere permisos de {$roleName}. Su rol actual es: {$userRoleName}.",
                'error' => 'insufficient_permissions',
                'required_role' => $role,
                'user_role' => $user->rol
            ], 403);
        }

        // Si todo está correcto, continuar con la petición
        return $next($request);
    }
}
