<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\AbstractProvider;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;


class OAuthController extends Controller
{
    /**
     * Redirige al usuario al proveedor OAuth (Google o Microsoft)
     */
    public function redirect(string $provider)
    {
        // Validar que el proveedor sea soportado
        if (!in_array($provider, ['google', 'microsoft'])) {
            return response()->json(['message' => 'Proveedor OAuth no soportado'], 400);
        }

        try {
            // Obtener la URL base de la aplicación (usar dominio público, no IP privada)
            $appUrl = config('app.url');

            // Si APP_URL contiene una IP privada, usar el dominio configurado
            if (
                preg_match('/\b192\.168\.\d+\.\d+\b/', $appUrl) ||
                preg_match('/\b10\.\d+\.\d+\.\d+\b/', $appUrl) ||
                preg_match('/\b172\.(1[6-9]|2\d|3[01])\.\d+\.\d+\b/', $appUrl)
            ) {
                // Usar el dominio público configurado o el dominio por defecto
                $appUrl = config('app.frontend_url', 'https://ldln.site');
            }

            // Construir la URL de callback completa
            $redirectUri = rtrim($appUrl, '/') . '/api/v1/oauth/callback/' . $provider;

            Log::info('Iniciando OAuth redirect', [
                'provider' => $provider,
                'redirect_uri' => $redirectUri,
                'app_url' => config('app.url')
            ]);

            // Establecer temporalmente la URL de redirect en la configuración
            Config::set("services.{$provider}.redirect", $redirectUri);

            // Configurar parámetros adicionales para forzar selección de cuenta
            // @phpstan-ignore-next-line - stateless() existe en la implementación concreta de Socialite
            $driver = Socialite::driver($provider)->stateless();

            // Para Google: Forzar que siempre muestre el selector de cuentas
            if ($provider === 'google') {
                $driver->with([
                    'prompt' => 'select_account', // Siempre mostrar selector de cuentas
                    'access_type' => 'online',
                ]);
            }

            // Para Microsoft: Similar comportamiento
            if ($provider === 'microsoft') {
                $driver->with([
                    'prompt' => 'select_account',
                ]);
            }

            return $driver->redirect();
        } catch (\Exception $e) {
            Log::error('Error al iniciar OAuth redirect', [
                'provider' => $provider,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error al iniciar autenticación OAuth',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Maneja el callback del proveedor OAuth
     */
    public function callback(string $provider, Request $request)
    {
        // Logging para debug
        Log::info('OAuth Callback recibido', [
            'provider' => $provider,
            'query_params' => $request->all(),
            'url' => $request->fullUrl()
        ]);

        // Validar que el proveedor sea soportado
        if (!in_array($provider, ['google', 'microsoft'])) {
            Log::error('Proveedor OAuth no soportado', ['provider' => $provider]);
            return response()->json(['message' => 'Proveedor OAuth no soportado'], 400);
        }

        try {
            // Obtener la URL base de la aplicación (usar dominio público, no IP privada)
            $appUrl = config('app.url');

            // Si APP_URL contiene una IP privada, usar el dominio configurado
            if (
                preg_match('/\b192\.168\.\d+\.\d+\b/', $appUrl) ||
                preg_match('/\b10\.\d+\.\d+\.\d+\b/', $appUrl) ||
                preg_match('/\b172\.(1[6-9]|2\d|3[01])\.\d+\.\d+\b/', $appUrl)
            ) {
                // Usar el dominio público configurado o el dominio por defecto
                $appUrl = config('app.frontend_url', 'https://ldln.site');
            }

            // Construir la URL de callback completa
            $redirectUri = rtrim($appUrl, '/') . '/api/v1/oauth/callback/' . $provider;

            // Establecer temporalmente la URL de redirect en la configuración
            Config::set("services.{$provider}.redirect", $redirectUri);

            // Configurar Guzzle para manejar certificados SSL
            $guzzleConfig = [];

            // Intentar usar el certificado CA bundle si está disponible
            $caBundle = ini_get('curl.cainfo') ?: ini_get('openssl.cafile');

            // Si no hay certificado CA configurado, deshabilitar verificación SSL
            // Esto es necesario en Windows donde PHP no viene con certificados CA
            if (empty($caBundle) || !file_exists($caBundle)) {
                $guzzleConfig['verify'] = false;
                Log::warning('Certificado CA no encontrado, deshabilitando verificación SSL para OAuth', [
                    'provider' => $provider,
                    'curl.cainfo' => ini_get('curl.cainfo'),
                    'openssl.cafile' => ini_get('openssl.cafile')
                ]);
            } else {
                $guzzleConfig['verify'] = $caBundle;
            }

            // Obtener información del usuario desde el proveedor OAuth
            // @phpstan-ignore-next-line - setHttpClient() y stateless() existen en la implementación concreta
            $socialUser = Socialite::driver($provider)
                ->setHttpClient(new \GuzzleHttp\Client($guzzleConfig))
                ->stateless()
                ->user();

            Log::info('Usuario OAuth obtenido', [
                'provider' => $provider,
                'email' => $socialUser->getEmail(),
                'name' => $socialUser->getName()
            ]);

            // Buscar o crear el usuario en nuestra base de datos
            $resultado = $this->findOrCreateUser($socialUser, $provider);
            $usuario = $resultado['usuario'];
            $esNuevo = $resultado['es_nuevo'];

            Log::info('Usuario encontrado/creado', [
                'usuario_id' => $usuario->idUsuario,
                'estado' => $usuario->estado,
                'es_nuevo' => $esNuevo
            ]);

            // CASO 1: Usuario SUSPENDIDO (bloqueado)
            if ($usuario->estado === Usuario::ESTADO_SUSPENDIDO) {
                Log::warning('Intento de acceso con cuenta suspendida', [
                    'usuario_id' => $usuario->idUsuario,
                    'correo' => $usuario->correo
                ]);
                return redirect(config('app.frontend_url', config('app.url')) . '/login?error=' . urlencode('Su cuenta ha sido suspendida. Contacte al administrador.'));
            }

            // CASO 2: Usuario PENDIENTE (esperando aprobación)
            if ($usuario->estado === Usuario::ESTADO_PENDIENTE) {
                Log::info('Usuario con cuenta pendiente', [
                    'usuario_id' => $usuario->idUsuario,
                    'es_nuevo' => $esNuevo
                ]);
                return redirect(config('app.frontend_url', config('app.url')) . '/oauth/callback?pending=true&email=' . urlencode($usuario->correo));
            }

            // CASO 3: Usuario ACTIVO (permitir acceso)
            if ($usuario->estado === Usuario::ESTADO_ACTIVO) {

                // Crear token de Passport para el usuario
                $token = $usuario->createToken('OAuth Token')->accessToken;

                Log::info('Login exitoso con OAuth', [
                    'usuario_id' => $usuario->idUsuario,
                    'correo' => $usuario->correo
                ]);

                // Redirigir al frontend con el token y datos del usuario
                $queryParams = http_build_query([
                    'token' => $token,
                    'user' => json_encode([
                        'idUsuario' => $usuario->idUsuario,
                        'nombre' => $usuario->nombre,
                        'apellidos' => $usuario->apellidos,
                        'correo' => $usuario->correo,
                        'rol' => $usuario->rol,
                    ])
                ]);

                return redirect(config('app.frontend_url', config('app.url')) . '/oauth/callback?' . $queryParams);
            }

            // CASO 4: Estado desconocido (error)
            Log::error('Usuario con estado desconocido', [
                'usuario_id' => $usuario->idUsuario,
                'estado' => $usuario->estado
            ]);
            return redirect(config('app.frontend_url', config('app.url')) . '/login?error=' . urlencode('Estado de cuenta inválido. Contacte al administrador.'));
        } catch (\Exception $e) {
            Log::error('Error en OAuth callback', [
                'provider' => $provider,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Redirigir al frontend con error
            return redirect(config('app.frontend_url', config('app.url')) . '/login?error=' . urlencode('Error al autenticar con ' . ucfirst($provider)));
        }
    }

    /**
     * Busca o crea un usuario basado en los datos de OAuth
     *
     * @return array ['usuario' => Usuario, 'es_nuevo' => bool]
     */
    private function findOrCreateUser($socialUser, string $provider)
    {
        // Buscar usuario por correo electrónico
        $usuario = Usuario::where('correo', $socialUser->getEmail())->first();

        if ($usuario) {
            // Usuario existe, retornarlo indicando que NO es nuevo
            Log::info('Usuario existente encontrado', [
                'usuario_id' => $usuario->idUsuario,
                'correo' => $usuario->correo,
                'estado' => $usuario->estado
            ]);
            return [
                'usuario' => $usuario,
                'es_nuevo' => false
            ];
        }

        // Extraer nombre y apellidos del nombre completo
        $nombreCompleto = $socialUser->getName();
        $partesNombre = explode(' ', $nombreCompleto, 2);
        $nombre = $partesNombre[0] ?? $nombreCompleto;
        $apellidos = $partesNombre[1] ?? '';

        // Crear nuevo usuario
        $usuario = Usuario::create([
            'nombre' => $nombre,
            'apellidos' => $apellidos,
            'correo' => $socialUser->getEmail(),
            'password' => Hash::make(Str::random(32)), // Contraseña aleatoria - no la usará
            'rol' => Usuario::ROL_DOCENTE, // Por defecto es docente
            'estado' => Usuario::ESTADO_PENDIENTE, // Debe ser aprobado por admin
        ]);

        Log::info('Nuevo usuario creado via OAuth', [
            'usuario_id' => $usuario->idUsuario,
            'correo' => $usuario->correo,
            'provider' => $provider
        ]);

        return [
            'usuario' => $usuario,
            'es_nuevo' => true
        ];
    }
}
