<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Usuario;

class ListUsuarios extends Command
{
    protected $signature = 'list:usuarios';
    protected $description = 'Listar todos los usuarios en la base de datos';

    public function handle()
    {
        $usuarios = Usuario::all();
        
        $this->info("Total usuarios: " . $usuarios->count());
        $this->info("");
        
        $headers = ['ID', 'Nombre', 'Apellidos', 'Correo', 'Rol', 'Estado'];
        $rows = [];
        
        foreach ($usuarios as $usuario) {
            $rows[] = [
                $usuario->idUsuario,
                $usuario->nombre,
                $usuario->apellidos,
                $usuario->correo,
                $usuario->rol === '0' ? 'Admin' : 'Docente',
                $usuario->estado === '1' ? 'Activo' : ($usuario->estado === '2' ? 'Pendiente' : 'Inactivo')
            ];
        }
        
        $this->table($headers, $rows);
    }
}