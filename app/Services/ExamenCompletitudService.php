<?php

namespace App\Services;

use App\Models\Examen;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Servicio para calcular la completitud de un examen según el flujo secuencial
 *
 * El examen tiene 6 pasos:
 * 1. Datos Básicos (~16.67%)
 * 2. Subpruebas (~16.67%)
 * 3. Postulaciones (~16.67%)
 * 4. Reglas de Puntaje (~16.67%)
 * 5. Ensamblador de Preguntas (~16.67%)
 * 6. Configuración de Fechas (~16.67%)
 *
 * Total: 100%
 */
class ExamenCompletitudService
{
    /**
     * Calcular el porcentaje de completitud del examen
     *
     * @param Examen $examen
     * @return int Porcentaje de completitud (0-100)
     */
    public function calcularCompletitud(Examen $examen): int
    {
        $porcentaje = 0;

        // PASO 1: Datos Básicos (~16.67%)
        if ($this->paso1Completo($examen)) {
            $porcentaje += 17; // Redondeado para sumar 100
        }

        // PASO 2: Subpruebas (~16.67%)
        if ($this->paso2Completo($examen)) {
            $porcentaje += 17;
        }

        // PASO 3: Postulaciones (~16.67%)
        if ($this->paso3Completo($examen)) {
            $porcentaje += 17;
        }

        // PASO 4: Reglas de Puntaje (~16.67%)
        if ($this->paso4Completo($examen)) {
            $porcentaje += 17;
        }

        // PASO 5: Ensamblador de Preguntas (~16.67%)
        if ($this->paso5Completo($examen)) {
            $porcentaje += 16;
        }

        // PASO 6: Configuración de Fechas (~16.67%)
        if ($this->paso6Completo($examen)) {
            $porcentaje += 16;
        }

        return min($porcentaje, 100); // Asegurar que no exceda 100%
    }

    /**
     * Verificar si el PASO 1 (Datos Básicos) está completo
     *
     * Requisitos:
     * - Código del examen no vacío
     * - Título (10-255 caracteres)
     * - Tipo de Concurso seleccionado
     * - Descripción (20-50000 caracteres)
     * - Tiempo límite (30-600 minutos)
     * - Tipo de acceso seleccionado
     *
     * NOTA: Las fechas de vigencia se configuran en el Paso 6
     */
    public function paso1Completo(Examen $examen): bool
    {
        // Verificar campos obligatorios
        if (empty($examen->codigo_examen)) {
            return false;
        }

        if (empty($examen->titulo) || strlen($examen->titulo) < 10 || strlen($examen->titulo) > 255) {
            return false;
        }

        if (empty($examen->idTipoConcurso)) {
            return false;
        }

        if (empty($examen->descripcion) || strlen($examen->descripcion) < 20 || strlen($examen->descripcion) > 50000) {
            return false;
        }

        if (empty($examen->tiempo_limite) || $examen->tiempo_limite < 30 || $examen->tiempo_limite > 600) {
            return false;
        }

        if (empty($examen->tipo_acceso)) {
            return false;
        }

        return true;
    }

    /**
     * Verificar si el PASO 2 (Subpruebas) está completo
     *
     * Requisitos:
     * - Al menos 1 subprueba creada
     */
    public function paso2Completo(Examen $examen): bool
    {
        // Cargar subpruebas si no están cargadas
        if (!$examen->relationLoaded('subpruebas')) {
            $examen->load('subpruebas');
        }

        return $examen->subpruebas->count() >= 1;
    }

    /**
     * Verificar si el PASO 3 (Postulaciones) está completo
     *
     * Requisitos:
     * - Al menos 1 postulación creada
     */
    public function paso3Completo(Examen $examen): bool
    {
        // Cargar postulaciones si no están cargadas
        if (!$examen->relationLoaded('postulaciones')) {
            $examen->load('postulaciones');
        }

        return $examen->postulaciones->count() >= 1;
    }

