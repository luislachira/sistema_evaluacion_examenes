<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;

class TestUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear usuario de prueba solo si no existe
        Usuario::firstOrCreate(
            ['correo' => 'luislachiraofi1@gmail.com'],
            [
                'nombre' => 'Luis',
                'apellidos' => 'Lachira Nima',
                'password' => Hash::make('Forgotme1'),
                'rol' => Usuario::ROL_ADMINISTRADOR,
                'estado' => Usuario::ESTADO_ACTIVO,
            ]
        );

        echo "Usuario de prueba creado: luislachiraofi1@gmail.com\n";
    }
}
