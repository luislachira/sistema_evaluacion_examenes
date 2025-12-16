<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Examen;
use App\Models\IntentoExamen;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CerrarIntentosExamenesFinalizados extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'examenes:cerrar-intentos-finalizados';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cierra todos los intentos en progreso de exámenes que están finalizados';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔍 Buscando exámenes finalizados con intentos en progreso...');
        $this->newLine();

        // Buscar exámenes finalizados (estado = '2')
        $examenesFinalizados = Examen::where('estado', '2')->get();

        $totalIntentosCerrados = 0;
        $examenesAfectados = 0;

        foreach ($examenesFinalizados as $examen) {
            // Buscar intentos en progreso para este examen
            $intentosEnProgreso = IntentoExamen::where('idExamen', $examen->idExamen)
                ->where('estado', 'iniciado')
                ->get();

            if ($intentosEnProgreso->isNotEmpty()) {
                $examenesAfectados++;
                $this->warn("Examen ID {$examen->idExamen} ({$examen->codigo_examen}): {$intentosEnProgreso->count()} intento(s) en progreso");

                foreach ($intentosEnProgreso as $intento) {
                    $intento->estado = 'enviado';
                    $intento->hora_fin = Carbon::now();
                    $intento->save();

                    $totalIntentosCerrados++;
                    $this->line("  ✓ Intento ID {$intento->idIntento} cerrado");
                }
            }
        }

        $this->newLine();
        if ($totalIntentosCerrados > 0) {
            $this->info("✅ Proceso completado:");
            $this->info("   - Exámenes afectados: {$examenesAfectados}");
            $this->info("   - Intentos cerrados: {$totalIntentosCerrados}");
        } else {
            $this->info("✅ No se encontraron intentos en progreso en exámenes finalizados");
        }

        return 0;
    }
}
