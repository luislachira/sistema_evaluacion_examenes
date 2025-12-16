<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OpcionesPregunta extends Model
{
    use HasFactory;

    protected $table = 'opciones_preguntas';
    protected $primaryKey = 'idOpcion';
    public $incrementing = true;

    protected $fillable = [
        'idPregunta',
        'contenido',
        'es_correcta',
    ];

    protected $casts = [
        'idPregunta' => 'integer',
        'es_correcta' => 'boolean',
    ];

    // Relaciones
    public function pregunta()
    {
        return $this->belongsTo(Pregunta::class, 'idPregunta', 'idPregunta');
    }

    public function respuestas()
    {
        return $this->hasMany(RespuestaIntento::class, 'idOpcionSeleccionada', 'idOpcion');
    }
}

