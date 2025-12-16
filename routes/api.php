<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

// Controladores de Administrador
use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\UsuarioController as AdminUsuarioController;
use App\Http\Controllers\Api\V1\Admin\CategoriaController as AdminCategoriaController;
use App\Http\Controllers\Api\V1\Admin\ContextoController as AdminContextoController;
use App\Http\Controllers\Api\V1\Admin\PreguntaController as AdminPreguntaController;
use App\Http\Controllers\Api\V1\Admin\TipoConcursoController as AdminTipoConcursoController;
use App\Http\Controllers\Api\V1\Admin\ExamenController as AdminExamenController;
use App\Http\Controllers\Api\V1\Admin\SubpruebaController as AdminSubpruebaController;
use App\Http\Controllers\Api\V1\Admin\PostulacionController as AdminPostulacionController;
use App\Http\Controllers\Api\V1\Admin\ReglaPuntajeController as AdminReglaPuntajeController;
use App\Http\Controllers\Api\V1\Admin\ResultadoController as AdminResultadoController;
use App\Http\Controllers\Api\V1\Admin\ArchivoController as AdminArchivoController;
// Controladores de Docente
use App\Http\Controllers\Api\V1\Docente\DashboardController as DocenteDashboardController;
use App\Http\Controllers\Api\V1\Docente\ExamenController as DocenteExamenController;
use App\Http\Controllers\Api\V1\Docente\IntentoController as DocenteIntentoController;
// Controladores de Autenticación
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\OAuthController;
use App\Http\Controllers\Api\V1\ForgotPasswordController;
use App\Http\Controllers\Api\V1\ProfileController;

/*
|--------------------------------------------------------------------------
| API Routes V1
|--------------------------------------------------------------------------
*/

