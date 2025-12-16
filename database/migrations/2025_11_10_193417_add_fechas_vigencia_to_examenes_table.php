<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Agregar columnas de fechas de vigencia para controlar cuándo un examen está activo
     */
    public function up(): void
    {
        Schema::table('examenes', function (Blueprint $table) {
            $table->dateTime('fecha_inicio_vigencia')->nullable()->after('estado')
                ->comment('Fecha y hora en que el examen inicia su vigencia (se establece al publicar o programar)');
            $table->dateTime('fecha_fin_vigencia')->nullable()->after('fecha_inicio_vigencia')
                ->comment('Fecha y hora en que el examen finaliza su vigencia (todos los intentos se cierran automáticamente)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('examenes', function (Blueprint $table) {
            $table->dropColumn(['fecha_inicio_vigencia', 'fecha_fin_vigencia']);
        });
    }
};
