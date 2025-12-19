<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Pregunta;
use App\Models\OpcionesPregunta;
use App\Models\Categoria;
use App\Models\Contexto;
use App\Models\Examen;
use App\Models\IntentoExamen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class PreguntaController extends Controller
{
    /**
     * Verificar si una pregunta está siendo usada en algún examen activo
     * Un examen está activo si:
     * 1. Tiene intentos con estado 'iniciado' (en progreso)
     * 2. O tiene intentos donde el temporizador no ha terminado (hora_inicio + tiempo_limite > ahora)
     *
     * @param Pregunta $pregunta
     * @return array ['puede_modificar' => bool, 'examenes_activos' => array, 'mensaje' => string]
     */
    private function verificarPreguntaEnUso(Pregunta $pregunta): array
    {
        // Obtener todos los exámenes que usan esta pregunta
        $examenesIds = DB::table('examen_pregunta')
            ->where('idPregunta', $pregunta->idPregunta)
            ->pluck('idExamen')
            ->unique()
            ->toArray();

        if (empty($examenesIds)) {
            // La pregunta no está en ningún examen, se puede modificar
            return [
                'puede_modificar' => true,
                'examenes_activos' => [],
                'mensaje' => null
            ];
        }

        $examenesActivos = [];
        $ahora = Carbon::now();

        foreach ($examenesIds as $idExamen) {
            $examen = Examen::find($idExamen);
            if (!$examen) {
                continue;
            }

            // Si el examen está finalizado (estado = '2'), se puede modificar la pregunta
            // independientemente del estado de los intentos, ya que el examen ya terminó
            if ($examen->estado === '2') {
                continue; // Saltar este examen, no bloquea la modificación
            }

            // Verificar si hay intentos activos:
            // - Estado 'iniciado' Y el temporizador no ha terminado (hora_inicio + tiempo_limite > ahora)
            // - O estado 'iniciado' (aunque el temporizador haya terminado, el intento sigue activo hasta que se envíe)
            $intentosActivos = IntentoExamen::where('idExamen', $idExamen)
                ->where('estado', 'iniciado')
                ->get();

            // Si hay intentos activos, el examen está activo
            if ($intentosActivos->isNotEmpty()) {
                $examenesActivos[] = [
                    'idExamen' => $examen->idExamen,
                    'codigo_examen' => $examen->codigo_examen,
                    'titulo' => $examen->titulo,
                    'intentos_activos' => $intentosActivos->count(),
                ];
            }
        }

        if (!empty($examenesActivos)) {
            $codigosExamenes = collect($examenesActivos)->pluck('codigo_examen')->join(', ');
            return [
                'puede_modificar' => false,
                'examenes_activos' => $examenesActivos,
                'mensaje' => "No se puede modificar la pregunta porque está siendo utilizada en examen(es) activo(s): {$codigosExamenes}. " .
                    "Una pregunta solo se puede modificar cuando: " .
                    "1) No está en ningún examen, o " .
                    "2) Todos los exámenes que la usan están finalizados (todos los intentos están completados y el temporizador ha terminado)."
            ];
        }

        // Todos los exámenes están finalizados, se puede modificar
        return [
            'puede_modificar' => true,
            'examenes_activos' => [],
            'mensaje' => null
        ];
    }
    /**
     * RF-A.3.3: CRUD de Preguntas
     * RF-A.3.5: Filtros del Banco de Preguntas
     */
    public function index(Request $request)
    {
        try {
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

            $perPage = $request->integer('per_page', 10);
            $preguntas = $query->orderBy('codigo')->paginate($perPage);
            return response()->json($preguntas);
        } catch (\Exception $e) {
            Log::error('Error en PreguntaController@index: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'message' => 'Error al cargar las preguntas',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

    public function show($id)
    {
        $pregunta = Pregunta::with(['categoria', 'contexto', 'opciones'])
            ->where('idPregunta', $id)
            ->firstOrFail();

        return response()->json($pregunta);
    }

    public function store(Request $request)
    {
        $request->validate([
            'codigo' => 'required|string|max:100|unique:preguntas,codigo',
            'idCategoria' => 'required|exists:categorias,idCategoria',
            'ano' => 'required|integer',
            'idContexto' => 'nullable|exists:contextos,idContexto',
            'enunciado' => 'required|string',
            'opciones' => 'required|array|min:2|max:6',
            'opciones.*.contenido' => 'required|string',
            'opcion_correcta' => 'required|integer|min:0|max:' . (count($request->opciones) - 1),
        ]);

        DB::beginTransaction();
        try {
            $pregunta = Pregunta::create($request->only([
                'codigo',
                'idCategoria',
                'ano',
                'idContexto',
                'enunciado'
            ]));

            foreach ($request->opciones as $index => $opcion) {
                OpcionesPregunta::create([
                    'idPregunta' => $pregunta->idPregunta,
                    'contenido' => $opcion['contenido'],
                    'es_correcta' => $index == $request->opcion_correcta,
                ]);
            }

            DB::commit();
            $pregunta->load(['categoria', 'contexto', 'opciones']);
            return response()->json($pregunta, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al crear la pregunta', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $pregunta = Pregunta::where('idPregunta', $id)->firstOrFail();

        // Verificar si la pregunta está en uso en algún examen activo
        $verificacion = $this->verificarPreguntaEnUso($pregunta);
        if (!$verificacion['puede_modificar']) {
            return response()->json([
                'message' => $verificacion['mensaje'],
                'examenes_activos' => $verificacion['examenes_activos']
            ], 422);
        }

        $request->validate([
            'codigo' => 'required|string|max:100|unique:preguntas,codigo,' . $pregunta->idPregunta . ',idPregunta',
            'idCategoria' => 'required|exists:categorias,idCategoria',
            'ano' => 'required|integer',
            'idContexto' => 'nullable|exists:contextos,idContexto',
            'enunciado' => 'required|string',
            'opciones' => 'required|array|min:2|max:6',
            'opciones.*.contenido' => 'required|string',
            'opcion_correcta' => 'required|integer|min:0|max:' . (count($request->opciones) - 1),
        ]);

        DB::beginTransaction();
        try {
            $pregunta->update($request->only([
                'codigo',
                'idCategoria',
                'ano',
                'idContexto',
                'enunciado'
            ]));

            // Eliminar opciones existentes y crear nuevas
            $pregunta->opciones()->delete();
            foreach ($request->opciones as $index => $opcion) {
                OpcionesPregunta::create([
                    'idPregunta' => $pregunta->idPregunta,
                    'contenido' => $opcion['contenido'],
                    'es_correcta' => $index == $request->opcion_correcta,
                ]);
            }

            DB::commit();
            $pregunta->load(['categoria', 'contexto', 'opciones']);
            return response()->json($pregunta);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al actualizar la pregunta', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $pregunta = Pregunta::where('idPregunta', $id)->firstOrFail();

        if ($pregunta->examenes()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar la pregunta porque está asociada a exámenes.'
            ], 422);
        }

        $pregunta->delete();
        return response()->json(null, 204);
    }

    /**
     * Exportar preguntas a CSV
     */
    public function exportar(Request $request)
    {
        try {
            $query = Pregunta::with(['categoria', 'contexto', 'opciones']);

            // Aplicar filtros si existen
            if ($request->filled('idCategoria')) {
                $query->where('idCategoria', $request->idCategoria);
            }
            if ($request->filled('ano')) {
                $query->where('ano', $request->ano);
            }
            if ($request->filled('codigo')) {
                $query->where('codigo', 'LIKE', '%' . $request->codigo . '%');
            }

            $preguntas = $query->orderBy('codigo')->get();

            $filename = 'preguntas_export_' . date('Y-m-d_His') . '.csv';
            $headers = [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];

            $callback = function () use ($preguntas) {
                $file = fopen('php://output', 'w');

                // BOM para UTF-8 (Excel)
                fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

                // Encabezados
                fputcsv($file, [
                    'Código',
                    'Enunciado',
                    'ID Categoría',
                    'Nombre Categoría',
                    'Año',
                    'ID Contexto',
                    'Texto Contexto',
                    'Opción A',
                    'Opción B',
                    'Opción C',
                    'Opción D',
                    'Opción E',
                    'Opción F',
                    'Respuesta Correcta'
                ], ';');

                foreach ($preguntas as $pregunta) {
                    // Mantener HTML completo del enunciado con estilos e imágenes
                    $enunciado = $pregunta->enunciado ?? '';
                    // Limpiar HTML malformado antes de procesar
                    $enunciado = $this->limpiarAtributosMalformados($enunciado);
                    // Asegurar que las URLs de imágenes sean absolutas
                    $enunciado = $this->convertirUrlsImagenesAAbsolutas($enunciado);
                    // NO escapar comillas manualmente - fputcsv lo hace automáticamente

                    // Obtener información de categoría
                    $idCategoria = $pregunta->categoria->idCategoria ?? '';
                    $nombreCategoria = $pregunta->categoria->nombre ?? '';

                    // Obtener información de contexto
                    $idContexto = '';
                    $textoContexto = '';
                    if ($pregunta->contexto) {
                        $idContexto = $pregunta->contexto->idContexto ?? '';
                        $textoContexto = $pregunta->contexto->texto ?? '';
                        // Limpiar HTML malformado antes de procesar
                        $textoContexto = $this->limpiarAtributosMalformados($textoContexto);
                        // Asegurar que las URLs de imágenes sean absolutas
                        $textoContexto = $this->convertirUrlsImagenesAAbsolutas($textoContexto);
                        // NO escapar comillas manualmente - fputcsv lo hace automáticamente
                    }

                    // Ordenar opciones y encontrar la correcta
                    $opciones = $pregunta->opciones->sortBy('idOpcion')->values();
                    $opcionesArray = ['', '', '', '', '', ''];
                    $respuestaCorrecta = '';

                    foreach ($opciones as $index => $opcion) {
                        if ($index < 6) {
                            // Mantener HTML completo de las opciones con estilos e imágenes
                            $contenido = $opcion->contenido ?? '';
                            // Limpiar HTML malformado antes de procesar
                            $contenido = $this->limpiarAtributosMalformados($contenido);
                            // Asegurar que las URLs de imágenes sean absolutas
                            $contenido = $this->convertirUrlsImagenesAAbsolutas($contenido);
                            // NO escapar comillas manualmente - fputcsv lo hace automáticamente
                            $opcionesArray[$index] = $contenido;

                            if ($opcion->es_correcta) {
                                $respuestaCorrecta = chr(65 + $index); // A, B, C, D, E, F
                            }
                        }
                    }

                    fputcsv($file, [
                        $pregunta->codigo,
                        $enunciado,
                        $idCategoria,
                        $nombreCategoria,
                        $pregunta->ano,
                        $idContexto,
                        $textoContexto,
                        $opcionesArray[0],
                        $opcionesArray[1],
                        $opcionesArray[2],
                        $opcionesArray[3],
                        $opcionesArray[4],
                        $opcionesArray[5],
                        $respuestaCorrecta
                    ], ';');
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            Log::error('Error al exportar preguntas: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error al exportar las preguntas',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Importar preguntas desde CSV
     */
    public function importar(Request $request)
    {
        $request->validate([
            'archivo' => 'required|file|mimes:csv,txt|max:10240', // 10MB máximo
        ]);

        DB::beginTransaction();
        try {
            $archivo = $request->file('archivo');
            $rutaArchivo = $archivo->getRealPath();

            // Leer el archivo completo para manejar correctamente campos con saltos de línea
            $contenido = file_get_contents($rutaArchivo);
            // Remover BOM si existe
            $contenido = preg_replace('/^\xEF\xBB\xBF/', '', $contenido);

            // Parsear CSV completo usando str_getcsv con manejo de saltos de línea
            $lineas = [];
            $handle = fopen($rutaArchivo, 'r');
            if ($handle === false) {
                return response()->json([
                    'message' => 'Error al leer el archivo'
                ], 422);
            }

            // Leer encabezado
            $encabezado = fgetcsv($handle, 0, ';');
            if ($encabezado === false) {
                fclose($handle);
                return response()->json([
                    'message' => 'El archivo CSV está vacío o no tiene formato válido'
                ], 422);
            }

            // Leer todas las filas de datos
            while (($fila = fgetcsv($handle, 0, ';')) !== false) {
                if (count($fila) > 0) {
                    $lineas[] = $fila;
                }
            }
            fclose($handle);

            if (count($lineas) === 0) {
                return response()->json([
                    'message' => 'El archivo CSV debe contener al menos una fila de datos (además del encabezado)'
                ], 422);
            }

            $importadas = 0;
            $errores = [];
            $categoriasMap = Categoria::pluck('idCategoria', 'nombre')->toArray();
            $contextosMap = Contexto::pluck('idContexto', 'titulo')->toArray();

            foreach ($lineas as $numeroLinea => $datos) {
                try {
                    // fgetcsv ya maneja correctamente el escape de comillas y saltos de línea

                    // Asegurar que tenemos al menos las columnas básicas
                    if (count($datos) < 4) {
                        $errores[] = "Línea " . ($numeroLinea + 2) . ": Faltan datos requeridos (se encontraron " . count($datos) . " columnas, se requieren al menos 4)";
                        continue;
                    }

                    // fgetcsv ya maneja correctamente el escape de comillas, no necesitamos deshacerlo manualmente
                    $codigo = isset($datos[0]) ? trim($datos[0]) : '';
                    // El enunciado puede contener HTML con estilos e imágenes
                    // fgetcsv ya deshace el escape de comillas dobles automáticamente
                    $enunciado = isset($datos[1]) ? trim($datos[1]) : '';

                    // Limpiar HTML malformado antes de procesar (eliminar etiquetas img malformadas)
                    $enunciado = $this->limpiarHTMLMalformado($enunciado);

                    // Verificar si el enunciado contiene imágenes (para debugging)
                    $tieneImagenes = stripos($enunciado, '<img') !== false;

                    // Detectar formato: nuevo (con IDs) o antiguo (solo nombres)
                    // Si la columna 2 es numérica, es el nuevo formato con ID
                    $esFormatoNuevo = isset($datos[2]) && is_numeric(trim($datos[2]));

                    $idCategoria = null;
                    $categoriaNombre = '';
                    $ano = 0;
                    $idContexto = null;
                    $textoContexto = '';
                    $contextoTitulo = '';
                    $opciones = [];
                    $respuestaCorrecta = '';

                    if ($esFormatoNuevo) {
                        // Formato nuevo: ID Categoría, Nombre Categoría, Año, ID Contexto, Texto Contexto
                        $idCategoria = isset($datos[2]) ? intval(trim($datos[2])) : null;
                        $categoriaNombre = isset($datos[3]) ? trim($datos[3]) : '';
                        $ano = isset($datos[4]) ? intval($datos[4]) : 0;
                        $idContexto = isset($datos[5]) && !empty(trim($datos[5])) ? intval(trim($datos[5])) : null;
                        $textoContexto = isset($datos[6]) ? trim($datos[6]) : '';
                        // Limpiar HTML malformado antes de procesar
                        $textoContexto = $this->limpiarHTMLMalformado($textoContexto);

                        // Opciones (columnas 7-12) - pueden contener HTML con estilos e imágenes
                        $opciones = [];
                        for ($i = 7; $i <= 12; $i++) {
                            $opcionTexto = isset($datos[$i]) ? trim($datos[$i]) : '';
                            if (!empty($opcionTexto)) {
                                // Limpiar HTML malformado antes de procesar
                                $opcionTexto = $this->limpiarHTMLMalformado($opcionTexto);
                                $opciones[] = $opcionTexto;
                            }
                        }

                        // Respuesta correcta (columna 13)
                        $respuestaCorrecta = strtoupper(trim($datos[13] ?? ''));
                    } else {
                        // Formato antiguo: Categoría (nombre), Año, Contexto (título/texto)
                        $categoriaNombre = isset($datos[2]) ? trim($datos[2]) : '';
                        $ano = isset($datos[3]) ? intval($datos[3]) : 0;
                        $contextoTitulo = isset($datos[4]) ? trim($datos[4]) : '';

                        // Opciones (columnas 5-10) - pueden contener HTML con estilos e imágenes
                        $opciones = [];
                        for ($i = 5; $i <= 10; $i++) {
                            $opcionTexto = isset($datos[$i]) ? trim($datos[$i]) : '';
                            if (!empty($opcionTexto)) {
                                // Limpiar HTML malformado antes de procesar
                                $opcionTexto = $this->limpiarHTMLMalformado($opcionTexto);
                                $opciones[] = $opcionTexto;
                            }
                        }

                        // Respuesta correcta (columna 11)
                        $respuestaCorrecta = strtoupper(trim($datos[11] ?? ''));
                    }

                    // Validaciones
                    if (empty($codigo)) {
                        $errores[] = "Línea " . ($numeroLinea + 2) . ": El código es requerido";
                        continue;
                    }

                    if (empty($enunciado)) {
                        $errores[] = "Línea " . ($numeroLinea + 2) . ": El enunciado es requerido";
                        continue;
                    }

                    // Validar y obtener/crear categoría
                    if ($esFormatoNuevo) {
                        // Formato nuevo: buscar por ID o crear si no existe
                        if (empty($idCategoria)) {
                            $errores[] = "Línea " . ($numeroLinea + 2) . ": El ID de categoría es requerido";
                            continue;
                        }

                        if (empty($categoriaNombre)) {
                            $errores[] = "Línea " . ($numeroLinea + 2) . ": El nombre de categoría es requerido para crear la categoría";
                            continue;
                        }

                        $categoria = Categoria::find($idCategoria);
                        if (!$categoria) {
                            // Crear la categoría con el ID especificado usando DB::table
                            try {
                                DB::table('categorias')->insert([
                                    'idCategoria' => $idCategoria,
                                    'nombre' => $categoriaNombre,
                                    'created_at' => now(),
                                    'updated_at' => now()
                                ]);
                                $categoria = Categoria::find($idCategoria);
                            } catch (\Exception $e) {
                                $errores[] = "Línea " . ($numeroLinea + 2) . ": Error al crear la categoría con ID '{$idCategoria}': " . $e->getMessage();
                                continue;
                            }
                        } else {
                            // Si existe, actualizar todos los campos (sobrescribir)
                            $categoria->nombre = $categoriaNombre;
                            $categoria->updated_at = now();
                            $categoria->save();
                        }
                        $idCategoriaFinal = $categoria->idCategoria;
                    } else {
                        // Formato antiguo: buscar por nombre
                        if (empty($categoriaNombre)) {
                            $errores[] = "Línea " . ($numeroLinea + 2) . ": La categoría es requerida";
                            continue;
                        }

                        if (!isset($categoriasMap[$categoriaNombre])) {
                            $errores[] = "Línea " . ($numeroLinea + 2) . ": La categoría '{$categoriaNombre}' no existe";
                            continue;
                        }
                        $idCategoriaFinal = $categoriasMap[$categoriaNombre];
                    }

                    if (count($opciones) < 2) {
                        $errores[] = "Línea " . ($numeroLinea + 2) . ": Se requieren al menos 2 opciones";
                        continue;
                    }

                    if (empty($respuestaCorrecta) || !in_array($respuestaCorrecta, ['A', 'B', 'C', 'D', 'E', 'F'])) {
                        $errores[] = "Línea " . ($numeroLinea + 2) . ": La respuesta correcta debe ser A, B, C, D, E o F";
                        continue;
                    }

                    $indiceCorrecto = ord($respuestaCorrecta) - ord('A');
                    if ($indiceCorrecto >= count($opciones)) {
                        $errores[] = "Línea " . ($numeroLinea + 2) . ": La respuesta correcta '{$respuestaCorrecta}' no corresponde a ninguna opción";
                        continue;
                    }

                    // Verificar si el código ya existe - si existe, actualizar en lugar de crear
                    $preguntaExistente = Pregunta::where('codigo', $codigo)->first();

                    // Obtener ID de contexto si existe (opcional)
                    $idContextoFinal = null;

                    if ($esFormatoNuevo) {
                        // Formato nuevo: usar ID directamente o crear si no existe
                        if (!empty($idContexto)) {
                            $contexto = Contexto::find($idContexto);
                            if (!$contexto) {
                                // Crear el contexto con el ID especificado
                                if (empty($textoContexto)) {
                                    $errores[] = "Línea " . ($numeroLinea + 2) . ": El texto del contexto es requerido para crear el contexto con ID '{$idContexto}'";
                                    // Continuar sin contexto
                                } else {
                                    try {
                                        // Extraer título del texto si es posible (primeras palabras o línea)
                                        $titulo = '';
                                        $textoPlano = strip_tags($textoContexto);
                                        if (!empty($textoPlano)) {
                                            $lineas = explode("\n", $textoPlano);
                                            $titulo = trim($lineas[0]);
                                            if (strlen($titulo) > 255) {
                                                $titulo = substr($titulo, 0, 252) . '...';
                                            }
                                        }

                                        // Normalizar URLs de imágenes en el texto del contexto
                                        $textoContextoNormalizado = $this->normalizarUrlsImagenes($textoContexto);

                                        // Usar DB::table para insertar con ID específico
                                        DB::table('contextos')->insert([
                                            'idContexto' => $idContexto,
                                            'idCategoria' => $idCategoriaFinal,
                                            'titulo' => $titulo ?: null,
                                            'texto' => $textoContextoNormalizado,
                                            'ano' => $ano ?: date('Y'),
                                            'created_at' => now(),
                                            'updated_at' => now()
                                        ]);

                                        $idContextoFinal = $idContexto;
                                    } catch (\Exception $e) {
                                        $errores[] = "Línea " . ($numeroLinea + 2) . ": Error al crear el contexto con ID '{$idContexto}': " . $e->getMessage();
                                        // Continuar sin contexto
                                    }
                                }
                            } else {
                                // Si existe, actualizar todos los campos (sobrescribir)
                                if (!empty($textoContexto)) {
                                    $textoContextoNormalizado = $this->normalizarUrlsImagenes($textoContexto);

                                    // Extraer título del texto si es posible
                                    $titulo = '';
                                    $textoPlano = strip_tags($textoContextoNormalizado);
                                    if (!empty($textoPlano)) {
                                        $lineas = explode("\n", $textoPlano);
                                        $titulo = trim($lineas[0]);
                                        if (strlen($titulo) > 255) {
                                            $titulo = substr($titulo, 0, 252) . '...';
                                        }
                                    }

                                    $contexto->texto = $textoContextoNormalizado;
                                    $contexto->titulo = $titulo ?: $contexto->titulo;
                                    $contexto->idCategoria = $idCategoriaFinal;
                                    $contexto->ano = $ano ?: date('Y');
                                    $contexto->updated_at = now();
                                    $contexto->save();
                                }
                                $idContextoFinal = $contexto->idContexto;
                            }
                        }
                    } else {
                        // Formato antiguo: buscar por título o texto
                        if (!empty($contextoTitulo)) {
                            // Buscar por título primero
                            $idContextoFinal = $contextosMap[$contextoTitulo] ?? null;

                            // Si no se encuentra por título, intentar buscar por texto completo
                            if (!$idContextoFinal) {
                                $contextoPorTexto = Contexto::where('texto', $contextoTitulo)->first();
                                if ($contextoPorTexto) {
                                    $idContextoFinal = $contextoPorTexto->idContexto;
                                }
                            }

                            // Si aún no se encuentra, buscar por coincidencia parcial en título o texto
                            if (!$idContextoFinal) {
                                $contextoPorCoincidencia = Contexto::where('titulo', 'LIKE', '%' . $contextoTitulo . '%')
                                    ->orWhere('texto', 'LIKE', '%' . $contextoTitulo . '%')
                                    ->first();
                                if ($contextoPorCoincidencia) {
                                    $idContextoFinal = $contextoPorCoincidencia->idContexto;
                                }
                            }

                            if (!$idContextoFinal) {
                                $errores[] = "Línea " . ($numeroLinea + 2) . ": El contexto no se encontró (se creará la pregunta sin contexto)";
                                // Continuar sin contexto
                            }
                        }
                    }

                    // Procesar URLs de imágenes en el enunciado y opciones antes de guardar
                    // Convertir URLs absolutas a relativas para que el frontend las procese correctamente
                    if (!empty($enunciado)) {
                        $enunciadoProcesado = $this->normalizarUrlsImagenes($enunciado);
                        // Solo usar el procesado si no está vacío, de lo contrario mantener el original
                        if (!empty($enunciadoProcesado)) {
                            $enunciado = $enunciadoProcesado;
                        }
                    }

                    foreach ($opciones as $index => $opcion) {
                        if (!empty($opcion)) {
                            $opcionProcesada = $this->normalizarUrlsImagenes($opcion);
                            // Solo usar el procesado si no está vacío, de lo contrario mantener el original
                            if (!empty($opcionProcesada)) {
                                $opciones[$index] = $opcionProcesada;
                            }
                        }
                    }

                    // Si la pregunta ya existe, actualizarla; si no, crearla
                    if ($preguntaExistente) {
                        // Actualizar la pregunta existente
                        $preguntaExistente->update([
                            'enunciado' => $enunciado,
                            'idCategoria' => $idCategoriaFinal,
                            'ano' => $ano ?: date('Y'),
                            'idContexto' => $idContextoFinal,
                        ]);

                        $pregunta = $preguntaExistente;

                        // Eliminar opciones existentes y crear nuevas
                        $pregunta->opciones()->delete();
                    } else {
                        // Crear nueva pregunta
                        $pregunta = Pregunta::create([
                            'codigo' => $codigo,
                            'enunciado' => $enunciado,
                            'idCategoria' => $idCategoriaFinal,
                            'ano' => $ano ?: date('Y'),
                            'idContexto' => $idContextoFinal,
                        ]);
                    }

                    // Crear las opciones
                    foreach ($opciones as $index => $contenido) {
                        OpcionesPregunta::create([
                            'idPregunta' => $pregunta->idPregunta,
                            'contenido' => $contenido,
                            'es_correcta' => $index === $indiceCorrecto,
                        ]);
                    }

                    $importadas++;
                } catch (\Exception $e) {
                    $errores[] = "Línea " . ($numeroLinea + 2) . ": " . $e->getMessage();
                }
            }

            DB::commit();

            // Limpiar caché de categorías para que aparezcan las nuevas categorías creadas
            Cache::forget('admin_categorias_list');

            return response()->json([
                'message' => "Importación completada",
                'importadas' => $importadas,
                'errores' => $errores,
                'total_errores' => count($errores)
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al importar preguntas: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error al importar las preguntas',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Limpia atributos malformados en todas las etiquetas HTML
     * Corrige atributos como style="""" font-family:="""" inherit
     */
    private function limpiarAtributosMalformados($html)
    {
        if (empty($html)) {
            return $html;
        }

        // Eliminar atributos con comillas múltiples (style="""" -> eliminar)
        $html = preg_replace('/\s+[a-z-]+\s*=\s*["\']{2,}/i', '', $html);

        // Corregir atributos malformados como font-family:="""" o font-family:=""
        $html = preg_replace('/([a-z-]+):\s*=\s*["\']{0,2}/i', '$1: ', $html);

        // Eliminar atributos que son solo palabras sin valor (imagen="""" -> eliminar)
        $html = preg_replace('/\s+[a-z-]+\s*=\s*["\']{0,2}\s*([a-z-]+)\s*["\']{0,2}(?=\s|>)/i', '', $html);

        // Limpiar atributos duplicados o malformados en etiquetas img
        // Ejemplo: <img src="""" https:="""" ldln.site="""" storage="""" ...>
        $html = preg_replace_callback('/<img\s+([^>]*?)>/is', function ($matches) {
            $atributos = $matches[1];

            // Extraer solo atributos válidos (nombre="valor")
            preg_match_all('/([a-z-]+)\s*=\s*["\']([^"\']+)["\']/i', $atributos, $atributosValidos);

            $atributosLimpios = [];
            if (isset($atributosValidos[1]) && isset($atributosValidos[2])) {
                foreach ($atributosValidos[1] as $index => $nombre) {
                    $valor = $atributosValidos[2][$index] ?? '';

                    // Solo incluir si el valor no está vacío y no es solo comillas
                    if (!empty($valor) && !preg_match('/^["\']+$/', $valor)) {
                        $atributosLimpios[] = $nombre . '="' . htmlspecialchars($valor, ENT_QUOTES, 'UTF-8') . '"';
                    }
                }
            }

            return '<img ' . implode(' ', $atributosLimpios) . '>';
        }, $html);

        // Limpiar espacios múltiples
        $html = preg_replace('/\s+/', ' ', $html);
        $html = trim($html);

        return $html;
    }

    /**
     * Limpia HTML malformado, especialmente etiquetas img con atributos corruptos
     * Elimina etiquetas img que no tienen un src válido y preserva las válidas
     */
    private function limpiarHTMLMalformado($html)
    {
        if (empty($html)) {
            return $html;
        }

        // Usar una expresión regular para encontrar todas las etiquetas img
        $pattern = '/<img\s+([^>]*?)>/is';

        $htmlLimpio = preg_replace_callback($pattern, function ($matches) {
            $atributos = $matches[1];
            $etiquetaCompleta = $matches[0];

            // Extraer el src de los atributos
            if (preg_match('/src\s*=\s*["\']([^"\']+)["\']/i', $atributos, $srcMatches)) {
                $src = $srcMatches[1];

                // Verificar si el src es válido
                // Un src válido debe:
                // 1. No estar vacío
                // 2. No ser solo comillas múltiples
                // 3. No ser solo "https:" o "http:" sin URL completa
                // 4. No tener caracteres malformados como "https:="

                $srcLimpio = trim($src);

                // Si el src está vacío, tiene múltiples comillas, o es solo "https:" o "http:", eliminar la imagen
                if (
                    empty($srcLimpio) ||
                    preg_match('/^["\']+$/', $srcLimpio) ||
                    preg_match('/^https?:["\']*$/', $srcLimpio) ||
                    preg_match('/^https?:=/', $srcLimpio) ||
                    preg_match('/^["\']+https?:/', $srcLimpio)
                ) {
                    // Esta imagen está malformada, eliminarla
                    return '';
                }

                // Si el src es válido (contiene una URL completa), preservar la imagen
                // Pero limpiar atributos malformados adicionales
                if (preg_match('/^(https?:\/\/|data:|#|\/)/i', $srcLimpio)) {
                    // Esta es una imagen válida, preservarla pero limpiar atributos duplicados
                    // Eliminar atributos duplicados o malformados como "https:=" o atributos sin valor
                    $atributosLimpios = preg_replace('/\s+https?:\s*=/i', '', $atributos);
                    $atributosLimpios = preg_replace('/\s+([a-z-]+)\s*=\s*["\']{2,}/i', '', $atributosLimpios);

                    // Reconstruir la etiqueta con atributos limpios
                    return '<img ' . $atributosLimpios . '>';
                }
            }

            // Si no se encontró src válido, eliminar la imagen
            return '';
        }, $html);

        // Limpiar espacios múltiples y saltos de línea innecesarios
        $htmlLimpio = preg_replace('/\s+/', ' ', $htmlLimpio);
        $htmlLimpio = trim($htmlLimpio);

        return $htmlLimpio;
    }

    /**
     * Normaliza URLs de imágenes: convierte absolutas a relativas para almacenamiento
     * Esto permite que el frontend las procese correctamente según el dominio actual
     */
    private function normalizarUrlsImagenes($html)
    {
        if (empty($html)) {
            return $html;
        }

        $baseUrl = rtrim(config('app.url'), '/');
        $baseUrlNormalizado = preg_replace('/^https?:\/\//i', '', $baseUrl);

        // Usar una expresión regular más robusta para procesar las imágenes
        // Captura img con src en cualquier posición dentro de la etiqueta
        $pattern = '/<img\s+([^>]*?)>/is';

        $htmlProcesado = preg_replace_callback($pattern, function ($matches) use ($baseUrl, $baseUrlNormalizado) {
            $atributos = $matches[1];
            $etiquetaCompleta = $matches[0];

            // Extraer el src de los atributos (puede estar en cualquier orden)
            if (preg_match('/src\s*=\s*["\']([^"\']+)["\']/i', $atributos, $srcMatches)) {
                $src = $srcMatches[1];

                if (!empty($src)) {
                    $nuevoSrc = $src;

                    // Si es una URL absoluta, intentar convertirla a relativa
                    if (preg_match('/^https?:\/\//i', $src)) {
                        // Normalizar la URL para comparación (sin protocolo)
                        $srcNormalizado = preg_replace('/^https?:\/\//i', '', $src);

                        // Extraer la ruta relativa si la URL es de nuestro dominio
                        if (strpos($srcNormalizado, $baseUrlNormalizado) === 0) {
                            $rutaRelativa = substr($srcNormalizado, strlen($baseUrlNormalizado));
                            // Asegurar que comience con /
                            if (empty($rutaRelativa) || $rutaRelativa[0] !== '/') {
                                $rutaRelativa = '/' . ltrim($rutaRelativa, '/');
                            }
                            $nuevoSrc = $rutaRelativa;
                        }
                        // Si es de otro dominio, mantenerla absoluta
                    } elseif (!preg_match('/^(data:|#)/i', $src)) {
                        // Si es relativa pero no comienza con /, asegurar que comience con /
                        if (strpos($src, '/') !== 0) {
                            $nuevoSrc = '/' . ltrim($src, '/');
                        }
                    }

                    // Reemplazar el src en los atributos (manejar tanto comillas simples como dobles)
                    $atributosNuevos = preg_replace(
                        '/src\s*=\s*["\'][^"\']+["\']/i',
                        'src="' . htmlspecialchars($nuevoSrc, ENT_QUOTES, 'UTF-8') . '"',
                        $atributos
                    );

                    // Reconstruir la etiqueta img con el nuevo src
                    return '<img ' . $atributosNuevos . '>';
                }
            }

            // Si no se encontró src o no se pudo procesar, devolver sin cambios
            return $etiquetaCompleta;
        }, $html);

        // Si el procesamiento falló o no cambió nada, devolver el original
        if ($htmlProcesado === null || $htmlProcesado === $html) {
            return $html;
        }

        return $htmlProcesado;
    }

    /**
     * Convierte URLs relativas de imágenes a absolutas en HTML
     * Usa expresiones regulares para evitar corrupción del HTML
     */
    private function convertirUrlsImagenesAAbsolutas($html)
    {
        if (empty($html)) {
            return $html;
        }

        $baseUrl = rtrim(config('app.url'), '/');

        // Usar expresiones regulares para procesar las imágenes sin corromper el HTML
        $pattern = '/<img\s+([^>]*?)>/is';

        $htmlProcesado = preg_replace_callback($pattern, function ($matches) use ($baseUrl) {
            $atributos = $matches[1];
            $etiquetaCompleta = $matches[0];

            // Extraer el src de los atributos
            if (preg_match('/src\s*=\s*["\']([^"\']+)["\']/i', $atributos, $srcMatches)) {
                $src = $srcMatches[1];

                if (!empty($src)) {
                    $nuevoSrc = $src;

                    // Si la URL no es absoluta y no es data URI, convertirla
                    if (!preg_match('/^(https?:\/\/|data:)/i', $src)) {
                        // Si comienza con /storage/, agregar la URL base
                        if (strpos($src, '/storage/') === 0) {
                            $nuevoSrc = $baseUrl . $src;
                        } elseif (strpos($src, 'storage/') === 0) {
                            $nuevoSrc = $baseUrl . '/' . $src;
                        } elseif (strpos($src, '/') === 0) {
                            $nuevoSrc = $baseUrl . $src;
                        } else {
                            $nuevoSrc = $baseUrl . '/' . $src;
                        }

                        // Reemplazar el src en los atributos
                        $atributosNuevos = preg_replace(
                            '/src\s*=\s*["\'][^"\']+["\']/i',
                            'src="' . htmlspecialchars($nuevoSrc, ENT_QUOTES, 'UTF-8') . '"',
                            $atributos
                        );

                        // Reconstruir la etiqueta img con el nuevo src
                        return '<img ' . $atributosNuevos . '>';
                    }
                }
            }

            // Si no se encontró src o ya es absoluta, devolver sin cambios
            return $etiquetaCompleta;
        }, $html);

        // Si el procesamiento falló, devolver el original
        if ($htmlProcesado === null) {
            return $html;
        }

        return $htmlProcesado;
    }
}
