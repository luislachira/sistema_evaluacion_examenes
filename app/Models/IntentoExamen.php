<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IntentoExamen extends Model
{
    use HasFactory;

    protected $table = 'intento_examenes';
    protected $primaryKey = 'idIntento';
    public $incrementing = true;

    protected $fillable = [
        'idExamen',
        'idUsuario',
        'idPostulacion',
        'idSubpruebaSeleccionada',
        'ultima_pregunta_vista',
        'hora_inicio',
        'hora_fin',
        'estado',
        'puntaje',
        'es_aprobado',
    ];

    protected $casts = [
        'idExamen' => 'integer',
        'idUsuario' => 'integer',
        'idPostulacion' => 'integer',
        'idSubpruebaSeleccionada' => 'integer',
        'ultima_pregunta_vista' => 'integer',
        'hora_inicio' => 'datetime',
        'hora_fin' => 'datetime',
        'puntaje' => 'decimal:2',
        'es_aprobado' => 'boolean',
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

    public function respuestas()
    {
        return $this->hasMany(RespuestaIntento::class, 'idIntento', 'idIntento');
    }

    public function postulacion()
    {
        return $this->belongsTo(Postulacion::class, 'idPostulacion', 'idPostulacion');
    }

    public function resultadosSubprueba()
    {
        return $this->hasMany(ResultadoSubprueba::class, 'idIntento', 'idIntento');
    }

    public function subpruebaSeleccionada()
    {
        return $this->belongsTo(Subprueba::class, 'idSubpruebaSeleccionada', 'idSubprueba');
    }
}
