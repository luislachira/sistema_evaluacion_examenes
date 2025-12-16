<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ArchivoAdjunto extends Model
{
    use HasFactory;

    protected $table = 'archivo_adjuntos';
    protected $primaryKey = 'idArchivoAdjunto';
    public $incrementing = true;

    protected $fillable = [
        'nombre_original',
        'ruta',
        'tipo_recurso',
        'id_recurso',
        'subido_por',
        'fecha_subida',
    ];

    protected $casts = [
        'id_recurso' => 'integer',
        'subido_por' => 'integer',
        'fecha_subida' => 'datetime',
    ];

    // Relaciones
    public function subidoPor()
    {
        return $this->belongsTo(Usuario::class, 'subido_por', 'idUsuario');
    }

    // Relación polimórfica basada en tipo_recurso
    public function recurso()
    {
        return $this->morphTo('recurso', 'tipo_recurso', 'id_recurso');
    }

    /**
     * Accessor para obtener la URL pública del archivo
     */
    public function getUrlAttribute()
    {
        if (empty($this->ruta)) {
            return null;
        }

        // Obtener la URL usando Storage
        $url = Storage::disk('public')->url($this->ruta);
        
        // Si la URL no es absoluta, convertirla a absoluta usando APP_URL
        if (!str_starts_with($url, 'http://') && !str_starts_with($url, 'https://')) {
            $baseUrl = rtrim(config('app.url'), '/');
            $url = $baseUrl . '/' . ltrim($url, '/');
        }

        return $url;
    }
}
