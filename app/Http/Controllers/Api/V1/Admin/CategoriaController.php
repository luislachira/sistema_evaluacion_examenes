<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CategoriaController extends Controller
{
    /**
     * RF-A.3.1: CRUD de Categorías
     * Optimizado con caché ya que las categorías no cambian frecuentemente
     */
    public function index()
    {
        $categorias = Cache::remember('admin_categorias_list', 3600, function () {
            return Categoria::orderBy('nombre')->get();
        });
        
        return response()->json($categorias);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255|unique:categorias,nombre',
            'descripcion' => 'nullable|string',
        ]);

        $categoria = Categoria::create($request->only(['nombre', 'descripcion']));
        
        // Limpiar caché de categorías
        Cache::forget('admin_categorias_list');
        
        return response()->json($categoria, 201);
    }

    public function update(Request $request, Categoria $categoria)
    {
        $request->validate([
            'nombre' => 'required|string|max:255|unique:categorias,nombre,' . $categoria->idCategoria . ',idCategoria',
            'descripcion' => 'nullable|string',
        ]);

        $categoria->update($request->only(['nombre', 'descripcion']));
        
        // Limpiar caché de categorías
        Cache::forget('admin_categorias_list');
        
        return response()->json($categoria);
    }

    public function destroy(Categoria $categoria)
    {
        if ($categoria->preguntas()->exists() || $categoria->contextos()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar la categoría porque tiene preguntas o contextos asociados.'
            ], 422);
        }

        $categoria->delete();
        
        // Limpiar caché de categorías
        Cache::forget('admin_categorias_list');
        
        return response()->json(null, 204);
    }
}
