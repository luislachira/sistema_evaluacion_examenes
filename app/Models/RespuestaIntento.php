<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RespuestaIntento extends Model
{
    use HasFactory;

    protected $table = 'respuesta_intentos';
    protected $primaryKey = 'idRespuesta';
    public $incrementing = true;

    protected $fillable = [
        'idIntento',
        'idPregunta',
        'idOpcionSeleccionada',
    ];

    protected $casts = [
        'idIntento' => 'integer',
        'idPregunta' => 'integer',
        'idOpcionSeleccionada' => 'integer',
    ];

    // Relaciones
    public function intento()
    {
        return $this->belongsTo(IntentoExamen::class, 'idIntento', 'idIntento');
    }

    public function pregunta()
    {
        return $this->belongsTo(Pregunta::class, 'idPregunta', 'idPregunta');
    }

    public function opcionSeleccionada()
    {
        return $this->belongsTo(OpcionesPregunta::class, 'idOpcionSeleccionada', 'idOpcion');
    }
}

