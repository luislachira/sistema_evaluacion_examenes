<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Usuario;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->user()->rol === Usuario::ROL_ADMINISTRADOR) {
            return $next($request);
        }

        return response()->json(['message' => 'Acceso no autorizado.'], 403);
    }
}
