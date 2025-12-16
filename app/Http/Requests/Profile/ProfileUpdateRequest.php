<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $user = $this->user();

        return [
            'nombre' => 'sometimes|string|max:200',
            'apellidos' => 'sometimes|string|max:250',
            'correo' => [
                'sometimes',
                'email',
                'max:250',
                Rule::unique('usuarios', 'correo')->ignore($user->idUsuario, 'idUsuario')
            ],
            'password' => 'nullable|string|min:8|confirmed',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.max' => 'El nombre no puede exceder 200 caracteres.',
            'apellidos.max' => 'Los apellidos no pueden exceder 250 caracteres.',
            'correo.email' => 'El correo debe tener un formato válido.',
            'correo.unique' => 'Este correo ya está registrado.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'password.confirmed' => 'La confirmación de contraseña no coincide.',
        ];
    }
}