// Rutas Públicas de Autenticación
Route::prefix('v1')->group(function () {
    // --- Estado de la API ---
    Route::get('/', function () {
        return response()->json([
            'aplicacion' => 'API del Sistema de Exámenes de Ascenso para Docentes',
            'estado' => 'Operacional',
            'documentacion' => 'Próximamente disponible.',
        ]);
    });

    // Endpoint para el registro de nuevos usuarios (docentes).
    // URL: POST /api/v1/registro
    Route::post('/register', [AuthController::class, 'register'])->name('api.register');

    // Endpoint para el inicio de sesión.
    // URL: POST /api/v1/login
    Route::post('/login', [AuthController::class, 'login'])->name('api.login');

    // --- Rutas de Autenticación ---
    Route::prefix('auth')->name('auth.')->group(function () {
        // Recuperación de contraseña
        Route::post('/forgot-password', [ForgotPasswordController::class, 'forgotPassword'])->name('password.email');
        Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword'])->name('password.update');
    });

    // --- Rutas OAuth (Google y Microsoft) ---
    // Redirige al proveedor OAuth
    Route::get('/oauth/redirect/{provider}', [OAuthController::class, 'redirect'])->name('api.v1.oauth.redirect');
    // Callback desde el proveedor OAuth
    Route::get('/oauth/callback/{provider}', [OAuthController::class, 'callback'])->name('api.v1.oauth.callback');

    // --- Rutas Protegidas (Requieren un Token de Acceso Válido) ---
    Route::middleware('auth:api')->group(function () {

        // *** CRÍTICO: Endpoint para obtener el usuario autenticado ***
        Route::get('/user', function (Request $request) {
            try {
                $user = $request->user();

                if (!$user) {
                    return response()->json([
                        'message' => 'Usuario no autenticado'
                    ], 401);
                }

                // Obtener propiedades de forma segura
                try {
                    $idUsuario = $user->idUsuario ?? $user->attributes['idUsuario'] ?? $user->attributes['id'] ?? null;
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Error al obtener idUsuario en endpoint /user', [
                        'error' => $e->getMessage()
                    ]);
                    $idUsuario = null;
                }

                try {
                    $nombre = $user->nombre ?? $user->attributes['nombre'] ?? null;
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Error al obtener nombre en endpoint /user', [
                        'error' => $e->getMessage()
                    ]);
                    $nombre = null;
                }

                try {
                    $apellidos = $user->apellidos ?? $user->attributes['apellidos'] ?? null;
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Error al obtener apellidos en endpoint /user', [
                        'error' => $e->getMessage()
                    ]);
                    $apellidos = null;
                }

                try {
                    $correo = $user->correo ?? $user->email ?? $user->attributes['correo'] ?? $user->attributes['email'] ?? null;
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Error al obtener correo en endpoint /user', [
                        'error' => $e->getMessage()
                    ]);
                    $correo = null;
                }

                try {
                    $rol = (string) ($user->rol ?? $user->attributes['rol'] ?? '1');
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Error al obtener rol en endpoint /user', [
                        'error' => $e->getMessage()
                    ]);
                    $rol = '1'; // Default a docente
                }

                // Verificar que tenemos al menos el idUsuario
                if (!$idUsuario) {
                    \Illuminate\Support\Facades\Log::error('Usuario autenticado sin idUsuario en endpoint /user', [
                        'user_class' => get_class($user),
                        'user_attributes' => $user->attributes ?? []
                    ]);
                    return response()->json([
                        'message' => 'Error: Usuario autenticado no tiene ID válido'
                    ], 500);
                }

                return response()->json([
                    'idUsuario' => $idUsuario,
                    'nombre' => $nombre,
                    'apellidos' => $apellidos,
                    'correo' => $correo,
                    'rol' => $rol,
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Error en endpoint /user', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'user_class' => $request->user() ? get_class($request->user()) : 'null'
                ]);

                return response()->json([
                    'message' => 'Error al obtener información del usuario',
                    'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
                ], 500);
            }
        })->name('api.v1.user');

        // Endpoint para verificar el tiempo restante de inactividad
        Route::get('/user/activity-status', function (Request $request) {
            try {
                $user = $request->user();

                if (!$user) {
                    return response()->json([
                        'message' => 'Usuario no autenticado'
                    ], 401);
                }

                $token = $user->token();

                if (!$token) {
                    return response()->json([
                        'message' => 'Token no encontrado'
                    ], 404);
                }

                $tokenId = $token->id;
                // Usar explícitamente la conexión MySQL
                $tokenRecord = \Illuminate\Support\Facades\DB::connection('mysql')->table('oauth_access_tokens')
                    ->where('id', $tokenId)
                    ->where('revoked', false)
                    ->first();

                if (!$tokenRecord) {
                    return response()->json([
                        'message' => 'Token no encontrado en la base de datos o ha sido revocado'
                    ], 404);
                }

                $lastActivity = $tokenRecord->updated_at
                    ? \Carbon\Carbon::parse($tokenRecord->updated_at)
                    : \Carbon\Carbon::parse($tokenRecord->created_at);

                $now = \Carbon\Carbon::now();

                // Asegurar que ambas fechas estén en la misma zona horaria
                $lastActivity->setTimezone($now->timezone);

                // Calcular la diferencia en segundos
                // Si lastActivity es en el pasado, el tiempo transcurrido es positivo
                // Si lastActivity es en el futuro (error), asumimos 0
                if ($lastActivity->gt($now)) {
                    // Error: lastActivity está en el futuro, asumimos que no ha pasado tiempo
                    $secondsSinceLastActivity = 0;
                } else {
                    // lastActivity está en el pasado, calcular diferencia correctamente
                    $secondsSinceLastActivity = $now->timestamp - $lastActivity->timestamp;
                }

                // Asegurar que no sea negativo
                $secondsSinceLastActivity = max(0, $secondsSinceLastActivity);
                $minutesSinceLastActivity = $secondsSinceLastActivity / 60;

                // Usar la misma constante que el middleware para mantener consistencia
                $inactivityTimeout = \App\Http\Middleware\CheckUserActivity::INACTIVITY_TIMEOUT_MINUTES;
                $inactivityTimeoutSeconds = $inactivityTimeout * 60;

                // Calcular segundos restantes
                $secondsRemaining = max(0, $inactivityTimeoutSeconds - $secondsSinceLastActivity);
                $minutesRemaining = $secondsRemaining / 60;

                // Log para debugging
                \Illuminate\Support\Facades\Log::debug('Activity Status Check', [
                    'last_activity' => $lastActivity->toDateTimeString(),
                    'now' => $now->toDateTimeString(),
                    'last_activity_timestamp' => $lastActivity->timestamp,
                    'now_timestamp' => $now->timestamp,
                    'seconds_since' => $secondsSinceLastActivity,
                    'seconds_remaining' => $secondsRemaining,
                    'timeout_seconds' => $inactivityTimeoutSeconds,
                    'is_last_activity_future' => $lastActivity->gt($now),
                ]);

                return response()->json([
                    'minutes_remaining' => $minutesRemaining,
                    'seconds_remaining' => $secondsRemaining,
                    'last_activity' => $lastActivity->toIso8601String(),
                    'inactivity_timeout' => $inactivityTimeout,
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Error en activity-status endpoint', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);

                return response()->json([
                    'message' => 'Error al verificar el estado de actividad',
                    'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
                ], 500);
            }
        })->name('api.v1.user.activity-status');

        // Ruta común para cerrar sesión
        Route::post('/logout', [AuthController::class, 'logout'])->name('api.v1.logout');

        // --- Rutas del Perfil ---
        Route::prefix('profile')->name('profile.')->group(function () {
            Route::get('/', [ProfileController::class, 'show'])->name('show');
            Route::put('/', [ProfileController::class, 'update'])->name('update');
            Route::put('/password', [ProfileController::class, 'updatePassword'])->name('update-password');
        });

        /*
        |--------------------------------------------------------------------------
        | Rutas para Administradores
        |--------------------------------------------------------------------------
        */
        Route::middleware('role:0')->prefix('admin')->name('admin.')->group(function () { // '0' es el rol de Admin

            // RF-A.1: Dashboard
            Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

            // RF-A.2: Gestión de Usuarios
            Route::patch('usuarios/{usuario}/approve', [AdminUsuarioController::class, 'approve'])->name('usuarios.approve');
            Route::patch('usuarios/{usuario}/suspend', [AdminUsuarioController::class, 'suspend'])->name('usuarios.suspend');
            Route::apiResource('usuarios', AdminUsuarioController::class);

            // RF-A.3: Gestión del Banco de Preguntas
            // RF-A.3.1: CRUD de Categorías
            Route::apiResource('categorias', AdminCategoriaController::class);

            // RF-A.3.2: CRUD de Contextos
            Route::apiResource('contextos', AdminContextoController::class);

            // RF-A.3.3: CRUD de Preguntas
            // Rutas específicas deben ir ANTES del apiResource para evitar conflictos
            Route::get('preguntas/exportar/csv', [AdminPreguntaController::class, 'exportar'])->name('preguntas.exportar');
            Route::post('preguntas/importar/csv', [AdminPreguntaController::class, 'importar'])->name('preguntas.importar');
            Route::apiResource('preguntas', AdminPreguntaController::class);

            // RF-A.4: Gestión de Exámenes
            // RF-A.4.1: CRUD de Tipos de Concurso
            Route::apiResource('tipo-concursos', AdminTipoConcursoController::class);

            // RF-A.4.2: CRUD de Exámenes
            Route::get('examenes/create', [AdminExamenController::class, 'create'])->name('examenes.create');
            Route::get('examenes/{id}/edit', [AdminExamenController::class, 'edit'])->name('examenes.edit');
            Route::patch('examenes/{examen}/estado', [AdminExamenController::class, 'cambiarEstado'])->name('examenes.cambiar-estado');
            Route::post('examenes/{examen}/duplicar', [AdminExamenController::class, 'duplicar'])->name('examenes.duplicar');
            // Rutas para el wizard de creación secuencial
            Route::get('examenes/{id}/wizard/estado', [AdminExamenController::class, 'estadoWizard'])->name('examenes.wizard.estado');
            Route::get('examenes/{id}/wizard/paso/{paso}', [AdminExamenController::class, 'getDatosPaso'])->name('examenes.wizard.paso');
            Route::post('examenes/{id}/wizard/validar-paso', [AdminExamenController::class, 'validarAccesoPaso'])->name('examenes.wizard.validar-paso');
            Route::post('examenes/{id}/wizard/actualizar-paso', [AdminExamenController::class, 'actualizarPaso'])->name('examenes.wizard.actualizar-paso');
            Route::apiResource('examenes', AdminExamenController::class);

            // RF-A.4.3: CRUD de Subpruebas
            Route::get('examenes/{examen}/subpruebas', [AdminSubpruebaController::class, 'index'])->name('examenes.subpruebas');
            Route::post('examenes/{examen}/subpruebas', [AdminSubpruebaController::class, 'store'])->name('examenes.subpruebas.store');
            Route::put('subpruebas/{subprueba}', [AdminSubpruebaController::class, 'update'])->name('subpruebas.update');
            Route::delete('subpruebas/{subprueba}', [AdminSubpruebaController::class, 'destroy'])->name('subpruebas.destroy');

            // RF-A.9: CRUD de Postulaciones
            Route::get('examenes/{examen}/postulaciones', [AdminPostulacionController::class, 'index'])->name('examenes.postulaciones');
            Route::post('examenes/{examen}/postulaciones', [AdminPostulacionController::class, 'store'])->name('examenes.postulaciones.store');
            Route::put('postulaciones/{postulacion}', [AdminPostulacionController::class, 'update'])->name('postulaciones.update');
            Route::delete('postulaciones/{postulacion}', [AdminPostulacionController::class, 'destroy'])->name('postulaciones.destroy');

            // RF-A.8: CRUD de Reglas de Puntaje (por Postulación)
            Route::get('postulaciones/{postulacion}/reglas', [AdminReglaPuntajeController::class, 'index'])->name('postulaciones.reglas');
            Route::post('postulaciones/{postulacion}/reglas', [AdminReglaPuntajeController::class, 'store'])->name('postulaciones.reglas.store');
            Route::put('reglas/{reglaPuntaje}', [AdminReglaPuntajeController::class, 'update'])->name('reglas.update');
            Route::delete('reglas/{reglaPuntaje}', [AdminReglaPuntajeController::class, 'destroy'])->name('reglas.destroy');

            // RF-A.4.4: Ensamblador de Examen
            Route::get('examenes/{examen}/ensamblar', [AdminExamenController::class, 'ensamblar'])->name('examenes.ensamblar');
            Route::post('examenes/{examen}/preguntas', [AdminExamenController::class, 'agregarPreguntas'])->name('examenes.agregar-preguntas');
            Route::delete('examenes/{examen}/preguntas/{pregunta}', [AdminExamenController::class, 'eliminarPregunta'])->name('examenes.eliminar-pregunta');
            Route::post('examenes/{examen}/preguntas/generar-aleatorio', [AdminExamenController::class, 'generarAleatorio'])->name('examenes.generar-aleatorio');

            // RF-A.4.5: Asignación de Exámenes Privados
            Route::get('examenes/{examen}/asignar', [AdminExamenController::class, 'asignar'])->name('examenes.asignar');
            Route::post('examenes/{examen}/asignar', [AdminExamenController::class, 'asignarUsuarios'])->name('examenes.asignar-usuarios');

            // RF-A.5: Gestión de Resultados
            Route::get('resultados', [AdminResultadoController::class, 'index'])->name('resultados.index');
            Route::get('resultados/{intentoExamen}', [AdminResultadoController::class, 'show'])->name('resultados.show');
            Route::get('resultados/exportar/csv', [AdminResultadoController::class, 'exportar'])->name('resultados.exportar');

            // RF-A.3.4: Gestión de Archivos (imágenes para editores RTE)
            Route::post('archivos/subir-imagen', [AdminArchivoController::class, 'subirImagen'])->name('archivos.subir-imagen');
            Route::delete('archivos/{id}', [AdminArchivoController::class, 'eliminarArchivo'])->name('archivos.eliminar');
            Route::get('archivos', [AdminArchivoController::class, 'obtenerArchivos'])->name('archivos.listar');
        });

        /*
        |--------------------------------------------------------------------------
        | Rutas para Docentes
        |--------------------------------------------------------------------------
        */
        Route::middleware('role:1')->prefix('docente')->name('docente.')->group(function () { // '1' es el rol de Docente

            // RF-D.1: Perfil y Dashboard (Inicio)
            Route::get('/dashboard', [DocenteDashboardController::class, 'index'])->name('dashboard');

            // RF-D.1.1: Gestión de Perfil
            Route::get('/perfil', [ProfileController::class, 'show'])->name('perfil');
            Route::put('/perfil', [ProfileController::class, 'update'])->name('perfil.update');

            // RF-D.1.2: Ver Exámenes Disponibles
            Route::get('/examenes', [DocenteDashboardController::class, 'index'])->name('examenes.index');
            Route::get('/examenes/{examen}', [DocenteExamenController::class, 'show'])->name('examenes.show');

            // RF-D.2: Realización de Examen (Simulador)
            // RF-D.2.1: Iniciar Intento
            Route::post('/examenes/{examen}/iniciar', [DocenteIntentoController::class, 'iniciar'])->name('examenes.iniciar');
            // RF-D.2.2: Cargar Intento Existente
            Route::get('/examenes/{examen}/intento', [DocenteIntentoController::class, 'cargarIntento'])->name('examenes.cargar-intento');

            // RF-D.2.2: Interfaz de Examen
            Route::get('/intentos/{intentoExamen}/pregunta/{orden}', [DocenteIntentoController::class, 'obtenerPregunta'])->name('intentos.pregunta');

            // RF-D.2.3: Guardado de Progreso (Asíncrono)
            Route::post('/intentos/{intentoExamen}/respuesta', [DocenteIntentoController::class, 'guardarRespuesta'])->name('intentos.guardar-respuesta');

            // Validar navegación de preguntas
            Route::post('/intentos/{intentoExamen}/validar-navegacion', [DocenteIntentoController::class, 'validarNavegacion'])->name('intentos.validar-navegacion');

            // RF-D.2.4: Finalización del Intento
            Route::post('/intentos/{intentoExamen}/finalizar', [DocenteIntentoController::class, 'finalizar'])->name('intentos.finalizar');

            // RF-D.3: Vista de Resultados (Historial)
            // RF-D.3.1: Ver Resultado Inmediato
            Route::get('/intentos/{intentoExamen}/resultado', [DocenteIntentoController::class, 'verResultado'])->name('intentos.resultado');

            Route::get('/intentos/{intentoExamen}/navegacion', [DocenteIntentoController::class, 'obtenerNavegacionPreguntas'])->name('intentos.navegacion');

            // RF-D.3.2: Historial de Intentos
            Route::get('/historial', [DocenteIntentoController::class, 'historial'])->name('historial');
        });
    });
});
