<?php

namespace Database\Factories;

use App\Models\Examen;
use App\Models\TipoConcurso;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Examen>
 */
class ExamenFactory extends Factory
{
    protected $model = Examen::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'idTipoConcurso' => TipoConcurso::factory(),
            'codigo_examen' => 'EX-' . fake()->unique()->numerify('####'),
            'titulo' => fake()->sentence(3),
            'descripcion' => fake()->paragraph(),
            'tiempo_limite' => fake()->numberBetween(60, 180),
            'tipo_acceso' => fake()->randomElement(['publico', 'privado']),
            'estado' => '0', // Borrador por defecto
            'paso_actual' => 1,
            'fecha_inicio_vigencia' => now()->addDays(1),
            'fecha_fin_vigencia' => now()->addDays(30),
        ];
    }

    /**
     * Indicate that the exam is published.
     */
    public function publicado(): static
    {
        return $this->state(fn(array $attributes) => [
            'estado' => '1',
            'fecha_publicacion' => now(),
        ]);
    }

    /**
     * Indicate that the exam is finalized.
     */
    public function finalizado(): static
    {
        return $this->state(fn(array $attributes) => [
            'estado' => '2',
            'fecha_finalizacion' => now(),
        ]);
    }
}
