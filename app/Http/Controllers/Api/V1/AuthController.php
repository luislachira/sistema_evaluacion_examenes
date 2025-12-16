<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Usuario;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {

        Usuario::create(array_merge(
            $request->validated(),
            [
                'rol' => Usuario::ROL_DOCENTE, // Por defecto se registran como docentes
                'estado' => Usuario::ESTADO_PENDIENTE, // El admin debe aprobar la cuenta
            ]
        ));

        return response()->json([
            'message' => 'Registro exitoso. Su cuenta está pendiente de aprobación por un administrador.'
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $usuario = Usuario::where('correo', $request->correo)->first();

        // Verificamos si el usuario existe y la contraseña es correcta
        if (!$usuario || !Hash::check($request->password, $usuario->password)) {
            throw ValidationException::withMessages([
                'correo' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        // Verificamos el estado de la cuenta
        if ($usuario->estado !== Usuario::ESTADO_ACTIVO) { // Solo permitimos usuarios activos
            $status = $usuario->estado === Usuario::ESTADO_PENDIENTE ? 'pendiente de aprobación' : 'suspendida';
            return response()->json(['message' => "Su cuenta está {$status}."], 403);
        }

        // Crear token de Passport para el usuario
        $tokenResult = $usuario->createToken('API Token');
        $token = $tokenResult->accessToken;

        // Actualizar la última actividad del token al momento de creación
        // Usar la conexión por defecto (funciona tanto en producción como en pruebas)
        \Illuminate\Support\Facades\DB::table('oauth_access_tokens')
            ->where('id', $tokenResult->token->id)
            ->update(['updated_at' => \Carbon\Carbon::now()]);

        // Devolver el token junto con la información del usuario
        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'usuario' => [
                'idUsuario' => $usuario->idUsuario,
                'nombre' => $usuario->nombre,
                'apellidos' => $usuario->apellidos,
                'correo' => $usuario->correo,
                'rol' => $usuario->rol,
            ]
        ]);
    }

    public function logout(Request $request)
    {
        try {
            // Revocar todos los tokens del usuario
            $user = $request->user();

            if ($user) {
                // Obtener el token actual de la petición
                $token = $request->user()->token();

                if ($token) {
                    // Usar el método revoke() de Passport que maneja correctamente la revocación
                    $token->revoke();
                }

                // También revocar todos los demás tokens del usuario por seguridad
                // Usar el método tokens() de HasApiTokens que devuelve la relación correcta
                $user->tokens->each(function ($token) {
                    $token->revoke();
                });
            }

            return response()->json([
                'message' => 'Sesión cerrada exitosamente'
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error en logout: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al cerrar sesión'
            ], 500);
        }
    }
}
