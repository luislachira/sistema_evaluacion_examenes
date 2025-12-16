<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TipoConcurso extends Model
{
    use HasFactory;

    protected $table = 'tipo_concursos';
    protected $primaryKey = 'idTipoConcurso';
    public $incrementing = true;

    protected $fillable = [
        'nombre',
    ];

    // Relaciones
    public function examenes()
    {
        return $this->hasMany(Examen::class, 'idTipoConcurso', 'idTipoConcurso');
    }
}

