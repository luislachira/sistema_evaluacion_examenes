<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Password;
use App\Models\Usuario;

class TestPasswordResetCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:password-reset {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test password reset functionality';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        
        $this->info("Probando password reset para: $email");
        
        // Verificar que el usuario existe
        $user = Usuario::where('correo', $email)->first();
        if (!$user) {
            $this->error("Usuario no encontrado con correo: $email");
            return;
        }
        
        $this->info("Usuario encontrado: {$user->nombre} {$user->apellidos}");
        
        // Probar el envío de reset link
        try {
            $response = Password::broker()->sendResetLink(['correo' => $email]);
            
            $this->info("Response code: $response");
            
            if ($response == Password::RESET_LINK_SENT) {
                $this->info("✅ Enlace de reset enviado exitosamente!");
                $this->info("Revisa el archivo storage/logs/laravel.log para ver el correo.");
            } else {
                $this->error("❌ Error al enviar enlace: $response");
            }
            
        } catch (\Exception $e) {
            $this->error("❌ Excepción: " . $e->getMessage());
            $this->error($e->getTraceAsString());
        }
    }
}
