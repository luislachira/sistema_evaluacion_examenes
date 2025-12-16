<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreCategoriaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // El middleware de rol ya verificó que es admin
    }

    public function rules(): array
    {
        return [
            'nombreCategoria' => 'required|string|max:150|unique:categorias,nombreCategoria',
            'descripcion' => 'nullable|string',
        ];
    }
}
