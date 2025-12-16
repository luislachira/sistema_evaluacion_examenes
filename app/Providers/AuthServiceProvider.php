<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Laravel\Passport\Passport;
use Carbon\Carbon;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
    ];

    public function register(): void
    {
        // Asegurar que APP_KEY esté disponible antes de que Passport intente usarlo
        // Esto se ejecuta en register() para que ocurra antes de que PassportServiceProvider se inicialice
        if (empty(env('APP_KEY'))) {
            // No podemos usar Log aquí porque aún no está disponible en register()
            error_log('APP_KEY no está disponible en AuthServiceProvider::register()');
        }
    }

    public function boot(): void
    {
        $this->registerPolicies();

        // Verificar que la clave de aplicación esté disponible antes de inicializar Passport
        // Esto previene errores intermitentes de "No application encryption key has been specified"
        if (empty(config('app.key'))) {
            Log::warning('APP_KEY no está disponible al inicializar AuthServiceProvider::boot()');
            return;
        }

        // --- Configuración de Laravel Passport ---
        // NOTA: En Passport v13+, las rutas se registran automáticamente.
        // Ya no es necesario llamar Passport::routes()

        try {
            // Definir la vida útil de los tokens.
            // Esto mejora la seguridad al hacer que los tokens expiren.

            // El token de acceso principal. Un buen valor es entre 1 y 24 horas.
            Passport::tokensExpireIn(Carbon::now()->addHours(8));

            // El refresh token permite obtener un nuevo access token sin volver a pedir la contraseña.
            // Debe tener una vida útil más larga.
            Passport::refreshTokensExpireIn(Carbon::now()->addDays(30));

            // Para tokens de acceso personal (no los usaremos en el flujo de contraseña, pero es bueno tenerlo).
            Passport::personalAccessTokensExpireIn(Carbon::now()->addMonths(6));
        } catch (\Exception $e) {
            Log::error('Error al inicializar Passport en AuthServiceProvider: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);
            // No lanzar la excepción para evitar que la aplicación falle completamente
        }

        // 3. (Opcional) Aquí podrías definir "scopes" o permisos si tu API los necesitara.
        // Por ejemplo, para dar permisos de solo lectura o de escritura.
        /*
        Passport::tokensCan([
            'read-exam' => 'Ver información de exámenes',
            'submit-exam' => 'Enviar resultados de un examen',
            'manage-users' => 'Administrar usuarios (solo para admins)',
        ]);
        */
    }
}
