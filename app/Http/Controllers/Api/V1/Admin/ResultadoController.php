<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\IntentoExamen;
use App\Models\RespuestaIntento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class ResultadoController extends Controller
{
    /**
     * RF-A.5.1: Ver Lista Completa de Intentos
     * RF-A.5.2: Filtrar Resultados
     */
    public function index(Request $request)
    {
        // Construir clave de caché basada en los parámetros de búsqueda
        $cacheKey = 'admin_resultados_' . md5(json_encode([
            'search_examen' => $request->get('search_examen', ''),
            'idExamen' => $request->get('idExamen', ''),
            'search_usuario' => $request->get('search_usuario', ''),
            'idUsuario' => $request->get('idUsuario', ''),
            'fecha_desde' => $request->get('fecha_desde', ''),
            'fecha_hasta' => $request->get('fecha_hasta', ''),
            'page' => $request->get('page', 1),
            'per_page' => $request->get('per_page', 10),
        ]));

        $responseData = Cache::remember($cacheKey, 180, function () use ($request) {
        $query = IntentoExamen::select([
            'idIntento',
            'idExamen',
            'idUsuario',
            'hora_fin',
            'puntaje',
            'es_aprobado',
            'estado'
        ])
            ->with([
                'usuario' => function ($query) {
                    $query->select('idUsuario', 'nombre', 'apellidos');
                },
                'examen' => function ($query) {
                        $query->select('idExamen', 'titulo', 'codigo_examen');
                }
            ])
            ->where('estado', 'enviado');

        // Búsqueda por código de examen (búsqueda exacta)
        if ($request->filled('search_examen')) {
            $searchExamen = trim($request->search_examen);
            $query->whereHas('examen', function ($q) use ($searchExamen) {
                $q->where('codigo_examen', '=', $searchExamen);
            });
        } elseif ($request->filled('idExamen')) {
            // Mantener compatibilidad con búsqueda por ID
            $query->where('idExamen', $request->idExamen);
        }

        // Búsqueda por texto de usuario
        if ($request->filled('search_usuario')) {
            $searchUsuario = trim($request->search_usuario);
            $query->whereHas('usuario', function ($q) use ($searchUsuario) {
                $q->where(function ($query) use ($searchUsuario) {
                    $query->where('nombre', 'LIKE', "%{$searchUsuario}%")
                        ->orWhere('apellidos', 'LIKE', "%{$searchUsuario}%")
                        ->orWhereRaw("CONCAT(nombre, ' ', apellidos) LIKE ?", ["%{$searchUsuario}%"]);
                });
            });
        } elseif ($request->filled('idUsuario')) {
            // Mantener compatibilidad con búsqueda por ID
            $query->where('idUsuario', $request->idUsuario);
        }

        if ($request->filled('fecha_desde')) {
            $query->where('hora_fin', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->where('hora_fin', '<=', $request->fecha_hasta);
        }

        $perPage = $request->integer('per_page', 10);
        $intentos = $query->orderBy('hora_fin', 'desc')->paginate($perPage);

        // Formatear fechas en formato d-m-Y
            return $intentos->toArray();
        });

        // Formatear fechas en formato d-m-Y
        $responseData = $responseData;
        if (isset($responseData['data'])) {
            $responseData['data'] = array_map(function ($intento) {
                // Formatear hora_inicio
                if (isset($intento['hora_inicio']) && $intento['hora_inicio']) {
                    try {
                        // Si viene como string ISO, parsearlo
                        if (is_string($intento['hora_inicio'])) {
                            $intento['hora_inicio'] = \Carbon\Carbon::parse($intento['hora_inicio'])->format('d-m-Y');
                        } elseif ($intento['hora_inicio'] instanceof \Carbon\Carbon) {
                            $intento['hora_inicio'] = $intento['hora_inicio']->format('d-m-Y');
                        }
                    } catch (\Exception $e) {
                        // Si falla, mantener el valor original
                    }
                }
                // Formatear hora_fin
                if (isset($intento['hora_fin']) && $intento['hora_fin']) {
                    try {
                        // Si viene como string ISO, parsearlo
                        if (is_string($intento['hora_fin'])) {
                            $intento['hora_fin'] = \Carbon\Carbon::parse($intento['hora_fin'])->format('d-m-Y');
                        } elseif ($intento['hora_fin'] instanceof \Carbon\Carbon) {
                            $intento['hora_fin'] = $intento['hora_fin']->format('d-m-Y');
                        }
                    } catch (\Exception $e) {
                        // Si falla, mantener el valor original
                    }
                }
                return $intento;
            }, $responseData['data']);
        }

        return response()->json($responseData);
    }

    /**
     * RF-A.5.3: Ver Detalle del Intento
     */
    public function show(IntentoExamen $intentoExamen)
    {
        // Cachear resultado individual por 5 minutos
        $cacheKey = "admin_resultado_show_{$intentoExamen->idIntento}";
        
        $detalle = Cache::remember($cacheKey, 300, function () use ($intentoExamen) {
        $intentoExamen->load([
            'usuario' => function ($query) {
                $query->select('idUsuario', 'nombre', 'apellidos');
            },
                'examen:idExamen,titulo,codigo_examen',
            'respuestas.opcionSeleccionada',
                'respuestas.pregunta:idPregunta,enunciado',
                'respuestas.pregunta.opciones:idOpcion,idPregunta,contenido,es_correcta',
                'resultadosSubprueba.subprueba:idSubprueba,nombre',
                'postulacion:idPostulacion,nombre,descripcion,tipo_aprobacion'
        ]);

        // Obtener las preguntas del examen con su subprueba
        $preguntasExamen = \Illuminate\Support\Facades\DB::table('examen_pregunta')
            ->where('idExamen', $intentoExamen->examen->idExamen)
            ->get()
            ->keyBy('idPregunta');

        // Obtener reglas de puntaje para calcular el puntaje máximo
        $reglasPuntaje = \App\Models\ReglaPuntaje::where('idPostulacion', $intentoExamen->postulacion->idPostulacion)
            ->get()
            ->keyBy('idSubprueba');

        // Filtrar resultados de subpruebas según el tipo de aprobación
        $resultadosSubpruebasFiltrados = $intentoExamen->resultadosSubprueba;
        $tipoAprobacion = $intentoExamen->postulacion->tipo_aprobacion ?? '0';

        // Si el tipo de aprobación es independiente, mostrar solo la subprueba seleccionada
        if ($tipoAprobacion === '1' && $intentoExamen->idSubpruebaSeleccionada) {
            $resultadosSubpruebasFiltrados = $resultadosSubpruebasFiltrados->filter(function ($resultado) use ($intentoExamen) {
                return $resultado->idSubprueba == $intentoExamen->idSubpruebaSeleccionada;
            })->unique('idSubprueba'); // Evitar duplicados si existen en la BD
        } else {
            // Para aprobación conjunta, también eliminar duplicados por idSubprueba
            $resultadosSubpruebasFiltrados = $resultadosSubpruebasFiltrados->unique('idSubprueba');
        }

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

        $detalle = [
            'intento' => $intentoFormateado,
            'postulacion' => $intentoExamen->postulacion ? [
                'idPostulacion' => $intentoExamen->postulacion->idPostulacion,
                'nombre' => $intentoExamen->postulacion->nombre,
                'descripcion' => $intentoExamen->postulacion->descripcion,
                'tipo_aprobacion' => $intentoExamen->postulacion->tipo_aprobacion,
            ] : null,
            'respuestas' => $intentoExamen->respuestas->map(function ($respuesta) {
                return [
                    'idPregunta' => $respuesta->idPregunta,
                    'enunciado' => $respuesta->pregunta->enunciado,
                    'idOpcionSeleccionada' => $respuesta->idOpcionSeleccionada,
                    'opcionSeleccionada' => $respuesta->opcionSeleccionada ? [
                        'idOpcion' => $respuesta->opcionSeleccionada->idOpcion,
                        'contenido' => $respuesta->opcionSeleccionada->contenido,
                        'es_correcta' => $respuesta->opcionSeleccionada->es_correcta,
                    ] : null,
                    'opciones' => $respuesta->pregunta->opciones->map(function ($opcion) {
                        return [
                            'idOpcion' => $opcion->idOpcion,
                            'contenido' => $opcion->contenido,
                            'es_correcta' => $opcion->es_correcta,
                        ];
                    }),
                ];
            }),
            'resultados_subpruebas' => $resultadosSubpruebasConCorrectas,
        ];
            
            return $detalle;
        });

        return response()->json($detalle);
    }

    /**
     * RF-A.5.4: Exportar Resultados
     */
    public function exportar(Request $request)
    {
        $query = IntentoExamen::select([
            'idIntento',
            'idExamen',
            'idUsuario',
            'hora_inicio',
            'hora_fin',
            'puntaje',
            'es_aprobado',
            'estado'
        ])
            ->with([
                'usuario' => function ($query) {
                    $query->select('idUsuario', 'nombre', 'apellidos');
                },
                'examen' => function ($query) {
                    $query->select('idExamen', 'titulo', 'codigo_examen');
                }
            ])
            ->where('estado', 'enviado');

        // Aplicar los mismos filtros que en index
        // Búsqueda por código de examen (búsqueda exacta)
        if ($request->filled('search_examen')) {
            $searchExamen = trim($request->search_examen);
            $query->whereHas('examen', function ($q) use ($searchExamen) {
                $q->where('codigo_examen', '=', $searchExamen);
            });
        } elseif ($request->filled('idExamen')) {
            $query->where('idExamen', $request->idExamen);
        }
        if ($request->filled('search_usuario')) {
            $searchUsuario = trim($request->search_usuario);
            $query->whereHas('usuario', function ($q) use ($searchUsuario) {
                $q->where(function ($query) use ($searchUsuario) {
                    $query->where('nombre', 'LIKE', "%{$searchUsuario}%")
                        ->orWhere('apellidos', 'LIKE', "%{$searchUsuario}%")
                        ->orWhereRaw("CONCAT(nombre, ' ', apellidos) LIKE ?", ["%{$searchUsuario}%"]);
                });
            });
        } elseif ($request->filled('idUsuario')) {
            $query->where('idUsuario', $request->idUsuario);
        }
        if ($request->filled('fecha_desde')) {
            $query->where('hora_fin', '>=', $request->fecha_desde);
        }
        if ($request->filled('fecha_hasta')) {
            $query->where('hora_fin', '<=', $request->fecha_hasta);
        }

        $intentos = $query->get();

        // Función para escapar valores CSV (usando punto y coma como delimitador)
        $escapeCsv = function ($value) {
            if ($value === null) {
                return '';
            }
            $value = (string) $value;
            // Si contiene punto y coma, comillas o saltos de línea, envolver en comillas dobles
            if (strpos($value, ';') !== false || strpos($value, '"') !== false || strpos($value, "\n") !== false) {
                // Escapar comillas dobles duplicándolas
                $value = str_replace('"', '""', $value);
                return '"' . $value . '"';
            }
            return $value;
        };

        // BOM UTF-8 para Excel
        $csv = "\xEF\xBB\xBF";
        // Usar punto y coma (;) como delimitador para Excel en español
        $csv .= "ID Intento;Usuario;Examen;Código Examen;Fecha Inicio;Fecha Fin;Puntaje;Aprobado\n";

        foreach ($intentos as $intento) {
            $usuario = $intento->usuario ? ($intento->usuario->nombre . ' ' . $intento->usuario->apellidos) : 'N/A';
            $examen = $intento->examen ? $intento->examen->titulo : 'N/A';
            $codigoExamen = $intento->examen && $intento->examen->codigo_examen ? $intento->examen->codigo_examen : 'N/A';
            $fechaInicio = $intento->hora_inicio ? \Carbon\Carbon::parse($intento->hora_inicio)->format('d-m-Y') : '';
            $fechaFin = $intento->hora_fin ? \Carbon\Carbon::parse($intento->hora_fin)->format('d-m-Y') : '';
            $puntaje = $intento->puntaje ?? 0;
            $aprobado = $intento->es_aprobado ? 'Sí' : 'No';

            $csv .= sprintf(
                "%s;%s;%s;%s;%s;%s;%s;%s\n",
                $escapeCsv($intento->idIntento),
                $escapeCsv($usuario),
                $escapeCsv($examen),
                $escapeCsv($codigoExamen),
                $escapeCsv($fechaInicio),
                $escapeCsv($fechaFin),
                $escapeCsv(number_format($puntaje, 2, '.', '')),
                $escapeCsv($aprobado)
            );
        }

        // Usar Carbon para obtener la fecha actual según la zona horaria configurada en Laravel
        // Formato: día-mes-año (ejemplo: 14-11-2025)
        $fechaActual = \Carbon\Carbon::now(config('app.timezone'))->format('d-m-Y');

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="resultados_' . $fechaActual . '.csv"',
        ]);
    }
}
