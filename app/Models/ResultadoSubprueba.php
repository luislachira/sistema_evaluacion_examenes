<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResultadoSubprueba extends Model
{
    use HasFactory;

    protected $table = 'resultado_subpruebas';
    protected $primaryKey = 'idResultado';
    public $incrementing = true;

    protected $fillable = [
        'idIntento',
        'idSubprueba',
        'puntaje_obtenido',
        'puntaje_minimo_requerido',
        'es_aprobado',
    ];

    protected $casts = [
        'idIntento' => 'integer',
        'idSubprueba' => 'integer',
        'puntaje_obtenido' => 'decimal:2',
        'puntaje_minimo_requerido' => 'decimal:2',
        'es_aprobado' => 'boolean',
    ];

    // Relaciones
    public function intento()
    {
        return $this->belongsTo(IntentoExamen::class, 'idIntento', 'idIntento');
    }

    public function subprueba()
    {
        return $this->belongsTo(Subprueba::class, 'idSubprueba', 'idSubprueba');
    }
}

