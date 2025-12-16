<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Usuario;
use App\Models\Examen;
use App\Models\Pregunta;
use App\Models\IntentoExamen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * RF-A.1: Dashboard - Widgets de Estadísticas y Gráficos
     * Optimizado con caché para mejorar el rendimiento
     */
    public function index()
    {
        try {
            // Cachear estadísticas básicas por 5 minutos
            $estadisticas = Cache::remember('admin_dashboard_estadisticas', 300, function () {
                // Optimizar consultas usando selectRaw para contar múltiples estados en una sola query
                $estadosUsuarios = Usuario::selectRaw('estado, COUNT(*) as total')
                    ->groupBy('estado')
                    ->pluck('total', 'estado')
                    ->toArray();

                $estadosExamenes = Examen::selectRaw('estado, COUNT(*) as total')
                    ->groupBy('estado')
                    ->pluck('total', 'estado')
                    ->toArray();

                $estadosIntentos = IntentoExamen::selectRaw('estado, COUNT(*) as total')
                    ->groupBy('estado')
                    ->pluck('total', 'estado')
                    ->toArray();

                return [
                    'total_usuarios' => array_sum($estadosUsuarios),
                    'usuarios_activos' => $estadosUsuarios[Usuario::ESTADO_ACTIVO] ?? 0,
                    'total_examenes' => array_sum($estadosExamenes),
                    'examenes_publicados' => $estadosExamenes['1'] ?? 0,
                    'examenes_borrador' => $estadosExamenes['0'] ?? 0,
                    'examenes_finalizados' => $estadosExamenes['2'] ?? 0,
                    'total_preguntas' => Pregunta::count(),
                    'total_intentos' => array_sum($estadosIntentos),
                    'intentos_completados' => $estadosIntentos['enviado'] ?? 0,
                    'intentos_en_progreso' => $estadosIntentos['iniciado'] ?? 0,
                ];
            });

            // RF-A.1.2: Gráfico de Línea (Intentos por Día - últimos 30 días)
            // Cachear por 10 minutos
            $intentosPorDia = Cache::remember('admin_dashboard_intentos_por_dia', 600, function () {
                $fechaInicio = Carbon::now(config('app.timezone'))->subDays(30);
                return IntentoExamen::where('estado', 'enviado')
                    ->whereNotNull('hora_fin')
                    ->where('hora_fin', '>=', $fechaInicio)
                    ->select(
                        DB::raw('DATE(hora_fin) as fecha'),
                        DB::raw('COUNT(*) as total')
                    )
                    ->groupBy('fecha')
                    ->orderBy('fecha')
                    ->get()
                    ->map(function ($item) {
                        return [
                            'fecha' => $item->fecha ? \Carbon\Carbon::parse($item->fecha)->format('d-m-Y') : null,
                            'total' => (int)$item->total,
                        ];
                    });
            });

            // RF-A.1.2: Gráfico de Dona (Tasa de Aprobación)
            // Cachear por 5 minutos
            $tasaAprobacion = Cache::remember('admin_dashboard_tasa_aprobacion', 300, function () {
                $resultados = IntentoExamen::where('estado', 'enviado')
                    ->selectRaw('es_aprobado, COUNT(*) as total')
                    ->groupBy('es_aprobado')
                    ->pluck('total', 'es_aprobado')
                    ->toArray();

                $aprobados = $resultados[1] ?? 0;
                $noAprobados = $resultados[0] ?? 0;
                $total = $aprobados + $noAprobados;

                return [
                    'aprobados' => $aprobados,
                    'no_aprobados' => $noAprobados,
                    'total' => $total,
                    'porcentaje_aprobacion' => $total > 0
                        ? round(($aprobados / $total) * 100, 2)
                        : 0,
                ];
            });

            // Estadísticas de exámenes por estado (últimos 7 días)
            // Cachear por 5 minutos
            $examenesPorEstado = Cache::remember('admin_dashboard_examenes_por_estado', 300, function () {
                $fechaInicio = Carbon::now(config('app.timezone'))->subDays(7);
                $estados = Examen::where('created_at', '>=', $fechaInicio)
                    ->selectRaw('estado, COUNT(*) as total')
                    ->groupBy('estado')
                    ->pluck('total', 'estado')
                    ->toArray();

                return [
                    'borrador' => $estados['0'] ?? 0,
                    'publicados' => $estados['1'] ?? 0,
                    'finalizados' => $estados['2'] ?? 0,
                ];
            });

            // Promedio de puntaje global
            // Cachear por 5 minutos
            $promedioPuntajeGlobal = Cache::remember('admin_dashboard_promedio_puntaje', 300, function () {
                return (float) (IntentoExamen::where('estado', 'enviado')
                    ->whereNotNull('puntaje')
                    ->avg('puntaje') ?? 0);
            });

            return response()->json([
                'estadisticas' => $estadisticas,
                'intentos_por_dia' => $intentosPorDia,
                'tasa_aprobacion' => $tasaAprobacion,
                'examenes_por_estado' => $examenesPorEstado,
                'promedio_puntaje_global' => round((float)$promedioPuntajeGlobal, 2),
            ]);
        } catch (\Exception $e) {
            Log::error('Error en DashboardController@index: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error al cargar las estadísticas del dashboard.',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }
}
