<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Si el examen está en estado Borrador (0) y no tiene título/descripción, permitir valores vacíos
        // Esto permite crear un examen básico sin completar el Paso 1
        $esBorradorBasico = $this->input('estado') === '0' &&
                           (empty($this->input('titulo')) || empty($this->input('descripcion')));

        return [
            'codigo_examen' => 'required|string|max:100|unique:examenes,codigo_examen',
            'titulo' => $esBorradorBasico ? 'nullable|string|max:255' : 'required|string|min:10|max:255',
            'idTipoConcurso' => 'required|exists:tipo_concursos,idTipoConcurso',
            'tipo_acceso' => 'required|in:publico,privado',
            'estado' => 'required|in:0,1,2',
            'tiempo_limite' => 'required|integer|min:30|max:600',
            'descripcion' => $esBorradorBasico ? 'nullable|string|max:50000' : 'required|string|min:20|max:50000',
            // Las fechas de vigencia se configuran en el Paso 6 del wizard, no son requeridas al crear
            'fecha_inicio_vigencia' => 'nullable|date',
            'fecha_fin_vigencia' => 'nullable|date|after:fecha_inicio_vigencia',
            // Preguntas manuales (opcional si se usa generación automática)
            'preguntas' => 'sometimes|array|min:1',
            'preguntas.*.idPregunta' => 'required_with:preguntas|integer|exists:preguntas,idPregunta',
            'preguntas.*.idSubprueba' => 'required_with:preguntas|integer|exists:subpruebas,idSubprueba',
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
            'codigo_examen.required' => 'El código del examen es obligatorio.',
            'codigo_examen.unique' => 'El código del examen ya existe.',
            'preguntas.*.idPregunta.exists' => 'Una o más preguntas seleccionadas no existen.',
        ];
    }
}

