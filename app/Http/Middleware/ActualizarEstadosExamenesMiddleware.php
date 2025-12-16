<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Models\Examen;
use Symfony\Component\HttpFoundation\Response;

class ActualizarEstadosExamenesMiddleware
{
    /**
     * Handle an incoming request.
     *
     * Este middleware verifica y actualiza los estados de los exámenes automáticamente
     * cada minuto usando cache para evitar ejecutar la verificación en cada request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Usar cache para ejecutar la verificación solo una vez por minuto
        // Esto evita sobrecargar el sistema ejecutando la verificación en cada request
        $cacheKey = 'examenes_actualizar_estados_ultima_ejecucion';
        $ultimaEjecucion = Cache::get($cacheKey);
        $ahora = now()->timestamp;

        // Si no se ha ejecutado en el último minuto, ejecutar la verificación
        if (!$ultimaEjecucion || ($ahora - $ultimaEjecucion) >= 60) {
            // Ejecutar la actualización de estados
            Examen::actualizarEstadosAutomaticamente();

            // Guardar en cache la hora de ejecución (válido por 2 minutos)
            Cache::put($cacheKey, $ahora, 120);
        }

        return $next($request);
    }
}

