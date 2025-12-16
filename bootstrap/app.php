<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            \App\Http\Middleware\TrustProxies::class,
            HandleAppearance::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Excluir CSRF para rutas API
        $middleware->validateCsrfTokens(except: [
            'api/*'
        ]);

        // Agregar CORS middleware a todas las rutas API
        $middleware->api(prepend: [
            \App\Http\Middleware\CorsMiddleware::class,
        ]);

        // Middleware para actualizar estados de exámenes automáticamente
        // Se ejecuta en cada request pero usa cache para limitar la frecuencia (una vez por minuto)
        $middleware->web(append: [
            \App\Http\Middleware\ActualizarEstadosExamenesMiddleware::class,
        ]);
        $middleware->api(append: [
            \App\Http\Middleware\ActualizarEstadosExamenesMiddleware::class,
        ]);

        // Middleware para verificar inactividad del usuario
        // Se ejecuta después de auth:api para verificar la última actividad
        $middleware->api(append: [
            \App\Http\Middleware\CheckUserActivity::class,
        ]);

        // Registra tu middleware como alias (para poder usarlo en rutas)
        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'cors' => \App\Http\Middleware\CorsMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
