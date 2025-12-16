<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReglaPuntaje;
use App\Models\Subprueba;
use Illuminate\Http\Request;

class ReglaPuntajeController extends Controller
{
    /**
     * Verificar si el examen tiene intentos iniciados
     */
    private function verificarSinIntentos(Subprueba $subprueba): void
    {
        $examen = $subprueba->examen;
        if ($examen && $examen->intentos()->exists()) {
            $cantidadIntentos = $examen->intentos()->count();
            throw new \Exception(
                "No se puede modificar el examen porque ya hay {$cantidadIntentos} intento(s) iniciado(s) por docente(s) o participante(s). " .
                    "Una vez que alguien ha comenzado a tomar el examen, no se pueden realizar modificaciones."
            );
        }
    }

    /**
     * Verificar si el examen está finalizado (estado = '1' publicado o '2' finalizado)
     * Si está finalizado, lanzar una excepción
     */
    private function verificarExamenNoFinalizado(Subprueba $subprueba): void
    {
        $examen = $subprueba->examen;
        if ($examen && ($examen->estado === '1' || $examen->estado === '2')) {
            throw new \Exception(
                'No se puede modificar un examen finalizado. Solo se puede ver su configuración, duplicarlo o eliminarlo.'
            );
        }
    }

    /**
     * RF-A.8.1: CRUD de Reglas de Puntaje (por Postulación)
     * Listar reglas de puntaje de una postulación
     */
    public function index($id)
    {
        try {
            // Obtener la postulación manualmente usando idPostulacion
            $postulacion = \App\Models\Postulacion::where('idPostulacion', $id)->firstOrFail();

            // Intentar cargar reglas con join, pero si falla, usar método alternativo
            $reglas = collect([]);

            try {
                // Cargar reglas con subprueba, filtrando las que tienen subprueba válida
                // Usar join para verificar que la subprueba exista antes de cargar
                // Filtrar también reglas con idSubprueba NULL
                $reglas = ReglaPuntaje::where('regla_puntajes.idPostulacion', $postulacion->idPostulacion)
                    ->whereNotNull('regla_puntajes.idSubprueba') // Excluir reglas con idSubprueba NULL
                    ->join('subpruebas', function ($join) {
                        $join->on('regla_puntajes.idSubprueba', '=', 'subpruebas.idSubprueba')
                            ->whereNotNull('subpruebas.idSubprueba');
                    })
                    ->select('regla_puntajes.*')
                    ->orderBy('regla_puntajes.idSubprueba')
                    ->get();
            } catch (\Exception $e) {
                // Si el join falla, intentar método alternativo
                \Illuminate\Support\Facades\Log::warning('ReglaPuntajeController@index - Error en join, usando método alternativo', [
                    'postulacion_id' => $id,
                    'error' => $e->getMessage()
                ]);

                // Método alternativo: cargar reglas y filtrar manualmente
                $reglas = ReglaPuntaje::where('idPostulacion', $postulacion->idPostulacion)
                    ->whereNotNull('idSubprueba')
                    ->orderBy('idSubprueba')
                    ->get();
            }

            // Cargar la relación subprueba de forma segura
            try {
                $reglas->load(['subprueba' => function ($query) {
                    $query->whereNotNull('idSubprueba');
                }]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('ReglaPuntajeController@index - Error al cargar relación subprueba', [
                    'postulacion_id' => $id,
                    'error' => $e->getMessage()
                ]);
            }

            // Filtrar manualmente las reglas que tienen subprueba válida (doble verificación)
            $reglas = $reglas->filter(function ($regla) {
                try {
                    // Verificar que la regla tenga idSubprueba
                    if (!$regla || !isset($regla->idSubprueba) || $regla->idSubprueba === null) {
                        return false;
                    }

                    // Verificar que la relación subprueba esté cargada y sea válida
                    if (!$regla->relationLoaded('subprueba')) {
                        // Intentar cargar la relación manualmente
                        try {
                            $subprueba = \App\Models\Subprueba::where('idSubprueba', $regla->idSubprueba)->first();
                            if (!$subprueba) {
                                return false;
                            }
                            $regla->setRelation('subprueba', $subprueba);
                        } catch (\Exception $e) {
                            return false;
                        }
                    }

                    return $regla->subprueba !== null && $regla->subprueba->idSubprueba !== null;
                } catch (\Exception $e) {
                    // Si hay algún error al acceder a la relación, excluir la regla
                    \Illuminate\Support\Facades\Log::warning('ReglaPuntajeController@index - Error al acceder a relación subprueba', [
                        'regla_id' => $regla->idRegla ?? 'unknown',
                        'error' => $e->getMessage()
                    ]);
                    return false;
                }
            })->values();

            return response()->json($reglas);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Illuminate\Support\Facades\Log::error('ReglaPuntajeController@index - Postulación no encontrada', [
                'postulacion_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Postulación no encontrada',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 404);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('ReglaPuntajeController@index - Error al obtener reglas', [
                'postulacion_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Error al cargar las reglas de puntaje',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * RF-A.8.1: Crear una nueva regla de puntaje
     */
    public function store(Request $request, $id)
    {
        \Illuminate\Support\Facades\Log::info('ReglaPuntajeController@store - Iniciando creación', [
            'postulacion_id' => $id,
            'request_data' => $request->all(),
        ]);

        // Obtener la postulación manualmente usando idPostulacion
        $postulacion = \App\Models\Postulacion::where('idPostulacion', $id)->first();

        if (!$postulacion) {
            \Illuminate\Support\Facades\Log::error('ReglaPuntajeController@store - Postulación no encontrada', [
                'id_buscado' => $id,
                'tipo_id' => gettype($id),
            ]);
            return response()->json([
                'message' => 'Postulación no encontrada'
            ], 404);
        }

        \Illuminate\Support\Facades\Log::info('ReglaPuntajeController@store - Postulación encontrada', [
            'idPostulacion' => $postulacion->idPostulacion,
            'idExamen' => $postulacion->idExamen,
        ]);

        try {
            $request->validate([
                'idSubprueba' => 'required|integer|exists:subpruebas,idSubprueba',
                'puntaje_correcto' => 'required|numeric|min:0.01|max:10.00',
                'puntaje_incorrecto' => 'nullable|numeric',
                'puntaje_en_blanco' => 'nullable|numeric',
                'puntaje_minimo_subprueba' => 'nullable|numeric|min:0',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Illuminate\Support\Facades\Log::error('ReglaPuntajeController@store - Error de validación', [
                'errors' => $e->errors(),
            ]);
            return response()->json([
                'message' => 'Error de validación',
                'errors' => $e->errors(),
            ], 422);
        }

        \Illuminate\Support\Facades\Log::info('ReglaPuntajeController@store - Validación exitosa', [
            'idSubprueba' => $request->idSubprueba,
            'puntaje_correcto' => $request->puntaje_correcto,
        ]);

        // Verificar que no exista ya una regla para esta combinación Postulación-Subprueba
        $reglaExistente = ReglaPuntaje::where('idPostulacion', $postulacion->idPostulacion)
            ->where('idSubprueba', $request->idSubprueba)
            ->exists();

        if ($reglaExistente) {
            \Illuminate\Support\Facades\Log::warning('ReglaPuntajeController@store - Regla duplicada', [
                'idPostulacion' => $postulacion->idPostulacion,
                'idSubprueba' => $request->idSubprueba,
            ]);
            return response()->json([
                'message' => 'Ya existe una regla para esta combinación de postulación y subprueba',
            ], 422);
        }

        // Verificar que la subprueba pertenezca al mismo examen que la postulación
        $subprueba = \App\Models\Subprueba::where('idSubprueba', $request->idSubprueba)->first();

        if (!$subprueba) {
            \Illuminate\Support\Facades\Log::error('ReglaPuntajeController@store - Subprueba no encontrada', [
                'idSubprueba' => $request->idSubprueba,
            ]);
            return response()->json([
                'message' => 'Subprueba no encontrada'
            ], 404);
        }

        if ($subprueba->idExamen !== $postulacion->idExamen) {
            return response()->json([
                'message' => 'La subprueba debe pertenecer al mismo examen que la postulación'
            ], 422);
        }

        // Cargar la relación del examen si no está cargada
        if (!$subprueba->relationLoaded('examen')) {
            $subprueba->load('examen');
        }

        // Verificar que el examen no esté finalizado
        try {
            $this->verificarExamenNoFinalizado($subprueba);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // Verificar que no haya intentos iniciados
        try {
            $this->verificarSinIntentos($subprueba);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // Según normativa, puntaje_incorrecto y puntaje_en_blanco siempre son 0.00
        try {
            $datosRegla = [
                'idPostulacion' => $postulacion->idPostulacion,
                'idSubprueba' => $request->idSubprueba,
                'puntaje_correcto' => $request->puntaje_correcto,
                'puntaje_incorrecto' => 0.00, // Siempre 0 según normativa
                'puntaje_en_blanco' => 0.00, // Siempre 0 según normativa
                'puntaje_minimo_subprueba' => $request->filled('puntaje_minimo_subprueba') ? $request->puntaje_minimo_subprueba : null,
            ];

            \Illuminate\Support\Facades\Log::info('ReglaPuntajeController@store - Intentando crear regla', [
                'datos_regla' => $datosRegla,
            ]);

            $regla = ReglaPuntaje::create($datosRegla);

            \Illuminate\Support\Facades\Log::info('ReglaPuntajeController@store - Regla creada exitosamente', [
                'idRegla' => $regla->idRegla,
            ]);

            return response()->json($regla->load('subprueba'), 201);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('ReglaPuntajeController@store - Error al crear regla', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
                'postulacion_id' => $postulacion->idPostulacion,
            ]);
            return response()->json([
                'message' => 'Error al crear la regla de puntaje',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor',
            ], 500);
        }
    }

    /**
     * RF-A.8.1: Actualizar una regla de puntaje
     */
    public function update(Request $request, ReglaPuntaje $reglaPuntaje)
    {
        $request->validate([
            'puntaje_correcto' => 'required|numeric|min:0.01|max:10.00',
            'puntaje_incorrecto' => 'nullable|numeric',
            'puntaje_en_blanco' => 'nullable|numeric',
            'puntaje_minimo_subprueba' => 'nullable|numeric|min:0',
        ]);

        // Verificar que el examen no esté finalizado
        $subprueba = $reglaPuntaje->subprueba;
        try {
            $this->verificarExamenNoFinalizado($subprueba);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // Verificar que no haya intentos iniciados
        try {
            $this->verificarSinIntentos($subprueba);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $reglaPuntaje->update($request->only([
            'puntaje_correcto',
            'puntaje_incorrecto',
            'puntaje_en_blanco',
            'puntaje_minimo_subprueba'
        ]));

        return response()->json($reglaPuntaje->load('subprueba'));
    }

    public function destroy(ReglaPuntaje $reglaPuntaje)
    {
        // Verificar que el examen no esté finalizado
        $subprueba = $reglaPuntaje->subprueba;
        try {
            $this->verificarExamenNoFinalizado($subprueba);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // Verificar que no haya intentos iniciados
        try {
            $this->verificarSinIntentos($subprueba);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $reglaPuntaje->delete();
        return response()->json(null, 204);
    }
}
