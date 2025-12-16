<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoriaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // El ID de la categoría que estamos editando
        $categoriaId = $this->route('categoria')->idCategoria;

        return [
            'nombreCategoria' => [
                'required',
                'string',
                'max:150',
                // Asegura que el nombre sea único, ignorando la categoría actual
                Rule::unique('categorias', 'nombreCategoria')->ignore($categoriaId, 'idCategoria')
            ],
            'descripcion' => 'nullable|string',
        ];
    }
}
