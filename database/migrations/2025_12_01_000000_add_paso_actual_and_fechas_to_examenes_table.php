<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Agregar campos para el flujo secuencial de creación de exámenes (Wizard)
     */
    public function up(): void
    {
        Schema::table('examenes', function (Blueprint $table) {
            // Campo para rastrear el último paso completado (1-5)
            $table->integer('paso_actual')->default(0)->after('estado')
                ->comment('Último paso completado del wizard: 0=ninguno, 1=Datos Básicos, 2=Subpruebas, 3=Postulaciones, 4=Reglas Puntaje, 5=Ensamblador');

            // Fecha de publicación (cuando se cambia de Borrador a Publicado)
            $table->timestamp('fecha_publicacion')->nullable()->after('fecha_fin_vigencia')
                ->comment('Fecha y hora en que el examen fue publicado (cambió de estado 0 a 1)');

            // Fecha de finalización (cuando se cambia de Publicado a Finalizado)
            $table->timestamp('fecha_finalizacion')->nullable()->after('fecha_publicacion')
                ->comment('Fecha y hora en que el examen fue finalizado (cambió de estado 1 a 2)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('examenes', function (Blueprint $table) {
            $table->dropColumn(['paso_actual', 'fecha_publicacion', 'fecha_finalizacion']);
        });
    }
};

