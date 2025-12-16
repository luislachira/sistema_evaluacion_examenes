<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExamenRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Se manejará con middleware de autenticación
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $examenId = $this->route('examen') ?? null;

        return [
            'nombre' => [
                'required',
                'string',
                'max:255',
                Rule::unique('examenes', 'nombre')->ignore($examenId, 'idExamen')
            ],
            'descripcion' => 'nullable|string|max:50000',
            'instrucciones' => 'nullable|string|max:2000',
            'duracion' => 'required|integer|min:5|max:480', // Entre 5 minutos y 8 horas
            'total_preguntas' => 'required|integer|min:1|max:200',
            'puntaje_total' => 'required|numeric|min:0|max:100',
            'puntaje_aprobacion' => [
                'required',
                'numeric',
                'min:0',
                'max:' . $this->puntaje_total ?? 100
            ],
            'fecha_inicio' => 'required|date|after_or_equal:today',
            'fecha_fin' => 'required|date|after:fecha_inicio',
            'intentos_permitidos' => 'required|integer|min:1|max:10',
            'mostrar_resultados' => 'required|boolean',
            'barajar_preguntas' => 'required|boolean',
            'barajar_opciones' => 'required|boolean',
            'tipo_seleccion' => 'required|in:manual,aleatoria',
            'estado' => 'sometimes|in:0,1',

            // Validación de categorías
            'categorias' => 'required|array|min:1|max:10',
            'categorias.*.id' => 'required|exists:categoria_examenes,idCategoriaExamen',
            'categorias.*.cantidad' => 'required|integer|min:1|max:50'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del examen es obligatorio',
            'nombre.unique' => 'Ya existe un examen con este nombre',
            'nombre.max' => 'El nombre no puede exceder 255 caracteres',

            'duracion.required' => 'La duración del examen es obligatoria',
            'duracion.min' => 'La duración mínima es de 5 minutos',
            'duracion.max' => 'La duración máxima es de 8 horas (480 minutos)',

            'total_preguntas.required' => 'El total de preguntas es obligatorio',
            'total_preguntas.min' => 'Debe tener al menos 1 pregunta',
            'total_preguntas.max' => 'No puede exceder 200 preguntas',

            'puntaje_total.required' => 'El puntaje total es obligatorio',
            'puntaje_aprobacion.required' => 'El puntaje de aprobación es obligatorio',
            'puntaje_aprobacion.max' => 'El puntaje de aprobación no puede ser mayor al puntaje total',

            'fecha_inicio.required' => 'La fecha de inicio es obligatoria',
            'fecha_inicio.after_or_equal' => 'La fecha de inicio debe ser hoy o posterior',
            'fecha_fin.required' => 'La fecha de fin es obligatoria',
            'fecha_fin.after' => 'La fecha de fin debe ser posterior a la fecha de inicio',

            'intentos_permitidos.required' => 'Los intentos permitidos son obligatorios',
            'intentos_permitidos.min' => 'Debe permitir al menos 1 intento',
            'intentos_permitidos.max' => 'No puede exceder 10 intentos',

            'tipo_seleccion.required' => 'El tipo de selección es obligatorio',
            'tipo_seleccion.in' => 'El tipo de selección debe ser manual o aleatoria',

            'categorias.required' => 'Debe seleccionar al menos una categoría',
            'categorias.*.id.required' => 'El ID de la categoría es obligatorio',
            'categorias.*.id.exists' => 'La categoría seleccionada no existe',
            'categorias.*.cantidad.required' => 'La cantidad de preguntas por categoría es obligatoria',
            'categorias.*.cantidad.min' => 'Debe incluir al menos 1 pregunta por categoría',
            'categorias.*.cantidad.max' => 'No puede exceder 50 preguntas por categoría'
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'nombre' => 'nombre del examen',
            'descripcion' => 'descripción',
            'instrucciones' => 'instrucciones',
            'duracion' => 'duración',
            'total_preguntas' => 'total de preguntas',
            'puntaje_total' => 'puntaje total',
            'puntaje_aprobacion' => 'puntaje de aprobación',
            'fecha_inicio' => 'fecha de inicio',
            'fecha_fin' => 'fecha de fin',
            'intentos_permitidos' => 'intentos permitidos',
            'mostrar_resultados' => 'mostrar resultados',
            'barajar_preguntas' => 'barajar preguntas',
            'barajar_opciones' => 'barajar opciones',
            'tipo_seleccion' => 'tipo de selección',
            'estado' => 'estado',
            'categorias' => 'categorías'
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator)
    {
        $errors = $validator->errors();

        // Validación adicional: verificar que el total de preguntas coincida con la suma de categorías
        if ($this->has(['total_preguntas', 'categorias']) && !$errors->has('total_preguntas') && !$errors->has('categorias')) {
            $totalPreguntasCategorias = collect($this->categorias)
                ->sum('cantidad');

            if ($this->total_preguntas != $totalPreguntasCategorias) {
                $errors->add('total_preguntas',
                    'El total de preguntas (' . $this->total_preguntas . ') debe coincidir con la suma de preguntas por categorías (' . $totalPreguntasCategorias . ')');
            }
        }

        parent::failedValidation($validator);
    }
}
