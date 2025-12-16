<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreExamenRequest;
use App\Http\Requests\Admin\UpdateExamenRequest;
use App\Http\Resources\ExamenResource;
use App\Models\Examen;
use App\Models\Pregunta;
use App\Models\Categoria;
use App\Models\ArchivoAdjunto;
use App\Services\ExamenCompletitudService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class ExamenController extends Controller
{
    /**
     * Verificar si el examen tiene intentos iniciados (en progreso)
     * Si tiene intentos en progreso, no se puede modificar
     */
    private function tieneIntentosIniciados(Examen $examen): bool
    {
        // Solo verificar intentos con estado 'iniciado' (en progreso)
        // Los intentos con estado 'enviado' (finalizados) no bloquean la modificación
        return $examen->intentos()->where('estado', 'iniciado')->exists();
    }

    /**
     * Verificar y lanzar error si el examen tiene intentos iniciados
     */
    private function verificarSinIntentos(Examen $examen): void
    {
        if ($this->tieneIntentosIniciados($examen)) {
            $cantidadIntentos = $examen->intentos()->where('estado', 'iniciado')->count();
            throw new \Exception(
                "No se puede modificar el examen porque hay {$cantidadIntentos} intento(s) en progreso por docente(s) o participante(s). " .
                    "Una vez que alguien ha comenzado a tomar el examen, no se pueden realizar modificaciones hasta que todos los intentos estén finalizados."
            );
        }
    }

    /**
     * Verificar si el examen está finalizado (estado = '1' publicado o '2' finalizado)
     * Si está finalizado, lanzar una excepción
     */
    private function verificarExamenNoFinalizado(Examen $examen): void
    {
        if ($examen->estado === '1' || $examen->estado === '2') {
            throw new \Exception(
                'No se puede modificar un examen finalizado. Solo se puede ver su configuración, duplicarlo o eliminarlo.'
            );
        }
    }

    /**
     * Helper para formatear fechas en getDatosPaso
     * Maneja diferentes tipos de valores de fecha de forma segura
     */
    private function formatearFechaParaPaso(Examen $examen, string $attribute): ?string
    {
        try {
            // Primero intentar obtener el valor usando el accessor (puede devolver Carbon)
            $value = null;
            try {
                $value = $examen->$attribute;
            } catch (\Exception $e) {
                // Si falla, intentar obtener el valor raw
                try {
                    $value = $examen->getRawOriginal($attribute);
                } catch (\Exception $e2) {
                    // Si ambos fallan, retornar null
                    return null;
                }
            }

            if (!$value) {
                return null;
            }

            // Si es una instancia de Carbon, formatear directamente
            if ($value instanceof \Carbon\Carbon) {
                return $value->format('d-m-Y H:i');
            }

            // Si es string, intentar parsearlo
            if (is_string($value)) {
                if (trim($value) === '') {
                    return null;
                }
                try {
                    return \Carbon\Carbon::parse($value)->format('d-m-Y H:i');
                } catch (\Exception $e) {
                    // Si no se puede parsear, devolver el valor original
                    Log::warning('Error al parsear fecha en formatearFechaParaPaso', [
                        'attribute' => $attribute,
                        'value' => $value,
                        'error' => $e->getMessage()
                    ]);
                    return $value;
                }
            }

            // Si es un objeto DateTime, convertirlo a Carbon
            if ($value instanceof \DateTime) {
                return \Carbon\Carbon::instance($value)->format('d-m-Y H:i');
            }

            return null;
        } catch (\Exception $e) {
            Log::warning('Error al formatear fecha en getDatosPaso', [
                'attribute' => $attribute,
                'examen_id' => $examen->idExamen ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Verificar si un examen debe finalizarse y actualizar su estado
     * Un examen se finaliza cuando:
     * 1. Todos los intentos están finalizados (estado = 'enviado')
     * 2. O todos los intentos iniciados han excedido el tiempo límite
     *
     * @param Examen $examen
     * @return bool True si el examen fue finalizado, False si no
     */
    public static function verificarYFinalizarExamen(Examen $examen): bool
    {
        // Si el examen ya está finalizado, no hacer nada
        if ($examen->estado === '2') {
            return false;
        }

        // Solo finalizar exámenes publicados
        if ($examen->estado !== '1') {
            return false;
        }

        $ahora = Carbon::now();

        // PRIORIDAD 1: Si la fecha_fin_vigencia ha pasado, finalizar inmediatamente
        if ($examen->fecha_fin_vigencia) {
            $fechaFinRaw = $examen->getRawOriginal('fecha_fin_vigencia');
            $ahoraStr = \App\Services\FechaService::ahoraString();

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
                Log::info('Examen finalizado automáticamente por fecha_fin_vigencia', [
                    'examen_id' => $examen->idExamen,
                    'codigo_examen' => $examen->codigo_examen,
                    'fecha_fin_vigencia' => $fechaFinRaw,
                    'intentos_cerrados' => $intentosEnProgreso->count(),
                ]);

                // Ejecutar el comando para asegurar que todos los intentos estén cerrados
                try {
                    \Illuminate\Support\Facades\Artisan::call('examenes:cerrar-intentos-finalizados');
                    Log::info('Comando cerrar-intentos-finalizados ejecutado después de finalizar examen automáticamente por fecha', [
                        'examen_id' => $examen->idExamen,
                        'codigo_examen' => $examen->codigo_examen,
                    ]);
                } catch (\Exception $e) {
                    // No fallar si el comando tiene un error, solo registrar
                    Log::warning('Error al ejecutar comando cerrar-intentos-finalizados en finalización automática por fecha', [
                        'examen_id' => $examen->idExamen,
                        'error' => $e->getMessage(),
                    ]);
                }

                return true;
            }
        }

        // PRIORIDAD 2: Verificar si todos los usuarios que deben dar el examen han finalizado
        $usuariosQueDebenFinalizar = [];

        if ($examen->tipo_acceso === 'publico') {
            // Si es público: todos los usuarios de tipo docente deben finalizar
            $usuariosQueDebenFinalizar = \App\Models\Usuario::where('rol', \App\Models\Usuario::ROL_DOCENTE)
                ->where('estado', \App\Models\Usuario::ESTADO_ACTIVO)
                ->pluck('idUsuario')
                ->toArray();
        } else {
            // Si es privado: todos los usuarios asignados deben finalizar
            $usuariosQueDebenFinalizar = $examen->usuariosAsignados()
                ->pluck('idUsuario')
                ->toArray();
        }

        // Si no hay usuarios que deban finalizar, no se puede finalizar el examen
        if (empty($usuariosQueDebenFinalizar)) {
            Log::info('Examen no puede finalizarse: no hay usuarios que deban finalizarlo', [
                'examen_id' => $examen->idExamen,
                'codigo_examen' => $examen->codigo_examen,
                'tipo_acceso' => $examen->tipo_acceso,
            ]);
            return false;
        }

        // Verificar que todos los usuarios tengan al menos un intento finalizado (estado 'enviado')
        $usuariosConIntentoFinalizado = $examen->intentos()
            ->where('estado', 'enviado')
            ->distinct()
            ->pluck('idUsuario')
            ->toArray();

        // Verificar si todos los usuarios que deben finalizar tienen un intento finalizado
        $todosHanFinalizado = true;
        $usuariosPendientes = [];

        foreach ($usuariosQueDebenFinalizar as $idUsuario) {
            if (!in_array($idUsuario, $usuariosConIntentoFinalizado)) {
                $todosHanFinalizado = false;
                $usuariosPendientes[] = $idUsuario;
            }
        }

        if ($todosHanFinalizado) {
            // Cerrar todos los intentos en progreso antes de finalizar el examen
            $intentosEnProgreso = $examen->intentos()->where('estado', 'iniciado')->get();
            foreach ($intentosEnProgreso as $intento) {
                $intento->estado = 'enviado';
                $intento->hora_fin = $ahora;
                $intento->save();
            }

            $examen->estado = '2';
            $examen->save();

            Log::info('Examen finalizado automáticamente: todos los usuarios han finalizado', [
                'examen_id' => $examen->idExamen,
                'codigo_examen' => $examen->codigo_examen,
                'tipo_acceso' => $examen->tipo_acceso,
                'total_usuarios' => count($usuariosQueDebenFinalizar),
                'usuarios_finalizados' => count($usuariosConIntentoFinalizado),
            ]);

            return true;
        } else {
            Log::debug('Examen no finalizado: hay usuarios pendientes', [
                'examen_id' => $examen->idExamen,
                'codigo_examen' => $examen->codigo_examen,
                'tipo_acceso' => $examen->tipo_acceso,
                'total_usuarios_requeridos' => count($usuariosQueDebenFinalizar),
                'usuarios_finalizados' => count($usuariosConIntentoFinalizado),
                'usuarios_pendientes' => count($usuariosPendientes),
            ]);
        }

        return false;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            Log::info('ExamenController@index - Request recibido', [
                'query_params' => $request->all(),
                'method' => $request->method(),
                'url' => $request->fullUrl()
            ]);

            // Optimizar con eager loading para evitar N+1 queries
            $query = Examen::with([
                'tipoConcurso',
                'subpruebas'
            ])
                ->withCount(['preguntas', 'intentos'])
                ->when($request->filled('estado'), fn($q) => $q->where('estado', $request->estado))
                ->when($request->filled('idTipoConcurso'), fn($q) => $q->where('idTipoConcurso', $request->idTipoConcurso))
                ->when($request->filled('search'), function ($q) use ($request) {
                    // Búsqueda exacta solo por código de examen
                    $texto = trim($request->search);
                    $q->where('codigo_examen', '=', $texto);
                })
                ->orderByDesc('created_at');

            $perPage = $request->integer('per_page', 10);
            $examenes = $query->paginate($perPage);

            Log::info('ExamenController@index - Respuesta generada', [
                'total' => $examenes->total(),
                'per_page' => $examenes->perPage(),
                'current_page' => $examenes->currentPage(),
                'last_page' => $examenes->lastPage()
            ]);

            // Transformar la colección manualmente para capturar errores en cada item
            $examenesData = $examenes->getCollection()->map(function ($examen) use ($request) {
                try {
                    $resource = new ExamenResource($examen);
                    return $resource->toArray($request);
                } catch (\Exception $e) {
                    Log::warning('Error al transformar examen en ExamenController@index: ' . $e->getMessage(), [
                        'examen_id' => $examen->idExamen ?? 'unknown',
                        'error' => $e->getMessage()
                    ]);
                    // Retornar un array básico si falla la transformación
                    return [
                        'idExamen' => $examen->idExamen ?? null,
                        'id' => $examen->idExamen ?? null,
                        'codigo_examen' => $examen->codigo_examen ?? null,
                        'titulo' => $examen->titulo ?? 'Error al cargar',
                        'descripcion' => $examen->descripcion ?? null,
                        'estado' => $examen->estado ?? '0',
                        'created_at' => null,
                        'updated_at' => null,
                        'fecha_creacion' => null,
                        'fecha_inicio_vigencia' => null,
                        'fecha_fin_vigencia' => null,
                        'completitud' => 0,
                        'total_preguntas' => 0,
                        'veces_usado' => 0,
                        'intentos_completados' => 0,
                        'intentos_en_progreso' => 0,
                        'promedio_puntaje' => null,
                    ];
                }
            });

            // Reconstruir la respuesta de paginación
            $responseData = [
                'data' => $examenesData->values()->toArray(),
                'current_page' => $examenes->currentPage(),
                'per_page' => $examenes->perPage(),
                'total' => $examenes->total(),
                'last_page' => $examenes->lastPage(),
                'from' => $examenes->firstItem(),
                'to' => $examenes->lastItem(),
            ];

            return response()->json($responseData);
        } catch (\Exception $e) {
            Log::error('Error en ExamenController@index: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'message' => 'Error al obtener los exámenes',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $categorias = Categoria::orderBy('nombre')->get(['idCategoria as id', 'nombre']);
        $tipoConcursos = \App\Models\TipoConcurso::orderBy('nombre')->get(['idTipoConcurso as id', 'nombre']);

        return response()->json([
            'categorias' => $categorias,
            'tipo_concursos' => $tipoConcursos,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreExamenRequest $request)
    {
        try {
            DB::beginTransaction();

            $examenData = $request->only([
                'codigo_examen',
                'titulo',
                'idTipoConcurso',
                'descripcion',
                'tipo_acceso',
                'estado',
                'tiempo_limite'
            ]);

            // Procesar fecha_inicio_vigencia (opcional, se configura en Paso 6 del wizard)
            if ($request->filled('fecha_inicio_vigencia')) {
                // Parsear la fecha como absoluta (sin conversión de zona horaria)
                // El formato datetime-local envía "YYYY-MM-DDTHH:mm" sin zona horaria
                // Convertir a formato MySQL datetime y guardar directamente sin conversión
                $fecha = str_replace('T', ' ', $request->fecha_inicio_vigencia);
                // Si no tiene segundos, agregarlos
                if (strlen($fecha) === 16) {
                    $fecha .= ':00';
                }
                $examenData['fecha_inicio_vigencia'] = $fecha;
            }
            // Si no viene, dejar null (se configurará en el Paso 6)

            // Procesar fecha_fin_vigencia (opcional, se configura en Paso 6 del wizard)
            if ($request->filled('fecha_fin_vigencia')) {
                // Parsear la fecha como absoluta (sin conversión de zona horaria)
                // Convertir a formato MySQL datetime y guardar directamente sin conversión
                $fecha = str_replace('T', ' ', $request->fecha_fin_vigencia);
                // Si no tiene segundos, agregarlos
                if (strlen($fecha) === 16) {
                    $fecha .= ':00';
                }
                $examenData['fecha_fin_vigencia'] = $fecha;
            }
            // Si no viene, dejar null (se configurará en el Paso 6)

            // Inicializar paso_actual en 0 (ningún paso completado)
            $examenData['paso_actual'] = 0;
            // Estado inicial siempre es Borrador (0)
            $examenData['estado'] = '0';

            // Validar que los campos mínimos requeridos estén presentes antes de crear
            // Para exámenes básicos (Borrador), título y descripción pueden estar vacíos
            if (empty($examenData['codigo_examen']) || empty($examenData['idTipoConcurso'])) {
                throw new \Exception('Faltan campos requeridos para crear el examen');
            }

            // Si título o descripción están vacíos, establecer como null o cadena vacía
            if (!isset($examenData['titulo']) || $examenData['titulo'] === '') {
                $examenData['titulo'] = '';
            }
            if (!isset($examenData['descripcion']) || $examenData['descripcion'] === '') {
                $examenData['descripcion'] = '';
            }

            Log::info('Creando examen', [
                'examen_data' => $examenData,
            ]);

            $examen = Examen::create($examenData);

            // Asociar preguntas manualmente si se proporcionan
            if ($request->has('preguntas') && is_array($request->preguntas)) {
                // Asociar preguntas manualmente
                foreach ($request->preguntas as $preguntaData) {
                    $examen->preguntas()->attach($preguntaData['idPregunta'], [
                        'orden' => $preguntaData['orden'],
                        'idSubprueba' => $preguntaData['idSubprueba'],
                        // El puntaje se determina por las reglas de puntaje, no se almacena aquí
                    ]);
                }
            }

            // Asignar usuarios si es examen privado
            if ($request->tipo_acceso === 'privado' && $request->has('usuarios_asignados') && is_array($request->usuarios_asignados)) {
                $usuarioActual = Auth::user();
                Log::info('ExamenController@store - Asignando usuarios al examen', [
                    'examen_id' => $examen->idExamen,
                    'usuarios_count' => count($request->usuarios_asignados),
                    'usuarios' => $request->usuarios_asignados,
                ]);

                foreach ($request->usuarios_asignados as $idUsuario) {
                    // Verificar que el usuario existe y está activo antes de asignar
                    $usuario = \App\Models\Usuario::where('idUsuario', $idUsuario)
                        ->where('estado', \App\Models\Usuario::ESTADO_ACTIVO)
                        ->first();

                    if ($usuario) {
                        // Usar el modelo ExamenesUsuario directamente para asegurar que se guarde correctamente
                        \App\Models\ExamenesUsuario::updateOrCreate(
                            [
                                'idExamen' => $examen->idExamen,
                                'idUsuario' => $idUsuario,
                            ],
                            [
                                'asignado_por' => $usuarioActual->idUsuario,
                                'fecha_asignacion' => Carbon::now(),
                            ]
                        );

                        Log::info('ExamenController@store - Usuario asignado', [
                            'examen_id' => $examen->idExamen,
                            'usuario_id' => $idUsuario,
                            'usuario_nombre' => $usuario->nombre . ' ' . $usuario->apellidos,
                        ]);
                    } else {
                        Log::warning('ExamenController@store - Usuario no encontrado o inactivo', [
                            'examen_id' => $examen->idExamen,
                            'usuario_id' => $idUsuario,
                        ]);
                    }
                }
            }

            // Actualizar paso_actual si el paso 1 está completo
            $completitudService = new ExamenCompletitudService();
            if ($completitudService->paso1Completo($examen)) {
                $examen->paso_actual = 1;
                $examen->save();
            }

            DB::commit();

            // Limpiar caché de exámenes
            $this->limpiarCacheExamenes();
            Cache::forget('admin_dashboard_estadisticas');

            $examen->load(['tipoConcurso', 'preguntas', 'usuariosAsignados', 'subpruebas', 'postulaciones']);
            return (new ExamenResource($examen))->response()->setStatusCode(201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al crear examen', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
            ]);
            return response()->json([
                'message' => 'Error al crear el examen',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor',
                'trace' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        // Obtener el examen manualmente usando idExamen ya que el route model binding puede no funcionar correctamente
        // con primary keys personalizadas
        $examen = Examen::where('idExamen', $id)->first();

        if (!$examen) {
            Log::error('ExamenController@show - Examen no encontrado', [
                'id_buscado' => $id,
                'tipo_id' => gettype($id),
            ]);
            return response()->json([
                'message' => 'Examen no encontrado'
            ], 404);
        }

        // Optimizar con eager loading para evitar N+1 queries
        $examen->load(['tipoConcurso', 'subpruebas']);

        Log::info('ExamenController@show - Examen encontrado (solo datos básicos)', [
            'idExamen' => $examen->idExamen,
            'codigo_examen' => $examen->codigo_examen,
            'titulo' => $examen->titulo,
        ]);

        return response()->json([
            'data' => new ExamenResource($examen),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit($id)
    {
        // Obtener el examen manualmente usando idExamen
        $examen = Examen::where('idExamen', $id)->firstOrFail();

        $examen->load(['preguntas.categoria', 'preguntas.opciones', 'usuariosAsignados']);

        $categorias = Categoria::orderBy('nombre')->get(['idCategoria as id', 'nombre']);
        $tipoConcursos = \App\Models\TipoConcurso::orderBy('nombre')->get(['idTipoConcurso as id', 'nombre']);

        return response()->json([
            'data' => new ExamenResource($examen),
            'categorias' => $categorias,
            'tipo_concursos' => $tipoConcursos,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateExamenRequest $request, $id)
    {
        try {
            // Obtener el ID del parámetro (puede ser un modelo o un ID numérico)
            $examenId = null;
            $examen = null;

            if ($id instanceof Examen) {
                $examen = $id;
                $examenId = $examen->idExamen;
            } else {
                $examenId = (int) $id;
                // Cargar el examen manualmente usando idExamen
                $examen = Examen::where('idExamen', $examenId)->first();
            }

            // Verificar que el examen existe
            if (!$examen || !$examen->idExamen) {
                Log::error('ExamenController@update - El examen no existe', [
                    'examen_id_buscado' => $examenId,
                    'examen' => $examen ? $examen->toArray() : 'null',
                ]);
                return response()->json([
                    'message' => 'Examen no encontrado o ID inválido'
                ], 404);
            }

            Log::info('ExamenController@update - Request recibido', [
                'examen_id' => $examen->idExamen,
                'request_data' => $request->all(),
                'method' => $request->method(),
            ]);

            // Verificar que el examen no esté finalizado
            try {
                $this->verificarExamenNoFinalizado($examen);
            } catch (\Exception $e) {
                return response()->json([
                    'message' => $e->getMessage(),
                ], 422);
            }

            // Verificar que no haya intentos iniciados antes de modificar
            try {
                $this->verificarSinIntentos($examen);
            } catch (\Exception $e) {
                return response()->json([
                    'message' => $e->getMessage(),
                ], 422);
            }

            DB::beginTransaction();

            // Determinar si solo se están actualizando las fechas (desde el Paso 6 del wizard)
            $soloFechas = ($request->has('fecha_inicio_vigencia') || $request->has('fecha_fin_vigencia'))
                && !$request->has('codigo_examen') && !$request->has('titulo') && !$request->has('idTipoConcurso');

            $updateData = [];
            $nuevoEstado = $examen->estado; // Por defecto, mantener el estado actual

            if (!$soloFechas) {
                // Obtener solo los campos básicos (sin fechas, se manejan por separado)
                $updateData = $request->only([
                    'codigo_examen',
                    'titulo',
                    'idTipoConcurso',
                    'descripcion',
                    'tipo_acceso',
                    'tiempo_limite'
                ]);

                // IMPORTANTE: Cuando se actualiza desde el wizard, mantener el estado en borrador (0)
                // Solo permitir cambiar el estado si se envía explícitamente Y el examen está completo
                $nuevoEstado = '0'; // Por defecto, mantener en borrador
                if ($request->has('estado') && $request->estado !== '0') {
                    // Si se intenta cambiar a un estado diferente de borrador, verificar completitud
                    $completitudService = new \App\Services\ExamenCompletitudService();
                    if (!$completitudService->puedePublicar($examen)) {
                        DB::rollBack();
                        return response()->json([
                            'message' => 'No se puede publicar el examen. Debe completar todos los pasos del wizard: subpruebas, postulaciones, reglas de puntaje y asignar preguntas.',
                        ], 422);
                    }
                    $nuevoEstado = $request->estado;
                }
                $updateData['estado'] = $nuevoEstado;
            } else {
                // Si solo se están actualizando las fechas, mantener el estado actual o usar el enviado
                if ($request->has('estado')) {
                    $nuevoEstado = $request->estado;
                    $updateData['estado'] = $request->estado;
                }
            }

            // Manejar fechas de vigencia: solo actualizar si se envían explícitamente
            // Esto permite que el Paso 1 del wizard actualice sin requerir las fechas (se configuran en Paso 6)
            if ($request->filled('fecha_inicio_vigencia')) {
                // Parsear la fecha como absoluta (sin conversión de zona horaria)
                // Convertir a formato MySQL datetime y guardar directamente sin conversión
                $fecha = str_replace('T', ' ', $request->fecha_inicio_vigencia);
                // Si no tiene segundos, agregarlos
                if (strlen($fecha) === 16) {
                    $fecha .= ':00';
                }
                $updateData['fecha_inicio_vigencia'] = $fecha;
            }

            if ($request->filled('fecha_fin_vigencia')) {
                // Parsear la fecha como absoluta (sin conversión de zona horaria)
                // Convertir a formato MySQL datetime y guardar directamente sin conversión
                $fecha = str_replace('T', ' ', $request->fecha_fin_vigencia);
                // Si no tiene segundos, agregarlos
                if (strlen($fecha) === 16) {
                    $fecha .= ':00';
                }
                $updateData['fecha_fin_vigencia'] = $fecha;
            }

            // Validar que la diferencia entre fechas de vigencia sea al menos igual al tiempo límite
            // Solo validar si ambas fechas están presentes
            if ($request->filled('fecha_inicio_vigencia') && $request->filled('fecha_fin_vigencia')) {
                try {
                    $fechaInicio = Carbon::parse($updateData['fecha_inicio_vigencia']);
                    $fechaFin = Carbon::parse($updateData['fecha_fin_vigencia']);
                    $tiempoLimite = $examen->tiempo_limite;

                    if ($tiempoLimite) {
                        // Calcular la diferencia en minutos
                        $diferenciaMinutos = $fechaInicio->diffInMinutes($fechaFin);

                        // Verificar que la diferencia sea al menos igual al tiempo límite
                        if ($diferenciaMinutos < $tiempoLimite) {
                            DB::rollBack();
                            return response()->json([
                                'message' => "La diferencia entre la fecha de inicio y fin de vigencia ({$diferenciaMinutos} minutos) debe ser al menos igual al tiempo límite del examen ({$tiempoLimite} minutos).",
                            ], 422);
                        }
                    }
                } catch (\Exception $e) {
                    // Si hay error al parsear las fechas, la validación de 'date' ya lo capturará
                    Log::warning('Error al validar tiempo entre fechas de vigencia', [
                        'error' => $e->getMessage(),
                        'examen_id' => $examen->idExamen,
                    ]);
                }
            }

            // Si se está cambiando de Borrador (0) a Publicado (1) y no hay fecha_inicio_vigencia establecida
            // (solo si no se envió en el request y el examen no tiene fecha)
            if ($examen->estado === '0' && $nuevoEstado === '1' && !$examen->fecha_inicio_vigencia && !$request->filled('fecha_inicio_vigencia')) {
                // Usar la fecha actual como fallback
                $updateData['fecha_inicio_vigencia'] = Carbon::now(config('app.timezone'))->format('Y-m-d H:i:s');
            }

            Log::info('ExamenController@update - Datos a actualizar', [
                'update_data' => $updateData
            ]);

            // Guardar el ID antes del update
            $examenId = $examen->idExamen;

            $examen->update($updateData);

            // Asegurar que el ID se mantiene después del update
            if (!$examen->idExamen) {
                $examen->setAttribute('idExamen', $examenId);
            }

            // Refrescar el modelo para asegurar que tiene todos los datos actualizados
            $examen->refresh();

            // Verificar que el examen tiene un ID válido
            if (!$examen->idExamen) {
                DB::rollBack();
                Log::error('ExamenController@update - El examen no tiene idExamen después del update', [
                    'examen_id_original' => $examenId,
                    'examen' => $examen->toArray(),
                ]);
                return response()->json([
                    'message' => 'Error al actualizar el examen: ID no disponible'
                ], 500);
            }

            // Actualizar preguntas si se proporcionan
            if ($request->has('preguntas') && is_array($request->preguntas) && count($request->preguntas) > 0) {
                // Actualizar preguntas manualmente
                $examenId = $examen->idExamen;

                // Verificar que tenemos el idExamen
                if (!$examenId) {
                    DB::rollBack();
                    Log::error('ExamenController@update - El examen no tiene idExamen antes de attach', [
                        'examen' => $examen->toArray(),
                    ]);
                    return response()->json([
                        'message' => 'Error al actualizar preguntas: ID del examen no disponible'
                    ], 500);
                }

                Log::info('ExamenController@update - Actualizando preguntas', [
                    'examen_id' => $examenId,
                    'preguntas_count' => count($request->preguntas),
                ]);

                // Detach todas las preguntas existentes
                $examen->preguntas()->detach();

                // Attach las nuevas preguntas usando el ID explícitamente
                foreach ($request->preguntas as $preguntaData) {
                    try {
                        $pivotData = [
                            'orden' => $preguntaData['orden'] ?? 0,
                        ];

                        // Incluir idSubprueba si se proporciona y es válido (mayor que 0)
                        if (isset($preguntaData['idSubprueba']) && $preguntaData['idSubprueba'] > 0) {
                            // Verificar que la subprueba pertenezca al examen
                            $subprueba = $examen->subpruebas()->where('idSubprueba', $preguntaData['idSubprueba'])->first();
                            if ($subprueba) {
                                $pivotData['idSubprueba'] = $preguntaData['idSubprueba'];
                            } else {
                                // Si no existe la subprueba, usar la primera subprueba del examen o null
                                $subpruebaDefault = $examen->subpruebas()->first();
                                if ($subpruebaDefault) {
                                    $pivotData['idSubprueba'] = $subpruebaDefault->idSubprueba;
                                }
                            }
                        } else {
                            // Si idSubprueba es 0 o null, usar la primera subprueba del examen si existe
                            $subpruebaDefault = $examen->subpruebas()->first();
                            if ($subpruebaDefault) {
                                $pivotData['idSubprueba'] = $subpruebaDefault->idSubprueba;
                            }
                        }

                        $examen->preguntas()->attach($preguntaData['idPregunta'], $pivotData);
                    } catch (\Exception $e) {
                        DB::rollBack();
                        Log::error('ExamenController@update - Error al hacer attach de pregunta', [
                            'examen_id' => $examenId,
                            'pregunta_id' => $preguntaData['idPregunta'] ?? 'N/A',
                            'error' => $e->getMessage(),
                            'pregunta_data' => $preguntaData,
                        ]);
                        throw $e;
                    }
                }
            }

            // Actualizar usuarios asignados
            if ($request->has('usuarios_asignados')) {
                $usuarioActual = Auth::user();

                Log::info('ExamenController@update - Actualizando usuarios asignados', [
                    'examen_id' => $examen->idExamen,
                    'tipo_acceso' => $request->tipo_acceso,
                    'usuarios_asignados' => $request->usuarios_asignados,
                    'usuarios_count' => is_array($request->usuarios_asignados) ? count($request->usuarios_asignados) : 0,
                ]);

                // Si es examen privado, actualizar asignaciones
                if ($request->tipo_acceso === 'privado') {
                    // Eliminar todas las asignaciones actuales
                    // usuariosAsignados() es HasMany, usar delete()
                    $examen->usuariosAsignados()->delete();

                    // Si hay usuarios asignados, crear nuevas asignaciones
                    if (is_array($request->usuarios_asignados) && count($request->usuarios_asignados) > 0) {
                        foreach ($request->usuarios_asignados as $idUsuario) {
                            // Verificar que el usuario existe y está activo antes de asignar
                            $usuario = \App\Models\Usuario::where('idUsuario', $idUsuario)
                                ->where('estado', \App\Models\Usuario::ESTADO_ACTIVO)
                                ->first();

                            if ($usuario) {
                                // Usar el modelo ExamenesUsuario directamente para asegurar que se guarde correctamente
                                \App\Models\ExamenesUsuario::updateOrCreate(
                                    [
                                        'idExamen' => $examen->idExamen,
                                        'idUsuario' => $idUsuario,
                                    ],
                                    [
                                        'asignado_por' => $usuarioActual->idUsuario,
                                        'fecha_asignacion' => Carbon::now(),
                                    ]
                                );

                                Log::info('ExamenController@update - Usuario asignado', [
                                    'examen_id' => $examen->idExamen,
                                    'usuario_id' => $idUsuario,
                                    'usuario_nombre' => $usuario->nombre . ' ' . $usuario->apellidos,
                                ]);
                            } else {
                                Log::warning('ExamenController@update - Usuario no encontrado o inactivo', [
                                    'examen_id' => $examen->idExamen,
                                    'usuario_id' => $idUsuario,
                                ]);
                            }
                        }
                    }
                } else {
                    // Si es público, eliminar todas las asignaciones (no tiene sentido tener asignaciones si es público)
                    // usuariosAsignados() es HasMany, usar delete()
                    $examen->usuariosAsignados()->delete();
                    Log::info('ExamenController@update - Examen público, eliminando asignaciones');
                }
            }

            DB::commit();

            // Limpiar caché de exámenes
            $this->limpiarCacheExamenes();
            Cache::forget("admin_examen_show_{$examen->idExamen}");
            Cache::forget('admin_dashboard_estadisticas');

            $examen->load(['tipoConcurso', 'preguntas', 'usuariosAsignados']);
            return new ExamenResource($examen);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al actualizar el examen',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            // Obtener el examen manualmente
            $examen = Examen::where('idExamen', $id)->first();

            if (!$examen) {
                return response()->json([
                    'message' => 'Examen no encontrado'
                ], 404);
            }

            // Solo permitir eliminar exámenes en estado '0' (Borrador) o '2' (Finalizado)
            // No permitir eliminar exámenes publicados (estado = '1') que tengan intentos iniciados
            if ($examen->estado === '1') {
                // Si está publicado, verificar si tiene intentos iniciados
                if ($this->tieneIntentosIniciados($examen)) {
                    $cantidadIntentos = $examen->intentos()->where('estado', 'iniciado')->count();
                    return response()->json([
                        'message' => "No se puede eliminar el examen porque está publicado y hay {$cantidadIntentos} intento(s) en progreso. " .
                            "Solo se pueden eliminar exámenes en estado 'Borrador' (0) o 'Finalizado' (2). " .
                            "Para eliminar un examen publicado, primero debe finalizarse (esperar a que todos los intentos terminen)."
                    ], 422);
                }
                // Si está publicado pero no tiene intentos iniciados, permitir eliminar
                Log::info('Eliminando examen publicado sin intentos iniciados', [
                    'examen_id' => $examen->idExamen,
                    'estado' => $examen->estado
                ]);
            }

            // Verificar si tiene intentos asociados (solo advertencia, no bloqueo para borradores y finalizados)
            $tieneIntentos = $examen->intentos()->exists();
            if ($tieneIntentos) {
                Log::warning('Eliminando examen con intentos asociados', [
                    'examen_id' => $examen->idExamen,
                    'estado' => $examen->estado,
                    'intentos_count' => $examen->intentos()->count()
                ]);
            }

            DB::beginTransaction();

            // Cargar relaciones necesarias antes de eliminar
            $examen->load('subpruebas.reglasPuntaje');

            // Eliminar relaciones
            // preguntas() es BelongsToMany, usar detach()
            $examen->preguntas()->detach();
            // usuariosAsignados() es HasMany, usar delete()
            $examen->usuariosAsignados()->delete();

            // Eliminar subpruebas y sus reglas de puntaje asociadas
            foreach ($examen->subpruebas as $subprueba) {
                // Eliminar reglas de puntaje asociadas a la subprueba
                $subprueba->reglasPuntaje()->delete();
                // Eliminar la subprueba
                $subprueba->delete();
            }

            // Eliminar archivos adjuntos relacionados
            $archivos = ArchivoAdjunto::where('tipo_recurso', 'examen_descripcion')
                ->where('id_recurso', $examen->idExamen)
                ->get();

            foreach ($archivos as $archivo) {
                // Eliminar archivo físico
                if (Storage::disk('public')->exists($archivo->ruta_almacenamiento)) {
                    Storage::disk('public')->delete($archivo->ruta_almacenamiento);
                }
                // Eliminar registro
                $archivo->delete();
            }

            // Guardar el ID antes de eliminar para limpiar caché
            $examenId = $examen->idExamen;

            // Eliminar el examen (las relaciones con intentos se eliminarán por CASCADE si están configuradas)
            $examen->delete();

            DB::commit();

            // Limpiar caché de exámenes
            $this->limpiarCacheExamenes();
            Cache::forget("admin_examen_show_{$examenId}");
            Cache::forget('admin_dashboard_estadisticas');

            Log::info('Examen eliminado definitivamente', [
                'examen_id' => $id,
                'estado' => $examen->estado,
                'tenia_intentos' => $tieneIntentos
            ]);

            return response()->json([
                'message' => 'Examen eliminado definitivamente'
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al eliminar examen', [
                'examen_id' => $id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'message' => 'Error al eliminar el examen',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Duplicar un examen existente
     * Crea una copia del examen con un nuevo código único, copiando:
     * - Subpruebas
     * - Reglas de puntaje
     * - Preguntas con sus relaciones (idSubprueba, orden)
     * NO copia:
     * - Usuarios asignados
     * - Intentos
     * El nuevo examen se crea en estado '0' (Borrador) para permitir modificaciones
     */
    public function duplicar($id)
    {
        try {
            // Obtener el examen manualmente usando idExamen
            // El route model binding puede no funcionar correctamente con idExamen como primary key
            $examen = Examen::where('idExamen', $id)->first();

            if (!$examen) {
                Log::warning('ExamenController@duplicar - Examen no encontrado', [
                    'examen_id' => $id,
                ]);
                return response()->json([
                    'message' => 'Examen no encontrado'
                ], 404);
            }

            DB::beginTransaction();

            // Crear nuevo examen (replicar)
            $nuevoExamen = $examen->replicate();
            $nuevoExamen->titulo = $examen->titulo . ' (Copia)';
            $nuevoExamen->estado = '0'; // Borrador para permitir modificaciones

            // Generar nuevo código único
            $codigoBase = $examen->codigo_examen;
            $nuevoCodigo = $codigoBase . '-COP-' . time();

            // Verificar que el código no exista (por si acaso)
            $contador = 1;
            while (Examen::where('codigo_examen', $nuevoCodigo)->exists()) {
                $nuevoCodigo = $codigoBase . '-COP-' . time() . '-' . $contador;
                $contador++;
            }

            $nuevoExamen->codigo_examen = $nuevoCodigo;

            // Limpiar fechas de vigencia (el nuevo examen no tiene fechas hasta que se publique)
            $nuevoExamen->fecha_inicio_vigencia = null;
            $nuevoExamen->fecha_fin_vigencia = null;

            // Guardar el nuevo examen
            $nuevoExamen->save();

            // Cargar relaciones necesarias del examen original
            $examen->load(['subpruebas.reglasPuntaje', 'preguntas']);

            // Duplicar subpruebas
            $subpruebasMap = []; // Mapear idSubprueba original -> idSubprueba nuevo
            foreach ($examen->subpruebas as $subprueba) {
                $nuevaSubprueba = $subprueba->replicate();
                $nuevaSubprueba->idExamen = $nuevoExamen->idExamen;
                $nuevaSubprueba->save();

                // Guardar el mapeo
                $subpruebasMap[$subprueba->idSubprueba] = $nuevaSubprueba->idSubprueba;

                // Duplicar reglas de puntaje de esta subprueba
                foreach ($subprueba->reglasPuntaje as $regla) {
                    $nuevaRegla = $regla->replicate();
                    $nuevaRegla->idSubprueba = $nuevaSubprueba->idSubprueba;
                    $nuevaRegla->save();
                }
            }

            // Duplicar preguntas asociadas con sus relaciones (idSubprueba, orden)
            foreach ($examen->preguntas as $pregunta) {
                $idSubpruebaNuevo = null;

                // Si la pregunta tiene idSubprueba, mapearlo al nuevo idSubprueba
                if ($pregunta->pivot->idSubprueba && isset($subpruebasMap[$pregunta->pivot->idSubprueba])) {
                    $idSubpruebaNuevo = $subpruebasMap[$pregunta->pivot->idSubprueba];
                } elseif (!empty($subpruebasMap)) {
                    // Si no tiene idSubprueba pero hay subpruebas, asignar a la primera
                    $idSubpruebaNuevo = reset($subpruebasMap);
                }

                $nuevoExamen->preguntas()->attach($pregunta->idPregunta, [
                    'orden' => $pregunta->pivot->orden ?? 1,
                    'idSubprueba' => $idSubpruebaNuevo,
                ]);
            }

            DB::commit();

            // Cargar relaciones para la respuesta
            $nuevoExamen->load(['tipoConcurso', 'subpruebas', 'preguntas']);

            Log::info('ExamenController@duplicar - Examen duplicado exitosamente', [
                'examen_original_id' => $examen->idExamen,
                'examen_nuevo_id' => $nuevoExamen->idExamen,
                'codigo_original' => $examen->codigo_examen,
                'codigo_nuevo' => $nuevoExamen->codigo_examen,
            ]);

            return response()->json([
                'message' => 'Examen duplicado exitosamente',
                'data' => new ExamenResource($nuevoExamen),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('ExamenController@duplicar - Error al duplicar examen', [
                'examen_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error al duplicar el examen',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cambiar estado de un examen
     */
    public function cambiarEstado(Request $request, $id)
    {
        // Obtener el examen manualmente usando idExamen
        $examen = Examen::where('idExamen', $id)->first();

        if (!$examen) {
            return response()->json([
                'message' => 'Examen no encontrado'
            ], 404);
        }

        $request->validate([
            'estado' => 'required|in:0,1,2',
            'fecha_inicio_vigencia' => 'nullable|date',
            'fecha_fin_vigencia' => 'nullable|date|after:fecha_inicio_vigencia',
        ]);

        $nuevoEstado = $request->estado;

        // Validar que el examen esté completo antes de permitir la publicación
        if ($nuevoEstado === '1' && $examen->estado === '0') {
            $completitudService = new \App\Services\ExamenCompletitudService();
            if (!$completitudService->puedePublicar($examen)) {
                return response()->json([
                    'message' => 'No se puede publicar el examen. Debe completar todos los pasos del wizard: subpruebas, postulaciones, reglas de puntaje y asignar preguntas.',
                ], 422);
            }
        }

        // Si se está cambiando a Publicado (1), actualizar fecha_inicio_vigencia para tener concordancia
        if ($nuevoEstado === '1') {
            // Si se proporciona una fecha en el request, usarla; sino, usar la fecha/hora actual
            if ($request->filled('fecha_inicio_vigencia')) {
                $fecha = str_replace('T', ' ', $request->fecha_inicio_vigencia) . ':00';
                $examen->fecha_inicio_vigencia = $fecha;
            } else {
                // Usar FechaService para mantener consistencia
                $examen->fecha_inicio_vigencia = \App\Services\FechaService::ahoraString();
            }
        } elseif ($request->filled('fecha_inicio_vigencia')) {
            // Si no se está publicando pero se proporciona fecha, actualizarla
            // Parsear la fecha como absoluta (sin conversión de zona horaria)
            // Convertir a formato MySQL datetime y guardar directamente sin conversión
            $fecha = str_replace('T', ' ', $request->fecha_inicio_vigencia) . ':00';
            $examen->fecha_inicio_vigencia = $fecha;
        }

        // Si se proporciona fecha_fin_vigencia, actualizarla
        if ($request->filled('fecha_fin_vigencia')) {
            // Parsear la fecha como absoluta (sin conversión de zona horaria)
            // Convertir a formato MySQL datetime y guardar directamente sin conversión
            $fecha = str_replace('T', ' ', $request->fecha_fin_vigencia) . ':00';
            $examen->fecha_fin_vigencia = $fecha;
        }

        // Registrar fechas de publicación y finalización
        if ($examen->estado === '0' && $nuevoEstado === '1') {
            // Cambiando de Borrador a Publicado
            $examen->fecha_publicacion = Carbon::now();
        } elseif ($examen->estado === '1' && $nuevoEstado === '2') {
            // Cambiando de Publicado a Finalizado MANUALMENTE por el admin
            $examen->fecha_finalizacion = Carbon::now();

            // Actualizar fecha_fin_vigencia a la hora actual cuando se finaliza manualmente
            $examen->fecha_fin_vigencia = \App\Services\FechaService::ahoraString();

            // ELIMINAR todos los intentos en progreso cuando se finaliza manualmente
            // Esto asegura que no se calculen resultados para intentos que no fueron completados
            $intentosEnProgreso = $examen->intentos()->where('estado', 'iniciado')->get();
            $intentosEliminados = 0;

            DB::beginTransaction();
            try {
                foreach ($intentosEnProgreso as $intento) {
                    // Eliminar respuestas asociadas
                    $intento->respuestas()->delete();

                    // Eliminar resultados de subpruebas asociados
                    $intento->resultadosSubprueba()->delete();

                    // Eliminar el intento
                    $intento->delete();
                    $intentosEliminados++;
                }
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Error al eliminar intentos en progreso al finalizar examen manualmente', [
                    'examen_id' => $examen->idExamen,
                    'error' => $e->getMessage(),
                ]);
                // Continuar con la finalización aunque falle la eliminación de intentos
            }

            Log::info('Examen finalizado manualmente - intentos eliminados', [
                'examen_id' => $examen->idExamen,
                'codigo_examen' => $examen->codigo_examen,
                'intentos_eliminados' => $intentosEliminados,
                'fecha_fin_vigencia_actualizada' => $examen->fecha_fin_vigencia,
            ]);

            // Ejecutar el comando para asegurar que todos los intentos estén cerrados/eliminados
            // Esto es una medida de seguridad adicional por si algún intento no se eliminó correctamente
            try {
                \Illuminate\Support\Facades\Artisan::call('examenes:cerrar-intentos-finalizados');
                Log::info('Comando cerrar-intentos-finalizados ejecutado después de finalizar examen manualmente', [
                    'examen_id' => $examen->idExamen,
                    'codigo_examen' => $examen->codigo_examen,
                ]);
            } catch (\Exception $e) {
                // No fallar si el comando tiene un error, solo registrar
                Log::warning('Error al ejecutar comando cerrar-intentos-finalizados', [
                    'examen_id' => $examen->idExamen,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $examen->estado = $nuevoEstado;
        $examen->save();

        return response()->json([
            'message' => 'Estado del examen actualizado exitosamente',
            'data' => new ExamenResource($examen->load('tipoConcurso')),
        ]);
    }

    /**
     * Obtener estadísticas generales de todos los exámenes
     */
    public function estadisticas()
    {
        $estadisticas = [
            'total_examenes' => Examen::count(),
            'examenes_borrador' => Examen::where('estado', '0')->count(),
            'examenes_publicados' => Examen::where('estado', '1')->count(),
            'total_intentos' => DB::table('intentos_examen')->count(),
            'intentos_finalizados' => DB::table('intentos_examen')->where('estado', 'finalizado')->count(),
            'promedio_puntaje_global' => DB::table('intentos_examen')
                ->where('estado', 'finalizado')
                ->avg('puntaje_obtenido') ?? 0,
        ];

        return response()->json(['estadisticas' => $estadisticas]);
    }

    /**
     * Obtener estadísticas de un examen específico
     */
    public function estadisticasExamen(Examen $examen)
    {
        $estadisticas = [
            'total_intentos' => $examen->intentos()->count(),
            'intentos_finalizados' => $examen->intentos()->where('estado', 'finalizado')->count(),
            'intentos_en_progreso' => $examen->intentos()->where('estado', 'en_progreso')->count(),
            'intentos_abandonados' => $examen->intentos()->where('estado', 'abandonado')->count(),
            'promedio_puntaje' => $examen->intentos()->where('estado', 'finalizado')->avg('puntaje_obtenido') ?? 0,
            'puntaje_maximo' => $examen->intentos()->where('estado', 'finalizado')->max('puntaje_obtenido') ?? 0,
            'puntaje_minimo' => $examen->intentos()->where('estado', 'finalizado')->min('puntaje_obtenido') ?? 0,
            'total_correctas' => $examen->intentos()->where('estado', 'finalizado')->sum('total_correctas'),
            'total_incorrectas' => $examen->intentos()->where('estado', 'finalizado')->sum('total_incorrectas'),
        ];

        return response()->json([
            'examen' => new ExamenResource($examen),
            'estadisticas' => $estadisticas,
        ]);
    }


    /**
     * RF-A.4.4: Ensamblador de Examen - Obtener datos para el ensamblador
     */
    public function ensamblar(Examen $examen)
    {
        // Inicializar variables por defecto
        $preguntasDisponibles = [];
        $preguntasPorSubprueba = [];
        $subpruebasConConteo = [];

        try {
            // Cargar relaciones de forma segura
            try {
                $examen->load(['preguntas.opciones', 'preguntas.categoria', 'preguntas.contexto', 'subpruebas']);
            } catch (\Exception $e) {
                Log::warning('Error al cargar relaciones en ensamblar', [
                    'examen_id' => $examen->idExamen ?? null,
                    'error' => $e->getMessage()
                ]);
                // Intentar cargar sin relaciones anidadas
                try {
                    $examen->load(['preguntas', 'subpruebas']);
                } catch (\Exception $e2) {
                    $examen->setRelation('preguntas', collect([]));
                    $examen->setRelation('subpruebas', collect([]));
                }
            }

            // Obtener todas las preguntas disponibles con filtros
            try {
                $preguntasDisponibles = Pregunta::with(['categoria', 'contexto', 'opciones'])
                    ->orderBy('codigo')
                    ->get()
                    ->map(function ($pregunta) {
                        try {
                            return [
                                'idPregunta' => $pregunta->idPregunta ?? null,
                                'codigo' => $pregunta->codigo ?? '',
                                'enunciado' => $pregunta->enunciado ?? '',
                                'ano' => $pregunta->ano ?? null,
                                'categoria' => ($pregunta->categoria ?? null) ? [
                                    'idCategoria' => $pregunta->categoria->idCategoria ?? null,
                                    'nombre' => $pregunta->categoria->nombre ?? '',
                                ] : null,
                                'contexto' => ($pregunta->contexto ?? null) ? [
                                    'idContexto' => $pregunta->contexto->idContexto ?? null,
                                    'titulo' => $pregunta->contexto->titulo ?? '',
                                ] : null,
                                'opciones' => ($pregunta->opciones ?? collect([]))->map(function ($opcion) {
                                    try {
                                        return [
                                            'idOpcion' => $opcion->idOpcion ?? null,
                                            'contenido' => $opcion->contenido ?? '',
                                            'es_correcta' => (bool) ($opcion->es_correcta ?? false),
                                        ];
                                    } catch (\Exception $e) {
                                        Log::warning('Error al mapear opción en ensamblar', [
                                            'opcion_id' => $opcion->idOpcion ?? null,
                                            'error' => $e->getMessage()
                                        ]);
                                        return null;
                                    }
                                })->filter()->values()->all(),
                            ];
                        } catch (\Exception $e) {
                            Log::warning('Error al mapear pregunta disponible en ensamblar', [
                                'pregunta_id' => $pregunta->idPregunta ?? null,
                                'error' => $e->getMessage()
                            ]);
                            return null;
                        }
                    })->filter()->values();
            } catch (\Exception $e) {
                Log::warning('Error al cargar preguntas disponibles en ensamblar', [
                    'examen_id' => $examen->idExamen ?? null,
                    'error' => $e->getMessage()
                ]);
                $preguntasDisponibles = [];
            }

            // Organizar preguntas por subprueba
            try {
                if ($examen->relationLoaded('subpruebas') && $examen->subpruebas) {
                    foreach ($examen->subpruebas as $subprueba) {
                        try {
                            if (!$subprueba || !isset($subprueba->idSubprueba)) {
                                continue;
                            }

                            $preguntasPorSubprueba[$subprueba->idSubprueba] = ($examen->preguntas ?? collect([]))->filter(function ($pregunta) use ($subprueba) {
                                try {
                                    return $pregunta && $pregunta->pivot && isset($pregunta->pivot->idSubprueba) && $pregunta->pivot->idSubprueba == $subprueba->idSubprueba;
                                } catch (\Exception $e) {
                                    return false;
                                }
                            })->map(function ($pregunta) {
                                try {
                                    return [
                                        'idPregunta' => $pregunta->idPregunta ?? null,
                                        'codigo' => $pregunta->codigo ?? '',
                                        'enunciado' => $pregunta->enunciado ?? '',
                                        'categoria' => ($pregunta->categoria ?? null) ? [
                                            'idCategoria' => $pregunta->categoria->idCategoria ?? null,
                                            'nombre' => $pregunta->categoria->nombre ?? '',
                                        ] : null,
                                        'contexto' => ($pregunta->contexto ?? null) ? [
                                            'idContexto' => $pregunta->contexto->idContexto ?? null,
                                            'titulo' => $pregunta->contexto->titulo ?? '',
                                        ] : null,
                                        'opciones' => ($pregunta->opciones ?? collect([]))->map(function ($opcion) {
                                            try {
                                                return [
                                                    'idOpcion' => $opcion->idOpcion ?? null,
                                                    'contenido' => $opcion->contenido ?? '',
                                                    'es_correcta' => (bool) ($opcion->es_correcta ?? false),
                                                ];
                                            } catch (\Exception $e) {
                                                return null;
                                            }
                                        })->filter()->values()->all(),
                                        'orden' => ($pregunta->pivot->orden ?? 0),
                                    ];
                                } catch (\Exception $e) {
                                    Log::warning('Error al mapear pregunta por subprueba en ensamblar', [
                                        'pregunta_id' => $pregunta->idPregunta ?? null,
                                        'error' => $e->getMessage()
                                    ]);
                                    return null;
                                }
                            })->filter()->values();
                        } catch (\Exception $e) {
                            Log::warning('Error al procesar subprueba en ensamblar', [
                                'subprueba_id' => $subprueba->idSubprueba ?? null,
                                'error' => $e->getMessage()
                            ]);
                            $preguntasPorSubprueba[$subprueba->idSubprueba ?? 'unknown'] = [];
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Error al organizar preguntas por subprueba en ensamblar', [
                    'examen_id' => $examen->idExamen ?? null,
                    'error' => $e->getMessage()
                ]);
                $preguntasPorSubprueba = [];
            }

            // Agregar el conteo de preguntas a cada subprueba
            try {
                if ($examen->relationLoaded('subpruebas') && $examen->subpruebas) {
                    $subpruebasConConteo = $examen->subpruebas->map(function ($subprueba) use ($examen) {
                        try {
                            if (!$subprueba || !isset($subprueba->idSubprueba)) {
                                return null;
                            }

                            $preguntasCount = DB::table('examen_pregunta')
                                ->where('idExamen', $examen->idExamen)
                                ->where('idSubprueba', $subprueba->idSubprueba)
                                ->count();

                            return [
                                'idSubprueba' => $subprueba->idSubprueba,
                                'idExamen' => $subprueba->idExamen ?? null,
                                'nombre' => $subprueba->nombre ?? '',
                                'puntaje_por_pregunta' => $subprueba->puntaje_por_pregunta ?? 0,
                                'duracion_minutos' => $subprueba->duracion_minutos ?? null,
                                'orden' => $subprueba->orden ?? 0,
                                'preguntas_count' => $preguntasCount,
                            ];
                        } catch (\Exception $e) {
                            Log::warning('Error al mapear subprueba con conteo en ensamblar', [
                                'subprueba_id' => $subprueba->idSubprueba ?? null,
                                'error' => $e->getMessage()
                            ]);
                            return null;
                        }
                    })->filter()->values();
                }
            } catch (\Exception $e) {
                Log::warning('Error al agregar conteo a subpruebas en ensamblar', [
                    'examen_id' => $examen->idExamen ?? null,
                    'error' => $e->getMessage()
                ]);
                $subpruebasConConteo = [];
            }

            // Construir respuesta de forma segura
            try {
                return response()->json([
                    'examen' => $examen ? [
                        'idExamen' => $examen->idExamen ?? null,
                        'titulo' => $examen->titulo ?? '',
                        'codigo_examen' => $examen->codigo_examen ?? null,
                    ] : null,
                    'subpruebas' => $subpruebasConConteo,
                    'preguntas_por_subprueba' => $preguntasPorSubprueba,
                    'preguntas_disponibles' => $preguntasDisponibles,
                ]);
            } catch (\Exception $e) {
                Log::error('Error al construir respuesta JSON en ensamblar', [
                    'examen_id' => $examen->idExamen ?? null,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                // Retornar respuesta básica aunque haya error
                return response()->json([
                    'examen' => null,
                    'subpruebas' => [],
                    'preguntas_por_subprueba' => [],
                    'preguntas_disponibles' => [],
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error en método ensamblar', [
                'examen_id' => $examen->idExamen ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error al cargar los datos del ensamblador',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor',
                'examen' => null,
                'subpruebas' => [],
                'preguntas_por_subprueba' => [],
                'preguntas_disponibles' => [],
            ], 500);
        }
    }

    /**
     * RF-A.4.4: Agregar preguntas al examen (manual o por orden)
     */
    public function agregarPreguntas(Request $request, Examen $examen)
    {
        Log::info('ExamenController@agregarPreguntas - Inicio', [
            'examen_id' => $examen->idExamen,
            'examen_estado' => $examen->estado,
            'request_all' => $request->all(),
            'preguntas_exists' => $request->has('preguntas'),
            'preguntas_count' => is_array($request->preguntas) ? count($request->preguntas) : 'no es array',
            'preguntas_empty' => empty($request->preguntas),
            'preguntas_value' => $request->preguntas,
        ]);

        // Verificar que el campo preguntas existe en el request
        if (!$request->has('preguntas')) {
            Log::error('ExamenController@agregarPreguntas - Campo preguntas no existe en request', [
                'request_keys' => array_keys($request->all()),
                'request_all' => $request->all(),
            ]);
            return response()->json([
                'message' => 'El campo preguntas es requerido',
                'errors' => ['preguntas' => ['The preguntas field is required.']],
            ], 422);
        }

        // Validar que preguntas sea un array (puede estar vacío)
        // Usar 'present' en lugar de 'required' para que acepte arrays vacíos
        // Si el array no está vacío, validar los elementos
        $rules = [
            'preguntas' => 'present|array',
        ];

        // Solo agregar validaciones de elementos si el array no está vacío
        if (!empty($request->preguntas) && count($request->preguntas) > 0) {
            $rules['preguntas.*.idPregunta'] = 'required|integer|exists:preguntas,idPregunta';
            $rules['preguntas.*.idSubprueba'] = 'nullable|integer|exists:subpruebas,idSubprueba';
            $rules['preguntas.*.orden'] = 'required|integer|min:1';
        }

        try {
            $request->validate($rules);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('ExamenController@agregarPreguntas - Error de validación', [
                'errors' => $e->errors(),
                'preguntas' => $request->preguntas,
                'request_all' => $request->all(),
            ]);
            throw $e;
        }

        // Verificar que el examen no esté finalizado
        try {
            $this->verificarExamenNoFinalizado($examen);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // Solo verificar intentos si el examen está publicado (estado '1')
        // En borrador (estado '0'), permitir todas las modificaciones
        if ($examen->estado === '1') {
            try {
                $this->verificarSinIntentos($examen);
            } catch (\Exception $e) {
                return response()->json([
                    'message' => $e->getMessage(),
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            // Si el array está vacío, solo eliminar todas las preguntas
            // PERO solo si el examen está en borrador (estado '0')
            // Si está publicado (estado '1'), no se permite eliminar todas las preguntas
            if (empty($request->preguntas) || count($request->preguntas) === 0) {
                // En borrador, permitir eliminar todas las preguntas
                if ($examen->estado === '0' || $examen->estado === null) {
                    $examen->preguntas()->detach();
                    DB::commit();
                    $examen->load(['preguntas', 'subpruebas']);
                    return response()->json([
                        'message' => 'Todas las preguntas han sido eliminadas del examen',
                        'examen' => $examen,
                    ]);
                } else {
                    // En publicado, no permitir eliminar todas las preguntas
                    DB::rollBack();
                    return response()->json([
                        'message' => 'No se pueden eliminar todas las preguntas de un examen publicado. El examen debe estar en estado borrador para realizar esta acción.',
                        'errors' => ['preguntas' => ['No se pueden eliminar todas las preguntas de un examen publicado.']],
                    ], 422);
                }
            }

            // Obtener la primera subprueba si no se especifica
            $subpruebaDefault = $examen->subpruebas()->first();

            if (!$subpruebaDefault) {
                // Verificar si alguna pregunta requiere subprueba
                $requiereSubprueba = collect($request->preguntas)->some(function ($p) {
                    return !isset($p['idSubprueba']) || $p['idSubprueba'] === null;
                });

                if ($requiereSubprueba) {
                    return response()->json([
                        'message' => 'El examen debe tener al menos una subprueba configurada',
                    ], 422);
                }
            }

            // Eliminar preguntas existentes
            $examen->preguntas()->detach();

            // Agregar nuevas preguntas con orden y subprueba
            foreach ($request->preguntas as $preguntaData) {
                $idSubprueba = $preguntaData['idSubprueba'] ?? $subpruebaDefault?->idSubprueba;

                if (!$idSubprueba) {
                    throw new \Exception('No se puede determinar la subprueba para la pregunta');
                }

                $examen->preguntas()->attach($preguntaData['idPregunta'], [
                    'orden' => $preguntaData['orden'],
                    'idSubprueba' => $idSubprueba,
                ]);
            }

            DB::commit();
            $examen->load(['preguntas', 'subpruebas']);
            return response()->json([
                'message' => 'Preguntas agregadas exitosamente',
                'examen' => $examen,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al agregar preguntas',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * RF-A.4.4: Eliminar una pregunta del examen
     */
    public function eliminarPregunta(Examen $examen, $preguntaId)
    {
        // Solo verificar intentos si el examen está publicado (estado '1')
        // En borrador (estado '0'), permitir todas las modificaciones
        if ($examen->estado === '1') {
            try {
                $this->verificarSinIntentos($examen);
            } catch (\Exception $e) {
                return response()->json([
                    'message' => $e->getMessage(),
                ], 422);
            }
        }

        try {
            // Verificar que la pregunta existe en el examen
            $existe = DB::table('examen_pregunta')
                ->where('idExamen', $examen->idExamen)
                ->where('idPregunta', $preguntaId)
                ->exists();

            if (!$existe) {
                return response()->json([
                    'message' => 'La pregunta no está en este examen',
                ], 404);
            }

            // Eliminar la pregunta del examen
            DB::table('examen_pregunta')
                ->where('idExamen', $examen->idExamen)
                ->where('idPregunta', $preguntaId)
                ->delete();

            // Reordenar las preguntas restantes
            $preguntasRestantes = DB::table('examen_pregunta')
                ->where('idExamen', $examen->idExamen)
                ->orderBy('orden')
                ->get();

            foreach ($preguntasRestantes as $index => $pregunta) {
                DB::table('examen_pregunta')
                    ->where('idExamen', $examen->idExamen)
                    ->where('idPregunta', $pregunta->idPregunta)
                    ->update(['orden' => $index + 1]);
            }

            return response()->json([
                'message' => 'Pregunta eliminada exitosamente',
            ]);
        } catch (\Exception $e) {
            Log::error('Error al eliminar pregunta del examen', [
                'examen_id' => $examen->idExamen,
                'pregunta_id' => $preguntaId,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Error al eliminar la pregunta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * RF-A.4.4: Generar preguntas aleatorias
     */
    public function generarAleatorio(Request $request, Examen $examen)
    {
        $request->validate([
            'idCategoria' => 'nullable|exists:categorias,idCategoria',
            'idSubprueba' => 'nullable|exists:subpruebas,idSubprueba',
            'cantidad' => 'required|integer|min:1',
            'ano' => 'nullable|integer|min:2000|max:2100',
            'codigo' => 'nullable|string|max:255',
            'preguntas_actuales' => 'nullable|array',
            'preguntas_actuales.*' => 'integer|exists:preguntas,idPregunta',
        ]);

        // Verificar que el examen no esté finalizado
        try {
            $this->verificarExamenNoFinalizado($examen);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // Solo verificar intentos si el examen está publicado (estado '1')
        // En borrador (estado '0'), permitir todas las modificaciones
        if ($examen->estado === '1') {
            try {
                $this->verificarSinIntentos($examen);
            } catch (\Exception $e) {
                return response()->json([
                    'message' => $e->getMessage(),
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            // Obtener la subprueba (si se especifica, o la primera del examen)
            $subprueba = null;
            if ($request->filled('idSubprueba')) {
                $subprueba = $examen->subpruebas()->where('idSubprueba', $request->idSubprueba)->first();
            } else {
                $subprueba = $examen->subpruebas()->first();
            }

            if (!$subprueba) {
                return response()->json([
                    'message' => 'El examen debe tener al menos una subprueba configurada',
                ], 422);
            }

            // Construir query de preguntas con relaciones necesarias
            $query = Pregunta::with(['categoria', 'contexto', 'opciones']);

            if ($request->filled('idCategoria')) {
                $query->where('idCategoria', $request->idCategoria);
            }

            if ($request->filled('ano')) {
                $query->where('ano', $request->ano);
            }

            if ($request->filled('codigo')) {
                $query->where('codigo', 'LIKE', '%' . $request->codigo . '%');
            }

            // Obtener IDs de preguntas que ya están en el examen (usando consulta directa para mayor confiabilidad)
            $preguntasExistentesBD = DB::table('examen_pregunta')
                ->where('idExamen', $examen->idExamen)
                ->pluck('idPregunta')
                ->toArray();

            // Si el frontend envía las preguntas actuales del estado local, usarlas en lugar de las de la BD
            // Esto permite que cuando el usuario elimina preguntas localmente, el backend las considere eliminadas
            $preguntasExistentes = $request->filled('preguntas_actuales') && is_array($request->preguntas_actuales)
                ? $request->preguntas_actuales
                : $preguntasExistentesBD;

            // Excluir preguntas que ya están en el examen (ya sea en BD o en el estado local del frontend)
            if (!empty($preguntasExistentes)) {
                $query->whereNotIn('idPregunta', $preguntasExistentes);
            }

            $preguntas = $query->inRandomOrder()
                ->limit($request->cantidad)
                ->get();

            // En borrador, permitir generar las preguntas disponibles aunque sean menos de las solicitadas
            // En publicado, aplicar validaciones estrictas
            $esBorrador = ($examen->estado === '0' || $examen->estado === null);

            if ($preguntas->isEmpty()) {
                return response()->json([
                    'message' => 'No hay preguntas disponibles' . ($request->filled('idCategoria') ? ' en esta categoría' : '') . '. Todas las preguntas ya están en el examen.',
                    'disponibles' => 0,
                    'solicitadas' => $request->cantidad,
                ], 422);
            }

            // Solo validar cantidad suficiente si el examen está publicado
            if (!$esBorrador && $preguntas->count() < $request->cantidad) {
                return response()->json([
                    'message' => 'No hay suficientes preguntas disponibles' . ($request->filled('idCategoria') ? ' en esta categoría' : ''),
                    'disponibles' => $preguntas->count(),
                    'solicitadas' => $request->cantidad,
                ], 422);
            }

            // Si es borrador y hay menos preguntas disponibles, usar solo las disponibles
            $preguntasParaUsar = $esBorrador
                ? $preguntas->take($preguntas->count())
                : $preguntas->take($request->cantidad);

            // Agrupar preguntas por contexto para ordenarlas juntas
            $preguntasPorContexto = [];
            $preguntasSinContexto = [];

            foreach ($preguntasParaUsar as $pregunta) {
                $idContexto = $pregunta->contexto ? $pregunta->contexto->idContexto : null;

                if ($idContexto) {
                    if (!isset($preguntasPorContexto[$idContexto])) {
                        $preguntasPorContexto[$idContexto] = [];
                    }
                    $preguntasPorContexto[$idContexto][] = $pregunta;
                } else {
                    $preguntasSinContexto[] = $pregunta;
                }
            }

            // Reordenar: primero las preguntas agrupadas por contexto, luego las sin contexto
            $preguntasOrdenadas = [];
            foreach ($preguntasPorContexto as $idContexto => $preguntasContexto) {
                // Agregar todas las preguntas del mismo contexto juntas
                foreach ($preguntasContexto as $pregunta) {
                    $preguntasOrdenadas[] = $pregunta;
                }
            }
            // Agregar las preguntas sin contexto al final
            foreach ($preguntasSinContexto as $pregunta) {
                $preguntasOrdenadas[] = $pregunta;
            }

            // Reemplazar la colección original con la ordenada
            $preguntasParaUsar = collect($preguntasOrdenadas);

            // Obtener el siguiente orden para esta subprueba (usando consulta directa)
            $ultimoOrden = DB::table('examen_pregunta')
                ->where('idExamen', $examen->idExamen)
                ->where('idSubprueba', $subprueba->idSubprueba)
                ->max('orden') ?? 0;

            // Preparar datos para insertar en batch
            $preguntasParaInsertar = [];
            $now = now();

            foreach ($preguntasParaUsar as $index => $pregunta) {
                // Verificación final: asegurar que la pregunta no esté ya en el examen
                // (esto previene race conditions)
                $existe = in_array($pregunta->idPregunta, $preguntasExistentes);

                if (!$existe) {
                    $preguntasParaInsertar[] = [
                        'idExamen' => $examen->idExamen,
                        'idPregunta' => $pregunta->idPregunta,
                        'orden' => $ultimoOrden + count($preguntasParaInsertar) + 1,
                        'idSubprueba' => $subprueba->idSubprueba,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    // Agregar a la lista de existentes para evitar duplicados en el mismo batch
                    $preguntasExistentes[] = $pregunta->idPregunta;
                }
            }

            // NO insertar en la BD, solo devolver las preguntas disponibles
            // El frontend las agregará al estado local y se guardarán cuando se presione "Guardar"
            $preguntasDisponibles = $preguntasParaUsar->map(function ($pregunta, $index) use ($subprueba, $ultimoOrden) {
                return [
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
                    ] : null,
                    'ano' => $pregunta->ano,
                    'opciones' => $pregunta->opciones->map(function ($opcion) {
                        return [
                            'idOpcion' => $opcion->idOpcion,
                            'contenido' => $opcion->contenido,
                            'es_correcta' => (bool) $opcion->es_correcta,
                        ];
                    })->values()->all(),
                    'idSubprueba' => $subprueba->idSubprueba,
                    'orden' => $ultimoOrden + $index + 1, // Orden basado en la posición en el array ordenado
                ];
            })->values()->all();

            DB::commit();

            $mensaje = $esBorrador && $preguntasParaUsar->count() < $request->cantidad
                ? "Se generaron {$preguntasParaUsar->count()} de {$request->cantidad} preguntas solicitadas (solo hay {$preguntasParaUsar->count()} disponibles)."
                : 'Preguntas disponibles generadas';

            return response()->json([
                'message' => $mensaje,
                'preguntas_disponibles' => $preguntasDisponibles,
                'cantidad' => count($preguntasDisponibles),
                'cantidad_solicitada' => $request->cantidad,
                'subprueba' => [
                    'idSubprueba' => $subprueba->idSubprueba,
                    'nombre' => $subprueba->nombre,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al generar preguntas aleatorias',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * RF-A.4.5: Obtener datos para asignar usuarios
     */
    public function asignar(Examen $examen)
    {
        if ($examen->tipo_acceso !== 'privado') {
            return response()->json([
                'message' => 'Este examen no es privado, no requiere asignación'
            ], 422);
        }

        $docentes = \App\Models\Usuario::where('rol', '1')
            ->orderBy('nombre')
            ->get(['idUsuario', 'nombre', 'apellidos', 'correo']);

        $usuariosAsignados = $examen->usuariosAsignados()
            ->with('usuario:idUsuario,nombre,apellidos,correo')
            ->get()
            ->filter(function ($examenUsuario) {
                return $examenUsuario->usuario !== null;
            })
            ->pluck('usuario.idUsuario')
            ->toArray();

        return response()->json([
            'examen' => $examen,
            'docentes' => $docentes,
            'usuarios_asignados' => $usuariosAsignados,
        ]);
    }

    /**
     * RF-A.4.5: Asignar usuarios a examen privado
     */
    public function asignarUsuarios(Request $request, Examen $examen)
    {
        // Verificar que el examen no esté finalizado
        try {
            $this->verificarExamenNoFinalizado($examen);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        if ($examen->tipo_acceso !== 'privado') {
            return response()->json([
                'message' => 'Este examen no es privado'
            ], 422);
        }

        // Verificar si el examen ya tiene usuarios asignados
        $tieneUsuariosAsignados = $examen->usuariosAsignados()->exists();

        // Si el examen está publicado (estado '1') y ya tiene usuarios asignados, no permitir modificar
        if ($examen->estado === '1' && $tieneUsuariosAsignados) {
            return response()->json([
                'message' => 'No se pueden modificar los usuarios asignados de un examen publicado que ya tiene usuarios asignados. Debe finalizar el examen primero para poder editarlo.'
            ], 422);
        }

        // Permitir asignar usuarios si:
        // 1. El examen está en borrador (estado '0') o finalizado (estado '2'), O
        // 2. El examen está publicado (estado '1') pero NO tiene usuarios asignados (permite asignar una vez)
        $puedeAsignar = ($examen->estado === '0' || $examen->estado === '2') ||
            ($examen->estado === '1' && !$tieneUsuariosAsignados);

        if (!$puedeAsignar) {
            return response()->json([
                'message' => 'No se pueden asignar usuarios en este momento'
            ], 422);
        }

        $request->validate([
            'usuarios' => 'required|array',
            'usuarios.*' => 'required|integer|exists:usuarios,idUsuario',
        ]);

        DB::beginTransaction();
        try {
            $usuarioActual = Auth::user();

            // Eliminar asignaciones existentes
            $examen->usuariosAsignados()->delete();

            // Crear nuevas asignaciones solo si hay usuarios
            if (!empty($request->usuarios)) {
                foreach ($request->usuarios as $idUsuario) {
                    \App\Models\ExamenesUsuario::create([
                        'idExamen' => $examen->idExamen,
                        'idUsuario' => $idUsuario,
                        'asignado_por' => $usuarioActual->idUsuario,
                        'fecha_asignacion' => now(),
                    ]);
                }
            }

            DB::commit();
            return response()->json([
                'message' => 'Usuarios asignados exitosamente',
                'usuarios_asignados' => count($request->usuarios),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al asignar usuarios',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener el estado del wizard para un examen
     * Retorna información sobre completitud y estado de cada paso
     */
    public function estadoWizard($id)
    {
        $examen = Examen::where('idExamen', $id)->firstOrFail();

        $examen->load(['subpruebas', 'postulaciones.reglasPuntaje']);

        $completitudService = new ExamenCompletitudService();

        $completitud = $completitudService->calcularCompletitud($examen);
        $estadoPasos = $completitudService->obtenerEstadoPasos($examen);
        $siguientePaso = $completitudService->obtenerSiguientePaso($examen);
        $puedePublicar = $completitudService->puedePublicar($examen);

        return response()->json([
            'examen_id' => $examen->idExamen,
            'completitud' => $completitud,
            'paso_actual' => $examen->paso_actual ?? 0,
            'estado_pasos' => $estadoPasos,
            'siguiente_paso' => $siguientePaso,
            'puede_publicar' => $puedePublicar,
            'estado' => $examen->estado,
        ]);
    }

    /**
     * Validar si se puede acceder a un paso específico del wizard
     */
    public function validarAccesoPaso(Request $request, $id)
    {
        try {
            $request->validate([
                'paso' => 'required|integer|min:1|max:6',
            ]);

            $examen = Examen::where('idExamen', $id)->firstOrFail();

            try {
                // Cargar relaciones de forma segura
                try {
                    $examen->load(['subpruebas']);
                } catch (\Exception $e) {
                    Log::warning('Error al cargar subpruebas en validarAccesoPaso', [
                        'examen_id' => $examen->idExamen ?? null,
                        'error' => $e->getMessage()
                    ]);
                    $examen->setRelation('subpruebas', collect([]));
                }

                // Cargar postulaciones y reglas con validación
                try {
                    $examen->load(['postulaciones']);
                } catch (\Exception $e) {
                    Log::warning('Error al cargar postulaciones en validarAccesoPaso', [
                        'examen_id' => $examen->idExamen ?? null,
                        'error' => $e->getMessage()
                    ]);
                    $examen->setRelation('postulaciones', collect([]));
                }

                // Cargar reglas de forma segura
                if ($examen->relationLoaded('postulaciones') && $examen->postulaciones && $examen->postulaciones->count() > 0) {
                    try {
                        // Obtener IDs de subpruebas válidas primero
                        $subpruebasIds = [];
                        if ($examen->relationLoaded('subpruebas') && $examen->subpruebas) {
                            $subpruebasIds = $examen->subpruebas->pluck('idSubprueba')->filter()->toArray();
                        }

                        // Cargar reglas solo para subpruebas válidas
                        if (!empty($subpruebasIds)) {
                            $examen->postulaciones->load(['reglasPuntaje' => function ($query) use ($subpruebasIds) {
                                $query->whereIn('idSubprueba', $subpruebasIds)
                                    ->whereNotNull('idSubprueba');
                            }]);
                        } else {
                            // Si no hay subpruebas válidas, no cargar reglas
                            foreach ($examen->postulaciones as $postulacion) {
                                $postulacion->setRelation('reglasPuntaje', collect([]));
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning('Error al cargar reglasPuntaje en validarAccesoPaso', [
                            'examen_id' => $examen->idExamen ?? null,
                            'error' => $e->getMessage()
                        ]);
                        // Establecer reglas vacías para todas las postulaciones
                        foreach ($examen->postulaciones as $postulacion) {
                            $postulacion->setRelation('reglasPuntaje', collect([]));
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Error general al cargar relaciones en validarAccesoPaso', [
                    'examen_id' => $examen->idExamen ?? null,
                    'error' => $e->getMessage()
                ]);
                // Continuar con relaciones vacías si hay error
                if (!$examen->relationLoaded('subpruebas')) {
                    $examen->setRelation('subpruebas', collect([]));
                }
                if (!$examen->relationLoaded('postulaciones')) {
                    $examen->setRelation('postulaciones', collect([]));
                }
            }

            $completitudService = new ExamenCompletitudService();
            $puedeAcceder = $completitudService->puedeAccederPaso($examen, $request->paso);

            if (!$puedeAcceder) {
                $estadoPasos = $completitudService->obtenerEstadoPasos($examen);
                $pasosIncompletos = [];

                for ($i = 1; $i < $request->paso; $i++) {
                    if (!$estadoPasos["paso{$i}"]) {
                        $pasosIncompletos[] = $i;
                    }
                }

                return response()->json([
                    'puede_acceder' => false,
                    'mensaje' => 'No puede acceder a este paso. Debe completar los pasos anteriores primero.',
                    'pasos_incompletos' => $pasosIncompletos,
                ], 403);
            }

            return response()->json([
                'puede_acceder' => true,
            ]);
        } catch (\Exception $e) {
            Log::error('Error en validarAccesoPaso', [
                'examen_id' => $id ?? null,
                'paso' => $request->paso ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error al validar el acceso al paso',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener datos específicos de un paso del wizard
     * Paso 1: Datos básicos
     * Paso 2: Subpruebas
     * Paso 3: Postulaciones
     * Paso 4: Reglas de puntaje
     * Paso 5: Preguntas (ensamblador)
     * Paso 6: Configuración de fechas
     */
    public function getDatosPaso($id, $paso)
    {
        try {
            // Cargar el examen de forma segura, manejando posibles errores del evento retrieved
            try {
                $examen = Examen::where('idExamen', $id)->firstOrFail();
            } catch (\Exception $e) {
                Log::error('Error al cargar examen en getDatosPaso', [
                    'examen_id' => $id,
                    'paso' => $paso,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }

            switch ($paso) {
                case 1:
                    // Paso 1: Solo datos básicos (sin usar ExamenResource para evitar cargar todas las relaciones)
                    try {
                        $examen->load(['tipoConcurso']);
                    } catch (\Exception $e) {
                        // Si hay error al cargar tipoConcurso, continuar sin él
                        Log::warning('Error al cargar tipoConcurso en paso 1', [
                            'examen_id' => $examen->idExamen,
                            'error' => $e->getMessage()
                        ]);
                    }

                    try {
                        // Formatear fechas de forma segura
                        $fechaInicioVigencia = null;
                        $fechaFinVigencia = null;
                        try {
                            $fechaInicioVigencia = $this->formatearFechaParaPaso($examen, 'fecha_inicio_vigencia');
                        } catch (\Exception $e) {
                            Log::warning('Error al formatear fecha_inicio_vigencia en paso 1', [
                                'examen_id' => $examen->idExamen,
                                'error' => $e->getMessage()
                            ]);
                        }
                        try {
                            $fechaFinVigencia = $this->formatearFechaParaPaso($examen, 'fecha_fin_vigencia');
                        } catch (\Exception $e) {
                            Log::warning('Error al formatear fecha_fin_vigencia en paso 1', [
                                'examen_id' => $examen->idExamen,
                                'error' => $e->getMessage()
                            ]);
                        }

                        // Obtener valores de forma segura para evitar errores con accessors
                        $createdAt = null;
                        $updatedAt = null;
                        $fechaPublicacion = null;
                        $fechaFinalizacion = null;

                        try {
                            $createdAtValue = $examen->getRawOriginal('created_at');
                            if ($createdAtValue) {
                                try {
                                    $createdAt = \Carbon\Carbon::parse($createdAtValue)->format('d-m-Y');
                                } catch (\Exception $e) {
                                    $createdAt = is_string($createdAtValue) ? $createdAtValue : null;
                                }
                            }
                        } catch (\Exception $e) {
                            // Ignorar error
                        }

                        try {
                            $updatedAtValue = $examen->getRawOriginal('updated_at');
                            if ($updatedAtValue) {
                                try {
                                    $updatedAt = \Carbon\Carbon::parse($updatedAtValue)->format('d-m-Y');
                                } catch (\Exception $e) {
                                    $updatedAt = is_string($updatedAtValue) ? $updatedAtValue : null;
                                }
                            }
                        } catch (\Exception $e) {
                            // Ignorar error
                        }

                        try {
                            $fechaPublicacionValue = $examen->getRawOriginal('fecha_publicacion');
                            if ($fechaPublicacionValue) {
                                try {
                                    $fechaPublicacion = \Carbon\Carbon::parse($fechaPublicacionValue)->format('d-m-Y');
                                } catch (\Exception $e) {
                                    $fechaPublicacion = is_string($fechaPublicacionValue) ? $fechaPublicacionValue : null;
                                }
                            }
                        } catch (\Exception $e) {
                            // Ignorar error
                        }

                        try {
                            $fechaFinalizacionValue = $examen->getRawOriginal('fecha_finalizacion');
                            if ($fechaFinalizacionValue) {
                                try {
                                    $fechaFinalizacion = \Carbon\Carbon::parse($fechaFinalizacionValue)->format('d-m-Y');
                                } catch (\Exception $e) {
                                    $fechaFinalizacion = is_string($fechaFinalizacionValue) ? $fechaFinalizacionValue : null;
                                }
                            }
                        } catch (\Exception $e) {
                            // Ignorar error
                        }

                        return response()->json([
                            'data' => [
                                'idExamen' => $examen->idExamen,
                                'id' => $examen->idExamen, // Compatibilidad con frontend
                                'codigo_examen' => $examen->codigo_examen ?? null,
                                'codigo' => $examen->codigo_examen ?? null, // Compatibilidad con frontend
                                'titulo' => $examen->titulo ?? null,
                                'descripcion' => $examen->descripcion ?? null,
                                'idTipoConcurso' => $examen->idTipoConcurso ?? null,
                                'tiempo_limite' => $examen->tiempo_limite ?? 0,
                                'duracion_minutos' => $examen->tiempo_limite ?? 0, // Compatibilidad con frontend
                                'tipo_acceso' => $examen->tipo_acceso ?? 'publico',
                                'publico' => ($examen->tipo_acceso ?? 'publico') === 'publico', // Compatibilidad con frontend
                                'estado' => $examen->estado ?? '0',
                                'created_at' => $createdAt,
                                'updated_at' => $updatedAt,
                                'fecha_creacion' => $createdAt,
                                'fecha_inicio_vigencia' => $fechaInicioVigencia,
                                'fecha_fin_vigencia' => $fechaFinVigencia,
                                'paso_actual' => $examen->paso_actual ?? 0,
                                'fecha_publicacion' => $fechaPublicacion,
                                'fecha_finalizacion' => $fechaFinalizacion,
                                'tipoConcurso' => $examen->relationLoaded('tipoConcurso') && $examen->tipoConcurso ? [
                                    'idTipoConcurso' => $examen->tipoConcurso->idTipoConcurso,
                                    'nombre' => $examen->tipoConcurso->nombre,
                                ] : null,
                            ],
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Error al construir respuesta en paso 1', [
                            'examen_id' => $examen->idExamen,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString()
                        ]);
                        throw $e; // Re-lanzar para que sea capturado por el catch general
                    }

                case 2:
                    // Paso 2: Subpruebas
                    try {
                        $examen->load(['subpruebas']);
                    } catch (\Exception $e) {
                        Log::warning('Error al cargar subpruebas en paso 2', [
                            'examen_id' => $examen->idExamen,
                            'error' => $e->getMessage()
                        ]);
                        $examen->setRelation('subpruebas', collect([]));
                    }
                    return response()->json([
                        'data' => [
                            'idExamen' => $examen->idExamen,
                            'subpruebas' => $examen->subpruebas->map(function ($subprueba) use ($examen) {
                                // Contar preguntas asignadas a esta subprueba
                                $preguntasCount = \Illuminate\Support\Facades\DB::table('examen_pregunta')
                                    ->where('idExamen', $examen->idExamen)
                                    ->where('idSubprueba', $subprueba->idSubprueba)
                                    ->count();

                                return [
                                    'idSubprueba' => $subprueba->idSubprueba,
                                    'nombre' => $subprueba->nombre,
                                    'puntaje_por_pregunta' => $subprueba->puntaje_por_pregunta,
                                    'duracion_minutos' => $subprueba->duracion_minutos,
                                    'orden' => $subprueba->orden,
                                    'preguntas_count' => $preguntasCount,
                                ];
                            }),
                        ],
                    ]);

                case 3:
                    // Paso 3: Postulaciones
                    $postulaciones = [];
                    try {
                        $examen->load(['postulaciones']);
                    } catch (\Exception $e) {
                        Log::warning('Error al cargar postulaciones en paso 3', [
                            'examen_id' => $examen->idExamen,
                            'error' => $e->getMessage()
                        ]);
                        $examen->setRelation('postulaciones', collect([]));
                    }

                    try {
                        if ($examen->relationLoaded('postulaciones') && $examen->postulaciones) {
                            $postulaciones = $examen->postulaciones->map(function ($postulacion) {
                                try {
                                    // Contar reglas de puntaje únicas con subpruebas válidas de forma segura
                                    // Contar solo subpruebas únicas para evitar duplicados (una regla por subprueba)
                                    // Usar count(distinct) para contar subpruebas únicas de forma segura
                                    $reglasCount = 0;
                                    try {
                                        $reglasCount = DB::table('regla_puntajes')
                                            ->join('subpruebas', function ($join) {
                                                $join->on('regla_puntajes.idSubprueba', '=', 'subpruebas.idSubprueba')
                                                    ->whereNotNull('subpruebas.idSubprueba');
                                            })
                                            ->where('regla_puntajes.idPostulacion', $postulacion->idPostulacion)
                                            ->whereNotNull('regla_puntajes.idSubprueba')
                                            ->selectRaw('COUNT(DISTINCT regla_puntajes.idSubprueba) as count')
                                            ->value('count') ?? 0;
                                    } catch (\Exception $e) {
                                        Log::warning('Error al contar reglas en paso 3', [
                                            'postulacion_id' => $postulacion->idPostulacion ?? null,
                                            'error' => $e->getMessage()
                                        ]);
                                        $reglasCount = 0;
                                    }

                                    return [
                                        'idPostulacion' => $postulacion->idPostulacion ?? null,
                                        'nombre' => $postulacion->nombre ?? '',
                                        'descripcion' => $postulacion->descripcion ?? null,
                                        'tipo_aprobacion' => $postulacion->tipo_aprobacion ?? '0',
                                        'reglas_count' => $reglasCount,
                                    ];
                                } catch (\Exception $e) {
                                    Log::warning('Error al mapear postulación en paso 3', [
                                        'postulacion_id' => $postulacion->idPostulacion ?? null,
                                        'error' => $e->getMessage()
                                    ]);
                                    return null;
                                }
                            })->filter()->values();
                        }
                    } catch (\Exception $e) {
                        Log::warning('Error al procesar postulaciones en paso 3', [
                            'examen_id' => $examen->idExamen ?? null,
                            'error' => $e->getMessage()
                        ]);
                        $postulaciones = [];
                    }

                    return response()->json([
                        'data' => [
                            'idExamen' => $examen->idExamen ?? null,
                            'postulaciones' => $postulaciones,
                        ],
                    ]);

                case 4:
                    // Paso 4: Reglas de puntaje (incluye postulaciones y subpruebas)
                    try {
                        // Cargar relaciones de forma segura
                        $examen->load(['postulaciones', 'subpruebas']);
                    } catch (\Exception $e) {
                        Log::warning('Error al cargar relaciones en paso 4', [
                            'examen_id' => $examen->idExamen,
                            'error' => $e->getMessage()
                        ]);
                        // Cargar sin relaciones anidadas si falla
                        try {
                            $examen->load(['postulaciones', 'subpruebas']);
                        } catch (\Exception $e2) {
                            $examen->setRelation('postulaciones', collect([]));
                            $examen->setRelation('subpruebas', collect([]));
                        }
                    }

                    // Obtener IDs de subpruebas válidas del examen
                    $subpruebasValidasIds = $examen->subpruebas->pluck('idSubprueba')->toArray();

                    return response()->json([
                        'data' => [
                            'idExamen' => $examen->idExamen,
                            'postulaciones' => $examen->postulaciones->map(function ($postulacion) use ($subpruebasValidasIds) {
                                // Cargar reglas usando join para asegurar que solo se incluyan reglas con subpruebas válidas
                                $reglas = \App\Models\ReglaPuntaje::where('regla_puntajes.idPostulacion', $postulacion->idPostulacion)
                                    ->join('subpruebas', 'regla_puntajes.idSubprueba', '=', 'subpruebas.idSubprueba')
                                    ->whereIn('regla_puntajes.idSubprueba', $subpruebasValidasIds)
                                    ->select('regla_puntajes.*')
                                    ->with(['subprueba'])
                                    ->orderBy('regla_puntajes.idSubprueba')
                                    ->get();

                                return [
                                    'idPostulacion' => $postulacion->idPostulacion,
                                    'nombre' => $postulacion->nombre,
                                    'descripcion' => $postulacion->descripcion,
                                    'tipo_aprobacion' => $postulacion->tipo_aprobacion ?? '0',
                                    'reglasPuntaje' => $reglas->map(function ($regla) {
                                        return [
                                            'idRegla' => $regla->idRegla,
                                            'idSubprueba' => $regla->idSubprueba,
                                            'puntaje_correcto' => $regla->puntaje_correcto,
                                            'puntaje_incorrecto' => $regla->puntaje_incorrecto,
                                            'puntaje_en_blanco' => $regla->puntaje_en_blanco,
                                            'puntaje_minimo_subprueba' => $regla->puntaje_minimo_subprueba,
                                            'subprueba' => $regla->subprueba ? [
                                                'idSubprueba' => $regla->subprueba->idSubprueba,
                                                'nombre' => $regla->subprueba->nombre,
                                            ] : null,
                                        ];
                                    })->values(),
                                ];
                            }),
                            'subpruebas' => $examen->subpruebas->map(function ($subprueba) use ($examen) {
                                // Contar preguntas asignadas a esta subprueba
                                $preguntasCount = DB::table('examen_pregunta')
                                    ->where('idExamen', $examen->idExamen)
                                    ->where('idSubprueba', $subprueba->idSubprueba)
                                    ->count();

                                return [
                                    'idSubprueba' => $subprueba->idSubprueba,
                                    'nombre' => $subprueba->nombre,
                                    'preguntas_count' => $preguntasCount,
                                ];
                            }),
                        ],
                    ]);

                case 5:
                    // Paso 5: Preguntas (usar el método ensamblar existente)
                    return $this->ensamblar($examen);

                case 6:
                    // Paso 6: Configuración de fechas (solo fechas y usuarios asignados)
                    // Inicializar variables por defecto
                    $fechaInicioVigencia = null;
                    $fechaFinVigencia = null;
                    $usuariosAsignados = [];
                    $tipoAcceso = 'publico';

                    // Formatear fechas de forma segura
                    try {
                        $fechaInicioVigencia = $this->formatearFechaParaPaso($examen, 'fecha_inicio_vigencia');
                    } catch (\Exception $e) {
                        Log::warning('Error al formatear fecha_inicio_vigencia en paso 6', [
                            'examen_id' => $examen->idExamen ?? null,
                            'error' => $e->getMessage()
                        ]);
                        $fechaInicioVigencia = null;
                    }

                    try {
                        $fechaFinVigencia = $this->formatearFechaParaPaso($examen, 'fecha_fin_vigencia');
                    } catch (\Exception $e) {
                        Log::warning('Error al formatear fecha_fin_vigencia en paso 6', [
                            'examen_id' => $examen->idExamen ?? null,
                            'error' => $e->getMessage()
                        ]);
                        $fechaFinVigencia = null;
                    }

                    // Obtener tipo_acceso de forma segura
                    try {
                        $tipoAcceso = $examen->tipo_acceso ?? 'publico';
                    } catch (\Exception $e) {
                        Log::warning('Error al obtener tipo_acceso en paso 6', [
                            'examen_id' => $examen->idExamen ?? null,
                            'error' => $e->getMessage()
                        ]);
                        $tipoAcceso = 'publico';
                    }

                    // Cargar usuarios asignados de forma segura
                    try {
                        // Cargar la relación sin filtros primero para evitar problemas con whereHas
                        if (method_exists($examen, 'usuariosAsignados')) {
                            try {
                                $examen->load('usuariosAsignados');
                            } catch (\Exception $e) {
                                Log::warning('Error al cargar relación usuariosAsignados en paso 6', [
                                    'examen_id' => $examen->idExamen ?? null,
                                    'error' => $e->getMessage()
                                ]);
                                $examen->setRelation('usuariosAsignados', collect([]));
                            }

                            // Luego cargar los usuarios de forma individual para evitar errores
                            if ($examen->relationLoaded('usuariosAsignados') && $examen->usuariosAsignados) {
                                foreach ($examen->usuariosAsignados as $examenUsuario) {
                                    try {
                                        // Verificar que el examenUsuario es válido
                                        if (!$examenUsuario || !isset($examenUsuario->idUsuario)) {
                                            continue;
                                        }

                                        // Intentar cargar el usuario usando whereHas para verificar que existe
                                        $usuario = \App\Models\Usuario::where('idUsuario', $examenUsuario->idUsuario)->first();

                                        if ($usuario) {
                                            $usuariosAsignados[] = [
                                                'idUsuario' => $examenUsuario->idUsuario,
                                                'nombre' => $usuario->nombre ?? null,
                                                'apellidos' => $usuario->apellidos ?? null,
                                            ];
                                        }
                                    } catch (\Exception $e) {
                                        // Si hay error al cargar un usuario específico, continuar con los demás
                                        Log::warning('Error al cargar usuario en usuariosAsignados paso 6', [
                                            'examen_id' => $examen->idExamen ?? null,
                                            'examen_usuario_id' => $examenUsuario->idExamenUsuario ?? null,
                                            'usuario_id' => $examenUsuario->idUsuario ?? null,
                                            'error' => $e->getMessage()
                                        ]);
                                        // No incluir usuarios con errores
                                    }
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning('Error al cargar usuariosAsignados en paso 6', [
                            'examen_id' => $examen->idExamen ?? null,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString()
                        ]);
                        // Continuar con usuariosAsignados vacío
                        $usuariosAsignados = [];
                    }

                    // Construir respuesta de forma segura
                    try {
                        return response()->json([
                            'data' => [
                                'idExamen' => $examen->idExamen ?? null,
                                'fecha_inicio_vigencia' => $fechaInicioVigencia,
                                'fecha_fin_vigencia' => $fechaFinVigencia,
                                'tipo_acceso' => $tipoAcceso,
                                'usuariosAsignados' => $usuariosAsignados,
                            ],
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Error al construir respuesta JSON en paso 6', [
                            'examen_id' => $examen->idExamen ?? null,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString()
                        ]);
                        // Retornar respuesta básica aunque haya error
                        return response()->json([
                            'data' => [
                                'idExamen' => $examen->idExamen ?? null,
                                'fecha_inicio_vigencia' => null,
                                'fecha_fin_vigencia' => null,
                                'tipo_acceso' => 'publico',
                                'usuariosAsignados' => [],
                            ],
                        ]);
                    }

                default:
                    return response()->json([
                        'message' => 'Paso inválido'
                    ], 400);
            }
        } catch (\Exception $e) {
            Log::error('Error en getDatosPaso', [
                'examen_id' => $id ?? null,
                'paso' => $paso ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error al cargar los datos del paso',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Actualizar el paso actual del examen
     * Se llama después de completar cada paso del wizard
     */
    public function actualizarPaso(Request $request, $id)
    {
        $request->validate([
            'paso' => 'required|integer|min:1|max:6',
        ]);

        $examen = Examen::where('idExamen', $id)->firstOrFail();

        // Verificar que el examen no esté finalizado
        try {
            $this->verificarExamenNoFinalizado($examen);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // Solo permitir actualizar paso_actual si el examen está en Borrador
        if ($examen->estado !== '0') {
            return response()->json([
                'message' => 'Solo se puede actualizar el paso de exámenes en estado Borrador',
            ], 422);
        }

        $examen->load(['subpruebas', 'postulaciones.reglasPuntaje']);

        $completitudService = new ExamenCompletitudService();

        // Verificar que el paso esté completo antes de actualizar
        $estadoPasos = $completitudService->obtenerEstadoPasos($examen);

        if (!$estadoPasos["paso{$request->paso}"]) {
            return response()->json([
                'message' => "El paso {$request->paso} no está completo. Complete todos los requisitos antes de continuar.",
            ], 422);
        }

        // Actualizar paso_actual solo si es mayor al actual
        if ($request->paso > ($examen->paso_actual ?? 0)) {
            $examen->paso_actual = $request->paso;
            $examen->save();
        }

        // Calcular completitud actualizada
        $completitud = $completitudService->calcularCompletitud($examen);

        return response()->json([
            'message' => 'Paso actualizado exitosamente',
            'paso_actual' => $examen->paso_actual,
            'completitud' => $completitud,
        ]);
    }

    /**
     * Limpiar todas las variaciones de caché de exámenes
     */
    private function limpiarCacheExamenes()
    {
        // Limpiar caché de listado de exámenes (usando patrón)
        // Nota: En producción con Redis, considera usar tags de caché
        // Cache::tags(['examenes'])->flush();

        // Por ahora, limpiar caché del dashboard que incluye estadísticas de exámenes
        Cache::forget('admin_dashboard_estadisticas');
        Cache::forget('admin_dashboard_examenes_por_estado');

        // Limpiar caché de exámenes disponibles para docentes
        // Esto se hace por usuario, así que no podemos limpiar todos fácilmente
        // Se limpiará individualmente cuando sea necesario
    }
}
