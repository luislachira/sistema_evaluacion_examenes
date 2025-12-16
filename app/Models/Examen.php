<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Examen extends Model
{
    use HasFactory;

    protected $table = 'examenes';
    protected $primaryKey = 'idExamen';
    public $incrementing = true;

    /**
     * Get the route key for the model.
     * Esto permite que Laravel use idExamen en lugar de id para el route model binding
     */
    public function getRouteKeyName()
    {
        return 'idExamen';
    }

    protected $fillable = [
        'idTipoConcurso',
        'codigo_examen',
        'titulo',
        'descripcion',
        'tiempo_limite',
        'tipo_acceso',
        'estado',
        'paso_actual',
        'fecha_inicio_vigencia',
        'fecha_fin_vigencia',
        'fecha_publicacion',
        'fecha_finalizacion',
    ];

    protected $casts = [
        'idTipoConcurso' => 'integer',
        'tiempo_limite' => 'integer',
        'paso_actual' => 'integer',
        'fecha_publicacion' => 'datetime',
        'fecha_finalizacion' => 'datetime',
        // No usar 'datetime' cast para fechas de vigencia para evitar conversiones automáticas de zona horaria
        // Se manejarán manualmente para mantener las fechas fijas
    ];

    /**
     * Accessor para fecha_inicio_vigencia
     * Devuelve la fecha tal como está en la base de datos sin conversión de zona horaria
     */
    public function getFechaInicioVigenciaAttribute($value)
    {
        try {
            if (!$value || $value === '0000-00-00 00:00:00' || trim($value) === '') {
                return null;
            }
            // Si ya es una instancia de Carbon, retornarla directamente
            if ($value instanceof \Carbon\Carbon) {
                return $value->setTimezone('UTC');
            }
            // Parsear como string y retornar en UTC para evitar conversiones
            try {
                // Intentar primero con el formato esperado
                return \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $value, 'UTC')->setTimezone('UTC');
            } catch (\Exception $e) {
                // Si falla, intentar parsear con Carbon::parse que es más flexible
                try {
                    return \Carbon\Carbon::parse($value)->setTimezone('UTC');
                } catch (\Exception $e2) {
                    // Si todo falla, retornar null y registrar el error
                    \Illuminate\Support\Facades\Log::warning('Error al parsear fecha_inicio_vigencia en accessor', [
                        'examen_id' => $this->idExamen ?? null,
                        'value' => $value,
                        'error' => $e2->getMessage()
                    ]);
                    return null;
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Error general en accessor fecha_inicio_vigencia', [
                'examen_id' => $this->idExamen ?? null,
                'value' => $value,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Accessor para fecha_fin_vigencia
     * Devuelve la fecha tal como está en la base de datos sin conversión de zona horaria
     */
    public function getFechaFinVigenciaAttribute($value)
    {
        try {
            if (!$value || $value === '0000-00-00 00:00:00' || trim($value) === '') {
                return null;
            }
            // Si ya es una instancia de Carbon, retornarla directamente
            if ($value instanceof \Carbon\Carbon) {
                return $value->setTimezone('UTC');
            }
            // Parsear como string y retornar en UTC para evitar conversiones
            try {
                // Intentar primero con el formato esperado
                return \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $value, 'UTC')->setTimezone('UTC');
            } catch (\Exception $e) {
                // Si falla, intentar parsear con Carbon::parse que es más flexible
                try {
                    return \Carbon\Carbon::parse($value)->setTimezone('UTC');
                } catch (\Exception $e2) {
                    // Si todo falla, retornar null y registrar el error
                    \Illuminate\Support\Facades\Log::warning('Error al parsear fecha_fin_vigencia en accessor', [
                        'examen_id' => $this->idExamen ?? null,
                        'value' => $value,
                        'error' => $e2->getMessage()
                    ]);
                    return null;
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Error general en accessor fecha_fin_vigencia', [
                'examen_id' => $this->idExamen ?? null,
                'value' => $value,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Mutator para fecha_inicio_vigencia
     * Guarda la fecha tal como viene sin conversión de zona horaria
     */
    public function setFechaInicioVigenciaAttribute($value)
    {
        if (!$value) {
            $this->attributes['fecha_inicio_vigencia'] = null;
            return;
        }
        // Si es string, guardarlo directamente
        if (is_string($value)) {
            $this->attributes['fecha_inicio_vigencia'] = $value;
            return;
        }
        // Si es Carbon, formatearlo como string en UTC
        if ($value instanceof \Carbon\Carbon) {
            $this->attributes['fecha_inicio_vigencia'] = $value->setTimezone('UTC')->format('Y-m-d H:i:s');
            return;
        }
        $this->attributes['fecha_inicio_vigencia'] = $value;
    }

    /**
     * Mutator para fecha_fin_vigencia
     * Guarda la fecha tal como viene sin conversión de zona horaria
     */
    public function setFechaFinVigenciaAttribute($value)
    {
        if (!$value) {
            $this->attributes['fecha_fin_vigencia'] = null;
            return;
        }
        // Si es string, guardarlo directamente
        if (is_string($value)) {
            $this->attributes['fecha_fin_vigencia'] = $value;
            return;
        }
        // Si es Carbon, formatearlo como string en UTC
        if ($value instanceof \Carbon\Carbon) {
            $this->attributes['fecha_fin_vigencia'] = $value->setTimezone('UTC')->format('Y-m-d H:i:s');
            return;
        }
        $this->attributes['fecha_fin_vigencia'] = $value;
    }

    // Relaciones
    public function tipoConcurso()
    {
        return $this->belongsTo(TipoConcurso::class, 'idTipoConcurso', 'idTipoConcurso');
    }

    public function subpruebas()
    {
        return $this->hasMany(Subprueba::class, 'idExamen', 'idExamen');
    }

    public function postulaciones()
    {
        return $this->hasMany(Postulacion::class, 'idExamen', 'idExamen');
    }

    public function usuariosAsignados()
    {
        return $this->hasMany(ExamenesUsuario::class, 'idExamen', 'idExamen');
    }

    public function intentos()
    {
        return $this->hasMany(IntentoExamen::class, 'idExamen', 'idExamen');
    }

    public function preguntas()
    {
        return $this->belongsToMany(Pregunta::class, 'examen_pregunta', 'idExamen', 'idPregunta')
            ->withPivot('orden', 'idSubprueba')
            ->orderBy('examen_pregunta.orden')
            ->withTimestamps();
    }

    /**
     * Sobrescribir toArray para evitar problemas al serializar
     * Solo incluir relaciones que estén cargadas explícitamente
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Asegurar que las fechas se serialicen correctamente
        try {
            if (isset($array['fecha_inicio_vigencia']) && $array['fecha_inicio_vigencia'] instanceof \Carbon\Carbon) {
                $array['fecha_inicio_vigencia'] = $array['fecha_inicio_vigencia']->format('Y-m-d H:i:s');
            }
        } catch (\Exception $e) {
            $array['fecha_inicio_vigencia'] = null;
        }

        try {
            if (isset($array['fecha_fin_vigencia']) && $array['fecha_fin_vigencia'] instanceof \Carbon\Carbon) {
                $array['fecha_fin_vigencia'] = $array['fecha_fin_vigencia']->format('Y-m-d H:i:s');
            }
        } catch (\Exception $e) {
            $array['fecha_fin_vigencia'] = null;
        }

        return $array;
    }

    /**
     * Verifica y actualiza automáticamente los estados de los exámenes basándose en las fechas de vigencia.
     * Este método se puede llamar desde cualquier parte del sistema y se ejecutará automáticamente.
     *
     * @return array ['publicados' => int, 'finalizados' => int]
     */
    public static function actualizarEstadosAutomaticamente(): array
    {
        // Usar el servicio centralizado para garantizar consistencia
        $ahoraStr = \App\Services\FechaService::ahoraString();
        $ahora = \App\Services\FechaService::ahora();

        $publicados = 0;
        $finalizados = 0;

        try {
            \Illuminate\Support\Facades\DB::beginTransaction();

            // 1. PUBLICAR EXÁMENES: Cambiar de Borrador (0) a Publicado (1)
            // IMPORTANTE: Solo publicar si el examen está completo
            $examenesParaPublicar = self::where('estado', '0')
                ->whereNotNull('fecha_inicio_vigencia')
                ->get();

            $completitudService = new \App\Services\ExamenCompletitudService();

            foreach ($examenesParaPublicar as $examen) {
                $fechaInicioRaw = $examen->getRawOriginal('fecha_inicio_vigencia');

                if ($fechaInicioRaw && strcmp($ahoraStr, $fechaInicioRaw) >= 0) {
                    // Verificar que el examen esté completo antes de publicar
                    if ($completitudService->puedePublicar($examen)) {
                        $examen->estado = '1';
                        $examen->save();
                        $publicados++;

                        \Illuminate\Support\Facades\Log::info('Examen publicado automáticamente por fecha_inicio_vigencia', [
                            'examen_id' => $examen->idExamen,
                            'codigo_examen' => $examen->codigo_examen,
                            'fecha_inicio_vigencia' => $fechaInicioRaw,
                            'hora_actual' => $ahoraStr,
                        ]);
                    } else {
                        \Illuminate\Support\Facades\Log::info('Examen no publicado automáticamente: no está completo', [
                            'examen_id' => $examen->idExamen,
                            'codigo_examen' => $examen->codigo_examen,
                            'fecha_inicio_vigencia' => $fechaInicioRaw,
                            'hora_actual' => $ahoraStr,
                        ]);
                    }
                }
            }

            // 2. FINALIZAR EXÁMENES: Cambiar de Publicado (1) a Finalizado (2)
            $examenesParaFinalizar = self::where('estado', '1')
                ->whereNotNull('fecha_fin_vigencia')
                ->with('intentos')
                ->get();

            foreach ($examenesParaFinalizar as $examen) {
                $fechaFinRaw = $examen->getRawOriginal('fecha_fin_vigencia');

                if ($fechaFinRaw && strcmp($ahoraStr, $fechaFinRaw) >= 0) {
                    // Cerrar todos los intentos en progreso
                    $intentosEnProgreso = $examen->intentos()->where('estado', 'iniciado')->get();
                    foreach ($intentosEnProgreso as $intento) {
                        $intento->estado = 'enviado';
                        $intento->hora_fin = $ahora;
                        $intento->save();
                    }

                    $examen->estado = '2';
                    $examen->save();
                    $finalizados++;

                    \Illuminate\Support\Facades\Log::info('Examen finalizado automáticamente por fecha_fin_vigencia', [
                        'examen_id' => $examen->idExamen,
                        'codigo_examen' => $examen->codigo_examen,
                        'fecha_fin_vigencia' => $fechaFinRaw,
                        'hora_actual' => $ahoraStr,
                        'intentos_cerrados' => $intentosEnProgreso->count(),
                    ]);

                    // Ejecutar el comando para asegurar que todos los intentos estén cerrados
                    try {
                        \Illuminate\Support\Facades\Artisan::call('examenes:cerrar-intentos-finalizados');
                        \Illuminate\Support\Facades\Log::info('Comando cerrar-intentos-finalizados ejecutado después de finalizar examen automáticamente', [
                            'examen_id' => $examen->idExamen,
                            'codigo_examen' => $examen->codigo_examen,
                        ]);
                    } catch (\Exception $e) {
                        // No fallar si el comando tiene un error, solo registrar
                        \Illuminate\Support\Facades\Log::warning('Error al ejecutar comando cerrar-intentos-finalizados en finalización automática', [
                            'examen_id' => $examen->idExamen,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }

            \Illuminate\Support\Facades\DB::commit();

            return [
                'publicados' => $publicados,
                'finalizados' => $finalizados
            ];
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Error al actualizar estados de exámenes automáticamente', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return [
                'publicados' => 0,
                'finalizados' => 0
            ];
        }
    }

    /**
     * Boot del modelo - se ejecuta automáticamente cuando se consulta un examen individual
     */
    protected static function boot()
    {
        parent::boot();

        // Evento que se ejecuta antes de actualizar el modelo
        static::updating(function ($examen) {
            // Si el estado está cambiando a '2' (Finalizado), cerrar todos los intentos en progreso
            if ($examen->isDirty('estado') && $examen->estado === '2' && $examen->getOriginal('estado') !== '2') {
                $intentosEnProgreso = $examen->intentos()->where('estado', 'iniciado')->get();
                $ahora = \App\Services\FechaService::ahora();

                foreach ($intentosEnProgreso as $intento) {
                    $intento->estado = 'enviado';
                    $intento->hora_fin = $ahora;
                    $intento->save();
                }

                \Illuminate\Support\Facades\Log::info('Examen finalizado - intentos cerrados automáticamente', [
                    'examen_id' => $examen->idExamen,
                    'codigo_examen' => $examen->codigo_examen ?? null,
                    'intentos_cerrados' => $intentosEnProgreso->count(),
                ]);
            }
        });

        // Verificar y actualizar el estado del examen cuando se accede a él
        static::retrieved(function ($examen) {
            try {
                // Obtener valores raw primero para evitar problemas con accessors
                $fechaInicioRaw = null;
                $fechaFinRaw = null;
                $estado = null;

                try {
                    $fechaInicioRaw = $examen->getRawOriginal('fecha_inicio_vigencia');
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Error al obtener fecha_inicio_vigencia raw en evento retrieved', [
                        'examen_id' => $examen->idExamen ?? null,
                        'error' => $e->getMessage()
                    ]);
                }

                try {
                    $fechaFinRaw = $examen->getRawOriginal('fecha_fin_vigencia');
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Error al obtener fecha_fin_vigencia raw en evento retrieved', [
                        'examen_id' => $examen->idExamen ?? null,
                        'error' => $e->getMessage()
                    ]);
                }

                try {
                    $estado = $examen->getRawOriginal('estado') ?? $examen->estado ?? '0';
                } catch (\Exception $e) {
                    $estado = '0';
                }

                // Solo verificar si el examen tiene fechas de vigencia y no está en el estado final
                if (($fechaInicioRaw || $fechaFinRaw) && $estado !== '2') {
                    // Usar el servicio centralizado para garantizar consistencia
                    $ahora = \App\Services\FechaService::ahora();
                    $ahoraStr = \App\Services\FechaService::ahoraString();

                    $necesitaActualizacion = false;

                    // Verificar si necesita publicarse
                    // IMPORTANTE: Solo publicar automáticamente si el examen está completo
                    if ($estado === '0' && $fechaInicioRaw && strcmp($ahoraStr, $fechaInicioRaw) >= 0) {
                        try {
                            // Verificar que el examen esté completo antes de publicar
                            // Cargar relaciones necesarias de forma segura
                            try {
                                if (!$examen->relationLoaded('subpruebas')) {
                                    $examen->load('subpruebas');
                                }
                            } catch (\Exception $e) {
                                \Illuminate\Support\Facades\Log::warning('Error al cargar subpruebas en evento retrieved para puedePublicar', [
                                    'examen_id' => $examen->idExamen ?? null,
                                    'error' => $e->getMessage()
                                ]);
                                // No continuar si no se pueden cargar las relaciones necesarias
                                return;
                            }

                            try {
                                if (!$examen->relationLoaded('postulaciones')) {
                                    $examen->load('postulaciones');
                                }
                            } catch (\Exception $e) {
                                \Illuminate\Support\Facades\Log::warning('Error al cargar postulaciones en evento retrieved para puedePublicar', [
                                    'examen_id' => $examen->idExamen ?? null,
                                    'error' => $e->getMessage()
                                ]);
                                // No continuar si no se pueden cargar las relaciones necesarias
                                return;
                            }

                            $completitudService = new \App\Services\ExamenCompletitudService();
                            if ($completitudService->puedePublicar($examen)) {
                                $examen->estado = '1';
                                $necesitaActualizacion = true;
                            }
                        } catch (\Exception $e) {
                            \Illuminate\Support\Facades\Log::warning('Error al verificar completitud en evento retrieved', [
                                'examen_id' => $examen->idExamen ?? null,
                                'error' => $e->getMessage(),
                                'trace' => $e->getTraceAsString()
                            ]);
                            // No actualizar el estado si hay error
                        }
                    }

                    // Verificar si necesita finalizarse
                    if ($estado === '1' && $fechaFinRaw && strcmp($ahoraStr, $fechaFinRaw) >= 0) {
                        try {
                            $intentosEnProgreso = $examen->intentos()->where('estado', 'iniciado')->get();
                            foreach ($intentosEnProgreso as $intento) {
                                $intento->estado = 'enviado';
                                $intento->hora_fin = $ahora;
                                $intento->save();
                            }
                            $examen->estado = '2';
                            $necesitaActualizacion = true;

                            // Ejecutar el comando para asegurar que todos los intentos estén cerrados
                            try {
                                \Illuminate\Support\Facades\Artisan::call('examenes:cerrar-intentos-finalizados');
                                \Illuminate\Support\Facades\Log::info('Comando cerrar-intentos-finalizados ejecutado después de finalizar examen en evento retrieved', [
                                    'examen_id' => $examen->idExamen ?? null,
                                    'codigo_examen' => $examen->codigo_examen ?? null,
                                ]);
                            } catch (\Exception $e) {
                                // No fallar si el comando tiene un error, solo registrar
                                \Illuminate\Support\Facades\Log::warning('Error al ejecutar comando cerrar-intentos-finalizados en evento retrieved', [
                                    'examen_id' => $examen->idExamen ?? null,
                                    'error' => $e->getMessage(),
                                ]);
                            }
                        } catch (\Exception $e) {
                            \Illuminate\Support\Facades\Log::warning('Error al finalizar examen en evento retrieved', [
                                'examen_id' => $examen->idExamen ?? null,
                                'error' => $e->getMessage()
                            ]);
                        }
                    }

                    if ($necesitaActualizacion) {
                        try {
                            $examen->save();
                        } catch (\Exception $e) {
                            \Illuminate\Support\Facades\Log::error('Error al guardar examen en evento retrieved', [
                                'examen_id' => $examen->idExamen ?? null,
                                'error' => $e->getMessage()
                            ]);
                        }
                    }
                }
            } catch (\Exception $e) {
                // Si hay cualquier error en el evento retrieved, registrarlo pero no fallar
                // Esto evita que el evento cause errores 500 en las consultas
                \Illuminate\Support\Facades\Log::error('Error en evento retrieved del modelo Examen', [
                    'examen_id' => $examen->idExamen ?? null,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        });
    }
}
