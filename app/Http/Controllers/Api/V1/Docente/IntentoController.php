<?php

namespace App\Http\Controllers\Api\V1\Docente;

use App\Http\Controllers\Controller;
use App\Traits\ValidatesUserPermissions;
use App\Models\IntentoExamen;
use App\Models\Examen;
use App\Models\RespuestaIntento;
use App\Models\ReglaPuntaje;
use App\Models\Subprueba;
use App\Models\ResultadoSubprueba;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class IntentoController extends Controller
{
    use ValidatesUserPermissions;
    /**
     * Cargar intento existente en curso para un examen
     * RF-D.2.2: Cargar intento ya iniciado
     */
    public function cargarIntento(Examen $examen)
    {
        // Validar que el usuario sea docente y esté activo
        $validation = $this->validateRoleAndActive(Usuario::ROL_DOCENTE);
        if ($validation !== true) {
            return $validation;
        }

        $usuario = Auth::user();

        // Verificar que el usuario no haya finalizado este examen (un solo intento por examen)
        $examenFinalizado = IntentoExamen::where('idExamen', $examen->idExamen)
            ->where('idUsuario', $usuario->idUsuario)
            ->where('estado', 'enviado')
            ->first();

        if ($examenFinalizado) {
            return response()->json([
                'message' => 'Ya has finalizado este examen. Solo se permite un intento por examen.',
                'ya_finalizado' => true,
                'tiene_intento' => false
            ], 422);
        }

        // Buscar intento en curso para este examen y usuario
        $intento = IntentoExamen::where('idExamen', $examen->idExamen)
            ->where('idUsuario', $usuario->idUsuario)
            ->where('estado', 'iniciado')
            ->first();

        if (!$intento) {
            // Devolver 200 con un indicador de que no hay intento en curso
            // El frontend usa esto para verificar si debe redirigir o mostrar la selección de postulación
            return response()->json([
                'message' => 'No hay un intento en curso para este examen',
                'tiene_intento' => false
            ], 200);
        }

        // Verificar que el tiempo no haya expirado
        $ahora = Carbon::now(config('app.timezone'));
        if ($intento->hora_fin && $ahora->greaterThan($intento->hora_fin)) {
            // El tiempo se acabó, finalizar automáticamente
            $intento->estado = 'enviado';
            $intento->hora_fin = $ahora;
            $intento->save();

            return response()->json([
                'message' => 'El tiempo del examen ha finalizado',
                'tiempo_expirado' => true
            ], 422);
        }

        // Cargar preguntas del examen con sus opciones y subpruebas
        $examen->load(['preguntas.opciones', 'preguntas.contexto', 'preguntas.categoria', 'subpruebas']);

        // Crear un mapa de subpruebas por idSubprueba para acceso rápido
        // Convertir idSubprueba a entero para asegurar coincidencia de tipos
        $subpruebasMap = $examen->subpruebas->keyBy(function ($subprueba) {
            return (int)$subprueba->idSubprueba;
        });

        // Log para depuración
        \Illuminate\Support\Facades\Log::info('IntentoController@cargarIntento - Subpruebas cargadas', [
            'examen_id' => $examen->idExamen,
            'total_subpruebas' => $examen->subpruebas->count(),
            'subpruebas' => $examen->subpruebas->map(function ($s) {
                return [
                    'idSubprueba' => $s->idSubprueba,
                    'nombre' => $s->nombre,
                    'puntaje_por_pregunta' => $s->puntaje_por_pregunta,
                ];
            })->toArray(),
        ]);

        // Transformar el examen para incluir las opciones correctamente
        $examenData = [
            'idExamen' => $examen->idExamen,
            'codigo_examen' => $examen->codigo_examen,
            'titulo' => $examen->titulo,
            'descripcion' => $examen->descripcion,
            'tiempo_limite' => $examen->tiempo_limite,
            'preguntas' => $examen->preguntas->map(function ($pregunta) use ($subpruebasMap) {
                // Obtener el puntaje de la subprueba asociada
                $idSubprueba = $pregunta->pivot->idSubprueba ?? null;
                $puntaje = 0;

                if ($idSubprueba !== null) {
                    // Convertir a entero para asegurar coincidencia de tipos
                    $idSubpruebaInt = (int)$idSubprueba;
                    if ($subpruebasMap->has($idSubpruebaInt)) {
                        $subprueba = $subpruebasMap->get($idSubpruebaInt);
                        // Obtener el valor directamente del atributo (ya tiene el cast aplicado)
                        $puntaje = $subprueba->puntaje_por_pregunta !== null
                            ? (float)$subprueba->puntaje_por_pregunta
                            : 0;

                        // Log para TODAS las preguntas para depuración
                        \Illuminate\Support\Facades\Log::info('IntentoController@cargarIntento - Puntaje calculado', [
                            'pregunta_id' => $pregunta->idPregunta,
                            'orden' => $pregunta->pivot->orden ?? 'N/A',
                            'idSubprueba' => $idSubpruebaInt,
                            'puntaje_final' => $puntaje,
                            'puntaje_por_pregunta' => $subprueba->puntaje_por_pregunta,
                            'puntaje_por_pregunta_raw' => $subprueba->getRawOriginal('puntaje_por_pregunta'),
                            'subprueba_nombre' => $subprueba->nombre,
                        ]);
                    } else {
                        \Illuminate\Support\Facades\Log::warning('IntentoController@cargarIntento - Subprueba no encontrada', [
                            'pregunta_id' => $pregunta->idPregunta,
                            'idSubprueba_buscado' => $idSubpruebaInt,
                            'subpruebas_disponibles' => $subpruebasMap->keys()->toArray(),
                        ]);
                    }
                } else {
                    \Illuminate\Support\Facades\Log::warning('IntentoController@cargarIntento - Pregunta sin idSubprueba', [
                        'pregunta_id' => $pregunta->idPregunta,
                        'orden' => $pregunta->pivot->orden ?? 'N/A',
                    ]);
                }

                return [
                    'id' => $pregunta->idPregunta,
                    'idPregunta' => $pregunta->idPregunta,
                    'codigo' => $pregunta->codigo,
                    'enunciado' => $pregunta->enunciado,
                    'texto' => $pregunta->enunciado, // Compatibilidad con frontend
                    'categoria' => $pregunta->categoria ? [
                        'idCategoria' => $pregunta->categoria->idCategoria,
                        'nombre' => $pregunta->categoria->nombre,
                    ] : null,
                    'contexto' => $pregunta->contexto ? [
                        'idContexto' => $pregunta->contexto->idContexto,
                        'titulo' => $pregunta->contexto->titulo,
                        'texto' => $pregunta->contexto->texto,
                    ] : null,
                    'opciones' => $pregunta->opciones->map(function ($opcion, $index) {
                        return [
                            'id' => $opcion->idOpcion,
                            'idOpcion' => $opcion->idOpcion,
                            'contenido' => $opcion->contenido,
                            'texto' => $opcion->contenido, // Compatibilidad con frontend
                            'letra' => chr(65 + $index), // A, B, C, D...
                            'es_correcta' => (bool) $opcion->es_correcta,
                        ];
                    })->values()->all(),
                    'orden' => $pregunta->pivot->orden ?? null,
                    'pivot' => [
                        'orden' => $pregunta->pivot->orden ?? null,
                        'idSubprueba' => $idSubprueba,
                        'puntaje' => $puntaje,
                    ],
                ];
            })->sortBy('orden')->values(),
        ];

        // Calcular tiempo restante en segundos
        $ahora = Carbon::now(config('app.timezone'));
        $fin = Carbon::parse($intento->hora_fin)->setTimezone(config('app.timezone'));
        $tiempoRestante = max(0, $ahora->diffInSeconds($fin, false));

        // Obtener información de navegación: qué preguntas están disponibles
        // Convertir Collection a array si es necesario
        $preguntasArray = is_array($examenData['preguntas'])
            ? $examenData['preguntas']
            : $examenData['preguntas']->toArray();
        $preguntasDisponibles = $this->obtenerPreguntasDisponibles($intento, $preguntasArray);

        // Determinar la pregunta inicial: usar última pregunta vista si existe y está disponible,
        // de lo contrario usar la pregunta actual permitida
        $preguntaInicial = $preguntasDisponibles['pregunta_actual_permitida'];
        if ($intento->ultima_pregunta_vista !== null) {
            // Verificar si la última pregunta vista tiene respuesta guardada (puede volver a preguntas respondidas)
            $ultimaPreguntaTieneRespuesta = RespuestaIntento::where('idIntento', $intento->idIntento)
                ->where('idPregunta', $intento->ultima_pregunta_vista)
                ->whereNotNull('idOpcionSeleccionada')
                ->exists();

            // Buscar el índice de la pregunta en el array ya ordenado
            // El array $examenData['preguntas'] ya está ordenado por 'orden'
            $indiceEncontrado = false;
            foreach ($examenData['preguntas'] as $index => $pregunta) {
                $preguntaId = $pregunta['idPregunta'] ?? $pregunta['id'] ?? null;
                if ($preguntaId == $intento->ultima_pregunta_vista) {
                    $indiceEncontrado = $index;
                    break;
                }
            }

            // Si se encontró el índice y está disponible o tiene respuesta, usarlo
            if (
                $indiceEncontrado !== false &&
                (in_array($indiceEncontrado, $preguntasDisponibles['preguntas_disponibles']) || $ultimaPreguntaTieneRespuesta)
            ) {
                $preguntaInicial = $indiceEncontrado;

                // Log para depuración
                \Illuminate\Support\Facades\Log::info('IntentoController@cargarIntento - Última pregunta vista encontrada', [
                    'ultima_pregunta_vista_id' => $intento->ultima_pregunta_vista,
                    'indice_encontrado' => $indiceEncontrado,
                    'pregunta_inicial' => $preguntaInicial,
                    'pregunta_actual_permitida' => $preguntasDisponibles['pregunta_actual_permitida'],
                ]);
            }
        }

        // Obtener todas las respuestas guardadas del intento
        // Agrupar por pregunta para manejar múltiples opciones (aunque actualmente solo se guarda una)
        $respuestasGuardadas = RespuestaIntento::where('idIntento', $intento->idIntento)
            ->whereNotNull('idOpcionSeleccionada')
            ->get()
            ->groupBy('idPregunta')
            ->map(function ($respuestas) {
                // Obtener todas las opciones seleccionadas para esta pregunta
                return $respuestas->pluck('idOpcionSeleccionada')->filter()->values()->toArray();
            })
            ->mapWithKeys(function ($opciones, $preguntaId) {
                return [(string)$preguntaId => $opciones];
            })
            ->toArray();

        return response()->json([
            'intento' => $intento,
            'examen' => $examenData,
            'tiempo_limite' => $examen->tiempo_limite,
            'tiempo_restante' => $tiempoRestante,
            'hora_fin' => $intento->hora_fin->format('Y-m-d H:i:s'),
            'resultado_id' => $intento->idIntento,
            'pregunta_actual_permitida' => $preguntasDisponibles['pregunta_actual_permitida'],
            'preguntas_disponibles' => $preguntasDisponibles['preguntas_disponibles'],
            'ultima_pregunta_vista' => $preguntaInicial, // Índice de la pregunta inicial
            'respuestas_guardadas' => $respuestasGuardadas, // Respuestas guardadas del intento
            'tiene_intento' => true, // Indicador de que hay un intento en curso
        ]);
    }

    /**
     * RF-D.2.1: Iniciar Intento
     */
    public function iniciar(Request $request, Examen $examen)
    {
        // Validar que el usuario sea docente y esté activo
        $validation = $this->validateRoleAndActive(Usuario::ROL_DOCENTE);
        if ($validation !== true) {
            return $validation;
        }

        /** @var \App\Models\Usuario $usuario */
        $usuario = Auth::user();

        // Verificar que el usuario no haya finalizado este examen (un solo intento por examen)
        $examenFinalizado = IntentoExamen::where('idExamen', $examen->idExamen)
            ->where('idUsuario', $usuario->idUsuario)
            ->where('estado', 'enviado')
            ->first();

        if ($examenFinalizado) {
            return response()->json([
                'message' => 'Ya has finalizado este examen. Solo se permite un intento por examen.',
                'ya_finalizado' => true
            ], 422);
        }

        // Verificar si ya existe un intento en curso para este examen y usuario
        $intentoExistente = IntentoExamen::where('idExamen', $examen->idExamen)
            ->where('idUsuario', $usuario->idUsuario)
            ->where('estado', 'iniciado')
            ->first();

        if ($intentoExistente) {
            // Si ya existe un intento, devolver información del intento existente
            // en lugar de crear uno nuevo
            $examen->load(['preguntas.opciones', 'preguntas.contexto', 'preguntas.categoria', 'subpruebas']);

            $subpruebasMap = $examen->subpruebas->keyBy(function ($subprueba) {
                return (int)$subprueba->idSubprueba;
            });

            $examenData = [
                'idExamen' => $examen->idExamen,
                'codigo_examen' => $examen->codigo_examen,
                'titulo' => $examen->titulo,
                'descripcion' => $examen->descripcion,
                'tiempo_limite' => $examen->tiempo_limite,
                'preguntas' => $examen->preguntas->map(function ($pregunta) use ($subpruebasMap) {
                    $idSubprueba = $pregunta->pivot->idSubprueba ?? null;
                    $puntaje = 0;

                    if ($idSubprueba !== null) {
                        $idSubpruebaInt = (int)$idSubprueba;
                        if ($subpruebasMap->has($idSubpruebaInt)) {
                            $subprueba = $subpruebasMap->get($idSubpruebaInt);
                            $puntaje = $subprueba->puntaje_por_pregunta !== null
                                ? (float)$subprueba->puntaje_por_pregunta
                                : 0;
                        }
                    }

                    return [
                        'id' => $pregunta->idPregunta,
                        'idPregunta' => $pregunta->idPregunta,
                        'codigo' => $pregunta->codigo,
                        'enunciado' => $pregunta->enunciado,
                        'texto' => $pregunta->enunciado,
                        'categoria' => $pregunta->categoria ? [
                            'idCategoria' => $pregunta->categoria->idCategoria,
                            'nombre' => $pregunta->categoria->nombre,
                        ] : null,
                        'contexto' => $pregunta->contexto ? [
                            'idContexto' => $pregunta->contexto->idContexto,
                            'titulo' => $pregunta->contexto->titulo,
                            'texto' => $pregunta->contexto->texto,
                        ] : null,
                        'opciones' => $pregunta->opciones->map(function ($opcion, $index) {
                            return [
                                'id' => $opcion->idOpcion,
                                'idOpcion' => $opcion->idOpcion,
                                'contenido' => $opcion->contenido,
                                'texto' => $opcion->contenido,
                                'letra' => chr(65 + $index),
                                'es_correcta' => (bool) $opcion->es_correcta,
                            ];
                        })->values()->all(),
                        'orden' => $pregunta->pivot->orden ?? null,
                        'pivot' => [
                            'orden' => $pregunta->pivot->orden ?? null,
                            'idSubprueba' => $idSubprueba,
                            'puntaje' => $puntaje,
                        ],
                    ];
                })->sortBy('orden')->values(),
            ];

            $ahora = Carbon::now(config('app.timezone'));
            $fin = Carbon::parse($intentoExistente->hora_fin)->setTimezone(config('app.timezone'));
            $tiempoRestante = max(0, $ahora->diffInSeconds($fin, false));

            $preguntasArray = is_array($examenData['preguntas'])
                ? $examenData['preguntas']
                : $examenData['preguntas']->toArray();
            $preguntasDisponibles = $this->obtenerPreguntasDisponibles($intentoExistente, $preguntasArray);

            // Determinar la pregunta inicial
            $preguntaInicial = $preguntasDisponibles['pregunta_actual_permitida'];
            if ($intentoExistente->ultima_pregunta_vista !== null) {
                // Verificar si la última pregunta vista tiene respuesta guardada (puede volver a preguntas respondidas)
                $ultimaPreguntaTieneRespuesta = RespuestaIntento::where('idIntento', $intentoExistente->idIntento)
                    ->where('idPregunta', $intentoExistente->ultima_pregunta_vista)
                    ->whereNotNull('idOpcionSeleccionada')
                    ->exists();

                // Buscar el índice de la pregunta en el array ya ordenado
                // El array $examenData['preguntas'] ya está ordenado por 'orden'
                $indiceEncontrado = false;
                foreach ($examenData['preguntas'] as $index => $pregunta) {
                    $preguntaId = $pregunta['idPregunta'] ?? $pregunta['id'] ?? null;
                    if ($preguntaId == $intentoExistente->ultima_pregunta_vista) {
                        $indiceEncontrado = $index;
                        break;
                    }
                }

                // Si se encontró el índice y está disponible o tiene respuesta, usarlo
                if (
                    $indiceEncontrado !== false &&
                    (in_array($indiceEncontrado, $preguntasDisponibles['preguntas_disponibles']) || $ultimaPreguntaTieneRespuesta)
                ) {
                    $preguntaInicial = $indiceEncontrado;

                    // Log para depuración
                    \Illuminate\Support\Facades\Log::info('IntentoController@iniciar - Última pregunta vista encontrada', [
                        'ultima_pregunta_vista_id' => $intentoExistente->ultima_pregunta_vista,
                        'indice_encontrado' => $indiceEncontrado,
                        'pregunta_inicial' => $preguntaInicial,
                        'pregunta_actual_permitida' => $preguntasDisponibles['pregunta_actual_permitida'],
                    ]);
                }
            }

            // Obtener todas las respuestas guardadas del intento
            // Agrupar por pregunta para manejar múltiples opciones (aunque actualmente solo se guarda una)
            $respuestasGuardadas = RespuestaIntento::where('idIntento', $intentoExistente->idIntento)
                ->whereNotNull('idOpcionSeleccionada')
                ->get()
                ->groupBy('idPregunta')
                ->map(function ($respuestas) {
                    // Obtener todas las opciones seleccionadas para esta pregunta
                    return $respuestas->pluck('idOpcionSeleccionada')->filter()->values()->toArray();
                })
                ->mapWithKeys(function ($opciones, $preguntaId) {
                    return [(string)$preguntaId => $opciones];
                })
                ->toArray();

            return response()->json([
                'intento' => $intentoExistente,
                'examen' => $examenData,
                'tiempo_limite' => $examen->tiempo_limite,
                'tiempo_restante' => $tiempoRestante,
                'hora_fin' => $intentoExistente->hora_fin->format('d-m-Y'),
                'resultado_id' => $intentoExistente->idIntento,
                'pregunta_actual_permitida' => $preguntasDisponibles['pregunta_actual_permitida'],
                'preguntas_disponibles' => $preguntasDisponibles['preguntas_disponibles'],
                'ultima_pregunta_vista' => $preguntaInicial,
                'respuestas_guardadas' => $respuestasGuardadas, // Respuestas guardadas del intento
            ]);
        }

        $request->validate([
            'idPostulacion' => 'required|integer|exists:postulaciones,idPostulacion',
            'idSubpruebaSeleccionada' => 'nullable|integer|exists:subpruebas,idSubprueba',
        ]);

        $idPostulacion = $request->input('idPostulacion');
        $idSubpruebaSeleccionada = $request->input('idSubpruebaSeleccionada');

        // Verificar que la postulación pertenezca al examen
        $postulacion = \App\Models\Postulacion::findOrFail($idPostulacion);
        if ($postulacion->idExamen !== $examen->idExamen) {
            return response()->json([
                'message' => 'La postulación no pertenece a este examen'
            ], 422);
        }

        // Si el tipo de aprobación es independiente, validar que se haya seleccionado una subprueba
        $tipoAprobacion = $postulacion->tipo_aprobacion ?? '0';
        if ($tipoAprobacion === '1') {
            if (!$idSubpruebaSeleccionada) {
                return response()->json([
                    'message' => 'Debe seleccionar una subprueba para este tipo de postulación'
                ], 422);
            }

            // Verificar que la subprueba pertenezca al examen
            $subprueba = \App\Models\Subprueba::findOrFail($idSubpruebaSeleccionada);
            if ($subprueba->idExamen !== $examen->idExamen) {
                return response()->json([
                    'message' => 'La subprueba no pertenece a este examen'
                ], 422);
            }

            // Verificar que la subprueba tenga una regla de puntaje para esta postulación
            $reglaPuntaje = ReglaPuntaje::where('idPostulacion', $idPostulacion)
                ->where('idSubprueba', $idSubpruebaSeleccionada)
                ->first();

            if (!$reglaPuntaje) {
                return response()->json([
                    'message' => 'No se encontró regla de puntaje para la subprueba seleccionada en esta postulación'
                ], 422);
            }
        }

        // RF-D.2.1: Calcular hora_fin = hora_inicio + tiempo_limite minutos
        $horaInicio = Carbon::now(config('app.timezone'));
        $horaFin = $horaInicio->copy()->addMinutes($examen->tiempo_limite);

        $intento = IntentoExamen::create([
            'idExamen' => $examen->idExamen,
            'idUsuario' => $usuario->idUsuario,
            'idPostulacion' => $idPostulacion, // RF-D.1.4: Guardar idPostulacion
            'idSubpruebaSeleccionada' => $idSubpruebaSeleccionada, // Guardar subprueba seleccionada si aplica
            'hora_inicio' => $horaInicio,
            'hora_fin' => $horaFin, // RF-D.2.1: Hora de finalización calculada por el servidor
            'estado' => 'iniciado',
        ]);

        // Cargar preguntas del examen con sus opciones y subpruebas
        $examen->load(['preguntas.opciones', 'preguntas.contexto', 'preguntas.categoria', 'subpruebas']);

        // Crear un mapa de subpruebas por idSubprueba para acceso rápido
        // Convertir idSubprueba a entero para asegurar coincidencia de tipos
        $subpruebasMap = $examen->subpruebas->keyBy(function ($subprueba) {
            return (int)$subprueba->idSubprueba;
        });

        // Log para depuración
        \Illuminate\Support\Facades\Log::info('IntentoController@iniciar - Subpruebas cargadas', [
            'examen_id' => $examen->idExamen,
            'total_subpruebas' => $examen->subpruebas->count(),
            'subpruebas' => $examen->subpruebas->map(function ($s) {
                return [
                    'idSubprueba' => $s->idSubprueba,
                    'nombre' => $s->nombre,
                    'puntaje_por_pregunta' => $s->puntaje_por_pregunta,
                ];
            })->toArray(),
        ]);

        // Transformar el examen para incluir las opciones correctamente
        $examenData = [
            'idExamen' => $examen->idExamen,
            'codigo_examen' => $examen->codigo_examen,
            'titulo' => $examen->titulo,
            'descripcion' => $examen->descripcion,
            'tiempo_limite' => $examen->tiempo_limite,
            'preguntas' => $examen->preguntas->map(function ($pregunta) use ($subpruebasMap) {
                // Obtener el puntaje de la subprueba asociada
                $idSubprueba = $pregunta->pivot->idSubprueba ?? null;
                $puntaje = 0;

                if ($idSubprueba !== null) {
                    // Convertir a entero para asegurar coincidencia de tipos
                    $idSubpruebaInt = (int)$idSubprueba;
                    if ($subpruebasMap->has($idSubpruebaInt)) {
                        $subprueba = $subpruebasMap->get($idSubpruebaInt);
                        // Obtener el valor directamente del atributo (ya tiene el cast aplicado)
                        $puntaje = $subprueba->puntaje_por_pregunta !== null
                            ? (float)$subprueba->puntaje_por_pregunta
                            : 0;

                        // Log para TODAS las preguntas para depuración
                        \Illuminate\Support\Facades\Log::info('IntentoController@iniciar - Puntaje calculado', [
                            'pregunta_id' => $pregunta->idPregunta,
                            'orden' => $pregunta->pivot->orden ?? 'N/A',
                            'idSubprueba' => $idSubpruebaInt,
                            'puntaje_final' => $puntaje,
                            'puntaje_por_pregunta' => $subprueba->puntaje_por_pregunta,
                            'puntaje_por_pregunta_raw' => $subprueba->getRawOriginal('puntaje_por_pregunta'),
                            'subprueba_nombre' => $subprueba->nombre,
                        ]);
                    } else {
                        \Illuminate\Support\Facades\Log::warning('IntentoController@iniciar - Subprueba no encontrada', [
                            'pregunta_id' => $pregunta->idPregunta,
                            'idSubprueba_buscado' => $idSubpruebaInt,
                            'subpruebas_disponibles' => $subpruebasMap->keys()->toArray(),
                        ]);
                    }
                } else {
                    \Illuminate\Support\Facades\Log::warning('IntentoController@iniciar - Pregunta sin idSubprueba', [
                        'pregunta_id' => $pregunta->idPregunta,
                        'orden' => $pregunta->pivot->orden ?? 'N/A',
                    ]);
                }

                return [
                    'id' => $pregunta->idPregunta,
                    'idPregunta' => $pregunta->idPregunta,
                    'codigo' => $pregunta->codigo,
                    'enunciado' => $pregunta->enunciado,
                    'texto' => $pregunta->enunciado, // Compatibilidad con frontend
                    'categoria' => $pregunta->categoria ? [
                        'idCategoria' => $pregunta->categoria->idCategoria,
                        'nombre' => $pregunta->categoria->nombre,
                    ] : null,
                    'contexto' => $pregunta->contexto ? [
                        'idContexto' => $pregunta->contexto->idContexto,
                        'titulo' => $pregunta->contexto->titulo,
                        'texto' => $pregunta->contexto->texto,
                    ] : null,
                    'opciones' => $pregunta->opciones->map(function ($opcion, $index) {
                        return [
                            'id' => $opcion->idOpcion,
                            'idOpcion' => $opcion->idOpcion,
                            'contenido' => $opcion->contenido,
                            'texto' => $opcion->contenido, // Compatibilidad con frontend
                            'letra' => chr(65 + $index), // A, B, C, D...
                            'es_correcta' => (bool) $opcion->es_correcta,
                        ];
                    })->values()->all(),
                    'orden' => $pregunta->pivot->orden ?? null,
                    'pivot' => [
                        'orden' => $pregunta->pivot->orden ?? null,
                        'idSubprueba' => $idSubprueba,
                        'puntaje' => $puntaje,
                    ],
                ];
            })->sortBy('orden')->values(),
        ];

        // RF-D.2.1: Calcular tiempo restante en segundos
        $tiempoRestante = $examen->tiempo_limite * 60; // Convertir minutos a segundos

        // Obtener información de navegación: qué preguntas están disponibles
        // Convertir Collection a array si es necesario
        $preguntasArray = is_array($examenData['preguntas'])
            ? $examenData['preguntas']
            : $examenData['preguntas']->toArray();
        $preguntasDisponibles = $this->obtenerPreguntasDisponibles($intento, $preguntasArray);

        return response()->json([
            'intento' => $intento,
            'examen' => $examenData,
            'tiempo_limite' => $examen->tiempo_limite,
            'tiempo_restante' => $tiempoRestante, // Tiempo restante en segundos
            'hora_fin' => $horaFin->format('Y-m-d H:i:s'), // RF-D.2.1: Devolver hora_fin al frontend
            'resultado_id' => $intento->idIntento, // Compatibilidad con frontend
            'pregunta_actual_permitida' => $preguntasDisponibles['pregunta_actual_permitida'],
            'preguntas_disponibles' => $preguntasDisponibles['preguntas_disponibles'],
            'ultima_pregunta_vista' => 0, // Nuevo intento, empezar desde la primera pregunta
        ], 201);
    }

    /**
     * RF-D.2.2: Obtener pregunta del intento
     */
    public function obtenerPregunta(IntentoExamen $intentoExamen, $orden)
    {
        // Validar que el intento pertenezca al usuario
        $validation = $this->validateOwnership($intentoExamen->idUsuario);
        if ($validation !== true) {
            return $validation;
        }

        $intentoExamen->load('examen.preguntas.opciones', 'examen.preguntas.contexto', 'examen.preguntas.categoria');
        $pregunta = $intentoExamen->examen->preguntas->where('pivot.orden', $orden)->first();

        if (!$pregunta) {
            return response()->json(['message' => 'Pregunta no encontrada'], 404);
        }

        $respuesta = RespuestaIntento::where('idIntento', $intentoExamen->idIntento)
            ->where('idPregunta', $pregunta->idPregunta)
            ->first();

        // Transformar la pregunta para incluir las opciones correctamente
        $preguntaData = [
            'id' => $pregunta->idPregunta,
            'idPregunta' => $pregunta->idPregunta,
            'codigo' => $pregunta->codigo,
            'enunciado' => $pregunta->enunciado,
            'categoria' => $pregunta->categoria ? [
                'idCategoria' => $pregunta->categoria->idCategoria,
                'nombre' => $pregunta->categoria->nombre,
            ] : null,
            'contexto' => $pregunta->contexto ? [
                'idContexto' => $pregunta->contexto->idContexto,
                'titulo' => $pregunta->contexto->titulo,
                'texto' => $pregunta->contexto->texto,
            ] : null,
            'opciones' => $pregunta->opciones->map(function ($opcion) {
                return [
                    'id' => $opcion->idOpcion,
                    'idOpcion' => $opcion->idOpcion,
                    'contenido' => $opcion->contenido,
                    'es_correcta' => (bool) $opcion->es_correcta,
                ];
            })->values()->all(),
            'orden' => $pregunta->pivot->orden ?? null,
        ];

        return response()->json([
            'pregunta' => $preguntaData,
            'contexto' => $pregunta->contexto,
            'respuesta_actual' => $respuesta ? $respuesta->idOpcionSeleccionada : null,
        ]);
    }

    /**
     * RF-D.2.3: Guardado de Progreso (Asíncrono)
     */
    public function guardarRespuesta(Request $request, IntentoExamen $intentoExamen)
    {
        try {
            // Validar que el intento pertenezca al usuario
            $validation = $this->validateOwnership($intentoExamen->idUsuario);
            if ($validation !== true) {
                return $validation;
            }

            // Validar que el intento esté en estado 'iniciado'
            if ($intentoExamen->estado !== 'iniciado') {
                return response()->json([
                    'message' => 'El examen no está en curso',
                    'estado' => $intentoExamen->estado
                ], 422);
            }

            $request->validate([
                'idPregunta' => 'required|integer|exists:preguntas,idPregunta',
                'idOpcionSeleccionada' => 'nullable|integer',
            ]);

            // Validar que la opción existe solo si se proporciona
            if ($request->filled('idOpcionSeleccionada')) {
                $opcionExiste = DB::table('opciones_preguntas')
                    ->where('idOpcion', $request->idOpcionSeleccionada)
                    ->exists();

                if (!$opcionExiste) {
                    return response()->json([
                        'message' => 'La opción seleccionada no existe',
                    ], 422);
                }
            }

            // RF-D.2.3: Validar que el tiempo no haya expirado
            $ahora = Carbon::now(config('app.timezone'));
            if ($intentoExamen->hora_fin && $ahora->greaterThan($intentoExamen->hora_fin)) {
                // El tiempo se acabó, ignorar la respuesta silenciosamente
                // No devolver error para evitar interrupciones
                return response()->json([
                    'message' => 'El tiempo del examen ha finalizado',
                    'tiempo_expirado' => true,
                    'guardado' => false
                ], 200);
            }

            DB::beginTransaction();

            try {
                $respuesta = RespuestaIntento::updateOrCreate(
                    [
                        'idIntento' => $intentoExamen->idIntento,
                        'idPregunta' => $request->idPregunta,
                    ],
                    [
                        'idOpcionSeleccionada' => $request->idOpcionSeleccionada ?: null,
                    ]
                );

                // Guardar la última pregunta vista
                $intentoExamen->ultima_pregunta_vista = $request->idPregunta;
                $intentoExamen->save();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'respuesta' => $respuesta,
                    'message' => 'Respuesta guardada correctamente'
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                \Illuminate\Support\Facades\Log::error('Error al guardar respuesta', [
                    'intento_id' => $intentoExamen->idIntento,
                    'pregunta_id' => $request->idPregunta,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);

                // Devolver éxito para no interrumpir al docente
                return response()->json([
                    'success' => false,
                    'message' => 'Error al guardar la respuesta, pero puedes continuar',
                    'error' => config('app.debug') ? $e->getMessage() : 'Error interno'
                ], 200);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Illuminate\Support\Facades\Log::warning('Error de validación al guardar respuesta', [
                'errors' => $e->errors(),
                'intento_id' => $intentoExamen->idIntento ?? null,
            ]);

            // Devolver éxito para no interrumpir al docente
            return response()->json([
                'success' => false,
                'message' => 'Error de validación, pero puedes continuar',
                'errors' => $e->errors()
            ], 200);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error inesperado al guardar respuesta', [
                'intento_id' => $intentoExamen->idIntento ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Devolver éxito para no interrumpir al docente
            return response()->json([
                'success' => false,
                'message' => 'Error inesperado, pero puedes continuar',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno'
            ], 200);
        }
    }

    /**
     * RF-D.2.4: Finalización del Intento
     * RF-D.3.1: Cálculo y Muestra de Resultado Inmediato
     */
    public function finalizar(IntentoExamen $intentoExamen)
    {
        // Validar que el intento pertenezca al usuario
        $validation = $this->validateOwnership($intentoExamen->idUsuario);
        if ($validation !== true) {
            return $validation;
        }

        if ($intentoExamen->estado === 'enviado') {
            return response()->json(['message' => 'El examen ya fue finalizado'], 400);
        }

        // Validar que todas las preguntas estén respondidas
        $examen = $intentoExamen->examen;
        $totalPreguntas = $examen->preguntas()->count();

        $respuestasGuardadas = RespuestaIntento::where('idIntento', $intentoExamen->idIntento)
            ->whereNotNull('idOpcionSeleccionada')
            ->distinct('idPregunta')
            ->count('idPregunta');

        if ($respuestasGuardadas < $totalPreguntas) {
            return response()->json([
                'message' => 'Debe responder todas las preguntas antes de finalizar el examen',
                'preguntas_respondidas' => $respuestasGuardadas,
                'total_preguntas' => $totalPreguntas,
                'preguntas_faltantes' => $totalPreguntas - $respuestasGuardadas
            ], 422);
        }

        DB::beginTransaction();
        try {
            $intentoExamen->hora_fin = now();
            $intentoExamen->estado = 'enviado';

            // RF-C.1: Calcular resultados por subpruebas
            $examen = $intentoExamen->examen;
            $postulacion = $intentoExamen->postulacion;

            // RF-C.1.3: Buscar todas las ReglaPuntaje asociadas a esta idPostulacion
            $reglasPuntaje = ReglaPuntaje::where('idPostulacion', $postulacion->idPostulacion)
                ->with('subprueba')
                ->get();

            // Obtener todas las respuestas del intento
            $respuestas = RespuestaIntento::where('idIntento', $intentoExamen->idIntento)
                ->with(['opcionSeleccionada', 'pregunta'])
                ->get();

            // Obtener las preguntas del examen con su subprueba
            $preguntasExamen = DB::table('examen_pregunta')
                ->where('idExamen', $examen->idExamen)
                ->get()
                ->keyBy('idPregunta');

            $resultadosSubpruebas = [];
            $puntajeTotal = 0;
            $esAprobadoFinal = false;

            // Determinar el tipo de aprobación de la postulación
            $tipoAprobacion = $postulacion->tipo_aprobacion ?? '0';

            if ($tipoAprobacion === '1') {
                // CASO 2: Aprobación independiente - Solo se evalúa la subprueba seleccionada
                $idSubpruebaSeleccionada = $intentoExamen->idSubpruebaSeleccionada;

                if (!$idSubpruebaSeleccionada) {
                    DB::rollBack();
                    return response()->json([
                        'message' => 'Debe seleccionar una subprueba para este tipo de postulación'
                    ], 422);
                }

                // Buscar la regla de puntaje para la subprueba seleccionada
                $reglaSeleccionada = $reglasPuntaje->firstWhere('idSubprueba', $idSubpruebaSeleccionada);

                if (!$reglaSeleccionada) {
                    DB::rollBack();
                    return response()->json([
                        'message' => 'No se encontró regla de puntaje para la subprueba seleccionada'
                    ], 422);
                }

                $subprueba = $reglaSeleccionada->subprueba;
                $puntajeMinimoSubprueba = (float)$reglaSeleccionada->puntaje_minimo_subprueba;

                // Filtrar respuestas de la subprueba seleccionada
                $respuestasSubprueba = $respuestas->filter(function ($respuesta) use ($preguntasExamen, $idSubpruebaSeleccionada) {
                    $preguntaExamen = $preguntasExamen->get($respuesta->idPregunta);
                    return $preguntaExamen && $preguntaExamen->idSubprueba == $idSubpruebaSeleccionada;
                });

                // Calcular puntaje obtenido y preguntas correctas
                $puntajeObtenido = 0;
                $preguntasCorrectas = 0;
                foreach ($respuestasSubprueba as $respuesta) {
                    if ($respuesta->opcionSeleccionada === null) {
                        $puntajeObtenido += (float)$reglaSeleccionada->puntaje_en_blanco;
                    } elseif ($respuesta->opcionSeleccionada->es_correcta) {
                        $puntajeObtenido += (float)$reglaSeleccionada->puntaje_correcto;
                        $preguntasCorrectas++;
                    } else {
                        $puntajeObtenido += (float)$reglaSeleccionada->puntaje_incorrecto;
                    }
                }

                $puntajeTotal = $puntajeObtenido;
                $esAprobadoFinal = $puntajeObtenido >= $puntajeMinimoSubprueba;

                // Verificar si ya existe un resultado para esta combinación antes de crear
                $resultadoExistente = ResultadoSubprueba::where('idIntento', $intentoExamen->idIntento)
                    ->where('idSubprueba', $idSubpruebaSeleccionada)
                    ->first();

                if (!$resultadoExistente) {
                    // Guardar resultado de la subprueba seleccionada solo si no existe
                    ResultadoSubprueba::create([
                        'idIntento' => $intentoExamen->idIntento,
                        'idSubprueba' => $idSubpruebaSeleccionada,
                        'puntaje_obtenido' => $puntajeObtenido,
                        'puntaje_minimo_requerido' => $puntajeMinimoSubprueba,
                        'es_aprobado' => $esAprobadoFinal,
                    ]);
                } else {
                    // Si ya existe, actualizar con los nuevos valores
                    $resultadoExistente->update([
                        'puntaje_obtenido' => $puntajeObtenido,
                        'puntaje_minimo_requerido' => $puntajeMinimoSubprueba,
                        'es_aprobado' => $esAprobadoFinal,
                    ]);
                }

                $resultadosSubpruebas[] = [
                    'subprueba' => $subprueba,
                    'puntaje_obtenido' => $puntajeObtenido,
                    'puntaje_minimo_requerido' => $puntajeMinimoSubprueba,
                    'es_aprobado' => $esAprobadoFinal,
                    'total_preguntas' => $respuestasSubprueba->count(),
                    'preguntas_correctas' => $preguntasCorrectas,
                ];
            } else {
                // CASO 1: Aprobación conjunta - Todas las subpruebas con puntaje mínimo deben aprobarse
                $todasSubpruebasConMinimoAprobadas = true;
                $subpruebasConMinimo = [];

                // Primero, identificar cuáles subpruebas tienen puntaje mínimo
                foreach ($reglasPuntaje as $regla) {
                    $puntajeMinimo = (float)$regla->puntaje_minimo_subprueba;
                    if ($puntajeMinimo > 0) {
                        $subpruebasConMinimo[] = $regla->idSubprueba;
                    }
                }

                // Iterar por cada ReglaPuntaje encontrada
                foreach ($reglasPuntaje as $regla) {
                    $subprueba = $regla->subprueba;
                    $idSubprueba = $subprueba->idSubprueba;
                    $puntajeMinimoSubprueba = (float)$regla->puntaje_minimo_subprueba;

                    // Filtrar respuestas de esta subprueba
                    $respuestasSubprueba = $respuestas->filter(function ($respuesta) use ($preguntasExamen, $idSubprueba) {
                        $preguntaExamen = $preguntasExamen->get($respuesta->idPregunta);
                        return $preguntaExamen && $preguntaExamen->idSubprueba == $idSubprueba;
                    });

                    // Calcular puntaje obtenido y preguntas correctas
                    $puntajeObtenido = 0;
                    $preguntasCorrectas = 0;
                    foreach ($respuestasSubprueba as $respuesta) {
                        if ($respuesta->opcionSeleccionada === null) {
                            $puntajeObtenido += (float)$regla->puntaje_en_blanco;
                        } elseif ($respuesta->opcionSeleccionada->es_correcta) {
                            $puntajeObtenido += (float)$regla->puntaje_correcto;
                            $preguntasCorrectas++;
                        } else {
                            $puntajeObtenido += (float)$regla->puntaje_incorrecto;
                        }
                    }

                    $puntajeTotal += $puntajeObtenido;

                    // Validar mínimo solo para subpruebas que tienen puntaje mínimo
                    $tienePuntajeMinimo = $puntajeMinimoSubprueba > 0;
                    $esAprobado = $tienePuntajeMinimo ? ($puntajeObtenido >= $puntajeMinimoSubprueba) : true;

                    // Si tiene puntaje mínimo y no aprobó, marcar como no aprobado
                    if ($tienePuntajeMinimo && !$esAprobado) {
                        $todasSubpruebasConMinimoAprobadas = false;
                    }

                    // Verificar si ya existe un resultado para esta combinación antes de crear
                    $resultadoExistente = ResultadoSubprueba::where('idIntento', $intentoExamen->idIntento)
                        ->where('idSubprueba', $idSubprueba)
                        ->first();

                    if (!$resultadoExistente) {
                        // Guardar resultado de subprueba solo si no existe
                        ResultadoSubprueba::create([
                            'idIntento' => $intentoExamen->idIntento,
                            'idSubprueba' => $idSubprueba,
                            'puntaje_obtenido' => $puntajeObtenido,
                            'puntaje_minimo_requerido' => $puntajeMinimoSubprueba,
                            'es_aprobado' => $esAprobado,
                        ]);
                    } else {
                        // Si ya existe, actualizar con los nuevos valores
                        $resultadoExistente->update([
                            'puntaje_obtenido' => $puntajeObtenido,
                            'puntaje_minimo_requerido' => $puntajeMinimoSubprueba,
                            'es_aprobado' => $esAprobado,
                        ]);
                    }

                    $resultadosSubpruebas[] = [
                        'subprueba' => $subprueba,
                        'puntaje_obtenido' => $puntajeObtenido,
                        'puntaje_minimo_requerido' => $puntajeMinimoSubprueba,
                        'es_aprobado' => $esAprobado,
                        'total_preguntas' => $respuestasSubprueba->count(),
                        'preguntas_correctas' => $preguntasCorrectas,
                        'tiene_puntaje_minimo' => $tienePuntajeMinimo,
                    ];
                }

                // El examen es aprobado solo si todas las subpruebas con puntaje mínimo fueron aprobadas
                $esAprobadoFinal = $todasSubpruebasConMinimoAprobadas;
            }

            // RF-C.2.3: Actualizar IntentoExamen
            $intentoExamen->puntaje = round((float)$puntajeTotal, 2);
            $intentoExamen->es_aprobado = $esAprobadoFinal;
            $intentoExamen->estado = 'enviado'; // RF-C.2.3: estado_intento = '2' (Procesado) - pero usamos 'enviado' en este sistema
            $intentoExamen->save();

            // Verificar si el examen debe finalizarse (todos los intentos completados)
            \App\Http\Controllers\Api\V1\Admin\ExamenController::verificarYFinalizarExamen($examen);

            DB::commit();

            return response()->json([
                'intento' => $intentoExamen->fresh(['resultadosSubprueba.subprueba']),
                'puntaje_total' => $puntajeTotal,
                'es_aprobado' => $intentoExamen->es_aprobado,
                'resultados_subpruebas' => $resultadosSubpruebas,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al finalizar el examen', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * RF-D.3.2: Historial de Intentos (Vista Docente)
     */
    public function historial()
    {
        // Validar que el usuario sea docente y esté activo
        $validation = $this->validateRoleAndActive(Usuario::ROL_DOCENTE);
        if ($validation !== true) {
            return $validation;
        }

        $usuario = Auth::user();
        $intentos = IntentoExamen::where('idUsuario', $usuario->idUsuario)
            ->where('estado', 'enviado')
            ->with(['examen' => function ($query) {
                $query->select('idExamen', 'titulo', 'codigo_examen');
            }])
            ->orderBy('hora_fin', 'desc')
            ->get();

        // Asegurar que la relación examen esté cargada y serializada correctamente
        // Formatear fechas en formato d-m-Y H:i:s
        $intentosFormateados = $intentos->map(function ($intento) {
            if (!$intento->relationLoaded('examen')) {
                $intento->load('examen');
            }
            $intentoArray = $intento->toArray();
            // Formatear fechas
            if (isset($intentoArray['hora_inicio']) && $intento->hora_inicio) {
                $intentoArray['hora_inicio'] = \Carbon\Carbon::parse($intento->hora_inicio)->format('d-m-Y');
            }
            if (isset($intentoArray['hora_fin']) && $intento->hora_fin) {
                $intentoArray['hora_fin'] = \Carbon\Carbon::parse($intento->hora_fin)->format('d-m-Y');
            }
            return $intentoArray;
        });

        return response()->json($intentosFormateados);
    }

    /**
     * RF-D.3.1: Ver Resultado de un Intento
     */
    public function verResultado(IntentoExamen $intentoExamen)
    {
        // Validar que el usuario sea docente y esté activo
        $validation = $this->validateRoleAndActive(Usuario::ROL_DOCENTE);
        if ($validation !== true) {
            return $validation;
        }

        // Validar que el intento pertenezca al usuario
        $validation = $this->validateOwnership($intentoExamen->idUsuario);
        if ($validation !== true) {
            return $validation;
        }

        $intentoExamen->load([
            'examen',
            'respuestas.opcionSeleccionada',
            'respuestas.pregunta.opciones',
            'postulacion'
        ]);

        // Obtener resultados únicos desde la base de datos (una sola fila por idSubprueba)
        // Usar groupBy para obtener solo el resultado más reciente de cada subprueba
        $resultadosSubpruebasQuery = ResultadoSubprueba::where('idIntento', $intentoExamen->idIntento)
            ->with('subprueba')
            ->orderBy('idResultado', 'desc'); // Ordenar por id más reciente primero

        $tipoAprobacion = $intentoExamen->postulacion->tipo_aprobacion ?? '0';

        // Si el tipo de aprobación es independiente, mostrar solo la subprueba seleccionada
        if ($tipoAprobacion === '1' && $intentoExamen->idSubpruebaSeleccionada) {
            $resultadosSubpruebasQuery->where('idSubprueba', $intentoExamen->idSubpruebaSeleccionada);
        }

        // Obtener resultados y agrupar por idSubprueba para evitar duplicados
        $resultadosSubpruebasFiltrados = $resultadosSubpruebasQuery->get()
            ->unique('idSubprueba')
            ->values();

        // Cargar la relación de subprueba si no está cargada
        $resultadosSubpruebasFiltrados->load('subprueba');

        // Obtener las preguntas del examen con su subprueba
        $preguntasExamen = DB::table('examen_pregunta')
            ->where('idExamen', $intentoExamen->examen->idExamen)
            ->get()
            ->keyBy('idPregunta');

        // Obtener reglas de puntaje para calcular el puntaje máximo
        $reglasPuntaje = ReglaPuntaje::where('idPostulacion', $intentoExamen->postulacion->idPostulacion)
            ->get()
            ->keyBy('idSubprueba');

        // Calcular preguntas correctas y puntaje máximo por subprueba
        $resultadosSubpruebasConCorrectas = $resultadosSubpruebasFiltrados->map(function ($resultado) use ($intentoExamen, $preguntasExamen, $reglasPuntaje) {
            $idSubprueba = $resultado->idSubprueba;

            // Filtrar respuestas de esta subprueba
            $respuestasSubprueba = $intentoExamen->respuestas->filter(function ($respuesta) use ($preguntasExamen, $idSubprueba) {
                $preguntaExamen = $preguntasExamen->get($respuesta->idPregunta);
                return $preguntaExamen && $preguntaExamen->idSubprueba == $idSubprueba;
            });

            // Contar preguntas correctas
            $preguntasCorrectas = $respuestasSubprueba->filter(function ($respuesta) {
                return $respuesta->opcionSeleccionada && $respuesta->opcionSeleccionada->es_correcta;
            })->count();

            $totalPreguntas = $respuestasSubprueba->count();

            // Calcular puntaje máximo: total_preguntas × puntaje_correcto
            $puntajeMaximo = 0;
            $regla = $reglasPuntaje->get($idSubprueba);
            if ($regla && $totalPreguntas > 0) {
                $puntajeMaximo = $totalPreguntas * (float)$regla->puntaje_correcto;
            }

            $resultadoArray = $resultado->toArray();
            $resultadoArray['preguntas_correctas'] = $preguntasCorrectas;
            $resultadoArray['total_preguntas'] = $totalPreguntas;
            $resultadoArray['puntaje_maximo'] = round($puntajeMaximo, 2);

            return $resultadoArray;
        });

        // Formatear fechas del intento
        $intentoFormateado = $intentoExamen->toArray();
        if (isset($intentoFormateado['hora_inicio']) && $intentoExamen->hora_inicio) {
            $intentoFormateado['hora_inicio'] = \Carbon\Carbon::parse($intentoExamen->hora_inicio)->format('d-m-Y');
        }
        if (isset($intentoFormateado['hora_fin']) && $intentoExamen->hora_fin) {
            $intentoFormateado['hora_fin'] = \Carbon\Carbon::parse($intentoExamen->hora_fin)->format('d-m-Y');
        }

        // Mapear respuestas con todas las opciones de la pregunta
        $respuestasFormateadas = $intentoExamen->respuestas->map(function ($respuesta) {
            return [
                'idRespuesta' => $respuesta->idRespuesta,
                'idPregunta' => $respuesta->idPregunta,
                'pregunta' => [
                    'enunciado' => $respuesta->pregunta->enunciado ?? '',
                    'opciones' => $respuesta->pregunta->opciones->map(function ($opcion) {
                        return [
                            'idOpcion' => $opcion->idOpcion,
                            'contenido' => $opcion->contenido,
                            'es_correcta' => (bool) $opcion->es_correcta,
                        ];
                    }),
                ],
                'opcionSeleccionada' => $respuesta->opcionSeleccionada ? [
                    'idOpcion' => $respuesta->opcionSeleccionada->idOpcion,
                    'contenido' => $respuesta->opcionSeleccionada->contenido,
                    'es_correcta' => (bool) $respuesta->opcionSeleccionada->es_correcta,
                ] : null,
            ];
        });

        return response()->json([
            'intento' => $intentoFormateado,
            'postulacion' => $intentoExamen->postulacion ? [
                'idPostulacion' => $intentoExamen->postulacion->idPostulacion,
                'nombre' => $intentoExamen->postulacion->nombre,
                'descripcion' => $intentoExamen->postulacion->descripcion,
                'tipo_aprobacion' => $intentoExamen->postulacion->tipo_aprobacion,
            ] : null,
            'respuestas' => $respuestasFormateadas,
            'resultados_subpruebas' => $resultadosSubpruebasConCorrectas,
        ]);
    }

    /**
     * Obtener navegación de preguntas paginada (25 por página)
     * Agrupa las preguntas: primero las que tienen contexto, luego las que no
     */
    public function obtenerNavegacionPreguntas(Request $request, IntentoExamen $intentoExamen)
    {
        // Validar que el intento pertenezca al usuario
        $validation = $this->validateOwnership($intentoExamen->idUsuario);
        if ($validation !== true) {
            return $validation;
        }
        $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);

        $perPage = $request->input('per_page', 25);
        $page = $request->input('page', 1);

        // Cargar el examen con preguntas y contexto
        $intentoExamen->load('examen.preguntas.contexto');

        // Obtener todas las preguntas ordenadas por orden
        $preguntas = $intentoExamen->examen->preguntas->sortBy(function ($pregunta) {
            return $pregunta->pivot->orden ?? 999;
        })->values();

        // Separar preguntas con contexto y sin contexto
        $conContexto = [];
        $sinContexto = [];

        foreach ($preguntas as $pregunta) {
            // Cargar contexto si no está cargado
            if (!$pregunta->relationLoaded('contexto')) {
                $pregunta->load('contexto');
            }

            $tieneContexto = $pregunta->contexto && $pregunta->contexto->idContexto;

            // Obtener si tiene respuesta guardada (solo si tiene una opción seleccionada, no null)
            $tieneRespuesta = RespuestaIntento::where('idIntento', $intentoExamen->idIntento)
                ->where('idPregunta', $pregunta->idPregunta)
                ->whereNotNull('idOpcionSeleccionada')
                ->exists();

            $preguntaData = [
                'id' => $pregunta->idPregunta,
                'orden' => $pregunta->pivot->orden ?? null,
                'tieneRespuesta' => $tieneRespuesta,
                'tieneContexto' => $tieneContexto,
            ];

            if ($tieneContexto) {
                $conContexto[] = $preguntaData;
            } else {
                $sinContexto[] = $preguntaData;
            }
        }

        // Combinar: primero las que tienen contexto, luego las que no
        $preguntasAgrupadas = array_merge($conContexto, $sinContexto);

        // Asignar números de pregunta después del agrupamiento (1, 2, 3...)
        foreach ($preguntasAgrupadas as $index => &$preguntaData) {
            $preguntaData['numero'] = $index + 1;
        }
        unset($preguntaData); // Liberar referencia

        // Aplicar paginación manual
        $total = count($preguntasAgrupadas);
        $offset = ($page - 1) * $perPage;
        $preguntasPagina = array_slice($preguntasAgrupadas, $offset, $perPage);

        return response()->json([
            'data' => $preguntasPagina,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total),
            ],
        ]);
    }

    /**
     * Obtener información de qué preguntas están disponibles para navegar
     * Reglas:
     * - Debe empezar en la primera pregunta (índice 0)
     * - Solo puede avanzar si ha respondido la pregunta actual
     * - Puede retroceder a cualquier pregunta ya respondida
     */
    private function obtenerPreguntasDisponibles(IntentoExamen $intento, array $preguntas): array
    {
        // Obtener todas las respuestas guardadas del intento
        $respuestas = RespuestaIntento::where('idIntento', $intento->idIntento)
            ->whereNotNull('idOpcionSeleccionada')
            ->pluck('idPregunta')
            ->toArray();

        $preguntasDisponibles = [];
        $preguntaActualPermitida = 0; // Por defecto, la primera pregunta

        foreach ($preguntas as $index => $pregunta) {
            $preguntaId = $pregunta['idPregunta'] ?? $pregunta['id'];
            $tieneRespuesta = in_array($preguntaId, $respuestas);

            // La primera pregunta siempre está disponible
            if ($index === 0) {
                $preguntasDisponibles[] = $index;
                continue;
            }

            // Si la pregunta anterior tiene respuesta, esta pregunta está disponible
            $preguntaAnterior = $preguntas[$index - 1];
            $preguntaAnteriorId = $preguntaAnterior['idPregunta'] ?? $preguntaAnterior['id'];
            $preguntaAnteriorRespondida = in_array($preguntaAnteriorId, $respuestas);

            if ($preguntaAnteriorRespondida) {
                $preguntasDisponibles[] = $index;
            }

            // Si esta pregunta tiene respuesta, puede retroceder a ella
            if ($tieneRespuesta && !in_array($index, $preguntasDisponibles)) {
                $preguntasDisponibles[] = $index;
            }
        }

        // Determinar la pregunta actual permitida (la primera no respondida o la última disponible)
        foreach ($preguntas as $index => $pregunta) {
            $preguntaId = $pregunta['idPregunta'] ?? $pregunta['id'];
            if (!in_array($preguntaId, $respuestas)) {
                $preguntaActualPermitida = $index;
                break;
            }
        }

        // Si todas están respondidas, la última es la permitida
        if (count($respuestas) >= count($preguntas)) {
            $preguntaActualPermitida = count($preguntas) - 1;
        }

        return [
            'pregunta_actual_permitida' => $preguntaActualPermitida,
            'preguntas_disponibles' => $preguntasDisponibles,
        ];
    }

    /**
     * Validar si el usuario puede navegar a una pregunta específica
     */
    public function validarNavegacion(Request $request, IntentoExamen $intentoExamen)
    {
        $request->validate([
            'indice_pregunta' => 'required|integer|min:0',
        ]);

        // Validar que el usuario sea docente y esté activo
        $validation = $this->validateRoleAndActive(Usuario::ROL_DOCENTE);
        if ($validation !== true) {
            return $validation;
        }

        // Validar que el intento pertenezca al usuario
        $validation = $this->validateOwnership($intentoExamen->idUsuario);
        if ($validation !== true) {
            return $validation;
        }

        // Verificar que el tiempo no haya expirado
        $ahora = Carbon::now(config('app.timezone'));
        if ($intentoExamen->hora_fin && $ahora->greaterThan($intentoExamen->hora_fin)) {
            return response()->json([
                'message' => 'El tiempo del examen ha finalizado',
                'tiempo_expirado' => true
            ], 422);
        }

        $indicePregunta = $request->input('indice_pregunta');

        // Cargar preguntas del examen
        $intentoExamen->load('examen.preguntas');
        $preguntas = $intentoExamen->examen->preguntas->sortBy(function ($pregunta) {
            return $pregunta->pivot->orden ?? 999;
        })->values();

        if ($indicePregunta < 0 || $indicePregunta >= $preguntas->count()) {
            return response()->json([
                'message' => 'Índice de pregunta inválido',
                'permitido' => false
            ], 422);
        }

        // Obtener información de navegación
        $preguntasArray = $preguntas->map(function ($pregunta) {
            return [
                'id' => $pregunta->idPregunta,
                'idPregunta' => $pregunta->idPregunta,
            ];
        })->toArray();

        $preguntasDisponibles = $this->obtenerPreguntasDisponibles($intentoExamen, $preguntasArray);

        $permitido = in_array($indicePregunta, $preguntasDisponibles['preguntas_disponibles']);

        // Si está permitido, también verificar si la pregunta tiene respuesta guardada (para retroceder)
        if (!$permitido) {
            $pregunta = $preguntas->get($indicePregunta);
            if ($pregunta) {
                $tieneRespuesta = RespuestaIntento::where('idIntento', $intentoExamen->idIntento)
                    ->where('idPregunta', $pregunta->idPregunta)
                    ->whereNotNull('idOpcionSeleccionada')
                    ->exists();
                if ($tieneRespuesta) {
                    $permitido = true; // Permitir retroceder a preguntas respondidas
                }
            }
        }

        // Si la navegación está permitida, actualizar la última pregunta vista
        if ($permitido) {
            $pregunta = $preguntas->get($indicePregunta);
            if ($pregunta) {
                $intentoExamen->ultima_pregunta_vista = $pregunta->idPregunta;
                $intentoExamen->save();
            }
        }

        return response()->json([
            'permitido' => $permitido,
            'pregunta_actual_permitida' => $preguntasDisponibles['pregunta_actual_permitida'],
            'preguntas_disponibles' => $preguntasDisponibles['preguntas_disponibles'],
            'mensaje' => $permitido
                ? 'Navegación permitida'
                : 'Debe responder las preguntas en orden. No puede avanzar sin responder la pregunta actual.',
        ]);
    }
}
