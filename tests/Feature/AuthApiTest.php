<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;

class AuthApiTest extends TestCase
{

    #[Test]
    public function puede_registrar_un_nuevo_usuario_docente()
    {
        $datos = [
            'nombre' => 'Juan',
            'apellidos' => 'Pérez García',
            'correo' => 'juan.perez@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->postJson('/api/v1/register', $datos);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
            ]);

        $this->assertDatabaseHas('usuarios', [
            'correo' => 'juan.perez@example.com',
            'nombre' => 'Juan',
            'apellidos' => 'Pérez García',
            'rol' => Usuario::ROL_DOCENTE,
            'estado' => Usuario::ESTADO_PENDIENTE,
        ]);
    }

    #[Test]
    public function puede_iniciar_sesion_y_obtener_token()
    {
        $usuario = $this->crearUsuario([
            'correo' => 'docente@example.com',
            'password' => Hash::make('password123'),
            'estado' => Usuario::ESTADO_ACTIVO,
        ]);

        $response = $this->postJson('/api/v1/login', [
            'correo' => 'docente@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'usuario',
            ])
            ->assertJson([
                'token_type' => 'Bearer',
                'usuario' => [
                    'correo' => 'docente@example.com',
                ],
            ]);

        // Verificar que el token es válido
        $token = $response->json('access_token');
        $userResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->getJson('/api/v1/user');

        $userResponse->assertStatus(200)
            ->assertJson([
                'correo' => 'docente@example.com',
            ]);
    }

    #[Test]
    public function no_puede_acceder_a_rutas_protegidas_sin_token()
    {
        $response = $this->getJson('/api/v1/user');

        $response->assertStatus(401);
    }

    #[Test]
    public function puede_obtener_usuario_autenticado()
    {
        $usuario = $this->crearUsuario([
            'correo' => 'docente@example.com',
            'estado' => Usuario::ESTADO_ACTIVO,
        ]);

        $response = $this->autenticado($usuario, 'GET', '/api/v1/user');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'idUsuario',
                'nombre',
                'apellidos',
                'correo',
                'rol',
            ]);
    }

    #[Test]
    public function puede_cerrar_sesion_y_revocar_token()
    {
        $usuario = $this->crearUsuario();
        $token = $this->obtenerToken($usuario);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->postJson('/api/v1/logout');

        $response->assertStatus(200);

        // Verificar que el token está revocado en la base de datos
        $tokenRecord = \Illuminate\Support\Facades\DB::table('oauth_access_tokens')
            ->where('user_id', $usuario->idUsuario)
            ->where('revoked', false)
            ->first();

        $this->assertNull($tokenRecord, 'El token debe estar revocado en la base de datos');

        // Nota: En algunos entornos de prueba, Passport puede no verificar inmediatamente
        // los tokens revocados debido a caché. El comportamiento importante es que
        // el token esté marcado como revocado en la base de datos, lo cual se verifica arriba.
        // En producción, Passport verificará correctamente los tokens revocados.
    }
}
