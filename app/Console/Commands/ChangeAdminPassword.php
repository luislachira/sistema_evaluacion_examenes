<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class ChangeAdminPassword extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:change-password {email?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cambia la contraseña de un usuario administrador';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=== Cambiar Contraseña de Administrador ===');
        $this->newLine();

        // Obtener el email del argumento o preguntar
        $email = $this->argument('email') ?? $this->ask('¿Cuál es el correo del administrador?');

        // Buscar el usuario
        $usuario = Usuario::where('correo', $email)->first();

        if (!$usuario) {
            $this->error("✗ No se encontró un usuario con el correo: {$email}");
            return 1;
        }

        // Verificar que sea administrador
        if ($usuario->rol !== Usuario::ROL_ADMINISTRADOR) {
            $this->error("✗ El usuario {$email} no es un administrador (Rol actual: {$usuario->rol})");
            return 1;
        }

        $this->info("✓ Usuario encontrado: {$usuario->nombre} {$usuario->apellidos}");
        $this->newLine();

        // Solicitar nueva contraseña
        $password = $this->secret('¿Cuál será la nueva contraseña? (mínimo 8 caracteres)');
        $passwordConfirmation = $this->secret('Confirma la contraseña');

        // Validar que coincidan
        if ($password !== $passwordConfirmation) {
            $this->error("✗ Las contraseñas no coinciden.");
            return 1;
        }

        // Validar longitud mínima
        if (strlen($password) < 8) {
            $this->error("✗ La contraseña debe tener al menos 8 caracteres.");
            return 1;
        }

        // Actualizar contraseña
        $usuario->password = Hash::make($password);
        $usuario->save();

        $this->newLine();
        $this->info("✓ ¡Contraseña actualizada exitosamente!");
        $this->newLine();
        $this->table(
            ['Campo', 'Valor'],
            [
                ['Correo', $usuario->correo],
                ['Nombre', $usuario->nombre . ' ' . $usuario->apellidos],
                ['Rol', 'Administrador'],
                ['Estado', $usuario->estado === Usuario::ESTADO_ACTIVO ? 'Activo' : 'Inactivo'],
            ]
        );

        return 0;
    }
}
