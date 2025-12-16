<?php

namespace Database\Factories;

use App\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Usuario>
 */
class UsuarioFactory extends Factory
{
    protected $model = Usuario::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nombre' => fake()->firstName(),
            'apellidos' => fake()->lastName(),
            'correo' => fake()->unique()->safeEmail(),
            'password' => Hash::make('password'),
            'rol' => Usuario::ROL_DOCENTE,
            'estado' => Usuario::ESTADO_ACTIVO,
        ];
    }

    /**
     * Indicate that the user is an administrator.
     */
    public function administrador(): static
    {
        return $this->state(fn(array $attributes) => [
            'rol' => Usuario::ROL_ADMINISTRADOR,
        ]);
    }

    /**
     * Indicate that the user is a teacher.
     */
    public function docente(): static
    {
        return $this->state(fn(array $attributes) => [
            'rol' => Usuario::ROL_DOCENTE,
        ]);
    }

    /**
     * Indicate that the user is active.
     */
    public function activo(): static
    {
        return $this->state(fn(array $attributes) => [
            'estado' => Usuario::ESTADO_ACTIVO,
        ]);
    }

    /**
     * Indicate that the user is pending approval.
     */
    public function pendiente(): static
    {
        return $this->state(fn(array $attributes) => [
            'estado' => Usuario::ESTADO_PENDIENTE,
        ]);
    }

    /**
     * Indicate that the user is suspended.
     */
    public function suspendido(): static
    {
        return $this->state(fn(array $attributes) => [
            'estado' => Usuario::ESTADO_SUSPENDIDO,
        ]);
    }
}
