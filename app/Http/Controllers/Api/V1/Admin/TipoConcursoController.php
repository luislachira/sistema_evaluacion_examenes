<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\TipoConcurso;
use Illuminate\Http\Request;

class TipoConcursoController extends Controller
{
    /**
     * RF-A.4.1: CRUD de Tipos de Concurso
     */
    public function index()
    {
        $tipos = TipoConcurso::orderBy('nombre')->get();
        return response()->json($tipos);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255|unique:tipo_concursos,nombre',
        ]);

        $tipo = TipoConcurso::create($request->only(['nombre']));
        return response()->json($tipo, 201);
    }

    public function update(Request $request, TipoConcurso $tipoConcurso)
    {
        $request->validate([
            'nombre' => 'required|string|max:255|unique:tipo_concursos,nombre,' . $tipoConcurso->idTipoConcurso . ',idTipoConcurso',
        ]);

        $tipoConcurso->update($request->only(['nombre']));
        return response()->json($tipoConcurso);
    }

    public function destroy(TipoConcurso $tipoConcurso)
    {
        if ($tipoConcurso->examenes()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar el tipo de concurso porque tiene exámenes asociados.'
            ], 422);
        }

        $tipoConcurso->delete();
        return response()->json(null, 204);
    }
}
