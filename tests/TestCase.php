<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase, WithFaker;

    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Forzar reconexión con la BD de pruebas
        // Esto asegura que usamos las variables de phpunit.xml, no la caché
        $testDatabase = getenv('DB_DATABASE') ?: 'examen_ascenso_test';
        config(['database.connections.mysql.database' => $testDatabase]);
        DB::purge('mysql');
        DB::reconnect('mysql');

        // Verificar que estamos usando la base de datos de pruebas
        $currentDatabase = DB::getDatabaseName();
        $expectedDatabase = $testDatabase;

        if ($currentDatabase !== $expectedDatabase && $currentDatabase !== 'examen_ascenso_test') {
            throw new \Exception(
                "ERROR: Los tests están usando la base de datos '{$currentDatabase}' " .
                    "en lugar de la base de datos de pruebas '{$expectedDatabase}'. " .
                    "Verifica la configuración en phpunit.xml. " .
                    "Solución: Ejecuta 'php artisan config:clear' antes de los tests."
            );
        }

        // Resetear el generador único de Faker para evitar duplicados entre tests
        fake()->unique(true);

        // Corregir permisos de claves OAuth en CI/Linux
        if (file_exists(storage_path('oauth-private.key'))) {
            @chmod(storage_path('oauth-private.key'), 0600);
        }
        if (file_exists(storage_path('oauth-public.key'))) {
            @chmod(storage_path('oauth-public.key'), 0600);
        }

        // Configurar Passport para pruebas
        $this->setupPassport();
    }

    /**
     * Configurar Laravel Passport para pruebas
     */
    protected function setupPassport(): void
    {
        // En Passport v13+, los clientes se identifican por grant_types (JSON)
        
        // Asegurar que las tablas existen (fallback para CI)
        if (!\Illuminate\Support\Facades\Schema::hasTable('oauth_clients')) {
            Artisan::call('migrate');
        }

        // Verificar si existe un cliente de acceso personal
        $personalAccessClient = DB::table('oauth_clients')
            ->where('grant_types', 'like', '%personal_access%')
            ->first();

        if (!$personalAccessClient) {
            // Crear el cliente de acceso personal manualmente
            DB::table('oauth_clients')->insert([
                'id' => Str::uuid()->toString(),
                'name' => 'Personal Access Client',
                'secret' => Str::random(40),
                'provider' => 'users',
                'redirect_uris' => json_encode([]),
                'grant_types' => json_encode(['personal_access']),
                'revoked' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Crea un usuario de prueba
     */
    protected function crearUsuario(array $attributes = []): \App\Models\Usuario
    {
        return \App\Models\Usuario::factory()->create($attributes);
    }

    /**
     * Crea un usuario administrador de prueba
     */
    protected function crearAdmin(array $attributes = []): \App\Models\Usuario
    {
        return $this->crearUsuario(array_merge([
            'rol' => \App\Models\Usuario::ROL_ADMINISTRADOR,
            'estado' => \App\Models\Usuario::ESTADO_ACTIVO,
        ], $attributes));
    }

    /**
     * Crea un usuario docente de prueba
     */
    protected function crearDocente(array $attributes = []): \App\Models\Usuario
    {
        return $this->crearUsuario(array_merge([
            'rol' => \App\Models\Usuario::ROL_DOCENTE,
            'estado' => \App\Models\Usuario::ESTADO_ACTIVO,
        ], $attributes));
    }

    /**
     * Obtiene un token de autenticación para un usuario
     */
    protected function obtenerToken(\App\Models\Usuario $usuario): string
    {
        $tokenResult = $usuario->createToken('Test Token');
        return $tokenResult->accessToken;
    }

    /**
     * Realiza una petición autenticada
     */
    protected function autenticado(\App\Models\Usuario $usuario, string $method, string $uri, array $data = [], array $headers = [])
    {
        $token = $this->obtenerToken($usuario);
        return $this->withHeaders(array_merge([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ], $headers))->json($method, $uri, $data);
    }
}
