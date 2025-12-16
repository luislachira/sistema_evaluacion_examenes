<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Examen;
use App\Http\Controllers\Api\V1\Admin\ExamenController;
use Illuminate\Support\Facades\Log;

class FinalizarExamenesPorTiempo extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'examenes:finalizar-por-tiempo';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Finaliza automáticamente los exámenes cuando todos los temporizadores han terminado o todos los intentos están completados';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Verificando exámenes para finalización automática...');

        // Obtener todos los exámenes publicados (estado = '1') que aún no están finalizados
        // Incluir exámenes que:
        // 1. Tienen intentos asociados, O
        // 2. Tienen fecha_fin_vigencia establecida (para finalizar por vigencia)
        $examenes = Examen::where('estado', '1')
            ->where(function ($query) {
                $query->whereHas('intentos')
                    ->orWhereNotNull('fecha_fin_vigencia');
            })
            ->with('intentos')
            ->get();

        $finalizados = 0;

        foreach ($examenes as $examen) {
            try {
                if (ExamenController::verificarYFinalizarExamen($examen)) {
                    $finalizados++;
                    $this->info("✓ Examen finalizado: {$examen->codigo_examen} - {$examen->titulo}");
                }
            } catch (\Exception $e) {
                $this->error("✗ Error al verificar examen {$examen->codigo_examen}: " . $e->getMessage());
                Log::error('Error en comando finalizar exámenes', [
                    'examen_id' => $examen->idExamen,
                    'error' => $e->getMessage()
                ]);
            }
        }

        if ($finalizados > 0) {
            $this->info("✓ Proceso completado. {$finalizados} examen(es) finalizado(s).");
        } else {
            $this->info("✓ Proceso completado. No hay exámenes que finalizar en este momento.");
        }

        return Command::SUCCESS;
    }
}
