<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestSmtp extends Command
{
    protected $signature = 'test:smtp {email}';
    protected $description = 'Test SMTP configuration';

    public function handle()
    {
        $email = $this->argument('email');

        $this->info("Probando SMTP con: $email");

        try {
            Mail::raw('Este es un mensaje de prueba SMTP desde Laravel.', function ($message) use ($email) {
                $message->to($email)
                    ->subject('Test SMTP - Examen Ascenso')
                    ->from(config('mail.from.address', 'admin@ldln.site'), config('mail.from.name', 'Examen de Ascenso'));
            });

            $this->info("✅ Correo SMTP enviado exitosamente!");
            $this->info("Revisa tu bandeja de entrada, spam y promociones en Gmail.");
        } catch (\Exception $e) {
            $this->error("❌ Error SMTP: " . $e->getMessage());
            $this->error("Detalles: " . $e->getTraceAsString());
        }
    }
}
