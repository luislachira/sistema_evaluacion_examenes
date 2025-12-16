<?php

namespace Database\Factories;

use App\Models\Pregunta;
use App\Models\Categoria;
use App\Models\Contexto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Pregunta>
 */
class PreguntaFactory extends Factory
{
    protected $model = Pregunta::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Usar timestamp y número aleatorio para garantizar unicidad
        $timestamp = now()->timestamp;
        $random = fake()->numberBetween(1000, 9999);
        $codigo = 'PREG-' . $timestamp . '-' . $random;

        return [
            'idCategoria' => Categoria::factory(),
            'codigo' => $codigo,
            'enunciado' => fake()->paragraph(),
            'ano' => fake()->numberBetween(2020, 2024),
        ];
    }
}