    /**
     * Verificar si el PASO 4 (Reglas de Puntaje) está completo
     *
     * Requisitos:
     * - CADA postulación debe tener al menos 1 regla de puntaje configurada
     */
    public function paso4Completo(Examen $examen): bool
    {
        try {
            // Cargar postulaciones si no están cargadas
            if (!$examen->relationLoaded('postulaciones')) {
                $examen->load('postulaciones');
            }

            // Si no hay postulaciones, el paso 4 no puede estar completo
            if ($examen->postulaciones->isEmpty()) {
                return false;
            }

            // Cargar subpruebas para verificar que existan
            if (!$examen->relationLoaded('subpruebas')) {
                $examen->load('subpruebas');
            }

            $subpruebasIds = $examen->subpruebas->pluck('idSubprueba')->toArray();

            // Verificar que cada postulación tenga al menos 1 regla con subprueba válida
            foreach ($examen->postulaciones as $postulacion) {
                if (!$postulacion->relationLoaded('reglasPuntaje')) {
                    $postulacion->load(['reglasPuntaje' => function ($query) use ($subpruebasIds) {
                        // Solo cargar reglas que tengan subpruebas válidas
                        $query->whereIn('idSubprueba', $subpruebasIds);
                    }]);
                }

                // Filtrar reglas que tienen subpruebas válidas
                $reglasValidas = $postulacion->reglasPuntaje->filter(function ($regla) use ($subpruebasIds) {
                    return in_array($regla->idSubprueba, $subpruebasIds);
                });

                if ($reglasValidas->isEmpty()) {
                    return false;
                }
            }

            return true;
        } catch (\Exception $e) {
            Log::error('ExamenCompletitudService@paso4Completo - Error al verificar paso 4', [
                'examen_id' => $examen->idExamen ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Verificar si el PASO 5 (Ensamblador de Preguntas) está completo
     *
     * Requisitos:
     * - CADA subprueba debe tener al menos 1 pregunta asignada
     */
    public function paso5Completo(Examen $examen): bool
    {
        // Cargar subpruebas si no están cargadas
        if (!$examen->relationLoaded('subpruebas')) {
            $examen->load('subpruebas');
        }

        // Si no hay subpruebas, el paso 5 no puede estar completo
        if ($examen->subpruebas->isEmpty()) {
            Log::info('ExamenCompletitudService@paso5Completo - No hay subpruebas', [
                'examen_id' => $examen->idExamen,
            ]);
            return false;
        }

        // Obtener todas las preguntas del examen con su idSubprueba
        $preguntasExamenRaw = DB::table('examen_pregunta')
            ->where('idExamen', $examen->idExamen)
            ->whereNotNull('idSubprueba')
            ->get();

        // Agrupar por idSubprueba convirtiendo a entero para evitar problemas de tipos
        $preguntasExamen = $preguntasExamenRaw->groupBy(function ($item) {
            return (int) $item->idSubprueba; // Convertir a entero para agrupar correctamente
        });

        Log::info('ExamenCompletitudService@paso5Completo - Verificando completitud', [
            'examen_id' => $examen->idExamen,
            'subpruebas_count' => $examen->subpruebas->count(),
            'preguntas_total' => $preguntasExamenRaw->count(),
            'preguntas_por_subprueba' => $preguntasExamen->map(function ($group) {
                return $group->count();
            })->toArray(),
            'subpruebas_ids' => $examen->subpruebas->pluck('idSubprueba')->toArray(),
        ]);

        // Verificar que cada subprueba tenga al menos 1 pregunta
        foreach ($examen->subpruebas as $subprueba) {
            $preguntasSubprueba = $preguntasExamen->get($subprueba->idSubprueba, collect());

            if ($preguntasSubprueba->isEmpty()) {
                Log::info('ExamenCompletitudService@paso5Completo - Subprueba sin preguntas', [
                    'examen_id' => $examen->idExamen,
                    'subprueba_id' => $subprueba->idSubprueba,
                    'subprueba_nombre' => $subprueba->nombre,
                ]);
                return false;
            }
        }

        Log::info('ExamenCompletitudService@paso5Completo - Paso 5 completo', [
            'examen_id' => $examen->idExamen,
        ]);

        return true;
    }

    /**
     * Verificar si el PASO 6 (Configuración de Fechas) está completo
     *
     * Requisitos:
     * - Fecha de inicio de vigencia válida
     * - Fecha de fin de vigencia válida
     * - Fecha fin > fecha inicio
     * - Rango no exceda 2 años
     */
    public function paso6Completo(Examen $examen): bool
    {
        // Verificar fechas de vigencia
        if (empty($examen->fecha_inicio_vigencia) || empty($examen->fecha_fin_vigencia)) {
            return false;
        }

        // Verificar que fecha_fin > fecha_inicio
        try {
            $fechaInicio = \Carbon\Carbon::parse($examen->fecha_inicio_vigencia);
            $fechaFin = \Carbon\Carbon::parse($examen->fecha_fin_vigencia);

            if ($fechaFin->lte($fechaInicio)) {
                return false;
            }

            // Verificar que el rango no exceda 2 años
            $diferenciaAnios = $fechaInicio->diffInYears($fechaFin);
            if ($diferenciaAnios > 2) {
                return false;
            }
        } catch (\Exception $e) {
            return false;
        }

        return true;
    }

    /**
     * Obtener el estado de cada paso del wizard
     *
     * @param Examen $examen
     * @return array Estado de cada paso ['paso1' => bool, 'paso2' => bool, ...]
     */
    public function obtenerEstadoPasos(Examen $examen): array
    {
        return [
            'paso1' => $this->paso1Completo($examen),
            'paso2' => $this->paso2Completo($examen),
            'paso3' => $this->paso3Completo($examen),
            'paso4' => $this->paso4Completo($examen),
            'paso5' => $this->paso5Completo($examen),
            'paso6' => $this->paso6Completo($examen),
        ];
    }

    /**
     * Obtener el siguiente paso disponible
     *
     * @param Examen $examen
     * @return int|null Número del siguiente paso (1-6) o null si todos están completos
     */
    public function obtenerSiguientePaso(Examen $examen): ?int
    {
        $estadoPasos = $this->obtenerEstadoPasos($examen);

        for ($i = 1; $i <= 6; $i++) {
            if (!$estadoPasos["paso{$i}"]) {
                return $i;
            }
        }

        return null; // Todos los pasos están completos
    }

    /**
     * Verificar si un paso específico puede ser accedido
     *
     * @param Examen $examen
     * @param int $paso Número del paso (1-6)
     * @return bool
     */
    public function puedeAccederPaso(Examen $examen, int $paso): bool
    {
        // El paso 1 siempre es accesible
        if ($paso === 1) {
            return true;
        }

        // Para acceder a un paso, todos los anteriores deben estar completos
        $estadoPasos = $this->obtenerEstadoPasos($examen);

        for ($i = 1; $i < $paso; $i++) {
            if (!$estadoPasos["paso{$i}"]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Verificar si el examen puede ser publicado
     *
     * Requisitos:
     * - Todos los pasos (1-6) deben estar completos
     * - El examen debe estar en estado Borrador (0)
     */
    public function puedePublicar(Examen $examen): bool
    {
        if ($examen->estado !== '0') {
            return false;
        }

        $estadoPasos = $this->obtenerEstadoPasos($examen);

        foreach ($estadoPasos as $completo) {
            if (!$completo) {
                return false;
            }
        }

        return true;
    }
}

