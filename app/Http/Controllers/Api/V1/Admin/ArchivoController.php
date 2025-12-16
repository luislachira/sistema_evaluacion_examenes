<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ArchivoAdjunto;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ArchivoController extends Controller
{
    /**
     * Subir una imagen para la descripción del examen
     */
    public function subirImagen(Request $request): JsonResponse
    {
        $request->validate([
            'imagen' => 'required|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB máximo
            'tipo_recurso' => 'sometimes|string|in:examen_descripcion,pregunta_imagen,contexto_texto',
            'id_recurso' => 'sometimes|integer|nullable',
            'id_recurso_string' => 'sometimes|string|nullable',
        ]);

        try {
            $usuario = Auth::user();
            $imagen = $request->file('imagen');

            // Generar nombre único para el archivo
            $extension = $imagen->getClientOriginalExtension();
            $nombreOriginal = $imagen->getClientOriginalName();
            $nombreAlmacenado = Str::uuid() . '.' . $extension;

            // Definir ruta de almacenamiento
            $tipoRecurso = $request->input('tipo_recurso', 'examen_descripcion');
            $rutaCarpeta = "archivos/{$tipoRecurso}/" . date('Y/m');
            $rutaCompleta = $imagen->storeAs($rutaCarpeta, $nombreAlmacenado, 'public');

            // Guardar información en la base de datos
            // Si no se proporciona id_recurso o id_recurso_string, se guarda null
            // y se asociará después cuando se cree/actualice el recurso
            $archivo = ArchivoAdjunto::create([
                'nombre_original' => $nombreOriginal,
                'nombre_almacenado' => $nombreAlmacenado,
                'ruta' => $rutaCompleta,
                'tipo_mime' => $imagen->getMimeType(),
                'tamaño' => $imagen->getSize(),
                'tipo_recurso' => $tipoRecurso,
                'id_recurso' => $request->input('id_recurso') ?: null,
                'id_recurso_string' => $request->input('id_recurso_string') ?: null,
                'subido_por' => $usuario->idUsuario,
                'fecha_subida' => now(),
                'activo' => true,
            ]);

            Log::info('Imagen subida', [
                'archivo_id' => $archivo->idArchivoAdjunto,
                'tipo_recurso' => $tipoRecurso,
                'id_recurso' => $request->input('id_recurso'),
                'id_recurso_string' => $request->input('id_recurso_string'),
                'usuario' => $usuario->idUsuario,
            ]);

            // Retornar URL pública del archivo (asegurar que sea absoluta)
            // Usar Storage::url() para obtener la URL correcta del disco público
            $url = Storage::disk('public')->url($rutaCompleta);
            
            // Si la URL no es absoluta, convertirla a absoluta usando APP_URL
            if (!str_starts_with($url, 'http://') && !str_starts_with($url, 'https://')) {
                $baseUrl = rtrim(config('app.url'), '/');
                $url = $baseUrl . '/' . ltrim($url, '/');
            }

            return response()->json([
                'success' => true,
                'url' => $url,
                'archivo_id' => $archivo->idArchivoAdjunto,
                'message' => 'Imagen subida correctamente'
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error al subir imagen', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al subir la imagen: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un archivo adjunto
     */
    public function eliminarArchivo($id): JsonResponse
    {
        try {
            $archivo = ArchivoAdjunto::find($id);

            if (!$archivo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Archivo no encontrado'
                ], 404);
            }

            // Eliminar archivo físico
            if (Storage::disk('public')->exists($archivo->ruta)) {
                Storage::disk('public')->delete($archivo->ruta);
            }

            // Marcar como inactivo en la base de datos
            $archivo->activo = false;
            $archivo->save();

            return response()->json([
                'success' => true,
                'message' => 'Archivo eliminado correctamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error al eliminar archivo', [
                'archivo_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el archivo'
            ], 500);
        }
    }

    /**
     * Obtener archivos de un recurso
     */
    public function obtenerArchivos(Request $request): JsonResponse
    {
        $request->validate([
            'tipo_recurso' => 'required|string',
            'id_recurso' => 'sometimes|integer|nullable',
            'id_recurso_string' => 'sometimes|string|nullable',
        ]);

        try {
            // Determinar qué ID usar (numérico o string)
            $idRecurso = $request->input('id_recurso_string') ?? $request->input('id_recurso');
            $archivos = ArchivoAdjunto::porRecurso(
                $request->tipo_recurso,
                $idRecurso
            );

            return response()->json([
                'success' => true,
                'data' => $archivos->map(function ($archivo) {
                    return [
                        'id' => $archivo->idArchivoAdjunto,
                        'nombre' => $archivo->nombre_original,
                        'url' => $archivo->url,
                        'tipo_mime' => $archivo->tipo_mime,
                    ];
                })
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener archivos'
            ], 500);
        }
    }
}
