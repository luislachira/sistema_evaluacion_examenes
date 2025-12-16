<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;
use App\Providers\UsuarioUserProvider;
use SocialiteProviders\Manager\SocialiteWasCalled;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        // Forzar HTTPS en producción o cuando APP_URL use HTTPS
        if (config('app.env') === 'production' || str_starts_with(config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }

        // Registrar el proveedor de Microsoft para Socialite
        Event::listen(function (SocialiteWasCalled $event) {
            $event->extendSocialite('microsoft', \SocialiteProviders\Microsoft\Provider::class);
        });

        // Registrar el provider personalizado para usuarios
        Auth::provider('usuario_eloquent', function ($app, array $config) {
            return new UsuarioUserProvider($app['hash'], $config['model']);
        });

        // NOTA: El scheduler ha sido removido porque ahora la actualización de estados
        // se maneja automáticamente mediante:
        // 1. El middleware ActualizarEstadosExamenesMiddleware (se ejecuta en cada request)
        // 2. El evento retrieved en el modelo Examen (se ejecuta al consultar un examen)
        // Esto elimina la necesidad de configurar un cron job.
    }
}
