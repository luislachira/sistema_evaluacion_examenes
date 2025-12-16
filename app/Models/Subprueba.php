<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subprueba extends Model
{
    use HasFactory;

    protected $table = 'subpruebas';
    protected $primaryKey = 'idSubprueba';
    public $incrementing = true;

    protected $fillable = [
        'idExamen',
        'nombre',
        'puntaje_por_pregunta',
        'duracion_minutos',
        'orden',
    ];

    protected $casts = [
        'idExamen' => 'integer',
        'puntaje_por_pregunta' => 'decimal:2',
        'duracion_minutos' => 'integer',
        'orden' => 'integer',
    ];

    // Relaciones
    public function examen()
    {
        return $this->belongsTo(Examen::class, 'idExamen', 'idExamen');
    }

    public function reglasPuntaje()
    {
        return $this->hasMany(ReglaPuntaje::class, 'idSubprueba', 'idSubprueba');
    }

    // Obtener preguntas de esta subprueba a través de la tabla examen_pregunta
    // La relación se accede a través del examen filtrando por idSubprueba en el pivot
    // Ejemplo de uso: $subprueba->examen->preguntas()->wherePivot('idSubprueba', $subprueba->idSubprueba)->get()
    // Esta relación no se puede definir directamente con Eloquent porque la tabla pivot tiene
    // idExamen e idPregunta como claves principales, e idSubprueba como campo adicional
    // Se accede a través de: $this->examen->preguntas()->wherePivot('idSubprueba', $this->idSubprueba)

    public function resultados()
    {
        return $this->hasMany(ResultadoSubprueba::class, 'idSubprueba', 'idSubprueba');
    }
}

