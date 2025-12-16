<?php

namespace Database\Factories;

use App\Models\TipoConcurso;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TipoConcurso>
 */
class TipoConcursoFactory extends Factory
{
    protected $model = TipoConcurso::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nombre' => fake()->words(2, true),
        ];
    }
}

