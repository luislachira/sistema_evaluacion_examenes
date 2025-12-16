<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Usuario;

/**
 * Middleware para asegurar que el usuario esté activo antes de acceder a rutas protegidas.
 * Este middleware complementa RoleMiddleware y puede usarse en rutas que requieren
 * usuarios activos independientemente del rol.
 */
class EnsureUserActive
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Verificar que el usuario esté autenticado
        if (!$request->user()) {
            return response()->json([
                'message' => 'No autenticado. Por favor, inicia sesión.',
                'error' => 'unauthenticated'
            ], 401);
        }

        $user = $request->user();

        // Los administradores siempre pueden acceder (incluso si están suspendidos)
        // para evitar bloqueos completos del sistema
        if ($user->esAdmin()) {
            return $next($request);
        }

        // Verificar que el usuario esté activo
        if (!$user->isActivo()) {
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

        return $next($request);
    }
}
