<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Mail;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    /**
     * The password reset token.
     */
    public string $token;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $token)
    {
        $this->token = $token;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable)
    {
        $url = config('app.url') . '/reset-password?token=' . $this->token . '&email=' . $notifiable->correo;

        $emailContent = "Hola,\n\n";
        $emailContent .= "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.\n\n";
        $emailContent .= "Haz clic en el siguiente enlace para restablecer tu contraseña:\n";
        $emailContent .= $url . "\n\n";
        $emailContent .= "Este enlace expirará en 60 minutos.\n\n";
        $emailContent .= "Si no solicitaste restablecer tu contraseña, ignora este mensaje.\n\n";
        $emailContent .= "Saludos,\n";
        $emailContent .= config('app.name');

        Mail::raw($emailContent, function ($message) use ($notifiable) {
            $message->to($notifiable->correo)
                    ->subject('Restablecer Contraseña - ' . config('app.name'))
                    ->from(config('mail.from.address'), config('mail.from.name'));
        });

        // Laravel espera que devolvamos algo, pero ya enviamos el correo manualmente
        return null;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}
