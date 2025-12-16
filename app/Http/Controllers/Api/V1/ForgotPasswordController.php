<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\ResetPasswordRequest;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;

class ForgotPasswordController extends Controller
{
    /**
     * Envía el enlace para resetear la contraseña.
     */
    public function forgotPassword(ForgotPasswordRequest $request)
    {
        // Mapear correo a email para el sistema de Laravel Password Reset
        $credentials = ['email' => $request->input('correo')];
        
        $response = Password::broker()->sendResetLink($credentials);

        if ($response == Password::RESET_LINK_SENT) {
            return response()->json(['message' => 'Se ha enviado el enlace para restablecer la contraseña a su correo.'], 200);
        }

        return response()->json(['message' => 'No se pudo enviar el enlace. Verifique su correo electrónico.'], 400);
    }

    /**
     * Resetea la contraseña del usuario.
     */
    public function resetPassword(ResetPasswordRequest $request)
    {
        $credentials = [
            'email' => $request->input('correo'),
            'password' => $request->input('password'),
            'password_confirmation' => $request->input('password_confirmation'),
            'token' => $request->input('token')
        ];
        
        $response = Password::broker()->reset(
            $credentials,
            function ($user, $password) {
                $user->password = Hash::make($password);
                $user->save();
            }
        );

        if ($response == Password::PASSWORD_RESET) {
            return response()->json(['message' => 'La contraseña ha sido restablecida exitosamente.'], 200);
        }

        return response()->json(['message' => 'El token proporcionado no es válido o ha expirado.'], 400);
    }
}
