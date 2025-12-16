<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\ProfileUpdateRequest;
use Illuminate\Http\Request;
use App\Models\Usuario;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json($request->user());
    }

    public function update(ProfileUpdateRequest $request)
    {
        /** @var Usuario $user */
        $user = $request->user();

        $validated = $request->validated();

        // Restricción de 30 días para actualizar perfil (excepto administradores)
        if (!$user->esAdmin()) {
            $lastUpdate = Carbon::parse($user->updated_at);
            if ($lastUpdate->diffInDays(now()) < 30) {
                return response()->json(['message' => 'Solo puedes actualizar tu perfil una vez cada 30 días.'], 403);
            }
        }

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->fill($validated);
        $user->save();

        return response()->json(['message' => 'Perfil actualizado correctamente', 'user' => $user]);
    }
}
