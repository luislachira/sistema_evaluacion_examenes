<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Examen;
use App\Models\Subprueba;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubpruebaController extends Controller
{
    /**
     * Verificar si el examen tiene intentos iniciados
     */
    private function verificarSinIntentos(Examen $examen): void
    {
        if ($examen->intentos()->exists()) {
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
    private function verificarExamenNoFinalizado(Examen $examen): void
    {
        if ($examen->estado === '1' || $examen->estado === '2') {
            throw new \Exception(
                'No se puede modificar un examen finalizado. Solo se puede ver su configuración, duplicarlo o eliminarlo.'
            );
        }
    }

    /**
     * RF-A.4.3: CRUD de Subpruebas
     * Obtener todas las subpruebas de un examen
     */
    public function index(Examen $examen)
    {
        try {
            $subpruebas = Subprueba::where('idExamen', $examen->idExamen)
                ->orderBy('orden', 'asc')
                ->orderBy('idSubprueba', 'asc') // Orden secundario por ID si orden es NULL
                ->get();

            // Agregar el conteo de preguntas por subprueba de forma segura
            $subpruebasConConteo = $subpruebas->map(function ($subprueba) use ($examen) {
                try {
                    if (!$subprueba || !isset($subprueba->idSubprueba)) {
                        return null;
                    }

                    $preguntasCount = 0;
                    try {
                        $preguntasCount = DB::table('examen_pregunta')
                            ->where('idExamen', $examen->idExamen)
                            ->where('idSubprueba', $subprueba->idSubprueba)
                            ->count();
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::warning('Error al contar preguntas en SubpruebaController@index', [
                            'subprueba_id' => $subprueba->idSubprueba ?? null,
                            'examen_id' => $examen->idExamen ?? null,
                            'error' => $e->getMessage()
                        ]);
                        $preguntasCount = 0;
                    }

                    // Agregar el conteo como atributo adicional
                    $subprueba->preguntas_count = $preguntasCount;
                    return $subprueba;
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Error al mapear subprueba en SubpruebaController@index', [
                        'subprueba_id' => $subprueba->idSubprueba ?? null,
                        'error' => $e->getMessage()
                    ]);
                    return null;
                }
            })->filter()->values();

            return response()->json($subpruebasConConteo);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error al obtener subpruebas', [
                'examen_id' => $examen->idExamen ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error al cargar las subpruebas',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * RF-A.4.3: Crear una nueva subprueba
     */
    public function store(Request $request, Examen $examen)
    {
        $request->validate([
            'nombre' => 'required|string|min:5|max:100',
            'orden' => 'required|integer|min:1',
            'puntaje_por_pregunta' => 'nullable|numeric|min:0|max:10',
            'duracion_minutos' => 'nullable|integer|min:0',
        ], [
            'nombre.required' => 'El nombre es obligatorio',
            'nombre.string' => 'El nombre debe ser texto',
            'nombre.min' => 'El nombre debe tener al menos 5 caracteres',
            'nombre.max' => 'El nombre no puede exceder 100 caracteres',
            'orden.required' => 'El orden es obligatorio',
            'orden.integer' => 'El orden debe ser un número entero',
            'orden.min' => 'El orden debe ser al menos 1',
            'puntaje_por_pregunta.numeric' => 'El puntaje por pregunta debe ser un número',
            'puntaje_por_pregunta.min' => 'El puntaje por pregunta debe ser al menos 0',
            'puntaje_por_pregunta.max' => 'El puntaje por pregunta no puede exceder 10',
            'duracion_minutos.integer' => 'La duración en minutos debe ser un número entero',
            'duracion_minutos.min' => 'La duración en minutos debe ser al menos 0',
        ]);

        // Verificar que no haya otra subprueba con el mismo orden
        $ordenExistente = Subprueba::where('idExamen', $examen->idExamen)
            ->where('orden', $request->orden)
            ->exists();

        if ($ordenExistente) {
            return response()->json([
                'message' => "Ya existe una subprueba con el orden {$request->orden}",
            ], 422);
        }

        // Verificar que el examen no esté finalizado
        try {
            $this->verificarExamenNoFinalizado($examen);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // Verificar que no haya intentos iniciados
        try {
            $this->verificarSinIntentos($examen);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $subprueba = Subprueba::create([
            'idExamen' => $examen->idExamen,
            'nombre' => $request->nombre,
            'puntaje_por_pregunta' => $request->puntaje_por_pregunta,
            'duracion_minutos' => $request->duracion_minutos,
            'orden' => $request->orden,
        ]);

        return response()->json($subprueba, 201);
    }

    /**
     * RF-A.4.3: Actualizar una subprueba
     */
    public function update(Request $request, Subprueba $subprueba)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'puntaje_por_pregunta' => 'required|numeric|min:0|max:10',
            'duracion_minutos' => 'required|integer|min:1',
            'orden' => 'required|integer|min:1',
        ], [
            'nombre.required' => 'El nombre es obligatorio',
            'nombre.string' => 'El nombre debe ser texto',
            'nombre.max' => 'El nombre no puede exceder 255 caracteres',
            'puntaje_por_pregunta.required' => 'El puntaje por pregunta es obligatorio',
            'puntaje_por_pregunta.numeric' => 'El puntaje por pregunta debe ser un número',
            'puntaje_por_pregunta.min' => 'El puntaje por pregunta debe ser al menos 0',
            'puntaje_por_pregunta.max' => 'El puntaje por pregunta no puede exceder 10',
            'duracion_minutos.required' => 'La duración en minutos es obligatoria',
            'duracion_minutos.integer' => 'La duración en minutos debe ser un número entero',
            'duracion_minutos.min' => 'La duración en minutos debe ser al menos 1',
            'orden.required' => 'El orden es obligatorio',
            'orden.integer' => 'El orden debe ser un número entero',
            'orden.min' => 'El orden debe ser al menos 1',
        ]);

        // Verificar que el examen no esté finalizado
        $examen = $subprueba->examen;
        try {
            $this->verificarExamenNoFinalizado($examen);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // Verificar que no haya intentos iniciados
        try {
            $this->verificarSinIntentos($examen);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $subprueba->update($request->only(['nombre', 'puntaje_por_pregunta', 'duracion_minutos', 'orden']));

        return response()->json($subprueba);
    }

    /**
     * RF-A.4.3: Eliminar una subprueba
     */
    public function destroy(Subprueba $subprueba)
    {
        // Verificar que el examen no esté finalizado
        $examen = $subprueba->examen;
        try {
            $this->verificarExamenNoFinalizado($examen);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // Verificar que no haya intentos iniciados
        try {
            $this->verificarSinIntentos($examen);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // Verificar si tiene preguntas asignadas
        $tienePreguntas = DB::table('examen_pregunta')
            ->where('idSubprueba', $subprueba->idSubprueba)
            ->exists();

        // Si el examen está en borrador (estado '0'), permitir eliminar la subprueba junto con sus preguntas
        if ($tienePreguntas) {
            if ($examen->estado === '0') {
                // Eliminar todas las preguntas asociadas a esta subprueba
                DB::table('examen_pregunta')
                    ->where('idSubprueba', $subprueba->idSubprueba)
                    ->where('idExamen', $examen->idExamen)
                    ->delete();
            } else {
                // Si el examen no está en borrador, no permitir eliminar
                return response()->json([
                    'message' => 'No se puede eliminar la subprueba porque tiene preguntas asignadas. Solo se pueden eliminar subpruebas con preguntas cuando el examen está en estado Borrador.'
                ], 422);
            }
        }

        $subprueba->delete();
        return response()->json(null, 204);
    }
}
