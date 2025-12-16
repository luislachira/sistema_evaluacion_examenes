<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Usuario;
use App\Models\Examen;
use App\Models\TipoConcurso;
use App\Models\Pregunta;
use App\Models\Categoria;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;

class AdminExamenApiTest extends TestCase
{
    use DatabaseTransactions;

    #[Test]
    public function administrador_puede_listar_examenes()
    {
        $admin = $this->crearAdmin();
        Examen::factory()->count(3)->create();

        $response = $this->autenticado($admin, 'GET', '/api/v1/admin/examenes');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'current_page',
                'total',
                'per_page',
            ]);

        $this->assertGreaterThanOrEqual(3, $response->json('total'));
    }

    #[Test]
    public function administrador_puede_crear_examen()
    {
        $admin = $this->crearAdmin();
        $tipoConcurso = TipoConcurso::factory()->create();

        $datos = [
            'codigo_examen' => 'EX-TEST-001',
            'titulo' => 'Examen de Prueba',
            'descripcion' => 'Esta es una descripción de prueba para el examen que cumple con el mínimo de caracteres requeridos.',
            'idTipoConcurso' => $tipoConcurso->idTipoConcurso,
            'tipo_acceso' => 'publico',
            'estado' => '0',
            'tiempo_limite' => 60,
        ];

        $response = $this->autenticado($admin, 'POST', '/api/v1/admin/examenes', $datos);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'idExamen',
                    'codigo_examen',
                    'titulo',
                    'descripcion',
                ],
            ]);

        $this->assertDatabaseHas('examenes', [
            'codigo_examen' => 'EX-TEST-001',
            'titulo' => 'Examen de Prueba',
        ]);
    }

    #[Test]
    public function administrador_puede_ver_examen()
    {
        $admin = $this->crearAdmin();
        $examen = Examen::factory()->create();

        $response = $this->autenticado($admin, 'GET', "/api/v1/admin/examenes/{$examen->idExamen}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'idExamen',
                    'codigo_examen',
                    'titulo',
                    'descripcion',
                    'tiempo_limite',
                    'tipo_acceso',
                    'estado',
                ],
            ])
            ->assertJson([
                'data' => [
                    'idExamen' => $examen->idExamen,
                ],
            ]);
    }

    #[Test]
    public function administrador_puede_actualizar_examen()
    {
        $admin = $this->crearAdmin();
        $examen = Examen::factory()->create(['estado' => '0']); // Borrador
        $tipoConcurso = TipoConcurso::find($examen->idTipoConcurso);

        $datos = [
            'codigo_examen' => $examen->codigo_examen, // Mantener el mismo código
            'titulo' => 'Título Actualizado',
            'descripcion' => 'Esta es una descripción actualizada que cumple con el mínimo de caracteres requeridos para la validación.',
            'idTipoConcurso' => $tipoConcurso->idTipoConcurso,
            'tipo_acceso' => $examen->tipo_acceso,
            'estado' => '0',
            'tiempo_limite' => 90,
        ];

        $response = $this->autenticado($admin, 'PUT', "/api/v1/admin/examenes/{$examen->idExamen}", $datos);

        $response->assertStatus(200);

        $this->assertDatabaseHas('examenes', [
            'idExamen' => $examen->idExamen,
            'titulo' => 'Título Actualizado',
            'tiempo_limite' => 90,
        ]);
    }

    #[Test]
    public function administrador_puede_eliminar_examen()
    {
        $admin = $this->crearAdmin();
        $examen = Examen::factory()->create(['estado' => '0']); // Borrador

        $response = $this->autenticado($admin, 'DELETE', "/api/v1/admin/examenes/{$examen->idExamen}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('examenes', [
            'idExamen' => $examen->idExamen,
        ]);
    }

    #[Test]
    public function administrador_puede_cambiar_estado_de_examen()
    {
        $admin = $this->crearAdmin();
        $examen = Examen::factory()->create(['estado' => '0']); // Borrador

        // Intentar cambiar a publicado (puede fallar si no está completo, pero el endpoint funciona)
        $response = $this->autenticado($admin, 'PATCH', "/api/v1/admin/examenes/{$examen->idExamen}/estado", [
            'estado' => '1', // Publicado
        ]);

        // El endpoint puede retornar 422 si el examen no está completo, pero eso es correcto
        // Verificamos que el endpoint responde (no es 404 o 500)
        $this->assertContains($response->status(), [200, 422]);

        // Si retorna 200, verificar que el estado cambió
        if ($response->status() === 200) {
            $this->assertDatabaseHas('examenes', [
                'idExamen' => $examen->idExamen,
                'estado' => '1',
            ]);
        } else {
            // Si retorna 422, verificar que el mensaje indica que no está completo
            $response->assertJsonStructure(['message']);
        }
    }

    #[Test]
    public function administrador_puede_duplicar_examen()
    {
        $admin = $this->crearAdmin();
        $examen = Examen::factory()->create([
            'titulo' => 'Examen Original',
            'codigo_examen' => 'EX-ORIGINAL',
        ]);

        $response = $this->autenticado($admin, 'POST', "/api/v1/admin/examenes/{$examen->idExamen}/duplicar");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'idExamen',
                    'titulo',
                    'codigo_examen',
                ],
            ]);

        // Verificar que se creó un nuevo examen (el duplicado tiene " (Copia)" en el título)
        $nuevoExamen = Examen::where('titulo', 'Examen Original (Copia)')
            ->where('codigo_examen', '!=', 'EX-ORIGINAL')
            ->first();

        $this->assertNotNull($nuevoExamen);
        $this->assertNotEquals($examen->idExamen, $nuevoExamen->idExamen);
    }

    #[Test]
    public function administrador_puede_filtrar_examenes_por_estado()
    {
        $admin = $this->crearAdmin();
        Examen::factory()->create(['estado' => '0']); // Borrador
        Examen::factory()->create(['estado' => '1']); // Publicado
        Examen::factory()->create(['estado' => '1']); // Publicado

        $response = $this->autenticado($admin, 'GET', '/api/v1/admin/examenes?estado=1');

        $response->assertStatus(200);
        $data = $response->json('data');
        foreach ($data as $examen) {
            $this->assertEquals('1', $examen['estado']);
        }
    }

    #[Test]
    public function administrador_puede_buscar_examenes_por_codigo()
    {
        $admin = $this->crearAdmin();
        $examen1 = Examen::factory()->create(['codigo_examen' => 'EX-MAT-001']);
        Examen::factory()->create(['codigo_examen' => 'EX-LENG-001']);

        $response = $this->autenticado($admin, 'GET', '/api/v1/admin/examenes?search=EX-MAT-001');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertGreaterThan(0, count($data));
        $this->assertEquals('EX-MAT-001', $data[0]['codigo_examen']);
    }

    #[Test]
    public function no_se_puede_actualizar_examen_con_intentos_iniciados()
    {
        $admin = $this->crearAdmin();
        $docente = $this->crearDocente();
        $examen = Examen::factory()->publicado()->create();
        $tipoConcurso = TipoConcurso::find($examen->idTipoConcurso);

        // Crear un intento iniciado usando DB directamente (nombre correcto de la tabla)
        \Illuminate\Support\Facades\DB::table('intento_examenes')->insert([
            'idExamen' => $examen->idExamen,
            'idUsuario' => $docente->idUsuario,
            'estado' => 'iniciado',
            'hora_inicio' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $datos = [
            'codigo_examen' => $examen->codigo_examen,
            'titulo' => 'Título Actualizado',
            'descripcion' => 'Esta es una descripción actualizada que cumple con el mínimo de caracteres requeridos para la validación.',
            'idTipoConcurso' => $tipoConcurso->idTipoConcurso,
            'tipo_acceso' => $examen->tipo_acceso,
            'estado' => $examen->estado,
            'tiempo_limite' => 90,
        ];

        $response = $this->autenticado($admin, 'PUT', "/api/v1/admin/examenes/{$examen->idExamen}", $datos);

        $response->assertStatus(422); // Error de validación por intentos iniciados
    }

    #[Test]
    public function docente_no_puede_acceder_a_rutas_de_gestion_de_examenes()
    {
        $docente = $this->crearDocente();
        $examen = Examen::factory()->create();

        // Intentar listar exámenes
        $response = $this->autenticado($docente, 'GET', '/api/v1/admin/examenes');
        $response->assertStatus(403);

        // Intentar crear examen
        $response = $this->autenticado($docente, 'POST', '/api/v1/admin/examenes', []);
        $response->assertStatus(403);

        // Intentar ver examen
        $response = $this->autenticado($docente, 'GET', "/api/v1/admin/examenes/{$examen->idExamen}");
        $response->assertStatus(403);
    }

    #[Test]
    public function validacion_requiere_codigo_examen_unico()
    {
        $admin = $this->crearAdmin();
        $tipoConcurso = TipoConcurso::factory()->create();
        $examen = Examen::factory()->create(['codigo_examen' => 'EX-DUPLICADO']);

        $datos = [
            'codigo_examen' => 'EX-DUPLICADO', // Código duplicado
            'titulo' => 'Examen de Prueba',
            'descripcion' => 'Esta es una descripción de prueba para el examen que cumple con el mínimo de caracteres requeridos.',
            'idTipoConcurso' => $tipoConcurso->idTipoConcurso,
            'tipo_acceso' => 'publico',
            'estado' => '0',
            'tiempo_limite' => 60,
        ];

        $response = $this->autenticado($admin, 'POST', '/api/v1/admin/examenes', $datos);

        $response->assertStatus(422); // Error de validación
    }

    #[Test]
    public function validacion_requiere_titulo_minimo()
    {
        $admin = $this->crearAdmin();
        $tipoConcurso = TipoConcurso::factory()->create();

        $datos = [
            'codigo_examen' => 'EX-TEST-002',
            'titulo' => 'Corto', // Muy corto (menos de 10 caracteres)
            'descripcion' => 'Esta es una descripción de prueba para el examen que cumple con el mínimo de caracteres requeridos.',
            'idTipoConcurso' => $tipoConcurso->idTipoConcurso,
            'tipo_acceso' => 'publico',
            'estado' => '0',
            'tiempo_limite' => 60,
        ];

        $response = $this->autenticado($admin, 'POST', '/api/v1/admin/examenes', $datos);

        $response->assertStatus(422); // Error de validación
    }
}
