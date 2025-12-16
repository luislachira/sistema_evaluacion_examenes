<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Examen;
use App\Models\Pregunta;
use App\Models\Tema;
use App\Models\Usuario;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ExamenesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Obtener un usuario administrador
            $admin = Usuario::where('rol', '0')->first();
            if (!$admin) {
                $admin = Usuario::first();
            }

            if (!$admin) {
                $this->command->error('❌ Error: No hay usuarios en la base de datos. Ejecute UsuarioSeeder primero.');
                return;
            }

            $adminId = $admin->idUsuario;

            // Obtener temas
            $matematicas = Tema::where('nombre', 'Matemáticas')->first();
            $ciencias = Tema::where('nombre', 'Ciencias')->first();
            $historia = Tema::where('nombre', 'Historia')->first();
            $geografia = Tema::where('nombre', 'Geografía')->first();

            if (!$matematicas || !$ciencias || !$historia || !$geografia) {
                $this->command->error('❌ Error: Primero debe ejecutar TemasSeeder');
                return;
            }

            // Obtener preguntas disponibles
            $preguntasMatematicas = Pregunta::where('idTema', $matematicas->idTema)
                ->where('activo', true)
                ->get();

            $preguntasCiencias = Pregunta::where('idTema', $ciencias->idTema)
                ->where('activo', true)
                ->get();

            $preguntasHistoria = Pregunta::where('idTema', $historia->idTema)
                ->where('activo', true)
                ->get();

            $preguntasGeografia = Pregunta::where('idTema', $geografia->idTema)
                ->where('activo', true)
                ->get();

            if ($preguntasMatematicas->isEmpty() || $preguntasCiencias->isEmpty()) {
                $this->command->error('❌ Error: No hay suficientes preguntas. Ejecute PreguntasSeeder primero.');
                return;
            }

            // Examen 1: Examen General de Prueba
            $examen1 = Examen::firstOrCreate(
                ['codigo' => 'EXM-2024-001'],
                [
                    'titulo' => 'Examen General de Prueba - Nivel Básico',
                    'descripcion' => 'Examen de prueba que incluye preguntas de diferentes temas para evaluación general.',
                    'tipo' => '1',
                    'total_preguntas' => 0, // Se actualizará al asociar preguntas
                    'duracion_minutos' => 60,
                    'filtros_json' => json_encode([
                        'temas' => [$matematicas->idTema, $ciencias->idTema],
                        'dificultad' => ['0', '1']
                    ]),
                    'creado_por' => $adminId,
                    'fecha_creacion' => Carbon::now(),
                    'fecha_disponible_desde' => Carbon::now()->subDays(1),
                    'fecha_disponible_hasta' => Carbon::now()->addDays(30),
                    'estado' => '1', // Publicado
                    'publico' => true,
                    'veces_usado' => 0,
                    'promedio_puntaje' => 0.00,
                    'activo' => true,
                ]
            );

            // Asociar preguntas al examen 1
            $preguntasExamen1 = collect([])
                ->merge($preguntasMatematicas->take(3))
                ->merge($preguntasCiencias->take(2))
                ->merge($preguntasHistoria->take(2))
                ->merge($preguntasGeografia->take(2));

            $orden = 1;
            foreach ($preguntasExamen1 as $pregunta) {
                // Verificar si ya existe la relación
                if (!$examen1->preguntas()->where('examenes_preguntas.idPregunta', $pregunta->idPregunta)->exists()) {
                    $examen1->preguntas()->attach($pregunta->idPregunta, [
                        'orden' => $orden++,
                        'mostrar_contexto' => $pregunta->tiene_contexto,
                        'idContexto' => $pregunta->idContexto,
                        'puntaje' => $this->calcularPuntaje($pregunta->dificultad),
                    ]);
                } else {
                    $orden++; // Incrementar orden aunque ya exista
                }
            }

            $examen1->total_preguntas = $examen1->preguntas()->count();
            $examen1->save();

            // Examen 2: Examen de Matemáticas
            $examen2 = Examen::firstOrCreate(
                ['codigo' => 'EXM-MATH-2024-001'],
                [
                    'titulo' => 'Examen de Matemáticas - Nivel Intermedio',
                    'descripcion' => 'Examen especializado en matemáticas con preguntas de diferentes niveles de dificultad.',
                    'tipo' => '1',
                    'total_preguntas' => 0,
                    'duracion_minutos' => 45,
                    'filtros_json' => json_encode([
                        'temas' => [$matematicas->idTema],
                        'dificultad' => ['0', '1', '2']
                    ]),
                    'creado_por' => $adminId,
                    'fecha_creacion' => Carbon::now(),
                    'fecha_disponible_desde' => Carbon::now(),
                    'fecha_disponible_hasta' => Carbon::now()->addDays(60),
                    'estado' => '1',
                    'publico' => true,
                    'veces_usado' => 0,
                    'promedio_puntaje' => 0.00,
                    'activo' => true,
                ]
            );

            // Asociar preguntas de matemáticas
            $preguntasExamen2 = $preguntasMatematicas->take(4);
            $orden = 1;
            foreach ($preguntasExamen2 as $pregunta) {
                // Verificar si ya existe la relación
                if (!$examen2->preguntas()->where('examenes_preguntas.idPregunta', $pregunta->idPregunta)->exists()) {
                    $examen2->preguntas()->attach($pregunta->idPregunta, [
                        'orden' => $orden++,
                        'mostrar_contexto' => $pregunta->tiene_contexto,
                        'idContexto' => $pregunta->idContexto,
                        'puntaje' => $this->calcularPuntaje($pregunta->dificultad),
                    ]);
                } else {
                    $orden++; // Incrementar orden aunque ya exista
                }
            }

            $examen2->total_preguntas = $examen2->preguntas()->count();
            $examen2->save();

            // Examen 3: Examen en Borrador
            $examen3 = Examen::firstOrCreate(
                ['codigo' => 'EXM-DRAFT-001'],
                [
                    'titulo' => 'Examen en Borrador - Ciencias y Geografía',
                    'descripcion' => 'Examen de prueba en estado borrador que aún no está publicado.',
                    'tipo' => '1',
                    'total_preguntas' => 0,
                    'duracion_minutos' => 30,
                    'filtros_json' => json_encode([
                        'temas' => [$ciencias->idTema, $geografia->idTema],
                        'dificultad' => ['0']
                    ]),
                    'creado_por' => $adminId,
                    'fecha_creacion' => Carbon::now(),
                    'fecha_disponible_desde' => null,
                    'fecha_disponible_hasta' => null,
                    'estado' => '0', // Borrador
                    'publico' => false,
                    'veces_usado' => 0,
                    'promedio_puntaje' => 0.00,
                    'activo' => true,
                ]
            );

            // Asociar algunas preguntas al examen en borrador
            $preguntasExamen3 = collect([])
                ->merge($preguntasCiencias->take(2))
                ->merge($preguntasGeografia->take(2));

            $orden = 1;
            foreach ($preguntasExamen3 as $pregunta) {
                // Verificar si ya existe la relación
                if (!$examen3->preguntas()->where('examenes_preguntas.idPregunta', $pregunta->idPregunta)->exists()) {
                    $examen3->preguntas()->attach($pregunta->idPregunta, [
                        'orden' => $orden++,
                        'mostrar_contexto' => $pregunta->tiene_contexto,
                        'idContexto' => $pregunta->idContexto,
                        'puntaje' => $this->calcularPuntaje($pregunta->dificultad),
                    ]);
                } else {
                    $orden++; // Incrementar orden aunque ya exista
                }
            }

            $examen3->total_preguntas = $examen3->preguntas()->count();
            $examen3->save();

            $this->command->info('✅ 3 exámenes creados exitosamente:');
            $this->command->info('   - Examen General de Prueba (Publicado): ' . $examen1->total_preguntas . ' preguntas');
            $this->command->info('   - Examen de Matemáticas (Publicado): ' . $examen2->total_preguntas . ' preguntas');
            $this->command->info('   - Examen en Borrador: ' . $examen3->total_preguntas . ' preguntas');
        });
    }

    /**
     * Calcular puntaje según la dificultad
     */
    private function calcularPuntaje(string $dificultad): float
    {
        return match ($dificultad) {
            '0' => 1.00, // Baja
            '1' => 1.50, // Media
            '2' => 2.00, // Alta
            default => 1.00,
        };
    }
}

