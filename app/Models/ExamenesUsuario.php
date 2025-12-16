<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExamenesUsuario extends Model
{
    use HasFactory;

    protected $table = 'examenes_usuarios';
    protected $primaryKey = 'idExamenUsuario';
    public $incrementing = true;

    protected $fillable = [
        'idExamen',
        'idUsuario',
        'asignado_por',
        'fecha_asignacion',
        'observaciones',
    ];

    protected $casts = [
        'idExamen' => 'integer',
        'idUsuario' => 'integer',
        'asignado_por' => 'integer',
        'fecha_asignacion' => 'datetime',
    ];

    // Relaciones
    public function examen()
    {
        return $this->belongsTo(Examen::class, 'idExamen', 'idExamen');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'idUsuario', 'idUsuario');
    }

    public function asignador()
    {
        return $this->belongsTo(Usuario::class, 'asignado_por', 'idUsuario');
    }
}

