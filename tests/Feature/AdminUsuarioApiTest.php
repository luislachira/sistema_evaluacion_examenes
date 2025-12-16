<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;

class AdminUsuarioApiTest extends TestCase
{
    use DatabaseTransactions;

    #[Test]
    public function administrador_puede_listar_usuarios()
    {
        $admin = $this->crearAdmin();
        $this->crearDocente(['nombre' => 'Juan', 'apellidos' => 'Pérez']);
        $this->crearDocente(['nombre' => 'María', 'apellidos' => 'García']);

        $response = $this->autenticado($admin, 'GET', '/api/v1/admin/usuarios');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'current_page',
                'total',
                'per_page',
            ]);

        $this->assertGreaterThanOrEqual(2, $response->json('total'));
    }

    #[Test]
    public function administrador_puede_filtrar_usuarios_por_estado()
    {
        $admin = $this->crearAdmin();
        $this->crearDocente(['estado' => Usuario::ESTADO_ACTIVO]);
        $this->crearDocente(['estado' => Usuario::ESTADO_PENDIENTE]);

        $response = $this->autenticado($admin, 'GET', '/api/v1/admin/usuarios?estado=1');

        $response->assertStatus(200);
        $data = $response->json('data');
        foreach ($data as $usuario) {
            $this->assertEquals('1', $usuario['estado']);
        }
    }

    #[Test]
    public function administrador_puede_buscar_usuarios_por_nombre()
    {
        $admin = $this->crearAdmin();
        $this->crearDocente(['nombre' => 'Juan', 'apellidos' => 'Pérez']);
        $this->crearDocente(['nombre' => 'María', 'apellidos' => 'García']);

        $response = $this->autenticado($admin, 'GET', '/api/v1/admin/usuarios?search=Juan');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertGreaterThan(0, count($data));
        $this->assertStringContainsString('Juan', $data[0]['nombre']);
    }

    #[Test]
    public function administrador_puede_crear_usuario()
    {
        $admin = $this->crearAdmin();

        $datos = [
            'nombre' => 'Nuevo',
            'apellidos' => 'Usuario',
            'correo' => 'nuevo@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'rol' => Usuario::ROL_DOCENTE,
            'estado' => Usuario::ESTADO_ACTIVO,
        ];

        $response = $this->autenticado($admin, 'POST', '/api/v1/admin/usuarios', $datos);

        $response->assertStatus(201);
        $this->assertDatabaseHas('usuarios', [
            'correo' => 'nuevo@example.com',
            'nombre' => 'Nuevo',
        ]);
    }

    #[Test]
    public function administrador_puede_aprobar_usuario()
    {
        $admin = $this->crearAdmin();
        $usuario = $this->crearDocente(['estado' => Usuario::ESTADO_PENDIENTE]);

        $response = $this->autenticado($admin, 'PATCH', "/api/v1/admin/usuarios/{$usuario->idUsuario}/approve");

        $response->assertStatus(200);
        $this->assertDatabaseHas('usuarios', [
            'idUsuario' => $usuario->idUsuario,
            'estado' => Usuario::ESTADO_ACTIVO,
        ]);
    }

    #[Test]
    public function administrador_puede_suspender_usuario()
    {
        $admin = $this->crearAdmin();
        $usuario = $this->crearDocente(['estado' => Usuario::ESTADO_ACTIVO]);

        $response = $this->autenticado($admin, 'PATCH', "/api/v1/admin/usuarios/{$usuario->idUsuario}/suspend");

        $response->assertStatus(200);
        $this->assertDatabaseHas('usuarios', [
            'idUsuario' => $usuario->idUsuario,
            'estado' => Usuario::ESTADO_SUSPENDIDO,
        ]);
    }

    #[Test]
    public function docente_no_puede_acceder_a_rutas_de_administrador()
    {
        $docente = $this->crearDocente();

        $response = $this->autenticado($docente, 'GET', '/api/v1/admin/usuarios');

        $response->assertStatus(403);
    }
}
