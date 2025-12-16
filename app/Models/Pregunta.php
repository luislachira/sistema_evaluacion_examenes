<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pregunta extends Model
{
    use HasFactory;

    protected $table = 'preguntas';
    protected $primaryKey = 'idPregunta';
    public $incrementing = true;

    protected $fillable = [
        'idContexto',
        'idCategoria',
        'codigo',
        'enunciado',
        'ano',
    ];

    protected $casts = [
        'idContexto' => 'integer',
        'idCategoria' => 'integer',
        'ano' => 'integer',
    ];

    // Relaciones
    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'idCategoria', 'idCategoria');
    }

    public function contexto()
    {
        return $this->belongsTo(Contexto::class, 'idContexto', 'idContexto');
    }

    public function opciones()
    {
        return $this->hasMany(OpcionesPregunta::class, 'idPregunta', 'idPregunta');
    }

    public function respuestas()
    {
        return $this->hasMany(RespuestaIntento::class, 'idPregunta', 'idPregunta');
    }

    public function examenes()
    {
        return $this->belongsToMany(Examen::class, 'examen_pregunta', 'idPregunta', 'idExamen')
            ->withPivot('orden', 'idSubprueba')
            ->withTimestamps();
    }

    public function archivosAdjuntos()
    {
        return $this->hasMany(ArchivoAdjunto::class, 'id_recurso', 'idPregunta')
            ->where('tipo_recurso', 'pregunta_enunciado');
    }
}
