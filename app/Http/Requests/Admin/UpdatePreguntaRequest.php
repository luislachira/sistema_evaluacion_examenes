<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePreguntaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // El middleware de rol ya verificó que es admin
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $preguntaId = $this->route('pregunta');
        if (is_object($preguntaId)) {
            $preguntaId = $preguntaId->idPregunta ?? $preguntaId->getKey();
        }

        return [
            'codigo' => 'required|string|max:100|unique:preguntas,codigo,' . ($preguntaId ?? 'NULL') . ',idPregunta',
            'idCategoria' => 'required|integer|exists:categorias,idCategoria',
            'ano' => 'required|integer',
            'idContexto' => 'nullable|integer|exists:contextos,idContexto',
            'enunciado' => 'required|string',
            'opciones' => 'required|array|min:2|max:6',
            'opciones.*.contenido' => 'required|string',
            'opcion_correcta' => 'required|integer|min:0|max:' . (count($this->input('opciones', [])) - 1),
        ];
    }

    /**
     * Validaciones personalizadas
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Validar que opcion_correcta esté dentro del rango válido
            $opciones = $this->input('opciones', []);
            $opcionCorrecta = $this->input('opcion_correcta');

            if ($opcionCorrecta !== null && ($opcionCorrecta < 0 || $opcionCorrecta >= count($opciones))) {
                $validator->errors()->add('opcion_correcta', 'El índice de la opción correcta está fuera de rango.');
            }
        });
    }

    /**
     * Mensajes de error personalizados
     */
    public function messages(): array
    {
        return [
            'codigo.required' => 'El código de la pregunta es obligatorio.',
            'codigo.unique' => 'Ya existe una pregunta con ese código.',
            'enunciado.required' => 'El enunciado de la pregunta es obligatorio.',
            'idCategoria.required' => 'Debe seleccionar una categoría.',
            'idCategoria.exists' => 'La categoría seleccionada no existe.',
            'ano.required' => 'El año es obligatorio.',
            'opciones.required' => 'Debe proporcionar opciones para la pregunta.',
            'opciones.min' => 'Debe proporcionar al menos 2 opciones.',
            'opciones.max' => 'No puede proporcionar más de 6 opciones.',
            'opciones.*.contenido.required' => 'El contenido de la opción es obligatorio.',
            'opcion_correcta.required' => 'Debe indicar cuál opción es la correcta.',
        ];
    }
}
