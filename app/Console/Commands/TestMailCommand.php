<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use App\Models\Usuario;
use App\Notifications\ResetPasswordNotification;

class TestMailCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:mail {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test mail sending';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');

        $this->info("Probando envío de correo a: $email");

        try {
            // Probar con un correo simple primero
            Mail::raw('Este es un correo de prueba desde Laravel', function ($message) use ($email) {
                $message->to($email)
                    ->subject('Prueba de Correo - Examen Ascenso')
                    ->from(config('mail.from.address', 'admin@ldln.site'), config('mail.from.name', 'Examen de Ascenso'));
            });

            $this->info("✅ Correo simple enviado exitosamente!");

            // Ahora probar con la notificación de reset
            $user = Usuario::where('correo', $email)->first();
            if ($user) {
                $user->notify(new ResetPasswordNotification('test-token-123'));
                $this->info("✅ Notificación de reset enviada exitosamente!");
            } else {
                $this->warn("⚠️ Usuario no encontrado para $email");
            }
        } catch (\Exception $e) {
            $this->error("❌ Error al enviar correo: " . $e->getMessage());
            $this->error("Detalle: " . $e->getTraceAsString());
        }
    }
}
