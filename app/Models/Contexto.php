<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contexto extends Model
{
    use HasFactory;

    protected $table = 'contextos';
    protected $primaryKey = 'idContexto';
    public $incrementing = true;

    protected $fillable = [
        'idCategoria',
        'titulo',
        'texto',
        'ano',
    ];

    protected $casts = [
        'idCategoria' => 'integer',
        'ano' => 'integer',
    ];

    // Relaciones
    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'idCategoria', 'idCategoria');
    }

    public function preguntas()
    {
        return $this->hasMany(Pregunta::class, 'idContexto', 'idContexto');
    }

    public function archivosAdjuntos()
    {
        return $this->hasMany(ArchivoAdjunto::class, 'id_recurso', 'idContexto')
            ->where('tipo_recurso', 'contexto_texto');
    }
}
