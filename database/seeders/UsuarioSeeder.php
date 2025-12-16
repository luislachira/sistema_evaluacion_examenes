<?php

namespace Database\Seeders;

use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsuarioSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Admin principal
        Usuario::firstOrCreate(
            ['correo' => 'admin@leonorcerna.edu.pe'],
            [
                'nombre' => 'Administrador',
                'apellidos' => 'Principal',
                'password' => Hash::make('admin123'),
                'rol' => Usuario::ROL_ADMINISTRADOR,
                'estado' => Usuario::ESTADO_ACTIVO,
            ]
        );

        // Docentes de ejemplo
        $docentes = [
            [
                'nombre' => 'Ana',
                'apellidos' => 'Pérez García',
                'correo' => 'ana.perez@ejemplo.com',
                'estado' => Usuario::ESTADO_ACTIVO
            ],
            [
                'nombre' => 'Carlos',
                'apellidos' => 'López Mendoza',
                'correo' => 'carlos.lopez@ejemplo.com',
                'estado' => Usuario::ESTADO_ACTIVO
            ],
            [
                'nombre' => 'María',
                'apellidos' => 'González Torres',
                'correo' => 'maria.gonzalez@ejemplo.com',
                'estado' => Usuario::ESTADO_PENDIENTE
            ],
            [
                'nombre' => 'José',
                'apellidos' => 'Rodríguez Silva',
                'correo' => 'jose.rodriguez@ejemplo.com',
                'estado' => Usuario::ESTADO_PENDIENTE
            ],
            [
                'nombre' => 'Carmen',
                'apellidos' => 'Vargas Luna',
                'correo' => 'carmen.vargas@ejemplo.com',
                'estado' => Usuario::ESTADO_SUSPENDIDO
            ]
        ];

        foreach ($docentes as $docente) {
            Usuario::firstOrCreate(
                ['correo' => $docente['correo']],
                [
                    'nombre' => $docente['nombre'],
                    'apellidos' => $docente['apellidos'],
                    'password' => Hash::make('docente123'),
                    'rol' => Usuario::ROL_DOCENTE,
                    'estado' => $docente['estado'],
                ]
            );
        }

        $this->command->info('Usuarios creados exitosamente!');
    }
}
