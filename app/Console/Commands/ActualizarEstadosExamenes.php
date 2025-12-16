<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Examen;
use App\Http\Controllers\Api\V1\Admin\ExamenController;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ActualizarEstadosExamenes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'examenes:actualizar-estados';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Actualiza automáticamente los estados de los exámenes basándose en las fechas de vigencia (publicar y finalizar)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔄 Verificando estados de exámenes...');

        // Usar el método estático del modelo para mantener la lógica centralizada
        $resultado = Examen::actualizarEstadosAutomaticamente();

        $publicados = $resultado['publicados'];
        $finalizados = $resultado['finalizados'];

        // Resumen
        if ($publicados > 0 || $finalizados > 0) {
            $this->info("✅ Proceso completado:");
            if ($publicados > 0) {
                $this->info("   - {$publicados} examen(es) publicado(s)");
            }
            if ($finalizados > 0) {
                $this->info("   - {$finalizados} examen(es) finalizado(s)");
            }
        } else {
            $this->info("✅ Proceso completado. No hay exámenes que actualizar en este momento.");
        }

        return Command::SUCCESS;
    }
}

