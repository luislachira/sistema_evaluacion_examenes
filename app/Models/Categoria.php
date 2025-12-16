<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Categoria extends Model
{
    use HasFactory;

    protected $table = 'categorias';
    protected $primaryKey = 'idCategoria';
    public $incrementing = true;

    protected $fillable = [
        'nombre',
        'descripcion',
    ];

    // Relaciones
    public function contextos()
    {
        return $this->hasMany(Contexto::class, 'idCategoria', 'idCategoria');
    }

    public function preguntas()
    {
        return $this->hasMany(Pregunta::class, 'idCategoria', 'idCategoria');
    }
}

