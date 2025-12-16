<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Tema;
use Illuminate\Support\Facades\DB;

class TemasSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            $temas = [
                [
                    'nombre' => 'Matemáticas',
                    'descripcion' => 'Preguntas relacionadas con matemáticas básicas y avanzadas',
                    'orden' => 1,
                    'activo' => true,
                ],
                [
                    'nombre' => 'Ciencias',
                    'descripcion' => 'Preguntas sobre física, química y biología',
                    'orden' => 2,
                    'activo' => true,
                ],
                [
                    'nombre' => 'Historia',
                    'descripcion' => 'Preguntas sobre historia universal y nacional',
                    'orden' => 3,
                    'activo' => true,
                ],
                [
                    'nombre' => 'Geografía',
                    'descripcion' => 'Preguntas sobre geografía mundial y nacional',
                    'orden' => 4,
                    'activo' => true,
                ],
                [
                    'nombre' => 'Literatura',
                    'descripcion' => 'Preguntas sobre literatura clásica y contemporánea',
                    'orden' => 5,
                    'activo' => true,
                ],
                [
                    'nombre' => 'Lenguaje',
                    'descripcion' => 'Preguntas sobre gramática y comunicación',
                    'orden' => 6,
                    'activo' => true,
                ],
                [
                    'nombre' => 'EPT',
                    'descripcion' => 'Educación para el Trabajo - Preguntas sobre habilidades laborales y emprendimiento',
                    'orden' => 7,
                    'activo' => true,
                ],
            ];

            foreach ($temas as $temaData) {
                Tema::firstOrCreate(
                    ['nombre' => $temaData['nombre']],
                    $temaData
                );
            }

            $this->command->info('Temas creados exitosamente.');
        });
    }
}

