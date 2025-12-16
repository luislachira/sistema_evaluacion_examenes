<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Usuario;
use App\Models\Examen;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;

class DocenteDashboardApiTest extends TestCase
{
    use DatabaseTransactions;

    #[Test]
    public function docente_puede_ver_examenes_disponibles()
    {
        $docente = $this->crearDocente();

        // Limpiar caché antes de crear el examen
        \Illuminate\Support\Facades\Cache::flush();

        $examen = Examen::factory()->publicado()->create([
            'tipo_acceso' => 'publico',
            'fecha_inicio_vigencia' => now()->subDays(1), // Disponible desde ayer
            'fecha_fin_vigencia' => now()->addDays(30), // Disponible hasta dentro de 30 días
        ]);

        // Limpiar caché después de crear el examen para asegurar que se obtengan los datos frescos
        \Illuminate\Support\Facades\Cache::forget("docente_examenes_disponibles_{$docente->idUsuario}");

        $response = $this->autenticado($docente, 'GET', '/api/v1/docente/dashboard');

        $response->assertStatus(200);

        // La respuesta de ExamenResource::collection() viene envuelta en un objeto con clave 'data'
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'idExamen',
                    'titulo',
                    'codigo_examen',
                ],
            ],
        ]);

        $data = $response->json('data');

        // Verificar que el examen esté en la respuesta
        $this->assertNotEmpty($data, 'El dashboard debe contener al menos un examen');

        // Verificar que el examen específico esté en la lista
        $examenIds = collect($data)->pluck('idExamen')->toArray();
        $this->assertContains($examen->idExamen, $examenIds, 'El examen debe estar en la lista');
    }

    #[Test]
    public function docente_no_puede_ver_examenes_borrador()
    {
        $docente = $this->crearDocente();
        $examen = Examen::factory()->create([
            'estado' => '0', // Borrador
            'tipo_acceso' => 'publico',
        ]);

        $response = $this->autenticado($docente, 'GET', '/api/v1/docente/dashboard');

        $response->assertStatus(200);
        $data = $response->json();
        $examenIds = collect($data)->pluck('idExamen')->toArray();
        $this->assertNotContains($examen->idExamen, $examenIds);
    }

    #[Test]
    public function docente_no_puede_ver_examenes_privados_no_asignados()
    {
        $docente = $this->crearDocente();
        $otroDocente = $this->crearDocente();
        $admin = $this->crearAdmin(); // Crear admin para asignar el examen

        $examen = Examen::factory()->publicado()->create([
            'tipo_acceso' => 'privado',
        ]);

        // Asignar examen solo al otro docente
        DB::table('examenes_usuarios')->insert([
            'idExamen' => $examen->idExamen,
            'idUsuario' => $otroDocente->idUsuario,
            'asignado_por' => $admin->idUsuario,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->autenticado($docente, 'GET', '/api/v1/docente/dashboard');

        $response->assertStatus(200);
        $data = $response->json();
        $examenIds = collect($data)->pluck('idExamen')->toArray();
        $this->assertNotContains($examen->idExamen, $examenIds);
    }

    #[Test]
    public function administrador_no_puede_acceder_al_dashboard_de_docente()
    {
        $admin = $this->crearAdmin();

        $response = $this->autenticado($admin, 'GET', '/api/v1/docente/dashboard');

        $response->assertStatus(403);
    }
}
