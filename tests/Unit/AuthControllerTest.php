<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;

class AuthControllerTest extends TestCase
{

    #[Test]
    public function puede_registrar_un_nuevo_usuario()
    {
        $datos = [
            'nombre' => 'Juan',
            'apellidos' => 'Pérez',
            'correo' => 'juan@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->postJson('/api/v1/register', $datos);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Registro exitoso. Su cuenta está pendiente de aprobación por un administrador.'
            ]);

        $this->assertDatabaseHas('usuarios', [
            'correo' => 'juan@example.com',
            'rol' => Usuario::ROL_DOCENTE,
            'estado' => Usuario::ESTADO_PENDIENTE,
        ]);
    }

    #[Test]
    public function no_puede_registrar_usuario_con_correo_duplicado()
    {
        $usuario = $this->crearUsuario(['correo' => 'juan@example.com']);

        $datos = [
            'nombre' => 'Juan',
            'apellidos' => 'Pérez',
            'correo' => 'juan@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->postJson('/api/v1/register', $datos);

        $response->assertStatus(422);
    }

    #[Test]
    public function puede_iniciar_sesion_con_credenciales_validas()
    {
        $usuario = $this->crearUsuario([
            'correo' => 'juan@example.com',
            'password' => Hash::make('password123'),
            'estado' => Usuario::ESTADO_ACTIVO,
        ]);

        $response = $this->postJson('/api/v1/login', [
            'correo' => 'juan@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'usuario' => [
                    'idUsuario',
                    'nombre',
                    'apellidos',
                    'correo',
                    'rol',
                ],
            ]);

        $this->assertEquals('Bearer', $response->json('token_type'));
    }

    #[Test]
    public function no_puede_iniciar_sesion_con_credenciales_invalidas()
    {
        $usuario = $this->crearUsuario([
            'correo' => 'juan@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/v1/login', [
            'correo' => 'juan@example.com',
            'password' => 'password_incorrecta',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['correo']);
    }

    #[Test]
    public function no_puede_iniciar_sesion_con_usuario_pendiente()
    {
        $usuario = $this->crearUsuario([
            'correo' => 'juan@example.com',
            'password' => Hash::make('password123'),
            'estado' => Usuario::ESTADO_PENDIENTE,
        ]);

        $response = $this->postJson('/api/v1/login', [
            'correo' => 'juan@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Su cuenta está pendiente de aprobación.'
            ]);
    }

    #[Test]
    public function puede_cerrar_sesion()
    {
        $usuario = $this->crearUsuario();
        $token = $this->obtenerToken($usuario);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->postJson('/api/v1/logout');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Sesión cerrada exitosamente'
            ]);
    }
}
