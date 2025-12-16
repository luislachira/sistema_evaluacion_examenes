<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReglaPuntaje extends Model
{
    use HasFactory;

    protected $table = 'regla_puntajes';
    protected $primaryKey = 'idRegla';
    public $incrementing = true;

    protected $fillable = [
        'idPostulacion',
        'idSubprueba',
        'puntaje_correcto',
        'puntaje_incorrecto',
        'puntaje_en_blanco',
        'puntaje_minimo_subprueba',
    ];

    protected $casts = [
        'idPostulacion' => 'integer',
        'idSubprueba' => 'integer',
        'puntaje_correcto' => 'decimal:2',
        'puntaje_incorrecto' => 'decimal:2',
        'puntaje_en_blanco' => 'decimal:2',
        'puntaje_minimo_subprueba' => 'decimal:2',
    ];

    // Relaciones
    public function postulacion()
    {
        return $this->belongsTo(Postulacion::class, 'idPostulacion', 'idPostulacion');
    }

    public function subprueba()
    {
        return $this->belongsTo(Subprueba::class, 'idSubprueba', 'idSubprueba');
    }
}

