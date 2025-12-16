<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;

class UpdateExamenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Obtener el ID del examen de la ruta
        // El route model binding puede no estar disponible aún en rules(), así que obtenemos el ID del segmento de la ruta
        $examenId = null;

        // Intentar obtener el ID del parámetro de ruta
        // apiResource puede usar 'examen' o el nombre del recurso como parámetro
        $examen = $this->route('examen');

        // También intentar con 'id' por si el método update recibe $id directamente
        if (!$examen) {
            $examen = $this->route('id');
        }

        if ($examen) {
            // Si es un modelo (route model binding ya resuelto)
            if (is_object($examen)) {
                // Intentar obtener el ID de diferentes formas
                if (property_exists($examen, 'idExamen')) {
                    $examenId = $examen->idExamen;
                } elseif (method_exists($examen, 'getAttribute')) {
                    $examenId = $examen->getAttribute('idExamen');
                } elseif (method_exists($examen, 'getKey')) {
                    $examenId = $examen->getKey();
                }
            } elseif (is_numeric($examen)) {
                // Si es un ID numérico directamente
                $examenId = (int) $examen;
            }
        }

        // Si aún no tenemos el ID, obtenerlo del segmento de la URL directamente
        if (!$examenId) {
            // Intentar obtener de los parámetros de ruta
            $routeParams = $this->route()->parameters();
            if (isset($routeParams['examen'])) {
                $examenParam = $routeParams['examen'];
                if (is_object($examenParam)) {
                    if (property_exists($examenParam, 'idExamen')) {
                        $examenId = $examenParam->idExamen;
                    } elseif (method_exists($examenParam, 'getKey')) {
                        $examenId = $examenParam->getKey();
                    }
                } elseif (is_numeric($examenParam)) {
                    $examenId = (int) $examenParam;
                }
            }

            // Si aún no tenemos el ID, intentar desde la URL
            if (!$examenId) {
                // Para PUT /api/v1/admin/examenes/{id}, el segmento después de 'examenes' es el ID
                $path = $this->path(); // Ej: "api/v1/admin/examenes/6"
                $segments = explode('/', $path);

                // Buscar el índice de 'examenes' y tomar el siguiente segmento
                $examenesIndex = array_search('examenes', $segments);
                if ($examenesIndex !== false && isset($segments[$examenesIndex + 1])) {
                    $potentialId = $segments[$examenesIndex + 1];
                    if (is_numeric($potentialId)) {
                        $examenId = (int) $potentialId;
                    }
                }
            }
        }

        // Log para depuración
        Log::info('UpdateExamenRequest - Validación de código', [
            'path' => $this->path(),
            'examen_route_type' => $examen ? gettype($examen) : 'null',
            'examen_id' => $examenId,
            'codigo_examen_enviado' => $this->input('codigo_examen'),
            'route_parameters' => $this->route() ? $this->route()->parameters() : [],
        ]);

        // Construir la regla de unicidad para codigo_examen
        $codigoExamenRule = 'required|string|max:100';

        // Si no se pudo obtener el ID, intentar obtenerlo del request directamente
        if (!$examenId && $this->has('id') && is_numeric($this->input('id'))) {
            $examenId = (int) $this->input('id');
        }

        // Si aún no tenemos el ID, intentar obtenerlo del segmento de la URL
        if (!$examenId) {
            $url = $this->url();
            $path = parse_url($url, PHP_URL_PATH);
            $segments = explode('/', trim($path, '/'));
            $examenesIndex = array_search('examenes', $segments);
            if ($examenesIndex !== false && isset($segments[$examenesIndex + 1])) {
                $potentialId = $segments[$examenesIndex + 1];
                if (is_numeric($potentialId)) {
                    $examenId = (int) $potentialId;
                }
            }
        }

        if ($examenId) {
            $codigoExamenRule .= '|unique:examenes,codigo_examen,' . $examenId . ',idExamen';
        } else {
            // Si no podemos obtener el ID, usar una validación más permisiva
            // que verifique si el código existe pero permita si es el mismo examen
            $codigoExamenRule .= '|unique:examenes,codigo_examen';
            Log::warning('UpdateExamenRequest - No se pudo obtener el ID del examen para la validación unique', [
                'path' => $this->path(),
                'url' => $this->url(),
                'route_params' => $this->route() ? $this->route()->parameters() : [],
            ]);
        }

        // Determinar si solo se están actualizando las fechas (desde el Paso 6 del wizard)
        $soloFechas = $this->has('fecha_inicio_vigencia') || $this->has('fecha_fin_vigencia');
        $tieneCamposBasicos = $this->has('codigo_examen') || $this->has('titulo') || $this->has('idTipoConcurso');

        // Si solo se están actualizando las fechas, hacer los campos básicos opcionales
        if ($soloFechas && !$tieneCamposBasicos) {
            return [
                'estado' => 'nullable|in:0,1,2',
                'fecha_inicio_vigencia' => 'required|date',
                'fecha_fin_vigencia' => 'required|date|after:fecha_inicio_vigencia',
            ];
        }

        return [
            'codigo_examen' => $codigoExamenRule,
            'titulo' => 'required|string|min:10|max:255',
            'idTipoConcurso' => 'required|integer|exists:tipo_concursos,idTipoConcurso',
            'tipo_acceso' => 'required|in:publico,privado',
            'estado' => 'required|in:0,1,2',
            'tiempo_limite' => 'required|integer|min:30|max:600',
            'descripcion' => 'required|string|min:20|max:50000',
            // Las fechas de vigencia son opcionales porque se configuran en el Paso 6 del wizard
            'fecha_inicio_vigencia' => 'nullable|date',
            'fecha_fin_vigencia' => 'nullable|date|required_with:fecha_inicio_vigencia|after:fecha_inicio_vigencia',
            // Preguntas manuales (opcional si se usa generación automática)
            'preguntas' => 'sometimes|array|min:1',
            'preguntas.*.idPregunta' => 'required_with:preguntas|integer|exists:preguntas,idPregunta',
            'preguntas.*.idSubprueba' => 'nullable|integer|min:0',
            'preguntas.*.orden' => 'required_with:preguntas|integer|min:0',
            // El puntaje se determina por las reglas de puntaje
            // Generación automática de preguntas (opcional)
            'generar_preguntas' => 'sometimes|boolean',
            'generacion_categorias' => 'required_if:generar_preguntas,true|array|min:1',
            'generacion_categorias.*.idCategoria' => 'required_with:generacion_categorias|integer|exists:categorias,idCategoria',
            'generacion_categorias.*.cantidad' => 'required_with:generacion_categorias|integer|min:1',
            'generacion_opciones' => 'sometimes|array',
            'generacion_opciones.dificultad' => 'nullable|in:0,1,2',
            'generacion_opciones.ano' => 'nullable|integer',
            'generacion_opciones.incluir_contexto' => 'nullable|boolean',
            'generacion_opciones.barajar' => 'nullable|boolean',
            'generacion_opciones.limpiar_anteriores' => 'nullable|boolean',
            // Usuarios asignados (para grupo cerrado)
            'usuarios_asignados' => 'sometimes|array',
            'usuarios_asignados.*' => 'required|integer|exists:usuarios,idUsuario',
        ];
    }

    public function messages(): array
    {
        return [
            'titulo.required' => 'El título del examen es obligatorio.',
            'titulo.max' => 'El título no puede exceder 255 caracteres.',
            'idTipoConcurso.required' => 'El tipo de concurso es obligatorio.',
            'idTipoConcurso.exists' => 'El tipo de concurso seleccionado no existe.',
            'tipo_acceso.required' => 'El tipo de acceso es obligatorio.',
            'tipo_acceso.in' => 'El tipo de acceso debe ser "publico" o "privado".',
            'estado.required' => 'El estado es obligatorio.',
            'estado.in' => 'El estado debe ser "0" (Borrador), "1" (Publicado) o "2" (Finalizado).',
            'tiempo_limite.required' => 'El tiempo límite es obligatorio.',
            'tiempo_limite.min' => 'El tiempo límite debe ser al menos 1 minuto.',
            'tiempo_limite.max' => 'El tiempo límite no puede exceder 480 minutos.',
            'preguntas.*.idPregunta.exists' => 'Una o más preguntas seleccionadas no existen.',
        ];
    }
}

