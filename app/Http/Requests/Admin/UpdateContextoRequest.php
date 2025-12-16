<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateContextoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'idCategoria' => 'required|integer|exists:categorias,idCategoria',
            'titulo' => 'nullable|string|max:255',
            'texto' => 'required|string',
            'ano' => 'required|integer|min:1900|max:2100',
        ];
    }

    public function messages(): array
    {
        return [
            'idCategoria.required' => 'Debe seleccionar una categoría.',
            'idCategoria.exists' => 'La categoría seleccionada no existe.',
            'texto.required' => 'El texto del contexto es obligatorio.',
            'ano.required' => 'El año es obligatorio.',
        ];
    }
}

