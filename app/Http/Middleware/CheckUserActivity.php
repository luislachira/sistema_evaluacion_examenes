<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\Response;

class CheckUserActivity
{
    /**
     * Tiempo de inactividad permitido en minutos
     */
    const INACTIVITY_TIMEOUT_MINUTES = 60;

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            // Solo verificar si el usuario está autenticado
            if (!$request->user()) {
                return $next($request);
            }

            // Obtener el token ID del request
            $tokenId = $request->user()->token()->id ?? null;

            if (!$tokenId) {
                return $next($request);
            }

            // Obtener la última actividad del token desde la base de datos
            // Usar explícitamente la conexión MySQL
            $tokenRecord = DB::connection('mysql')->table('oauth_access_tokens')
                ->where('id', $tokenId)
                ->where('revoked', false)
                ->first();

            if (!$tokenRecord) {
                return $next($request);
            }

            // Usar updated_at como última actividad, o created_at si updated_at es null
            $lastActivity = $tokenRecord->updated_at
                ? Carbon::parse($tokenRecord->updated_at)
                : Carbon::parse($tokenRecord->created_at);

            // Calcular el tiempo transcurrido desde la última actividad (siempre positivo)
            // Usar timestamp para cálculo más preciso
            $now = Carbon::now();

            // Asegurar que ambas fechas estén en la misma zona horaria
            $lastActivity->setTimezone($now->timezone);

            // Calcular diferencia usando timestamps
            if ($lastActivity->gt($now)) {
                // Error: lastActivity está en el futuro, asumimos que no ha pasado tiempo
                $secondsSinceLastActivity = 0;
            } else {
                // lastActivity está en el pasado, calcular diferencia correctamente
                $secondsSinceLastActivity = $now->timestamp - $lastActivity->timestamp;
            }

            // Asegurar que no sea negativo
            $secondsSinceLastActivity = max(0, $secondsSinceLastActivity);
            $minutesSinceLastActivity = $secondsSinceLastActivity / 60;

            // Log para debugging (solo en desarrollo)
            if (config('app.debug')) {
                Log::debug('CheckUserActivity - Verificando inactividad', [
                    'token_id' => $tokenId,
                    'last_activity' => $lastActivity->toDateTimeString(),
                    'minutes_since' => $minutesSinceLastActivity,
                    'seconds_since' => $secondsSinceLastActivity,
                    'timeout_minutes' => self::INACTIVITY_TIMEOUT_MINUTES,
                    'should_revoke' => $minutesSinceLastActivity >= self::INACTIVITY_TIMEOUT_MINUTES
                ]);
            }

            // Si ha pasado más del tiempo permitido, revocar el token
            if ($minutesSinceLastActivity >= self::INACTIVITY_TIMEOUT_MINUTES) {
                // Revocar el token usando explícitamente la conexión MySQL
                DB::connection('mysql')->table('oauth_access_tokens')
                    ->where('id', $tokenId)
                    ->update(['revoked' => true]);

                Log::info('Token revocado por inactividad', [
                    'token_id' => $tokenId,
                    'minutes_since_last_activity' => $minutesSinceLastActivity
                ]);

                return response()->json([
                    'message' => 'Su sesión ha expirado por inactividad. Por favor, inicie sesión nuevamente.',
                    'expired' => true,
                    'inactivity_timeout' => self::INACTIVITY_TIMEOUT_MINUTES
                ], 401);
            }

            // Actualizar la última actividad del token SOLO si la petición NO es para verificar el estado
            // Esto evita que las verificaciones periódicas reseteen el contador
            $path = $request->path();
            $fullUrl = $request->fullUrl();
            $isActivityStatusCheck = str_contains($path, 'user/activity-status') || str_contains($fullUrl, 'user/activity-status');

            if (!$isActivityStatusCheck) {
                // Actualizar usando explícitamente la conexión MySQL
                DB::connection('mysql')->table('oauth_access_tokens')
                    ->where('id', $tokenId)
                    ->update(['updated_at' => Carbon::now()]);

                // Log para debugging
                if (config('app.debug')) {
                    Log::debug('CheckUserActivity - Actualizando actividad', [
                        'path' => $path,
                        'is_activity_status_check' => $isActivityStatusCheck,
                    ]);
                }
            } else {
                // Log para debugging
                if (config('app.debug')) {
                    Log::debug('CheckUserActivity - NO actualizando actividad (es verificación de estado)', [
                        'path' => $path,
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Si hay un error (por ejemplo, problema con la base de datos o configuración),
            // registrar el error pero permitir que la solicitud continúe
            Log::error('Error en CheckUserActivity middleware: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);
            // Continuar con la solicitud sin verificar la actividad
        }

        return $next($request);
    }
}

