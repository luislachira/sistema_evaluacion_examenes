<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Verificar que el archivo .env existe y es legible antes de inicializar Laravel
$envPath = __DIR__.'/../.env';
if (!file_exists($envPath) || !is_readable($envPath)) {
    http_response_code(500);
    die('Error: El archivo .env no existe o no es legible. Por favor, verifica los permisos del archivo.');
}

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

// Verificar que la clave de aplicación esté configurada antes de manejar la petición
// Usar env() directamente ya que config() requiere que Laravel esté completamente inicializado
$appKey = env('APP_KEY');
if (empty($appKey)) {
    // Intentar leer directamente del archivo .env como fallback
    $envContent = file_get_contents($envPath);
    if (!preg_match('/^APP_KEY=(.+)$/m', $envContent, $matches)) {
        http_response_code(500);
        die('Error: La clave de aplicación no está configurada. Por favor, ejecuta: php artisan key:generate');
    }
}

$app->handleRequest(Request::capture());
