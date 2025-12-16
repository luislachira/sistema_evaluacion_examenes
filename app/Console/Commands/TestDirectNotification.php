<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Usuario;
use App\Notifications\ResetPasswordNotification;

class TestDirectNotification extends Command
{
    protected $signature = 'test:direct-notification {email}';
    protected $description = 'Test sending notification directly';

    public function handle()
    {
        $email = $this->argument('email');
        
        $this->info("Probando notificación directa para: $email");
        
        $user = Usuario::where('correo', $email)->first();
        if (!$user) {
            $this->error("Usuario no encontrado");
            return;
        }
        
        $this->info("Usuario encontrado: {$user->nombre} {$user->apellidos}");
        
        try {
            $token = 'test-token-123456';
            $user->sendPasswordResetNotification($token);
            $this->info("✅ Notificación enviada directamente!");
        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            $this->error($e->getTraceAsString());
        }
    }
}