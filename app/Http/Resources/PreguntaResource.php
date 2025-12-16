<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PreguntaResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->idPregunta,
            'texto' => $this->texto,
            'respuesta_correcta' => $this->respuesta_correcta,
            'tema' => $this->whenLoaded('tema', function () {
                return [
                    'id' => $this->tema->idTema,
                    'nombre' => $this->tema->nombre,
                ];
            }),
            'contexto' => $this->whenLoaded('contexto', function () {
                return $this->contexto ? [
                    'id' => $this->contexto->idContexto,
                    'titulo' => $this->contexto->titulo,
                    'texto' => $this->contexto->texto,
                ] : null;
            }),
            'dificultad' => $this->dificultad, // '0','1','2'
            'ano' => $this->ano,
            'version_examen' => $this->version_examen,
            'tiene_contexto' => (bool) $this->tiene_contexto,
            'grupo_preguntas' => $this->grupo_preguntas,
            'idContexto' => $this->idContexto,
            'estadisticas' => [
                'veces_usada' => $this->veces_usada,
                'acierto' => $this->porcentaje_acierto,
                'ultimo_uso' => optional($this->ultimo_uso)->format('d-m-Y'),
            ],
            'activo' => (bool) $this->activo,
            'observaciones' => $this->observaciones,
            'opciones' => $this->whenLoaded('opciones', function () {
                return $this->opciones->map(function ($op) {
                    return [
                        'id' => $op->idOpcion,
                        'letra' => $op->letra,
                        'texto' => $op->texto,
                        'es_correcta' => (bool) $op->es_correcta,
                        'orden' => $op->orden,
                    ];
                });
            }),
            'archivos_adjuntos' => $this->whenLoaded('archivosAdjuntos', function () {
                return $this->archivosAdjuntos->map(function ($archivo) {
                    return [
                        'id' => $archivo->idArchivoAdjunto,
                        'nombre' => $archivo->nombre_original,
                        'url' => $archivo->url,
                        'tipo_mime' => $archivo->tipo_mime,
                    ];
                });
            }),
            'created_at' => optional($this->created_at)->format('d-m-Y'),
            'updated_at' => optional($this->updated_at)->format('d-m-Y'),
        ];
    }
}
