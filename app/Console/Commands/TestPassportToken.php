<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Usuario;

class TestPassportToken extends Command
{
    protected $signature = 'test:passport-token {email}';
    protected $description = 'Test Passport token creation for a user';

    public function handle()
    {
        $email = $this->argument('email');
        
        $this->info("Probando creación de token Passport para: $email");
        
        try {
            $usuario = Usuario::where('correo', $email)->first();
            
            if (!$usuario) {
                $this->error("Usuario no encontrado con correo: $email");
                return;
            }
            
            $this->info("Usuario encontrado: {$usuario->nombre} {$usuario->apellidos}");
            $this->info("ID Usuario: {$usuario->idUsuario}");
            $this->info("Estado: {$usuario->estado}");
            
            // Intentar crear token
            $token = $usuario->createToken('Test Token')->accessToken;
            
            $this->info("✅ Token creado exitosamente!");
            $this->info("Token: " . substr($token, 0, 50) . "...");
            
        } catch (\Exception $e) {
            $this->error("❌ Error al crear token: " . $e->getMessage());
            $this->error("Detalles: " . $e->getTraceAsString());
        }
    }
}