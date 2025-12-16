<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Notifications\Messages\MailMessage;

class TestMailMessage extends Command
{
    protected $signature = 'test:mailmessage {email}';
    protected $description = 'Test MailMessage class directly';

    public function handle()
    {
        $email = $this->argument('email');
        
        $this->info("Probando MailMessage con: $email");
        
        try {
            // Crear un MailMessage similar al de reset password
            $mailMessage = (new MailMessage)
                ->subject('Test MailMessage - Examen Ascenso')
                ->line('Esta es una prueba de MailMessage.')
                ->action('Click Aquí', config('app.url') . '/test')
                ->line('Si ves este correo, MailMessage funciona correctamente.');
            
            $this->info("MailMessage creado, intentando enviar...");
            
            // Enviar usando la estructura de notificación
            Mail::send([], [], function ($message) use ($email, $mailMessage) {
                $message->to($email)
                        ->subject($mailMessage->subject ?? 'Test MailMessage')
                        ->setBody($mailMessage->render(), 'text/html');
            });
            
            $this->info("✅ MailMessage enviado exitosamente!");
            
        } catch (\Exception $e) {
            $this->error("❌ Error con MailMessage: " . $e->getMessage());
            $this->error("Detalles: " . $e->getTraceAsString());
        }
    }
}