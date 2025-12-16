<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Este archivo es para rutas que retornan vistas HTML y usan sesiones web.
| Para una aplicación que funciona principalmente como una API, este archivo
| usualmente se mantiene simple.
|
*/

// Ruta necesaria para el sistema de password reset de Laravel
// Esta ruta se usa para generar los enlaces en los emails de recuperación
Route::get('/reset-password/{token}', function (string $token) {
    // Redirigir al frontend de React con los parámetros necesarios
    $email = request('email');
    $frontendUrl = config('app.frontend_url', config('app.url'));
    
    return redirect($frontendUrl . '/reset-password?' . http_build_query([
        'token' => $token,
        'email' => $email
    ]));
})->middleware('guest')->name('password.reset');

// Ruta catch-all para React Router (debe ir al final)
// Excluye las rutas de API para que no interfieran
Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!api).*');
