<?php

namespace App\Http\Resources;

use App\Services\ExamenCompletitudService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ExamenResource extends JsonResource
{
    /**
     * Helper method to safely format dates from raw database value
     * This avoids issues with custom accessors
     */
    private function getFormattedDateFromRaw(string $attribute): ?string
    {
        try {
            // Primero intentar acceder normalmente (puede funcionar si el accessor no falla)
            try {
                $value = $this->resource->$attribute ?? null;
                if ($value) {
                    return $this->getFormattedDate($value);
                }
            } catch (\Exception $e) {
                // Si el accessor falla, continuar con métodos alternativos
            }

            // Si no hay valor o el accessor falló, intentar obtener el valor raw
            try {
                $attributes = $this->resource->getAttributes();
                if (isset($attributes[$attribute])) {
                    $rawValue = $attributes[$attribute];
                    if ($rawValue) {
                        return $this->getFormattedDate($rawValue);
                    }
                }
            } catch (\Exception $e) {
                // Si falla, continuar
            }

            // Último intento con getRawOriginal
            try {
                $rawValue = $this->resource->getRawOriginal($attribute);
                if ($rawValue) {
                    return $this->getFormattedDate($rawValue);
                }
            } catch (\Exception $e) {
                // Si todo falla, retornar null
            }

            return null;
        } catch (\Exception $e) {
            // Si hay cualquier error, retornar null
            return null;
        }
    }

    /**
     * Helper method to safely format dates
     */
    private function getFormattedDate($date): ?string
    {
        if (!$date) {
            return null;
        }

        try {
            // Si es una instancia de Carbon, formatear directamente
            if ($date instanceof Carbon) {
                return $date->format('d-m-Y H:i');
            }

            // Si es string, intentar parsearlo
            if (is_string($date)) {
                // Si el string está vacío, retornar null
                if (trim($date) === '') {
                    return null;
                }
                return Carbon::parse($date)->format('d-m-Y H:i');
            }

            // Si es un objeto DateTime, convertirlo a Carbon
            if ($date instanceof \DateTime) {
                return Carbon::instance($date)->format('d-m-Y H:i');
            }

            return null;
        } catch (\Exception $e) {
            // Si hay error al parsear, retornar null en lugar de lanzar excepción
            Log::warning('Error al formatear fecha en ExamenResource: ' . $e->getMessage(), [
                'date_type' => gettype($date),
                'date_value' => is_string($date) ? $date : (is_object($date) ? get_class($date) : 'unknown')
            ]);
            return null;
        }
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Inicializar variables con valores por defecto
        $totalPreguntas = 0;
        $vecesUsado = 0;
        $intentosCompletados = 0;
        $intentosEnProgreso = 0;
        $promedioPuntaje = null;
        $completitud = 0;
        $estadoPasos = null;

        try {
            // Calcular campos derivados para compatibilidad con frontend
            // Usar withCount si está disponible, sino usar relación cargada
            $totalPreguntas = $this->preguntas_count ?? ($this->relationLoaded('preguntas') ? $this->preguntas->count() : 0);
            $vecesUsado = $this->intentos_count ?? ($this->relationLoaded('intentos') ? $this->intentos->count() : 0);

            // Calcular estadísticas de intentos de manera eficiente
            // Usar consultas directas para evitar cargar todos los intentos en memoria
            try {
                $intentosCompletados = $this->intentos()->where('estado', 'enviado')->count();
                $intentosEnProgreso = $this->intentos()->where('estado', 'iniciado')->count();

                // Calcular promedio de puntaje solo de intentos finalizados
                if ($intentosCompletados > 0) {
                    $promedioPuntaje = round($this->intentos()->where('estado', 'enviado')->avg('puntaje') ?? 0, 2);
                }
            } catch (\Exception $e) {
                // Si hay error al calcular estadísticas, usar valores por defecto
                Log::warning('Error al calcular estadísticas de intentos en ExamenResource: ' . $e->getMessage());
            }

            // Calcular completitud del examen
            try {
                $completitudService = new ExamenCompletitudService();
                $completitud = $completitudService->calcularCompletitud($this->resource);
                $estadoPasos = $completitudService->obtenerEstadoPasos($this->resource);
            } catch (\Exception $e) {
                // Si hay error, usar valores por defecto
                Log::warning('Error al calcular completitud en ExamenResource: ' . $e->getMessage());
            }
        } catch (\Exception $e) {
            // Si hay error en cálculos, usar valores por defecto
            Log::warning('Error general en ExamenResource::toArray: ' . $e->getMessage());
        }

        return [
            'idExamen' => $this->idExamen,
            'id' => $this->idExamen, // Compatibilidad con frontend
            'codigo_examen' => $this->codigo_examen,
            'codigo' => $this->codigo_examen, // Compatibilidad con frontend
            'titulo' => $this->titulo,
            'descripcion' => $this->descripcion,
            'idTipoConcurso' => $this->idTipoConcurso,
            'tiempo_limite' => $this->tiempo_limite,
            'duracion_minutos' => $this->tiempo_limite, // Compatibilidad con frontend
            'tipo_acceso' => $this->tipo_acceso,
            'publico' => $this->tipo_acceso === 'publico', // Compatibilidad con frontend
            'estado' => $this->estado ?? '0', // '0': Borrador, '1': Publicado, '2': Finalizado
            'created_at' => $this->getFormattedDate($this->created_at),
            'updated_at' => $this->getFormattedDate($this->updated_at),
            'fecha_creacion' => $this->getFormattedDate($this->created_at), // Compatibilidad con frontend
            'fecha_inicio_vigencia' => $this->getFormattedDateFromRaw('fecha_inicio_vigencia'),
            'fecha_fin_vigencia' => $this->getFormattedDateFromRaw('fecha_fin_vigencia'),
            'paso_actual' => $this->paso_actual ?? 0,
            'fecha_publicacion' => $this->getFormattedDate($this->fecha_publicacion ?? null),
            'fecha_finalizacion' => $this->getFormattedDate($this->fecha_finalizacion ?? null),
            'completitud' => $completitud,
            'estado_pasos' => $estadoPasos,
            // Campos calculados para compatibilidad con frontend
            'total_preguntas' => $totalPreguntas,
            'veces_usado' => $vecesUsado,
            'intentos_completados' => $intentosCompletados,
            'intentos_en_progreso' => $intentosEnProgreso,
            'promedio_puntaje' => $promedioPuntaje,
            'activo' => $this->estado === '1', // Compatibilidad con frontend
            'tipoConcurso' => $this->whenLoaded('tipoConcurso', function () {
                return [
                    'idTipoConcurso' => $this->tipoConcurso->idTipoConcurso,
                    'nombre' => $this->tipoConcurso->nombre,
                ];
            }),
            'subpruebas' => $this->whenLoaded('subpruebas', function () {
                return $this->subpruebas->map(function ($subprueba) {
                    return [
                        'idSubprueba' => $subprueba->idSubprueba,
                        'nombre' => $subprueba->nombre,
                        'puntaje_por_pregunta' => $subprueba->puntaje_por_pregunta,
                    ];
                });
            }),
            'preguntas' => $this->whenLoaded('preguntas', function () {
                return $this->preguntas->map(function ($pregunta) {
                    return [
                        'idPregunta' => $pregunta->idPregunta,
                        'codigo' => $pregunta->codigo,
                        'enunciado' => $pregunta->enunciado,
                        'categoria' => $pregunta->relationLoaded('categoria') && $pregunta->categoria ? [
                            'idCategoria' => $pregunta->categoria->idCategoria,
                            'nombre' => $pregunta->categoria->nombre,
                        ] : null,
                        'contexto' => $pregunta->relationLoaded('contexto') && $pregunta->contexto ? [
                            'idContexto' => $pregunta->contexto->idContexto,
                            'titulo' => $pregunta->contexto->titulo,
                        ] : null,
                        'opciones' => $pregunta->relationLoaded('opciones') ? $pregunta->opciones->map(function ($opcion) {
                            return [
                                'idOpcion' => $opcion->idOpcion,
                                'contenido' => $opcion->contenido,
                                'es_correcta' => (bool) $opcion->es_correcta,
                            ];
                        })->values()->all() : [],
                        'pivot' => isset($pregunta->pivot) ? [
                            'orden' => $pregunta->pivot->orden ?? null,
                            'idSubprueba' => $pregunta->pivot->idSubprueba ?? null,
                        ] : null,
                    ];
                });
            }),
            'intentos' => $this->whenLoaded('intentos', function () {
                return $this->intentos->count();
            }),
            'usuariosAsignados' => $this->whenLoaded('usuariosAsignados', function () {
                return $this->usuariosAsignados->map(function ($examenUsuario) {
                    // ExamenesUsuario tiene una relación con Usuario
                    $usuario = $examenUsuario->usuario ?? null;
                    return [
                        'idUsuario' => $examenUsuario->idUsuario,
                        'nombre' => $usuario ? $usuario->nombre : null,
                        'apellidos' => $usuario ? $usuario->apellidos : null,
                        'correo' => $usuario ? ($usuario->correo ?? $usuario->email) : null,
                    ];
                });
            }),
            'postulaciones' => $this->whenLoaded('postulaciones', function () {
                return $this->postulaciones->map(function ($postulacion) {
                    try {
                        // Obtener IDs de subpruebas válidas del examen
                        $subpruebasValidasIds = [];
                        if ($this->relationLoaded('subpruebas') && $this->subpruebas) {
                            $subpruebasValidasIds = $this->subpruebas->pluck('idSubprueba')->toArray();
                        }

                        // Si no hay subpruebas válidas, retornar array vacío
                        if (empty($subpruebasValidasIds)) {
                            $subpruebas = [];
                        } else {
                            // Cargar reglas de puntaje solo con subpruebas válidas
                            $reglasPuntaje = $postulacion->reglasPuntaje()
                                ->whereIn('idSubprueba', $subpruebasValidasIds)
                                ->with(['subprueba' => function ($query) {
                                    $query->whereNotNull('idSubprueba');
                                }])
                                ->get();

                            $subpruebasMap = [];

                            foreach ($reglasPuntaje as $regla) {
                                // Validar que la subprueba exista y esté cargada
                                if (!$regla->relationLoaded('subprueba') || !$regla->subprueba) {
                                    continue;
                                }

                                $idSubprueba = $regla->subprueba->idSubprueba;

                                // Evitar duplicados usando el idSubprueba como clave
                                if (!isset($subpruebasMap[$idSubprueba])) {
                                    $subpruebasMap[$idSubprueba] = [
                                        'idSubprueba' => $idSubprueba,
                                        'nombre' => $regla->subprueba->nombre ?? '',
                                        'puntaje_minimo' => (float)($regla->puntaje_minimo_subprueba ?? 0),
                                    ];
                                }
                            }

                            $subpruebas = array_values($subpruebasMap);
                        }
                    } catch (\Exception $e) {
                        // Si hay algún error, retornar array vacío
                        \Illuminate\Support\Facades\Log::warning('Error al cargar subpruebas en ExamenResource: ' . $e->getMessage(), [
                            'postulacion_id' => $postulacion->idPostulacion ?? 'unknown',
                            'error' => $e->getMessage()
                        ]);
                        $subpruebas = [];
                    }

                    return [
                        'idPostulacion' => $postulacion->idPostulacion,
                        'nombre' => $postulacion->nombre,
                        'descripcion' => $postulacion->descripcion,
                        'tipo_aprobacion' => $postulacion->tipo_aprobacion ?? '0',
                        'subpruebas' => $subpruebas,
                    ];
                });
            }),
        ];
    }
}
