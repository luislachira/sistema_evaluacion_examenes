<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Usuario;
use App\Models\Examen;
use App\Models\Pregunta;
use App\Models\IntentoExamen;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;

class AdminDashboardApiTest extends TestCase
{
    use DatabaseTransactions;

    #[Test]
    public function administrador_puede_ver_dashboard_con_estadisticas()
    {
        // Limpiar caché antes de crear datos para asegurar estadísticas frescas
        \Illuminate\Support\Facades\Cache::flush();

        $admin = $this->crearAdmin();

        // Crear datos de prueba
        $this->crearDocente();
        $this->crearDocente();
        $examen = Examen::factory()->create(['estado' => '1']);
        Pregunta::factory()->count(5)->create();

        $response = $this->autenticado($admin, 'GET', '/api/v1/admin/dashboard');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'estadisticas' => [
                    'total_usuarios',
                    'usuarios_activos',
                    'total_examenes',
                    'examenes_publicados',
                    'total_preguntas',
                ],
                'intentos_por_dia',
                'tasa_aprobacion',
                'examenes_por_estado',
                'promedio_puntaje_global',
            ]);
    }

    #[Test]
    public function dashboard_muestra_estadisticas_correctas()
    {
        // Limpiar caché antes de crear datos para asegurar estadísticas frescas
        \Illuminate\Support\Facades\Cache::flush();

        $admin = $this->crearAdmin();

        // Crear 3 usuarios activos
        $this->crearDocente();
        $this->crearDocente();
        $this->crearDocente();

        $response = $this->autenticado($admin, 'GET', '/api/v1/admin/dashboard');

        $response->assertStatus(200);
        $estadisticas = $response->json('estadisticas');

        // Debe haber al menos 4 usuarios (1 admin + 3 docentes)
        $this->assertGreaterThanOrEqual(4, $estadisticas['total_usuarios']);
        // Debe haber al menos 4 usuarios activos (1 admin + 3 docentes)
        $this->assertGreaterThanOrEqual(4, $estadisticas['usuarios_activos']);
    }

    #[Test]
    public function docente_no_puede_acceder_al_dashboard_de_administrador()
    {
        $docente = $this->crearDocente();

        $response = $this->autenticado($docente, 'GET', '/api/v1/admin/dashboard');

        $response->assertStatus(403);
    }
}
