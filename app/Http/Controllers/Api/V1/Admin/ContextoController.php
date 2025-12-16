<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Contexto;
use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ContextoController extends Controller
{
    /**
     * RF-A.3.2: CRUD de Contextos
     */
    public function index(Request $request)
    {
        $query = Contexto::with('categoria');

        if ($request->filled('idCategoria')) {
            $query->where('idCategoria', $request->idCategoria);
        }

        if ($request->filled('ano')) {
            $query->where('ano', $request->ano);
        }

        $contextos = $query->orderBy('ano', 'desc')->orderByRaw('titulo IS NULL, titulo')->get();
        return response()->json($contextos);
    }

    public function store(Request $request)
    {
        $request->validate([
            'titulo' => 'nullable|string|max:255',
            'idCategoria' => 'required|exists:categorias,idCategoria',
            'texto' => 'required|string',
            'ano' => 'required|integer',
        ]);

        $contexto = Contexto::create($request->only(['titulo', 'idCategoria', 'texto', 'ano']));
        $contexto->load('categoria');
        return response()->json($contexto, 201);
    }

    public function update(Request $request, Contexto $contexto)
    {
        $request->validate([
            'titulo' => 'nullable|string|max:255',
            'idCategoria' => 'required|exists:categorias,idCategoria',
            'texto' => 'required|string',
            'ano' => 'required|integer',
        ]);

        $contexto->update($request->only(['titulo', 'idCategoria', 'texto', 'ano']));
        $contexto->load('categoria');
        return response()->json($contexto);
    }

    public function destroy(Contexto $contexto)
    {
        if ($contexto->preguntas()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar el contexto porque tiene preguntas asociadas.'
            ], 422);
        }

        $contexto->delete();
        return response()->json(null, 204);
    }
}
