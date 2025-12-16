<?php

namespace App\Http\Controllers\Api\V1\Docente;

use App\Http\Controllers\Controller;
use App\Traits\ValidatesUserPermissions;
use App\Models\Examen;
use App\Models\IntentoExamen;
use App\Models\Usuario;
use App\Http\Resources\ExamenResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ExamenController extends Controller
{
    use ValidatesUserPermissions;
    /**
     * Obtener exámenes disponibles para el docente
     * Filtra por estado publicado y tipo de acceso (público o privado asignado)
     */
    public function index(): JsonResponse
    {
        // Validar que el usuario sea docente y esté activo
        $validation = $this->validateRoleAndActive(Usuario::ROL_DOCENTE);
        if ($validation !== true) {
            return $validation;
        }

        $usuario = Auth::user();
        // Usar la zona horaria de la aplicación para comparar con las fechas guardadas
        $ahora = Carbon::now(config('app.timezone'));
        $idUsuario = $usuario->idUsuario;

        // Obtener IDs de exámenes asignados al usuario (exámenes privados)
        $examenesAsignados = DB::table('examenes_usuarios')
            ->where('idUsuario', $idUsuario)
            ->pluck('idExamen')
            ->toArray();

        Log::info('ExamenController@index - Docente buscando exámenes', [
            'usuario_id' => $idUsuario,
            'usuario_nombre' => $usuario->nombre . ' ' . $usuario->apellidos,
            'examenes_asignados_count' => count($examenesAsignados),
            'examenes_asignados_ids' => $examenesAsignados,
            'fecha_actual' => $ahora->format('d-m-Y'),
        ]);

        // Query base: solo exámenes publicados (estado = '1')
        $query = Examen::where('estado', '1');

        // Filtrar por tipo de acceso:
        // - Si es público: todos los docentes pueden verlo
        // - Si es privado: solo los docentes asignados pueden verlo
        $query->where(function ($q) use ($examenesAsignados) {
            // Exámenes públicos (visibles para todos)
            $q->where('tipo_acceso', 'publico');

            // O exámenes privados asignados al usuario
            if (!empty($examenesAsignados)) {
                $q->orWhere(function ($subQ) use ($examenesAsignados) {
                    $subQ->where('tipo_acceso', 'privado')
                        ->whereIn('idExamen', $examenesAsignados);
                });
            }
        });

        // Filtrar por fechas de vigencia (si están definidas)
        // Usar whereRaw para comparar fechas directamente en la base de datos sin conversión de zona horaria
        $query->where(function ($q) use ($ahora) {
            $q->where(function ($dateQ) use ($ahora) {
                // Si no tiene fecha_inicio_vigencia, está disponible
                // Si tiene fecha_inicio_vigencia, debe haber comenzado
                $dateQ->whereNull('fecha_inicio_vigencia')
                    ->orWhereRaw('fecha_inicio_vigencia <= ?', [$ahora->format('Y-m-d H:i:s')]);
            })
                ->where(function ($dateQ) use ($ahora) {
                    // Si no tiene fecha_fin_vigencia, no tiene límite
                    // Si tiene fecha_fin_vigencia, no debe haber finalizado (>= permite ver hasta el último momento)
                    $dateQ->whereNull('fecha_fin_vigencia')
                        ->orWhereRaw('fecha_fin_vigencia >= ?', [$ahora->format('Y-m-d H:i:s')]);
                });
        });

        // Obtener IDs de exámenes que el usuario ya finalizó (tiene intento con estado 'enviado')
        $examenesFinalizados = DB::table('intento_examenes')
            ->where('idUsuario', $idUsuario)
            ->where('estado', 'enviado')
            ->distinct()
            ->pluck('idExamen')
            ->toArray();

        // Excluir exámenes que el usuario ya finalizó (un solo intento por examen)
        if (!empty($examenesFinalizados)) {
            $query->whereNotIn('idExamen', $examenesFinalizados);
        }

        // Aplicar paginación
        $perPage = request()->integer('per_page', 10);
        $page = request()->integer('page', 1);

        // Obtener exámenes ordenados por fecha de inicio de vigencia (más recientes primero)
        // Manejar nulls en fecha_inicio_vigencia usando orderByRaw
        // Cargar relación de preguntas y contar preguntas para mostrar total_preguntas
        $examenes = $query->withCount('preguntas')
            ->orderByRaw('COALESCE(fecha_inicio_vigencia, created_at) DESC')
            ->get();

        // Log detallado para depuración
        $examenesPublicos = Examen::where('estado', '1')->where('tipo_acceso', 'publico')->count();
        $examenesPrivados = Examen::where('estado', '1')->where('tipo_acceso', 'privado')->count();

        Log::info('ExamenController@index - Exámenes encontrados', [
            'usuario_id' => $idUsuario,
            'total_examenes' => $examenes->count(),
            'examenes_publicos_en_bd' => $examenesPublicos,
            'examenes_privados_en_bd' => $examenesPrivados,
            'examenes_asignados_al_usuario' => count($examenesAsignados),
            'examenes_ids' => $examenes->pluck('idExamen')->toArray(),
            'examenes_detalle' => $examenes->map(function ($e) {
                return [
                    'id' => $e->idExamen,
                    'codigo_examen' => $e->codigo_examen,
                    'titulo' => $e->titulo,
                    'estado' => $e->estado,
                    'tipo_acceso' => $e->tipo_acceso,
                    'fecha_inicio_vigencia' => $e->fecha_inicio_vigencia ? $e->fecha_inicio_vigencia->format('d-m-Y') : null,
                    'fecha_fin_vigencia' => $e->fecha_fin_vigencia ? $e->fecha_fin_vigencia->format('d-m-Y') : null,
                ];
            })->toArray(),
        ]);

        // Aplicar paginación manual
        $total = $examenes->count();
        $examenesPaginated = $examenes->values()->slice(($page - 1) * $perPage, $perPage);
        $lastPage = ceil($total / $perPage);

        return response()->json([
            'data' => ExamenResource::collection($examenesPaginated),
            'current_page' => $page,
            'last_page' => $lastPage,
            'per_page' => $perPage,
            'total' => $total,
            'from' => $total > 0 ? (($page - 1) * $perPage) + 1 : 0,
            'to' => min($page * $perPage, $total)
        ]);
    }

    /**
     * Obtener detalles de un examen específico
     */
    public function show(string $id): JsonResponse
    {
        // Validar que el usuario sea docente y esté activo
        $validation = $this->validateRoleAndActive(Usuario::ROL_DOCENTE);
        if ($validation !== true) {
            return $validation;
        }

        $usuario = Auth::user();
        $idUsuario = $usuario->idUsuario;
        // Usar la zona horaria de la aplicación para comparar con las fechas guardadas
        // Las fechas se guardan como hora local, así que comparamos con hora local
        $ahora = Carbon::now(config('app.timezone'));

        $examen = Examen::with(['preguntas.opciones', 'preguntas.categoria', 'postulaciones.reglasPuntaje.subprueba'])
            ->withCount('preguntas')
            ->where('idExamen', $id)
            ->firstOrFail();

        // Verificar estado del examen:
        // 0 = Borrador: No visible para docentes
        // 1 = Publicado: Visible y vigente (verificar fechas de vigencia)
        // 2 = Finalizado: Visible solo si tiene intentos previos (para ver resultados)
        if ($examen->estado === '0') {
            // Borrador: No visible para docentes
            return response()->json([
                'message' => 'Este examen no está disponible'
            ], 422);
        }

        // Si el examen está finalizado (estado = '2'), verificar si tiene intentos previos
        if ($examen->estado === '2') {
            $tieneIntentosPrevios = IntentoExamen::where('idExamen', $examen->idExamen)
                ->where('idUsuario', $idUsuario)
                ->exists();

            if (!$tieneIntentosPrevios) {
                // Examen finalizado y usuario nunca lo tomó → bloquear acceso
                return response()->json([
                    'message' => 'Este examen ya ha finalizado'
                ], 422);
            }
            // Si tiene intentos previos, permitir ver detalles para revisar resultados
            // No verificar fechas de vigencia para exámenes finalizados
            Log::info('ExamenController@show - Examen finalizado (estado=2), permitiendo acceso con intentos previos', [
                'examen_id' => $examen->idExamen,
                'usuario_id' => $idUsuario,
            ]);
        }

        // Para exámenes publicados (estado = '1'), SIEMPRE permitir ver detalles
        // Las fechas de vigencia solo afectan la capacidad de INICIAR intentos, no de VER detalles
        // Esto permite a los docentes ver información del examen incluso si pasó la fecha de fin
        // La validación de fechas se hace en iniciarExamen(), no aquí
        if ($examen->estado === '1') {
            // Examen publicado: siempre permitir ver detalles
            // Solo verificar fecha de inicio para evitar mostrar exámenes que aún no han comenzado
            $fechaInicioVigencia = $examen->getRawOriginal('fecha_inicio_vigencia');

            if ($fechaInicioVigencia) {
                $fechaInicioStr = is_string($fechaInicioVigencia)
                    ? $fechaInicioVigencia
                    : ($fechaInicioVigencia instanceof Carbon
                        ? $fechaInicioVigencia->format('d-m-Y H:i:s')
                        : (string)$fechaInicioVigencia);

                $ahoraStr = $ahora->format('Y-m-d H:i:s');

                // Si la fecha actual es menor que la fecha de inicio, el examen aún no está disponible
                if (strcmp($ahoraStr, $fechaInicioStr) < 0) {
                    Log::info('ExamenController@show - Bloqueando acceso: examen aún no ha comenzado', [
                        'examen_id' => $examen->idExamen,
                        'fecha_inicio' => $fechaInicioStr,
                        'ahora' => $ahoraStr,
                    ]);
                    return response()->json([
                        'message' => 'Este examen aún no está disponible'
                    ], 422);
                }
            }

            // Si el examen ya comenzó (o no tiene fecha de inicio), permitir ver detalles
            Log::info('ExamenController@show - Permitiendo acceso: examen publicado (estado=1)', [
                'examen_id' => $examen->idExamen,
                'usuario_id' => $idUsuario,
            ]);
        }
        // Para exámenes finalizados (estado = '2'), ya fue validado arriba

        // Verificar que el usuario no haya finalizado este examen (un solo intento por examen)
        $examenFinalizado = IntentoExamen::where('idExamen', $examen->idExamen)
            ->where('idUsuario', $idUsuario)
            ->where('estado', 'enviado')
            ->first();

        if ($examenFinalizado) {
            // Si el examen está finalizado (estado = '2'), permitir ver detalles para revisar resultados
            // Pero si el examen está publicado (estado = '1'), bloquear acceso
            if ($examen->estado === '1') {
                return response()->json([
                    'message' => 'Ya has finalizado este examen. Solo se permite un intento por examen.',
                    'ya_finalizado' => true
                ], 422);
            }
            // Si el examen está finalizado (estado = '2'), permitir ver detalles para revisar resultados
        }

        // Verificar visibilidad: público o asignado al usuario
        $esAsignado = DB::table('examenes_usuarios')
            ->where('idExamen', $examen->idExamen)
            ->where('idUsuario', $idUsuario)
            ->exists();

        if ($examen->tipo_acceso === 'privado' && !$esAsignado) {
            return response()->json([
                'message' => 'No tienes acceso a este examen'
            ], 403);
        }

        return response()->json(new ExamenResource($examen));
    }

    /**
     * Iniciar un nuevo intento de examen
     * RF-D.1.2: Requiere idPostulacion en el request
     */
    public function iniciarExamen(Request $request, string $id): JsonResponse
    {
        // Validar que el usuario sea docente y esté activo
        $validation = $this->validateRoleAndActive(Usuario::ROL_DOCENTE);
        if ($validation !== true) {
            return $validation;
        }

        $usuario = Auth::user();
        $idUsuario = $usuario->idUsuario;
        // Usar la zona horaria de la aplicación para comparar con las fechas guardadas
        $ahora = Carbon::now(config('app.timezone'));

        try {
            DB::beginTransaction();

            $examen = Examen::with(['preguntas.opciones', 'preguntas.categoria'])->where('idExamen', $id)->firstOrFail();

            // Validaciones de disponibilidad
            if ($examen->estado !== '1') {
                Log::warning('ExamenController@iniciarExamen - Examen no publicado', [
                    'examen_id' => $examen->idExamen,
                    'estado' => $examen->estado,
                    'usuario_id' => $idUsuario,
                ]);
                return response()->json(['message' => 'El examen no está publicado'], 422);
            }

            // Verificar fechas de vigencia usando comparación directa de strings
            $fechaInicioVigencia = $examen->getRawOriginal('fecha_inicio_vigencia');
            $fechaFinVigencia = $examen->getRawOriginal('fecha_fin_vigencia');
            $ahoraStr = $ahora->format('Y-m-d H:i:s');

            Log::info('ExamenController@iniciarExamen - Validando fechas de vigencia', [
                'examen_id' => $examen->idExamen,
                'usuario_id' => $idUsuario,
                'ahora' => $ahoraStr,
                'fecha_inicio_vigencia_raw' => $fechaInicioVigencia,
                'fecha_fin_vigencia_raw' => $fechaFinVigencia,
                'timezone' => config('app.timezone'),
            ]);

            if ($fechaInicioVigencia) {
                // Comparar directamente como strings en formato Y-m-d H:i:s
                $fechaInicioStr = is_string($fechaInicioVigencia)
                    ? $fechaInicioVigencia
                    : ($fechaInicioVigencia instanceof Carbon
                        ? $fechaInicioVigencia->format('d-m-Y H:i:s')
                        : (string)$fechaInicioVigencia);

                // Si la fecha actual es menor que la fecha de inicio, el examen aún no está disponible
                $comparacionInicio = strcmp($ahoraStr, $fechaInicioStr);
                Log::info('ExamenController@iniciarExamen - Comparando fecha inicio', [
                    'examen_id' => $examen->idExamen,
                    'ahora_str' => $ahoraStr,
                    'fecha_inicio_str' => $fechaInicioStr,
                    'comparacion' => $comparacionInicio,
                ]);

                if ($comparacionInicio < 0) {
                    Log::warning('ExamenController@iniciarExamen - Examen aún no disponible (fecha inicio)', [
                        'examen_id' => $examen->idExamen,
                        'usuario_id' => $idUsuario,
                        'ahora' => $ahoraStr,
                        'fecha_inicio' => $fechaInicioStr,
                    ]);
                    return response()->json(['message' => 'El examen aún no está disponible'], 422);
                }
            }

            if ($fechaFinVigencia) {
                // Comparar directamente como strings en formato Y-m-d H:i:s
                $fechaFinStr = is_string($fechaFinVigencia)
                    ? $fechaFinVigencia
                    : ($fechaFinVigencia instanceof Carbon
                        ? $fechaFinVigencia->format('d-m-Y H:i:s')
                        : (string)$fechaFinVigencia);

                // Si la fecha actual es mayor que la fecha de fin, el examen ya finalizó
                $comparacionFin = strcmp($ahoraStr, $fechaFinStr);
                Log::info('ExamenController@iniciarExamen - Comparando fecha fin', [
                    'examen_id' => $examen->idExamen,
                    'ahora_str' => $ahoraStr,
                    'fecha_fin_str' => $fechaFinStr,
                    'comparacion' => $comparacionFin,
                ]);

                if ($comparacionFin > 0) {
                    Log::warning('ExamenController@iniciarExamen - Examen ya finalizado (fecha fin)', [
                        'examen_id' => $examen->idExamen,
                        'usuario_id' => $idUsuario,
                        'ahora' => $ahoraStr,
                        'fecha_fin' => $fechaFinStr,
                    ]);
                    return response()->json(['message' => 'El examen ya ha finalizado'], 422);
                }
            }

            // Verificar visibilidad
            $esAsignado = DB::table('examenes_usuarios')
                ->where('idExamen', $examen->idExamen)
                ->where('idUsuario', $idUsuario)
                ->exists();

            if ($examen->tipo_acceso === 'privado' && !$esAsignado) {
                return response()->json(['message' => 'No tienes acceso a este examen'], 403);
            }

            // Verificar que el usuario no haya finalizado este examen (un solo intento por examen)
            $examenFinalizado = IntentoExamen::where('idExamen', $examen->idExamen)
                ->where('idUsuario', $idUsuario)
                ->where('estado', 'enviado')
                ->first();

            if ($examenFinalizado) {
                return response()->json([
                    'message' => 'Ya has finalizado este examen. Solo se permite un intento por examen.',
                    'ya_finalizado' => true
                ], 422);
            }

            // Verificar que no tenga un examen en curso (estado 'iniciado')
            $examenEnCurso = IntentoExamen::where('idExamen', $examen->idExamen)
                ->where('idUsuario', $idUsuario)
                ->where('estado', 'iniciado')
                ->first();

            if ($examenEnCurso) {
                // Si ya tiene uno en curso, devolver la información del intento existente
                $tiempoTranscurrido = $ahora->diffInSeconds($examenEnCurso->hora_inicio);
                $tiempoRestante = max(0, ($examen->tiempo_limite * 60) - $tiempoTranscurrido);

                DB::commit();

                return response()->json([
                    'resultado_id' => $examenEnCurso->idIntento,
                    'examen' => new ExamenResource($examen),
                    'tiempo_restante' => $tiempoRestante,
                    'message' => 'Continuando examen en curso'
                ]);
            }

            // RF-D.1.2: Validar y obtener idPostulacion del request
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
                $reglaPuntaje = \App\Models\ReglaPuntaje::where('idPostulacion', $idPostulacion)
                    ->where('idSubprueba', $idSubpruebaSeleccionada)
                    ->first();

                if (!$reglaPuntaje) {
                    return response()->json([
                        'message' => 'No se encontró regla de puntaje para la subprueba seleccionada en esta postulación'
                    ], 422);
                }
            }

            // Obtener el número total de preguntas del examen
            $totalPreguntas = $examen->preguntas()->count();

            // RF-D.2.1: Calcular hora_fin = hora_inicio + tiempo_limite minutos
            $horaFin = $ahora->copy()->addMinutes($examen->tiempo_limite);

            // Crear nuevo intento
            $intento = IntentoExamen::create([
                'idExamen' => $examen->idExamen,
                'idUsuario' => $idUsuario,
                'idPostulacion' => $idPostulacion, // RF-D.1.4: Guardar idPostulacion
                'idSubpruebaSeleccionada' => $idSubpruebaSeleccionada, // Guardar subprueba seleccionada si aplica
                'hora_inicio' => $ahora,
                'hora_fin' => $horaFin, // RF-D.2.1: Hora de finalización calculada por el servidor
                'estado' => 'iniciado',
                'puntaje' => 0.00,
            ]);

            $tiempoRestante = $examen->tiempo_limite * 60; // En segundos

            DB::commit();

            return response()->json([
                'resultado_id' => $intento->idIntento,
                'examen' => new ExamenResource($examen),
                'tiempo_restante' => $tiempoRestante,
                'hora_fin' => $horaFin->format('Y-m-d H:i:s'), // RF-D.2.1: Devolver hora_fin al frontend
                'message' => 'Examen iniciado exitosamente'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al iniciar el examen',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener el estado actual de un intento
     */
    public function estadoIntento(string $resultadoId): JsonResponse
    {
        $usuario = Auth::user();
        $idUsuario = $usuario->idUsuario;

        $intento = IntentoExamen::with(['examen.preguntas.opciones', 'examen.preguntas.categoria'])
            ->where('idIntento', $resultadoId)
            ->where('idUsuario', $idUsuario)
            ->where('estado', 'iniciado') // Solo intentos en curso
            ->firstOrFail();

        $examen = $intento->examen;

        // Calcular tiempo restante
        $tiempoTranscurrido = Carbon::now(config('app.timezone'))->diffInSeconds($intento->hora_inicio);
        $tiempoRestante = max(0, ($examen->tiempo_limite * 60) - $tiempoTranscurrido);

        // Si el tiempo se agotó, finalizar automáticamente
        if ($tiempoRestante <= 0) {
            $this->finalizarExamenPorTiempo($intento);

            return response()->json([
                'message' => 'El tiempo del examen se ha agotado',
                'tiempo_agotado' => true
            ], 422);
        }

        // Obtener respuestas guardadas
        $respuestasGuardadas = DB::table('respuestas')
            ->where('idIntento', $intento->idIntento)
            ->pluck('opciones_seleccionadas', 'idPregunta')
            ->toArray();

        return response()->json([
            'resultado_id' => $intento->idIntento,
            'examen' => new ExamenResource($examen),
            'tiempo_restante' => $tiempoRestante,
            'respuestas_guardadas' => $respuestasGuardadas
        ]);
    }

    /**
     * Finalizar examen por tiempo agotado
     */
    private function finalizarExamenPorTiempo(IntentoExamen $intento): void
    {
        // Calcular puntaje con las respuestas actuales
        $puntaje = $this->calcularPuntajeResultado($intento);

        $intento->update([
            'puntaje' => $puntaje,
            'hora_fin' => Carbon::now(config('app.timezone')),
            'estado' => 'enviado' // Finalizado
        ]);
    }

    /**
     * Calcular el puntaje de un resultado
     */
    private function calcularPuntajeResultado(IntentoExamen $intento): float
    {
        $puntajeTotal = 0.00;
        $examen = $intento->examen;

        // Obtener respuestas del intento
        $respuestas = DB::table('respuestas')
            ->where('idIntento', $intento->idIntento)
            ->get();

        foreach ($respuestas as $respuesta) {
            $pregunta = DB::table('preguntas')
                ->where('idPregunta', $respuesta->idPregunta)
                ->first();

            if (!$pregunta) continue;

            // Obtener opciones correctas de la pregunta
            $opcionesCorrectas = DB::table('opciones_pregunta')
                ->where('idPregunta', $pregunta->idPregunta)
                ->where('es_correcta', true)
                ->pluck('idOpcion')
                ->toArray();

            // Obtener opciones seleccionadas (desde JSON)
            $opcionesSeleccionadas = json_decode($respuesta->opciones_seleccionadas ?? '[]', true) ?? [];

            // Verificar si la respuesta es correcta
            $esCorrecta = !array_diff($opcionesCorrectas, $opcionesSeleccionadas) &&
                !array_diff($opcionesSeleccionadas, $opcionesCorrectas);

            // Calcular puntaje de la pregunta
            $puntajePregunta = $this->calcularPuntajePregunta($pregunta->idPregunta, $examen);

            if ($esCorrecta) {
                $puntajeTotal += $puntajePregunta;
            }

            // Actualizar la respuesta
            DB::table('respuestas')
                ->where('idRespuesta', $respuesta->idRespuesta)
                ->update([
                    'es_correcta' => $esCorrecta ? 1 : 0,
                    'puntaje_obtenido' => $esCorrecta ? $puntajePregunta : 0.00
                ]);
        }

        return $puntajeTotal;
    }

    /**
     * Calcular puntaje de una pregunta específica
     * El puntaje se determina por las reglas de puntaje de las subpruebas
     */
    private function calcularPuntajePregunta(string $idPregunta, Examen $examen): float
    {
        // Obtener la subprueba de la pregunta desde el pivot
        $preguntaPivot = DB::table('examen_pregunta')
            ->where('idExamen', $examen->idExamen)
            ->where('idPregunta', $idPregunta)
            ->first();

        if ($preguntaPivot && $preguntaPivot->idSubprueba) {
            // Obtener la regla de puntaje de la subprueba
            $reglaPuntaje = DB::table('reglas_puntaje')
                ->where('idSubprueba', $preguntaPivot->idSubprueba)
                ->first();

            if ($reglaPuntaje && $reglaPuntaje->puntaje_por_pregunta) {
                return (float)$reglaPuntaje->puntaje_por_pregunta;
            }
        }

        // Si no hay regla de puntaje, usar un valor por defecto
        return 1.0;
    }
}
